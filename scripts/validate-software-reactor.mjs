import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/reactor.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-reactor-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 20000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['reactor.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = ["B b'ok'", "A b'hello'", 'A truncated', 'registered: 0'];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `import socket, selectors
from contextlib import contextmanager, ExitStack
from itertools import combinations
from time import monotonic
from types import SimpleNamespace
from reactor import Reactor


def until(loop, condition):
    deadline=monotonic()+2
    while not condition():
        if monotonic()>=deadline:raise TimeoutError("Check did not progress")
        loop.step(0.01)


@contextmanager
def fixture(names=("A",)):
    with ExitStack() as resources:
        peers={}
        for name in names:
            left,right=socket.socketpair()
            peers[name]=(resources.enter_context(left),resources.enter_context(right))
        loop=Reactor()
        try:
            for name,(reader,writer) in peers.items():loop.add(name,reader)
            yield loop,peers
        finally:
            loop.close()


# Many recv boundaries produce identical records, including multiple records per read.
payload=b"ab\\ncd\\n"
fragmentations=[]
for mask in range(1 << (len(payload)-1)):
    cuts=[0]+[i for i in range(1,len(payload)) if mask & (1 << (i-1))]+[len(payload)]
    fragmentations.append([payload[a:b] for a,b in zip(cuts,cuts[1:])])
for fragments in fragmentations:
    with fixture() as (loop,peers):
        for chunk in fragments:
            peers['A'][1].sendall(chunk)
            # Explicit zero-time dispatch between fixture writes never waits for a record.
            loop.step(0)
        peers['A'][1].shutdown(socket.SHUT_WR)
        until(loop,lambda:not loop.selector.get_map())
        assert loop.records==[('A',b'ab'),('A',b'cd')]
        assert loop.errors==[] and peers['A'][0].fileno()==-1

# Empty and exactly eight-byte records are valid; a ninth byte is rejected before LF.
for data,wanted in [(b"\\n",b""),(b"12345678\\n",b"12345678"),(bytes([0,255])+b"\\n",bytes([0,255]))]:
    with fixture() as (loop,peers):
        peers['A'][1].sendall(data);peers['A'][1].shutdown(socket.SHUT_WR)
        until(loop,lambda:not loop.selector.get_map())
        assert loop.records==[('A',wanted)] and loop.errors==[]
with fixture(("A","B")) as (loop,peers):
    peers['A'][1].sendall(b"123456789")
    peers['B'][1].sendall(b"ok\\n")
    until(loop,lambda:bool(loop.errors) and bool(loop.records))
    assert loop.errors==[('A','record too long')] and loop.records==[('B',b'ok')]
    assert peers['A'][0].fileno()==-1 and peers['B'][0].fileno()!=-1

# A partial record cannot stall B; no assumptions about selector return order.
with fixture(("A","B")) as (loop,peers):
    peers['A'][1].sendall(b"hel")
    peers['B'][1].sendall(b"ok\\n")
    until(loop,lambda:bool(loop.records))
    assert loop.records==[('B',b'ok')]
    peers['A'][1].sendall(b"lo\\n")
    until(loop,lambda:len(loop.records)==2)
    assert loop.records==[('B',b'ok'),('A',b'hello')]
    peers['A'][1].sendall(b"x")
    for reader,writer in peers.values():writer.shutdown(socket.SHUT_WR)
    until(loop,lambda:not loop.selector.get_map())
    assert loop.errors==[('A','truncated')]
    assert loop.records==[('B',b'ok'),('A',b'hello')]

# Clean EOF emits nothing; unfinished suffix alone is rejected.
for data,expected_error in [(b"",[]),(b"x",[('A','truncated')])]:
    with fixture() as (loop,peers):
        if data:peers['A'][1].sendall(data)
        peers['A'][1].shutdown(socket.SHUT_WR)
        until(loop,lambda:not loop.selector.get_map())
        assert loop.records==[] and loop.errors==expected_error

# Directly invoking the actual registered nonblocking callback while no data exists
# checks its would-block path. Registration and all accumulated results stay intact.
with fixture() as (loop,peers):
    reader,writer=peers['A'];assert reader.getblocking() is False
    key=loop.selector.get_key(reader)
    assert key.events==selectors.EVENT_READ and callable(key.data)
    key.data(key,selectors.EVENT_READ)
    assert loop.records==[] and loop.errors==[] and loop.selector.get_key(reader)==key
    loop.step(0);assert loop.records==[]
    writer.sendall(b"ok\\n");until(loop,lambda:bool(loop.records))
    assert loop.records==[('A',b'ok')]

# An adapter around a real socket bounds actual reads and injects one I/O failure.
# These tests invoke the exact registered handler, not a reimplementation of it.
class Instrumented:
    def __init__(self,sock,problem=None):
        self.sock=sock;self.problem=problem;self.calls=[]
    def fileno(self):return self.sock.fileno()
    def setblocking(self,value):self.sock.setblocking(value)
    def recv(self,count):
        self.calls.append(count)
        if self.problem is not None:raise self.problem
        return self.sock.recv(count)
    def close(self):self.sock.close()

with ExitStack() as resources:
    reader,writer=socket.socketpair()
    resources.enter_context(reader);resources.enter_context(writer)
    loop=Reactor();wrapped=Instrumented(reader)
    try:
        loop.add('A',wrapped);key=loop.selector.get_key(wrapped)
        writer.sendall(b"abcd\\n")
        key.data(key,selectors.EVENT_READ)
        assert wrapped.calls==[4] and loop.records==[]
        until(loop,lambda:bool(loop.records))
        assert wrapped.calls==[4,4] and loop.records==[('A',b'abcd')]
    finally:loop.close()

for problem in [OSError("broken connection"),RuntimeError("handler bug")]:
    with ExitStack() as resources:
        reader,writer=socket.socketpair()
        resources.enter_context(reader);resources.enter_context(writer)
        loop=Reactor();wrapped=Instrumented(reader,problem)
        try:
            loop.add('A',wrapped);key=loop.selector.get_key(wrapped)
            if isinstance(problem,OSError):
                key.data(key,selectors.EVENT_READ)
                assert loop.errors==[('A','I/O error')] and not loop.selector.get_map()
                assert reader.fileno()==-1
            else:
                try:key.data(key,selectors.EVENT_READ)
                except RuntimeError as error:assert str(error)=='handler bug'
                else:raise AssertionError('Programming failure was swallowed')
                assert loop.errors==[] and loop.selector.get_key(wrapped)==key
        finally:loop.close()
        assert reader.fileno()==-1 and loop.selector.get_map() is None

# Check unregister-before-close order with actual sockets and a recorded selector adapter.
with ExitStack() as resources:
    reader,writer=socket.socketpair()
    resources.enter_context(reader);resources.enter_context(writer)
    loop=Reactor();events=[]
    unregister=loop.selector.unregister
    def tracked(sock):
        assert sock.fileno()>=0
        events.append('unregister')
        return unregister(sock)
    loop.selector.unregister=tracked
    wrapped=Instrumented(reader)
    close=wrapped.close
    def tracked_close():
        assert events==['unregister']
        events.append('close');close()
    wrapped.close=tracked_close
    loop.add('A',wrapped);loop.close()
    assert events==['unregister','close'] and reader.fileno()==-1
    assert loop.selector.get_map() is None

# Parser buffers belong to registrations and duplicate registration fails visibly.
with fixture(("A","B")) as (loop,peers):
    peers['A'][1].sendall(b"a")
    peers['B'][1].sendall(b"b")
    loop.step(0.05)
    peers['A'][1].sendall(b"\\n");peers['B'][1].sendall(b"\\n")
    until(loop,lambda:len(loop.records)==2)
    assert sorted(loop.records)==[('A',b'a'),('B',b'b')]
    try:loop.add('duplicate',peers['A'][0])
    except KeyError:pass
    else:raise AssertionError('Duplicate registration accepted')
    assert len(loop.selector.get_map())==2
print('Reactor real-socket framing, 32 fragmentations, bounds, failure, and lifecycle checks passed')
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['reactor.py', 'demo.py'],
    stdout: expected,
    verification:
      'Exact four-line demo output on real local stream sockets; all 32 fragmentations of two LF-delimited records preserve framing; multiple records per recv; empty, exactly eight-byte, and arbitrary binary payload boundaries; ninth payload byte closes only the offending reader without needing LF; incomplete A does not stall B; EOF discards only an unfinished suffix and retains completed records; clean EOF emits nothing; actual registered callbacks tolerate would-block without state loss; an instrumented real-socket adapter verifies one recv of at most four bytes per callback; OSError triggers connection error cleanup while RuntimeError remains visible; real-socket lifecycle instrumentation verifies unregister before close and selector release; independent per-connection buffers, nonblocking read interests, duplicate-registration failure, and fixture cleanup. No selector fairness, listener, write dispatcher, TLS, worker pool, durable sink, global backpressure, authentication, or production throughput claim is inferred.',
  };
  const out = resolve(root, '.local/software-reactor');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
