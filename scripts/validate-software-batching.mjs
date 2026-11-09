import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/batching.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-batching-'));
const checks = `
import contextlib,io,runpy,json,copy,random
output=io.StringIO()
with contextlib.redirect_stdout(output):
    module=runpy.run_path('batching.py',run_name='__main__')
expected=["8 count ['a', 'bb', 'c'] 4","13 size ['dddd'] 4","23 age ['eee'] 3","26 close ['f', 'g'] 2"]
assert output.getvalue().splitlines()==expected
Batcher=module['Batcher'];emitted=module['emitted']
assert emitted==[(8,'count',(b'a',b'bb',b'c')),(13,'size',(b'dddd',)),(23,'age',(b'eee',)),(26,'close',(b'f',b'g'))]
count=sum(len(items) for time,reason,items in emitted)
separate=count*(5+1);grouped=len(emitted)*5+count
assert (count,separate,grouped,separate-grouped)==(7,42,27,15)
def raises(kind,operation):
    try: operation()
    except kind: pass
    else: raise AssertionError('Expected '+kind.__name__)
for name in ['max_items','max_bytes','max_age_ms']:
    for bad in [0,-1,True,False,1.5,'3',None]:
        raises(ValueError,lambda:Batcher(**{name:bad}))
# Validation occurs before advancing time or flushing valid buffered data.
b=Batcher();assert b.add(b'x',0)==[];before=copy.deepcopy(b.__dict__)
for bad in [None,'abc',b'',b'1234567',bytearray(b'abc'),[b'a']]:
    raises(ValueError,lambda:b.add(bad,100));assert b.__dict__==before
for bad in [-1,True,False,0.5,'10',None]:
    raises(ValueError,lambda:b.add(b'y',bad));assert b.__dict__==before
assert b.advance(1)==[];before=copy.deepcopy(b.__dict__)
raises(ValueError,lambda:b.advance(0));assert b.__dict__==before
# Exact age is checked before a coincident new arrival, not extended by it.
b=Batcher(max_items=10,max_bytes=100)
assert b.add(b'a',0)==[] and b.add(b'b',9)==[] and b.advance(9)==[]
assert b.add(b'c',10)==[(10,'age',(b'a',b'b'))]
assert b.pending==[b'c'] and b.started==10
assert b.advance(20)==[(20,'age',(b'c',))]
assert b.advance(100)==[] and b.close(100)==[]
# Explicit progress is necessary; late advancement is visibly late emission.
b=Batcher();b.add(b'a',0)
assert b.advance(100)==[(100,'age',(b'a',))]
# Count, byte equality, and the chosen tie precedence are independent policies.
b=Batcher();assert b.add(b'a',0)==[] and b.add(b'b',0)==[]
assert b.add(b'c',0)==[(0,'count',(b'a',b'b',b'c'))]
b=Batcher();assert b.add(b'123456',0)==[(0,'size',(b'123456',))]
b=Batcher(max_items=1,max_bytes=1);assert b.add(b'a',0)==[(0,'count',(b'a',))]
b=Batcher();b.add(b'dddd',0)
assert b.add(b'eee',1)==[(1,'size',(b'dddd',))] and b.pending==[b'eee']
# A single arrival can emit an aged group and a new full-size singleton.
b=Batcher();b.add(b'x',0)
assert b.add(b'123456',10)==[(10,'age',(b'x',)),(10,'size',(b'123456',))]
# Handoff snapshots remain independent of future collector mutation.
b=Batcher(max_items=1);handed=b.add(b'x',0);b.add(b'y',1)
assert handed==[(0,'count',(b'x',))]
def mutate_snapshot():
    handed[0][2][0]=b'bad'
raises(TypeError,mutate_snapshot)
assert type(handed[0][2]) is tuple and type(handed[0][2][0]) is bytes
b=Batcher();b.add(b'x',0);assert b.close(1)==[(1,'close',(b'x',))]
assert b.closed and not b.pending and b.size==0 and b.started is None
before=copy.deepcopy(b.__dict__)
for operation in [lambda:b.add(b'y',2),lambda:b.advance(2),lambda:b.close(2)]:
    raises(RuntimeError,operation);assert b.__dict__==before
# Randomized finite inputs preserve order/multiplicity and all formation bounds.
for seed in range(12):
    rng=random.Random(seed);b=Batcher();accepted=[];groups=[];now=0
    for index in range(80):
        now+=rng.randrange(14);payload=bytes([index+1])*rng.randrange(1,7)
        accepted.append(payload);groups+=b.add(payload,now)
        assert len(b.pending)<3 and b.size<6
        assert b.size==sum(map(len,b.pending))
        if rng.randrange(3)==0:
            now+=rng.randrange(10);groups+=b.advance(now)
        assert len(b.pending)<3 and b.size<6
    groups+=b.close(now+1)
    assert [p for time,reason,items in groups for p in items]==accepted
    assert all(0<len(items)<=3 and sum(map(len,items))<=6 for time,reason,items in groups)
    assert [t for t,reason,items in groups]==sorted(t for t,reason,items in groups)
    assert not b.pending and b.closed
print(json.dumps({'status':'passed','output':expected,'batch_member_counts':[len(items) for time,reason,items in emitted],'batch_payload_bytes':[sum(map(len,items)) for time,reason,items in emitted],'individual_service_ms':separate,'batched_service_ms':grouped,'saved_service_ms':separate-grouped,'scheduled_interleavings':12,'items_per_schedule':80,'checks':['positive typed limits','invalid/oversized payload leaves state and clock intact','invalid or decreasing time leaves state intact','oldest age not reset by later arrivals','exact age precedes new admission','idle emission and late-progress limitation','count and byte equality','count wins simultaneous equality','pre-admission byte overflow emits previous group','one arrival can emit two groups in order','immutable independent handoff snapshots','residual and empty shutdown','closed collector rejects future work','randomized order/multiplicity conservation and pending bounds','explicit service-cost arithmetic']}))
`;
try {
  await writeFile(join(directory, 'batching.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 20000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const record = JSON.parse(result.stdout);
  const visuals = (
    await readFile(resolve(root, 'scripts/build-software-batching-visuals.mjs'), 'utf8')
  ).replaceAll(/\s/g, '');
  for (const row of [
    "['a, bb, c',3,8]",
    "['dddd',1,6]",
    "['eee',1,6]",
    "['f, g',2,7]",
    "[8,'count','a, bb, c / 4 bytes'",
    "[13,'size','dddd / 4 bytes'",
    "[23,'age','eee / 3 bytes'",
    "[26,'close','f, g / 2 bytes'",
  ]) {
    if (!visuals.includes(row.replaceAll(/\s/g, '')))
      throw new Error('Diagram differs from program: ' + row);
  }
  const out = resolve(root, '.local/software-batching');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'code-checks.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(
    'Actual program, emission causes, threshold/failure/shutdown boundaries, conservation and cost arithmetic verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
