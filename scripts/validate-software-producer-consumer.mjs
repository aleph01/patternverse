import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/producer-consumer.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-producer-consumer-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['readings.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = ['0 ok 7', '1 error expected ASCII digits', '2 ok 11', '3 ok 0'];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from contextlib import contextmanager
from queue import Queue,Full
from threading import Thread,Event,Lock,get_ident,enumerate as threads
from collections import Counter
import readings


def fails(error,call):
    try:call()
    except error:return
    raise AssertionError('Expected '+error.__name__)


class Job:
    def __init__(self,call):
        self.value=None;self.error=None;self.done=Event()
        def run():
            try:self.value=call()
            except BaseException as error:self.error=error
            finally:self.done.set()
        self.thread=Thread(target=run,daemon=False);self.thread.start()
    def join(self):
        self.thread.join(4)
        assert self.done.is_set() and not self.thread.is_alive()
        if self.error:raise self.error
        return self.value


@contextmanager
def observed():
    queues=[];workers=[]
    class TracedQueue(Queue):
        def __init__(self,*args,**kwargs):
            super().__init__(*args,**kwargs);self.added=[];self.taken=[];self.ack=[]
            self.held={};self.put_attempts=[];self.attempt_events=[Event() for _ in range(1000)]
            self.outcome_events=[Event() for _ in range(1000)];self.join_called=Event()
            queues.append(self)
        def put(self,item,*args,**kwargs):
            # Only the single real producer writes the bounded pending queue.
            if self.maxsize:
                index=len(self.put_attempts);self.put_attempts.append(item);self.attempt_events[index].set()
            super().put(item,*args,**kwargs)
            if not self.maxsize and isinstance(item,tuple):self.outcome_events[item[0]].set()
        def _put(self,item):
            assert self.mutex.locked()
            super()._put(item);self.added.append(item)
            assert not self.maxsize or len(self.queue)<=self.maxsize
        def _get(self):
            assert self.mutex.locked()
            item=super()._get();self.taken.append(item)
            if self.maxsize:
                assert get_ident() not in self.held
                self.held[get_ident()]=item
            return item
        def task_done(self):
            with self.mutex:
                assert get_ident() in self.held
                self.ack.append(self.held.pop(get_ident()))
            super().task_done()
        def join(self):
            self.join_called.set();return super().join()
    class TracedThread(Thread):
        def __init__(self,*args,**kwargs):
            super().__init__(*args,**kwargs);workers.append(self)
    oldq,oldt=readings.Queue,readings.Thread
    readings.Queue,readings.Thread=TracedQueue,TracedThread
    try:yield queues,workers
    finally:readings.Queue,readings.Thread=oldq,oldt


def verify_queues(queues,workers,records,result):
    pending,outcomes=queues
    assert pending.maxsize>0 and outcomes.maxsize==0
    assert pending.added[:len(records)]==list(enumerate(records))
    stops=pending.added[len(records):]
    assert len(stops)==len(workers) and all(x is stops[0] for x in stops)
    assert not isinstance(stops[0],tuple)
    assert pending.taken==pending.added
    assert Counter(map(id,pending.ack))==Counter(map(id,pending.added))
    assert len(pending.ack)==len(records)+len(workers)
    assert pending.unfinished_tasks==0 and not pending.held and pending.empty()
    assert outcomes.empty() and len(outcomes.added)==len(records)
    assert sorted(x[0] for x in outcomes.added)==list(range(len(records)))
    assert len(result)==len(records) and all(not t.is_alive() and not t.daemon for t in workers)


baseline={t.ident for t in threads()}
# Every structural failure precedes worker creation and queue allocation.
with observed() as (queues,workers):
    for bad in [[],None,b'7',(bytearray(b'7'),),('7',),(b'123456789',),(None,)]:
        fails(ValueError,lambda bad=bad:readings.parse_readings(bad))
    for bad in [0,-1,True,1.5,'2',None]:
        fails(ValueError,lambda bad=bad:readings.parse_readings((),workers=bad))
        fails(ValueError,lambda bad=bad:readings.parse_readings((),capacity=bad))
    assert not queues and not workers

# Empty batches, boundary values, malformed content and later success all drain.
for records,expected in [
    ((),[]),
    ((b'0',b'100',b'00000000'),[(0,'ok',0),(1,'ok',100),(2,'ok',0)]),
    ((b'',b'-1',b'101',b' 7',b'bad',b'7'),[(0,'error','expected ASCII digits'),(1,'error','expected ASCII digits'),(2,'error','outside 0..100 units'),(3,'error','expected ASCII digits'),(4,'error','expected ASCII digits'),(5,'ok',7)]),
]:
    with observed() as (queues,workers):
        result=readings.parse_readings(records,workers=3,capacity=1)
        assert result==expected
        verify_queues(queues,workers,records,result)

# A real worker holds the first job outside the queue while one waiting place fills.
original=readings.decode_record;entered=Event();release=Event();execution=[]
def gated(payload):
    execution.append(get_ident())
    if payload==b'7':
        entered.set();assert release.wait(3)
    return original(payload)
with observed() as (queues,workers):
    readings.decode_record=gated
    try:
        records=(b'7',b'8',b'9');job=Job(lambda:readings.parse_readings(records,workers=1,capacity=1))
        assert entered.wait(3)
        pending=queues[0];assert pending.attempt_events[2].wait(3)
        with pending.mutex:
            assert list(pending.queue)==[(1,b'8')] and len(pending.added)==2
            assert len(pending.taken)==1 and len(pending.held)==1
        assert not job.done.is_set()
        fails(Full,lambda:pending.put_nowait((99,b'0')))
        release.set();result=job.join()
        assert result==[(0,'ok',7),(1,'ok',8),(2,'ok',9)]
        assert execution and set(execution)=={workers[0].ident}
        verify_queues(queues,workers,records,result)
    finally:release.set();readings.decode_record=original

# The second worker completes later-indexed entries while the first remains active.
entered=Event();release=Event()
def out_of_order(payload):
    if payload==b'7':
        entered.set();assert release.wait(3)
    return original(payload)
with observed() as (queues,workers):
    readings.decode_record=out_of_order
    try:
        records=(b'7',b'11',b'bad');job=Job(lambda:readings.parse_readings(records,workers=2,capacity=1))
        assert entered.wait(3);pending,outcomes=queues
        assert outcomes.outcome_events[2].wait(3) and pending.join_called.wait(3)
        assert not job.done.is_set() and not outcomes.outcome_events[0].is_set()
        with outcomes.mutex:assert [x[0] for x in outcomes.queue]==[1,2]
        release.set();result=job.join()
        assert [x[0] for x in outcomes.added]==[1,2,0]
        assert result==[(0,'ok',7),(1,'ok',11),(2,'error','expected ASCII digits')]
        verify_queues(queues,workers,records,result)
    finally:release.set();readings.decode_record=original

# More jobs than queue places, several real consumers, exact per-index results.
for count,capacity in [(1,1),(2,1),(4,2)]:
    records=tuple(str(i%101).encode('ascii') for i in range(120))
    with observed() as (queues,workers):
        result=readings.parse_readings(records,workers=count,capacity=capacity)
        assert result==[(i,'ok',i%101) for i in range(120)]
        verify_queues(queues,workers,records,result)
assert {t.ident for t in threads()}==baseline
print('Producer-Consumer: real capacity, out-of-order outcomes, failures, sentinels, accounting and joins passed.')
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-producer-consumer');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['readings.py', 'demo.py'],
        stdout: expected,
        verification:
          'Exact four-line demo output; all structural input errors precede queue/thread creation; empty batch, zero/100-unit boundaries, eight-byte leading-zero input, empty/signed/space/nonnumeric and over-range records with later successful processing; real Queue/Thread seams prove a producer blocks with one queued and one executing job, removal frees capacity before completion, full nonblocking admission rejects without adding data, consumer-only processing, and a second consumer records later-indexed success and rejection while the first is gated; reporting is sorted despite verified completion order 1,2,0; all accepted entries are removed FIFO, every data/error/identity stop is accounted exactly once, one stop per worker follows all data, queue join waits for handled work, and all non-daemon consumer threads terminate and join; 360 indexed records pass across 1/2/4 consumers and capacities 1/2, with bounded waiting counts, no loss or duplicate outcomes, final empty buffers and baseline thread cleanup. Instrumentation wraps real queue/thread/decode seams without replacing article coordination. No success guarantee for failed readings, deadline, unexpected-worker-death recovery, durable delivery, cancellation or CPU speedup is inferred.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
