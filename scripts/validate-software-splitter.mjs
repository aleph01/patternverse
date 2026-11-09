import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/splitter.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-splitter-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['splitter.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    "('E901', 'L1') BOOK 2 1/2",
    "('E901', 'L2') MUG 1 2/2",
    'empty: 0',
    'rejected: Units must be an integer from 1 to 1000',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from splitter import split_order, SplitError, Part
from dataclasses import FrozenInstanceError
from copy import deepcopy
from unittest.mock import patch


def source(**changes):
    event = dict(event_id="E901", order_id="O42", lines=[
        dict(line_id="L1", sku="BOOK", units=2),
        dict(line_id="L2", sku="MUG", units=1)])
    return event | changes


def rejected(event):
    original = deepcopy(event)
    with patch("splitter.Part", side_effect=AssertionError("Constructed before validation")):
        try:
            split_order(event)
        except SplitError:
            assert event == original
            return
    raise AssertionError("Expected SplitError")


raw = source(); original = deepcopy(raw)
parts = split_order(raw)
assert parts == (Part("E901", "O42", "L1", "BOOK", 2, 1, 2),
                 Part("E901", "O42", "L2", "MUG", 1, 2, 2))
assert type(parts) is tuple and raw == original
assert sum(p.units for p in parts) == 3
assert [p.key for p in parts] == [("E901", "L1"), ("E901", "L2")]
assert split_order(raw) == parts and split_order(raw)[0] is not parts[0]
try:
    parts[0].units = 9
except FrozenInstanceError:
    pass
else:
    raise AssertionError("Child is mutable")
raw["lines"][0]["units"] = 9
assert parts[0].units == 2  # No nested caller-owned payload is retained.
assert split_order(source(lines=[])) == ()
for count in [1, 2, 100]:
    lines = [dict(line_id=f"L{i}", sku="SAME", units=1000) for i in range(count)]
    result = split_order(source(lines=lines))
    assert len(result) == count and len({p.key for p in result}) == count
    assert [p.position for p in result] == list(range(1,count+1))
    assert all(p.size == count for p in result)
    assert sum(p.units for p in result) == count * 1000
rejected(source(lines=[dict(line_id=f"L{i}", sku="X", units=1) for i in range(101)]))
rejected(source(lines=[dict(line_id="L1", sku="X", units=1), dict(line_id="L1", sku="Y", units=1)]))
for units in [0, -1, 1001, True, False, 1.0, "1", None]:
    rejected(source(lines=[source()["lines"][0], dict(line_id="L2", sku="MUG", units=units)]))
for units in [1, 1000]:
    assert split_order(source(lines=[dict(line_id="L1", sku="X", units=units)]))[0].units == units
for raw in [None, [], (), True, "{}", {}, {"event_id":"E901"}]: rejected(raw)
for lines in [None, {}, (), "L1", True]: rejected(source(lines=lines))
for line in [None, [], True, {}, {"line_id":"L1"}, dict(line_id="L1",sku="X",units=1,private="no")]:
    rejected(source(lines=[line]))
for key in source():
    event = source(); del event[key]; rejected(event)
rejected(source(secret="do-not-copy"))
for key in ["event_id", "order_id"]:
    for value in ["", " ", "with space", "é", "a"*65, 1, None, True]:
        rejected(source(**{key:value}))
    assert split_order(source(**{key:"a"*64}))
for key in ["line_id", "sku"]:
    for value in ["", " ", "with space", "é", "a"*65, 1, None, True]:
        line = dict(line_id="L1",sku="X",units=1); line[key] = value
        rejected(source(lines=[line]))
    line = dict(line_id="L1",sku="X",units=1); line[key] = "a"*64
    assert split_order(source(lines=[line]))
# An identity is structured, not a delimiter-concatenation guess or an array index.
assert Part("E901","O42","L1","BOOK",2,2,2).key == parts[0].key
assert split_order(source(event_id="E902"))[0].key != parts[0].key
# Construction does not secretly publish, acknowledge, aggregate, or record deduplication.
assert split_order(source()) == split_order(source())
print("Splitter and boundary checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['splitter.py', 'demo.py'],
    stdout: expected,
    verification:
      'Concrete two-child fixture and conserved quantities; immutable independent output; unchanged source on success and rejection; replay keys and distinct parent identities; 0/1/2/100 lines and 101-line rejection; repeated SKU with distinct line identities; duplicate line rejection; late invalid element constructs no children; 1/1000-unit limits with malformed/Boolean/range rejection; exact input shape and identifier grammar/length checks; structured identity independent of position. No broker or external-effects guarantee is inferred.',
  };
  const out = resolve(root, '.local/software-splitter');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
