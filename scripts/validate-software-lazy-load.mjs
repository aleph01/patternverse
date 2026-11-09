import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bundle = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = bundle.patterns.find((p) => p.id === 'lazy-load');
const article = await readFile(resolve(root, 'content/patterns/lazy-load.md'), 'utf8');
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

with tempfile.TemporaryDirectory(prefix='patternverse-lazy-load-') as directory:
    for name, source in examples.items():
        pathlib.Path(directory, name).write_text(source)
    sys.path.insert(0, directory)
    module = importlib.import_module('documents')
    Document, DocumentReader, UNLOADED = module.Document, module.DocumentReader, module._UNLOADED
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        'title: Quarterly summary\\n'
        'body SELECTs before access: 0\\n'
        'first body: Revised detail\\n'
        'again: Revised detail\\n'
        'body SELECTs after access: 1\\n'
        'loaded after exit: Revised detail\\n'
        'unloaded after exit: rejected\\n'
    ), repr(output.getvalue())
    class Abort(Exception):
        pass
    calls = []
    def transient():
        calls.append(1)
        if len(calls) == 1:
            raise Abort()
        return None
    retrying = Document('Retry', transient)
    assert calls == [] and retrying._body is UNLOADED
    raises(Abort, lambda: retrying.body)
    assert len(calls) == 1 and retrying._body is UNLOADED and retrying._load_body is transient
    assert retrying.body is None and retrying.body is None and len(calls) == 2
    assert retrying._load_body is None

    def connect(path=':memory:'):
        db = sqlite3.connect(path, isolation_level=None)
        db.execute('CREATE TABLE documents (id INTEGER PRIMARY KEY, title TEXT, body TEXT)')
        db.executemany('INSERT INTO documents VALUES (?, ?, ?)', [
            (1, 'Summary', 'Original'), (2, 'Empty', ''), (3, 'Null', None),
            (4, 'Disappearing', 'Gone'), (5, 'Corrupt body', sqlite3.Binary(b'bad')),
            (6, None, 'Invalid header'),
        ])
        return db
    with contextlib.closing(connect()) as db:
        trace = []
        db.set_trace_callback(trace.append)
        reader = DocumentReader(db)
        raises(RuntimeError, lambda: reader.get(1))
        assert trace == []
        with reader:
            raises(RuntimeError, reader.__enter__)
            for bad in [None, True, False, 0, -1, 1.0, '1']:
                raises(ValueError, lambda: reader.get(bad))
            assert trace == []
            document = reader.get(1)
            assert len(trace) == 1 and trace[0].startswith('SELECT id, title ')
            assert document.title == 'Summary' and document._body is UNLOADED
            assert not db.in_transaction
            trace.clear()
            document.title = 'Local title'
            assert trace == []
            # The deferred callback retains the original key, not mutable title metadata.
            db.execute("UPDATE documents SET body = 'Later' WHERE id = 1")
            trace.clear()
            assert document.body == 'Later' and document.body == 'Later'
            assert len(trace) == 1 and trace[0].startswith('SELECT body ')
            assert document._load_body is None
            db.execute("UPDATE documents SET body = 'Newest' WHERE id = 1")
            trace.clear()
            assert document.body == 'Later' and trace == []
            for key, expected in [(2, ''), (3, None)]:
                optional = reader.get(key)
                trace.clear()
                assert optional.body == expected and optional.body == expected
                assert len(trace) == 1 and trace[0].startswith('SELECT body ')
                assert optional._body is not UNLOADED and optional._load_body is None
            assert reader.get(99) is None
            raises(ValueError, lambda: reader.get(6))
            corrupt = reader.get(5)
            raises(ValueError, lambda: corrupt.body)
            assert corrupt._body is UNLOADED and callable(corrupt._load_body)
            db.execute("UPDATE documents SET body = 'Repaired' WHERE id = 5")
            assert corrupt.body == 'Repaired' and corrupt._load_body is None
            disappearing = reader.get(4)
            db.execute('DELETE FROM documents WHERE id = 4')
            raises(LookupError, lambda: disappearing.body)
            assert disappearing._body is UNLOADED and callable(disappearing._load_body)
            # Two wrappers do not imply an Identity Map or shared field cache.
            left, right = reader.get(1), reader.get(1)
            assert left is not right
            trace.clear()
            assert left.body == right.body == 'Newest'
            assert len(trace) == 2 and all(s.startswith('SELECT body ') for s in trace)
            unopened = reader.get(2)
            trace.clear()
        assert reader._closed and trace == []
        assert document.body == 'Later' and trace == []
        raises(RuntimeError, lambda: unopened.body)
        raises(RuntimeError, lambda: reader.get(1))
        raises(RuntimeError, reader.__enter__)
        assert unopened._body is UNLOADED and trace == []
        assert db.execute('SELECT COUNT(*) FROM documents').fetchone()[0] == 5
        # A reader neither completes nor aborts a caller-owned transaction.
        db.execute('BEGIN')
        trace.clear()
        with DocumentReader(db) as borrowed:
            borrowed.get(1).body
        assert db.in_transaction
        assert len(trace) == 2 and all(s.startswith('SELECT') for s in trace)
        try:
            with DocumentReader(db) as failing:
                pending = failing.get(2)
                raise Abort()
        except Abort:
            pass
        assert failing._closed and db.in_transaction
        raises(RuntimeError, lambda: pending.body)
        db.execute('ROLLBACK')

    # Two real connections show the header/body timing and cache boundaries.
    path = str(pathlib.Path(directory, 'documents.sqlite'))
    with contextlib.closing(connect(path)) as reader_db, contextlib.closing(sqlite3.connect(path, isolation_level=None)) as writer:
        with DocumentReader(reader_db) as scope:
            old_header = scope.get(1)
            writer.execute("UPDATE documents SET title = 'Revised title', body = 'External' WHERE id = 1")
            assert old_header.title == 'Summary' and old_header.body == 'External'
            writer.execute("UPDATE documents SET body = 'External newest' WHERE id = 1")
            assert old_header.body == 'External'
        with DocumentReader(reader_db) as fresh:
            current = fresh.get(1)
            assert current.title == 'Revised title' and current.body == 'External newest'

    # A closed connection is not turned into a successful or empty load.
    db = connect()
    with DocumentReader(db) as broken:
        loaded, pending = broken.get(1), broken.get(2)
        assert loaded.body == 'Original'
        db.close()
        assert loaded.body == 'Original'
        raises(sqlite3.ProgrammingError, lambda: pending.body)
        assert pending._body is UNLOADED and callable(pending._load_body)
print('Lazy Load: both article files and seven exact output lines verified; omitted payload, zero body reads before access, retained success, empty/NULL results, transient and storage errors, failed validation and repair, row disappearance, scope exit before SQL, callback release, independent wrappers, caller transaction/connection ownership, external updates, mixed-time reads, and stale retained values checked.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
