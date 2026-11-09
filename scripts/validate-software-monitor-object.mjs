import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/monitor-object.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-monitor-object-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['monitor_inbox.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = ["received: [b'red', b'blue']", 'after close: rejected', 'drained: closed'];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from collections import deque,Counter
from contextlib import contextmanager
from threading import Condition,Event,Thread,Lock,get_ident,enumerate as threads
from monitor_inbox import MonitorInbox,Closed
import monitor_inbox


def fails(error,call):
    try:call()
    except error:return
    raise AssertionError('Expected '+error.__name__)


class Job:
    def __init__(self,call):
        self.done=Event();self.value=None;self.error=None;self.ident=None
        def run():
            self.ident=get_ident()
            try:self.value=call()
            except Exception as error:self.error=error
            finally:self.done.set()
        self.thread=Thread(target=run,daemon=False);self.thread.start()
    def join(self):
        self.thread.join(3)
        assert not self.thread.is_alive() and self.done.is_set()


@contextmanager
def observed(capacity=1):
    class TracedCondition(Condition):
        def __init__(self,*args,**kwargs):
            super().__init__(*args,**kwargs)
            self.wait_events=[Event() for _ in range(32)]
            self.wait_count=0;self.waiting_threads=set();self.return_threads=[]
        def wait(self,timeout=None):
            assert self._lock.locked()
            index=self.wait_count;self.wait_count+=1
            self.waiting_threads.add(get_ident())
            if index<len(self.wait_events):self.wait_events[index].set()
            result=super().wait(timeout)
            assert self._lock.locked()
            self.return_threads.append(get_ident())
            return result
    original=monitor_inbox.Condition;monitor_inbox.Condition=TracedCondition
    try:box=MonitorInbox(capacity)
    finally:monitor_inbox.Condition=original
    jobs=[]
    def spawn(call):
        job=Job(call);jobs.append(job);return job
    try:yield box,box._changed,spawn
    finally:
        box.close()
        for job in jobs:job.join()


# No worker belongs to a monitor; a caller executes methods directly.
before={t.ident for t in threads()};box=MonitorInbox(2)
assert {t.ident for t in threads()}==before and not hasattr(box,'_thread')
for data in [b'',b'12345678',bytes([0,255])]:
    box.put(data);assert box.get()==data
box.put(b'a');box.put(b'b');box.close();box.close()
assert box.get()==b'a' and box.get()==b'b'
fails(Closed,box.get);fails(Closed,lambda:box.put(b'late'))

# Invalid input does not mutate protected state or create background workers.
for capacity in [0,-1,True,False,1.0,'2',None]:
    fails(ValueError,lambda:MonitorInbox(capacity))
box=MonitorInbox(1);box.put(b'seed')
for data in [b'123456789',bytearray(b'x'),'x',None,1,False,[]]:
    fails(ValueError,lambda:box.put(data))
    with box._changed:assert tuple(box._items)==(b'seed',) and not box._closed
assert box.get()==b'seed';box.close()

# An empty get waits, atomically releasing the actual monitor lock.
# A notification without an item causes the same caller to loop and wait again.
with observed() as (box,condition,spawn):
    getter=spawn(box.get)
    assert condition.wait_events[0].wait(2)
    with condition:
        assert not getter.done.is_set()
        # A plain Lock is not recursively acquirable.
        assert condition._lock.acquire(blocking=False) is False
        condition.notify_all()
        # Notification has not transferred this still-held lock to the waiter.
        assert not getter.done.is_set()
    assert condition.wait_events[1].wait(2)
    assert not getter.done.is_set()
    box.put(b'one');getter.join()
    assert getter.error is None and getter.value==b'one'
    assert condition.waiting_threads=={getter.ident}
    assert getter.ident in condition.return_threads

# A full put likewise loops after an irrelevant notification, then progresses when space exists.
with observed() as (box,condition,spawn):
    box.put(b'first');putter=spawn(lambda:box.put(b'next'))
    assert condition.wait_events[0].wait(2)
    with condition:
        condition.notify_all();assert not putter.done.is_set()
    assert condition.wait_events[1].wait(2)
    assert box.get()==b'first'
    putter.join();assert putter.error is None and putter.value is None
    assert box.get()==b'next'

# State, not a stored notification token, makes a later consumer able to proceed.
box=MonitorInbox(1);box.put(b'early')
assert box.get()==b'early';box.close()

# Closing wakes all empty consumers, not just one.
with observed() as (box,condition,spawn):
    getters=[spawn(box.get) for _ in range(3)]
    assert condition.wait_events[2].wait(2)
    box.close()
    for job in getters:
        job.join();assert isinstance(job.error,Closed)
    with condition:assert not box._items and box._closed

# Closing wakes all full-buffer producers and none inserts after closure.
# The previously accepted item remains available and drains normally.
with observed() as (box,condition,spawn):
    box.put(b'seed')
    putters=[spawn(lambda i=i:box.put(bytes([i]))) for i in range(3)]
    assert condition.wait_events[2].wait(2)
    box.close()
    for job in putters:
        job.join();assert isinstance(job.error,Closed)
    assert box.get()==b'seed';fails(Closed,box.get)

# Close/data races preserve exactly the result accepted before the close boundary.
for _ in range(12):
    with observed() as (box,condition,spawn):
        getter=spawn(box.get);assert condition.wait_events[0].wait(2)
        putter=spawn(lambda:box.put(b'x'));closer=spawn(box.close)
        putter.join();closer.join();getter.join()
        if putter.error is None:
            assert getter.error is None and getter.value==b'x'
        else:
            assert isinstance(putter.error,Closed) and isinstance(getter.error,Closed)
        fails(Closed,box.get)

# Instrument the actual deque, leaving the article's methods and real Condition/Lock intact.
# This captures FIFO at the protected removal boundary, not later consumer processing order.
class RecordedDeque(deque):
    def __init__(self):
        super().__init__();self.condition=None;self.capacity=None
        self.accepted=[];self.removed=[];self.peak=0;self.active=0;self.callers=set()
    def enter(self):
        assert self.condition._lock.locked()
        self.active+=1;assert self.active==1
        self.callers.add(get_ident())
        Event().wait(0.0001)
    def append(self,item):
        self.enter()
        try:
            super().append(item);self.accepted.append(item)
            self.peak=max(self.peak,len(self));assert len(self)<=self.capacity
        finally:self.active-=1
    def popleft(self):
        self.enter()
        try:
            item=super().popleft();self.removed.append(item);return item
        finally:self.active-=1

for capacity in [1,2]:
    recorded=RecordedDeque();original=monitor_inbox.deque
    monitor_inbox.deque=lambda:recorded
    try:box=MonitorInbox(capacity)
    finally:monitor_inbox.deque=original
    recorded.condition=box._changed;recorded.capacity=capacity
    received=[];received_lock=Lock()
    def consume():
        try:
            while True:
                item=box.get()
                with received_lock:received.append(item)
        except Closed:return
    def produce(index):
        for n in range(30):box.put(str(index).encode()+b':'+str(n).encode())
    consumers=[Job(consume) for _ in range(3)]
    producers=[Job(lambda i=i:produce(i)) for i in range(3)]
    try:
        for job in producers:job.join()
        assert all(job.error is None for job in producers)
        box.close()
        for job in consumers:job.join()
        assert all(job.error is None for job in consumers)
        expected=[str(i).encode()+b':'+str(n).encode() for i in range(3) for n in range(30)]
        assert Counter(received)==Counter(expected) and len(received)==90
        assert recorded.accepted==recorded.removed
        assert 0<recorded.peak<=capacity and recorded.active==0 and not recorded
        assert recorded.callers.issubset({j.ident for j in producers+consumers})
        assert get_ident() not in recorded.callers
    finally:
        box.close()
        for job in producers+consumers:job.join()

# Separate monitors share neither protected data, closure state, nor locks.
left=MonitorInbox(1);right=MonitorInbox(1)
left.put(b'left');right.put(b'right');left.close()
assert left._changed._lock is not right._changed._lock
assert left.get()==b'left' and right.get()==b'right'
right.put(b'open');right.close();assert right.get()==b'open'
fails(Closed,left.get);fails(Closed,right.get)
assert {t.ident for t in threads()}==before
print('Monitor Object real wait/notify, predicate, closure, FIFO, and 180-item concurrency checks passed')
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['monitor_inbox.py', 'demo.py'],
    stdout: expected,
    verification:
      'Exact three-line demo output; the monitor creates no worker and methods execute on real caller threads; positive integer capacities reject Boolean/invalid values, immutable 0/8-byte and binary payloads pass, and invalid items leave protected state unchanged; actual Condition instrumentation proves waiting releases the shared lock, notification while holding it does not transfer ownership, wait returns with the lock reacquired, and extra notifications cause both empty-get and full-put while loops to wait again; space creation unblocks a producer, and preexisting data works without a stored notification; closure wakes all three blocked consumers and all three blocked producers, rejects late puts and preserves accepted buffered data for FIFO drain; twelve close/put races preserve exactly accepted data; three producers and three consumers transfer 90 distinct items at each of capacities one and two, with actual deque instrumentation proving protected mutations, no overlapping mutation, exact accepted/removal FIFO order, capacity bounds, and caller-thread execution without assuming processing order or fairness; repeated close, independent monitors, final empty buffers and all caller-thread joins are verified. Instrumentation wraps real Condition/deque seams and leaves the article methods intact. No deadlines, cancellation, durable delivery, acknowledgment, general rollback, cross-monitor atomicity, or recovery after consumer failure is inferred.',
  };
  const out = resolve(root, '.local/software-monitor-object');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
