import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'ports-and-adapters');
const article = await readFile(resolve(root, 'content/patterns/ports-and-adapters.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, sys, tempfile
examples = json.load(sys.stdin)
expected_imports = {
    'application.py': {'typing'},
    'adapters.py': {'sqlite3', 'application'},
    'main.py': {'sqlite3', 'contextlib', 'application', 'adapters'},
    'test_application.py': {'application'},
}
assert set(examples) == set(expected_imports)
with tempfile.TemporaryDirectory(prefix='patternverse-ports-adapters-') as directory:
    for name, source in examples.items():
        tree = ast.parse(source, filename=name)
        imports = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                imports.add(node.module)
            elif isinstance(node, ast.Import):
                imports.update(alias.name for alias in node.names)
        assert imports == expected_imports[name], (name, imports)
        pathlib.Path(directory, name).write_text(source)
    sys.path.insert(0, directory)
    application = importlib.import_module('application')
    assert 'adapters' not in sys.modules and 'sqlite3' not in sys.modules
    captured = io.StringIO()
    with contextlib.redirect_stdout(captured):
        isolated = runpy.run_path(str(pathlib.Path(directory, 'test_application.py')))
    assert captured.getvalue() == 'isolated checks passed\\n'
    assert 'adapters' not in sys.modules and 'sqlite3' not in sys.modules

    class RecordingStock:
        def __init__(self):
            self.calls = []
        def take(self, sku, units):
            self.calls.append((sku, units))
            return True
    recorder = RecordingStock()
    app = application.ReserveStock(recorder)
    for units in [0, -1, True, False, 1.5, '2', None]:
        try:
            app.reserve('notebook', units)
        except ValueError:
            pass
        else:
            raise AssertionError(('Invalid units accepted', units))
    assert recorder.calls == [], 'Invalid quantities crossed the outgoing port'

    adapters = importlib.import_module('adapters')
    sqlite3 = importlib.import_module('sqlite3')
    for text in ['two', '2.5', '0', '-1']:
        try:
            adapters.reserve_text(app, 'notebook', text)
        except ValueError:
            pass
        else:
            raise AssertionError(('Invalid text accepted', text))
    assert recorder.calls == []
    assert adapters.reserve_text(app, 'notebook', '2') == 'reserved'
    assert recorder.calls == [('notebook', 2)]

    def initialize(db):
        db.execute('CREATE TABLE stock (sku TEXT PRIMARY KEY, units INTEGER NOT NULL CHECK(units >= 0))')
        db.execute('INSERT INTO stock VALUES (?, ?)', ('notebook', 3))
        db.commit()

    # Exercise the same successful, insufficient, missing, and exact-exhaustion
    # behavior through both the real adapter and the article's substitute.
    with contextlib.closing(sqlite3.connect(':memory:')) as db:
        initialize(db)
        variants = [
            (adapters.SQLiteStock(db), lambda: db.execute('SELECT units FROM stock').fetchone()[0]),
        ]
        memory = isolated['MemoryStock']()
        variants.append((memory, lambda: memory.units['notebook']))
        for stock, remaining in variants:
            service = application.ReserveStock(stock)
            assert service.reserve('notebook', 2) == 'reserved'
            assert remaining() == 1
            assert service.reserve('notebook', 2) == 'unavailable'
            assert remaining() == 1, 'Insufficient stock changed inventory'
            assert service.reserve('missing', 1) == 'unavailable'
            assert remaining() == 1
            assert service.reserve('notebook', 1) == 'reserved'
            assert remaining() == 0
            assert service.reserve('notebook', 1) == 'unavailable'
            assert remaining() == 0

    # A broken infrastructure contract must raise the application's failure,
    # rather than turn a storage error into an ordinary shortage.
    for closed in [False, True]:
        db = sqlite3.connect(':memory:')
        if closed:
            db.close()
        try:
            application.ReserveStock(adapters.SQLiteStock(db)).reserve('notebook', 1)
        except application.StockUnavailable as error:
            assert isinstance(error.__cause__, sqlite3.Error)
        else:
            raise AssertionError('Storage failure was hidden')
        finally:
            db.close()

    # Separate connections see committed success and unchanged stock on a
    # failed allocation. The adapter does not leave its transaction open.
    database = str(pathlib.Path(directory, 'stock.sqlite'))
    with contextlib.closing(sqlite3.connect(database)) as first:
        initialize(first)
        service = application.ReserveStock(adapters.SQLiteStock(first))
        assert service.reserve('notebook', 2) == 'reserved'
        assert not first.in_transaction
        with contextlib.closing(sqlite3.connect(database)) as second:
            assert second.execute('SELECT units FROM stock').fetchone()[0] == 1
            assert application.ReserveStock(adapters.SQLiteStock(second)).reserve('notebook', 2) == 'unavailable'
            assert not second.in_transaction
            assert first.execute('SELECT units FROM stock').fetchone()[0] == 1

    captured = io.StringIO()
    with contextlib.redirect_stdout(captured):
        main = runpy.run_path(str(pathlib.Path(directory, 'main.py')), run_name='__main__')
    assert captured.getvalue() == 'reserved\\nunavailable\\n', captured.getvalue()
    try:
        main['db'].execute('SELECT 1')
    except sqlite3.ProgrammingError:
        pass
    else:
        raise AssertionError('Startup wiring did not close its connection')

print('Ports and Adapters: isolated application, import boundaries, real and substitute allocation, exact exhaustion, invalid input, storage failures, committed visibility, and connection closure verified.')
`;
const result = spawnSync('python3', ['-I', '-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  timeout: 10_000,
});
if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
process.stdout.write(result.stdout);
