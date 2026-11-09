import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/request-coalescing.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-coalescing-'));
const checks = `
import asyncio,contextlib,io,runpy,json,gc
from collections import Counter
output=io.StringIO()
with contextlib.redirect_stdout(output):
    module=runpy.run_path('coalescing.py',run_name='__main__')
expected=['B cancelled its wait','shared 1200 1200 loads 1','later 1200 loads 2']
assert output.getvalue().splitlines()==expected
Coalescer=module['Coalescer']
async def cancelled(task):
    task.cancel()
    try: await task
    except asyncio.CancelledError: pass
    else: raise AssertionError('Cancellation did not reach its caller')
async def run_checks():
    loop=asyncio.get_running_loop();assert loop.get_task_factory() is None
    supervisors=set(asyncio.all_tasks())
    key=('tenant-A','SKU-7','USD',3)
    variants=[key,('tenant-B','SKU-7','USD',3),('tenant-A','SKU-8','USD',3),('tenant-A','SKU-7','EUR',3),('tenant-A','SKU-7','USD',4)]
    calls=Counter();started=asyncio.Event();release=asyncio.Event()
    async def load(identity):
        calls[identity]+=1
        if len(calls)==len(variants):started.set()
        await release.wait()
        return identity
    g=Coalescer(load)
    requests=[asyncio.create_task(g.get(k)) for k in [key]*20+variants[1:]]
    await started.wait()
    assert dict(calls)==dict.fromkeys(variants,1) and len(g.flights)==5
    assert all(not t.done() for t in requests)
    release.set();assert await asyncio.gather(*requests)==[key]*20+variants[1:]
    assert not g.flights
    assert await g.get(key)==key and calls[key]==2
    await g.close()
    # Independent instances deliberately do not share identical work.
    calls=0;started=asyncio.Event();release=asyncio.Event()
    async def local(identity):
        nonlocal calls
        calls+=1
        if calls==2:started.set()
        await release.wait();return 1200
    first,second=Coalescer(local),Coalescer(local)
    readers=[asyncio.create_task(first.get(key)),asyncio.create_task(second.get(key))]
    await started.wait();assert calls==2
    release.set();assert await asyncio.gather(*readers)==[1200,1200]
    await first.close();await second.close()
    # Ordinary failure fans out once, retires, and permits a successful new attempt.
    calls=0;failing=True;started=asyncio.Event();release=asyncio.Event()
    async def unstable(identity):
        nonlocal calls
        calls+=1;started.set();await release.wait()
        if failing:raise LookupError('source unavailable')
        return 1300
    g=Coalescer(unstable);readers=[asyncio.create_task(g.get(key)) for _ in range(12)]
    await started.wait();assert calls==1
    release.set();results=await asyncio.gather(*readers,return_exceptions=True)
    assert all(isinstance(e,LookupError) and str(e)=='source unavailable' for e in results)
    assert not g.flights
    failing=False;assert await g.get(key)==1300 and calls==2
    await g.close()
    # Cancelling the initiating caller and timing out another waiter leave shared work alive.
    calls=0;started=asyncio.Event();release=asyncio.Event()
    async def blocked(identity):
        nonlocal calls
        calls+=1;started.set();await release.wait();return 1200
    g=Coalescer(blocked);a=asyncio.create_task(g.get(key));await started.wait()
    c=asyncio.create_task(g.get(key));await asyncio.sleep(0)
    flight=g.flights[key];await cancelled(a)
    try:
        async with asyncio.timeout(0):await g.get(key)
    except TimeoutError:pass
    else:raise AssertionError('Waiter timeout did not fire')
    assert calls==1 and not flight.cancelled() and not flight.done() and not c.done()
    release.set();assert await c==1200 and not g.flights
    await g.close()
    # With every waiter gone the service keeps the flight and observes an eventual failure.
    diagnostics=[];previous=loop.get_exception_handler();loop.set_exception_handler(lambda loop,context:diagnostics.append(context))
    try:
        calls=0;started=asyncio.Event();release=asyncio.Event()
        async def abandoned(identity):
            nonlocal calls
            calls+=1;started.set();await release.wait();raise RuntimeError('abandoned failure')
        g=Coalescer(abandoned);a=asyncio.create_task(g.get(key));await started.wait()
        b=asyncio.create_task(g.get(key));await asyncio.sleep(0)
        await cancelled(a);await cancelled(b);del a,b
        gc.collect();await asyncio.sleep(0)
        assert key in g.flights and not g.flights[key].done() and calls==1
        release.set()
        for _ in range(4):await asyncio.sleep(0)
        assert not g.flights
        gc.collect();await asyncio.sleep(0);assert diagnostics==[]
        await g.close()
    finally:loop.set_exception_handler(previous)
    # Cancellation of the underlying task itself does reach all waiters, then cleans up.
    calls=0;started=asyncio.Event();release=asyncio.Event()
    g=Coalescer(blocked);a=asyncio.create_task(g.get(key));await started.wait()
    b=asyncio.create_task(g.get(key));await asyncio.sleep(0)
    g.flights[key].cancel()
    values=await asyncio.gather(a,b,return_exceptions=True)
    assert all(isinstance(v,asyncio.CancelledError) for v in values) and not g.flights
    release.set();assert await g.get(key)==1200 and calls==2
    await g.close()
    # Force the completed-entry/callback scheduling boundary; old cleanup must not erase a replacement.
    calls=0;started=asyncio.Event();release=asyncio.Event();g=Coalescer(blocked)
    old=asyncio.create_task(asyncio.sleep(0,result=900));await old
    g.flights[key]=old
    reader=asyncio.create_task(g.get(key));await started.wait();replacement=g.flights[key]
    assert replacement is not old and not replacement.done()
    g._retire(key,old);assert g.flights[key] is replacement
    release.set();assert await reader==1200 and not g.flights
    await g.close()
    # Shutdown rejects new work immediately and drains active shared tasks.
    calls=0;started=asyncio.Event();release=asyncio.Event();g=Coalescer(blocked)
    reader=asyncio.create_task(g.get(key));await started.wait()
    closer=asyncio.create_task(g.close());await asyncio.sleep(0)
    assert g.closed and not closer.done()
    try:await g.get(key)
    except RuntimeError as e:assert str(e)=='coalescer closed'
    else:raise AssertionError('Closed coordinator admitted work')
    release.set();assert await reader==1200;await closer;assert not g.flights
    await g.close()
    # Interrupting a draining caller must not propagate cancellation into owned flights.
    calls=0;started=asyncio.Event();release=asyncio.Event();g=Coalescer(blocked)
    reader=asyncio.create_task(g.get(key));await started.wait()
    closer=asyncio.create_task(g.close());await asyncio.sleep(0);await cancelled(closer)
    assert not g.flights[key].cancelled() and not g.flights[key].done()
    release.set();assert await reader==1200;await g.close();assert not g.flights
    # Zero and None are actual results, not missing-flight sentinels. Bad keys fail without work.
    async def values(identity):return identity
    g=Coalescer(values)
    assert await g.get(0)==0 and await g.get(None) is None
    try:await g.get([])
    except TypeError:pass
    else:raise AssertionError('Unhashable key accepted')
    assert not g.flights;await g.close()
    await asyncio.sleep(0)
    remaining=[t for t in asyncio.all_tasks() if t not in supervisors and not t.done()]
    assert remaining==[],remaining
asyncio.run(asyncio.wait_for(run_checks(),10))
print(json.dumps({'status':'passed','output':expected,'same_key_waiters':20,'independent_key_variants':5,'shared_failure_waiters':12,'checks':['same-key duplicate suppression under real coroutine overlap','tenant/resource/currency/version separation and independent progress','later call executes anew without result cache','independent coordinator scopes do not share','shared ordinary failure and successful retry','initiating-waiter cancellation isolation','caller timeout isolation','all-waiters-left strong task retention and failure observation','underlying cancellation reaches waiters and permits retry','completed-flight bypass and stale cleanup identity','shutdown rejects new work and drains flights','cancelled shutdown wait does not cancel owned work','zero/None results and unhashable keys','no remaining background tasks']}))
`;
try {
  await writeFile(join(directory, 'coalescing.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 20000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const record = JSON.parse(result.stdout);
  const visuals = (
    await readFile(resolve(root, 'scripts/build-software-request-coalescing-visuals.mjs'), 'utf8')
  ).replaceAll(/\s/g, '');
  for (const row of [
    "['Three callers join flight 1','A, B, C await the same task','Underlying loads: 1']",
    "['B cancels its wait','A and C remain attached','Flight 1 continues']",
    "['Flight 1 completes','A and C receive 1200 cents','Retire flight 1']",
    "['Later call starts flight 2','No completed-price cache','Underlying loads: 2']",
  ]) {
    if (!visuals.includes(row.replaceAll(/\s/g, '')))
      throw new Error('Diagram differs from program: ' + row);
  }
  const out = resolve(root, '.local/software-request-coalescing');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'code-checks.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(
    'Actual program, coroutine overlap, independent identities, cancellation, shared failure/retry, retirement and shutdown verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
