import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/content-based-router.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-content-router-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['routing.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'A41 priority-fulfillment express-physical orders-v1',
    'A42 manual-review high-value orders-v1',
    'A43 digital-delivery digital orders-v1',
    'A44 standard-fulfillment physical orders-v1',
    'A45 unclassified-review otherwise orders-v1',
    'A46 invalid-messages fields orders-v1',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from routing import route, Decision
from copy import deepcopy
from dataclasses import FrozenInstanceError

def rejected(call, kind):
    try: call()
    except kind: return
    raise AssertionError("Expected failure")

def message(**changes):
    result = dict(schema=1, order_id="A42", kind="physical", express=True, usd_cents=99999)
    result.update(changes)
    return result

# An independent policy table is the oracle for the lower-value routes.
low_value = {
    ("physical", False): ("standard-fulfillment", "physical"),
    ("physical", True): ("priority-fulfillment", "express-physical"),
    ("digital", False): ("digital-delivery", "digital"),
    ("digital", True): ("digital-delivery", "digital"),
    ("service", False): ("unclassified-review", "otherwise"),
    ("service", True): ("unclassified-review", "otherwise"),
}
for (kind, express), ordinary in low_value.items():
    for cents, expected in [(0, ordinary), (99999, ordinary),
                            (100000, ("manual-review", "high-value")),
                            (100001, ("manual-review", "high-value"))]:
        value = message(kind=kind, express=express, usd_cents=cents)
        original = deepcopy(value)
        result = route(value)
        assert result == Decision(*expected)
        assert value == original
        assert route(value) == result  # Determinism is not duplicate suppression.
        rejected(lambda: setattr(result, "channel", "changed"), FrozenInstanceError)

# Explicit priority boundary; high-value review also precedes digital or unknown kinds.
assert route(message(usd_cents=99999)).channel == "priority-fulfillment"
assert route(message(usd_cents=100000)).channel == "manual-review"
assert route(message(kind="digital", usd_cents=100000)).channel == "manual-review"
assert route(message(kind="new-partner-kind", usd_cents=100000)).channel == "manual-review"
assert route(message(kind="physical ")).channel == "unclassified-review"
assert route(message(kind="PHYSICAL")).channel == "unclassified-review"

# Wrong shape and unsupported versions do not fall through into ordinary work.
for raw in [None, [], (), "{}", 1, True, {}, {"order_id":"A42"}]:
    assert route(raw) == Decision("invalid-messages", "shape")
for key in message():
    raw = message(); del raw[key]
    assert route(raw) == Decision("invalid-messages", "shape")
assert route(message(endpoint="https://untrusted.example")).channel == "invalid-messages"
for version in [True, False, 0, 2, "1", 1.0, None]:
    assert route(message(schema=version)) == Decision("invalid-messages", "fields")
for amount in [-1, True, False, 1.0, "100000", None, float("nan"), float("inf")]:
    assert route(message(usd_cents=amount)) == Decision("invalid-messages", "fields")
for express in [0, 1, "true", "false", None]:
    assert route(message(express=express)) == Decision("invalid-messages", "fields")
for key in ["order_id", "kind"]:
    for value in ["", " ", 1, True, None]:
        assert route(message(**{key:value})) == Decision("invalid-messages", "fields")
# Return decisions name allowed logical channels; the input remains untouched even when invalid.
allowed = {"invalid-messages", "manual-review", "digital-delivery", "priority-fulfillment", "standard-fulfillment", "unclassified-review"}
invalid = message(usd_cents=-1); saved = deepcopy(invalid)
assert route(invalid).channel in allowed and invalid == saved
print("Routing and boundary checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['routing.py', 'demo.py'],
    stdout: expected,
    verification:
      'Twenty-four valid kind/express/amount combinations, first-match overlap, exact 99999/100000 boundary, high-value digital/unknown kinds, valid unknown fallback, strict schema shape/version, missing/extra fields, Boolean-versus-integer validation, invalid numeric and string fields, exact kind comparison, immutable decisions, repeat determinism, and input nonmutation passed. No delivery or deduplication guarantee is inferred.',
  };
  const out = resolve(root, '.local/software-content-based-router');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
