import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(
  resolve(root, 'content/patterns/queue-based-load-leveling.md'),
  'utf8',
);
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article Python fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-load-leveling-'));
const run = (name) => {
  const r = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message || 'Example failed');
  return r.stdout;
};
try {
  for (const [i, name] of ['leveling.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[i]);
  const expected = [
    'tick in accepted rejected done waiting',
    '1 6 6 0 2 4',
    '2 2 2 0 2 4',
    '3 0 0 0 2 2',
    '4 0 0 0 2 0',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `import json
from collections import deque
from itertools import product
from pathlib import Path
import leveling
from leveling import simulate


def fails(action):
    try: action()
    except ValueError: return
    raise AssertionError('Expected ValueError')

trace=simulate((6,2,0,0))
assert trace==[(1,6,6,0,2,4),(2,2,2,0,2,4),(3,0,0,0,2,2),(4,0,0,0,2,0)]
Path('trace.json').write_text(json.dumps(trace))
assert simulate(())==[]
assert simulate((0,0))==[(1,0,0,0,0,0),(2,0,0,0,0,0)]
assert simulate((4,4,4,4))==[(1,4,4,0,2,2),(2,4,4,0,2,4),(3,4,2,2,2,4),(4,4,2,2,2,4)]
assert simulate((7,0,0,0))==[(1,7,6,1,2,4),(2,0,0,0,2,2),(3,0,0,0,2,0),(4,0,0,0,0,0)]
assert simulate((8,3,0),budget=0)==[(1,8,6,2,0,6),(2,3,0,3,0,6),(3,0,0,0,0,6)]
assert simulate((6,),budget=2)[-1][-1]==4
assert simulate((6,0,0),budget=2)[-1][-1]==0
# Service cannot free an admission slot before that tick's admission phase.
assert simulate((2,),budget=9,capacity=1)==[(1,2,1,1,1,0)]
assert simulate((10**12,),budget=0,capacity=2)==[(1,10**12,2,10**12-2,0,2)]
for arrivals in [None,[],iter([1]),(True,),(-1,),(1.2,),('3',),(1,2,-1)]:
    fails(lambda:simulate(arrivals))
for budget in [True,False,-1,1.5,None,'2']:
    fails(lambda:simulate((1,),budget=budget))
for capacity in [True,False,0,-1,1.5,None,'2']:
    fails(lambda:simulate((1,),capacity=capacity))

# Observe the actual deque used by the unchanged article function. It rejects
# overflow explicitly rather than relying on deque(maxlen) evicting old jobs.
class ObservedDeque(deque):
    instances=[]
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs)
        self.enqueued=[];self.removed=[];self.peak=0;self.instances.append(self)
    def extend(self,items):
        items=list(items);self.enqueued.extend(items)
        super().extend(items);self.peak=max(self.peak,len(self))
    def popleft(self):
        item=super().popleft();self.removed.append(item);return item
leveling.deque=ObservedDeque
try:
    for capacity,budget,arrivals in [(6,2,(6,2,0,0)),(3,1,(7,2,0,0)),(2,0,(9,1))]:
        result=simulate(arrivals,budget=budget,capacity=capacity)
        q=ObservedDeque.instances[-1]
        assert q.maxlen is None and q.peak<=capacity
        assert q.removed==q.enqueued[:len(q.removed)]
        assert list(q)==q.enqueued[len(q.removed):]
        assert len(q.enqueued)==sum(r[2] for r in result)
        assert len(q.removed)==sum(r[4] for r in result)
finally: leveling.deque=deque

# Exhaust finite arrival traces against independent conservation and capacity
# invariants; no assumption that a finite horizon drains its residual work.
cases=0
for arrivals in product(range(5),repeat=4):
    for capacity in [1,3,6]:
        for budget in [0,1,2,7]:
            waiting=accepted_total=done_total=rejected_total=0
            rows=simulate(arrivals,budget=budget,capacity=capacity)
            for tick,incoming,accepted,rejected,done,new_waiting in rows:
                assert incoming==arrivals[tick-1] and incoming==accepted+rejected
                assert 0<=accepted<=capacity-waiting
                assert waiting+accepted<=capacity
                assert 0<=done<=budget and done<=waiting+accepted
                assert waiting+accepted==done+new_waiting
                assert 0<=new_waiting<=capacity
                waiting=new_waiting;accepted_total+=accepted;done_total+=done;rejected_total+=rejected
            assert accepted_total==done_total+waiting
            assert sum(arrivals)==rejected_total+done_total+waiting
            cases+=1
print(str(cases)+' traces passed: validation, exact output, conservation, capacity, explicit rejection, FIFO, zero service, overload and finite-horizon recovery.')
`,
  );
  const verification = run('verify.py');
  const actual = JSON.parse(await readFile(join(directory, 'trace.json'), 'utf8'));
  const generator = await readFile(
    resolve(root, 'scripts/build-software-queue-based-load-leveling-visuals.mjs'),
    'utf8',
  );
  const literal = generator.match(/const rows\s*=\s*(\[[\s\S]*?\]);/)[1];
  const drawn = JSON.parse(literal.replace(/,\s*([\]}])/g, '$1'));
  if (JSON.stringify(actual) !== JSON.stringify(drawn))
    throw new Error('Illustrated trace differs from article execution');
  const out = resolve(root, '.local/software-queue-based-load-leveling');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['leveling.py', 'demo.py'],
        stdout: expected,
        illustration_trace_matches_execution: true,
        verification:
          'Actual article fences run unchanged on Python 3.11+. Exact header/four rows match every illustrated value. Strict tuple/integer validation rejects Boolean, fractional, negative and malformed inputs. Empty/idle input, admission-before-drain phase, explicit capacity refusal, trillion-count burst with only two retained identities, zero-service outage, finite horizon/residual work and appended idle recovery are checked. The sustained (4,4,4,4) case rejects four and leaves four waiting. Observation wraps the actual deque without replacing simulation logic: retained jobs remain FIFO, no maxlen eviction occurs, waiting stays within capacity, and removals match counted completions. 7500 finite traces verify independent per-phase and total conservation, bounded waiting, admission and service budget. This is a unit-cost virtual-time model, not a live limiter or broker; persistence, concurrent execution, retries, acknowledgments, byte accounting, duplicate-safe effects and actual external success are not simulated.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
