import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(
  resolve(root, 'content/patterns/data-transactional-outbox.md'),
  'utf8',
);
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-transactional-outbox-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['outbox.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'local: 1 1',
    'after lost ack pending: 1',
    "broker IDs: ['E901', 'E901']",
    'final: 1 0',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from outbox import connect,place_order,relay_once
from contextlib import closing
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import sqlite3
import json
import subprocess
import sys


def fails(error,call):
    try: call()
    except error: return
    raise AssertionError("Expected "+error.__name__)


def snapshot(db):
    return (db.execute("SELECT * FROM orders ORDER BY order_id").fetchall(),
            db.execute("SELECT * FROM outbox ORDER BY sequence").fetchall())


def pending(db):
    return db.execute("SELECT count(*) FROM outbox WHERE dispatched=0").fetchone()[0]


def broker(path):
    db=sqlite3.connect(path,isolation_level=None)
    db.execute("CREATE TABLE IF NOT EXISTS accepted (event_id TEXT,payload TEXT)")
    return db


def accept(log,event_id,payload):
    log.execute("INSERT INTO accepted VALUES (?,?)",(event_id,payload))


with closing(connect("main.db")) as source, closing(broker("accepted.db")) as log:
    sent=[]
    assert relay_once(source,lambda *args:sent.append(args)) is False and sent==[]
    assert place_order(source,"O42",7000,"E901") is None
    assert not source.in_transaction
    original=snapshot(source)
    assert len(original[0])==len(original[1])==1 and pending(source)==1
    payload=original[1][0][2]
    assert json.loads(payload)==dict(type="OrderPlaced",schema=1,order_id="O42",order_version=1,total_cents=7000,currency="EUR")
    def unavailable(event_id,payload): raise ConnectionError("Broker unavailable")
    fails(ConnectionError,lambda:relay_once(source,unavailable))
    assert snapshot(source)==original and log.execute("SELECT * FROM accepted").fetchall()==[]
    def lost_ack(event_id,payload):
        assert not source.in_transaction
        accept(log,event_id,payload)
        raise ConnectionError("Acknowledgment lost")
    fails(ConnectionError,lambda:relay_once(source,lost_ack))
    assert snapshot(source)==original and not source.in_transaction
with closing(connect("main.db")) as source, closing(broker("accepted.db")) as log:
    assert pending(source)==1
    assert relay_once(source,lambda event_id,payload:accept(log,event_id,payload)) is True
    rows=log.execute("SELECT * FROM accepted ORDER BY rowid").fetchall()
    assert rows==[("E901",payload),("E901",payload)]
    assert pending(source)==0 and snapshot(source)[0]==original[0]
    assert relay_once(source,lambda *args:sent.append(args)) is False and sent==[]
    assert snapshot(source)[1][0][1:]==("E901",payload,1)

# Each failed source insert leaves both tables as before.
for table in ["orders","outbox"]:
    with closing(connect(table+"-rollback.db")) as source:
        original=snapshot(source)
        source.execute("CREATE TRIGGER block AFTER INSERT ON "+table+" BEGIN SELECT RAISE(ABORT,'blocked'); END")
        fails(sqlite3.IntegrityError,lambda:place_order(source,"O42",7000,"E901"))
        assert snapshot(source)==original and not source.in_transaction
        source.execute("DROP TRIGGER block")
        place_order(source,"O42",7000,"E901")
        assert pending(source)==1 and len(snapshot(source)[0])==1

with closing(connect("unique.db")) as source:
    place_order(source,"O42",7000,"E901"); original=snapshot(source)
    fails(sqlite3.IntegrityError,lambda:place_order(source,"O43",8000,"E901"))
    fails(sqlite3.IntegrityError,lambda:place_order(source,"O42",8000,"E902"))
    assert snapshot(source)==original and not source.in_transaction
    # Payload is the accepted snapshot, not reassembled from mutable business state.
    source.execute("UPDATE orders SET total_cents=9000 WHERE order_id='O42'")
    published=[]
    relay_once(source,lambda event_id,payload:published.append(json.loads(payload)))
    assert published[0]['total_cents']==7000

# Relay cannot send this connection's uncommitted rows; another connection sees none.
with closing(connect("committed.db")) as source, closing(connect("committed.db")) as relay:
    source.execute("BEGIN IMMEDIATE")
    source.execute("INSERT INTO orders VALUES ('O42',7000)")
    source.execute("INSERT INTO outbox(event_id,payload) VALUES ('E901','test')")
    calls=[]
    fails(ValueError,lambda:relay_once(source,lambda *args:calls.append(args)))
    assert relay_once(relay,lambda *args:calls.append(args)) is False and calls==[]
    source.rollback()
    assert snapshot(source)==([],[])
    place_order(source,"O42",7000,"E901")
    def publish_without_source_lock(event_id,payload):
        assert not relay.in_transaction
        # A separate writer succeeds while publication is in progress.
        place_order(source,"O43",1,"E902")
        calls.append(event_id)
    assert relay_once(relay,publish_without_source_lock) is True
    assert calls==["E901"] and pending(relay)==1
    ids=[]
    assert relay_once(relay,lambda event_id,payload:ids.append(event_id)) is True
    assert ids==["E902"] and pending(relay)==0

# Normal acknowledgment followed by dispatch-record failure repeats acceptance later.
with closing(connect("mark.db")) as source, closing(broker("mark-log.db")) as log:
    place_order(source,"O42",7000,"E901")
    source.execute("CREATE TRIGGER fail_mark BEFORE UPDATE ON outbox BEGIN SELECT RAISE(ABORT,'blocked'); END")
    fails(sqlite3.IntegrityError,lambda:relay_once(source,lambda e,p:accept(log,e,p)))
    assert pending(source)==1 and not source.in_transaction
    assert log.execute("SELECT count(*) FROM accepted").fetchone()[0]==1
    source.execute("DROP TRIGGER fail_mark")
    relay_once(source,lambda e,p:accept(log,e,p))
    assert pending(source)==0 and log.execute("SELECT count(*) FROM accepted").fetchone()[0]==2
    assert len(snapshot(source)[0])==1

with closing(connect("validation.db")) as source:
    for cents in [0,-1,100000001,True,False,1.0,"7000",None]:
        fails(ValueError,lambda:place_order(source,"O42",cents,"E901"))
        assert snapshot(source)==([],[]) and not source.in_transaction
    for value in ["", " ", "has space", "é", "x"*65, "x' OR 1=1--",None,True,1,[]]:
        fails(ValueError,lambda:place_order(source,value,7000,"E901"))
        fails(ValueError,lambda:place_order(source,"O42",7000,value))
        assert snapshot(source)==([],[]) and not source.in_transaction
    place_order(source,"x"*64,1,"e"*64)
    place_order(source,"MAX",100000000,"MAXEVENT")
    assert len(snapshot(source)[0])==2 and pending(source)==2

# Source BEGIN/COMMIT failures preserve both tables and allow a later retry.
with closing(connect("busy.db")) as owner, closing(connect("busy.db")) as writer:
    writer.execute("PRAGMA busy_timeout=0"); original=snapshot(writer)
    owner.execute("BEGIN IMMEDIATE")
    fails(sqlite3.OperationalError,lambda:place_order(writer,"O42",7000,"E901"))
    owner.rollback()
    assert snapshot(writer)==original and not writer.in_transaction
    owner.execute("BEGIN"); snapshot(owner)
    fails(sqlite3.OperationalError,lambda:place_order(writer,"O42",7000,"E901"))
    assert not writer.in_transaction
    owner.rollback()
    assert snapshot(writer)==original
    place_order(writer,"O42",7000,"E901")
    assert pending(writer)==1

# Competing writes with the same event identity cannot leave a second orphan order.
with closing(connect("race.db")) as source: pass
barrier=Barrier(2)
def competing(order):
    with closing(connect("race.db")) as source:
        barrier.wait(timeout=5)
        try: place_order(source,order,7000,"E901"); return "accepted"
        except sqlite3.IntegrityError: return "rejected"
with ThreadPoolExecutor(max_workers=2) as workers:
    assert sorted(workers.map(competing,["O42","O43"]))==["accepted","rejected"]
with closing(connect("race.db")) as source:
    orders,outgoing=snapshot(source)
    assert len(orders)==len(outgoing)==1
    assert json.loads(outgoing[0][2])["order_id"]==orders[0][0]

# Actual process death after durable acceptance and before marking dispatch.
with closing(connect("crash.db")) as source: place_order(source,"O42",7000,"E901")
with closing(broker("crash-log.db")) as log: pass
child=subprocess.run([sys.executable,"-c",'''
import os,sqlite3
from outbox import connect,relay_once
source=connect("crash.db")
log=sqlite3.connect("crash-log.db",isolation_level=None)
def publish(event_id,payload):
    log.execute("INSERT INTO accepted VALUES (?,?)",(event_id,payload))
    os._exit(23)
relay_once(source,publish)
'''],capture_output=True,text=True,timeout=5)
assert child.returncode==23,child.stderr
with closing(connect("crash.db")) as source, closing(broker("crash-log.db")) as log:
    assert pending(source)==1 and log.execute("SELECT count(*) FROM accepted").fetchone()[0]==1
    relay_once(source,lambda e,p:accept(log,e,p))
    assert pending(source)==0 and len(snapshot(source)[0])==1
    rows=log.execute("SELECT * FROM accepted ORDER BY rowid").fetchall()
    assert len(rows)==2 and rows[0]==rows[1] and rows[0][0]=="E901"

# A process dying inside the source transaction does not leave partial intent.
with closing(connect("source-crash.db")) as source: pass
child=subprocess.run([sys.executable,"-c",'''
import os
from outbox import connect
s=connect("source-crash.db")
s.execute("BEGIN IMMEDIATE")
s.execute("INSERT INTO orders VALUES ('O42',7000)")
s.execute("INSERT INTO outbox(event_id,payload) VALUES ('E901','test')")
os._exit(23)
'''],capture_output=True,text=True,timeout=5)
assert child.returncode==23,child.stderr
with closing(connect("source-crash.db")) as source:
    assert snapshot(source)==([],[])
    place_order(source,"O42",7000,"E901")
    assert pending(source)==1
print("Outbox local atomicity, committed-only relay, retry, and failure checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['outbox.py', 'demo.py'],
    stdout: expected,
    verification:
      'Exact demo output; original EUR 70.00 payload/schema/type/order version; atomic source commit; forced after-insert failure in either table rolls back both; duplicate order/event identity leaves no orphan; committed-only reads and same-connection active-transaction rejection; publisher executes without a held source transaction and permits another writer; empty/dispatched queues invoke no publisher; unavailable broker preserves pending intent; lost acknowledgment, dispatch-record failure after acknowledgment, and actual process death after durable acceptance all retry the same ID and bytes without repeating the order; source reopen and pre-commit crash recovery; original payload survives later business-state change; sequential single-worker pending delivery; exact total and ID boundaries; BEGIN/COMMIT errors roll back and permit retry; competing writers with one event identity leave one matching order/message pair. Durable acceptance log is a local test double, not a broker/consumer or a production ordering, authentication, parallel-relay, deduplication, or power-loss test.',
  };
  const out = resolve(root, '.local/software-transactional-outbox');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
