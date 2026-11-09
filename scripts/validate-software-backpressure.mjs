import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/data-backpressure.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article Python fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-backpressure-'));
const run = (name) => {
  const r = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message || 'Example failed');
  return r.stdout;
};
try {
  for (const [i, name] of ['transfer.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[i]);
  const expected = ['while blocked: 1 0', 'finished: 3 6 True'];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `import asyncio
import inspect
from io import BytesIO
from tempfile import TemporaryFile
from transfer import transfer


async def raises(kind,awaitable):
    try: await awaitable
    except kind as error:return error
    raise AssertionError('Expected '+kind.__name__)


async def verify():
    # Observe actual source advancement while a real async sink is blocked.
    reads=[];closed=[];entered=asyncio.Event();release=asyncio.Event()
    active=peak=completed=byte_count=0
    def source():
        try:
            for chunk in (b'a',b'bb',b'ccc'):
                reads.append(chunk);yield chunk
        finally:closed.append(True)
    async def write(chunk):
        nonlocal active,peak,completed,byte_count
        active+=1;peak=max(peak,active)
        try:
            entered.set();await release.wait()
            completed+=1;byte_count+=len(chunk)
        finally:active-=1
    task=asyncio.create_task(transfer(source(),write))
    try:
        await asyncio.wait_for(entered.wait(),2)
        for _ in range(3):await asyncio.sleep(0)
        assert reads==[b'a'] and completed==byte_count==0 and active==peak==1
        assert not task.done() and not closed
    finally:
        release.set();result=await task
    assert result==3 and byte_count==6 and completed==3 and active==0 and peak==1 and closed==[True]

    # Empty input and immediate writes preserve count/order; the caller retains
    # destination lifetime. A zero-length chunk is still one completed chunk.
    destination=BytesIO();closed=[]
    def rows(items):
        try:yield from items
        finally:closed.append(True)
    async def append(chunk):destination.write(chunk)
    try:
        assert await transfer(rows(()),append)==0
        assert await transfer(rows((b'',b'a',b'bb')),append)==3
        assert destination.getvalue()==b'abb' and not destination.closed
        assert closed==[True,True]
    finally:destination.close()

    # A callback's finally cleanup must finish before the next source read.
    ready,finish=asyncio.Event(),asyncio.Event();reads=[];files=[]
    def items():
        for chunk in (b'a',b'b'):
            reads.append(chunk);yield chunk
    async def cleaning(chunk):
        with TemporaryFile() as resource:
            files.append(resource)
            try:resource.write(chunk)
            finally:
                ready.set();await finish.wait()
    task=asyncio.create_task(transfer(items(),cleaning))
    try:
        await asyncio.wait_for(ready.wait(),2)
        assert reads==[b'a'] and not files[0].closed and not task.done()
    finally:
        finish.set();assert await task==2
    assert all(f.closed for f in files) and reads==[b'a',b'b']

    # Exact sink/source errors stop further reads and close actual resources.
    for failure_at in [0,1]:
        read=[];owned=[];done=[];error=ValueError('write failed')
        def owned_source():
            with TemporaryFile() as resource:
                owned.append(resource)
                for index in range(3):read.append(index);yield bytes([index])
        async def failing(chunk):
            with TemporaryFile() as resource:
                owned.append(resource)
                if len(done)==failure_at:raise error
                done.append(chunk)
        assert await raises(ValueError,transfer(owned_source(),failing)) is error
        assert read==list(range(failure_at+1)) and len(done)==failure_at
        assert all(f.closed for f in owned)
    owned=[];written=[];error=RuntimeError('reader failed')
    def broken_source():
        with TemporaryFile() as resource:
            owned.append(resource);yield b'a';raise error
    async def completed_write(chunk):written.append(chunk)
    assert await raises(RuntimeError,transfer(broken_source(),completed_write)) is error
    assert written==[b'a'] and owned[0].closed

    # Cooperative cancellation after ownership starts cleans up without undoing
    # the first completed write. No third read happens while write two waits.
    entered=asyncio.Event();never=asyncio.Event();read=[];written=[];owned=[]
    def cancellable_source():
        with TemporaryFile() as resource:
            owned.append(resource)
            for value in [b'a',b'bb',b'ccc']:read.append(value);yield value
    async def cancellable_write(chunk):
        with TemporaryFile() as resource:
            owned.append(resource)
            if written:
                entered.set();await never.wait()
            written.append(chunk)
    task=asyncio.create_task(transfer(cancellable_source(),cancellable_write))
    try:
        await asyncio.wait_for(entered.wait(),2)
        assert read==[b'a',b'bb'] and written==[b'a']
    finally:
        task.cancel();await raises(asyncio.CancelledError,task)
    assert written==[b'a'] and all(f.closed for f in owned) and len(read)==2

    # Cancelling before the coroutine starts cannot execute its closing scope.
    # The caller retains ownership and explicitly closes the never-started source.
    def never_started():yield b'a'
    generator=never_started();task=asyncio.create_task(transfer(generator,completed_write))
    task.cancel();await raises(asyncio.CancelledError,task)
    assert inspect.getgeneratorstate(generator)==inspect.GEN_CREATED
    generator.close();assert inspect.getgeneratorstate(generator)==inspect.GEN_CLOSED
    await asyncio.sleep(0)
    assert asyncio.all_tasks()=={asyncio.current_task()}

asyncio.run(verify())
assert (5000-2000)*2==6000
assert (5000-2000)*60==180000
assert 180000/(3000-1000)==90
print('Real suspension/resume, one unfinished writer, no read-ahead, zero input, bytes/chunks, cleanup lifetime, exact source/sink failures, cancellation ownership, joined tasks and backlog arithmetic passed.')
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-backpressure');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['transfer.py', 'demo.py'],
        stdout: expected,
        verification:
          'Actual article fences run unchanged on Python 3.11+. A real Event holds the first write while repeated event-loop turns leave source reads at one and completed bytes at zero; release resumes the three sequential writes with peak one unfinished callback, six bytes and a closed source. Empty input, zero-length chunks, order/counts and caller-owned destination lifetime are verified. A callback with gated finally cleanup keeps the next source read blocked until its TemporaryFile closes. Exact source/sink errors preserve prior completed effects, stop further reads and close actual source/callback files. Cancellation during the second write closes owned files without reversing the first write or reading the third chunk. Pre-start cancellation leaves the source caller-owned and explicitly closed by the caller. All created tasks are awaited and no background task remains. Original steady-rate calculations match 6000 places in two seconds, 180000 backlog in sixty seconds and ninety-second net drain. No total-memory bound, real database/file transfer, deadline, worker pool, retry, durable acknowledgment, remote cancellation or reversal is inferred.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
