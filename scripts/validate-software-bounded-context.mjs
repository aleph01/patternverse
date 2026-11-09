import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'data-bounded-contexts');
const article = await readFile(resolve(root, 'content/patterns/data-bounded-contexts.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, sys, tempfile
from dataclasses import FrozenInstanceError
examples = json.load(sys.stdin)
assert set(examples) == {'billing.py', 'access.py', 'demo.py'}
for name, allowed in [('billing.py', {'dataclasses'}), ('access.py', {'dataclasses', 'billing'})]:
    tree = ast.parse(examples[name])
    assert {n.module for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)} == allowed
    assert not any(isinstance(n, (ast.Import, ast.Global, ast.Nonlocal)) for n in ast.walk(tree))
    assert not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
                   and n.func.id in {'open', 'print', 'input', 'eval', 'exec', '__import__'}
                   for n in ast.walk(tree))
    if name == 'access.py':
        imported = next(n for n in ast.walk(tree) if isinstance(n, ast.ImportFrom) and n.module == 'billing')
        assert {n.name for n in imported.names} == {'BillingCondition'}

def raises(kind, action):
    try:
        action()
    except kind as error:
        return error
    raise AssertionError('Expected ' + kind.__name__)

with tempfile.TemporaryDirectory(prefix='patternverse-bounded-context-') as directory:
    for filename, source in examples.items():
        pathlib.Path(directory, filename).write_text(source)
    sys.path.insert(0, directory)
    BillingCondition = importlib.import_module('billing').BillingCondition
    access = importlib.import_module('access')
    Workspace, assess_access = access.Workspace, access.assess_access
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        demo = runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        'current: keep_current_access\\n'
        'overdue: review_access\\n'
        'still enabled: True\\n'
        'wrong payer: Funding payer mismatch\\n'
        'unmapped: Funding mapping unresolved\\n'
    ), repr(output.getvalue())
    workspace = demo['workspace']
    current = BillingCondition('BILL-19', 'current')
    overdue = BillingCondition('BILL-19', 'overdue')
    assert workspace == Workspace('WS-301', 'BILL-19', True)
    for field, value in [('workspace_id', 'WS-other'), ('funding_payer_id', 'BILL-20'), ('enabled', False)]:
        raises(FrozenInstanceError, lambda: setattr(workspace, field, value))
    for field, value in [('payer_id', 'BILL-20'), ('payment_state', 'overdue')]:
        raises(FrozenInstanceError, lambda: setattr(current, field, value))
    for bad in ['', ' ', None, 0, True, [], {}]:
        raises(ValueError, lambda: BillingCondition(bad, 'current'))
        raises(ValueError, lambda: Workspace(bad, 'BILL-19', True))
        if bad is not None:
            raises(ValueError, lambda: Workspace('WS-301', bad, True))
    for bad in ['', 'late', 'Current', 'CURRENT', 'current ', None, 1, True, []]:
        raises(ValueError, lambda: BillingCondition('BILL-19', bad))
    for bad in [None, 0, 1, 'True', [], object()]:
        raises(TypeError, lambda: Workspace('WS-301', 'BILL-19', bad))
    for bad in [None, {'workspace_id': 'WS-301'}, object(), current]:
        raises(TypeError, lambda: assess_access(bad, current))
    for bad in [None, {'payer_id': 'BILL-19'}, object(), workspace]:
        raises(TypeError, lambda: assess_access(workspace, bad))

    for enabled in [False, True]:
        local = Workspace('WS-301', 'BILL-19', enabled)
        snapshot = (local.workspace_id, local.funding_payer_id, local.enabled)
        for condition, action in [(current, 'keep_current_access'), (overdue, 'review_access'),
                                  (current, 'keep_current_access')]:
            assert assess_access(local, condition) == action
            assert (local.workspace_id, local.funding_payer_id, local.enabled) == snapshot
        for other_id in ['BILL-20', 'bill-19', ' BILL-19']:
            for state in ['current', 'overdue']:
                error = raises(ValueError, lambda: assess_access(local, BillingCondition(other_id, state)))
                assert str(error) == 'Funding payer mismatch'
                assert (local.workspace_id, local.funding_payer_id, local.enabled) == snapshot
        unresolved = Workspace('WS-unknown', None, enabled)
        for condition in [current, overdue]:
            error = raises(ValueError, lambda: assess_access(unresolved, condition))
            assert str(error) == 'Funding mapping unresolved'
            assert unresolved.funding_payer_id is None and unresolved.enabled is enabled
    # One funding payer may relate to multiple workspaces; identity is not conflated.
    second = Workspace('WS-302', 'BILL-19', False)
    assert assess_access(workspace, overdue) == assess_access(second, overdue) == 'review_access'
    assert workspace.workspace_id != second.workspace_id
    assert workspace.enabled is True and second.enabled is False
    assert current.payment_state == 'current' and overdue.payment_state == 'overdue'
    opaque = Workspace(' WS-opaque ', ' BILL-19 ', True)
    assert assess_access(opaque, BillingCondition(' BILL-19 ', 'current')) == 'keep_current_access'
    assert opaque.workspace_id == ' WS-opaque '
print('Bounded Context: all three files and exact output verified; published-contract-only dependency, separate local validation, finite payment vocabulary, exact funding identity, mismatch/unresolved errors, immutable snapshots, independent access states, repeated assessments, and many-workspace funding references checked. No permission, persistence, or transport effect is implemented.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
