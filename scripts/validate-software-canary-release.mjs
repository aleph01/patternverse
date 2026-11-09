import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const root = resolve(import.meta.dirname, '..');
const require = createRequire(resolve(root, 'apps/web/package.json'));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/patterns/ml-canary-rollout-with-rollback.md'),
  'utf8',
);
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-canary-release-'));
const checks = String.raw`
import json,subprocess,runpy
p=subprocess.run(['python3','canary_release.py'],capture_output=True,text=True,timeout=5)
expected=['10%: 0/10 failed; ADVANCE','25%: 3/25 failed; ROLL BACK','candidate requests already served: 35']
assert p.returncode==0 and p.stdout.splitlines()==expected and not p.stderr,(p.stdout,p.stderr)
ns=runpy.run_path('canary_release.py')
def raises(kind,fn):
 try:fn()
 except kind:return
 raise AssertionError('Expected '+kind.__name__)
def probe(n):
 W=n['Window'];m=n['measure'];g=n['gate']
 a=m(1,10);b=m(2,25);assert (a.n,a.failed,a.labeled,a.wrong,a.control_failed)==(10,0,10,0,2)
 assert (b.n,b.failed,b.labeled,b.wrong,b.control_failed)==(25,3,22,1,2)
 assert g(a)=='ADVANCE' and g(b)=='ROLL BACK'
 assert g(m(2,25,'quality'))=='ROLL BACK' and m(2,25,'quality').wrong==5
 assert g(m(1,10,'healthy',False))=='HOLD'
 assert g(W(20,1,19,1,0))=='ADVANCE' # Exactly 5% serving errors passes.
 assert g(W(20,0,20,2,0))=='ADVANCE' # Exactly 10% quality errors passes.
 assert g(W(25,0,24,0,0))=='HOLD'   # Partial labels are not complete evidence.
 assert g(W(5,1,0,0,0))=='ROLL BACK' # Known serving breach outranks too few requests/labels.
 assert g(W(10,10,0,0,0))=='ROLL BACK'
 assert g(W(0,0,0,0,2))=='HOLD' and g(W(5,0,5,0,2))=='HOLD'
 assert g(m(4,100,'healthy'))=='PROMOTE'
probe(ns)
for index in (0,-1,True,1.5):raises(ValueError,lambda:ns['measure'](index,10))
for share in (-1,101,True,1.5,'10'):raises(ValueError,lambda:ns['measure'](1,share))
raises(ValueError,lambda:ns['measure'](1,10,'unknown'))
# Replay exactly the preserved explorer's 48 supported input combinations.
def replay(scenario,start,labels,minimum,lag):
 stages=(10,25,50,100) if start==10 else (25,50,100);windows=[]
 def add(index,share,decision=None,lagged=False):
  w=ns['measure'](index,share,scenario,labels=='ready');d=decision or ns['gate'](w,minimum)
  windows.append(dict(index=index,share=share,n=w.n,failures=w.failed,controlFailures=w.control_failed,labeled=w.labeled,wrong=w.wrong,decision=d,lag=lagged));return d
 for share in stages:
  decision=add(len(windows)+1,share)
  if decision!='ADVANCE':break
 last_share=share
 if decision=='ROLL BACK' and lag:add(len(windows)+1,share,'RECOVER',True)
 return dict(decision=decision,nextShare=0 if decision=='ROLL BACK' else last_share if decision=='HOLD' else 100,total=100*len(windows),exposed=sum(w['n'] for w in windows),failures=sum(w['failures'] for w in windows),labeled=sum(w['labeled'] for w in windows),wrong=sum(w['wrong'] for w in windows),lagExposure=sum(w['n'] for w in windows if w['lag']),controlFailures=sum(w['controlFailures'] for w in windows),windows=windows)
cases=[]
for scenario in ('serving','quality','healthy'):
 for start in (10,25):
  for labels in ('ready','pending'):
   for minimum in (10,30):
    for lag in (0,1):
     args=[scenario,start,labels,minimum,lag];cases.append({'args':args,'expected':replay(*args)})
assert replay('serving',10,'ready',10,0)['exposed']==35
assert replay('serving',10,'ready',10,1)['exposed']==60 and replay('serving',10,'ready',10,1)['failures']==6
assert replay('healthy',10,'ready',10,0)['exposed']==185 and replay('healthy',10,'ready',10,0)['total']==400
text=open('canary_release.py').read();mutations=[]
for name,before,after in [('equality incorrectly breaches serving limit','w.failed * 20 > w.n','w.failed * 20 >= w.n'),('quality gate omitted','w.wrong * 10 > w.labeled','False'),('partial labels approve expansion','w.labeled != w.n - w.failed','False'),('router omits last selected request','range(1, share + 1)','range(1, share)')]:
 assert before in text,name
 open('mutant.py','w').write(text.replace(before,after,1))
 try:probe(runpy.run_path('mutant.py'))
 except AssertionError:mutations.append({'fault':name,'detected':True})
 else:raise AssertionError('Undetected fault: '+name)
print(json.dumps({'status':'passed','command':'python3 canary_release.py','output':expected,'checks':['default 10%/25% replay advances then restores after35candidate requests','candidate3/25=12% failure rate vs endpoint5/100=5%;22quality labels and1error','quality-only regression restores despite healthy serving','0requests/too few requests/missing or partial labels hold','known breach outranks missing evidence and minimum counts','exact5% serving and10% quality threshold equality passes','healthy100% stage promotes; healthy full replay185candidate/400total','one lag window yields60candidate requests and6candidate failures','invalid index/share/scenario rejected'],'mutation_checks':mutations,'cases':cases,'limits':['Deterministic fixed100request windows, not elapsed time or unique people','No statistical inference, retries, in-flight effects, capacity or state repair','Incumbent assumed warm, healthy, compatible and able to resume traffic','A hold ends replay; live exposure continues unless routing changes separately']}))
`;
try {
  await writeFile(join(directory, 'canary_release.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 15000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const record = JSON.parse(result.stdout),
    cases = record.cases;
  const widget = await readFile(
    resolve(root, 'content/assets/widgets/ml-canary-rollout-with-rollback.html'),
    'utf8',
  );
  const dom = new JSDOM(widget, { runScripts: 'dangerously' });
  try {
    for (const c of cases) {
      const report = JSON.parse(
        dom.window.eval(`JSON.stringify(simulate(...${JSON.stringify(c.args)}))`),
      );
      const actual = Object.fromEntries(
        Object.keys(c.expected)
          .filter((k) => k !== 'windows')
          .map((k) => [k, report[k]]),
      );
      actual.windows = report.windows.map((w) =>
        Object.fromEntries(Object.keys(c.expected.windows[0]).map((k) => [k, w[k]])),
      );
      if (JSON.stringify(actual) !== JSON.stringify(c.expected))
        throw new Error('Widget/Python mismatch: ' + JSON.stringify(c.args));
    }
  } finally {
    dom.window.close();
  }
  delete record.cases;
  record.widget_cross_check = {
    status: 'passed',
    combinations: cases.length,
    dimensions: [
      'serving/quality/healthy',
      '10/25% initial share',
      'ready/pending labels',
      '10/30 minimum requests',
      '0/1 lag window',
    ],
    preserved_widget_source: true,
  };
  const out = resolve(root, '.local/software-canary-release');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'code-checks.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(
    'Python gates, boundaries, quality/serving failures and four faulty variants verified; all48preserved explorer combinations match.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
