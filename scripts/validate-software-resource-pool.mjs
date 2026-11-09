import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/resource-pool.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-resource-pool-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['buffer_pool.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'job failed; returned',
    'reset: 0000000000000000',
    'old borrow: rejected',
    'active borrow: ok',
    'new borrow: rejected',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from contextlib import contextmanager
from threading import Condition,Thread,Event,Lock,Barrier,enumerate as threads
import buffer_pool
from buffer_pool import BufferPool,PoolClosed


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
def observed(size=1,gate_reset=False):
    created=[];started=Event();release=Event();state={'armed':False,'target':None,'outside_lock':None}
    class TracedCondition(Condition):
        def __init__(self):
            super().__init__();self.entries=[Event() for _ in range(64)];self.count=0
        def wait(self,timeout=None):
            index=self.count;self.count+=1
            assert self._is_owned()
            if index<len(self.entries):self.entries[index].set()
            result=super().wait(timeout)
            assert self._is_owned()
            return result
    class TracedBuffer(bytearray):
        def __init__(self,*args,**kwargs):
            super().__init__(*args,**kwargs);created.append(self)
        def __setitem__(self,key,value):
            if gate_reset and state['armed'] and self is state['target'] and value==bytes(8):
                state['outside_lock']=not pool._changed._is_owned()
                started.set();assert release.wait(3)
            return super().__setitem__(key,value)
    oldcondition=buffer_pool.Condition
    buffer_pool.Condition=TracedCondition;buffer_pool.bytearray=TracedBuffer
    try:
        pool=BufferPool(size=size)
        yield pool,created,state,started,release
    finally:
        release.set();pool.close()
        buffer_pool.Condition=oldcondition;del buffer_pool.bytearray


def read_once(pool):
    with pool.borrow() as handle:return handle.read(),id(handle._buffer),handle


baseline={t.ident for t in threads()}
for bad in [0,-1,True,1.5,'2',None]:fails(ValueError,lambda bad=bad:BufferPool(bad))
with observed(1) as (pool,created,state,started,release):
    assert len(created)==1 and len(created[0])==8 and bytes(created[0])==bytes(8)
    assert {t.ident for t in threads()}==baseline
    with pool.borrow() as old:
        backing=old._buffer
        for payload in [b'',b'12345678',bytes([0,255])]:
            old.write(payload);assert old.read()==payload.ljust(8,b'\\0')
        saved=old.read()
        for bad in [bytearray(b'x'),memoryview(b'x'),'text',None,b'123456789']:
            fails(ValueError,lambda bad=bad:old.write(bad));assert old.read()==saved
    assert old._buffer is None and bytes(backing)==bytes(8)
    for operation in [old.read,lambda:old.write(b'new'),lambda:old.write(None)]:fails(RuntimeError,operation)
    with pool.borrow() as current:
        assert current is not old and current._buffer is backing and current.read()==bytes(8)
        current.write(b'new');fails(RuntimeError,old.read)
    assert len(created)==len(pool._idle)==1
    # Context exit cleans once even if a caller mistakenly exits it again.
    scope=pool.borrow();handle=scope.__enter__();scope.__exit__(None,None,None);scope.__exit__(None,None,None)
    assert len(pool._idle)==1 and handle._buffer is None
    assert saved!=bytes(8) # Previously returned immutable copies are not erased.

# Exception propagation and reset are independent from job success.
class Abort(BaseException):pass
for error in [ValueError('job failed'),Abort('stop')]:
    with observed() as (pool,created,state,started,release):
        def fail_job():
            with pool.borrow() as handle:
                handle.write(b'secret');raise error
        assert fails(type(error),fail_job) is error
        assert read_once(pool)[0]==bytes(8) and len(pool._idle)==1

# Real full-pool waiting releases the lock; an extra notification cannot grant a resource.
with observed() as (pool,created,state,started,release):
    scope=pool.borrow();owner=scope.__enter__();owner.write(b'held')
    waiter=Job(lambda:read_once(pool))
    try:
        assert pool._changed.entries[0].wait(3)
        with pool._changed:
            assert not pool._idle;pool._changed.notify_all();assert not waiter.done.is_set()
        assert pool._changed.entries[1].wait(3) and not waiter.done.is_set()
        scope.__exit__(None,None,None);waiter.join()
        assert waiter.error is None and waiter.value[0]==bytes(8)
        assert waiter.value[1]==id(created[0]) and waiter.value[2]._buffer is None
    finally:pool.close();waiter.join()

# Reset retains the resource's place until completion, outside the pool lock.
for close_during_reset in [False,True]:
    with observed(gate_reset=True) as (pool,created,state,started,release):
        use_entered=Event();finish_use=Event();handles=[]
        def use():
            with pool.borrow() as handle:
                handles.append(handle);handle.write(b'secret')
                state['target']=handle._buffer;state['armed']=True
                use_entered.set();assert finish_use.wait(3)
        owner=Job(use);assert use_entered.wait(3)
        waiter=Job(lambda:read_once(pool))
        try:
            assert pool._changed.entries[0].wait(3)
            finish_use.set();assert started.wait(3)
            assert state['outside_lock'] is True and handles[0]._buffer is None
            fails(RuntimeError,handles[0].read)
            with pool._changed:assert not pool._idle
            assert not waiter.done.is_set() and len(created)==1
            if close_during_reset:
                pool.close();waiter.join();assert isinstance(waiter.error,PoolClosed)
            state['armed']=False;release.set();owner.join();waiter.join()
            assert owner.error is None and bytes(created[0])==bytes(8)
            if close_during_reset:assert not pool._idle
            else:assert waiter.error is None and waiter.value[0]==bytes(8)
        finally:finish_use.set();state['armed']=False;release.set();pool.close();owner.join();waiter.join()

# Close wakes every waiter, leaves active use valid, and prevents republishing on return.
with observed(2) as (pool,created,state,started,release):
    first_scope=pool.borrow();first=first_scope.__enter__()
    second_scope=pool.borrow();second=second_scope.__enter__()
    assert first._buffer is not second._buffer
    first.write(b'a');second.write(b'b')
    waiters=[Job(lambda:read_once(pool)) for _ in range(3)]
    try:
        assert pool._changed.entries[2].wait(3)
        pool.close();pool.close()
        for waiter in waiters:
            waiter.join();assert isinstance(waiter.error,PoolClosed)
        assert first.read()==b'a'.ljust(8,b'\\0') and second.read()==b'b'.ljust(8,b'\\0')
        first.write(b'active');assert first.read()[:6]==b'active'
        fails(PoolClosed,lambda:read_once(pool))
        first_scope.__exit__(None,None,None);second_scope.__exit__(None,None,None)
        assert all(bytes(resource)==bytes(8) for resource in created) and not pool._idle
        fails(RuntimeError,first.read);fails(RuntimeError,second.read)
    finally:
        pool.close()
        for waiter in waiters:waiter.join()

# Several callers share the same fixed physical resources without overlapping ownership.
for size in [1,2]:
    with observed(size) as (pool,created,state,started,release):
        held=set();seen=set();lock=Lock();begin=Barrier(4)
        def client(label):
            begin.wait(3)
            for n in range(30):
                with pool.borrow() as handle:
                    key=id(handle._buffer)
                    with lock:
                        assert key not in held;held.add(key);seen.add(key);assert len(held)<=size
                    assert handle.read()==bytes(8)
                    payload=f'{label}:{n}'.encode('ascii');handle.write(payload)
                    assert handle.read()==payload.ljust(8,b'\\0')
                    with lock:held.remove(key)
                fails(RuntimeError,handle.read)
        clients=[Job(lambda label=label:client(label)) for label in range(4)]
        for client in clients:client.join();assert client.error is None
        assert not held and seen<={id(resource) for resource in created}
        assert len(created)==len(pool._idle)==size
        assert all(bytes(resource)==bytes(8) for resource in pool._idle)

# Pools have independent inventories, locks, and close flags.
a,b=BufferPool(1),BufferPool(1)
with a.borrow() as x,b.borrow() as y:
    assert x._buffer is not y._buffer and a._changed is not b._changed
    a.close();y.write(b'other');assert y.read()[:5]==b'other'
assert read_once(b)[0]==bytes(8);b.close()
assert {t.ident for t in threads()}==baseline
print('Resource Pool: bounded exclusive use, reset gating, exceptions, stale handles, close races and cleanup passed.')
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-resource-pool');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['buffer_pool.py', 'demo.py'],
        stdout: expected,
        verification:
          'Exact five-line demo output; positive integer size and immutable 0/8-byte and binary payload boundaries, invalid inputs preserving contents, copied reads, eager physical resource count, and no pool-created worker; same backing resource receives a fresh guarded handle while old public read/write reject even during reuse; previous immutable read copies remain unchanged rather than claiming secure erasure; ordinary and BaseException job failures propagate while reset/return still occur, and repeated context exit does not double-return; real Condition instrumentation proves exhausted checkout waits, releases/reacquires the lock, and rechecks after an extra notification; real bytearray instrumentation gates reset outside the availability lock, keeps the slot unavailable, invalidates the old handle before reset, and verifies both open-pool republication and close-during-reset dropping; close wakes three blocked borrowers, preserves two active borrows until return, rejects new checkout, and does not republish returned buffers; four real callers perform 120 uses at size one and another 120 at size two, verifying no overlapping resource ownership, fixed physical inventory, clean contents at checkout, isolated writes, and stale-handle rejection; independent pool inventories/locks/close flags, final zeroed idle buffers, repeated close and all caller-thread joins return thread inventory to baseline. Instrumentation wraps real Condition/bytearray seams without replacing article pool methods. Assumes trusted nonshared handles and successful allocation/fixed cleanup; no broken-resource replacement, external-handle disposal, secure wipe of copies, deadline, forced reclamation, fairness or join-borrowers API is inferred.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
