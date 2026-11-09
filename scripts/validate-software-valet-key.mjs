import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/valet-key.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-valet-key-'));
const checks = `
import contextlib,io,runpy,json,re
output=io.StringIO()
with contextlib.redirect_stdout(output):module=runpy.run_path('valet_key.py',run_name='__main__')
expected=['download archive E7','other denied','write denied','reuse archive E7','before-expiry archive E7','expired denied']
assert output.getvalue().splitlines()==expected and module['ticket'] not in output.getvalue()
Storage=module['Storage'];Broker=module['Broker'];secrets=module['secrets']
def raises(kind,fn):
    try:fn()
    except kind as e:return e
    raise AssertionError('Expected '+kind.__name__)
class Objects(dict):
    def __init__(self):super().__init__({'exports/E7.zip':b'archive E7','exports/E8.zip':b'archive E8'});self.reads=[]
    def __getitem__(self,key):self.reads.append(key);return super().__getitem__(key)
clock={'seconds':100};store=Storage(lambda:clock['seconds']);objects=Objects();store._objects=objects;broker=Broker(store)
# Issuance authorizes ownership and returns no protected bytes.
issued=denied=0
for subject in ['alice','bob','unknown']:
    for export in ['E7','E8','missing']:
        before=len(store._grants)
        if (subject,export) in [('alice','E7'),('bob','E8')]:
            key,token=broker.download(subject,export);issued+=1
            assert key=='exports/'+export+'.zip' and re.fullmatch(r'[A-Za-z0-9_-]{32}',token)
            assert store._grants[token]==(key,100,160) and len(store._grants)==before+1
        else:
            raises(PermissionError,lambda:broker.download(subject,export));denied+=1
            assert len(store._grants)==before
assert issued==2 and denied==7 and objects.reads==[]
key,token=broker.download('alice','E7');assert objects.reads==[]
cases=allowed=0
for now in [99,100,159,160,161]:
    clock['seconds']=now
    for method in ['GET','PUT','HEAD','DELETE']:
        for target in [key,'exports/E8.zip','missing']:
            cases+=1;before=len(objects.reads)
            permitted=method=='GET' and target==key and 100<=now<160
            if permitted:
                assert store.access(token,method,target)==b'archive E7';allowed+=1
            else:raises(PermissionError,lambda:store.access(token,method,target));assert len(objects.reads)==before
assert cases==60 and allowed==2 and objects.reads==[key,key]
# Malformed client fields and unknown/modified tickets never retrieve bodies.
clock['seconds']=100
class Text(str):pass
malformed=0
for index in range(3):
    for value in [None,False,1,[],{},'',Text('GET')]:
        args=[token,'GET',key];args[index]=value;malformed+=1
        before=len(objects.reads);raises(PermissionError,lambda:store.access(*args));assert len(objects.reads)==before
for unknown in ['unknown',token+'x','x'+token]:
    before=len(objects.reads);raises(PermissionError,lambda:store.access(unknown,'GET',key));assert len(objects.reads)==before
before=len(store._grants)
for index in range(2):
    for value in [None,False,1,[],{},'',Text('alice')]:
        args=['alice','E7'];args[index]=value
        raises(PermissionError,lambda:broker.download(*args))
assert len(store._grants)==before
for bad in [None,False,True,0,-1,1.0,'60',[],{}]:raises(ValueError,lambda:store.grant_download(key,bad))
for bad in [None,False,[],{},'','missing']:raises(ValueError,lambda:store.grant_download(bad,60))
assert len(store._grants)==before
# Bearer reuse has no caller parameter, use counter, or implicit individual-session revocation.
copy_of_ticket=token[:]
assert store.access(copy_of_ticket,'GET',key)==store.access(token,'GET',key)==b'archive E7'
broker._owners['E7']='bob';raises(PermissionError,lambda:broker.download('alice','E7'))
assert store.access(token,'GET',key)==b'archive E7'
# Object-key scope is not immutable-version scope.
objects[key]=b'replaced content';assert store.access(token,'GET',key)==b'replaced content'
clock['seconds']=160;raises(PermissionError,lambda:store.access(token,'GET',key));assert token in store._grants
# Collision cannot silently broaden an existing ticket.
clock['seconds']=100;original=dict(store._grants);generator=secrets.token_urlsafe
try:
    secrets.token_urlsafe=lambda count:token
    raises(RuntimeError,lambda:store.grant_download('exports/E8.zip',60))
    assert store._grants==original
finally:secrets.token_urlsafe=generator
# Clock, issuance, metadata, and body errors propagate before any false successful transfer.
def failed_clock():raise ConnectionError('clock unavailable')
s=Storage(failed_clock);raises(ConnectionError,lambda:s.grant_download(key,60));assert s._grants=={}
s=Storage(lambda:100);t=s.grant_download(key,60);s._objects=Objects();s._clock=failed_clock
raises(ConnectionError,lambda:s.access(t,'GET',key));assert s._objects.reads==[]
class Fault(dict):
    def get(self,*args):raise ConnectionError('ownership unavailable')
b=Broker(Storage(lambda:100));b._owners=Fault();raises(ConnectionError,lambda:b.download('alice','E7'));assert b._storage._grants=={}
class BrokenBodies(dict):
    def __getitem__(self,key):raise OSError('object unavailable')
s=Storage(lambda:100);t=s.grant_download(key,60);s._objects=BrokenBodies();raises(OSError,lambda:s.access(t,'GET',key))
# Privileged grant API is intentionally not a public endpoint; classes do not enforce isolation.
s=Storage(lambda:100);admin_ticket=s.grant_download('exports/E8.zip',60)
assert s.access(admin_ticket,'GET','exports/E8.zip')==b'archive E8'
print(json.dumps({'status':'passed','output':expected,'issuance_cases':issued+denied,'authorized_issuance_cases':issued,'denied_issuance_cases':denied,'scope_time_matrix_cases':cases,'allowed_matrix_cases':allowed,'denied_matrix_cases':cases-allowed,'malformed_client_field_cases':malformed,'time_boundaries_seconds':[99,100,159,160,161],'checks':['issuer authorizes owner and chooses exact key without reading bytes','storage enforces GET/exact-key/server-clock window before body retrieval','unknown/modified tickets and malformed fields deny without body reads','repeated possession-based use is allowed','expiry excludes second160 and leaves prior delivered bytes unchanged','issuer ownership change blocks new grants but does not revoke an old ticket','key-bound grant can read later replacement bytes; no immutable-version claim','invalid grant inputs and token collisions cannot add or alter grants','clock/metadata/body failures do not manufacture success','tokens are not printed','administrative issuance and same-process objects are not an authentication/isolation boundary','no expired-ledger cleanup, streaming, live cloud signing or individual revocation claim']}))
`;
try {
  await writeFile(join(directory, 'valet_key.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const record = JSON.parse(result.stdout),
    normalize = (s) => s.replaceAll(/[\s"']/g, '');
  const visuals = normalize(
    await readFile(resolve(root, 'scripts/build-software-valet-key-visuals.mjs'), 'utf8'),
  );
  for (const row of [
    "['Download','GET / E7',100,'archive E7',true]",
    "['Other object','GET / E8',100,'denied',false]",
    "['Wrong verb','PUT / E7',100,'denied',false]",
    "['Reuse','GET / E7',100,'archive E7',true]",
    "['Before expiry','GET / E7',159,'archive E7',true]",
    "['At expiry','GET / E7',160,'denied',false]",
  ]) {
    if (!visuals.includes(normalize(row))) throw new Error('Diagram differs from program: ' + row);
  }
  const out = resolve(root, '.local/software-valet-key');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'code-checks.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(
    'Actual grant model, issuance, direct reads, exact scope/time boundaries, bearer reuse and failure/lifecycle limits verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
