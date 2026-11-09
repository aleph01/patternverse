import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bundle = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = bundle.patterns.find((p) => p.id === 'active-record');
const article = await readFile(resolve(root, 'content/patterns/active-record.md'), 'utf8');
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

with tempfile.TemporaryDirectory(prefix='patternverse-active-record-') as directory:
    for name, source in examples.items():
        pathlib.Path(directory, name).write_text(source)
    sys.path.insert(0, directory)
    Task = importlib.import_module('task').Task
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        'new ID: None\\n'
        'saved ID: 1\\n'
        'object done: True\\n'
        'stored done: False\\n'
        'committed done: True\\n'
        'rename: Completed task cannot be renamed\\n'
    ), repr(output.getvalue())

    def connect(path=':memory:'):
        db = sqlite3.connect(path)
        db.execute('CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 80), done INTEGER NOT NULL CHECK(done IN (0, 1)))')
        return db
    with contextlib.closing(connect()) as db:
        assert Task.find(db, 999) is None
        for bad in ['', ' ', '\\t', '\\n', 'x'*81, None, True, 12, 'bad\\nline']:
            raises(ValueError, lambda: Task(db, bad))
        for bad in [0, 1, 'false', None]:
            raises(ValueError, lambda: Task(db, 'Task', done=bad))
        for bad in [0, -1, True, '1', 1.5]:
            raises(ValueError, lambda: Task(db, 'Task', task_id=bad))
            raises(ValueError, lambda: Task.find(db, bad))
        raises(ValueError, lambda: Task.find(db, None))
        task = Task(db, 'x'*80)
        assert task.task_id is None and not db.in_transaction
        assert db.execute('SELECT COUNT(*) FROM tasks').fetchone() == (0,)
        for name, value in [('task_id', 9), ('title', 'bypass'), ('done', True)]:
            raises(AttributeError, lambda: setattr(task, name, value))
        raises(ValueError, lambda: task.rename(' '))
        assert task.title == 'x'*80
        task.rename(" Label 'cartons' ")
        with db:
            task.save()
        key = task.task_id
        assert type(key) is int and key > 0
        loaded = Task.find(db, key)
        assert loaded is not task and loaded.title == " Label 'cartons' " and not loaded.done
        with db:
            task.save()  # An unchanged update still matches an existing record.
        assert db.execute('SELECT COUNT(*) FROM tasks').fetchone() == (1,)
        task.complete()
        task.complete()  # Completion is idempotent.
        assert task.done and not Task.find(db, key).done
        raises(ValueError, lambda: task.rename('Changed'))
        assert task.title == " Label 'cartons' "
        with db:
            task.save()
        assert Task.find(db, key).done
        with db:
            db.execute('DELETE FROM tasks WHERE id = ?', (key,))
        try:
            with db:
                task.save()
        except LookupError:
            pass
        else:
            raise AssertionError('Missing save must reject')
        assert Task.find(db, key) is None
        db.execute('PRAGMA ignore_check_constraints = ON')
        with db:
            db.execute("INSERT INTO tasks VALUES (50, 'bad flag', 2)")
            db.execute("INSERT INTO tasks VALUES (51, '', 0)")
        raises(ValueError, lambda: Task.find(db, 50))
        raises(ValueError, lambda: Task.find(db, 51))
        db.execute('DROP TABLE tasks')
        raises(sqlite3.OperationalError, lambda: Task.find(db, 1))

    path = str(pathlib.Path(directory, 'tasks.sqlite'))
    with contextlib.closing(connect(path)) as writer, contextlib.closing(sqlite3.connect(path)) as reader:
        pending = Task(writer, 'pending')
        pending.save()
        pending_id = pending.task_id
        assert writer.in_transaction and Task.find(reader, pending_id) is None
        writer.rollback()
        assert pending.task_id == pending_id and Task.find(writer, pending_id) is None
        # Discard pending: an assigned ID did not survive as a committed row.
        fresh = Task(writer, 'saved')
        with writer:
            fresh.save()
        assert Task.find(reader, fresh.task_id).title == 'saved'
        fresh.complete()
        fresh.save()
        assert writer.in_transaction and not Task.find(reader, fresh.task_id).done
        writer.rollback()
        assert fresh.done and not Task.find(writer, fresh.task_id).done
        loaded = Task.find(writer, fresh.task_id)
        loaded.complete()
        class Abort(Exception):
            pass
        second = Task(writer, 'second')
        try:
            with writer:
                loaded.save()
                second.save()
                raise Abort()
        except Abort:
            pass
        assert loaded.done and not Task.find(reader, loaded.task_id).done
        assert second.task_id is not None and Task.find(reader, second.task_id) is None
        first_copy = Task.find(writer, loaded.task_id)
        stale_copy = Task.find(writer, loaded.task_id)
        first_copy.complete()
        with writer:
            first_copy.save()
        stale_copy.rename('Stale edit')
        with writer:
            stale_copy.save()
        assert not Task.find(reader, loaded.task_id).done  # No stale-write protection supplied.
    raises(sqlite3.ProgrammingError, lambda: stale_copy.save())
print('Active Record: both runnable files and exact output verified; title/flag/ID validation, read-only public properties, rename guard, idempotent completion, new versus existing save, no implicit save or commit, missing and corrupt rows, assigned IDs after rollback, object/row divergence, caller rollback across records, cross-connection visibility, connection lifetime, and the explicit stale-overwrite limitation checked.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
