import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(
  resolve(root, 'content/patterns/data-expand-migrate-contract.md'),
  'utf8',
);
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-expand-contract-'));
const checks = `
import json,subprocess,runpy
p=subprocess.run(['python3','parallel_change.py'],capture_output=True,text=True,timeout=5)
expected=['expanded: standard through both names','contract blocked: monthly_export remains old','contracted: premium','old interface removed']
assert p.returncode==0 and p.stdout.splitlines()==expected and not p.stderr,(p.stdout,p.stderr)
n=runpy.run_path('parallel_change.py');Expanded=n['ExpandedAccount'];V2=n['AccountV2'];old=n['old_reader'];new=n['new_reader'];contract=n['contract']
def raises(kind,fn):
 try:fn()
 except kind:return
 raise AssertionError('Expected '+kind.__name__)
a=Expanded('standard');assert old(a)==new(a)=='standard';a.customer_tier='premium';assert old(a)==new(a)=='premium';a.service_tier='standard';assert old(a)==new(a)=='standard' and 'customer_tier' not in vars(a)
for registry in [{'monthly_export':'old'},{'web':'new','replay':'unknown'},{'client':None}]:
 before=dict(registry);raises(RuntimeError,lambda:contract(a,registry));assert registry==before and old(a)==new(a)=='standard'
registry={'web':'new','monthly_export':'new'};a.customer_tier='premium';b=contract(a,registry);assert type(b)is V2 and b is not a and new(b)=='premium';raises(AttributeError,lambda:old(b));assert old(a)=='premium'
# Demonstrate explicit model limits: registry completeness and in-flight copying are not solved.
assert new(contract(a,{}))=='premium'
a.customer_tier='standard';assert new(b)=='premium' and old(a)=='standard'
# Verify the published assertions/output catch key incorrect implementations.
text=open('parallel_change.py').read();results=[]
for name,before,after in [('legacy setter stops updating canonical state','self.service_tier = value','self._obsolete_customer_tier = value'),('contraction ignores remaining old clients','if any(version != "new" for version in known_consumers.values()):','if False:'),('contraction retains old interface','return AccountV2(account.service_tier)','return account')]:
 assert before in text,name
 open('mutant.py','w').write(text.replace(before,after));q=subprocess.run(['python3','mutant.py'],capture_output=True,text=True,timeout=5)
 assert q.returncode!=0 or q.stdout.splitlines()!=expected,name
 results.append({'fault':name,'detected':True})
print(json.dumps({'status':'passed','command':'python3 parallel_change.py','output':expected,'checks':['both API names share one canonical backing value','writes through either name are visible through the other before contraction','old/unknown declared consumer versions block contraction without mutation','all declared consumers new permits current-value copy into V2','V2 intentionally lacks old reader interface','existing bridge instance still exists; contraction does not revoke references or update in-flight writes','empty registry cannot prove completeness'],'mutation_checks':results,'limits':['Sequential in-memory API model, not database schema migration','Manual registry does not discover missing consumers','Returning a new instance does not transfer later concurrent mutations','Separate versioned-backfill figure requires shared authoritative per-key revision ordering']}))
`;
try {
  await writeFile(join(directory, 'parallel_change.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const out = resolve(root, '.local/software-expand-contract');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(JSON.parse(result.stdout), null, 2) + '\n',
  );
  console.log(
    'Single backing value, declared-consumer contraction gate, removed old interface and three faulty variants verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
