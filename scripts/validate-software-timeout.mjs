import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/timeout.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-timeout-'));
const run = (name) => {
  const r = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message || 'Example failed');
  return r.stdout;
};
try {
  for (const [index, name] of ['quote_budget.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'fast: (2, 500)',
    'shipping: released',
    'slow: timeout',
    'zero: expired before work',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `import asyncio
import time
from contextlib import contextmanager
from types import SimpleNamespace
import quote_budget as article


async def fails(kind,call):
    try: await call()
    except kind as error: return error
    raise AssertionError('Expected '+kind.__name__)


@contextmanager
def observed(clock=None):
    original_timeout=article.asyncio.timeout_at
    original_loop=article.asyncio.get_running_loop
    real_loop=original_loop();records=[]
    def timed(deadline):
        context=original_timeout(deadline)
        records.append((deadline,context));return context
    article.asyncio.timeout_at=timed
    if clock is not None:
        # Only the article's clock lookup is replaced. Actual timeout contexts still
        # obtain their real event loop through asyncio.events and schedule real timers.
        article.asyncio.get_running_loop=lambda:SimpleNamespace(time=clock)
    try:yield records
    finally:
        article.asyncio.timeout_at=original_timeout
        article.asyncio.get_running_loop=original_loop


async def main():
    loop=asyncio.get_running_loop();baseline=set(asyncio.all_tasks())
    calls=[]
    async def stock():calls.append('stock');return 2
    async def shipping():calls.append('shipping');return 500
    for budget in [None,True,False,'100',-1,60_001,float('nan'),float('inf'),-float('inf'),10**1000]:
        calls.clear()
        with observed() as records:
            await fails(ValueError,lambda:article.quote_with_budget(stock,shipping,budget))
            assert not calls and not records
    calls.clear()
    with observed() as records:
        await fails(TimeoutError,lambda:article.quote_with_budget(stock,shipping,0))
        assert not calls and not records
    for budget in [1000,1000.5,60_000]:
        calls.clear()
        with observed() as records:
            value=await article.quote_with_budget(stock,shipping,budget)
            assert value==(2,500) and calls==['stock','shipping']
            assert len(records)==1 and records[0][1].when()==records[0][0]
            assert not records[0][1].expired()
        assert asyncio.current_task().cancelling()==0

    # Deterministic accounting: a controlled local clock, real timeout context,
    # no sleeps or timing tolerances. Both stages use the one recorded deadline.
    base=loop.time();elapsed=[0.0];calls.clear()
    async def used_stock():elapsed[0]=0.120;calls.append('stock');return 2
    async def rest_shipping():
        calls.append('shipping');assert abs((base+0.300)-(base+elapsed[0])-0.180)<1e-8
        elapsed[0]=0.299;return 500
    with observed(lambda:base+elapsed[0]) as records:
        assert await article.quote_with_budget(used_stock,rest_shipping,300)==(2,500)
        assert calls==['stock','shipping'] and len(records)==1
        assert records[0][0]==base+0.300
    for used in [0.300,0.301]:
        elapsed[0]=0.0;calls.clear()
        async def exhausted_stock():elapsed[0]=used;calls.append('stock');return 2
        with observed(lambda:base+elapsed[0]) as records:
            await fails(TimeoutError,lambda:article.quote_with_budget(exhausted_stock,shipping,300))
            assert calls==['stock'] and len(records)==1 and not records[0][1].expired()
    elapsed[0]=0.0;calls.clear()
    async def exact_shipping():elapsed[0]=0.300;calls.append('shipping');return 500
    with observed(lambda:base+elapsed[0]):
        await fails(TimeoutError,lambda:article.quote_with_budget(stock,exact_shipping,300))
        assert calls==['stock','shipping']
    readings=iter([base,base+1.0]);calls.clear()
    with observed(lambda:next(readings)) as records:
        await fails(TimeoutError,lambda:article.quote_with_budget(stock,shipping,300))
        assert not calls and not records

    # Actual timer expiry, in both phases. Cleanup is held at an explicit gate,
    # proving that caller completion is not a hard deadline or detached cleanup.
    for phase in ['stock','shipping']:
        entered=asyncio.Event();cleaning=asyncio.Event();release=asyncio.Event();events=[]
        async def stalled():
            entered.set()
            try:await asyncio.Event().wait()
            finally:
                events.append('cleanup begins');cleaning.set()
                await release.wait();events.append('cleanup ends')
        with observed() as records:
            job=asyncio.create_task(article.quote_with_budget(stalled if phase=='stock' else stock,stalled if phase=='shipping' else shipping,1000))
            try:
                await asyncio.wait_for(entered.wait(),3)
                await asyncio.wait_for(cleaning.wait(),3)
                assert not job.done() and events==['cleanup begins']
                assert len(records)==1 and records[0][1].expired()
                release.set()
                await fails(TimeoutError,lambda:job)
                events.append('caller observes timeout')
                assert events==['cleanup begins','cleanup ends','caller observes timeout']
                assert job.done() and not job.cancelled() and job.cancelling()==0
            finally:
                release.set()
                if not job.done():job.cancel()
                await asyncio.gather(job,return_exceptions=True)

    # A dependency error, including its own TimeoutError, retains identity and is
    # not reclassified as proof that this wrapper's deadline fired.
    for error in [ConnectionError('dependency failed'),TimeoutError('dependency timeout')]:
        calls.clear()
        async def broken():calls.append('stock');raise error
        with observed() as records:
            caught=await fails(type(error),lambda:article.quote_with_budget(broken,shipping,10_000))
            assert caught is error and calls==['stock'] and not records[0][1].expired()

    # Caller cancellation is not swallowed or translated to TimeoutError.
    entered=asyncio.Event();cleaned=[]
    async def cancellable():
        entered.set()
        try:await asyncio.Event().wait()
        finally:cleaned.append('closed')
    with observed() as records:
        job=asyncio.create_task(article.quote_with_budget(stock,cancellable,10_000))
        await asyncio.wait_for(entered.wait(),3);job.cancel()
        await fails(asyncio.CancelledError,lambda:job)
        assert job.cancelled() and cleaned==['closed'] and not records[0][1].expired()

    # Actual cancellation-unwind failure changes the error delivered to the caller.
    class CleanupFailure(Exception):pass
    async def bad_cleanup():
        try:await asyncio.Event().wait()
        finally:raise CleanupFailure('cleanup failed')
    with observed() as records:
        error=await fails(CleanupFailure,lambda:article.quote_with_budget(stock,bad_cleanup,30))
        assert isinstance(error.__context__,asyncio.CancelledError) and records[0][1].expired()
    assert asyncio.current_task().cancelling()==0

    # The timer cannot interrupt synchronous blocking. Explicit checks reject its
    # late result only after that code returns; this is not a latency benchmark.
    calls.clear();returned=[]
    async def blocking_stock():
        time.sleep(0.03);returned.append('blocking work returned');return 2
    await fails(TimeoutError,lambda:article.quote_with_budget(blocking_stock,shipping,1))
    assert returned==['blocking work returned'] and calls==[]
    async def blocking_shipping():
        time.sleep(0.03);returned.append('shipping returned');return 500
    await fails(TimeoutError,lambda:article.quote_with_budget(stock,blocking_shipping,1))
    assert returned[-1]=='shipping returned'

    # Finite suppression of cancellation still cannot publish an overdue result;
    # an infinitely resistant dependency would remain outside the guarantee.
    suppressed=[]
    async def ignores_once():
        try:await asyncio.Event().wait()
        except asyncio.CancelledError:suppressed.append('cancel requested');return 500
    await fails(TimeoutError,lambda:article.quote_with_budget(stock,ignores_once,30))
    assert suppressed==['cancel requested'] and asyncio.current_task().cancelling()==0
    assert await article.quote_with_budget(stock,shipping,1000)==(2,500)
    async def zero():return 0
    assert await article.quote_with_budget(zero,zero,1000)==(0,0)
    assert set(asyncio.all_tasks())==baseline
    print('Shared budget, exact boundaries, real timer cancellation, gated cleanup, errors, external cancellation and ownership passed.')

asyncio.run(main())
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-timeout');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['quote_budget.py', 'demo.py'],
        stdout: expected,
        verification:
          'Actual article fences run unchanged on Python 3.11+. Exact four-line demo output; malformed, Boolean, negative, nonfinite and excessive budgets reject before work; zero expires before callable creation; positive integer, float and 60000 ms maximum accepted. Controlled-clock accounting with real timeout contexts proves one deadline for serial stages, 120 ms leaves 180 ms of a 300 ms budget, exact equality and overrun prevent the next stage, and an overdue second-stage return is rejected. Native asyncio timers expire during each phase; explicitly gated awaited cleanup proves the caller remains pending until cleanup finishes and observes TimeoutError afterward, with no detached work. Dependency ConnectionError and dependency-origin TimeoutError preserve identity without attributing them to this timer. External caller cancellation propagates as CancelledError after cleanup, with no false TimeoutError conversion. A cleanup exception overrides timeout and preserves cancellation context. Blocking synchronous work returns before explicit expiry checks reject its late result, demonstrating no preemption. A dependency that suppresses one cancellation still cannot publish an overdue value; no guarantee is inferred for indefinite suppression. Current-task cancellation state clears, independent calls succeed after errors, legitimate zero-valued business data remains distinct from timeout, all owned jobs are observed, and task inventory returns to baseline. Tests do not claim real-time return bounds, actual network cancellation, remote rollback, thread termination or retry safety.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
