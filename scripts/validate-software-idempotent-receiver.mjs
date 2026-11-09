import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/idempotent-receiver.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-idempotent-receiver-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['receiver.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'before lost acknowledgment: 40',
    'duplicate 40',
    'applied 80',
    'conflict: Identity reused with different payload',
    'final stock: 80',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from receiver import open_store, receive, CONSUMER
from contextlib import closing
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from pathlib import Path
import sqlite3
import subprocess
import sys


def quantity(db, sku="MUG"):
    row = db.execute("SELECT units FROM inventory WHERE sku=?",(sku,)).fetchone()
    return 0 if row is None else row[0]


def snapshot(db):
    return (db.execute("SELECT * FROM processed ORDER BY consumer,source,event_id").fetchall(),
            db.execute("SELECT * FROM inventory ORDER BY sku").fetchall())


def fails(error, call):
    try: call()
    except error: return
    raise AssertionError("Expected " + error.__name__)


# Lost acknowledgment after committed work: a new connection remembers the same operation.
with closing(open_store("replay.sqlite")) as db:
    assert receive(db,"warehouse-a","E901","MUG",40) == "applied"
    assert not db.in_transaction and quantity(db) == 40
with closing(open_store("replay.sqlite")) as db:
    assert receive(db,"warehouse-a","E901","MUG",40) == "duplicate"
    assert quantity(db) == 40 and not db.in_transaction
    assert receive(db,"warehouse-a","E902","MUG",40) == "applied"
    assert receive(db,"warehouse-b","E901","MUG",40) == "applied"
    assert quantity(db) == 120
    saved = snapshot(db)
    fails(ValueError,lambda:receive(db,"warehouse-a","E901","BOOK",40))
    fails(ValueError,lambda:receive(db,"warehouse-a","E901","MUG",41))
    assert snapshot(db) == saved and not db.in_transaction
    assert all(row[0] == CONSUMER for row in saved[0])

# A constraint failure after inserting the processed row rolls back both pieces of work.
with closing(open_store("rollback.sqlite")) as db:
    db.execute("INSERT INTO inventory VALUES ('MUG',999980)")
    fails(sqlite3.IntegrityError,lambda:receive(db,"source","E1","MUG",40))
    assert quantity(db) == 999980
    assert db.execute("SELECT COUNT(*) FROM processed").fetchone()[0] == 0
    assert not db.in_transaction
    db.execute("UPDATE inventory SET units=units-20 WHERE sku='MUG'")
    assert receive(db,"source","E1","MUG",40) == "applied"
    assert receive(db,"source","E1","MUG",40) == "duplicate"
    assert quantity(db) == 1000000

# Independent simultaneous writers contend on the same file, not on a Python lock.
with closing(open_store("concurrent.sqlite")) as db: pass
barrier = Barrier(2)
def worker(_):
    with closing(open_store("concurrent.sqlite")) as db:
        barrier.wait(timeout=5)
        return receive(db,"source","E1","MUG",40)
with ThreadPoolExecutor(max_workers=2) as executor:
    outcomes = list(executor.map(worker, range(2)))
assert sorted(outcomes) == ["applied","duplicate"]
with closing(open_store("concurrent.sqlite")) as db:
    assert quantity(db) == 40
    assert db.execute("SELECT COUNT(*) FROM processed").fetchone()[0] == 1

# An abrupt process exit before COMMIT is not a completed receipt.
with closing(open_store("crash.sqlite")) as db: pass
child = subprocess.run([sys.executable,"-c",'''
import os
from receiver import open_store, CONSUMER
c = open_store("crash.sqlite")
c.execute("BEGIN IMMEDIATE")
c.execute("INSERT INTO processed VALUES (?,?,?,?,?)",(CONSUMER,"source","E1","MUG",40))
c.execute("INSERT INTO inventory VALUES ('MUG',40)")
os._exit(23)
'''],capture_output=True,text=True,timeout=5)
assert child.returncode == 23,child.stderr
with closing(open_store("crash.sqlite")) as db:
    assert snapshot(db) == ([],[])
    assert receive(db,"source","E1","MUG",40) == "applied"
    assert quantity(db) == 40

# Busy BEGIN and failed COMMIT propagate without a false success or residual marker.
with closing(open_store("busy.sqlite")) as owner, closing(open_store("busy.sqlite")) as retry:
    retry.execute("PRAGMA busy_timeout=0")
    owner.execute("BEGIN IMMEDIATE")
    fails(sqlite3.OperationalError,lambda:receive(retry,"source","E1","MUG",40))
    assert not retry.in_transaction
    owner.rollback()
    assert receive(retry,"source","E1","MUG",40) == "applied"
    owner.execute("BEGIN")
    owner.execute("SELECT * FROM inventory").fetchall()  # Retain a read transaction.
    fails(sqlite3.OperationalError,lambda:receive(retry,"source","E2","MUG",40))
    assert not retry.in_transaction
    owner.rollback()
    assert quantity(retry) == 40
    assert retry.execute("SELECT COUNT(*) FROM processed").fetchone()[0] == 1
    assert receive(retry,"source","E2","MUG",40) == "applied"
    assert quantity(retry) == 80

with closing(open_store("validation.sqlite")) as db:
    for units in [1,1000]:
        assert receive(db,"s",f"E{units}","MUG",units) == "applied"
    assert quantity(db) == 1001
    saved = snapshot(db)
    for units in [0,-1,1001,True,False,1.0,"1",None]:
        fails(ValueError,lambda:receive(db,"s","BAD","MUG",units))
        assert snapshot(db) == saved and not db.in_transaction
    for index in range(3):
        for value in ["", " ", "with space", "é", "x"*65, 1, None, True, []]:
            values = ["s","BAD","MUG"]; values[index] = value
            fails(ValueError,lambda:receive(db,*values,1))
            assert snapshot(db) == saved and not db.in_transaction
    assert receive(db,"s"*64,"e"*64,"k"*64,1) == "applied"
    assert quantity(db,"k"*64) == 1
    # An already active caller transaction violates the dedicated-idle-connection precondition.
    db.execute("BEGIN")
    db.execute("INSERT INTO inventory VALUES ('BORROWED',1)")
    fails(sqlite3.OperationalError,lambda:receive(db,"s","IDLE","MUG",1))
    assert db.in_transaction  # The failed BEGIN did not roll back the caller's transaction.
    db.rollback()
    assert quantity(db,"BORROWED") == 0
print("Idempotent Receiver transaction, concurrency, crash, and boundary checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['receiver.py', 'demo.py'],
    stdout: expected,
    verification:
      'Exact demo output; committed-state replay after connection reopening; legitimate new event and source scopes; conflicting SKU/quantity reuse with unchanged state; stock-constraint rollback of ledger and inventory followed by a successful retry; two simultaneous independent SQLite connections applying one effect; abrupt subprocess exit before commit with clean recovery; busy BEGIN and commit-failure propagation/rollback followed by retry; 1/1000-unit boundaries and malformed/Boolean/range rejection; ASCII identifier grammar and 64/65-character limits; idle-connection precondition without rolling back a caller-owned transaction. No broker, external-effect, or power-loss guarantee is inferred.',
  };
  const out = resolve(root, '.local/software-idempotent-receiver');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
