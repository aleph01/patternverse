import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/thread-pool.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-thread-pool-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['file_pool.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = ['0 3 bytes', '1 4 bytes', '2 error ValueError', '3 error FileNotFoundError'];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor,wait as real_wait,TimeoutError
from threading import Thread,Event,Barrier,Lock,get_ident,enumerate as threads
from pathlib import Path,PurePath
from tempfile import TemporaryDirectory
import file_pool


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
def observed(window):
    pools=[];opened=[];reads=[];state_lock=Lock()
    class TracedPool(ThreadPoolExecutor):
        def __init__(self,*args,**kwargs):
            assert kwargs['max_workers']==2
            super().__init__(*args,**kwargs)
            self.submitted=[];self.collected=set();self.raw_results={};self.uncollected=set()
            self.active=0;self.peak=0;self.maximum_window=0;self.calls=[];self.collection_order=[];self.owner_ident=get_ident()
            self.submit_events=[Event() for _ in range(1000)]
            self.shutdown_entered=Event();self.wait_entered=Event();pools.append(self)
        def submit(self,fn,*args,**kwargs):
            with state_lock:assert len(self.uncollected)<window
            def execute():
                with state_lock:
                    self.active+=1;self.peak=max(self.peak,self.active)
                    assert self.active<=2
                    self.calls.append((args[0],get_ident()))
                try:return fn(*args,**kwargs)
                finally:
                    with state_lock:self.active-=1
            future=super().submit(execute)
            with state_lock:
                index=len(self.submitted);self.submitted.append(future)
                self.uncollected.add(future);self.maximum_window=max(self.maximum_window,len(self.uncollected))
                assert len(self.uncollected)<=window
            raw=future.result;self.raw_results[future]=raw
            def result(*args,**kwargs):
                try:return raw(*args,**kwargs)
                finally:
                    with state_lock:
                        assert future.done()
                        if future not in self.collected:self.collection_order.append(index)
                        self.collected.add(future);self.uncollected.discard(future)
            future.result=result
            self.submit_events[index].set()
            return future
        def shutdown(self,*args,**kwargs):
            self.shutdown_entered.set();return super().shutdown(*args,**kwargs)
    oldpool,oldopen,oldwait=file_pool.ThreadPoolExecutor,Path.open,file_pool.wait
    class Reader:
        def __init__(self,stream):self.stream=stream
        def __enter__(self):self.stream.__enter__();return self
        def read(self,size):
            assert size==9
            data=self.stream.read(size)
            with state_lock:reads.append((size,len(data)))
            return data
        def __exit__(self,*args):return self.stream.__exit__(*args)
    def tracked_open(path,*args,**kwargs):
        stream=oldopen(path,*args,**kwargs)
        if args and args[0]=='rb':
            with state_lock:opened.append(stream)
            return Reader(stream)
        return stream
    def tracked_wait(futures,*args,**kwargs):
        assert len(futures)<=window and kwargs['return_when']==file_pool.FIRST_COMPLETED
        pools[0].wait_entered.set()
        return oldwait(futures,*args,**kwargs)
    file_pool.ThreadPoolExecutor,Path.open,file_pool.wait=TracedPool,tracked_open,tracked_wait
    try:yield pools,opened,reads
    finally:file_pool.ThreadPoolExecutor,Path.open,file_pool.wait=oldpool,oldopen,oldwait


def cleaned(pools,opened,records,normal=True):
    assert len(pools)==1
    pool=pools[0]
    assert pool.active==0 and pool.shutdown_entered.is_set()
    assert all(f.done() for f in pool.submitted)
    assert all(not t.is_alive() for t in pool._threads)
    assert all(stream.closed for stream in opened)
    fails(RuntimeError,lambda:ThreadPoolExecutor.submit(pool,lambda:0))
    assert all(ident!=pool.owner_ident for _,ident in pool.calls)
    if normal:
        assert len(pool.submitted)==len(pool.collected)==len(records)
        assert not pool.uncollected
    return pool


baseline={t.ident for t in threads()}
with TemporaryDirectory() as directory:
    root=Path(directory)
    for name,size in [('empty',0),('eight',8),('nine',9),('large',10000)]+[(str(i),i%9) for i in range(8)]:
        (root/name).write_bytes(b'x'*size)
    # Structural rejection must not allocate an executor or open a file.
    with observed(4) as (pools,opened,reads):
        for bad in [[],None,('file',),(PurePath('file'),),(None,)]:
            fails(ValueError,lambda bad=bad:file_pool.inspect_files(bad))
        for bad in [0,-1,True,1.5,'4',None]:
            fails(ValueError,lambda bad=bad:file_pool.inspect_files((),window=bad))
        assert not pools and not opened
    cases=[((),[]),((root/'empty',root/'eight',root/'nine',root/'large',root/'missing',root),[(0,'ok',0),(1,'ok',8),(2,'error','ValueError'),(3,'error','ValueError'),(4,'error','FileNotFoundError'),(5,'error','IsADirectoryError')])]
    for records,expected in cases:
        with observed(4) as (pools,opened,reads):
            assert file_pool.inspect_files(records)==expected
            cleaned(pools,opened,records)
            assert all(size==9 and length<=9 for size,length in reads)
    # Two waves must use the same pair of real worker threads; four slots fill.
    original=file_pool.read_size;first=Barrier(2);second=Barrier(2);entered=Event();release=Event()
    def gated(path):
        n=int(path.name)
        if n<2:
            first.wait(3);entered.set();assert release.wait(3)
        elif n<4:second.wait(3)
        return original(path)
    with observed(4) as (pools,opened,reads):
        file_pool.read_size=gated
        try:
            records=tuple(root/str(i) for i in range(8));job=Job(lambda:file_pool.inspect_files(records))
            assert entered.wait(3);pool=pools[0]
            assert pool.submit_events[3].wait(3) and pool.wait_entered.wait(3)
            assert len(pool.submitted)==4 and len(pool.uncollected)==4 and pool.active==2
            assert not job.done.is_set()
            running=[f for f in pool.submitted if f.running()]
            assert len(running)==2 and all(not f.cancel() for f in running)
            fails(TimeoutError,lambda:pool.raw_results[running[0]](timeout=0))
            assert not running[0].done() and not running[0].cancelled()
            release.set();assert job.join()==[(i,'ok',i%9) for i in range(8)]
            cleaned(pools,opened,records)
            early={ident for path,ident in pool.calls if int(path.name)<2}
            later={ident for path,ident in pool.calls if 2<=int(path.name)<4}
            assert len(early)==2 and early==later and pool.peak==2
        finally:release.set();file_pool.read_size=original
    # Finished futures continue occupying the window until coordinator collection.
    with observed(4) as (pools,opened,reads):
        entered=Event();release=Event();oldwait=file_pool.wait
        def paused_wait(futures,*args,**kwargs):
            entered.set();assert release.wait(3);return oldwait(futures,*args,**kwargs)
        file_pool.wait=paused_wait
        try:
            records=tuple(root/str(i) for i in range(8));job=Job(lambda:file_pool.inspect_files(records))
            assert entered.wait(3);pool=pools[0]
            done,pending=real_wait(pool.submitted,timeout=3)
            assert len(done)==4 and not pending and len(pool.uncollected)==4
            assert len(pool.submitted)==4 and not pool.collected and not job.done.is_set()
            release.set();assert len(job.join())==8
            cleaned(pools,opened,records)
        finally:release.set();file_pool.wait=oldwait
    # One slow early job must not prevent later completions from refilling a slot.
    entered=Event();release=Event()
    def slow_first(path):
        if path.name=='0':entered.set();assert release.wait(3)
        return original(path)
    with observed(2) as (pools,opened,reads):
        file_pool.read_size=slow_first
        try:
            records=tuple(root/str(i) for i in range(4));job=Job(lambda:file_pool.inspect_files(records,window=2))
            assert entered.wait(3);pool=pools[0];assert pool.submit_events[2].wait(3)
            assert 1 in pool.collection_order and 0 not in pool.collection_order
            assert not job.done.is_set()
            release.set();assert job.join()==[(i,'ok',i) for i in range(4)]
            cleaned(pools,opened,records)
        finally:release.set();file_pool.read_size=original
    # Unexpected coordinator failure still waits for active work and closes handles.
    entered=Event();release=Event()
    def held(path):entered.set();assert release.wait(3);return original(path)
    with observed(1) as (pools,opened,reads):
        file_pool.read_size=held;oldwait=file_pool.wait
        def fail_wait(*args,**kwargs):raise RuntimeError('coordinator failed')
        file_pool.wait=fail_wait
        try:
            records=(root/'eight',);job=Job(lambda:file_pool.inspect_files(records,window=1))
            assert entered.wait(3);pool=pools[0];assert pool.shutdown_entered.wait(3)
            assert not job.done.is_set()
            release.set();fails(RuntimeError,job.join)
            assert str(job.error)=='coordinator failed'
            cleaned(pools,opened,records,normal=False)
        finally:release.set();file_pool.read_size=original;file_pool.wait=oldwait
    # Boundaries 1,2,4,7: each submitted file has exactly one indexed outcome.
    records=tuple(root/str(i%8) for i in range(64))
    for window in [1,2,4,7]:
        with observed(window) as (pools,opened,reads):
            assert file_pool.inspect_files(records,window=window)==[(i,'ok',i%8) for i in range(64)]
            pool=cleaned(pools,opened,records)
            assert pool.maximum_window<=window and pool.peak<=min(2,window)
            assert len(pool.calls)==len(records) and len(opened)==len(records)
            if window==1:assert len({ident for _,ident in pool.calls})==1
assert {t.ident for t in threads()}==baseline
assert not root.exists()
print('Thread Pool: real worker reuse, concurrency/window bounds, futures, file limits, cleanup and shutdown passed.')
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-thread-pool');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['file_pool.py', 'demo.py'],
        stdout: expected,
        verification:
          'Exact four-line demo output on real filesystem I/O; input/window shape errors precede executor or file allocation; empty batch and 0/8/9/10000-byte files verify bounded nine-byte reads, oversized rejection and closed handles; missing/directory paths become FileNotFoundError/IsADirectoryError outcomes; real ThreadPoolExecutor instrumentation gates two waves and proves the same two worker identities are reused, at most two tasks execute, exactly four submitted-uncollected slots fill, and task code runs outside the coordinator; running cancellation fails and zero-time result wait does not cancel or finish running work; completed but uncollected futures retain all four slots while the coordinator is paused; an early held job does not block collection of a later result or refill through FIRST_COMPLETED, and final report remains index-sorted; unexpected coordinator failure enters shutdown and waits for held work before propagating, with handles closed and real workers joined; 256 further indexed file inspections across windows 1/2/4/7 verify admission bounds, worker ceilings, exact outcomes, one-thread reuse at window one, and no loss; post-shutdown submission rejects, temporary files are removed only after all owned handles/workers finish, and thread inventory returns to baseline. Instrumentation wraps actual executor, wait, file-open and task seams without replacing article scheduling. No benchmark, forced interruption, general resource-failure recovery, deadline, durable delivery or CPU speedup guarantee is inferred.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
