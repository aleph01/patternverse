import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/cqrs.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-cqrs-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['cqrs.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'before: 2 available 0',
    'kept DTO: 2 0',
    'rejected: Insufficient seats',
    'fresh: 0 sold out 1',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from cqrs import open_write, open_read, book_seats, availability, SeatPool, Availability, SoldOut
from contextlib import closing
from dataclasses import FrozenInstanceError
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch
import sqlite3
import subprocess
import sys


def seed(db, show="SHOW-7", capacity=2, booked=0, title="Evening show"):
    db.execute("INSERT INTO shows VALUES (?,?,?,?,?)",(show,title,capacity,booked,0))


def snapshot(db):
    return db.execute("SELECT * FROM shows ORDER BY show_id").fetchall()


def fails(error,call):
    try: call()
    except error: return
    raise AssertionError("Expected " + error.__name__)


with closing(open_write("read-write.sqlite")) as writer, closing(open_read("read-write.sqlite")) as reader:
    seed(writer); seed(writer,"SHOW-8",capacity=3,title="A different show")
    original = snapshot(writer)
    with patch("cqrs.SeatPool", side_effect=AssertionError("Query loaded write model")):
        old = availability(reader,"SHOW-7")
        assert old == Availability("Evening show",2,"available",0)
        assert availability(reader,"SHOW-7") == old
    assert snapshot(writer) == original and not reader.in_transaction
    fails(FrozenInstanceError,lambda:setattr(old,"remaining",9))
    assert book_seats(writer,"SHOW-7",2) is None
    assert not writer.in_transaction
    assert old == Availability("Evening show",2,"available",0)
    before_rejection = snapshot(writer)
    fails(SoldOut,lambda:book_seats(writer,"SHOW-7",1))
    assert snapshot(writer) == before_rejection and not writer.in_transaction
    assert availability(reader,"SHOW-7") == Availability("Evening show",0,"sold out",1)
    assert availability(reader,"SHOW-8") == Availability("A different show",3,"available",0)
    assert snapshot(reader) == snapshot(writer)
    fails(sqlite3.OperationalError,lambda:reader.execute("UPDATE shows SET booked=0"))
    fails(sqlite3.OperationalError,lambda:book_seats(reader,"SHOW-8",1))
    assert snapshot(writer) == before_rejection and not reader.in_transaction
with closing(open_read("read-write.sqlite")) as reader:
    assert availability(reader,"SHOW-7").version == 1  # Reopened query sees committed state.

# The value-based command model is independent of its immutable query representation.
for capacity in [1,2,1000]:
    for booked in sorted({0,capacity-1}):
        model = SeatPool(capacity,booked)
        result = model.after_booking(capacity-booked)
        assert result == SeatPool(capacity,capacity)
        assert model == SeatPool(capacity,booked)
        fails(SoldOut,lambda:result.after_booking(1))
        fails(FrozenInstanceError,lambda:setattr(model,"booked",0))

# Separate simultaneous writer connections cannot both allocate the last seats.
with closing(open_write("concurrent.sqlite")) as db: seed(db)
barrier = Barrier(2)
def worker(_):
    with closing(open_write("concurrent.sqlite")) as writer:
        barrier.wait(timeout=5)
        try:
            book_seats(writer,"SHOW-7",2)
            return "booked"
        except SoldOut:
            return "rejected"
with ThreadPoolExecutor(max_workers=2) as executor:
    assert sorted(executor.map(worker,range(2))) == ["booked","rejected"]
with closing(open_read("concurrent.sqlite")) as reader:
    assert availability(reader,"SHOW-7") == Availability("Evening show",0,"sold out",1)

# A rejected update rolls back both the authoritative count and observation version.
with closing(open_write("rollback.sqlite")) as writer:
    seed(writer)
    original = snapshot(writer)
    writer.executescript("CREATE TRIGGER reject_update AFTER UPDATE ON shows BEGIN SELECT RAISE(ABORT,'blocked'); END;")
    fails(sqlite3.IntegrityError,lambda:book_seats(writer,"SHOW-7",1))
    assert snapshot(writer) == original and not writer.in_transaction
    writer.execute("DROP TRIGGER reject_update")
    book_seats(writer,"SHOW-7",1)
    assert availability(writer,"SHOW-7") == Availability("Evening show",1,"available",1)

# An abrupt process exit before commit leaves no accepted booking behind.
with closing(open_write("crash.sqlite")) as writer: seed(writer)
child = subprocess.run([sys.executable,"-c",'''
import os
from cqrs import open_write
c=open_write("crash.sqlite")
c.execute("BEGIN IMMEDIATE")
c.execute("UPDATE shows SET booked=2,version=1 WHERE show_id='SHOW-7'")
os._exit(23)
'''],capture_output=True,text=True,timeout=5)
assert child.returncode == 23,child.stderr
with closing(open_write("crash.sqlite")) as writer:
    assert availability(writer,"SHOW-7") == Availability("Evening show",2,"available",0)
    book_seats(writer,"SHOW-7",2)
    assert availability(writer,"SHOW-7") == Availability("Evening show",0,"sold out",1)

with closing(open_write("busy.sqlite")) as owner, closing(open_write("busy.sqlite")) as retry:
    seed(owner); retry.execute("PRAGMA busy_timeout=0")
    original = snapshot(owner)
    owner.execute("BEGIN IMMEDIATE")
    fails(sqlite3.OperationalError,lambda:book_seats(retry,"SHOW-7",1))
    owner.rollback()
    assert snapshot(retry) == original and not retry.in_transaction
    owner.execute("BEGIN")
    owner.execute("SELECT * FROM shows").fetchall()
    fails(sqlite3.OperationalError,lambda:book_seats(retry,"SHOW-7",1))
    assert not retry.in_transaction
    owner.rollback()
    assert snapshot(retry) == original
    book_seats(retry,"SHOW-7",1)
    assert availability(retry,"SHOW-7").version == 1

with closing(open_write("validation.sqlite")) as writer, closing(open_read("validation.sqlite")) as reader:
    seed(writer,capacity=1000)
    original = snapshot(writer)
    for quantity in [0,-1,1001,True,False,1.0,"1",None]:
        fails(ValueError,lambda:book_seats(writer,"SHOW-7",quantity))
        assert snapshot(writer) == original and not writer.in_transaction
    for show in ["", " ", "with space", "é", "x"*65, "x' OR 1=1--", 1, None, True, []]:
        fails(ValueError,lambda:book_seats(writer,show,1))
        fails(ValueError,lambda:availability(reader,show))
        assert snapshot(writer) == original and not writer.in_transaction
    fails(LookupError,lambda:book_seats(writer,"MISSING",1))
    fails(LookupError,lambda:availability(reader,"MISSING"))
    assert snapshot(writer) == original and not writer.in_transaction
    book_seats(writer,"SHOW-7",1000)
    assert availability(reader,"SHOW-7") == Availability("Evening show",0,"sold out",1)
    seed(writer,show="x"*64,capacity=1)
    book_seats(writer,"x"*64,1)
    assert availability(reader,"x"*64).remaining == 0
    # Queries return quoted title data as values, not dynamically assembled SQL.
    title = "Show'; DROP TABLE shows; --"
    seed(writer,show="QUOTED",capacity=1,title=title)
    assert availability(reader,"QUOTED").title == title
    # Successful commands are not deduplicated by CQRS or by the observation version.
    seed(writer,show="RETRY",capacity=4)
    book_seats(writer,"RETRY",1); book_seats(writer,"RETRY",1)
    assert availability(reader,"RETRY") == Availability("Evening show",2,"available",2)
print("CQRS model, freshness, read-only, transaction, and concurrency checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['cqrs.py', 'demo.py'],
    stdout: expected,
    verification:
      'Exact demo output; query projection bypasses SeatPool without mutating store; frozen old DTO and frozen value-based command model; normal command completion returns None after commit; fresh read sees version 1 while kept DTO stays at version 0; sold-out rejection leaves count/version unchanged; unrelated show isolation; read-only URI write rejection; reopened read consistency; exact 1/1000-seat and 64/65-character boundaries; invalid quantity/ID and missing-show rejection without mutation; concurrent writers cannot overbook; forced update-error rollback of count and version; abrupt pre-commit process exit recovery; busy-BEGIN and failed-COMMIT rollback with later successful retry; parameterized title data; repeated successful commands intentionally are not deduplicated. No asynchronous projection, event log, authentication, or booking lifecycle is inferred.',
  };
  const out = resolve(root, '.local/software-cqrs');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
