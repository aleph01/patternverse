import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/data-circuit-breakers.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article Python fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-circuit-breaker-'));
const run = (name) => {
  const r = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message || 'Example failed');
  return r.stdout;
};
try {
  for (const [index, name] of ['breaker.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'DependencyFailure closed',
    'DependencyFailure open',
    'CircuitOpen open',
    'DependencyFailure open',
    'CircuitOpen open',
    'written closed',
    'dependency calls: 4',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `import json
from pathlib import Path
from tempfile import TemporaryFile
from breaker import Breaker,CircuitOpen,DependencyFailure


def fails(kind,call):
    try:call()
    except kind as error:return error
    raise AssertionError('Expected '+kind.__name__)


class Clock:
    def __init__(self,start=0):self.now_ms=start


# Run the actual state machine through the illustrated six-request trace.
clock=Clock();breaker=Breaker(clock);calls=[];trace=[];files=[]
def write():
    assert breaker.state in ['closed','half-open']
    with TemporaryFile() as owned:
        files.append(owned);owned.write(b'B42');calls.append(breaker.state)
        if len(calls)<4:raise DependencyFailure('warehouse unavailable')
        return 'written'
for index,now in enumerate([0,0,0,100,199,200],1):
    clock.now_ms=now;before=breaker.state;count=len(calls)
    try:outcome=breaker.call(write)
    except DependencyFailure:outcome='failure'
    except CircuitOpen:outcome='not invoked'
    admission='local rejection' if len(calls)==count else 'normal call' if before=='closed' else 'recovery probe'
    trace.append([str(index),str(now),admission,outcome,breaker.state])
    assert all(f.closed for f in files)
assert calls==['closed','closed','half-open','half-open']
assert breaker.state=='closed' and breaker.failures==0 and len(files)==4
Path('diagram_trace.json').write_text(json.dumps(trace))

# Successful calls, including falsy results, reset counted history without retrying.
clock=Clock();breaker=Breaker(clock);seen=[]
def failure():
    seen.append('called');raise DependencyFailure('failure')
for value in [0,False,None,'ok']:
    fails(DependencyFailure,lambda:breaker.call(failure));assert breaker.failures==1
    assert breaker.call(lambda:value) is value
    assert breaker.state=='closed' and breaker.failures==0
assert len(seen)==4

# Closed-state unrelated errors neither increment nor reset the counted history.
class Cancelled(BaseException):pass
for error in [ValueError('invalid record'),TimeoutError('unclassified timeout'),Cancelled('cancel')]:
    clock=Clock();breaker=Breaker(clock)
    fails(DependencyFailure,lambda:breaker.call(failure));assert breaker.failures==1
    def unrelated():raise error
    assert fails(type(error),lambda:breaker.call(unrelated)) is error
    assert breaker.failures==1 and breaker.state=='closed'
    second=DependencyFailure('second counted failure')
    def counted():raise second
    assert fails(DependencyFailure,lambda:breaker.call(counted)) is second
    assert breaker.state=='open' and breaker.retry_at==100

# Cooldown begins at failure completion rather than call start, and uses the
# caller's arbitrary monotonic clock origin. Rejection does not extend it.
clock=Clock(500);breaker=Breaker(clock);count=[]
def slow_failure():
    count.append('call');clock.now_ms+=25;raise DependencyFailure('slow')
fails(DependencyFailure,lambda:breaker.call(slow_failure))
fails(DependencyFailure,lambda:breaker.call(slow_failure))
assert clock.now_ms==550 and breaker.retry_at==650
snapshot=(breaker.state,breaker.failures,breaker.retry_at)
clock.now_ms=649
for _ in range(10):
    fails(CircuitOpen,lambda:breaker.call(lambda:(_ for _ in ()).throw(AssertionError('must not invoke'))))
    assert (breaker.state,breaker.failures,breaker.retry_at)==snapshot
assert count==['call','call']
clock.now_ms=650;observed=[]
def probe():observed.append(breaker.state);return 'healthy'
assert breaker.call(probe)=='healthy' and observed==['half-open'] and breaker.failures==0

# Advancing time alone is not a background transition. At/after expiry, one
# probe executes; a failed probe restarts a full cooldown at its completion.
for boundary in [100,101]:
    clock=Clock();breaker=Breaker(clock)
    fails(DependencyFailure,lambda:breaker.call(failure))
    fails(DependencyFailure,lambda:breaker.call(failure))
    clock.now_ms=boundary
    assert breaker.state=='open'
    error=DependencyFailure('probe failed');states=[]
    def bad_probe():
        states.append(breaker.state);clock.now_ms+=30;raise error
    assert fails(DependencyFailure,lambda:breaker.call(bad_probe)) is error
    assert states==['half-open'] and breaker.state=='open' and breaker.failures==3
    assert breaker.retry_at==boundary+130
    clock.now_ms=breaker.retry_at-1
    fails(CircuitOpen,lambda:breaker.call(lambda:'must not run'))
    clock.now_ms+=1
    assert breaker.call(lambda:'restored')=='restored'
    assert breaker.state=='closed' and breaker.failures==0
    fails(DependencyFailure,lambda:breaker.call(failure));assert breaker.state=='closed'

# An inconclusive probe propagates its exact error and reopens without counting
# that error as dependency failure; cleanup/cancellation cannot strand half-open.
for error in [ValueError('invalid probe'),Cancelled('cancelled probe')]:
    clock=Clock();breaker=Breaker(clock)
    fails(DependencyFailure,lambda:breaker.call(failure))
    fails(DependencyFailure,lambda:breaker.call(failure))
    clock.now_ms=100;owned=[]
    def inconclusive():
        assert breaker.state=='half-open'
        with TemporaryFile() as resource:
            owned.append(resource);clock.now_ms+=20;raise error
    assert fails(type(error),lambda:breaker.call(inconclusive)) is error
    assert owned[0].closed and breaker.state=='open' and breaker.failures==2
    assert breaker.retry_at==220

# Exercise the explicit busy-probe guard through sequential callback reentry;
# this checks that guard only and makes no thread-safety claim.
clock=Clock();breaker=Breaker(clock)
fails(DependencyFailure,lambda:breaker.call(failure));fails(DependencyFailure,lambda:breaker.call(failure))
clock.now_ms=100;inner=[]
def guarded_probe():
    assert breaker.state=='half-open'
    fails(CircuitOpen,lambda:breaker.call(lambda:inner.append('should not execute')))
    assert breaker.state=='half-open' and breaker.failures==2
    return 'probe completed'
assert breaker.call(guarded_probe)=='probe completed' and not inner
assert breaker.state=='closed' and breaker.failures==0

# Scope isolation: an independently retained breaker can succeed while another
# is open. A new instance has no shared history; no fleet-wide state is implied.
a,b=Breaker(clock),Breaker(clock)
fails(DependencyFailure,lambda:a.call(failure));fails(DependencyFailure,lambda:a.call(failure))
assert a.state=='open' and b.call(lambda:'supplier B')=='supplier B'
assert Breaker(clock).state=='closed'
print('Thresholds, success reset, classification, exact cooldown, lazy probes, local rejection, reopen, error/cancellation propagation and callback cleanup passed.')
`,
  );
  const verification = run('verify.py');
  const actual = JSON.parse(await readFile(join(directory, 'diagram_trace.json'), 'utf8'));
  const generator = await readFile(
    resolve(root, 'scripts/build-software-circuit-breaker-visuals.mjs'),
    'utf8',
  );
  const literal = generator.match(/const rows\s*=\s*(\[[\s\S]*?\]);/)[1];
  const drawn = JSON.parse(literal.replaceAll("'", '"').replace(/,\s*([\]}])/g, '$1'));
  if (JSON.stringify(actual) !== JSON.stringify(drawn))
    throw new Error('Illustrated trace differs from actual article execution');
  const out = resolve(root, '.local/software-circuit-breaker');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['breaker.py', 'demo.py'],
        stdout: expected,
        illustration_trace_matches_execution: true,
        verification:
          'Actual article fences run unchanged on Python 3.11+. Exact seven-line output and six-request/four-invocation trace match every figure row. Two counted failures open; successful/falsy results reset history; ignored ValueError, unclassified TimeoutError and cancellation-like BaseException preserve closed-state counter and error identity. Cooldown starts at failure completion with arbitrary clock origin, rejects just before expiry, admits at equality/afterward, and local rejection changes neither deadline nor counts nor invokes the callback. Time advancement alone performs no background transition. Failed probes restart cooldown at their completion; successful probes close/reset, and a later isolated failure does not immediately reopen. Inconclusive/error/cancelled probes propagate unchanged, reopen without incrementing failure count and release actual callback-owned TemporaryFiles. A sequential reentry seam exercises busy-probe rejection without claiming thread safety. Independent breakers isolate scopes; newly created instances do not share history. Real files close before caller observation and callbacks own that cleanup. No network, concurrency synchronization, fleet sharing, timer thread, deadline enforcement, retry, durable batch/fallback implementation or remote rollback is inferred.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
