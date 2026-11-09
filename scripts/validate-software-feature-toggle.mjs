import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/feature-toggle.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-feature-toggle-'));
const checks = `
import json,subprocess,runpy
from dataclasses import FrozenInstanceError
p=subprocess.run(['python3','feature_toggle.py'],capture_output=True,text=True,timeout=5)
expected=['A-17: detailed receipt','A-17: standard receipt','provider failure: fallback']
assert p.returncode==0 and p.stdout.splitlines()==expected and not p.stderr,(p.stdout,p.stderr)
n=runpy.run_path('feature_toggle.py');Policy=n['Policy'];Decision=n['Decision'];evaluate=n['evaluate'];render=n['render_receipt']
def raises(kind,fn):
 try:fn()
 except kind:return
 raise AssertionError('Expected '+kind.__name__)
for invalid in (-1,101,20.0,True,'20',None):raises(ValueError,lambda:Policy('bad',invalid))
keys=['acct-'+str(i) for i in range(500)]
for key in keys:
 assert not evaluate(key,lambda:Policy('off',0)).enabled
 assert evaluate(key,lambda:Policy('on',100)).enabled
 before=False
 for percent in (0,1,10,20,50,99,100):
  result=evaluate(key,lambda:Policy('stable',percent))
  assert result==evaluate(key,lambda:Policy('stable',percent))
  assert not before or result.enabled
  before=result.enabled
assert not evaluate('',lambda:Policy('full',100)).enabled
assert evaluate('',lambda:Policy('full',100)).reason=='missing targeting key'
assert evaluate('acct-42',lambda:Policy('v1',20)).enabled
assert not evaluate('acct-7',lambda:Policy('v1',20)).enabled
calls=[]
def loader():calls.append(1);return Policy('v1',20)
d=evaluate('acct-42',loader);assert len(calls)==1
assert render('A-17',d)=='A-17: detailed receipt'
raises(FrozenInstanceError,lambda:setattr(d,'enabled',False))
assert not evaluate('acct-42',lambda:Policy('v2',0)).enabled and d.enabled and d.revision=='v1'
for loader in [n['unavailable'],lambda:Policy('bad',101),lambda:None]:
 result=evaluate('acct-42',loader);assert result==Decision(False,'unavailable','fallback')
# Feature execution failures propagate; configuration handling never retries rendering.
class BadOrder:
 def __format__(self,spec):raise RuntimeError('renderer failed')
raises(RuntimeError,lambda:render(BadOrder(),d))
# Hash assignment is stable across interpreter processes and hash seeds.
probe="import runpy; n=runpy.run_path('feature_toggle.py'); print(n['evaluate']('acct-42',lambda:n['Policy']('v1',20)))"
import os
for seed in ('1','77','random'):
 q=subprocess.run(['python3','-c',probe],env={**os.environ,'PYTHONHASHSEED':seed},capture_output=True,text=True,timeout=5)
 assert q.returncode==0 and q.stdout.strip()=="Decision(enabled=True, revision='v1', reason='rollout')"
text=open('feature_toggle.py').read();mutations=[]
for name,before,after in [('cohort selection reverses threshold','bucket < policy.percent','bucket > policy.percent'),('zero percent still exposes the feature','bucket < policy.percent','True'),('provider fallback silently enables new behavior','Decision(False, "unavailable", "fallback")','Decision(True, "unavailable", "fallback")')]:
 assert before in text,name
 open('mutant.py','w').write(text.replace(before,after,1));q=subprocess.run(['python3','mutant.py'],capture_output=True,text=True,timeout=5)
 assert q.returncode!=0 or q.stdout.splitlines()!=expected,name
 mutations.append({'fault':name,'detected':True})
print(json.dumps({'status':'passed','command':'python3 feature_toggle.py','output':expected,'checks':['validated integer percent0..100; reject negative/101/float/Boolean/string/None','500 stable account keys: 0percent off, 100percent on, monotonic cohort growth at seven thresholds','known bucket12 acct-42 enabled and bucket97 acct-7 disabled at20percent','one policy snapshot load per evaluation','immutable prior decision survives changed policy; next request observes revisionv2','missing targeting key disabled even at100percent','unavailable/invalid/malformed policy returns explicit disabled fallback','rendering failures propagate without automatic replay','cohort assignment stable across three process hash seeds'],'mutation_checks':mutations,'limits':['In-memory model of one flag, not an OpenFeature SDK','Nonempty string identity and declared loader failure types are preconditions','No remote propagation, authentication, persistence, atomic cross-service update or telemetry export','Cohort percentage is approximate, not a population quota']}))
`;
try {
  await writeFile(join(directory, 'feature_toggle.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 15000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const out = resolve(root, '.local/software-feature-toggle');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(JSON.parse(result.stdout), null, 2) + '\n',
  );
  console.log(
    'Stable cohorts, threshold boundaries, immutable request decisions, explicit fallbacks, renderer errors, process repeatability and three faulty variants verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
