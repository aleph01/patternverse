import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/proactor.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-proactor-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['proactor.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'retained requests: 2',
    "B 2 b'ok' None False",
    "A 3 b'hel' None True",
    "C 0 b'' cancelled True",
    "D 0 b'' None False",
    'remaining: 0',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from proactor import Proactor,Completion
from dataclasses import FrozenInstanceError
from copy import deepcopy
from itertools import permutations


def fails(error,call):
    try:call()
    except error:return
    raise AssertionError("Expected "+error.__name__)


def state(loop):
    return deepcopy((loop.pending,list(loop.ready),loop.serial))


p=Proactor();got=[]
a=p.read('A',8,got.append);b=p.read('B',8,got.append)
assert (a,b)==(1,2) and got==[] and not p.ready
assert p.pending[a].buffer is not p.pending[b].buffer
p.complete(b,b'ok');assert got==[] and len(p.pending)==2
before=state(p)
fails(RuntimeError,lambda:p.read('C',1,got.append));assert state(p)==before
assert p.cancel(a) is True and len(p.pending)==2
assert p.pending[a].cancel_requested is True and not p.pending[a].done
p.complete(a,b'hel');assert len(p.pending)==2 and got==[]
assert p.cancel(b) is False and p.pending[b].cancel_requested is False
assert p.dispatch_one() is True
assert got==[Completion(b,'B',b'ok',None,False)] and len(p.pending)==1
assert p.dispatch_one() is True
assert got[1]==Completion(a,'A',b'hel',None,True)
assert p.dispatch_one() is False and not p.pending and not p.ready

# Every order of two backend finishes and one cancellation request is explicit.
for events in permutations(('finishA','finishB','cancelA')):
    p=Proactor();got=[];a=p.read('A',8,got.append);b=p.read('B',8,got.append)
    completed=[];cancel_expected=False
    for event in events:
        if event=='finishA':p.complete(a,b'a');completed.append('A')
        elif event=='finishB':p.complete(b,b'b');completed.append('B')
        else:cancel_expected=p.cancel(a)
        assert len(p.pending)==2 and got==[]
    while p.dispatch_one():pass
    assert [c.label for c in got]==completed
    assert next(c for c in got if c.label=='A').cancel_requested is cancel_expected
    assert all(c.error is None for c in got) and not p.pending

# Full, short, zero-byte and arbitrary binary results carry exact counts, not padded buffers.
for size,data in [(1,b'x'),(8,b'12345678'),(8,b'hel'),(8,b''),(8,bytes([0,255]))]:
    p=Proactor();got=[];request_id=p.read('A',size,got.append)
    buffer=p.pending[request_id].buffer
    p.complete(request_id,data);assert len(buffer)==size
    p.dispatch_one();assert got[0].data==data and len(got[0].data)==len(data)
    assert type(got[0].data) is bytes and got[0].error is None
    buffer[:]=b'Z'*size
    assert got[0].data==data
    fails(FrozenInstanceError,lambda:setattr(got[0],'data',b'changed'))

# Requested cancellation can end in success, cancellation, or another failure.
for error in [None,'cancelled','read failed']:
    p=Proactor();got=[];request_id=p.read('A',8,got.append)
    p.cancel(request_id);p.complete(request_id,b'ok' if error is None else b'',error)
    assert len(p.pending)==1 and len(p.ready)==1
    p.dispatch_one()
    assert got[0].error==error and got[0].cancel_requested is True and not p.pending

# Exactly one terminal result and one callback per accepted request in this model.
p=Proactor();got=[];request_id=p.read('A',8,got.append)
p.complete(request_id,b'ok');before=state(p)
fails(ValueError,lambda:p.complete(request_id,b'other'));assert state(p)==before
p.dispatch_one();assert len(got)==1
for action in [lambda:p.cancel(request_id),lambda:p.complete(request_id),lambda:p.cancel(999),lambda:p.complete(999)]:
    before=state(p);fails(KeyError,action);assert state(p)==before
assert p.dispatch_one() is False and len(got)==1

# Size/type/status/handler rejection happens before request or queue mutation.
for size in [0,9,-1,True,False,1.0,'1',None]:
    p=Proactor();before=state(p)
    fails(ValueError,lambda:p.read('A',size,lambda c:None));assert state(p)==before
for label,handler in [('',lambda c:None),(None,lambda c:None),(1,lambda c:None),('A',None),('A',1)]:
    p=Proactor();before=state(p)
    fails(ValueError,lambda:p.read(label,1,handler));assert state(p)==before
for data,error in [(b'123456789',None),(bytearray(b'x'),None),('x',None),(None,None),(b'x','cancelled'),(b'x','read failed'),(b'','unknown')]:
    p=Proactor();request_id=p.read('A',8,lambda c:None);before=state(p)
    fails(ValueError,lambda:p.complete(request_id,data,error));assert state(p)==before
    assert not p.pending[request_id].done and not p.ready

# Pending state and the admission slot are released before the callback, allowing continuation.
p=Proactor();got=[];new_ids=[]
def first(result):
    assert result.request_id not in p.pending
    new_ids.append(p.read('next',1,got.append))
    got.append(result)
a=p.read('A',8,first);b=p.read('B',8,got.append)
p.complete(a,b'a');p.dispatch_one()
assert new_ids==[3] and len(p.pending)==2
p.complete(b,b'b');p.complete(3,b'c')
while p.dispatch_one():pass
assert [c.data for c in got]==[b'a',b'b',b'c'] and not p.pending

# A thrown callback is visible, is not retried, and does not erase another ready result.
p=Proactor();got=[]
def broken(result):raise RuntimeError('handler bug')
a=p.read('A',8,broken);b=p.read('B',8,got.append)
p.complete(a,b'a');p.complete(b,b'b')
fails(RuntimeError,p.dispatch_one)
assert a not in p.pending and b in p.pending and len(p.ready)==1
assert p.dispatch_one() is True and got==[Completion(b,'B',b'b',None,False)]
assert p.dispatch_one() is False

# Equal owner labels remain separate requests and do not share result buffers or IDs.
p=Proactor();got=[];a=p.read('same',8,got.append);b=p.read('same',8,got.append)
p.complete(b,b'b');p.complete(a,b'a')
while p.dispatch_one():pass
assert [(c.request_id,c.data) for c in got]==[(b,b'b'),(a,b'a')]
# Separate services do not share state. IDs are scoped correlation values, not credentials.
other=Proactor();assert other.serial==0 and not other.pending and not other.ready
print('Proactor completion, admission, six event orders, cancellation, and lifetime checks passed')
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['proactor.py', 'demo.py'],
    stdout: expected,
    verification:
      'Exact six-line demo output; submission and backend completion do not invoke handlers inline; B can finish before A and each result retains its own request identity; queued results and cancellation requests retain pending state and both admission slots; all six event orders of two finishes and a cancellation distinguish requested cancellation from terminal status; cancellation can end in success, cancellation, or read failure; 1/8-byte request bounds, full/short/zero-byte and arbitrary binary results, exact unpadded byte counts, immutable independent completion snapshots, and distinct request buffers; duplicate terminal results and unknown/retired IDs reject without mutation; invalid request size, owner, handler, completed count, payload type and terminal status preserve state; slot release before callbacks permits continuation under the two-request cap; handler exceptions propagate without retrying that callback or dropping another queued completion; same owner labels remain distinct requests; all queues drain and separate model instances remain independent. Deterministic in-memory model only: no real I/O, OS handles, kernel-borrowed buffers, threads, timers, native API calls, guaranteed cancellation effectiveness, persistent effects, or native performance claim.',
  };
  const out = resolve(root, '.local/software-proactor');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
