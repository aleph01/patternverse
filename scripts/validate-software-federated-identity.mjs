import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/federated-identity.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-federated-identity-'));
const checks = `
import contextlib,io,runpy,json
from dataclasses import FrozenInstanceError,replace
output=io.StringIO()
with contextlib.redirect_stdout(output):
    module=runpy.run_path('federated_identity.py',run_name='__main__')
expected=['accounts a1 b9','north weekly totals','south denied','unlinked denied','new-email weekly totals','revoked denied']
assert output.getvalue().splitlines()==expected
Login=module['Login'];Portal=module['Portal'];NORTH=module['NORTH'];SOUTH=module['SOUTH']
def raises(kind,fn):
    try:fn()
    except kind as e:return e
    raise AssertionError('Expected '+kind.__name__)
class Reports(dict):
    def __init__(self):super().__init__(summary='weekly totals');self.reads=[]
    def __getitem__(self,key):self.reads.append(key);return super().__getitem__(key)
p=Portal();reports=Reports();p._reports=reports
north=Login(NORTH,'17','sam@example.test');south=Login(SOUTH,'17','sam@example.test')
assert p.account(north)=='a1' and p.account(south)=='b9'
links=dict(p._links);grants=dict(p._grants)
recognized=permitted=cases=0
for issuer in [NORTH,SOUTH,'https://other.example',NORTH+'/',NORTH.upper(),NORTH+'.attacker.example']:
    for subject in ['17','18','017','17 ']:
        login=Login(issuer,subject,'sam@example.test');cases+=1
        known=(issuer,subject) in [(NORTH,'17'),(SOUTH,'17')]
        if known:assert p.account(login)==('a1' if issuer==NORTH else 'b9');recognized+=1
        else:raises(PermissionError,lambda:p.account(login))
        before=len(reports.reads)
        if (issuer,subject)==(NORTH,'17'):
            assert p.summary(login)=='weekly totals';permitted+=1;assert len(reports.reads)==before+1
        else:raises(PermissionError,lambda:p.summary(login));assert len(reports.reads)==before
assert cases==24 and recognized==2 and permitted==1
assert p._links==links and p._grants==grants
# Normalized identity contract; arbitrary dictionaries or malformed keys do not become identities.
class Text(str):pass
class OtherLogin(Login):pass
bad=[None,{}, {'iss':NORTH,'sub':'17'},'token',OtherLogin(NORTH,'17','sam@example.test')]
for index in range(2):
    for value in [None,False,17,[],{},'',Text('17')]:
        fields=[NORTH,'17','sam@example.test'];fields[index]=value;bad.append(Login(*fields))
for login in bad:
    before=len(reports.reads);raises(PermissionError,lambda:p.summary(login));assert len(reports.reads)==before
# Email is not a link key, a permission or an implicit provisioning path.
for email in ['sam@example.test','new@example.test','other@example.test','']:
    n=replace(north,email=email);s=replace(south,email=email)
    assert p.account(n)=='a1' and p.account(s)=='b9'
    assert p.summary(n)=='weekly totals';raises(PermissionError,lambda:p.summary(s))
    raises(PermissionError,lambda:p.summary(Login(NORTH,'18',email)))
assert p._links==links and p._grants==grants
raises(FrozenInstanceError,lambda:setattr(north,'issuer',SOUTH))
# Report grants are local and independent of recognition and of the other account.
p._grants['b9']=frozenset({'summary'})
assert p.summary(south)=='weekly totals'
old_result=p.summary(north);p.revoke_reports('a1')
assert p.account(north)=='a1';before=len(reports.reads)
raises(PermissionError,lambda:p.summary(north));assert len(reports.reads)==before
assert p.summary(south)=='weekly totals' and old_result=='weekly totals'
p.revoke_reports('missing');assert p._links==links
# Failure in trusted local configuration must not become a permitted report read.
class Fault(dict):
    def get(self,*args):raise ConnectionError('configuration unavailable')
for field in ['_links','_grants']:
    p=Portal();p._reports=Reports();setattr(p,field,Fault())
    raises(ConnectionError,lambda:p.summary(north));assert p._reports.reads==[]
class BrokenReports(dict):
    def __getitem__(self,key):raise OSError('report unavailable')
p=Portal();p._reports=BrokenReports();raises(OSError,lambda:p.summary(north))
# A fixture can be constructed without an IdP: this program is not a login verifier.
fixture=Login(NORTH,'17','anything@example.test')
assert Portal().summary(fixture)=='weekly totals'
print(json.dumps({'status':'passed','output':expected,'identity_matrix_cases':cases,'recognized_identities':recognized,'permitted_matrix_cases':permitted,'denied_matrix_cases':cases-permitted,'malformed_identity_cases':len(bad),'checks':['issuer-qualified subject separation despite equal subject and email','exact issuer and opaque-subject matching with no normalization or email fallback','unknown identities never auto-provision','malformed/raw identity shapes deny before report retrieval','email changes preserve identity without granting another account access','local grants independent across accounts and separate from recognition','revocation affects next operation while account link and earlier returned data remain','denied operations cannot retrieve report bodies','local link/grant/report faults propagate without success fallback','immutable scalar identity fixtures','constructor is explicitly not cryptographic authentication; no IdP/protocol/session claim']}))
`;
try {
  await writeFile(join(directory, 'federated_identity.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const record = JSON.parse(result.stdout);
  const normalize = (s) => s.replaceAll(/[\s"']/g, '');
  const visuals = normalize(
    await readFile(resolve(root, 'scripts/build-software-federated-identity-visuals.mjs'), 'utf8'),
  );
  for (const row of [
    "['North / subject 17','sam@example.test','a1','Allowed',true]",
    "['South / subject 17','sam@example.test','b9','Denied',true]",
    "['North / subject 18','sam@example.test','Unlinked','Denied',false]",
    "['North / subject 17','new@example.test','a1','Allowed',true]",
    "['North / subject 17','Local grant revoked','a1','Denied',true]",
  ]) {
    if (!visuals.includes(normalize(row))) throw new Error('Diagram differs from program: ' + row);
  }
  const out = resolve(root, '.local/software-federated-identity');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'code-checks.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(
    'Actual post-validation program, issuer/subject separation, local permissions, revocation, default denial and failure boundaries verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
