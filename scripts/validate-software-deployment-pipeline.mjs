import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..'),
  s = await readFile(resolve(root, 'content/patterns/deployment-pipeline.md'), 'utf8');
const code = [...s.matchAll(/```python\n([\s\S]*?)\n```/g)];
if (code.length !== 1) throw Error('Expected one program');
const dir = await mkdtemp(join(tmpdir(), 'pipeline-'));
try {
  await writeFile(join(dir, 'deployment_pipeline.py'), code[0][1] + '\n');
  await writeFile(
    join(dir, 'check.py'),
    String.raw`
import runpy,subprocess,json
p=subprocess.run(['python3','deployment_pipeline.py'],capture_output=True,text=True)
expected=['production: build-42; tested bytes preserved','changed artifact blocked']
assert p.returncode==0 and p.stdout.splitlines()==expected and not p.stderr
n=runpy.run_path('deployment_pipeline.py');A=n['Artifact'];E=n['Evidence'];validate=n['validate'];promote=n['promote']
def raises(kind,fn):
 try:fn()
 except kind:return
 raise AssertionError('Expected '+kind.__name__)
a=A('build-42',b'{"currency":"USD","fee_cents":125}');e=validate(a)
for payload in [b'no JSON',b'{"currency":"EUR","fee_cents":125}',b'{"currency":"USD","fee_cents":-1}',b'{"currency":"USD","fee_cents":true}',b'{"currency":"USD","fee_cents":126}']:
 raises(ValueError,lambda:validate(A('bad',payload)))
for candidate,evidence,approved,kind in [(A('build-42',a.payload+b' '),e,True,ValueError),(a,E(e.digest,frozenset({'unit'})),True,ValueError),(a,e,False,PermissionError)]:
 state={'current':b'previous'};raises(kind,lambda:promote(candidate,evidence,state,approved));assert state=={'current':b'previous'}
state={};promote(a,e,state,True);assert state['current']==a.payload;promote(a,e,state,True);assert state['current']==a.payload
text=open('deployment_pipeline.py').read();mutations=[]
for name,before,after in [('identity check removed','evidence.digest != artifact.digest','False'),('required checks ignored','not {"unit", "acceptance"} <= evidence.passed','False'),('approval ignored','not approved','False')]:
 open('mutant.py','w').write(text.replace(before,after,1));m=runpy.run_path('mutant.py');state={}
 args=(A('same',a.payload+b' '),e,True) if name.startswith('identity') else (a,E(e.digest,frozenset()),True) if name.startswith('required') else (a,e,False)
 try:m['promote'](args[0],args[1],state,args[2])
 except (ValueError,PermissionError):raise AssertionError('Mutant did not remove intended guard')
 assert state;mutations.append({'fault':name,'guard_absence_detected':True})
print(json.dumps({'status':'passed','output':expected,'checks':['actual JSON unit and acceptance checks','bad JSON, wrong currency, negative/Boolean fee and wrong total rejected','changed bytes with same name cannot borrow evidence','incomplete evidence and missing approval preserve previous deployment','successful promotion preserves exact bytes; repeated promotion is stable'],'mutation_checks':mutations,'limits':['In-memory configuration model only','Hash equality does not authenticate artifact or evidence','Boolean approval is not authorization; no remote deployment, concurrency or state repair']}))
`,
  );
  const r = spawnSync('python3', ['check.py'], { cwd: dir, encoding: 'utf8', timeout: 10000 });
  if (r.status !== 0) throw Error(r.stderr || r.stdout);
  await writeFile(
    resolve(root, '.local/software-deployment-pipeline/code-checks.json'),
    JSON.stringify(JSON.parse(r.stdout), null, 2) + '\n',
  );
  console.log(
    'Artifact identity, actual checks, approval, failure preservation and three missing-guard variants verified.',
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
