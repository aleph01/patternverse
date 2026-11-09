import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bundle = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = bundle.patterns.find((p) => p.id === 'transaction-script');
const article = await readFile(resolve(root, 'content/patterns/transaction-script.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length) throw new Error('Code file count mismatch');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import contextlib, importlib, io, json, pathlib, runpy, sqlite3, sys, tempfile
examples = json.load(sys.stdin)
def raises(kind, action):
    try:
        action()
    except kind as error:
        return error
    raise AssertionError('Expected ' + kind.__name__)

with tempfile.TemporaryDirectory(prefix='patternverse-transaction-script-') as directory:
    for name, source in examples.items():
        pathlib.Path(directory, name).write_text(source)
    sys.path.insert(0, directory)
    issue_stock = importlib.import_module('transactions').issue_stock
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        'remaining: 2\\n'
        'duplicate: rolled back\\n'
        'after duplicate: 2\\n'
        'exact remainder: 0\\n'
        'empty: Insufficient stock\\n'
        'movement rows: 2\\n'
    ), repr(output.getvalue())
    def connect(path=':memory:'):
        db = sqlite3.connect(path, isolation_level=None, timeout=0)
        db.execute('CREATE TABLE stock (sku TEXT PRIMARY KEY, available INTEGER NOT NULL CHECK(available >= 0))')
        db.execute('CREATE TABLE movements (id TEXT PRIMARY KEY, sku TEXT NOT NULL, units INTEGER NOT NULL CHECK(units > 0))')
        db.execute("INSERT INTO stock VALUES ('P-7', 5)")
        return db
    def state(db):
        return (db.execute('SELECT * FROM stock ORDER BY sku').fetchall(),
                db.execute('SELECT * FROM movements ORDER BY id').fetchall())
    with contextlib.closing(connect()) as db:
        trace = []
        db.set_trace_callback(trace.append)
        assert issue_stock(db, 'I-1', 'P-7', 3) == 2
        assert trace[0] == 'BEGIN IMMEDIATE' and trace[-1] == 'COMMIT'
        assert not db.in_transaction
        before = state(db)
        trace.clear()
        raises(sqlite3.IntegrityError, lambda: issue_stock(db, 'I-1', 'P-7', 1))
        assert any(s.startswith('UPDATE') for s in trace) and trace[-1] == 'ROLLBACK'
        assert state(db) == before and not db.in_transaction
        raises(LookupError, lambda: issue_stock(db, 'I-2', 'unknown', 1))
        for bad in [0, -1, True, 1.5, '1', None, 3]:
            raises(ValueError, lambda: issue_stock(db, 'I-2', 'P-7', bad))
            assert state(db) == before and not db.in_transaction
        for bad in ['', ' ', None, True, 3]:
            raises(ValueError, lambda: issue_stock(db, bad, 'P-7', 1))
            raises(ValueError, lambda: issue_stock(db, 'I-2', bad, 1))
        db.execute('BEGIN')
        db.execute("UPDATE stock SET available = 9 WHERE sku = 'P-7'")
        raises(RuntimeError, lambda: issue_stock(db, 'I-2', 'P-7', 1))
        assert db.in_transaction and state(db)[0] == [('P-7', 9)]
        db.execute('ROLLBACK')
        assert state(db) == before
        db.execute("INSERT INTO stock VALUES ('other', 10)")
        before = state(db)
        raises(sqlite3.IntegrityError, lambda: issue_stock(db, 'I-1', 'other', 4))
        assert state(db) == before
        assert issue_stock(db, 'I-2', 'P-7', 2) == 0
        assert state(db)[1] == [('I-1', 'P-7', 3), ('I-2', 'P-7', 2)]
        assert db.execute("SELECT available FROM stock WHERE sku = 'other'").fetchone() == (10,)
        before = state(db)
        raises(ValueError, lambda: issue_stock(db, 'I-3', 'P-7', 1))
        assert state(db) == before
        db.execute("INSERT INTO stock VALUES (?, 1)", (" P-'quoted' ",))
        assert issue_stock(db, " I-'quoted' ", " P-'quoted' ", 1) == 0
        assert db.execute('SELECT sku FROM movements WHERE id = ?', (" I-'quoted' ",)).fetchone() == (" P-'quoted' ",)
        db.execute('PRAGMA ignore_check_constraints = ON')
        for corrupt in [-1, 'broken', 1.25]:
            db.execute("UPDATE stock SET available = ? WHERE sku = 'other'", (corrupt,))
            before = state(db)
            raises(ValueError, lambda: issue_stock(db, 'I-bad', 'other', 1))
            assert state(db) == before and not db.in_transaction
    with contextlib.closing(sqlite3.connect(':memory:')) as db:
        raises(RuntimeError, lambda: issue_stock(db, 'I-1', 'P-7', 1))
    path = str(pathlib.Path(directory, 'stock.sqlite'))
    with contextlib.closing(connect(path)) as first, contextlib.closing(sqlite3.connect(path, isolation_level=None, timeout=0)) as second:
        first.execute('BEGIN IMMEDIATE')
        raises(sqlite3.OperationalError, lambda: issue_stock(second, 'I-1', 'P-7', 1))
        assert not second.in_transaction and state(second)[0] == [('P-7', 5)]
        first.execute('ROLLBACK')
        assert issue_stock(second, 'I-1', 'P-7', 5) == 0
        assert state(first) == ([('P-7', 0)], [('I-1', 'P-7', 5)])
print('Transaction Script: both runnable files and six exact output lines verified; positive whole units, exact remainder, empty stock, duplicate rollback after first write, unchanged other SKUs, missing/invalid inputs, corrupt stock rejection, opaque IDs, transaction ownership, caller connection lifetime, two-connection lock contention, and committed visibility checked.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
