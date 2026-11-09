import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/blue-green-deployment.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-blue-green-deployment-'));
const checks = String.raw`
import json,subprocess,runpy
p=subprocess.run(['python3','blue_green_deployment.py'],capture_output=True,text=True,timeout=5)
expected=['unready promotion blocked','requests: blue then green','drain required','compatible rollback: blue','incompatible rollback blocked']
assert p.returncode==0 and p.stdout.splitlines()==expected and not p.stderr,(p.stdout,p.stderr)
n=runpy.run_path('blue_green_deployment.py');Router=n['Router']
def raises(kind,fn):
 try:fn()
 except kind:return
 raise AssertionError('Expected '+kind.__name__)
r=Router();before=(r.active,dict(r.pending),r.next_id);raises(RuntimeError,lambda:r.route_to('green'));assert before==(r.active,r.pending,r.next_id)
r.environments['blue'].ready=False;raises(RuntimeError,r.begin);assert before==(r.active,r.pending,r.next_id);r.environments['blue'].ready=True
raises(RuntimeError,lambda:r.stop('blue'));assert not r.environments['blue'].stopped
r.environments['green'].ready=True
old=r.begin();r.route_to('green');new=r.begin();assert old!=new and r.pending=={old:'blue',new:'green'}
raises(RuntimeError,lambda:r.stop('blue'));assert not r.environments['blue'].stopped
assert r.finish(old)=='blue';raises(KeyError,lambda:r.finish(old));assert r.pending=={new:'green'}
r.route_to('blue');assert r.pending[new]=='green';raises(RuntimeError,lambda:r.stop('green'))
r.route_to('green');assert r.finish(new)=='green';r.schema=2
before=(r.active,dict(r.pending));raises(RuntimeError,lambda:r.route_to('blue'));assert before==(r.active,r.pending)
r.stop('blue');assert r.environments['blue'].stopped;r.schema=1;raises(RuntimeError,lambda:r.route_to('blue'));assert r.active=='green'
# Repeated route changes never transfer admitted request ownership.
r=Router();r.environments['green'].ready=True;owners={}
for i in range(100):
 name='blue' if i%2==0 else 'green';r.route_to(name);ticket=r.begin();owners[ticket]=name
assert r.pending==owners and len(owners)==100
for ticket,name in reversed(list(owners.items())):assert r.finish(ticket)==name
assert not r.pending;r.stop('blue');assert r.environments['blue'].stopped
text=open('blue_green_deployment.py').read();mutations=[]
for name,before,after in [('promotion skips readiness checks','self.check(name)\n        self.active = name','self.active = name'),('stop ignores in-flight work','if name == self.active or name in self.pending.values():','if name == self.active:'),('return ignores incompatible schema','self.schema not in env.schemas','False'),('new requests keep going to old environment','self.pending[self.next_id] = self.active','self.pending[self.next_id] = "blue"')]:
 assert before in text,name
 open('mutant.py','w').write(text.replace(before,after,1));q=subprocess.run(['python3','mutant.py'],capture_output=True,text=True,timeout=5)
 assert q.returncode!=0 or q.stdout.splitlines()!=expected,name
 mutations.append({'fault':name,'detected':True})
print(json.dumps({'status':'passed','command':'python3 blue_green_deployment.py','output':expected,'checks':['unready promotion and admission fail without active-route/pending/ID mutation','new requests follow current route while admitted requests retain their environment owner','cannot stop an active environment or one with outstanding requests','completion consumes the request ID once; duplicate finish raises without affecting others','compatible return to blue preserves a pending green request','schema-incompatible return fails without changing active route','stopped environment cannot be selected even after schema becomes compatible','100 alternating route changes preserve distinct request ownership through reverse-order completion'],'mutation_checks':mutations,'limits':['Sequential in-memory routing/control model; no network or concurrent control plane','Readiness and schema support are declared facts, not real probes or proof of semantic compatibility','No database operations, drain deadline, durable recovery or automatic business-effect rollback']}))
`;
try {
  await writeFile(join(directory, 'blue_green_deployment.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 15000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const out = resolve(root, '.local/software-blue-green-deployment');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(JSON.parse(result.stdout), null, 2) + '\n',
  );
  console.log(
    'Readiness, cutover ownership, draining, compatible and incompatible return, stopped targets, 100 route changes and four faulty variants verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
