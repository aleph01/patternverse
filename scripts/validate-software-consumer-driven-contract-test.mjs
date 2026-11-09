import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(
  resolve(root, 'content/patterns/data-consumer-driven-contract-tests.md'),
  'utf8',
);
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python simulation.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-consumer-contract-'));
const checks = `
import json,subprocess,runpy
p=subprocess.run(['python3','consumer_contract.py'],capture_output=True,text=True,timeout=5)
expected=['consumer: passed','original: compatible','added: compatible','renamed: incompatible']
assert p.returncode==0 and p.stdout.splitlines()==expected and not p.stderr,(p.stdout,p.stderr)
n=runpy.run_path('consumer_contract.py');consumer=n['consumer_test'];verify=n['verify'];reader=n['read_stock'];provider=n['inventory_api'];g=verify.__globals__;artifact=consumer();c=json.loads(artifact)
assert c['consumer_version']=='reader-3' and c['request']==['GET','/stock/S17'] and c['example']=={'sku':'S17','available':4,'unit':'EA'}
def raises(kind,fn):
    try:fn()
    except kind:return
    raise AssertionError('Expected '+kind.__name__)
verify(artifact,'original');verify(artifact,'added');raises(AssertionError,lambda:verify(artifact,'renamed'))
# Exercise the actual client with zero and non-example integer quantities.
for quantity in [0,7]:assert reader(lambda m,p:(200,json.dumps({'sku':'S17','available':quantity,'unit':'EA'})),'S17')==quantity
for bad in [None,True,False,7.0,'7']:
 raises(ValueError,lambda:reader(lambda m,p:(200,json.dumps({'sku':'S17','available':bad,'unit':'EA'})),'S17'))
raises(ValueError,lambda:reader(lambda m,p:(404,'{}'),'S17'))
raises(ValueError,lambda:reader(lambda m,p:(200,json.dumps({'sku':'S18','available':4,'unit':'EA'})),'S17'))
raises(ValueError,lambda:reader(lambda m,p:(200,json.dumps({'sku':'S17','available':4,'unit':'CASE'})),'S17'))
raises(json.JSONDecodeError,lambda:reader(lambda m,p:(200,'broken json'),'S17'))
# Wrong real consumer request cannot generate a passing artifact.
original_reader=consumer.__globals__['read_stock']
try:
 consumer.__globals__['read_stock']=lambda send,sku:send('POST','/stock/'+sku)
 raises(AssertionError,consumer)
 consumer.__globals__['read_stock']=lambda send,sku:4
 raises(AssertionError,consumer)
finally:consumer.__globals__['read_stock']=original_reader
# Verify fresh provider state and actual handler path, with quantity7 distinct from fixture4.
states=[];calls=[]
def trace(method,path,rows,variant):
 states.append(rows);calls.append([method,path,dict(rows)]);return provider(method,path,rows,variant)
try:
 g['inventory_api']=trace;verify(artifact,'original');verify(artifact,'added')
finally:g['inventory_api']=provider
assert len(states)==2 and states[0] is not states[1] and calls==[['GET','/stock/S17',{'S17':7}],['GET','/stock/S17',{'S17':7}]]
# Targeted provider candidates exercise declared matcher obligations, allowing unused fields.
def candidate(payload,status=200):
 return lambda method,path,rows,variant:(status,json.dumps(payload))
base={'sku':'S17','available':7,'unit':'EA'};rejected=0
try:
 for value in [None,True,False,7.0,'7']:
  g['inventory_api']=candidate(dict(base,available=value));raises(AssertionError,lambda:verify(artifact,'original'));rejected+=1
 for field in ['sku','available','unit']:
  data=dict(base);del data[field];g['inventory_api']=candidate(data);raises(AssertionError,lambda:verify(artifact,'original'));rejected+=1
 for field,value in [('sku','S18'),('unit','CASE')]:
  g['inventory_api']=candidate(dict(base,**{field:value}));raises(AssertionError,lambda:verify(artifact,'original'));rejected+=1
 g['inventory_api']=candidate(base,500);raises(AssertionError,lambda:verify(artifact,'original'));rejected+=1
 for quantity in [-1,0,100]:
  g['inventory_api']=candidate(dict(base,available=quantity,unused={'anything':True}));verify(artifact,'original')
finally:g['inventory_api']=provider
for field,value in [('request',['POST','/stock/S17']),('state','unknown'),('quantity_rule','any')]:
 changed=dict(c,**{field:value});raises(AssertionError,lambda:verify(json.dumps(changed),'original'))
# Version metadata is carried, but no release compatibility gate is implemented.
changed=dict(c,consumer_version='unverified-reader');verify(json.dumps(changed),'original')
print(json.dumps({'status':'passed','command':'python3 consumer_contract.py','output':expected,'actual_client_checked':True,'consumer_artifact_requires_successful_request_and_interpretation':True,'provider_path_calls':calls,'fresh_provider_state_each_verification':True,'rejected_provider_responses':rejected,'boundary_cases':['zero quantity accepted','null/bool/float/string quantities rejected','missing required fields and wrong SKU/unit rejected','non200 status rejected','malformed JSON propagates','additional unused response fields tolerated','altered request/state/matcher fails'],'explicit_limits':['integer rule alone permits negative quantities; not complete business validation','consumer version is metadata, not a deployment gate','No network, real Pact SDK, broker, persisted artifact or transport/auth verification']}))
`;
try {
  await writeFile(join(directory, 'consumer_contract.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const out = resolve(root, '.local/software-consumer-driven-contract-test');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(JSON.parse(result.stdout), null, 2) + '\n',
  );
  console.log(
    'Actual consumer/serialized contract/provider path, fresh state, extension tolerance and11 rejected responses verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
