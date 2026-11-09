import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'blackboard');
const article = await readFile(resolve(root, 'content/patterns/blackboard.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, sys, tempfile
examples = json.load(sys.stdin)
expected_imports = {
    'controller.py': {'dataclasses', 'types', 'typing'},
    'sources.py': {'controller'},
    'main.py': {'controller', 'sources'},
}
assert set(examples) == set(expected_imports)
with tempfile.TemporaryDirectory(prefix='patternverse-blackboard-') as directory:
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
    controller = importlib.import_module('controller')
    assert 'sources' not in sys.modules, 'Control imports specialist knowledge'
    sources = importlib.import_module('sources').SOURCES
    solve, KS = controller.solve, controller.KnowledgeSource
    goal = lambda b: b.get('interpretation') == 'invoice-supported'
    initial = {'tokens': ('ITEM', 'TOTAL'), 'row_lengths': (3, 3, 3)}
    original = dict(initial)
    status, board, trace = solve(initial, sources, goal)
    assert status == 'solved'
    assert trace == ['layout', 'text', 'combine']
    assert board == {**initial, 'has_table': True, 'candidate': 'invoice', 'interpretation': 'invoice-supported'}
    assert initial == original and board is not initial
    assert solve(initial, list(reversed(sources)), goal) == (status, board, trace)

    # The actual evidence, not registration order, determines eligible work.
    assert solve({'tokens': ('total',), 'has_table': True}, sources, goal)[2] == ['text', 'combine']
    assert solve({'candidate': 'invoice', 'row_lengths': (2, 2)}, sources, goal)[2] == ['layout', 'combine']
    for incomplete in [{}, {'tokens': ('TOTAL',)}, {'row_lengths': (3, 3)},
                       {'tokens': ('TOTAL',), 'row_lengths': (3, 2)},
                       {'tokens': ('MEMO',), 'row_lengths': (3, 3)}]:
        outcome, partial, history = solve(incomplete, sources, goal)
        assert outcome == 'stalled' and not goal(partial)
        assert len(history) == len(set(history)), 'A source fired repeatedly'
    outcome, partial, history = solve({'tokens': ('TOTAL',)}, sources, goal)
    assert partial['candidate'] == 'invoice' and history == ['text']

    # Budgets count executed contributions; reaching the goal at the boundary
    # succeeds, while eligible work remaining at the boundary is unfinished.
    for limit, expected_trace in [(0, []), (1, ['layout']), (2, ['layout', 'text'])]:
        outcome, partial, history = solve(initial, sources, goal, budget=limit)
        assert outcome == 'budget' and history == expected_trace and not goal(partial)
    assert solve(initial, sources, goal, budget=3)[0] == 'solved'
    assert solve({'interpretation': 'invoice-supported'}, sources, goal, budget=0)[0] == 'solved'
    assert solve({}, [], goal, budget=0) == ('stalled', {}, [])
    for limit in [-1, True, 1.5, '3']:
        try:
            solve(initial, sources, goal, budget=limit)
        except ValueError:
            pass
        else:
            raise AssertionError(('Invalid budget accepted', limit))

    # Equal priorities use source identity for deterministic selection.
    tied = [KS('z', 1, lambda b: True, lambda b: {'z': 1}),
            KS('a', 1, lambda b: True, lambda b: {'a': 1})]
    assert solve({}, tied, lambda b: 'a' in b)[2] == ['a']
    try:
        solve({}, [tied[0], tied[0]], lambda b: False)
    except ValueError as error:
        assert str(error) == 'Source names must be unique'
    else:
        raise AssertionError('Duplicate source identities accepted')

    # Expensive production runs only for the selected source. A goal stops
    # the controller before it invokes lower-priority, still-eligible work.
    calls = []
    def distraction(b):
        calls.append('distraction')
        return {'unneeded': True}
    extra = KS('distraction', -1, lambda b: True, distraction)
    assert solve(initial, [extra, *sources], goal)[2] == trace
    assert calls == []

    # Each round observes fresh state, while saved snapshots remain stable.
    snapshots = []
    def first(b):
        snapshots.append(b)
        return {'first': True}
    def second(b):
        snapshots.append(b)
        return {'second': True}
    staged = [KS('first', 1, lambda b: True, first),
              KS('second', 1, lambda b: b.get('first') is True, second)]
    assert solve({}, staged, lambda b: b.get('second') is True)[2] == ['first', 'second']
    assert dict(snapshots[0]) == {} and dict(snapshots[1]) == {'first': True}
    def illegal_write(b):
        b['intrusion'] = True
        return {'result': True}
    try:
        solve({}, [KS('mutator', 1, lambda b: True, illegal_write)], lambda b: False)
    except TypeError:
        pass
    else:
        raise AssertionError('Contributor wrote through its snapshot')

    for patch in [{}, {'existing': 'replacement'}, {'new': True, 'existing': 'replacement'}]:
        supplied = {'existing': 'original'}
        try:
            solve(supplied, [KS('invalid', 1, lambda b: True, lambda b: patch)], lambda b: False)
        except ValueError as error:
            assert str(error) == 'Contributions must add new keys only'
        else:
            raise AssertionError('Empty or overwriting contribution accepted')
        assert supplied == {'existing': 'original'}
    effects = []
    def broken(b):
        effects.append('external effect')
        raise RuntimeError('knowledge source failed')
    try:
        solve({}, [KS('broken', 1, lambda b: True, broken)], lambda b: False)
    except RuntimeError as error:
        assert str(error) == 'knowledge source failed'
    else:
        raise AssertionError('Source failure was returned as an ordinary result')
    assert effects == ['external effect'], 'External effects were unexpectedly rolled back'

    captured = io.StringIO()
    with contextlib.redirect_stdout(captured):
        runpy.run_path(str(pathlib.Path(directory, 'main.py')), run_name='__main__')
    assert captured.getvalue() == 'solved invoice-supported\\nlayout -> text -> combine\\n', captured.getvalue()
print('Blackboard: actual modules, state-dependent scheduling, partial results, stopping and budget boundaries, deterministic ties, snapshot ownership, invalid contributions, and failure semantics verified.')
`;
const result = spawnSync('python3', ['-I', '-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  timeout: 10_000,
});
if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
process.stdout.write(result.stdout);
