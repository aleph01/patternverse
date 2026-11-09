import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bundle = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = bundle.patterns.find((p) => p.id === 'repository');
const article = await readFile(resolve(root, 'content/patterns/repository.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length) throw new Error('Code file count mismatch');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, sqlite3, sys, tempfile
from dataclasses import FrozenInstanceError
examples = json.load(sys.stdin)
assert {n.module for n in ast.walk(ast.parse(examples['model.py'])) if isinstance(n, ast.ImportFrom)} == {'dataclasses'}
def raises(kind, action):
    try:
        action()
    except kind as error:
        return error
    raise AssertionError('Expected ' + kind.__name__)

with tempfile.TemporaryDirectory(prefix='patternverse-repository-') as directory:
    for name, source in examples.items():
        pathlib.Path(directory, name).write_text(source)
    sys.path.insert(0, directory)
    Workshop = importlib.import_module('model').Workshop
    repositories = importlib.import_module('repositories')
    MemoryWorkshops, SqliteWorkshops = repositories.MemoryWorkshops, repositories.SqliteWorkshops
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        "memory: ('A', 'B')\\n"
        "sqlite: ('A', 'B')\\n"
        'missing: None\\n'
        'A fits four: False\\n'
        'duplicate: Workshop exists\\n'
    ), repr(output.getvalue())
    for bad in [-1, 1.5, True, '3', None]:
        raises(ValueError, lambda: Workshop('A', bad))
    for bad in ['', ' ', None, 1, True, 'é']:
        raises(ValueError, lambda: Workshop(bad, 2))

    def connect(path=':memory:'):
        db = sqlite3.connect(path)
        db.execute('CREATE TABLE workshops (id TEXT PRIMARY KEY, seats_left INTEGER NOT NULL CHECK(seats_left >= 0))')
        return db
    def contract(repo):
        assert repo.get('absent') is None
        assert repo.with_room_for(1) == ()
        values = (Workshop('B', 3), Workshop('A', 2), Workshop('C', 0), Workshop(" A-'quoted' ", 2), Workshop('a', 2))
        for value in values:
            repo.add(value)
        for value in values:
            assert repo.get(value.workshop_id) == value
        for count in range(1, 6):
            expected = tuple(sorted((w for w in values if w.seats_left >= count), key=lambda w: w.workshop_id))
            assert repo.with_room_for(count) == expected
        before = repo.get('A')
        raises(ValueError, lambda: repo.add(Workshop('A', 99)))
        assert repo.get('A') == before
        raises(FrozenInstanceError, lambda: setattr(before, 'seats_left', 99))
        for bad in [0, -1, 1.5, True, '2', None]:
            raises(ValueError, lambda: repo.with_room_for(bad))
            raises(ValueError, lambda: before.can_book(bad))
        assert before.can_book(2) and not before.can_book(3)
        for bad in ['', ' ', None, 1, True, 'é']:
            raises(ValueError, lambda: repo.get(bad))
        for bad in [None, {}, ('A', 2)]:
            raises(TypeError, lambda: repo.add(bad))
        return repo.with_room_for(2)

    memory = contract(MemoryWorkshops())
    with contextlib.closing(connect()) as db:
        repo = SqliteWorkshops(db)
        with db:
            actual = contract(repo)
        assert actual == memory and not db.in_transaction
        old = repo.get('A')
        with db:
            db.execute("UPDATE workshops SET seats_left = 1 WHERE id = 'A'")
        assert old.seats_left == 2 and repo.get('A').seats_left == 1
        assert not repo.get('A').can_book(2)
        db.execute("CREATE TRIGGER fail_insert BEFORE INSERT ON workshops WHEN NEW.id = 'blocked' BEGIN SELECT RAISE(ABORT, 'policy failure'); END")
        raises(sqlite3.IntegrityError, lambda: repo.add(Workshop('blocked', 1)))
        db.rollback()
        assert repo.get('blocked') is None
        db.execute('DROP TABLE workshops')
        raises(sqlite3.OperationalError, lambda: repo.get('A'))

    path = str(pathlib.Path(directory, 'workshops.sqlite'))
    with contextlib.closing(connect(path)) as first, contextlib.closing(sqlite3.connect(path)) as observer:
        repo = SqliteWorkshops(first)
        repo.add(Workshop('pending', 2))
        assert first.in_transaction
        assert SqliteWorkshops(observer).get('pending') is None
        first.rollback()
        assert repo.get('pending') is None
        with first:
            repo.add(Workshop('saved', 2))
        assert SqliteWorkshops(observer).get('saved') == Workshop('saved', 2)
        class Abort(Exception):
            pass
        try:
            with first:
                repo.add(Workshop('undo-one', 1))
                repo.add(Workshop('undo-two', 1))
                raise Abort()
        except Abort:
            pass
        assert repo.get('undo-one') is None and repo.get('undo-two') is None
        assert repo.get('saved').seats_left == 2
print('Repository: three runnable files and exact output verified; shared memory/SQLite contract, inclusive seat filtering, deterministic ordering, empty/missing results, duplicate preservation, strict inputs, immutable snapshots, stale-read limits, propagated storage failures, no hidden commit, caller rollback across additions, cross-connection visibility, and caller-owned connection lifetime checked.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
