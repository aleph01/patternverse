import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bundle = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = bundle.patterns.find((p) => p.id === 'service-layer');
const article = await readFile(resolve(root, 'content/patterns/service-layer.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length) throw new Error('Code file count mismatch');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import contextlib, importlib, io, json, pathlib, runpy, sqlite3, sys, tempfile
from dataclasses import FrozenInstanceError
examples = json.load(sys.stdin)
def raises(kind, action):
    try:
        action()
    except kind as error:
        return error
    raise AssertionError('Expected ' + kind.__name__)

with tempfile.TemporaryDirectory(prefix='patternverse-service-layer-') as directory:
    for name, source in examples.items():
        pathlib.Path(directory, name).write_text(source)
    sys.path.insert(0, directory)
    Workshop = importlib.import_module('model').Workshop
    book = importlib.import_module('application').book
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        'web seats left: 1\\n'
        'duplicate: rolled back\\n'
        'after duplicate: 1\\n'
        'CLI seats left: 0\\n'
        'booking rows: 2\\n'
    ), repr(output.getvalue())
    for bad in [-1, 1.5, True, '3', None]:
        raises(ValueError, lambda: Workshop(bad))
    workshop = Workshop(3)
    assert workshop.after_booking(3) == 0 and workshop.seats_left == 3
    raises(FrozenInstanceError, lambda: setattr(workshop, 'seats_left', 0))
    for bad in [0, -1, 1.5, True, '1', None]:
        raises(ValueError, lambda: workshop.after_booking(bad))
    raises(ValueError, lambda: workshop.after_booking(4))

    def connect(path=':memory:'):
        db = sqlite3.connect(path, isolation_level=None, timeout=0)
        db.execute('CREATE TABLE workshops (id TEXT PRIMARY KEY, seats_left INTEGER NOT NULL CHECK(seats_left >= 0))')
        db.execute('CREATE TABLE bookings (id TEXT PRIMARY KEY, workshop_id TEXT NOT NULL, seats INTEGER NOT NULL CHECK(seats > 0))')
        db.execute("INSERT INTO workshops VALUES ('W-1', 3)")
        return db
    def state(db):
        return (db.execute('SELECT * FROM workshops ORDER BY id').fetchall(),
                db.execute('SELECT * FROM bookings ORDER BY id').fetchall())
    with contextlib.closing(connect()) as db:
        trace = []
        db.set_trace_callback(trace.append)
        assert book(db, 'B-1', 'W-1', 2) == 1
        assert not db.in_transaction
        assert trace[0] == 'BEGIN IMMEDIATE' and trace[-1] == 'COMMIT'
        assert trace.index(next(s for s in trace if s.startswith('SELECT'))) < trace.index(next(s for s in trace if s.startswith('UPDATE')))
        before = state(db)
        trace.clear()
        raises(sqlite3.IntegrityError, lambda: book(db, 'B-1', 'W-1', 1))
        assert trace[-1] == 'ROLLBACK' and any(s.startswith('UPDATE') for s in trace)
        assert state(db) == before and not db.in_transaction
        raises(LookupError, lambda: book(db, 'B-2', 'unknown', 1))
        for seats in [0, -1, True, 1.5, '1', None, 2]:
            raises(ValueError, lambda: book(db, 'B-2', 'W-1', seats))
            assert state(db) == before and not db.in_transaction
        for bad in ['', ' ', None, True, 3]:
            raises(ValueError, lambda: book(db, bad, 'W-1', 1))
            raises(ValueError, lambda: book(db, 'B-2', bad, 1))
        db.execute('BEGIN')
        db.execute("UPDATE workshops SET seats_left = 3 WHERE id = 'W-1'")
        raises(RuntimeError, lambda: book(db, 'B-2', 'W-1', 1))
        assert db.in_transaction and state(db)[0] == [('W-1', 3)]
        db.execute('ROLLBACK')
        assert state(db) == before
        assert book(db, 'B-2', 'W-1', 1) == 0
        assert state(db)[1] == [('B-1', 'W-1', 2), ('B-2', 'W-1', 1)]
        raises(ValueError, lambda: book(db, 'B-3', 'W-1', 1))
        assert not db.in_transaction
        db.execute("INSERT INTO workshops VALUES (?, 1)", (" W-'quoted' ",))
        assert book(db, " B-'quoted' ", " W-'quoted' ", 1) == 0
        assert db.execute('SELECT workshop_id FROM bookings WHERE id = ?', (" B-'quoted' ",)).fetchone() == (" W-'quoted' ",)
    with contextlib.closing(sqlite3.connect(':memory:')) as db:
        raises(RuntimeError, lambda: book(db, 'B-1', 'W-1', 1))
    path = str(pathlib.Path(directory, 'bookings.sqlite'))
    with contextlib.closing(connect(path)) as first, contextlib.closing(sqlite3.connect(path, isolation_level=None, timeout=0)) as second:
        first.execute('BEGIN IMMEDIATE')
        raises(sqlite3.OperationalError, lambda: book(second, 'B-1', 'W-1', 1))
        assert not second.in_transaction and state(second)[0] == [('W-1', 3)]
        first.execute('ROLLBACK')
        assert book(second, 'B-1', 'W-1', 3) == 0
        assert state(first)[0] == [('W-1', 0)]
        assert state(first)[1] == [('B-1', 'W-1', 3)]
print('Service Layer: three runnable files, exact output, whole-seat rules, exact final seat, duplicate rollback after the first write, missing/invalid inputs, explicit transaction ownership, caller-owned connection lifetime, opaque IDs, two-connection lock contention, and committed cross-connection visibility verified.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
