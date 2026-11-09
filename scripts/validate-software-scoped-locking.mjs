import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/scoped-locking.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-scoped-locking-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['inventory.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'reserve 2: (3, 2)',
    'rejected: Insufficient stock',
    'after rejection: (3, 2)',
    'next caller: (0, 5)',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from contextlib import contextmanager
from threading import Lock,Thread,Event,Barrier,get_ident,enumerate as threads
import inventory
from inventory import Inventory


def fails(error,call):
    try:call()
    except error as caught:return caught
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


@contextmanager
def observed():
    locks=[]
    class TracedLock:
        def __init__(self):
            self.real=Lock();self.owner=None;self.acquired=0;self.released=0;self.exits=[]
            self.attempts=0;self.attempt_events=[Event() for _ in range(2000)]
            self.pause_enter=None;self.pause_exit=None;self.fail_enter=False;self.audit=None
            locks.append(self)
        def __enter__(self):
            # Entry-error injection happens before an acquisition, never after it.
            if self.fail_enter:raise InterruptedError('entry failed')
            index=self.attempts;self.attempts+=1;self.attempt_events[index].set()
            self.real.acquire()
            assert self.owner is None
            self.owner=get_ident();self.acquired+=1
            pause=self.pause_enter;self.pause_enter=None
            if pause:
                pause[0].set();assert pause[1].wait(3)
            return self
        def __exit__(self,kind,value,traceback):
            assert self.owner==get_ident() and self.real.locked()
            if self.audit:self.audit()
            self.exits.append(kind);self.released+=1;self.owner=None
            pause=self.pause_exit;self.pause_exit=None
            self.real.release()
            if pause:
                pause[0].set();assert pause[1].wait(3)
            return False
    old=inventory.Lock;inventory.Lock=TracedLock
    try:yield locks
    finally:inventory.Lock=old


def balanced(lock):
    assert lock.acquired==lock.released and lock.owner is None and not lock.real.locked()
    assert lock.real.acquire(blocking=False);lock.real.release()


baseline={t.ident for t in threads()}
with observed() as locks:
    for bad in [-1,True,1.5,'5',None]:fails(ValueError,lambda bad=bad:Inventory(bad))
    assert not locks
    stock=Inventory(5);lock=locks[0]
    assert {t.ident for t in threads()}==baseline
    before=lock.acquired
    for bad in [0,-1,True,1.5,'2',None]:fails(ValueError,lambda bad=bad:stock.reserve(bad))
    assert lock.acquired==before
    assert stock.reserve(2)==(3,2);balanced(lock)
    assert lock.exits[-1] is None
    error=fails(ValueError,lambda:stock.reserve(4))
    assert str(error)=='Insufficient stock' and lock.exits[-1] is ValueError
    balanced(lock);assert stock.snapshot()==(3,2)
    job=Job(lambda:stock.reserve(3));job.join()
    assert job.error is None and job.value==(0,5)
    assert stock.snapshot()==(0,5) and len(locks)==1
    fails(ValueError,lambda:stock.reserve(1));balanced(lock)
    empty=Inventory(0);assert empty.snapshot()==(0,0)
    fails(ValueError,lambda:empty.reserve(1));balanced(locks[1])

# Failed context entry does not run the body and does not perform an unmatched release.
with observed() as locks:
    stock=Inventory(5);lock=locks[0];lock.fail_enter=True
    fails(InterruptedError,lambda:stock.reserve(2))
    assert stock._state==(5,0) and lock.acquired==lock.released==0
    lock.fail_enter=False;assert stock.reserve(2)==(3,2);balanced(lock)

# A real held lock prevents another caller from reaching its state check or publication.
with observed() as locks:
    stock=Inventory(2);lock=locks[0];entered=Event();release=Event()
    lock.pause_enter=(entered,release)
    first=Job(lambda:stock.reserve(1));assert entered.wait(3)
    second=Job(lambda:stock.reserve(1))
    try:
        assert lock.attempt_events[1].wait(3)
        assert stock._state==(2,0) and lock.acquired==1 and not second.done.is_set()
        assert not lock.real.acquire(blocking=False)
        release.set();first.join();second.join()
        assert first.error is second.error is None
        assert first.value==(1,1) and second.value==(0,2)
        assert stock.snapshot()==(0,2);balanced(lock)
    finally:release.set();first.join();second.join()

# Return-value delivery waits for __exit__; another caller can acquire after actual release.
with observed() as locks:
    stock=Inventory(5);lock=locks[0];released=Event();finish_exit=Event()
    lock.pause_exit=(released,finish_exit)
    returning=Job(lambda:stock.reserve(2))
    try:
        assert released.wait(3) and not returning.done.is_set()
        observer=Job(stock.snapshot);observer.join()
        assert observer.error is None and observer.value==(3,2)
        assert not returning.done.is_set()
        finish_exit.set();returning.join()
        assert returning.error is None and returning.value==(3,2);balanced(lock)
    finally:finish_exit.set();returning.join()

# Fault injection before/after immutable publication illustrates release versus rollback.
class Abort(BaseException):pass
for after in [False,True]:
    for kind in [RuntimeError,Abort]:
        class Faulty(Inventory):
            armed=False
            def __getattribute__(self,name):
                if name=='_state' and not after and object.__getattribute__(self,'armed'):
                    object.__setattr__(self,'armed',False);raise kind('before publication')
                return object.__getattribute__(self,name)
            def __setattr__(self,name,value):
                object.__setattr__(self,name,value)
                if name=='_state' and after and self.armed:
                    object.__setattr__(self,'armed',False);raise kind('after publication')
        with observed() as locks:
            stock=Faulty(5);lock=locks[0];stock.armed=True
            fails(kind,lambda:stock.reserve(2));balanced(lock)
            assert lock.exits[-1] is kind
            assert stock.snapshot()==((3,2) if after else (5,0))
            # The after-publication failure leaves changed state, still coherent.
            state=stock.reserve(1);assert state==((2,3) if after else (4,1))
            balanced(lock)

# One complete immutable pair is published; invariants hold at every release.
with observed() as locks:
    stock=Inventory(120);lock=locks[0];success=[];failure=[];records=Lock();start=Barrier(5)
    def audit():
        available,reserved=stock._state
        assert type(stock._state) is tuple and type(available) is type(reserved) is int
        assert available>=0 and reserved>=0 and available+reserved==120
    lock.audit=audit
    def producer():
        start.wait(3)
        for _ in range(60):
            try:
                result=stock.reserve(1)
                with records:success.append(result)
            except ValueError as error:
                with records:failure.append(str(error))
            available,reserved=stock.snapshot()
            assert available+reserved==120 and min(available,reserved)>=0
    def reader():
        start.wait(3)
        for _ in range(200):
            available,reserved=stock.snapshot()
            assert available+reserved==120 and min(available,reserved)>=0
    callers=[Job(producer) for _ in range(4)]+[Job(reader)]
    for caller in callers:caller.join();assert caller.error is None
    assert len(success)==len(failure)==120
    assert sorted(success,key=lambda pair:pair[1])==[(120-i,i) for i in range(1,121)]
    assert set(failure)=={'Insufficient stock'}
    assert stock.snapshot()==(0,120) and len(locks)==1;balanced(lock)

# Independent objects do not share one global lock, and a primitive lock is not recursive.
with observed() as locks:
    a,b=Inventory(1),Inventory(2)
    assert a._lock is not b._lock
    with a._lock:
        assert not a._lock.real.acquire(blocking=False)
        assert b.reserve(1)==(1,1) and b.snapshot()==(1,1)
    assert a.snapshot()==(1,0)
    for lock in locks:balanced(lock)
assert {t.ident for t in threads()}==baseline
print('Scoped Locking: real exclusion, matched exits, exceptions, publication, contention and cleanup passed.')
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-scoped-locking');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['inventory.py', 'demo.py'],
        stdout: expected,
        verification:
          'Exact four-line demo output; invalid initial/request counts reject Boolean and malformed values before acquisition; zero stock, exact exhaustion and insufficient-stock boundaries preserve coherent state; one persistent real Lock per object and no object-created worker; real lock instrumentation verifies exactly paired entry/exit on return, snapshot, rejection and propagated ordinary/BaseException failures; failed-entry injection performs no body or unmatched release; a gated acquisition blocks a competing caller before check/publication; a gated post-release exit permits another caller to snapshot before the original return is delivered; faults before publication leave old state while faults after publication preserve changed coherent state, proving release is not rollback; four actual reservers make 240 attempts with exactly 120 unique successful states and 120 rejections while an additional reader observes 200 snapshots, with invariant checks at every release and no overlapping protected ownership; locks are independent between instances, a nonblocking recursive acquisition probe fails, every lock is available afterward, all caller threads join and thread inventory returns to baseline. Instrumentation wraps actual Lock and attribute-access seams without replacing article reservation/snapshot methods. No fairness, automatic rollback, general deadlock avoidance, acquisition deadline, async-task or cross-process guarantee is inferred.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
