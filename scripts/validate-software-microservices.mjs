import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'microservices');
const article = await readFile(resolve(root, 'content/patterns/microservices.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, subprocess, sys, tempfile
examples = json.load(sys.stdin)
assert set(examples) == {'inventory.py', 'orders.py', 'demo.py'}
for filename in ['inventory.py', 'orders.py']:
    # Service behavior has no import dependency on the other service.
    nodes = list(ast.walk(ast.parse(examples[filename])))
    assert not any(isinstance(n, (ast.Import, ast.ImportFrom)) for n in nodes)

def save(directory, files):
    for name, source in files.items():
        pathlib.Path(directory, name).write_text(source)

expected = 'pending 2\\nconfirmed 2\\nconfirmed 2\\n'
with tempfile.TemporaryDirectory(prefix='patternverse-microservices-') as directory:
    save(directory, examples)
    sys.path.insert(0, directory)
    Inventory = importlib.import_module('inventory').Inventory
    Orders = importlib.import_module('orders').Orders
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        demo = runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == expected, repr(output.getvalue())
    assert demo['inventory'].available == 2

    calls = []
    stock = Inventory(4)
    def transport(request):
        wire_request = json.loads(json.dumps(request))
        calls.append(dict(wire_request))
        reply = stock.reserve(wire_request)
        if len(calls) == 1:
            raise TimeoutError('Response lost after remote change')
        return json.loads(json.dumps(reply))
    orders = Orders(transport)
    first = orders.place('o1', 2)
    assert first == {'units': 2, 'status': 'pending'}
    assert stock.available == 2  # Two owners disagree until reconciliation.
    assert orders.place('o1', 2)['status'] == 'confirmed'
    assert orders.place('o1', 2)['status'] == 'confirmed'
    assert calls == [{'order_id': 'o1', 'units': 2}] * 2
    assert stock.available == 2
    first['status'] = 'corrupted'
    assert orders.place('o1', 2)['status'] == 'confirmed'
    reply = stock.reserve({'order_id': 'o1', 'units': 2})
    reply['status'] = 'corrupted'
    assert stock.reserve({'order_id': 'o1', 'units': 2}) == {'status': 'reserved'}

    def expect_value_error(action):
        try:
            action()
        except ValueError:
            return
        raise AssertionError('Invalid input accepted')

    for invalid in [0, -1, 1.5, True, '2', None]:
        expect_value_error(lambda: orders.place('bad', invalid))
        expect_value_error(lambda: stock.reserve({'order_id': 'bad', 'units': invalid}))
    for invalid in ['', 4, None]:
        expect_value_error(lambda: orders.place(invalid, 1))
        expect_value_error(lambda: stock.reserve({'order_id': invalid, 'units': 1}))
    assert len(calls) == 2 and stock.available == 2
    expect_value_error(lambda: orders.place('o1', 1))
    expect_value_error(lambda: stock.reserve({'order_id': 'o1', 'units': 1}))
    assert len(calls) == 2 and stock.available == 2
    assert orders.place('o2', 2)['status'] == 'confirmed'
    assert stock.available == 0  # Exact stock boundary.
    assert orders.place('o3', 1)['status'] == 'rejected'
    assert stock.available == 0
    stock.available = 5  # Inventory-owned test fixture replenishment.
    assert stock.reserve({'order_id': 'o3', 'units': 1})['status'] == 'rejected'
    assert orders.place('o3', 1)['status'] == 'rejected'
    assert stock.available == 5  # Same identity preserves even a rejected result.

    other_stock = Inventory(4)
    offline_calls = []
    def offline(request):
        offline_calls.append(request)
        raise TimeoutError('Request never arrived')
    waiting = Orders(offline)
    assert waiting.place('o1', 2)['status'] == 'pending'
    assert other_stock.available == 4
    # Recover the transport, preserving both owners' state and operation identity.
    waiting._reserve = lambda request: other_stock.reserve(json.loads(json.dumps(request)))
    assert waiting.place('o1', 2)['status'] == 'confirmed'
    assert other_stock.available == 2

    def malformed(request):
        return {'status': 'unknown'}
    broken = Orders(malformed)
    try:
        broken.place('o1', 1)
    except KeyError:
        pass
    else:
        raise AssertionError('Malformed response silently accepted')
    assert broken._orders['o1']['status'] == 'pending'

    # An additive provider response does not require changing the Orders caller.
    upgraded_stock = Inventory(4)
    def upgraded_transport(request):
        result = upgraded_stock.reserve(json.loads(json.dumps(request)))
        result['warehouse'] = 'north'
        return json.loads(json.dumps(result))
    upgraded_orders = Orders(upgraded_transport)
    assert upgraded_orders.place('o1', 2)['status'] == 'confirmed'
    assert upgraded_stock.available == 2
    assert Inventory(4).available == 4
    assert Orders(lambda r: {'status': 'rejected'}).place('o1', 2)['status'] == 'rejected'

    # A provider-private representation change leaves the caller and demo intact.
    migrated = dict(examples)
    migrated['inventory.py'] = migrated['inventory.py'].replace('_results', '_receipts')
    assert migrated['orders.py'] == examples['orders.py']
    assert migrated['demo.py'] == examples['demo.py']
    with tempfile.TemporaryDirectory(prefix='patternverse-microservices-upgrade-') as upgrade:
        save(upgrade, migrated)
        result = subprocess.run([sys.executable, 'demo.py'], cwd=upgrade,
                                text=True, capture_output=True, check=True)
        assert result.stdout == expected
print('Microservices: exact simulation output, separate ownership, JSON contracts, lost request and reply, explicit retries, duplicate identity, shortage, input validation, value isolation, and compatible provider evolution verified.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
