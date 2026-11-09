import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/message-translator.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-translator-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['translation.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'E901 P42 1250 ready_for_pickup carrier-a-v1/warehouse-v2',
    'source weight: 1.250',
    'rejected: Unknown carrier state',
    'rejected: Weight must be 1..50000 whole grams',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from translation import translate, TranslationError
from copy import deepcopy
from decimal import localcontext, ROUND_DOWN

def source(**changes):
    result = dict(schema=1, source="carrier-a", event_id="E901", parcel="P42", gross_kg="1.250", state="R")
    result.update(changes)
    return result

def rejected(value):
    saved = deepcopy(value)
    try: translate(value)
    except TranslationError:
        assert value == saved
        return
    raise AssertionError("Expected TranslationError")

# A concrete contract fixture, not the implementation's conditional structure.
expected = dict(schema=2, source_system="carrier-a", event_id="E901", parcel_id="P42",
                gross_mass_g=1250, pickup_state="ready_for_pickup", mapping_version="carrier-a-v1/warehouse-v2")
raw = source(); original = deepcopy(raw)
assert translate(raw) == expected
assert translate(raw) is not raw and raw == original
for kilograms, grams in [("0.001",1), ("0.010",10), ("1.250",1250),
                          ("49.999",49999), ("50.000000",50000), ("000001.250000",1250)]:
    for code, state in [("R","ready_for_pickup"), ("D","dispatched")]:
        raw = source(gross_kg=kilograms, state=code); original = deepcopy(raw)
        output = translate(raw)
        assert output == expected | dict(gross_mass_g=grams, pickup_state=state)
        assert raw == original
        assert type(output["gross_mass_g"]) is int
        assert translate(raw) == output  # Determinism does not implement effect deduplication.

# Precision does not depend on the caller's global arithmetic precision or rounding mode.
with localcontext() as context:
    context.prec = 1
    context.rounding = ROUND_DOWN
    assert translate(source()) == expected
    rejected(source(gross_kg="1.2505"))

for weight in ["0", "0.000", "50.001", "1.2505", "0.000001", "999999.999999",
               "NaN", "Infinity", "-1", "+1", "1e0", "1,25", " 1.250", "1.",
               ".001", "1234567", "1.0000000", 1.25, True, None]:
    rejected(source(gross_kg=weight))
for code in ["X", "r", " R", "", None, [], {}, 1]: rejected(source(state=code))
for schema in [0, 2, True, False, "1", 1.0, None]: rejected(source(schema=schema))
for namespace in ["carrier-b", "Carrier-A", "carrier-a ", None, []]: rejected(source(source=namespace))
for raw in [None, [], (), "{}", True, {}, {"event_id":"E901"}]: rejected(raw)
for key in source():
    raw = source(); del raw[key]; rejected(raw)
rejected(source(secret="must-not-be-forwarded"))
for key in ["event_id", "parcel"]:
    for identifier in ["", " ", "with space", "é", "a" * 65, 1, None, True]:
        rejected(source(**{key:identifier}))
    output = translate(source(**{key:"a" * 64}))
    assert output["event_id" if key == "event_id" else "parcel_id"] == "a" * 64
# Source identity is preserved and changing a returned target cannot alter the source.
raw = source(); output = translate(raw); output["parcel_id"] = "changed"
assert raw["parcel"] == "P42"
assert translate(source(event_id="E902"))["event_id"] == "E902"
# Different original spellings can have equal targets, so byte-reversible mapping is not promised.
assert translate(source(gross_kg="01.250000")) == translate(source(gross_kg="1.250"))
print("Translation and boundary checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['translation.py', 'demo.py'],
    stdout: expected,
    verification:
      'Concrete expected target, twelve weight/status fixtures, exact 1/50000 gram boundaries, fractional/range/grammar rejection, unknown state/source/version, strict source shape and identifier grammar, input nonmutation on success and failure, output independence, identity/provenance preservation, ambient precision/rounding isolation, deterministic output, and nonreversible original spellings passed.',
  };
  const out = resolve(root, '.local/software-message-translator');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
