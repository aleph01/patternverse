import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/gatekeeper.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-gatekeeper-'));
const checks = `
import contextlib,io,runpy,json
from dataclasses import FrozenInstanceError
output=io.StringIO()
with contextlib.redirect_stdout(output):
    module=runpy.run_path('gatekeeper.py',run_name='__main__')
expected=['accepted O100 x2','extra-field rejected','boolean rejected','quota denied','other-owner denied']
assert output.getvalue().splitlines()==expected
Preview=module['Preview'];Rejected=module['Rejected'];admit=module['admit'];LabelService=module['LabelService']
def raises(kind,fn):
    try:fn()
    except kind as e:return e
    raise AssertionError('Expected '+kind.__name__)
forwarded=[]
def capture(request):
    forwarded.append(request)
    return request
rejected=[None,False,3,'{}',bytearray(b'{}'),memoryview(b'{}'),b'',b' '*129,b'\\xff',b'{',b'{}',b'[]',b'null',b'true',b'12',b'"text"',b'{"order_id":"O100"}',b'{"copies":1}',b'{"order_id":"O100","copies":1,"owner":"alice"}',b'{"order_id":"O100","copies":1,"url":"https://elsewhere"}',b'{"order_id":"O100","copies":1,"copies":2}',b'{"order_id":"O100","copies":1,"\\\\u0063opies":2}',b'{"order_id":"O100","copies":NaN}',b'{"order_id":"O100","copies":Infinity}',b'{"order_id":"O100","copies":1} garbage']
for order in [None,True,1,[],{},'', 'o100','O10','O1000','O١٠٠','../O100','https://host/O100','O100\\n']:
    rejected.append(json.dumps({'order_id':order,'copies':1}).encode())
for copies in [None,True,False,0,-1,11,1.0,2.5,'2',[],{}]:
    rejected.append(json.dumps({'order_id':'O100','copies':copies}).encode())
for raw in rejected:
    raises(Rejected,lambda:admit(raw,capture))
assert forwarded==[]
valid=b'{"order_id":"O100","copies":2}'
for size in [127,128]:
    raw=valid+b' '*(size-len(valid));assert len(raw)==size
    assert admit(raw,capture)==Preview('O100',2)
raises(Rejected,lambda:admit(valid+b' '*(129-len(valid)),capture))
assert len(forwarded)==2
for copies in range(1,11):assert admit(json.dumps({'copies':copies,'order_id':'O100'}).encode(),capture)==Preview('O100',copies)
job=forwarded[-1]
raises(FrozenInstanceError,lambda:setattr(job,'copies',2))
assert type(job.order_id) is str and type(job.copies) is int
# Independently enforced current ownership and quota, including direct internal calls.
service=LabelService();allowed=denied=0
for principal in ['alice','bob','unknown',None]:
    for order in ['O100','O200','O999']:
        for count in [1,3,4,10]:
            permitted=(principal,order) in [('alice','O100'),('bob','O200')] and count<=3
            fn=lambda:service.preview(principal,Preview(order,count))
            if permitted:
                assert fn()==order+' x'+str(count);allowed+=1
            else:raises(PermissionError,fn);denied+=1
for request in [None,{},object(),Preview([],1),Preview('O100',True),Preview('O100',1.0),Preview('O100',0),Preview('O100',-1)]:
    raises(PermissionError,lambda:service.preview('alice',request))
service._owners['O100']='bob'
raises(PermissionError,lambda:service.preview('alice',Preview('O100',1)))
assert service.preview('bob',Preview('O100',1))=='O100 x1'
# The original five requests create three handoffs; two malformed requests never arrive.
service=LabelService();calls=[]
def forward(request):
    calls.append(request);return service.preview('alice',request)
for label,raw in module['cases']:
    try:admit(raw,forward)
    except (Rejected,PermissionError):pass
assert calls==[Preview('O100',2),Preview('O100',4),Preview('O200',1)]
# No fallback, hidden retry or success when the internal operation fails.
for kind in [ConnectionError,TimeoutError,RuntimeError]:
    calls=[];failure=kind('internal unavailable')
    def failing(request):
        calls.append(request);raise failure
    assert raises(kind,lambda:admit(valid,failing)) is failure
    assert calls==[Preview('O100',2)]
    raises(Rejected,lambda:admit(b'{}',failing));assert len(calls)==1
# This negative scope witness prevents interpreting the simulator as hostile-code isolation.
assert service._owners['O200']=='bob'
print(json.dumps({'status':'passed','output':expected,'admission_rejection_cases':len(rejected),'body_byte_boundaries':[127,128,129],'independent_authorization_cases':allowed+denied,'permitted_authorization_cases':allowed,'denied_authorization_cases':denied,'sample_handoffs':3,'sample_blocked_before_handoff':2,'checks':['strict body/type/UTF8/JSON/shape/field and duplicate-key rejection before forwarding','128-byte inclusive body limit before parsing','immutable selected-field transfer value and fixed callback','independent owner and business-quota authorization','current ownership change applies to next preview','service exceptions propagate without retries or bypass fallback','sample and all five diagram outcomes agree','same-process Python state remains accessible; no isolation claim']}))
`;
try {
  await writeFile(join(directory, 'gatekeeper.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const record = JSON.parse(result.stdout);
  const visuals = (
    await readFile(resolve(root, 'scripts/build-software-gatekeeper-visuals.mjs'), 'utf8')
  ).replaceAll(/[\s"']/g, '');
  for (const row of [
    "['Allowed preview','O100 · copies 2','Admitted','O100 x2',true]",
    "['Extra owner field','owner: alice','Rejected','Not called',false]",
    "['Boolean count','copies: true','Rejected','Not called',false]",
    "['Over business quota','O100 · copies 4','Admitted','Denied',true]",
    "[\"Other owner’s order\",'O200 · copies 1','Admitted','Denied',true]",
  ]) {
    if (!visuals.includes(row.replaceAll(/[\s"']/g, '')))
      throw new Error('Diagram differs from program: ' + row);
  }
  const out = resolve(root, '.local/software-gatekeeper');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'code-checks.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(
    'Actual article program, strict admission, forwarding, independent authorization, byte boundaries and service failures verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
