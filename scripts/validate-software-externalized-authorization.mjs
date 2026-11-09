import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(
  resolve(root, 'content/patterns/externalized-authorization.md'),
  'utf8',
);
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two complete Python files.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-externalized-authorization-'));
const checks = `
import contextlib,io,runpy,json,copy
from policy import Policy
output=io.StringIO()
with contextlib.redirect_stdout(output):module=runpy.run_path('demo.py',run_name='__main__')
expected=['own north totals','cross denied','revoked denied','offline unavailable']
assert output.getvalue().splitlines()==expected
Reports=module['Reports']
def raises(kind,fn):
    try:fn()
    except kind as e:return e
    raise AssertionError('Expected '+kind.__name__)
class Bodies(dict):
    def __init__(self):super().__init__(R1='north totals',R2='south totals');self.reads=[]
    def __getitem__(self,key):self.reads.append(key);return super().__getitem__(key)
p=Policy();calls=[];replies=[]
def decide(query):
    calls.append(query);reply=p.evaluate(query);replies.append(copy.deepcopy(reply));return reply
r=Reports(decide);bodies=Bodies();r._bodies=bodies
cases=permitted=0
for subject in ['alice','bob','unknown']:
    for resource in ['R1','R2','missing']:
        before=len(bodies.reads);cases+=1
        if (subject,resource)==('alice','R1'):
            assert r.read(subject,resource)=='north totals';permitted+=1
        else:raises(PermissionError,lambda:r.read(subject,resource));assert len(bodies.reads)==before
assert cases==9 and permitted==1 and bodies.reads==['R1'] and len(calls)==6
assert calls[0]==('alice','read','R1','north') and calls[1]==('alice','read','R2','south')
assert all(reply['version']==1 and reply['obligations']==[] for reply in replies)
assert p.evaluate(('alice','export','R1','north'))['allow'] is False
# Unknown/malformed requests stop before policy evaluation as well as body retrieval.
class Text(str):pass
before_calls=len(calls);before_reads=list(bodies.reads);malformed_inputs=0
for index in range(2):
    for bad in [None,False,1,[],{},'',Text('alice')]:
        args=['alice','R1'];args[index]=bad;malformed_inputs+=1
        raises(PermissionError,lambda:r.read(*args))
assert len(calls)==before_calls and bodies.reads==before_reads
# Strict contract, query binding, literal Boolean permit, version and supported obligations.
q=('alice','read','R1','north');base=p.evaluate(q);bad_replies=[None,False,True,[],1,'allow',b'allow',{}]
class Reply(dict):pass
bad_replies.append(Reply(base))
for key in base:
    d=copy.deepcopy(base);del d[key];bad_replies.append(d)
d=copy.deepcopy(base);d['unexpected']=True;bad_replies.append(d)
for value in [False,None,'true','false',1,0,[],{},b'true']:
    d=copy.deepcopy(base);d['allow']=value;bad_replies.append(d)
for value in [True,False,0,-1,1.0,None,'1',[],{}]:
    d=copy.deepcopy(base);d['version']=value;bad_replies.append(d)
for value in [None,(),'',False,{},['mask'],[{'obligation':'audit'}]]:
    d=copy.deepcopy(base);d['obligations']=value;bad_replies.append(d)
for value in [None,list(q),q[:3],('bob','read','R1','north'),('alice','export','R1','north'),('alice','read','R2','south'),('alice','read','R1','south')]:
    d=copy.deepcopy(base);d['query']=value;bad_replies.append(d)
for reply in bad_replies:
    invocations=[]
    def port(query):invocations.append(query);return reply
    service=Reports(port);service._bodies=Bodies()
    raises(PermissionError,lambda:service.read('alice','R1'))
    assert invocations==[q] and service._bodies.reads==[]
# One shared policy change affects two enforcement points without changing either handler.
p=Policy();one=Reports(p.evaluate);two=Reports(p.evaluate)
assert one.read('alice','R1')==two.read('alice','R1')=='north totals'
p.revoke('alice');assert p.version==2 and p.evaluate(q)['allow'] is False
for service in [one,two]:
    service._bodies=Bodies();raises(PermissionError,lambda:service.read('alice','R1'));assert service._bodies.reads==[]
# Operational failures remain errors rather than synthesized permits or hidden retries.
for kind in [TimeoutError,ConnectionError,ValueError,OSError]:
    invocations=[];failure=kind('decision failed')
    def failing(query):invocations.append(query);raise failure
    service=Reports(failing);service._bodies=Bodies()
    assert raises(kind,lambda:service.read('alice','R1')) is failure
    assert invocations==[q] and service._bodies.reads==[]
class MetadataFault(dict):
    def get(self,*args):raise ConnectionError('metadata unavailable')
service=Reports(lambda query:(_ for _ in ()).throw(AssertionError('must not query')))
service._tenants=MetadataFault();service._bodies=Bodies()
raises(ConnectionError,lambda:service.read('alice','R1'));assert service._bodies.reads==[]
class BrokenBodies(dict):
    def __getitem__(self,key):raise OSError('body unavailable')
service=Reports(Policy().evaluate);service._bodies=BrokenBodies();raises(OSError,lambda:service.read('alice','R1'))
# Explicit negative scope witnesses: query equality/version are not freshness or authenticity proof.
p=Policy();old=p.evaluate(q);p.revoke('alice')
assert Reports(lambda query:old).read('alice','R1')=='north totals'
# A forged in-process callback can manufacture a matching permit: the port must be trusted.
assert Reports(lambda query:{'allow':True,'query':query,'version':999,'obligations':[]}).read('alice','R1')=='north totals'
print(json.dumps({'status':'passed','output':expected,'service_matrix_cases':cases,'permitted_matrix_cases':permitted,'denied_matrix_cases':cases-permitted,'malformed_input_cases':malformed_inputs,'rejected_response_cases':len(bad_replies),'shared_policy_enforcement_points':2,'checks':['exact four outcomes and P1/P2 decisions','trusted report tenant supplied by handler and fixed read action','unknown/malformed requests stop before decision or body retrieval','strict response schema, query binding, Boolean permit and positive integer version','unsupported or malformed obligations block access','all denials and unusable replies leave bodies unread','one policy update affects two independent handlers','timeouts and other decision failures propagate without retries or bypass','metadata and body faults cannot manufacture success','old matching permits can replay in this bounded model; no freshness guarantee','matching forged callback response can pass; no network authentication or security-kernel claim']}))
`;
try {
  await writeFile(join(directory, 'policy.py'), blocks[0]);
  await writeFile(join(directory, 'demo.py'), blocks[1]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const record = JSON.parse(result.stdout),
    normalize = (s) => s.replaceAll(/[\s"']/g, '');
  const visuals = normalize(
    await readFile(
      resolve(root, 'scripts/build-software-externalized-authorization-visuals.mjs'),
      'utf8',
    ),
  );
  for (const row of [
    "['Own tenant','alice / R1','P1 · allow','Yes',true]",
    "['Other tenant','alice / R2','P1 · deny','No',false]",
    "['After revocation','alice / R1','P2 · deny','No',false]",
    "['Engine offline','alice / R1','Unavailable','No',false]",
  ]) {
    if (!visuals.includes(normalize(row))) throw new Error('Diagram differs from program: ' + row);
  }
  const out = resolve(root, '.local/software-externalized-authorization');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'code-checks.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(
    'Both article files, strict decisions/obligations, no denied body reads, shared policy changes and failure/freshness boundaries verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
