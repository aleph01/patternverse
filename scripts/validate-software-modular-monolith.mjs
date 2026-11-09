import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'modular-monolith');
const article = await readFile(resolve(root, 'content/patterns/modular-monolith.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, subprocess, sys, tempfile
from dataclasses import FrozenInstanceError
examples = json.load(sys.stdin)
expected_imports = {
    'customers/_store.py': set(),
    'customers/__init__.py': {'dataclasses', 'customers._store'},
    'tickets/__init__.py': {'dataclasses', 'customers'},
    'main.py': {'customers', 'tickets'},
}
public = {'customers': {'Customers', 'CustomerView', 'CustomerUnavailable'},
          'tickets': {'Tickets', 'Ticket'}}
assert set(examples) == set(expected_imports)

def import_target(filename, node):
    if not node.level:
        return node.module or ''
    package = filename.split('/')[:-1]
    base = package[:len(package) - node.level + 1]
    return '.'.join(base + ([node.module] if node.module else []))

def check_architecture(files):
    # A deliberately narrow static policy for these example packages: external
    # callers import declared symbols from the public package, never internals.
    graph = {owner: set() for owner in public}
    for filename, source in files.items():
        owner = filename.split('/')[0] if '/' in filename else 'composition'
        for node in ast.walk(ast.parse(source, filename=filename)):
            if isinstance(node, ast.ImportFrom):
                target = import_target(filename, node)
                target_owner = target.split('.')[0]
                if target_owner in public and target_owner != owner:
                    if target != target_owner or any(a.name not in public[target_owner] for a in node.names):
                        raise ValueError('Cross-module internal import')
                    if owner in graph:
                        graph[owner].add(target_owner)
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    target_owner = alias.name.split('.')[0]
                    if target_owner in public and target_owner != owner:
                        raise ValueError('Use declared symbols from the public API')
    def visit(owner, ancestors):
        if owner in ancestors:
            raise ValueError('Cyclic capability dependency')
        for target in graph[owner]:
            visit(target, ancestors | {owner})
    for owner in graph:
        visit(owner, set())
    return graph

assert check_architecture(examples) == {'customers': set(), 'tickets': {'customers'}}
for illegal in ['from customers._store import CustomerStore',
                'from customers import _CustomerStore',
                'import customers._store']:
    broken = dict(examples)
    broken['tickets/__init__.py'] += '\\n' + illegal + '\\n'
    try:
        check_architecture(broken)
    except ValueError:
        pass
    else:
        raise AssertionError(('Boundary violation undetected', illegal))
broken = dict(examples)
broken['customers/__init__.py'] += '\\nfrom tickets import Tickets\\n'
try:
    check_architecture(broken)
except ValueError as error:
    assert str(error) == 'Cyclic capability dependency'
else:
    raise AssertionError('Circular module dependency undetected')

def save_files(directory, files):
    for name, source in files.items():
        path = pathlib.Path(directory, name)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(source)

with tempfile.TemporaryDirectory(prefix='patternverse-modular-monolith-') as directory:
    for name, source in examples.items():
        imports = set()
        for node in ast.walk(ast.parse(source, filename=name)):
            if isinstance(node, ast.ImportFrom):
                imports.add(import_target(name, node))
            elif isinstance(node, ast.Import):
                imports.update(alias.name for alias in node.names)
        assert imports == expected_imports[name], (name, imports)
    save_files(directory, examples)
    sys.path.insert(0, directory)
    customers = importlib.import_module('customers')
    tickets = importlib.import_module('tickets')
    customer_api = customers.Customers()
    ticket_api = tickets.Tickets(customer_api)
    view = customer_api.active_customer('c1')
    assert (view.id, view.display_name) == ('c1', 'Ada')
    try:
        view.display_name = 'Unexpected'
    except FrozenInstanceError:
        pass
    else:
        raise AssertionError('Customer view is mutable')
    for subject in ['', '   ', '\\n\\t']:
        try:
            ticket_api.open('c1', subject)
        except ValueError as error:
            assert str(error) == 'Subject is required'
        else:
            raise AssertionError('Blank subject accepted')
    for customer_id in ['c2', 'missing']:
        try:
            ticket_api.open(customer_id, 'Cannot sign in')
        except customers.CustomerUnavailable:
            pass
        else:
            raise AssertionError(('Unavailable customer accepted', customer_id))
    try:
        ticket_api.get(1)
    except KeyError:
        pass
    else:
        raise AssertionError('A failed request created a ticket')
    first = ticket_api.open('c1', '  Cannot sign in  ')
    assert first == tickets.Ticket(1, 'c1', 'Ada', 'Cannot sign in')
    assert ticket_api.get(1) == first
    assert ticket_api.open('c1', 'Second request').id == 2
    try:
        first.subject = 'Unexpected'
    except FrozenInstanceError:
        pass
    else:
        raise AssertionError('Returned ticket is mutable')

    # This is a module-internal fixture change, not application integration:
    # old views and tickets retain their creation-time name snapshot.
    customer_api._store._rows['c1']['name'] = 'Grace'
    assert view.display_name == 'Ada' and first.requester_name == 'Ada'
    assert customer_api.active_customer('c1').display_name == 'Grace'
    assert ticket_api.open('c1', 'New request').requester_name == 'Grace'
    independent = tickets.Tickets(customers.Customers())
    assert independent.open('c1', 'Independent instance').id == 1
    assert independent.get(1).requester_name == 'Ada'

    captured = io.StringIO()
    with contextlib.redirect_stdout(captured):
        runpy.run_path(str(pathlib.Path(directory, 'main.py')), run_name='__main__')
    expected = '1 | Ada | Cannot sign in\\n'
    assert captured.getvalue() == expected, captured.getvalue()

    # Change both halves of the private customer representation. The Tickets
    # source and startup wiring remain byte-for-byte identical.
    migrated = dict(examples)
    migrated['customers/_store.py'] = migrated['customers/_store.py'].replace('"name":', '"full_name":')
    migrated['customers/__init__.py'] = migrated['customers/__init__.py'].replace('row["name"]', 'row["full_name"]')
    assert migrated['tickets/__init__.py'] == examples['tickets/__init__.py']
    assert migrated['main.py'] == examples['main.py']
    assert check_architecture(migrated) == check_architecture(examples)
    migration_dir = pathlib.Path(directory, 'migration')
    save_files(migration_dir, migrated)
    command = "import pathlib,runpy,sys; sys.path.insert(0,sys.argv[1]); runpy.run_path(str(pathlib.Path(sys.argv[1],'main.py')),run_name='__main__')"
    result = subprocess.run([sys.executable, '-I', '-c', command, str(migration_dir)],
                            capture_output=True, text=True, timeout=5)
    assert result.returncode == 0, result.stderr
    assert result.stdout == expected, result.stdout
print('Modular Monolith: actual packages, public import boundaries, cycles, immutable values, failed creation, owned state, name snapshots, and an isolated private-schema migration verified.')
`;
const result = spawnSync('python3', ['-I', '-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  timeout: 10_000,
});
if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
process.stdout.write(result.stdout);
