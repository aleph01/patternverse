import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/aggregator.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-aggregator-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['aggregator.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'first: None',
    'duplicate: None',
    'E901 complete 3',
    'after closure: None',
    "E902 timed_out missing: ('L2',)",
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from aggregator import Aggregator, Outcome
from itertools import permutations
from dataclasses import FrozenInstanceError
from copy import deepcopy


def fails(call):
    try: call()
    except ValueError: return
    raise AssertionError("Expected ValueError")


def unchanged(a, call):
    saved = deepcopy(a.__dict__)
    fails(call)
    assert a.__dict__ == saved


# Concrete report fixture: 0 is a real report, not a missing value.
for sequence in permutations([("L1",2), ("L2",0), ("L3",1000)]):
    a = Aggregator("E901", ["L1","L2","L3"], 100)
    outputs = []
    for index, (member, units) in enumerate(sequence):
        result = a.accept("E901",member,units,index*2)
        if result is not None: outputs.append(result)
        assert a.accept("E901",member,units,index*2+1) is None
    assert outputs == [Outcome("E901","complete",1002,())]
    assert a.poll(100) is None and a.result is outputs[0]
    assert a.accept("E901","L1",9,101) is None  # Closed groups ignore valid late reports.
    try: a.result.total_units = 9
    except FrozenInstanceError: pass
    else: raise AssertionError("Outcome is mutable")

# Conflicting duplicates do not replace an accepted open-group fact.
a = Aggregator("E901", ["L1","L2"], 100)
assert a.accept("E901","L1",2,10) is None
fails(lambda:a.accept("E901","L1",9,20))
assert a.accept("E901","L2",1,30) == Outcome("E901","complete",3,())
for arrival in [99,100,101]:
    a = Aggregator("E902", ["L2","L1"], 100)
    a.accept("E902","L1",2,10)
    expected = Outcome("E902","complete",3,()) if arrival == 99 else Outcome("E902","timed_out",None,("L2",))
    assert a.accept("E902","L2",1,arrival) == expected
    assert a.poll(arrival) is None and a.result == expected
    assert a.accept("E902","L2",1,arrival+1) is None

# No incoming message is required for an explicitly scheduled poll to expire a group.
a = Aggregator("E903", ["L3","L1","L2"], 100)
assert a.poll(99) is None
assert a.poll(100) == Outcome("E903","timed_out",None,("L1","L2","L3"))
assert a.poll(101) is None
a = Aggregator("E904", ["L1"], 0)
assert a.accept("E904","L1",1,0) == Outcome("E904","timed_out",None,("L1",))

for count in [1,100]:
    members = [f"L{i}" for i in range(count)]
    a = Aggregator("E", members, 1000)
    members.append("CALLER-CHANGE")  # Expected membership was copied.
    for i in range(count):
        result = a.accept("E",f"L{i}",1000,i)
        assert (result is None) == (i < count-1)
    assert result == Outcome("E","complete",count*1000,())
fails(lambda:Aggregator("E", [],100))
fails(lambda:Aggregator("E", [f"L{i}" for i in range(101)],100))
fails(lambda:Aggregator("E", ["L1","L1"],100))
for members in [None, {}, "L1", {"L1"}, True]: fails(lambda:Aggregator("E",members,100))
for deadline in [-1,True,False,1.5,"100",None]: fails(lambda:Aggregator("E",["L1"],deadline))
for identifier in ["", " ", "with space", "é", "x"*65, 1, None, True]:
    fails(lambda:Aggregator(identifier,["L1"],100))
    fails(lambda:Aggregator("E",[identifier],100))
a = Aggregator("x"*64, ["y"*64],100)
assert a.accept("x"*64,"y"*64,0,0) == Outcome("x"*64,"complete",0,())

# Invalid input cannot poison membership, advance the clock, or close the group.
a = Aggregator("E", ["L1","L2"],100)
a.poll(10)
for units in [-1,1001,True,False,1.0,"1",None]:
    unchanged(a,lambda:a.accept("E","L1",units,99))
for now in [-1,9,True,False,1.0,"100",None]:
    unchanged(a,lambda:a.poll(now))
    unchanged(a,lambda:a.accept("E","L1",1,now))
for group,member in [("WRONG","L1"),("E","UNKNOWN"),(None,"L1"),("E",None),("E",[]),(True,"L1")]:
    unchanged(a,lambda:a.accept(group,member,1,100))
assert a.accept("E","L2",1,11) is None
assert a.accept("E","L1",2,12) == Outcome("E","complete",3,())
# New instances do not share durable completion metadata or deduplication history.
a = Aggregator("REUSED",["L1"],100); b = Aggregator("REUSED",["L1"],100)
assert a.accept("REUSED","L1",1,0) == b.accept("REUSED","L1",1,0)
print("Aggregator and boundary checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['aggregator.py', 'demo.py'],
    stdout: expected,
    verification:
      'Six arrival permutations with repeated members and a zero-unit report; exact complete fixture and order-independent sum; conflicting open-group duplicate rejection without replacement; before/at/after deadline fixtures; no-input polling and zero deadline; sorted missing members and no misleading partial total; retained frozen terminal outcomes and no second local release; copied expected membership; 1/100-member boundaries and 0/101/duplicate-member rejection; 0/1000-unit bounds and malformed/Boolean/range rejection; operation/member isolation and identifier grammar/length; invalid clock rejection without state mutation; independent instances explicitly have no persistent deduplication history.',
  };
  const out = resolve(root, '.local/software-aggregator');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
