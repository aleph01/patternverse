import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/test-double.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-test-double-'));
const checks = `
import io,json,runpy,unittest,subprocess
p=subprocess.run(['python3','test_double.py'],text=True,capture_output=True,timeout=5)
assert p.returncode==0 and 'Ran 4 tests' in p.stderr and p.stderr.rstrip().endswith('OK'),p.stderr
ns=runpy.run_path('test_double.py');Tests=ns['CheckoutTests'];original=ns['checkout'];globals_=Tests.test_approval.__globals__
def run():
    return unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromTestCase(Tests))
r=run();assert r.testsRun==4 and r.wasSuccessful()
def raises(kind,fn):
    try:fn()
    except kind:return
    raise AssertionError('Expected '+kind.__name__)
g=ns['create_autospec'](ns['Gateway'],instance=True,spec_set=True)
g.charge.return_value='r-1'
assert original('O1',1,g)=='accepted:r-1';g.charge.assert_called_once_with('O1',1)
g.reset_mock();raises(ValueError,lambda:original('O1',-1,g));g.charge.assert_not_called()
raises(TypeError,lambda:g.charge('missing amount'))
raises(AttributeError,lambda:g.chrage)
raises(AttributeError,lambda:setattr(g,'unexpected',1))
# A shape check cannot establish units or business semantics.
g.charge.return_value=99
assert original('O1',1,g)=='accepted:99'
# Prove the published tests reject important incorrect implementations.
def bypass(order,cents,gateway):return 'accepted:r-17'
def zero_calls(order,cents,gateway):
    if cents==0:gateway.charge(order,cents)
    return original(order,cents,gateway)
def hides_timeout(order,cents,gateway):
    try:return original(order,cents,gateway)
    except TimeoutError:return 'declined'
def twice(order,cents,gateway):
    result=original(order,cents,gateway)
    gateway.charge(order,cents)
    return result
mutations=[]
try:
    for name,bad in [('replaces real decision with configured success',bypass),('charges invalid zero amount',zero_calls),('turns uncertain timeout into refusal',hides_timeout),('charges twice',twice)]:
        globals_['checkout']=bad;r=run();assert not r.wasSuccessful(),name
        mutations.append({'fault':name,'detected':True,'failing_tests':len(r.failures)+len(r.errors)})
finally:globals_['checkout']=original
assert run().wasSuccessful()
print(json.dumps({'status':'passed','command':'python3 test_double.py','output':'Ran 4 tests; OK','published_tests':4,'boundary_cases':['1 USD cent accepted','zero and negative cents rejected before gateway','decline returns refusal','timeout propagates as unknown outcome'],'spec_cases':['incorrect argument count rejected','misspelled method rejected','undeclared attribute assignment rejected','autospec intentionally cannot validate monetary/result semantics'],'mutation_checks':mutations,'limits':['No provider contacted or real adapter implemented','No persistence, retry, idempotency or concurrency guarantee']}))
`;
try {
  await writeFile(join(directory, 'test_double.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const out = resolve(root, '.local/software-test-double');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(JSON.parse(result.stdout), null, 2) + '\n',
  );
  console.log(
    'Published four-test program, meaningful boundaries, spec limitations and four detected faults verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
