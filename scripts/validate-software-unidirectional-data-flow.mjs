import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(
  resolve(root, 'content/patterns/unidirectional-data-flow.md'),
  'utf8',
);
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected the two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-udf-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['search.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'Loading ca [1]',
    'Loading cat [2]',
    'cat, caterpillar',
    'cat, caterpillar',
    'Loading dog [3]',
    'Search unavailable',
    'Type a query',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from search import State, Search, Loaded, Failed, update, view
from dataclasses import FrozenInstanceError
from functools import reduce
from itertools import permutations

def rejected(call, kind=ValueError):
    try: call()
    except kind: return
    raise AssertionError("Expected rejection")

initial = State()
assert view(initial) == "Type a query"
one = update(initial, Search("  ca  "))
two = update(one, Search("cat"))
assert initial == State() and one.query == "ca" and one.request_id == 1
assert two.query == "cat" and two.request_id == 2 and two.loading
rejected(lambda: setattr(two, "query", "changed"), FrozenInstanceError)
intent = Search("cat")
rejected(lambda: setattr(intent, "query", "changed"), FrozenInstanceError)
for events in permutations([Loaded(1, ("car",)), Loaded(2, ("cat", "caterpillar"))]):
    final = reduce(update, events, two)
    assert final.results == ("cat", "caterpillar") and not final.loading and final.error == ""
    assert view(final) == "cat, caterpillar"
    assert update(final, Loaded(2, ("duplicate",))) is final
    assert update(final, Failed(2, "Duplicate failure")) is final
    assert update(final, Failed(1, "Old failure")) is final
assert two.results == () and two.loading
failed = update(two, Failed(2, "Search unavailable"))
assert failed.error == "Search unavailable" and not failed.loading and failed.results == ()
assert view(failed) == "Search unavailable"
assert update(failed, Loaded(2, ("too late",))) is failed
retry = update(failed, Search("cat"))
assert retry.request_id == 3 and retry.error == "" and retry.loading
assert update(retry, Failed(2, "Old failure")) is retry
assert update(retry, Loaded(3, ())).results == ()
assert view(update(retry, Loaded(3, ()))) == "No matches"
cleared = update(retry, Search(" "))
assert cleared.query == "" and cleared.request_id == 4 and not cleared.loading
assert cleared.results == () and cleared.error == ""
assert update(cleared, Loaded(3, ("late",))) is cleared
assert update(cleared, Failed(3, "Late error")) is cleared
assert view(cleared) == "Type a query"
for raw in [None, 1, True, "x" * 81]:
    rejected(lambda: update(two, Search(raw)))
assert update(initial, Search("é" * 80)).query == "é" * 80
rejected(lambda: update(initial, Search("é" * 81)))
for request_id in [True, False, 0, -1, 1.5, "2", None]:
    rejected(lambda: update(two, Loaded(request_id, ("bad",))))
    rejected(lambda: update(two, Failed(request_id, "Bad ID")))
for results in [["mutable"], (1,), (True,), None, "cat"]:
    rejected(lambda: update(two, Loaded(2, results)))
for message in [None, 1, "", "  "]:
    rejected(lambda: update(two, Failed(2, message)))
rejected(lambda: update(two, object()))
assert two.query == "cat" and two.loading and two.results == ()
# Same valid initial state and ordered event history reproduce transitions.
history = [Search("ca"), Search("cat"), Loaded(2, ("cat",)), Loaded(1, ("car",)), Search("dog"), Failed(3, "Search unavailable"), Search("")]
assert reduce(update, history, State()) == reduce(update, history, State())
other = update(State(), Search("other"))
assert other.request_id == 1 and two.query == "cat"  # IDs belong to each owner lifetime.
assert view(two) == view(two) == "Loading cat [2]"
print("Out-of-order permutations, stale failure, duplicate terminal events, retry, cleared-query invalidation, empty results, query/ID/payload boundaries, immutable snapshots, isolated owners, and deterministic replay checks passed.")
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-unidirectional-data-flow');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['search.py', 'demo.py'],
        stdout: stdout.trimEnd().split('\n'),
        verification: verification.trim(),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
