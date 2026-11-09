import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(
  resolve(root, 'content/patterns/data-incremental-replacement.md'),
  'utf8',
);
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete routing simulation.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-strangler-fig-'));
const checks = `
import json,subprocess,runpy
p=subprocess.run(['python3','strangler_fig.py'],text=True,capture_output=True,timeout=5)
expected=["before: ['old catalog', 'old invoices']","during: ['new catalog', 'old invoices']","failure: no implicit fallback","after: ['new catalog', 'new invoices']"]
assert p.returncode==0 and p.stdout.splitlines()==expected and not p.stderr,(p.stdout,p.stderr)
n=runpy.run_path('strangler_fig.py');Seam=n['Seam'];endpoint=n['endpoint'];calls=n['calls']
def raises(kind,fn):
 try:fn()
 except kind:return
 raise AssertionError('Expected '+kind.__name__)
old_catalog=endpoint('old catalog',{'price_cents':2500});old_invoice=endpoint('old invoices',{'status':'open'});new_catalog=endpoint('new catalog',{'price_cents':2500});new_invoice=endpoint('new invoices',{'status':'open'})
legacy={'catalog':old_catalog,'invoices':old_invoice};s=Seam(legacy);legacy['catalog']=lambda rid:None
assert s.handle('catalog','P17')=={'id':'P17','price_cents':2500} and calls==['old catalog'];calls.clear()
initial=s.routes;s.move('catalog',new_catalog);assert initial['catalog'] is old_catalog and s.routes is not initial and s.routes['invoices'] is old_invoice
assert s.handle('catalog','P18')=={'id':'P18','price_cents':2500};assert s.handle('invoices','I9')=={'id':'I9','status':'open'};assert calls==['new catalog','old invoices'];calls.clear()
for capability in ['unknown','',None]:
 before=dict(s.routes);raises(KeyError,lambda:s.move(capability,new_catalog));raises(KeyError,lambda:s.handle(capability,'P17'));assert s.routes==before and calls==[]
for invalid in [None,{},0,'service-name']:
 before=dict(s.routes);raises(TypeError,lambda:s.move('catalog',invalid));assert s.routes==before and calls==[]
s.move('catalog',n['failed_catalog']);raises(TimeoutError,lambda:s.handle('catalog','P17'));assert calls==['failed new catalog'];calls.clear();assert s.handle('invoices','I9')['status']=='open' and calls==['old invoices'];calls.clear()
# Explicit route restoration; no claim this reconciles production data.
s.move('catalog',new_catalog);s.move('invoices',new_invoice)
for cap,key in [('catalog','P17'),('invoices','I9')]:s.handle(cap,key)
assert calls==['new catalog','new invoices'];calls.clear()
# A handler captured before handover can still finish; this is not stale-writer fencing.
captured=initial['catalog'];captured('P17');assert calls==['old catalog'];calls.clear()
assert legacy and initial  # Moving all routes does not destroy legacy objects.
# Check the displayed claims against meaningful routing defects.
text=open('strangler_fig.py').read();mutations=[]
for name,before,after in [('handover does nothing','self.routes = {**self.routes, capability: replacement}','self.routes = self.routes'),('replacement failure silently falls back','return handler(resource_id)','try:\\n            return handler(resource_id)\\n        except TimeoutError:\\n            return {"id": resource_id}'),('handover moves unrelated capability','self.routes = {**self.routes, capability: replacement}','self.routes = {key: replacement for key in self.routes}')]:
 assert before in text,name
 changed=text.replace(before,after);open('mutant.py','w').write(changed)
 p=subprocess.run(['python3','mutant.py'],capture_output=True,text=True,timeout=5)
 assert p.returncode!=0 or p.stdout.splitlines()!=expected,name
 mutations.append({'fault':name,'detected':True})
print(json.dumps({'status':'passed','command':'python3 strangler_fig.py','output':expected,'checks':['constructor copies caller routing map','catalog handover preserves invoice route and public response shape/resource ID','handover publishes a new routing map rather than mutating a captured map','unknown capability and noncallable replacement cannot change routes','selected failure propagates without legacy fallback; unmigrated invoice remains callable','both capabilities can move independently','explicit restoration is a control action, not automatic rollback','captured legacy handler still callable after handover; no fencing or retirement claim'],'mutation_checks':mutations,'limits':['No live network, data sync, distributed atomicity, auth or resource shutdown','Read-only canned endpoint fixtures, not production handlers','Stateful cohort diagram specifies requirements not implemented by the dispatcher']}))
`;
try {
  await writeFile(join(directory, 'strangler_fig.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const out = resolve(root, '.local/software-strangler-fig');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(JSON.parse(result.stdout), null, 2) + '\n',
  );
  console.log(
    'Staged dispatch, interface preservation, rejected control inputs, failure propagation and three routing faults verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
