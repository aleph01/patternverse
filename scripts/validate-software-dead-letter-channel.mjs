import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/data-dead-letter-queues.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-dead-letter-channel-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['channel.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'retry',
    'parked',
    'already_parked',
    "('E901', b'pack order O42', 3)",
    'retained D902: Failure channel full',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from channel import open_store, disposition
from contextlib import closing
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import sqlite3
import subprocess
import sys

CODE = "DEPENDENCY_UNAVAILABLE"


def enqueue(db, receipt="D1", event="E1", body=b"original bytes", enqueued=0):
    db.execute("INSERT INTO pending VALUES (?,?,?,?)",(receipt,event,body,enqueued))


def snapshot(db):
    return (db.execute("SELECT * FROM pending ORDER BY receipt_id").fetchall(),
            db.execute("SELECT * FROM dead ORDER BY receipt_id").fetchall())


def fails(error, call):
    try: call()
    except error: return
    raise AssertionError("Expected " + error.__name__)


raw = b'\\x00unparsed original\\xff'
with closing(open_store("flow.sqlite")) as db:
    enqueue(db,body=raw,enqueued=10)
    original = snapshot(db)
    for count in [1,2]:
        assert disposition(db,"D1",count,CODE,20) == "retry"
        assert snapshot(db) == original and not db.in_transaction
    assert disposition(db,"D1",3,CODE,30) == "parked"
    expected = ("D1","E1",raw,10,30,3,CODE,"orders","packer-v1")
    assert snapshot(db) == ([],[expected]) and not db.in_transaction
with closing(open_store("flow.sqlite")) as db:
    saved = snapshot(db)
    assert disposition(db,"D1",1000,CODE,999) == "already_parked"
    assert snapshot(db) == saved  # A repeat call does not rewrite original failure evidence.
    enqueue(db,"D2","E2")
    saved = snapshot(db)
    fails(OverflowError,lambda:disposition(db,"D2",3,CODE,40))
    assert snapshot(db) == saved and not db.in_transaction
    # Capacity is counted under the same writer transaction as transfer.
    assert len(saved[0])+len(saved[1]) == 2

# Reject after failure-copy insertion but before source deletion: both changes roll back.
with closing(open_store("rollback.sqlite")) as db:
    enqueue(db)
    db.executescript("CREATE TRIGGER block_delete BEFORE DELETE ON pending BEGIN SELECT RAISE(ABORT,'blocked'); END;")
    original = snapshot(db)
    fails(sqlite3.IntegrityError,lambda:disposition(db,"D1",3,CODE,30))
    assert snapshot(db) == original and not db.in_transaction
    db.execute("DROP TRIGGER block_delete")
    assert disposition(db,"D1",3,CODE,30) == "parked"

# Two independent connections transfer the same receipt once.
with closing(open_store("same.sqlite")) as db: enqueue(db)
barrier = Barrier(2)
def same(_):
    with closing(open_store("same.sqlite")) as db:
        barrier.wait(timeout=5)
        return disposition(db,"D1",3,CODE,30)
with ThreadPoolExecutor(max_workers=2) as executor:
    assert sorted(executor.map(same,range(2))) == ["already_parked","parked"]
with closing(open_store("same.sqlite")) as db:
    pending,dead = snapshot(db)
    assert not pending and len(dead) == 1

# Two different receipts contend for one failure slot without losing either receipt.
with closing(open_store("capacity.sqlite")) as db:
    enqueue(db); enqueue(db,"D2","E2")
barrier = Barrier(2)
def different(receipt):
    with closing(open_store("capacity.sqlite")) as db:
        barrier.wait(timeout=5)
        try: return disposition(db,receipt,3,CODE,30)
        except OverflowError: return "full"
with ThreadPoolExecutor(max_workers=2) as executor:
    assert sorted(executor.map(different,["D1","D2"])) == ["full","parked"]
with closing(open_store("capacity.sqlite")) as db:
    pending,dead = snapshot(db)
    assert len(pending) == len(dead) == 1
    assert {pending[0][0],dead[0][0]} == {"D1","D2"}

# An abrupt process exit between insert and delete preserves the pending instruction.
with closing(open_store("crash.sqlite")) as db: enqueue(db)
child = subprocess.run([sys.executable,"-c",'''
import os
from channel import open_store
c=open_store("crash.sqlite")
c.execute("BEGIN IMMEDIATE")
c.execute("INSERT INTO dead VALUES (?,?,?,?,?,?,?,?,?)",("D1","E1",b"original bytes",0,30,3,"DEPENDENCY_UNAVAILABLE","orders","packer-v1"))
os._exit(23)
'''],capture_output=True,text=True,timeout=5)
assert child.returncode == 23,child.stderr
with closing(open_store("crash.sqlite")) as db:
    assert snapshot(db) == ([("D1","E1",b"original bytes",0)],[])
    assert disposition(db,"D1",3,CODE,30) == "parked"

# Both a busy BEGIN and a commit failure propagate without source loss.
with closing(open_store("busy.sqlite")) as owner, closing(open_store("busy.sqlite")) as retry:
    enqueue(owner)
    retry.execute("PRAGMA busy_timeout=0")
    original = snapshot(owner)
    owner.execute("BEGIN IMMEDIATE")
    fails(sqlite3.OperationalError,lambda:disposition(retry,"D1",3,CODE,30))
    owner.rollback()
    assert snapshot(retry) == original and not retry.in_transaction
    owner.execute("BEGIN")
    owner.execute("SELECT * FROM pending").fetchall()
    fails(sqlite3.OperationalError,lambda:disposition(retry,"D1",3,CODE,30))
    assert not retry.in_transaction
    owner.rollback()
    assert snapshot(retry) == original
    assert disposition(retry,"D1",3,CODE,30) == "parked"

with closing(open_store("validation.sqlite")) as db:
    enqueue(db,enqueued=10)
    original = snapshot(db)
    for count in [0,-1,1001,True,False,1.0,"3",None]:
        fails(ValueError,lambda:disposition(db,"D1",count,CODE,30))
        assert snapshot(db) == original and not db.in_transaction
    for now in [-1,2**63,True,False,1.0,"30",None,9]:
        fails(ValueError,lambda:disposition(db,"D1",3,CODE,now))
        assert snapshot(db) == original and not db.in_transaction
    for code in ["", "UNKNOWN", "DEPENDENCY_UNAVAILABLE ", None, [], True]:
        fails(ValueError,lambda:disposition(db,"D1",3,code,30))
        assert snapshot(db) == original and not db.in_transaction
    for receipt in ["", " ", "with space", "é", "x"*65, None, 1, True, []]:
        fails(ValueError,lambda:disposition(db,receipt,3,CODE,30))
        assert snapshot(db) == original and not db.in_transaction
    fails(KeyError,lambda:disposition(db,"MISSING",3,CODE,30))
    assert snapshot(db) == original and not db.in_transaction
    assert disposition(db,"D1",1000,CODE,10) == "parked"
with closing(open_store("body-limit.sqlite")) as db:
    enqueue(db,receipt="x"*64,body=b"x"*4096)
    fails(sqlite3.IntegrityError,lambda:enqueue(db,"TOO-BIG",body=b"x"*4097))
    fails(sqlite3.IntegrityError,lambda:enqueue(db,"TEXT",body="not bytes"))
    assert disposition(db,"x"*64,3,CODE,0) == "parked"
    assert len(db.execute("SELECT body FROM dead").fetchone()[0]) == 4096
print("Dead Letter Channel transaction, capacity, concurrency, crash, and boundary checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['channel.py', 'demo.py'],
    stdout: expected,
    verification:
      'Exact demo output; 1/2 versus 3/1000 authoritative-failure-count boundaries; byte-exact original BLOB and complete expected failure metadata; unchanged retry state; reopening and already-parked status without rewriting evidence; full destination retaining source; forced error after failure insertion before deletion with full rollback; simultaneous same-receipt transfer once; two different receipts contending for one slot with no loss; abrupt subprocess exit between insertion and deletion; busy-BEGIN and failed-COMMIT propagation/rollback; invalid IDs/classification/counts/timestamps and missing-receipt handling without mutation; exact enqueue-time and signed-64-bit limits; 64/65-character receipt ID and 4096/4097-byte BLOB limits. No broker, handler, redrive, or power-loss guarantee is inferred.',
  };
  const out = resolve(root, '.local/software-dead-letter-channel');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
