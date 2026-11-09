import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/anti-corruption-layer.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 3) throw new Error('Expected three actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-acl-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['domain.py', 'boundary.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'sellable units: 1',
    'can supply 1: True',
    'can supply 2: False',
    'lookup: Supplier unavailable',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from domain import Availability, StockUnavailable
from boundary import SupplierStockACL
from copy import deepcopy
from dataclasses import FrozenInstanceError
from pathlib import Path
import ast
import sys

def rejected(call, kind):
    try: call()
    except kind as error: return error
    raise AssertionError("Expected failure")

class Gateway:
    def __init__(self, row=None, error=None):
        self.row = row
        self.error = error
        self.calls = []
    def lookup(self, item):
        self.calls.append(item)
        if self.error: raise self.error
        return self.row

def record(**changes):
    result = dict(version=1, item="ITEM-9", record_status="A", quantity=10, committed=7, damaged=2)
    result.update(changes)
    return result

def acl(gateway, mapping=None):
    return SupplierStockACL(gateway, {"SKU-42":"ITEM-9"} if mapping is None else mapping)

# Independent stock fixtures, with a known zero result distinct from failed evidence.
for total, committed, damaged, available in [(10,7,2,1), (10,0,0,10), (10,10,0,0), (10,0,10,0), (0,0,0,0)]:
    row = record(quantity=total, committed=committed, damaged=damaged); saved = deepcopy(row)
    gateway = Gateway(row)
    value = acl(gateway).availability("SKU-42")
    assert value == Availability("SKU-42", available)
    assert gateway.calls == ["ITEM-9"] and row == saved
    assert value.can_supply(1) == (available >= 1)
    assert value.can_supply(available + 1) is False
    assert value.sellable_units == available  # A query did not reserve or consume stock.
    rejected(lambda: setattr(value, "sellable_units", 0), FrozenInstanceError)

# Mapping is exact, caller-owned input is copied, and unresolved IDs stop before transport.
original = {"SKU-42":"ITEM-9"}; gateway = Gateway(record()); boundary = acl(gateway, original)
original["SKU-42"] = "OTHER"
assert boundary.availability("SKU-42").sku == "SKU-42" and gateway.calls == ["ITEM-9"]
for mapping in [{}, {"SKU-42":None}, {"SKU-42":" "}, {"SKU-42":1}]:
    gateway = Gateway(record()); rejected(lambda: acl(gateway, mapping).availability("SKU-42"), StockUnavailable)
    assert gateway.calls == []
gateway = Gateway(record()); rejected(lambda: acl(gateway).availability("sku-42"), StockUnavailable)
assert gateway.calls == []

# Timeout is translated, with diagnostics retained, while programming failures are not hidden.
gateway = Gateway(error=TimeoutError("not answered"))
error = rejected(lambda: acl(gateway).availability("SKU-42"), StockUnavailable)
assert str(error) == "Supplier unavailable" and isinstance(error.__cause__, TimeoutError)
rejected(lambda: acl(Gateway(error=RuntimeError("bug"))).availability("SKU-42"), RuntimeError)

# Unknown/malformed external representations cannot fabricate a local stock fact.
for row in [None, [], (), "{}", True, {}, {"quantity":10}]:
    rejected(lambda: acl(Gateway(row)).availability("SKU-42"), StockUnavailable)
for key in record():
    row = record(); del row[key]
    rejected(lambda: acl(Gateway(row)).availability("SKU-42"), StockUnavailable)
for key, values in [("version", [True, False, 0, 2, 1.0, "1", None]),
                    ("item", ["OTHER", None, 9]),
                    ("record_status", ["H", "a", "", None, []])]:
    for value in values:
        row = record(**{key:value}); saved = deepcopy(row)
        rejected(lambda: acl(Gateway(row)).availability("SKU-42"), StockUnavailable)
        assert row == saved
rejected(lambda: acl(Gateway(record(extra="unknown"))).availability("SKU-42"), StockUnavailable)
for key in ["quantity", "committed", "damaged"]:
    for value in [-1, True, False, 1.0, "1", None]:
        rejected(lambda: acl(Gateway(record(**{key:value}))).availability("SKU-42"), StockUnavailable)
for row in [record(quantity=8), record(quantity=10, committed=10, damaged=1)]:
    rejected(lambda: acl(Gateway(row)).availability("SKU-42"), StockUnavailable)

# The protected domain maintains its own invariants without importing integration modules.
for units in [-1, True, False, 1.0, "1", None]: rejected(lambda: Availability("SKU-42", units), ValueError)
for requested in [0, -1, True, False, 1.0, "1", None]: rejected(lambda: Availability("SKU-42",1).can_supply(requested), ValueError)
for sku in ["", " ", None, 1, True]:
    rejected(lambda: Availability(sku, 1), ValueError)
    gateway = Gateway(record()); rejected(lambda: acl(gateway).availability(sku), ValueError)
    assert gateway.calls == []
tree = ast.parse(Path("domain.py").read_text())
imports = []
for node in ast.walk(tree):
    if isinstance(node, ast.Import): imports.extend(a.name.split(".")[0] for a in node.names)
    if isinstance(node, ast.ImportFrom): imports.append(node.module.split(".")[0])
assert all(module in sys.stdlib_module_names for module in imports)
print("Model protection and boundary checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['domain.py', 'boundary.py', 'demo.py'],
    stdout: expected,
    verification:
      'Five stock fixtures including true zero and insufficient stock, exact mapped identity and pre-call rejection, copied mappings, timeout normalization with cause, unmasked programming failure, malformed/unsupported/mismatched supplier payloads, invalid/inconsistent integer quantities, source nonmutation, immutable local values, domain request boundaries, no reservation side effects, and standard-library-only domain imports passed.',
  };
  const out = resolve(root, '.local/software-anti-corruption-layer');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
