import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/test-data-builder.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-test-data-builder-'));
const checks = `
import json,subprocess,runpy,io,contextlib,itertools
from dataclasses import FrozenInstanceError
expected=["fees: [500, 0, 1200] USD cents","notes: ['fragile'] []","negative subtotal rejected"]
p=subprocess.run(['python3','test_data_builder.py'],capture_output=True,text=True,timeout=5)
assert p.returncode==0 and p.stdout.splitlines()==expected and not p.stderr,(p.stdout,p.stderr)
ns=runpy.run_path('test_data_builder.py');B=ns['OrderBuilder'];Order=ns['Order'];fee=ns['delivery_fee']
def raises(kind,fn):
    try:fn()
    except kind:return
    raise AssertionError('Expected '+kind.__name__)
b=B();assert b.build()==Order('O17','C7','US',1000,False,[])
left,right=b.build(),b.build();assert left is not right and left.notes is not right.notes
left.notes.append('left');assert right.notes==[] and b.notes==()
a=b.with_note('gift');c=a.with_note('fragile');assert b.notes==() and a.notes==('gift',) and c.notes==('gift','fragile')
x,y=c.build(),c.build();x.notes.append('only x');assert y.notes==['gift','fragile'] and c.notes==('gift','fragile')
e=b.with_subtotal(5000).with_express();assert b.subtotal_cents==1000 and not b.express and e.express and e.subtotal_cents==5000
raises(FrozenInstanceError,lambda:setattr(b,'express',True))
# Independent explicit expected boundary values; no builder-derived oracle.
cases=0
for country in ['US','CA']:
 for express in [False,True]:
  for cents,standard in [(0,500),(1,500),(4999,500),(5000,0),(5001,0)]:
   built=B(country=country,express=express).with_subtotal(cents).build()
   assert fee(built)==(1200 if country!='US' or express else standard)
   cases+=1
for cents in [-1,-5000]:raises(ValueError,lambda:B().with_subtotal(cents).build())
# Build really invokes production constructor validation, rather than bypassing it.
original=ns['Order'];g=B.build.__globals__
class Rejected:
 def __init__(self,*args):raise RuntimeError('production constructor rejected')
try:
 g['Order']=Rejected;raises(RuntimeError,lambda:b.build())
finally:g['Order']=original
# Recipe defaults supply repeatable fixture IDs, not uniqueness.
assert b.build().order_id==b.build().order_id=='O17'
# Runtime type enforcement is explicitly upstream, not promised by annotations.
assert B(subtotal_cents=0.5).build().subtotal_cents==0.5
# Execute the published assertions against meaningful faulty versions.
mutations=[('exclusive threshold', 'order.subtotal_cents >= 5000','order.subtotal_cents > 5000'),('express loses precedence','if order.express or order.country != "US":','if order.country != "US":'),('invalid subtotal silently repaired','self.subtotal_cents, self.express, list(self.notes)','max(0, self.subtotal_cents), self.express, list(self.notes)')]
results=[]
text=open('test_data_builder.py').read()
for name,before,after in mutations:
 assert before in text,name
 changed=text.replace(before,after)
 output=io.StringIO()
 try:
  with contextlib.redirect_stdout(output):exec(compile(changed,'mutant.py','exec'),{'__name__':'__main__'})
 except AssertionError:results.append({'fault':name,'detected_by_published_assertions':True})
 else:raise AssertionError('Undetected faulty implementation: '+name)
print(json.dumps({'status':'passed','command':'python3 test_data_builder.py','output':expected,'fee_matrix_cases':cases,'amount_boundaries_USD_cents':[0,1,4999,5000,5001],'negative_amount_cases':[-1,-5000],'checks':['real Order construction and real delivery_fee','fresh object identity and nested mutable notes lists','reused builder, derived express variant and chained notes remain independent','frozen configuration rejects field assignment','production constructor failure propagates','repeatable fixture IDs are not unique','annotations do not establish runtime type validation'],'mutation_checks':results,'limits':['No I/O, storage isolation or global uniqueness','Mutable orders are not thread-safe','Tuple-of-string notes avoid generic deep-copy claim']}))
`;
try {
  await writeFile(join(directory, 'test_data_builder.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const out = resolve(root, '.local/software-test-data-builder');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(JSON.parse(result.stdout), null, 2) + '\n',
  );
  console.log(
    'Published example,20 fee cases, constructor rejection, immutable recipe/fresh lists and three detectable faults verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
