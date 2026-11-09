import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'aggregate');
const article = await readFile(resolve(root, 'content/patterns/aggregate.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, itertools, json, pathlib, runpy, sys, tempfile
from dataclasses import FrozenInstanceError
examples = json.load(sys.stdin)
assert set(examples) == {'model.py', 'demo.py'}
tree = ast.parse(examples['model.py'])
assert {n.module for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)} == {'dataclasses'}
assert not any(isinstance(n, (ast.Import, ast.Global, ast.Nonlocal)) for n in ast.walk(tree))
assert not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
               and n.func.id in {'open', 'print', 'input', 'eval', 'exec', '__import__'}
               for n in ast.walk(tree))

def raises(kind, action):
    try:
        action()
    except kind as error:
        return error
    raise AssertionError('Expected ' + kind.__name__)

def weights(plan):
    return {item.package_id: item.kg for item in plan.allocations}

with tempfile.TemporaryDirectory(prefix='patternverse-aggregate-') as directory:
    for filename, source in examples.items():
        pathlib.Path(directory, filename).write_text(source)
    sys.path.insert(0, directory)
    model = importlib.import_module('model')
    LoadPlan, Allocation = model.LoadPlan, model.Allocation
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        demo = runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        'total kg: 100\\n'
        'rejected: Capacity exceeded\\n'
        'unchanged kg: 100\\n'
        'revised kg: 90\\n'
        'earlier snapshot kg: 60\\n'
    ), repr(output.getvalue())
    plan = demo['plan']
    assert plan.plan_id == 'plan-42'
    assert weights(plan) == {'pkg-A': 60, 'pkg-B': 30}
    assert tuple((a.package_id, a.kg) for a in demo['snapshot']) == (('pkg-A', 60),)
    empty = LoadPlan('empty', 100)
    assert empty.total_kg == 0 and empty.allocations == ()
    empty.allocate('A', 100)
    before = empty.allocations
    raises(ValueError, lambda: empty.allocate('B', 1))
    assert empty.allocations == before and empty.total_kg == 100
    raises(ValueError, lambda: empty.allocate('A', 101))
    assert empty.allocations == before
    empty.allocate('A', 40)
    assert weights(empty) == {'A': 40} and before[0].kg == 100
    empty.allocate('A', 40)
    assert weights(empty) == {'A': 40}  # Setting, not incrementing.
    raises(FrozenInstanceError, lambda: setattr(before[0], 'kg', 2))
    raises(FrozenInstanceError, lambda: setattr(before[0], 'package_id', 'B'))
    raises(AttributeError, lambda: empty.allocations.append(Allocation('B', 1)))
    raises(AttributeError, lambda: setattr(empty, 'allocations', ()))
    raises(AttributeError, lambda: setattr(empty, 'total_kg', 0))
    raises(AttributeError, lambda: setattr(empty, 'plan_id', 'changed'))
    for bad in ['', ' ', None, 1, True, [], {}]:
        raises(ValueError, lambda: LoadPlan(bad, 100))
        raises(ValueError, lambda: Allocation(bad, 1))
        snapshot = empty.allocations
        raises(ValueError, lambda: empty.allocate(bad, 1))
        assert empty.allocations == snapshot
    for bad in [0, -1, 1.5, 1.0, True, False, '1', None]:
        raises(ValueError, lambda: LoadPlan('x', bad))
        raises(ValueError, lambda: Allocation('A', bad))
        snapshot = empty.allocations
        raises(ValueError, lambda: empty.allocate('A', bad))
        assert empty.allocations == snapshot
    opaque = LoadPlan('other-plan', 10)
    opaque.allocate('A', 1)
    opaque.allocate(' A', 1)
    assert weights(opaque) == {'A': 1, ' A': 1}
    assert weights(empty) == {'A': 40}  # Same package ID across roots is allowed.
    large = LoadPlan('large-unit-count', 10**50)
    large.allocate('A', 10**50)
    assert large.total_kg == 10**50

    # Independent dictionary oracle checks every intermediate accepted/rejected state.
    commands = [('A', 1), ('A', 3), ('B', 2), ('B', 5), ('C', 1)]
    sequences = 0
    for capacity in [1, 3, 5]:
        for sequence in itertools.product(commands, repeat=4):
            root = LoadPlan('bounded-plan', capacity)
            expected = {}
            for package_id, kg in sequence:
                old_snapshot = root.allocations
                old_weights = weights(root)
                candidate = dict(expected)
                candidate[package_id] = kg
                if sum(candidate.values()) <= capacity:
                    root.allocate(package_id, kg)
                    expected = candidate
                else:
                    raises(ValueError, lambda: root.allocate(package_id, kg))
                assert weights(root) == expected
                assert root.total_kg == sum(expected.values()) <= capacity
                assert {a.package_id: a.kg for a in old_snapshot} == old_weights
                assert root.plan_id == 'bounded-plan'
            sequences += 1
    assert sequences == 1875

    # Arithmetic and ordered storage protocol from the second illustration only.
    # The article's LoadPlan deliberately implements no persistence or CAS primitive.
    left, right = LoadPlan('shared-plan', 100), LoadPlan('shared-plan', 100)
    for copy in [left, right]:
        copy.allocate('pkg-A', 60)
    left.allocate('pkg-B', 40)
    right.allocate('pkg-C', 30)
    assert left.total_kg == 100 and right.total_kg == 90
    stored = {'version': 7, 'weights': {'pkg-A': 60}}
    def ordered_commit(expected_version, candidate):
        if expected_version != stored['version']:
            return False
        stored.update(version=expected_version + 1, weights=weights(candidate))
        return True
    assert ordered_commit(7, left)
    assert not ordered_commit(7, right)
    assert stored == {'version': 8, 'weights': {'pkg-A': 60, 'pkg-B': 40}}
    reloaded = LoadPlan('shared-plan', 100)
    for package_id, kg in stored['weights'].items():
        reloaded.allocate(package_id, kg)
    raises(ValueError, lambda: reloaded.allocate('pkg-C', 30))
    assert reloaded.total_kg == 100
print('Aggregate: exact output, typed units, opaque IDs, root-controlled replacement, capacity rejection without mutation, immutable snapshots, 1875 bounded operation sequences, and ordered illustration trace verified. Persistence and concurrency primitives remain outside the example.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
