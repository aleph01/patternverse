import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(
  resolve(root, 'content/patterns/data-horizontal-sharding.md'),
  'utf8',
);
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-sharding-'));
const checks = `
import contextlib,io,runpy,json,copy
output=io.StringIO()
with contextlib.redirect_stdout(output):
    module=runpy.run_path('sharding.py',run_name='__main__')
expected=['before 12 B 6 paid','stale route rejected','after 13 D 6 paid','old copy False']
assert output.getvalue().splitlines()==expected
Cluster,bucket,StaleRoute=(module[n] for n in ['Cluster','bucket','StaleRoute'])
def raises(kind, operation):
    try: operation()
    except kind: pass
    else: raise AssertionError('Expected '+kind.__name__)
for bad in [0,-1,True,False,1.5,'7',None]:
    raises(ValueError,lambda:bucket(bad))
assert [bucket(t) for t in [1,4,5,8,9,12,13,19]]==[0,3,4,7,8,11,0,6]
c=Cluster();oldversion,oldowners=c.catalog()
assert oldversion==12 and oldowners==tuple('AAAABBBBCCCC')
# Same order ID in separate tenants must not collide; shared logical bucket moves together.
for tenant in range(1,121):
    c.put(oldowners[bucket(tenant)],oldversion,tenant,'same-id','tenant-'+str(tenant))
assert sum(len(rows) for rows in c.groups.values())==120
initial=copy.deepcopy(c.groups)
c.move_bucket(6,'D');version,owners=c.catalog()
assert version==13 and owners[6]=='D' and oldowners[6]=='B'
assert all(owners[b]==oldowners[b] for b in range(12) if b!=6)
assert c.groups['D']=={k:v for k,v in initial['B'].items() if bucket(k[0])==6}
assert len(c.groups['D'])==10 and (7,'same-id') not in c.groups['B']
assert c.groups['A']==initial['A'] and c.groups['C']==initial['C']
assert sum(len(rows) for rows in c.groups.values())==120
for tenant in range(1,121):
    owner=owners[bucket(tenant)]
    assert c.get(owner,version,tenant,'same-id')=='tenant-'+str(tenant)
# Both read/write gates use current authority, not just the client's cached directory.
after=copy.deepcopy(c.groups)
for operation in [lambda:c.get('B',oldversion,7,'same-id'),lambda:c.put('B',oldversion,7,'same-id','bad'),lambda:c.get('B',version,7,'same-id'),lambda:c.put('B',version,7,'same-id','bad'),lambda:c.put('D',oldversion,7,'same-id','bad'),lambda:c.get('unknown',version,7,'same-id'),lambda:c.get('A',oldversion,1,'same-id')]:
    raises(StaleRoute,operation)
assert c.groups==after
c.put('D',version,7,'same-id','shipped')
assert c.get('D',version,7,'same-id')=='shipped'
assert c.get('D',version,19,'same-id')=='tenant-19'
raises(KeyError,lambda:c.get('D',version,7,'absent'))
# Validation failures and no-ops must not change placement, version or records.
snapshot=copy.deepcopy(c.__dict__)
for number,target in [(True,'A'),(-1,'A'),(12,'A'),('6','A'),(6,'unknown')]:
    raises(ValueError,lambda:c.move_bucket(number,target))
    assert c.__dict__==snapshot
c.move_bucket(6,'D');assert c.__dict__==snapshot
c.groups['B'][7,'same-id']='conflict';snapshot=copy.deepcopy(c.__dict__)
raises(ValueError,lambda:c.move_bucket(6,'B'));assert c.__dict__==snapshot
# An empty bucket still transfers ownership; a return move restores placement.
e=Cluster();e.move_bucket(0,'D')
assert e.catalog()[0]==13 and e.catalog()[1][0]=='D' and all(not v for v in e.groups.values())
e.move_bucket(0,'A');assert e.catalog()[0]==14 and e.catalog()[1]==tuple('AAAABBBBCCCC')
print(json.dumps({'status':'passed','output':expected,'records_preserved':120,'moved_records':10,'checks':['invalid tenant and bucket boundaries','stable twelve-bucket classification','tenant-scoped identity','all records preserved and readable after selected-bucket move','unaffected placement and records retained','stale reads and writes rejected without effects','fresh wrong-owner operations rejected','immutable catalog snapshots','global version invalidates unrelated cached routes','fresh writes reach new owner','missing row is not an empty success','invalid and no-op moves retain state','destination conflicts refused before mutation','empty bucket ownership and return move']}))
`;
try {
  await writeFile(join(directory, 'sharding.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 20000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const record = JSON.parse(result.stdout);
  const visuals = await readFile(
    resolve(root, 'scripts/build-software-sharding-visuals.mjs'),
    'utf8',
  );
  for (const label of [
    'v12: bucket 6 → B',
    'v13: bucket 6 → D',
    'Old v12 write → B: rejected',
    'Fresh v13 read → D: paid',
    'Old B copy: absent',
  ]) {
    if (!visuals.includes(label)) throw new Error('Diagram differs from program: ' + label);
  }
  const out = resolve(root, '.local/software-sharding');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'code-checks.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(
    'Actual program, routing authority, record preservation, stale operations and movement boundaries verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
