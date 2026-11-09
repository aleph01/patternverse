import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/data-workload-isolation.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article Python fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-bulkhead-'));
const run = (name) => {
  const r = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message || 'Example failed');
  return r.stdout;
};
try {
  for (const [index, name] of ['bulkhead.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'backfill: rejected',
    'live: served',
    'backfill: finished',
    'next backfill: served',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from threading import Barrier, Event, Lock, Thread, current_thread, enumerate as threads
from tempfile import TemporaryFile
from bulkhead import Bulkhead, BulkheadFull


def fails(kind, action):
    try: action()
    except kind as error: return error
    raise AssertionError('Expected ' + kind.__name__)


baseline = {t.ident for t in threads()}
for capacity in [None, True, False, 0, -1, 1.5, '2']:
    fails(ValueError, lambda: Bulkhead(capacity))
for capacity in [1, 3]:
    gate = Bulkhead(capacity)
    for value in [None, False, 0, 'ok']:
        assert gate.call(lambda: value) is value
        assert gate.call(current_thread) is current_thread()

class Cancelled(BaseException): pass
for error in [ValueError('bad action'), TypeError('bad type'), Cancelled('cancelled')]:
    gate = Bulkhead(1)
    def fail(): raise error
    assert fails(type(error), lambda: gate.call(fail)) is error
    assert gate.call(lambda: 'released') == 'released'
gate = Bulkhead(1)
fails(TypeError, lambda: gate.call(None))
assert gate.call(lambda: 7) == 7

# A barrier starts real simultaneous callers. Successful actions hold every
# permit until all ten admission decisions are observed; no scheduling-speed
# assumptions or sleep-based admission assertions are needed.
gate, live = Bulkhead(3), Bulkhead(1)
start, release, decided = Barrier(11), Event(), Event()
lock = Lock(); outcomes = []; errors = []; active = 0; peak = 0; invoked = []
def decision(value):
    with lock:
        outcomes.append(value)
        if len(outcomes) == 10: decided.set()
def action():
    global active, peak
    with lock:
        active += 1; peak = max(peak, active); invoked.append(current_thread().ident)
    decision('admitted')
    try:
        assert release.wait(5), 'Test cleanup watchdog expired'
        return 'done'
    finally:
        with lock: active -= 1
def caller():
    try:
        start.wait(5)
        try: assert gate.call(action) == 'done'
        except BulkheadFull: decision('rejected')
    except BaseException as error:
        with lock: errors.append(error)
workers = [Thread(target=caller) for _ in range(10)]
for worker in workers: worker.start()
try:
    start.wait(5)
    assert decided.wait(5)
    assert sorted(outcomes) == ['admitted'] * 3 + ['rejected'] * 7
    assert active == peak == 3 and len(invoked) == 3
    assert set(invoked) <= {w.ident for w in workers}
    assert live.call(lambda: 'independent') == 'independent'
    forbidden = []
    for _ in range(20): fails(BulkheadFull, lambda: gate.call(lambda: forbidden.append(1)))
    assert not forbidden and active == 3
finally:
    release.set()
    for worker in workers: worker.join(5)
assert not errors, errors
assert not any(w.is_alive() for w in workers) and active == 0
assert gate.call(lambda: 'reusable') == 'reusable'

# Local callback cleanup remains part of the admitted action. A caller that
# stops waiting for completion does not thereby free the occupied permit.
gate = Bulkhead(1)
cleaning, finish_cleanup, done = Event(), Event(), Event()
owned = []; observed = []; errors = []
def cleanup_action():
    with TemporaryFile() as resource:
        owned.append(resource)
        try: return 'result'
        finally:
            cleaning.set()
            assert finish_cleanup.wait(5)
def run_cleanup():
    try: observed.append(gate.call(cleanup_action))
    except BaseException as error: errors.append(error)
    finally: done.set()
worker = Thread(target=run_cleanup); worker.start()
try:
    assert cleaning.wait(5)
    assert not done.wait(0.01) and not owned[0].closed
    fails(BulkheadFull, lambda: gate.call(lambda: 'must not run'))
finally:
    finish_cleanup.set(); worker.join(5)
assert not worker.is_alive() and not errors and owned[0].closed
assert observed == ['result'] and gate.call(lambda: 'after cleanup') == 'after cleanup'

# Reentry fails immediately at capacity one and cannot release a permit that
# the rejected inner call never acquired.
gate = Bulkhead(1)
def reenter():
    for _ in range(3): fails(BulkheadFull, lambda: gate.call(lambda: 'inner'))
    return 'outer'
assert gate.call(reenter) == 'outer'
assert gate.call(lambda: 'next') == 'next'
assert {t.ident for t in threads()} == baseline
print('Capacity validation, falsy results, exact error propagation, 10-thread contention, independent admission, refusal without invocation, action ownership, cleanup lifetime and reentry passed.')
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-bulkhead');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['bulkhead.py', 'demo.py'],
        stdout: expected,
        verification:
          'Actual article fences run unchanged on Python 3.11+. Exact four-line demo output. Real simultaneous ten-thread contention admits exactly three held actions and rejects seven; independent live compartment remains usable. Rejections never invoke callbacks or release unowned permits. Successful/falsy returns, non-callable actions, ValueError, TypeError and cancellation-like BaseException preserve result/error identity and return capacity. Callbacks execute on their caller threads. An actual TemporaryFile remains open during gated finally cleanup; stopping an observer wait does not free capacity, and cleanup closes the file before result observation. Capacity-one reentry refuses immediately, later calls reuse capacity, and all owned threads are released and joined. No queue, fairness, CPU or byte reservation, timeout, action termination, async completion, fleet-wide cap or shared-data synchronization is inferred.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
