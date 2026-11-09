import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/load-shedding.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article Python fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-load-shedding-'));
const run = (name) => {
  const r = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message || 'Example failed');
  return r.stdout;
};
try {
  for (const [i, name] of ['shedding.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[i]);
  const expected = ['heavy: rejected', 'light: served', 'held: finished', 'heavy later: served'];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from threading import Barrier,Event,Lock,Thread,current_thread,enumerate as threads
from tempfile import TemporaryFile
from shedding import LoadShedder,Overloaded


def fails(kind,call):
    try:call()
    except kind as error:return error
    raise AssertionError('Expected '+kind.__name__)

baseline={t.ident for t in threads()}
for n in [None,True,False,0,-1,1.5,'3']:fails(ValueError,lambda:LoadShedder(n))
gate=LoadShedder(3);called=[]
for n in [None,True,False,0,-1,1.5,'1',4]:
    fails(ValueError,lambda:gate.call(n,lambda:called.append(1)))
    assert gate._used==0 and not called
for n in [1,2,3]:
    for value in [0,False,None,'ok']:
        assert gate.call(n,lambda:value) is value and gate._used==0
        assert gate.call(n,current_thread) is current_thread()
class Cancelled(BaseException):pass
for error in [ValueError('domain error'),TimeoutError('timeout'),Cancelled('cancel')]:
    def broken():raise error
    assert fails(type(error),lambda:gate.call(3,broken)) is error
    assert gate._used==0 and gate.call(3,lambda:'next')=='next'
fails(TypeError,lambda:gate.call(3,None));assert gate._used==0

# Weighted equality and callback reentry prove execution is outside the lock.
def outer():
    assert gate._used==2
    def inner():
        assert gate._used==3
        fails(Overloaded,lambda:gate.call(1,lambda:'forbidden'))
        fails(ValueError,lambda:gate.call(4,lambda:'invalid policy'))
        assert gate._used==3
        return 'inner'
    assert gate.call(1,inner)=='inner' and gate._used==2
    fails(Overloaded,lambda:gate.call(2,lambda:'too much'))
    return 'outer'
assert gate.call(2,outer)=='outer' and gate._used==0

# Ten real competing cost-two actions share five units. Successful callbacks
# remain held until all admission decisions are recorded; exactly two fit.
gate=LoadShedder(5);start=Barrier(11);release=Event();decided=Event();lock=Lock()
outcomes=[];errors=[];active_cost=peak=0;invoked=[]
def decide(value):
    with lock:
        outcomes.append(value)
        if len(outcomes)==10:decided.set()
def heavy():
    global active_cost,peak
    with lock:
        active_cost+=2;peak=max(peak,active_cost);invoked.append(current_thread().ident)
    decide('admitted')
    try:
        assert release.wait(5),'Test watchdog expired'
        return 'done'
    finally:
        with lock:active_cost-=2
def caller():
    try:
        start.wait(5)
        try:assert gate.call(2,heavy)=='done'
        except Overloaded:decide('rejected')
    except BaseException as error:
        with lock:errors.append(error)
workers=[Thread(target=caller) for _ in range(10)]
for worker in workers:worker.start()
try:
    start.wait(5);assert decided.wait(5)
    assert sorted(outcomes)==['admitted']*2+['rejected']*8
    assert active_cost==peak==gate._used==4
    assert set(invoked)<={w.ident for w in workers} and len(invoked)==2
    refused=[]
    for _ in range(20):fails(Overloaded,lambda:gate.call(2,lambda:refused.append(1)))
    assert not refused and gate._used==4
    def light():
        assert gate._used==5
        fails(Overloaded,lambda:gate.call(1,lambda:'forbidden'))
        return 'fits exactly'
    assert gate.call(1,light)=='fits exactly' and gate._used==4
    # Independently retained instances have separate, not fleet-wide, budgets.
    assert LoadShedder(5).call(5,lambda:'independent')=='independent'
finally:
    release.set()
    for worker in workers:worker.join(5)
assert not errors and not any(w.is_alive() for w in workers)
assert active_cost==0 and gate._used==0 and gate.call(5,lambda:'reused')=='reused'

# A returned value waiting in callback finally cleanup still occupies cost.
# Merely stopping an observer wait cannot release that cost or close its file.
gate=LoadShedder(3);cleaning=Event();finish=Event();done=Event();files=[];results=[];errors=[]
def operation():
    with TemporaryFile() as resource:
        files.append(resource)
        try:return 'complete'
        finally:
            cleaning.set();assert finish.wait(5)
def run():
    try:results.append(gate.call(2,operation))
    except BaseException as error:errors.append(error)
    finally:done.set()
worker=Thread(target=run);worker.start()
try:
    assert cleaning.wait(5) and not done.wait(0.01) and not files[0].closed
    fails(Overloaded,lambda:gate.call(2,lambda:'must not run'))
    assert gate.call(1,lambda:'remaining unit')=='remaining unit' and gate._used==2
finally:finish.set();worker.join(5)
assert not errors and not worker.is_alive() and files[0].closed and results==['complete']
assert gate._used==0 and gate.call(3,lambda:'all units returned')=='all units returned'
assert {t.ident for t in threads()}==baseline
print('Weighted equality, invalid policy, exact errors, 10-thread contention, refusal without invocation/claim, caller execution, cleanup lifetime, independent instances and budget reuse passed.')
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-load-shedding');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['shedding.py', 'demo.py'],
        stdout: expected,
        verification:
          'Actual article fences run unchanged on Python 3.11+. Four-line output verifies held cost two, cost-two refusal, cost-one success and later reuse. Strict integer validation rejects Boolean/fractional/negative/zero inputs, and over-capacity cost is ValueError even at saturation; no invalid/refused callback runs or budget is claimed. Exact equality is admitted. Falsy results and ValueError/TimeoutError/cancellation-like BaseException preserve identity and return exactly the claimed cost; non-callable action failure also returns cost. Nested callback calls prove execution is outside the accounting lock. Ten simultaneous cost-two actions against five units admit exactly two held callbacks and refuse eight, leaving one unit for a light action at equality; execution occurs on caller threads. Refusal never adds waiters or changes occupied cost. Independent instances do not share budget. A real callback-owned TemporaryFile remains open through gated finally cleanup and budget remains occupied even when an observer stops waiting; closure precedes result observation and capacity reuse. All owned threads are released/joined and thread inventory returns to baseline. No hardware, rate, fairness, priority, deadline, cancellation, fleet quota, HTTP response or measured production goodput guarantee is inferred.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
