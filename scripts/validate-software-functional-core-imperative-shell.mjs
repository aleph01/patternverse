import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'functional-core-imperative-shell');
const article = await readFile(
  resolve(root, 'content/patterns/functional-core-imperative-shell.md'),
  'utf8',
);
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, builtins, contextlib, copy, csv, importlib, io, json, pathlib, runpy, sys, tempfile
from dataclasses import FrozenInstanceError
examples = json.load(sys.stdin)
assert set(examples) == {'core.py', 'shell.py', 'demo.py'}
tree = ast.parse(examples['core.py'])
assert {n.module for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)} == {'dataclasses'}
assert not any(isinstance(n, (ast.Import, ast.Global, ast.Nonlocal)) for n in ast.walk(tree))
assert not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
               and n.func.id in {'open', 'print', 'input', 'eval', 'exec', '__import__'}
               for n in ast.walk(tree))
# Focused source checks, not a general Python purity prover.

def raises(kind, action):
    try:
        action()
    except kind as error:
        return error
    raise AssertionError('Expected ' + kind.__name__)

with tempfile.TemporaryDirectory(prefix='patternverse-functional-core-') as directory:
    for filename, source in examples.items():
        pathlib.Path(directory, filename).write_text(source)
    sys.path.insert(0, directory)
    core = importlib.import_module('core')
    shell = importlib.import_module('shell')
    Item, Proposal, plan = core.Item, core.Proposal, core.plan_reorders
    items = (Item('pen', 3, 3, 10), Item('pad', 4, 3, 10))
    before = copy.deepcopy(items)
    result = plan(items)
    assert result == (Proposal('pen', 7),)
    assert plan(items) == result and items == before
    assert isinstance(result, tuple) and result[0] is not items[0]
    raises(FrozenInstanceError, lambda: setattr(items[0], 'on_hand', 999))
    raises(FrozenInstanceError, lambda: setattr(result[0], 'units', 999))
    assert plan(()) == ()
    assert plan((Item('pen', 2, 3, 10),)) == (Proposal('pen', 8),)
    assert plan((Item('pen', 4, 3, 10),)) == ()
    assert plan((Item('pen', 0, 0, 10),)) == (Proposal('pen', 10),)
    assert plan((Item('pen', 0, 0, 0),)) == ()
    assert plan((Item('pen', 3, 3, 3),)) == ()
    assert plan((Item('pen', 11, 3, 10),)) == ()
    assert plan((Item('z', 1, 3, 10), Item('a', 0, 2, 5))) == (
        Proposal('z', 9), Proposal('a', 5))
    # A new external observation needs a new call; an old result never refreshes itself.
    assert plan((Item('pen', 8, 3, 10),)) == ()
    assert result == (Proposal('pen', 7),)
    raises(ValueError, lambda: plan((items[0], items[0])))
    raises(ValueError, lambda: plan((Item('pen', 10, 5, 4),)))
    for sku in ['', '  ', 3, None]:
        raises(ValueError, lambda: plan((Item(sku, 0, 3, 10),)))
    for invalid in [-1, 1.5, True, '3', None]:
        for field in ['on_hand', 'reorder_point', 'target']:
            values = dict(sku='pen', on_hand=0, reorder_point=3, target=10)
            values[field] = invalid
            raises(ValueError, lambda: plan((Item(**values),)))

    opened = []
    events = []
    def tracked_open(path, mode='r', **kwargs):
        if mode == 'w':
            assert all(handle.closed for handle in opened)
        events.append((str(path), mode))
        handle = builtins.open(path, mode, **kwargs)
        opened.append(handle)
        return handle
    shell.open = tracked_open
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == 'sku,units\\npen,7\\n'
    assert [mode for _, mode in events] == ['r', 'w']
    assert all(handle.closed for handle in opened)

    source = pathlib.Path(directory, 'source.csv')
    destination = pathlib.Path(directory, 'output.csv')
    header = 'sku,on_hand,reorder_point,target\\n'
    def run_csv(body):
        source.write_text(header + body)
        shell.generate_reorders(source, destination)
        with destination.open(newline='') as stream:
            return list(csv.reader(stream))
    assert run_csv('') == [['sku', 'units']]
    assert run_csv('"pen, blue",3,3,10\\npad,4,3,10\\n') == [
        ['sku', 'units'], ['pen, blue', '7']]
    assert run_csv('z,0,3,10\\na,0,2,5\\n') == [['sku', 'units'], ['z', '10'], ['a', '5']]
    for bad in ['pen,3,3,10\\nbad,-1,3,10\\n',
                'pen,3,3,10\\npen,0,3,10\\n',
                'pen,3.5,3,10\\n']:
        source.write_text(header + bad)
        destination.write_text('unchanged sentinel')
        events.clear()
        raises(ValueError, lambda: shell.generate_reorders(source, destination))
        assert destination.read_text() == 'unchanged sentinel'
        assert [mode for _, mode in events] == ['r']
        assert all(handle.closed for handle in opened)
    source.write_text('wrong,columns\\npen,3\\n')
    destination.write_text('unchanged sentinel')
    raises(KeyError, lambda: shell.generate_reorders(source, destination))
    assert destination.read_text() == 'unchanged sentinel'
    assert all(handle.closed for handle in opened)
    source.write_text(header + 'pen,3,3,10\\n')
    original = source.read_bytes()
    events.clear()
    raises(ValueError, lambda: shell.generate_reorders(source, source))
    assert source.read_bytes() == original and events == []
    raises(FileNotFoundError, lambda: shell.generate_reorders(source.with_name('absent.csv'), destination))
    assert destination.read_text() == 'unchanged sentinel'
    raises(IsADirectoryError, lambda: shell.generate_reorders(source, pathlib.Path(directory)))
    assert all(handle.closed for handle in opened)

    failure = OSError('Simulated write failure')
    class FailingOutput:
        def __init__(self, stream):
            self.stream = stream
            self.writes = 0
        def __enter__(self):
            return self
        def __exit__(self, *args):
            self.stream.close()
        def write(self, text):
            self.writes += 1
            if self.writes == 2:
                raise failure
            return self.stream.write(text)
    def fail_write(path, mode='r', **kwargs):
        stream = tracked_open(path, mode, **kwargs)
        return FailingOutput(stream) if mode == 'w' else stream
    shell.open = fail_write
    assert raises(OSError, lambda: shell.generate_reorders(source, destination)) is failure
    assert destination.read_text() == 'sku,units\\n'  # Partial output, not atomic rollback.
    assert all(handle.closed for handle in opened)
print('Functional Core, Imperative Shell: exact demo output, deterministic value decisions, unchanged inputs, frozen results, thresholds, ordering, invalid batches before output, actual CSV files, resource closure, stale snapshots, and partial write failure semantics verified.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
