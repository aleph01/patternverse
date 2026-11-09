import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(
  resolve(root, 'content/patterns/data-exponential-backoff-with-jitter.md'),
  'utf8',
);
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article Python fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-retry-jitter-'));
const run = (name) => {
  const r = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message || 'Example failed');
  return r.stdout;
};
try {
  for (const [index, name] of ['retry_read.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'attempt 1: 1000 ms left',
    'wait 41 ms',
    'attempt 2: 939 ms left',
    'wait 38 ms',
    'attempt 3: 881 ms left',
    'result: partition 7',
    'elapsed: 139 ms',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from random import Random
from tempfile import TemporaryFile
from retry_read import retry_read,TemporaryUnavailable,BudgetExpired


def fails(kind,call):
    try:call()
    except kind as error:return error
    raise AssertionError('Expected '+kind.__name__)


class Clock:
    def __init__(self,start=0,overshoot=0):
        self.now_ms=start;self.overshoot=overshoot;self.waits=[];self.audit=lambda:None
    def sleep_ms(self,delay):
        self.audit();self.waits.append(delay);self.now_ms+=delay+self.overshoot


class Draws:
    def __init__(self,values):self.values=iter(values);self.windows=[]
    def randint(self,low,high):
        self.windows.append((low,high));value=next(self.values)
        assert low<=value<=high
        return value


# Initial success, including falsy data, has no delay or random draw.
for value in ['partition 7',0,None,False]:
    clock=Clock();rng=Draws([]);allowances=[]
    def read(remaining):allowances.append(remaining);return value
    assert retry_read(read,clock,rng) is value
    assert allowances==[1000] and not rng.windows and not clock.waits

# Actual seeded demonstration accounting; every failed callback releases its
# real file before the policy samples/waits. The policy cannot do that for it.
clock=Clock(start=10_000);rng=Random(7);allowances=[];files=[];events=[]
def read(remaining):
    allowances.append(remaining)
    with TemporaryFile() as owned:
        files.append(owned);owned.write(b'metadata');owned.seek(0)
        assert owned.read()==b'metadata';clock.now_ms+=20
        if len(allowances)<3:raise TemporaryUnavailable('transient')
        return b'partition 7'
def audit():
    assert files and all(f.closed for f in files);events.append('wait after resource release')
clock.audit=audit
assert retry_read(read,clock,rng)==b'partition 7'
assert allowances==[1000,939,881] and clock.waits==[41,38] and clock.now_ms==10_139
assert len(events)==2 and all(f.closed for f in files)

# Four total attempts include the first. Exactly three capped windows; the
# fourth eligible failure is propagated unchanged and never followed by a wait.
for draws in [[0,0,0],[100,200,400]]:
    clock=Clock();rng=Draws(draws);errors=[]
    def failing(remaining):
        assert remaining>0;clock.now_ms+=20
        error=TemporaryUnavailable(str(len(errors)+1));errors.append(error);raise error
    caught=fails(TemporaryUnavailable,lambda:retry_read(failing,clock,rng))
    assert caught is errors[-1] and len(errors)==4
    assert rng.windows==[(0,100),(0,200),(0,400)] and clock.waits==draws
    assert clock.now_ms==80+sum(draws)

# A permanent or unclassified failure, including an ambiguous TimeoutError,
# is not automatically made retryable. Preserve its identity, even after a retry.
for error in [ValueError('invalid'),PermissionError('denied'),TimeoutError('uncertain')]:
    for position in [1,2]:
        clock=Clock();rng=Draws([0]);calls=[]
        def failed(remaining):
            calls.append(remaining)
            if len(calls)<position:raise TemporaryUnavailable('first failure')
            raise error
        assert fails(type(error),lambda:retry_read(failed,clock,rng)) is error
        assert len(calls)==position and len(clock.waits)==position-1

# Exact expiry during a failed attempt takes priority over further retry
# admission. Oversized/equal samples are rejected, never clamped or slept.
for spent in [1000,1001]:
    clock=Clock();rng=Draws([]);error=TemporaryUnavailable('late failure');calls=[]
    def failed(remaining):calls.append(remaining);clock.now_ms+=spent;raise error
    caught=fails(BudgetExpired,lambda:retry_read(failed,clock,rng))
    assert caught.__cause__ is error and calls==[1000] and not clock.waits and not rng.windows
for sample in [50,51,100]:
    clock=Clock();rng=Draws([sample]);error=TemporaryUnavailable('nearly expired');calls=[]
    def failed(remaining):calls.append(remaining);clock.now_ms+=950;raise error
    caught=fails(BudgetExpired,lambda:retry_read(failed,clock,rng))
    assert caught.__cause__ is error and calls==[1000] and not clock.waits

# One millisecond less than the remaining allowance can admit a new attempt;
# zero delay is valid and cannot bypass either attempt or deadline limits.
for sample in [0,49]:
    clock=Clock();rng=Draws([sample]);calls=[]
    def almost(remaining):
        calls.append(remaining)
        if len(calls)==1:clock.now_ms+=950;raise TemporaryUnavailable('retry')
        return 'ok'
    assert retry_read(almost,clock,rng)=='ok'
    assert calls==[1000,50-sample] and clock.waits==[sample]

# Timer/scheduler overshoot is rechecked before a next attempt is created.
clock=Clock(overshoot=1000);rng=Draws([0]);calls=[]
def failed(remaining):calls.append(remaining);raise TemporaryUnavailable('retry')
fails(BudgetExpired,lambda:retry_read(failed,clock,rng))
assert calls==[1000] and clock.waits==[0]

# Expiry between operation creation and first admission starts no call.
class ElapsedBeforeAdmission:
    def __init__(self):self.values=iter([5000,6000])
    @property
    def now_ms(self):return next(self.values)
clock=ElapsedBeforeAdmission();rng=Draws([])
fails(BudgetExpired,lambda:retry_read(lambda remaining:(_ for _ in ()).throw(AssertionError('must not start')),clock,rng))
assert not rng.windows

# Late returns are rejected only after callback execution; no preemption claimed.
for spent in [999,1000,1001]:
    clock=Clock();rng=Draws([]);completed=[]
    def slow(remaining):clock.now_ms+=spent;completed.append('returned');return 'late'
    if spent<1000:assert retry_read(slow,clock,rng)=='late'
    else:fails(BudgetExpired,lambda:retry_read(slow,clock,rng))
    assert completed==['returned'] and not clock.waits

# Cancellation-like BaseException at either read or wait boundary escapes;
# there is no hidden background retry or error swallowing.
class Cancelled(BaseException):pass
for boundary in ['read','wait']:
    clock=Clock();rng=Draws([10]);calls=[];cancelled=Cancelled('cancel')
    def read(remaining):
        calls.append(remaining)
        if boundary=='read':raise cancelled
        raise TemporaryUnavailable('retry')
    if boundary=='wait':
        def stop(delay):raise cancelled
        clock.sleep_ms=stop
    assert fails(Cancelled,lambda:retry_read(read,clock,rng)) is cancelled
    assert len(calls)==1

# Independent seeded clients may have the same schedule: jitter is not a
# collision-free scheduler. The illustration's consecutive gaps fit 1,2,4 s.
schedules=[]
for seed in [7,7,8]:
    clock=Clock();rng=Random(seed);calls=[]
    def read(remaining):
        calls.append(remaining)
        if len(calls)<4:raise TemporaryUnavailable('retry')
        return 'ok'
    assert retry_read(read,clock,rng)=='ok';schedules.append(clock.waits)
assert schedules[0]==schedules[1] and schedules[0]!=schedules[2]
print('Seeded accounting, capped windows, endpoints, bounded attempts, eligibility, budget admission, overshoot, late returns, cancellation and resource release passed.')
`,
  );
  const verification = run('verify.py');
  const generator = await readFile(
    resolve(root, 'scripts/build-software-retry-backoff-jitter-visuals.mjs'),
    'utf8',
  );
  const draws = JSON.parse(
    generator.match(/const draws\s*=\s*(\[[\s\S]*?\]);/)[1].replace(/,\s*([\]}])/g, '$1'),
  );
  for (const row of draws) {
    let previous = 0;
    row.forEach((point, i) => {
      if (point < previous || point - previous > [1, 2, 4][i])
        throw new Error('Illustration sample exceeds retry window');
      previous = point;
    });
  }
  const out = resolve(root, '.local/software-retry-backoff-jitter');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['retry_read.py', 'demo.py'],
        stdout: expected,
        verification:
          'Actual article fences run unchanged. Exact seven-line seeded output, allowances 1000/939/881 ms, waits 41/38 ms, three 20 ms callbacks and 139 ms elapsed. Success and falsy results require no randomness or wait. Lower and upper inclusive draws verify windows 0..100, 0..200, 0..400, four attempts total, three waits maximum, unchanged last failure and no terminal wait. Permanent/unclassified ValueError, PermissionError and TimeoutError retain identity and do not trigger further retries. Deadline equality/overrun during failure, exact/excess wait-fit boundaries and chained eligible errors stop without clamping or sleeping. Zero and just-fitting samples admit only within remaining time. Wake overshoot prevents a next callback; expiry before initial admission starts nothing. Late success is rejected after callback returns, not preempted. Cancellation-like BaseException during read or waiting escapes with no new attempt. Real TemporaryFile resources are closed by the callback before policy waits and after success, verifying the stated ownership precondition rather than claiming policy-driven release. Seeded clients can collide, different seeds vary, and all illustrative consecutive waits satisfy 1/2/4 second bounds. No live network, wall-clock timing, HTTP/Retry-After parsing, duplicate protection, aggregate quota, rollback or durable scheduling is inferred.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
