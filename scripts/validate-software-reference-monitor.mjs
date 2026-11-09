import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/reference-monitor.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-reference-monitor-'));
const checks = `
import contextlib,io,runpy,json
from threading import Event,Lock
from concurrent.futures import ThreadPoolExecutor
output=io.StringIO()
with contextlib.redirect_stdout(output):
    module=runpy.run_path('reference_monitor.py',run_name='__main__')
expected=['read A totals','export A totals','reader-export denied','cross-tenant denied','revoked denied','unavailable denied']
assert output.getvalue().splitlines()==expected
AccessModel=module['AccessModel']
assert module['model'].decisions()==((1,'alice','read','R1',True),(1,'auditor','export','R1',True),(1,'alice','export','R1',False),(1,'alice','read','R2',False),(2,'alice','read','R1',False),(3,'auditor','export','R1',False))
def raises(kind,operation):
    try:operation()
    except kind as e:return e
    raise AssertionError('Expected '+kind.__name__)
class Bodies(dict):
    def __init__(self,source):super().__init__(source);self.reads=[]
    def __getitem__(self,key):self.reads.append(key);return super().__getitem__(key)
m=AccessModel();bodies=Bodies(m._bodies);m._bodies=bodies
for subject in ['alice','auditor','unknown']:
    for action in ['read','export','delete']:
        for resource in ['R1','R2','missing']:
            permitted=(subject,action,resource) in [('alice','read','R1'),('auditor','export','R1')]
            if permitted:assert m.access(subject,action,resource)=='A totals'
            else:assert str(raises(PermissionError,lambda:m.access(subject,action,resource)))=='denied'
assert len(m.decisions())==27 and sum(row[-1] for row in m.decisions())==2
assert bodies.reads==['R1','R1']  # Denial cannot fetch a protected body.
assert all(len(row)==5 and row[0]==1 for row in m.decisions())
assert 'A totals' not in repr(m.decisions()) and 'B totals' not in repr(m.decisions())
# Normalization rejects malformed request records before policy/storage access.
class Text(str):pass
snapshot=m.decisions();reads=list(bodies.reads)
for index in range(3):
    for bad in [None,False,1,[],{},'',Text('alice')]:
        request=['alice','read','R1'];request[index]=bad
        raises(PermissionError,lambda:m.access(*request))
        assert m.decisions()==snapshot and bodies.reads==reads
# An accidental unknown-action grant cannot bypass the operation whitelist.
m._grants['unknown','delete']=frozenset({'A'})
raises(PermissionError,lambda:m.access('unknown','delete','R1'));assert bodies.reads==reads
# Revocation affects the next operation; it does not alter earlier returned information.
m=AccessModel();copy=m.access('alice','read','R1');audit_snapshot=m.decisions()
m.revoke('alice','read');raises(PermissionError,lambda:m.access('alice','read','R1'))
assert m.decisions()[-1]==(2,'alice','read','R1',False) and copy=='A totals'
assert m.access('auditor','export','R1')=='A totals'
assert audit_snapshot==((1,'alice','read','R1',True),)
def mutate_snapshot():
    audit_snapshot[0]=()
raises(TypeError,mutate_snapshot)
assert type(audit_snapshot) is tuple and all(type(row) is tuple for row in audit_snapshot)
m.set_policy_available(False)
raises(PermissionError,lambda:m.access('auditor','export','R1'));assert m.decisions()[-1][0]==3
m.set_policy_available(True);assert m.access('auditor','export','R1')=='A totals'
raises(PermissionError,lambda:m.access('alice','read','R1'));assert m.decisions()[-1][0]==4
before=(m._version,m._available,m.decisions())
for bad in [None,0,1,'true',[]]:
    raises(ValueError,lambda:m.set_policy_available(bad));assert (m._version,m._available,m.decisions())==before
# Faults in trusted model components propagate; no permissive fallback reads a body.
class BrokenPolicy:
    def get(self,*args):raise RuntimeError('policy failure')
class BrokenMetadata:
    def get(self,*args):raise OSError('metadata failure')
class BrokenAudit:
    def append(self,*args):raise OSError('audit failure')
for field,broken,kind in [('_grants',BrokenPolicy(),RuntimeError),('_tenants',BrokenMetadata(),OSError),('_audit',BrokenAudit(),OSError)]:
    m=AccessModel();bodies=Bodies(m._bodies);m._bodies=bodies;setattr(m,field,broken)
    raises(kind,lambda:m.access('alice','read','R1'));assert bodies.reads==[]
    assert m._lock.acquire(blocking=False);m._lock.release()
class BrokenBody:
    def __getitem__(self,key):raise OSError('body failure')
m=AccessModel();m._bodies=BrokenBody();raises(OSError,lambda:m.access('alice','read','R1'))
assert m.decisions()==((1,'alice','read','R1',True),)  # Decision record, not completion proof.
assert m._lock.acquire(blocking=False);m._lock.release()
# Real mutex contention deterministically orders authorization/body retrieval before revocation.
entered,release,contended,revoked=Event(),Event(),Event(),Event()
class ObservedLock:
    def __init__(self):self.inner=Lock()
    def __enter__(self):
        if not self.inner.acquire(blocking=False):
            contended.set();self.inner.acquire()
        return self
    def __exit__(self,*args):self.inner.release()
class GatedBodies(dict):
    def __getitem__(self,key):
        entered.set()
        if not release.wait(3):raise TimeoutError('test gate')
        assert m._version==1
        return super().__getitem__(key)
m=AccessModel();m._lock=ObservedLock();m._bodies=GatedBodies(m._bodies)
def revoke():m.revoke('alice','read');revoked.set()
pool=ThreadPoolExecutor(max_workers=2)
try:
    reader=pool.submit(m.access,'alice','read','R1');assert entered.wait(3)
    updater=pool.submit(revoke);assert contended.wait(3) and not revoked.is_set()
    release.set();assert reader.result(timeout=3)=='A totals';updater.result(timeout=3)
    assert revoked.is_set() and m._version==2
    raises(PermissionError,lambda:m.access('alice','read','R1'))
    assert m.decisions()==((1,'alice','read','R1',True),(2,'alice','read','R1',False))
finally:release.set();pool.shutdown(wait=True)
# Explicit scope limitation: same-process Python code can reach internals. This is not isolation.
m=AccessModel();assert m._bodies['R2']=='B totals'
print(json.dumps({'status':'passed','output':expected,'normalized_policy_matrix_cases':27,'permitted_matrix_cases':2,'denied_matrix_cases':25,'checks':['exact six modeled outcomes and policy versions','subject/action/resource separation and default deny','no protected-body retrieval on denied requests','malformed input and unknown operations rejected','immutable result and audit snapshots','revocation on next operation without recalling old data','policy unavailable denies and recovery preserves revocation','policy/metadata/audit faults stop before body retrieval','body errors propagate and lock releases','decision log does not imply operation completion','real event-gated mutex contention orders check/use and revocation','same-process access explicitly demonstrates missing isolation']}))
`;
try {
  await writeFile(join(directory, 'reference_monitor.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 20000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const record = JSON.parse(result.stdout);
  const visuals = (
    await readFile(resolve(root, 'scripts/build-software-reference-monitor-visuals.mjs'), 'utf8')
  ).replaceAll(/\s/g, '');
  for (const row of [
    "['alice / read R1','A totals']",
    "['auditor / export R1','A totals']",
    "['alice / export R1','denied']",
    "['alice / read R2','denied']",
    'P2 / alice read revoked',
    'P3 / policy unavailable',
    'auditor / export R1: denied',
  ]) {
    if (!visuals.includes(row.replaceAll(/\s/g, '')))
      throw new Error('Diagram differs from program: ' + row);
  }
  const out = resolve(root, '.local/software-reference-monitor');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'code-checks.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(
    'Actual simulator, access matrix, permit-only body retrieval, fail-closed faults, revocation and real lock contention verified; no isolation claim.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
