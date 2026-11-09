import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/data-event-sourcing.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-event-sourcing-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['event_store.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = ['revision 2 available: 17', 'stale append rejected', 'reopened: 3 18 2'];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from event_store import connect, execute, history, replay, Conflict
from contextlib import closing
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch
from pathlib import Path
import sqlite3
import subprocess
import sys


def fails(error, call):
    try: call()
    except error: return
    raise AssertionError("Expected " + error.__name__)


def state(db,pool="POOL-1"):
    events=history(db,pool)
    capacity,held=replay(events)
    return len(events),capacity,held,capacity-sum(held.values())


with closing(connect("facts.sqlite")) as db:
    assert history(db,"POOL-1")==[] and replay([])==(0,{})
    assert execute(db,"POOL-1",0,"open",20)==1
    assert execute(db,"POOL-1",1,"reserve",3,"R1")==2
    at_two=history(db,"POOL-1")
    assert replay(at_two)==(20,{"R1":3})
    assert execute(db,"POOL-1",2,"release",1,"R1")==3
    accepted=history(db,"POOL-1")
    assert at_two==accepted[:2] and state(db)==(3,20,{"R1":2},18)
    for _ in range(3):
        with patch("builtins.open",side_effect=AssertionError("Replay used I/O")), patch("sqlite3.connect",side_effect=AssertionError("Replay opened database")):
            assert replay(accepted)==(20,{"R1":2})
        assert history(db,"POOL-1")==accepted
    fails(Conflict,lambda:execute(db,"POOL-1",2,"release",1,"R1"))
    assert history(db,"POOL-1")==accepted and not db.in_transaction
    fails(ValueError,lambda:execute(db,"POOL-1",3,"reserve",19,"R2"))
    fails(ValueError,lambda:execute(db,"POOL-1",3,"release",3,"R1"))
    fails(ValueError,lambda:execute(db,"POOL-1",3,"release",1,"UNKNOWN"))
    fails(ValueError,lambda:execute(db,"POOL-1",3,"open",20))
    fails(ValueError,lambda:execute(db,"MISSING",0,"reserve",1,"R1"))
    assert history(db,"POOL-1")==accepted and history(db,"MISSING")==[] and not db.in_transaction
    for sql in ["UPDATE events SET quantity=1", "DELETE FROM events"]:
        fails(sqlite3.IntegrityError,lambda:db.execute(sql))
        assert history(db,"POOL-1")==accepted
    execute(db,"POOL-2",0,"open",1)
    assert history(db,"POOL-1")==accepted
with closing(connect("facts.sqlite")) as db:
    assert state(db)==(3,20,{"R1":2},18)
    assert replay(history(db,"POOL-1")[:2])==(20,{"R1":3})

# Replay fails closed for incompatible schema, missing/out-of-order positions,
# unknown event types, impossible release, and invalid fixed-v1 history.
valid=[(1,"Opened",1,20,""),(2,"Reserved",1,3,"R1")]
for invalid in [
 [(1,"Opened",2,20,"")], [(2,"Opened",1,20,"")],
 [valid[1],valid[0]], [valid[0],(3,"Reserved",1,3,"R1")],
 [valid[0],(2,"Unknown",1,1,"R1")],
 [valid[0],(2,"Released",1,1,"R1")],
 [valid[0],(2,"Reserved",1,21,"R1")],
 [(1,"Opened",1,0,"")], [(1,"Reserved",1,1,"R1")],
]: fails(ValueError,lambda:replay(invalid))
assert valid==[(1,"Opened",1,20,""),(2,"Reserved",1,3,"R1")]

with closing(connect("bounds.sqlite")) as db:
    execute(db,"POOL-1",0,"open",1000)
    original=history(db,"POOL-1")
    for quantity in [0,-1,1001,True,False,1.0,"1",None]:
        fails(ValueError,lambda:execute(db,"POOL-1",1,"reserve",quantity,"R1"))
        assert history(db,"POOL-1")==original and not db.in_transaction
    for value in ["", " ", "has space", "é", "x"*65, "x' OR 1=1--", None, True, 1, []]:
        fails(ValueError,lambda:execute(db,value,0,"open",1))
        fails(ValueError,lambda:execute(db,"POOL-1",1,"reserve",1,value))
        assert history(db,"POOL-1")==original and not db.in_transaction
    for expected in [-1,True,1.0,"1",None]:
        fails(ValueError,lambda:execute(db,"POOL-1",expected,"reserve",1,"R1"))
    fails(ValueError,lambda:execute(db,"POOL-1",1,"unknown",1,"R1"))
    execute(db,"POOL-1",1,"reserve",1000,"x"*64)
    assert state(db)==(2,1000,{"x"*64:1000},0)
    execute(db,"POOL-1",2,"release",1000,"x"*64)
    assert state(db)==(3,1000,{"x"*64:0},1000)
    execute(db,"x"*64,0,"open",1)
    execute(db,"x"*64,1,"reserve",1,"R1")
    assert state(db,"x"*64)==(2,1,{"R1":1},0)
    # New expected revision is not command identity: both reserves are accepted.
    execute(db,"RETRY",0,"open",5)
    execute(db,"RETRY",1,"reserve",1,"R1")
    execute(db,"RETRY",2,"reserve",1,"R1")
    assert state(db,"RETRY")== (3,5,{"R1":2},3)

# Both writers use revision one; exactly one conditional append can win.
with closing(connect("race.sqlite")) as db: execute(db,"POOL-1",0,"open",20)
barrier=Barrier(2)
def reserve(rid):
    with closing(connect("race.sqlite")) as db:
        assert len(history(db,"POOL-1"))==1
        barrier.wait(timeout=5)
        try: execute(db,"POOL-1",1,"reserve",12,rid); return "accepted"
        except Conflict: return "conflict"
with ThreadPoolExecutor(max_workers=2) as workers:
    assert sorted(workers.map(reserve,["R1","R2"]))==["accepted","conflict"]
with closing(connect("race.sqlite")) as db:
    revision,capacity,held,available=state(db)
    assert revision==2 and capacity==20 and sum(held.values())==12 and available==8
    fails(ValueError,lambda:execute(db,"POOL-1",2,"reserve",12,"LOSER"))
    assert len(history(db,"POOL-1"))==2

# A failure after insertion rolls back the entire append and revision remains free.
with closing(connect("rollback.sqlite")) as db:
    execute(db,"POOL-1",0,"open",20)
    original=history(db,"POOL-1")
    db.execute("CREATE TRIGGER fail_insert AFTER INSERT ON events BEGIN SELECT RAISE(ABORT,'blocked'); END")
    fails(sqlite3.IntegrityError,lambda:execute(db,"POOL-1",1,"reserve",3,"R1"))
    assert history(db,"POOL-1")==original and not db.in_transaction
    db.execute("DROP TRIGGER fail_insert")
    execute(db,"POOL-1",1,"reserve",3,"R1")
    assert state(db)==(2,20,{"R1":3},17)

with closing(connect("busy.sqlite")) as owner, closing(connect("busy.sqlite")) as retry:
    execute(owner,"POOL-1",0,"open",20)
    original=history(owner,"POOL-1")
    retry.execute("PRAGMA busy_timeout=0")
    owner.execute("BEGIN IMMEDIATE")
    fails(sqlite3.OperationalError,lambda:execute(retry,"POOL-1",1,"reserve",3,"R1"))
    owner.rollback()
    assert history(retry,"POOL-1")==original and not retry.in_transaction
    owner.execute("BEGIN")
    history(owner,"POOL-1")
    fails(sqlite3.OperationalError,lambda:execute(retry,"POOL-1",1,"reserve",3,"R1"))
    assert not retry.in_transaction
    owner.rollback()
    assert history(retry,"POOL-1")==original
    execute(retry,"POOL-1",1,"reserve",3,"R1")
    assert state(retry)==(2,20,{"R1":3},17)

with closing(connect("crash.sqlite")) as db: execute(db,"POOL-1",0,"open",20)
child=subprocess.run([sys.executable,"-c",'''
import os
from event_store import connect
c=connect("crash.sqlite")
c.execute("BEGIN IMMEDIATE")
c.execute("INSERT INTO events VALUES (?,?,?,?,?,?)",("POOL-1",2,"Reserved",1,3,"R1"))
os._exit(23)
'''],capture_output=True,text=True,timeout=5)
assert child.returncode==23,child.stderr
with closing(connect("crash.sqlite")) as db:
    assert state(db)==(1,20,{},20)
    execute(db,"POOL-1",1,"reserve",3,"R1")
    assert state(db)==(2,20,{"R1":3},17)
print("Event Sourcing replay, revision, append, failure, and concurrency checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['event_store.py', 'demo.py'],
    stdout: expected,
    verification:
      'Exact demo output; reconstruction at revisions two and three; retained earlier prefix unchanged; repeated pure replay with file/database I/O forbidden; no history mutation; close/reopen recovery from authoritative events alone; expected-revision rejection adds nothing; insufficient-capacity and reservation-aware over-release rejection; stream isolation; application update/delete trigger rejection; unknown schema/type, broken order, and invalid fixed-v1 facts fail visibly; exact 1/1000-seat and 64/65-character ID boundaries; invalid inputs leave no event; two concurrent revision-one writers yield one append and one conflict, with losing command re-evaluated against capacity; forced after-insert failure rolls back; busy-BEGIN and failed-COMMIT propagate with rollback and later retry; abrupt process exit before commit preserves earlier stream; newly versioned retries intentionally are not deduplicated. No authentication, external notification, asynchronous projection, schema migration, or production power-loss guarantee is inferred.',
  };
  const out = resolve(root, '.local/software-event-sourcing');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
