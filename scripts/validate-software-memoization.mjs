import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/memoization.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-memoization-'));
const checks = `
import contextlib, io, runpy, random, json
output = io.StringIO()
with contextlib.redirect_stdout(output):
    module = runpy.run_path('memoization.py')
expected = ['publish: 9 minutes; cache misses: 5', 'package: 7 minutes; cache misses: 5', 'original snapshot: 9 minutes', 'updated snapshot: 27 minutes', 'cached entries after clear: 0', 'unknown task', 'dependencies must refer to earlier tasks']
assert output.getvalue().splitlines() == expected
make = module['make_estimator']
tasks = [(2, []), (3, [0]), (4, [0]), (1, [1, 2]), (2, [3])]
estimate, info, clear = make(tasks)
assert estimate(4) == 9
assert (info().hits, info().misses, info().currsize) == (1, 5, 5)
assert estimate(3) == 7 and info().misses == 5
assert [estimate(i) for i in range(5)] == [2,5,6,7,9]
assert info().maxsize is None and info().currsize == 5
# Independent recurrence checks correctness and counts the work avoided.
calls = []
def uncached(i, graph):
    calls.append(i)
    minutes, deps = graph[i]
    return minutes + max((uncached(dep, graph) for dep in deps), default=0)
assert uncached(4, tasks) == 9 and len(calls) == 6 and calls.count(0) == 2
# Both outer input and nested dependency containers are snapshot-owned.
tasks[0] = (20, [])
tasks[3][1].clear()
assert estimate(4) == 9 and estimate(3) == 7
fresh, fresh_info, _ = make([(20, []), (3, [0]), (4, [0]), (1, [1,2]), (2, [3])])
assert fresh(4) == 27 and fresh_info().currsize == 5
clear()
assert (info().hits,info().misses,info().currsize) == (0,0,0)
assert estimate(4) == 9 and info().misses == 5
# Public rejection happens before a bad key can reach Python's cache equality.
for bad in [-1,5,99,True,False,1.0,'1',None,[]]:
    before = info()
    try: estimate(bad)
    except IndexError as e: assert str(e) == 'unknown task'
    else: raise AssertionError(('accepted invalid index', bad))
    assert info() == before
for minutes in [-1,1.5,True,'2',None]:
    try: make([(minutes,[])])
    except ValueError: pass
    else: raise AssertionError(('accepted invalid duration',minutes))
for graph in [[(1,[0])],[(1,[1]),(1,[0])],[(1,[-1])],[(1,[]),(1,[2])],[(1,[]),(1,[True])],[(1,[]),(1,[0.0])]]:
    try: make(graph)
    except ValueError as e: assert str(e) == 'dependencies must refer to earlier tasks'
    else: raise AssertionError(('accepted invalid dependency',graph))
zero, zero_info, _ = make([(0,[])])
assert zero(0) == zero(0) == 0
assert (zero_info().hits,zero_info().misses) == (1,1)
empty, empty_info, _ = make([])
assert empty_info().currsize == 0
try: empty(0)
except IndexError: pass
else: raise AssertionError('Empty input has no task zero')
# Reproducible generated DAGs compare every result with independent recursion.
rng = random.Random(11)
for case in range(100):
    n = rng.randrange(1,9)
    graph = [(rng.randrange(10),[d for d in range(i) if rng.random()<0.35]) for i in range(n)]
    memo, state, _ = make(graph)
    for i in range(n):
        assert memo(i) == uncached(i,graph)
    assert state().misses == state().currsize == n
    before = state().misses
    for i in reversed(range(n)): memo(i)
    assert state().misses == before
# Probe the same cache primitive's failure and simultaneous-miss contracts.
from functools import cache
attempts = []
@cache
def retryable(k):
    attempts.append(k)
    if len(attempts) < 3: raise ValueError('calculation failed')
    return 0
for _ in range(2):
    try: retryable('x')
    except ValueError: pass
    else: raise AssertionError('Expected failed calculation')
assert retryable.cache_info().currsize == 0
assert retryable('x') == retryable('x') == 0 and len(attempts) == 3
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier, Lock, enumerate as threads
baseline = {t.ident for t in threads()}
barrier, lock, executed = Barrier(2), Lock(), []
@cache
def concurrent(k):
    with lock: executed.append(k)
    barrier.wait(timeout=5)
    return 42
with ThreadPoolExecutor(max_workers=2) as workers:
    results = list(workers.map(concurrent, ['same','same']))
assert results == [42,42] and executed == ['same','same']
assert concurrent('same') == 42 and len(executed) == 2
assert concurrent.cache_info().misses == 2 and concurrent.cache_info().currsize == 1
assert {t.ident for t in threads()} == baseline
print(json.dumps({'status':'passed','output':expected,'finish_minutes':[2,5,6,7,9],'cold_misses':5,'cold_shared_hit':1,'uncached_body_calls':6,'updated_root_minutes':27,'generated_acyclic_graphs':100,'checks':['recursive memo entry point','warm reuse and finite state bound','immutable outer/nested snapshot ownership','fresh estimator isolation','clear does not reread input','invalid indices before cache access','zero and empty graph','negative/noninteger duration rejected','self/forward/cyclic/noninteger dependency rejected','independent recurrence across 100 DAGs','raised exceptions not cached by primitive','duplicate concurrent misses allowed with complete worker cleanup']}))
`;
try {
  await writeFile(join(directory, 'memoization.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 20000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const record = JSON.parse(result.stdout);
  const visuals = await readFile(
    resolve(root, 'scripts/build-software-memoization-visuals.mjs'),
    'utf8',
  );
  for (const phrase of [
    "'4 / publish',2,9",
    "'3 / package',1,7",
    "'1 / assets',3,5",
    "'2 / templates',4,6",
    "'0 / parse',2,2",
    "['S1 / original estimator',2,9]",
    "['S2 / fresh estimator',20,27]",
  ]) {
    if (!visuals.replaceAll(/\s/g, '').includes(phrase.replaceAll(/\s/g, '')))
      throw new Error('Diagram differs from example: ' + phrase);
  }
  const out = resolve(root, '.local/software-memoization');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'code-checks.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(
    'Article program, 100 independent DAG comparisons, input/failure boundaries and concurrency caveat verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
