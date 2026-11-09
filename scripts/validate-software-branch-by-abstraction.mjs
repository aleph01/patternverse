import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/branch-by-abstraction.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-branch-by-abstraction-'));
const checks = `
import json,subprocess,runpy
p=subprocess.run(['python3','branch_by_abstraction.py'],capture_output=True,text=True,timeout=5)
expected=['legacy: 700 US cents; zero rejected','new: 700 US cents; zero rejected']
assert p.returncode==0 and p.stdout.splitlines()==expected and not p.stderr,(p.stdout,p.stderr)
n=runpy.run_path('branch_by_abstraction.py');compose=n['compose'];checkout=n['checkout'];preview=n['basket_preview'];Adapter=n['LegacyAdapter']
def raises(kind,fn):
 try:fn()
 except kind:return
 raise AssertionError('Expected '+kind.__name__)
for new in (False,True):
 rates=compose(new)
 for grams in range(1,10001):
  expected_cents=500+200*((grams+999)//1000-1)
  assert checkout(rates,grams)==expected_cents
  assert preview(rates,grams)==f'Shipping: {expected_cents} US cents'
 for invalid in (0,-1,-1000):raises(ValueError,lambda:checkout(rates,invalid))
class ForeignCurrency:
 def calculate(self,weight_g):return 'EUR',700
raises(ValueError,lambda:checkout(Adapter(ForeignCurrency()),1001))
class BrokenSupplier:
 def quote_cents(self,weight_g):raise RuntimeError('supplier failed')
raises(RuntimeError,lambda:checkout(BrokenSupplier(),1001))
raises(RuntimeError,lambda:preview(BrokenSupplier(),1001))
assert type(compose(False)).__name__=='LegacyAdapter' and type(compose(True)).__name__=='NewRates'
text=open('branch_by_abstraction.py').read();mutations=[]
for name,before,after in [('new engine rounds exact kilograms incorrectly','(weight_g - 1) // 1000','weight_g // 1000'),('legacy implementation accepts zero','if weight_g <= 0:','if weight_g < 0:'),('preview bypasses selected supplier','rates.quote_cents(weight_g)} US cents','500} US cents')]:
 assert before in text,name
 open('mutant.py','w').write(text.replace(before,after,1));q=subprocess.run(['python3','mutant.py'],capture_output=True,text=True,timeout=5)
 assert q.returncode!=0 or q.stdout.splitlines()!=expected,name
 mutations.append({'fault':name,'detected':True})
print(json.dumps({'status':'passed','command':'python3 branch_by_abstraction.py','output':expected,'checks':['both shared-contract callers tested for both selected suppliers','all integer weights 1 through 10000 grams match independent expected formula','exact first and subsequent kilogram boundaries','zero and negative weights rejected on both implementations','unexpected legacy currency rejected','supplier failures propagate without fallback','composition selects legacy or replacement explicitly'],'mutation_checks':mutations,'limits':['Positive integer grams are a caller precondition; annotations are not runtime validation','Pure deterministic in-memory calculation; no persistence or concurrent deployment controller','Finite tests do not prove equivalence for all possible supplier behaviors']}))
`;
try {
  await writeFile(join(directory, 'branch_by_abstraction.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const out = resolve(root, '.local/software-branch-by-abstraction');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(JSON.parse(result.stdout), null, 2) + '\n',
  );
  console.log(
    'Both implementations and callers, kilogram boundaries, invalid weights, currency and supplier failures, and three faulty variants verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
