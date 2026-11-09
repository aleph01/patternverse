import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bundle = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = bundle.patterns.find((p) => p.id === 'unit-of-work');
const article = await readFile(resolve(root, 'content/patterns/unit-of-work.md'), 'utf8');
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

with tempfile.TemporaryDirectory(prefix='patternverse-unit-of-work-') as directory:
    for name, source in examples.items():
        pathlib.Path(directory, name).write_text(source)
    sys.path.insert(0, directory)
    module = importlib.import_module('uow')
    Label, UnitOfWork = module.Label, module.UnitOfWork
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        'before commit: Original\\n'
        "committed: [('A', 'Ready'), ('B', 'New')]\\n"
        'without commit: Ready\\n'
        'failed batch: rolled back\\n'
        "after failure: [('A', 'Ready'), ('B', 'New')]\\n"
    ), repr(output.getvalue())
    for bad in ['', ' ', None, True, 1, 'é']:
        raises(ValueError, lambda: Label(bad, 'text'))
    for bad in ['', ' ', None, True, 1, 'x'*41, 'bad\\nline']:
        raises(ValueError, lambda: Label('A', bad))
    label = Label('A', 'x'*40)
    raises(FrozenInstanceError, lambda: setattr(label, 'text', 'changed'))

    def connect(path=':memory:'):
        db = sqlite3.connect(path, isolation_level=None, timeout=0)
        db.execute('CREATE TABLE labels (id TEXT PRIMARY KEY, text TEXT NOT NULL)')
        db.executemany('INSERT INTO labels VALUES (?, ?)', [('A', 'Original'), ('C', 'Obsolete')])
        return db
    def state(db):
        return db.execute('SELECT * FROM labels ORDER BY id').fetchall()
    class Abort(Exception):
        pass
    with contextlib.closing(connect()) as db:
        baseline = state(db)
        trace = []
        db.set_trace_callback(trace.append)
        work = UnitOfWork(db)
        raises(RuntimeError, work.commit)
        with work:
            work.register_dirty(Label('A', 'Ready'))
            work.register_new(Label('B', 'New'))
            work.register_deleted(Label('C', 'Obsolete'))
            assert trace == [] and not db.in_transaction
            work.commit()
            raises(RuntimeError, lambda: work.register_new(Label('X', 'late')))
            raises(RuntimeError, work.commit)
        assert trace[0] == 'BEGIN IMMEDIATE' and trace[-1] == 'COMMIT'
        assert [s.split()[0] for s in trace[1:-1]] == ['UPDATE', 'INSERT', 'DELETE']
        assert state(db) == [('A', 'Ready'), ('B', 'New')]
        assert work._closed and work._changes == {} and not db.in_transaction
        raises(RuntimeError, work.__enter__)
        before = state(db)
        trace.clear()
        with UnitOfWork(db) as no_commit:
            no_commit.register_dirty(Label('A', 'Draft'))
        assert trace == [] and no_commit._changes == {} and state(db) == before
        try:
            with UnitOfWork(db) as abandoned:
                abandoned.register_deleted(Label('A', 'Ready'))
                raise Abort()
        except Abort:
            pass
        assert abandoned._closed and abandoned._changes == {} and state(db) == before
        try:
            with UnitOfWork(db) as duplicate_registration:
                duplicate_registration.register_new(Label('X', 'first'))
                duplicate_registration.register_dirty(Label('X', 'second'))
        except ValueError:
            pass
        else:
            raise AssertionError('Duplicate intent must reject')
        assert duplicate_registration._closed and state(db) == before
        with UnitOfWork(db) as bad_type:
            raises(TypeError, lambda: bad_type.register_new({'id': 'X'}))
        trace.clear()
        try:
            with UnitOfWork(db) as failed:
                failed.register_dirty(Label('A', 'Wrong'))
                failed.register_new(Label('B', 'Duplicate'))
                failed.commit()
        except sqlite3.IntegrityError:
            pass
        else:
            raise AssertionError('Conflict must propagate')
        assert any(s.startswith('UPDATE') for s in trace) and trace[-1] == 'ROLLBACK'
        assert failed._closed and failed._changes == {} and not db.in_transaction
        assert state(db) == before
        for kind in ['dirty', 'deleted']:
            try:
                with UnitOfWork(db) as missing:
                    missing.register_dirty(Label('A', 'Undo this'))
                    getattr(missing, 'register_' + kind)(Label('Z', 'missing'))
                    missing.commit()
            except LookupError:
                pass
            else:
                raise AssertionError('Missing existing label must reject')
            assert state(db) == before and missing._closed and not db.in_transaction
        db.execute('BEGIN IMMEDIATE')
        db.execute("UPDATE labels SET text = 'Caller pending' WHERE id = 'A'")
        try:
            with UnitOfWork(db) as nested:
                nested.register_dirty(Label('A', 'Wrong owner'))
                nested.commit()
        except RuntimeError:
            pass
        else:
            raise AssertionError('Nested transaction must reject')
        assert db.in_transaction and state(db)[0] == ('A', 'Caller pending')
        db.execute('ROLLBACK')
        assert state(db) == before
        try:
            with UnitOfWork(db) as already_committed:
                already_committed.register_dirty(Label('A', 'Committed'))
                already_committed.commit()
                raise Abort()
        except Abort:
            pass
        assert state(db)[0] == ('A', 'Committed')  # Exception after commit cannot undo it.
        with UnitOfWork(db) as empty:
            empty.commit()
        with UnitOfWork(db) as exact_ids:
            exact_ids.register_new(Label(" A-'quoted' ", 'x'*40))
            exact_ids.commit()
        assert state(db)[0] == (" A-'quoted' ", 'x'*40)
    with contextlib.closing(sqlite3.connect(':memory:')) as default_db:
        try:
            with UnitOfWork(default_db) as wrong_mode:
                wrong_mode.commit()
        except RuntimeError:
            pass
        else:
            raise AssertionError('Explicit transaction mode required')

    path = str(pathlib.Path(directory, 'labels.sqlite'))
    with contextlib.closing(connect(path)) as writer, contextlib.closing(sqlite3.connect(path, isolation_level=None, timeout=0)) as observer:
        writer.execute('BEGIN IMMEDIATE')
        try:
            with UnitOfWork(observer) as busy:
                busy.register_new(Label('B', 'New'))
                busy.commit()
        except sqlite3.OperationalError:
            pass
        else:
            raise AssertionError('Writer contention must surface')
        assert busy._closed and busy._changes == {} and not observer.in_transaction
        writer.execute('ROLLBACK')
        with UnitOfWork(writer) as good:
            good.register_dirty(Label('A', 'Visible'))
            good.register_new(Label('B', 'New'))
            good.register_deleted(Label('C', 'Obsolete'))
            good.commit()
        assert state(observer) == [('A', 'Visible'), ('B', 'New')]
        proposal = Label('A', 'Stale proposal')
        observer.execute("UPDATE labels SET text = 'Newer' WHERE id = 'A'")
        with UnitOfWork(writer) as stale:
            stale.register_dirty(proposal)
            stale.commit()
        assert state(observer)[0] == ('A', 'Stale proposal')  # No expected-version guard.
    with UnitOfWork(writer) as closed_connection:
        raises(sqlite3.ProgrammingError, closed_connection.commit)
print('Unit of Work: two runnable files and exact output verified; explicit new/dirty/deleted tracking, no SQL during registration, defined write ordering, success and no-commit discard, duplicate intents, immutable snapshots, later-write and missing-row rollback, single-use lifecycle, existing-transaction ownership, commit finality, exact IDs, writer contention, committed visibility, connection lifetime, and stale-proposal limitation checked.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
