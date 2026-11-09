import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/active-object.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-active-object-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['active_stock.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'after +3: 3 units',
    'rejected: negative stock',
    'after +2: 5 units',
    'after close: rejected',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from concurrent.futures import Future,CancelledError,TimeoutError
from contextlib import contextmanager
from queue import Queue,Full,Empty
from threading import Event,Thread,Barrier,Lock,get_ident
from time import monotonic
import active_stock
from active_stock import ActiveStock


def fails(error,call):
    try:call()
    except error:return
    raise AssertionError("Expected "+error.__name__)


def await_true(condition):
    deadline=monotonic()+2
    while not condition():
        if monotonic()>=deadline:raise TimeoutError("Check did not progress")
        Event().wait(0.001)


def clean(stock):
    assert stock._thread.daemon is False and not stock._thread.is_alive()
    assert stock._queue.unfinished_tasks==0
    fails(Empty,stock._queue.get_nowait)


# Ordinary requests execute on a worker; exceptions reach their own futures and later work continues.
stock=ActiveStock()
try:
    assert stock.change(0).result(2)==0
    assert stock.change(3).result(2)==3
    bad=stock.change(-5);fails(ValueError,lambda:bad.result(2))
    assert str(bad.exception())=='negative stock'
    assert stock.change(0).result(2)==3
    assert stock.change(2).result(2)==5
    for invalid in [True,False,1.0,'1',None,[],float('inf')]:
        fails(ValueError,lambda:stock.change(invalid))
    assert stock.change(0).result(2)==5
finally:stock.close()
clean(stock);stock.close();clean(stock)
fails(RuntimeError,lambda:stock.change(1))

# Gate the actual Queue implementation's first get, not the published worker code.
# This gives deterministic queued cancellation, full admission and accepted FIFO tests.
@contextmanager
def gated():
    entered=Event();release=Event();worker_ids=[]
    class GatedQueue(Queue):
        def __init__(self,*args,**kwargs):
            super().__init__(*args,**kwargs);self.first=True
        def get(self,*args,**kwargs):
            worker_ids.append(get_ident())
            if self.first:
                self.first=False;entered.set()
                if not release.wait(3):raise TimeoutError('Test gate not released')
            return super().get(*args,**kwargs)
    old=active_stock.Queue;active_stock.Queue=GatedQueue
    try:stock=ActiveStock()
    finally:active_stock.Queue=old
    assert entered.wait(2)
    try:yield stock,release,worker_ids
    finally:
        release.set();stock.close()
    clean(stock)

with gated() as (stock,release,worker_ids):
    first=stock.change(3);second=stock.change(2)
    assert not first.done() and not second.done()
    fails(Full,lambda:stock.change(99))
    # Waiting alone does not execute or cancel work; timeout does not mutate the future.
    fails(TimeoutError,lambda:first.result(timeout=0))
    assert not first.cancelled() and not first.running()
    assert second.cancel() is True
    # Canceled work stays in its bounded queue place until the owner dequeues it.
    fails(Full,lambda:stock.change(99))
    release.set();assert first.result(2)==3
    fails(CancelledError,lambda:second.result(2))
    # Capacity may still be full until the owner dequeues the canceled request.
    await_true(lambda:stock._queue.unfinished_tasks==0)
    assert stock.change(0).result(2)==3
    assert worker_ids and all(i==stock._thread.ident for i in worker_ids)
    assert stock._thread.ident!=get_ident()

with gated() as (stock,release,worker_ids):
    first=stock.change(3);second=stock.change(-1)
    release.set()
    assert (first.result(2),second.result(2))==(3,2)
    assert stock.change(0).result(2)==2

# Gate Future's documented custom-executor transition after it is marked running.
# Once running, cancel cannot interrupt or roll back this request.
entered=Event();release=Event()
class RunningFuture(Future):
    def set_running_or_notify_cancel(self):
        running=super().set_running_or_notify_cancel()
        if running:
            entered.set()
            if not release.wait(3):raise TimeoutError('Running gate not released')
        return running
old=active_stock.Future;active_stock.Future=RunningFuture
stock=ActiveStock()
try:
    result=stock.change(4)
    assert entered.wait(2) and result.running()
    assert result.cancel() is False
    release.set();assert result.result(2)==4
finally:
    release.set();active_stock.Future=old;stock.close()
clean(stock)

# close marks admission closed before waiting for a full queue to accept its stop marker.
# Two concurrent close callers still produce one marker and join one drained worker.
with gated() as (stock,release,worker_ids):
    first=stock.change(1);second=stock.change(2)
    errors=[]
    def closing():
        try:stock.close()
        except Exception as error:errors.append(error)
    closers=[Thread(target=closing) for _ in range(2)]
    for thread in closers:thread.start()
    await_true(lambda:stock._closed)
    fails(RuntimeError,lambda:stock.change(100))
    assert not first.done() and not second.done()
    release.set()
    for thread in closers:
        thread.join(2);assert not thread.is_alive()
    assert errors==[] and (first.result(2),second.result(2))==(1,3)
    clean(stock)

# A future callback runs in this owner thread when attached before completion.
# Self-close is rejected before changing admission state; a nonblocking continuation can enqueue.
with gated() as (stock,release,worker_ids):
    callback_done=Event();seen=[];continuations=[]
    result=stock.change(2)
    def callback(future):
        try:
            seen.append(get_ident())
            fails(RuntimeError,stock.close)
            assert stock._closed is False
            continuations.append(stock.change(1))
        finally:callback_done.set()
    result.add_done_callback(callback)
    release.set();assert result.result(2)==2 and callback_done.wait(2)
    assert seen==[stock._thread.ident] and continuations[0].result(2)==3

# Four concurrent producers all use the actual proxy and bounded Full response.
# We verify serialization/results, not caller wall-clock ordering or fairness.
stock=ActiveStock();start=Barrier(5);values=[];errors=[];guard=Lock()
def producer():
    try:
        start.wait(timeout=2)
        for _ in range(25):
            deadline=monotonic()+3
            while True:
                try:result=stock.change(1);break
                except Full:
                    if monotonic()>=deadline:raise TimeoutError('Admission stalled')
                    Event().wait(0.001)
            value=result.result(2)
            with guard:values.append(value)
    except Exception as error:
        with guard:errors.append(error)
threads=[Thread(target=producer) for _ in range(4)]
try:
    for thread in threads:thread.start()
    start.wait(timeout=2)
    for thread in threads:
        thread.join(4);assert not thread.is_alive()
    assert errors==[] and sorted(values)==list(range(1,101))
    assert stock.change(0).result(2)==100
finally:stock.close()
clean(stock)

# Separate owners have independent quantities and distinct non-daemon workers.
left=ActiveStock();right=ActiveStock()
try:
    assert left.change(7).result(2)==7 and right.change(0).result(2)==0
    assert left._thread.ident!=right._thread.ident
finally:left.close();right.close()
clean(left);clean(right)
print('Active Object real-thread ownership, cancellation, admission, close-race, and cleanup checks passed')
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['active_stock.py', 'demo.py'],
    stdout: expected,
    verification:
      'Exact four-line demo output on real threads; FIFO stock updates and pre-mutation rejection preserve quantity while later work continues; integer inputs reject Boolean and invalid values; an instrumented real Queue gates the owner to verify asynchronous return, two waiting places, immediate Full, queued cancellation without early queue-space release, timeout without cancellation, and worker-only execution; a gated custom Future proves running cancellation fails and the request completes; two concurrent close callers mark admission closed before a full stop-marker insertion, reject later calls, drain accepted work and join with one marker; a worker completion callback cannot self-close but can enqueue a nonblocking continuation; four concurrent producers perform 100 real accepted updates with exact unique results 1–100 and final quantity 100, without assuming caller start order or fairness; separate owners have independent state and workers; repeated close is safe, non-daemon workers terminate, queue task bookkeeping returns to zero and queues are empty. Gates wrap real Queue/Future seams in tests and do not replace the article worker logic. No durable mailbox, restart supervision, forced interruption, guards, distributed actor-runtime semantics, external effects, cross-object transactions, or CPU-parallelism claim is inferred.',
  };
  const out = resolve(root, '.local/software-active-object');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
