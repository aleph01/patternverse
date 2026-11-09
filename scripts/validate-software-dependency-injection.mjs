import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'dependency-injection');
const article = await readFile(resolve(root, 'content/patterns/dependency-injection.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, sqlite3, sys, tempfile
examples = json.load(sys.stdin)
assert set(examples) == {'quotation.py', 'prices.py', 'main.py'}
imports = {node.module for node in ast.walk(ast.parse(examples['quotation.py']))
           if isinstance(node, ast.ImportFrom)}
assert imports == {'typing'}
assert not any(isinstance(n, ast.Import) for n in ast.walk(ast.parse(examples['quotation.py'])))

class TrackingConnection(sqlite3.Connection):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cursors = []
    def execute(self, *args, **kwargs):
        cursor = super().execute(*args, **kwargs)
        self.cursors.append(cursor)
        return cursor

original_connect = sqlite3.connect
opened = []
def connect(*args, **kwargs):
    kwargs['factory'] = TrackingConnection
    connection = original_connect(*args, **kwargs)
    opened.append(connection)
    return connection

def raises(error_type, action):
    try:
        action()
    except error_type as error:
        return error
    raise AssertionError('Expected ' + error_type.__name__)

with tempfile.TemporaryDirectory(prefix='patternverse-dependency-injection-') as directory:
    for filename, source in examples.items():
        pathlib.Path(directory, filename).write_text(source)
    sys.path.insert(0, directory)
    QuoteService = importlib.import_module('quotation').QuoteService
    providers = importlib.import_module('prices')
    MemoryPrices, SqlitePrices = providers.MemoryPrices, providers.SqlitePrices
    sqlite3.connect = connect
    try:
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            main = runpy.run_path(str(pathlib.Path(directory, 'main.py')))
        assert output.getvalue() == 'sqlite 375\\nmemory 375\\n'
        assert len(opened) == 1
        raises(sqlite3.ProgrammingError, lambda: opened[0].execute('SELECT 1'))
        raises(sqlite3.ProgrammingError, lambda: main['database_quotes'].total('pen', 3))
        assert main['fixture_quotes'].total('pen', 3) == 375
    finally:
        sqlite3.connect = original_connect

    raises(TypeError, lambda: QuoteService())
    class SpyPrices:
        def __init__(self, cents=125):
            self.cents = cents
            self.calls = []
        def unit_price(self, sku):
            self.calls.append(sku)
            return self.cents
    spy = SpyPrices()
    quotes = QuoteService(spy)
    for quantity in [0, -1, 1.5, True, '3', None]:
        raises(ValueError, lambda: quotes.total('pen', quantity))
    assert spy.calls == []  # Reject before touching a collaborator.
    assert quotes.total('pen', 3) == 375 and spy.calls == ['pen']
    assert QuoteService(SpyPrices(0)).total('gift', 3) == 0
    for cents in [-1, 12.5, True, '125', None]:
        raises(ValueError, lambda: QuoteService(SpyPrices(cents)).total('pen', 3))
    failure = OSError('Provider unavailable')
    class BrokenPrices:
        def unit_price(self, sku):
            raise failure
    assert raises(OSError, lambda: QuoteService(BrokenPrices()).total('pen', 1)) is failure
    # Shape annotations do not install runtime provider validation.
    raises(AttributeError, lambda: QuoteService(object()).total('pen', 1))

    seed = {'pen': 125}
    memory = MemoryPrices(seed)
    seed['pen'] = 500
    assert QuoteService(memory).total('pen', 3) == 375
    assert QuoteService(MemoryPrices({'pen': 200})).total('pen', 3) == 600
    assert QuoteService(memory).total('pen', 1) == 125
    assert raises(KeyError, lambda: QuoteService(memory).total('missing', 1)).args == ('missing',)

    with contextlib.closing(connect(':memory:')) as connection:
        connection.execute('CREATE TABLE prices (sku TEXT PRIMARY KEY, unit_cents INTEGER)').close()
        for sku, cents in [('pen', 125), ('gift', 0), ('bad', -1), ('text', 'invalid')]:
            connection.execute('INSERT INTO prices VALUES (?, ?)', (sku, cents)).close()
        connection.commit()
        sql_quotes = QuoteService(SqlitePrices(connection))
        assert sql_quotes.total('pen', 3) == QuoteService(memory).total('pen', 3)
        assert sql_quotes.total('gift', 3) == 0
        assert raises(KeyError, lambda: sql_quotes.total('missing', 1)).args == ('missing',)
        for sku in ['bad', 'text']:
            raises(ValueError, lambda: sql_quotes.total(sku, 1))
        assert connection.execute('SELECT 1').fetchone() == (1,)
        connection.cursors[-1].close()
        for cursor in connection.cursors:
            raises(sqlite3.ProgrammingError, cursor.fetchone)
        # Failed SQL propagates and does not cause the borrower to close the connection.
        connection.execute('DROP TABLE prices').close()
        raises(sqlite3.OperationalError, lambda: sql_quotes.total('pen', 1))
        connection.execute('SELECT 1').close()
    raises(sqlite3.ProgrammingError, lambda: connection.execute('SELECT 1'))

    # Exercise the actual startup block's exceptional path and closing wrapper.
    broken = dict(examples)
    broken['main.py'] = broken['main.py'].replace('total("pen", 3)', 'total("missing", 3)', 1)
    pathlib.Path(directory, 'failure_main.py').write_text(broken['main.py'])
    sqlite3.connect = connect
    try:
        raises(KeyError, lambda: runpy.run_path(str(pathlib.Path(directory, 'failure_main.py'))))
        raises(sqlite3.ProgrammingError, lambda: opened[-1].execute('SELECT 1'))
    finally:
        sqlite3.connect = original_connect
print('Dependency Injection: actual output, explicit consumer imports, required collaborators, provider substitution, quantity and price boundaries, failure propagation, fixture isolation, borrowed connections, cursor cleanup, and connection closure on normal and exceptional exits verified.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
