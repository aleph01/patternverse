import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/lease.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-lease-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['lease.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'renewed until ms: 5000',
    'B at 4999 ms: busy',
    'A at 5000 ms: expired',
    'replacement: B 2',
    'old release: rejected',
    'next acquisition: 3',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from lease import Busy, LostLease, Grant, LeaseSlot
from dataclasses import FrozenInstanceError
from copy import deepcopy
from itertools import product


def fails(error, call):
    try: call()
    except error: return
    raise AssertionError("Expected " + error.__name__)


def state(slot):
    return deepcopy(vars(slot))

s=LeaseSlot();a=s.acquire("A",3000)
assert a==Grant("A",1)
s.advance(2000);assert s.renew(a,3000)==5000
s.advance(2999);before=state(s)
fails(Busy,lambda:s.acquire("B",3000));assert state(s)==before
s.advance(1);before=state(s)
fails(LostLease,lambda:s.renew(a,3000));assert state(s)==before
fails(LostLease,lambda:s.release(a));assert state(s)==before
b=s.acquire("B",3000);assert b==Grant("B",2)
before=state(s)
for action in [lambda:s.renew(a,3000),lambda:s.release(a),lambda:s.release(Grant("B",1)),lambda:s.renew(Grant("OTHER",2),3000)]:
    fails(LostLease,action);assert state(s)==before
s.release(b);c=s.acquire("C",3000);assert c==Grant("C",3)
fails(LostLease,lambda:s.release(b));assert s._grant==c
fails(FrozenInstanceError,lambda:setattr(a,"owner","B"))

# Reusing a worker name does not reuse its acquisition identity.
s=LeaseSlot();old=s.acquire("A",10);s.release(old);new=s.acquire("A",10)
assert new.owner==old.owner and new.lease_id!=old.lease_id
before=state(s)
fails(LostLease,lambda:s.release(old));assert state(s)==before
fails(LostLease,lambda:s.renew(old,10));assert state(s)==before
assert s.renew(new,10)==10

# Exact TTL edges, renewal from now, and optional deliberate shortening.
for ttl in [1,60000]:
    s=LeaseSlot();a=s.acquire("A",ttl);s.advance(ttl-1)
    fails(Busy,lambda:s.acquire("B",ttl))
    s.advance(1);fails(LostLease,lambda:s.renew(a,ttl))
    assert s.acquire("B",ttl).lease_id==2
s=LeaseSlot();a=s.acquire("A",100);s.advance(1)
assert s.renew(a,100)==101
assert s.renew(a,1)==2
s.advance(1);fails(LostLease,lambda:s.renew(a,100))
# Huge forward advance expires safely; zero advance leaves state unchanged.
s=LeaseSlot();a=s.acquire("A",1);before=state(s);s.advance(0);assert state(s)==before
s.advance(10**30);assert s.acquire("B",1).lease_id==2

# Validation errors leave authority time, deadline, serial, and grant untouched.
for ttl in [0,-1,60001,True,False,1.0,"1",None,float('inf'),float('nan')]:
    s=LeaseSlot();a=s.acquire("A",10);before=state(s)
    fails(ValueError,lambda:s.acquire("B",ttl));assert state(s)==before
    fails(ValueError,lambda:s.renew(a,ttl));assert state(s)==before
for owner in ["","  ",None,1,False,[]]:
    s=LeaseSlot();before=state(s)
    fails(ValueError,lambda:s.acquire(owner,10));assert state(s)==before
for delta in [-1,True,False,0.5,"1",None,float('inf'),float('nan')]:
    s=LeaseSlot();before=state(s)
    fails(ValueError,lambda:s.advance(delta));assert state(s)==before
s=LeaseSlot();before=state(s)
for handle in [None,Grant("A",1)]:
    fails(LostLease,lambda:s.release(handle));assert state(s)==before
    fails(LostLease,lambda:s.renew(handle,10));assert state(s)==before

# Exhaust every four-step sequence over eight operations. Each call is atomic.
# This checks model lifecycle transitions, not network or thread interleavings.
operations=("acquireA","acquireB","advance0","advance1","advance2","renewA","releaseA","releaseB")
for trace in product(operations,repeat=4):
    s=LeaseSlot();handles={};last_serial=0
    for op in trace:
        before=state(s)
        try:
            if op.startswith("acquire"):
                owner=op[-1];handles[owner]=s.acquire(owner,2)
                assert before['_grant'] is None or before['_now_ms']>=before['_deadline_ms']
                assert s._serial==before['_serial']+1
                assert s._deadline_ms==s._now_ms+2
            elif op.startswith("advance"):
                s.advance(int(op[-1]))
                assert s._grant==before['_grant'] and s._deadline_ms==before['_deadline_ms']
            elif op=="renewA":
                result=s.renew(handles.get("A"),2)
                assert handles['A']==before['_grant'] and before['_now_ms']<before['_deadline_ms']
                assert result==s._now_ms+2 and s._grant==before['_grant']
            else:
                owner=op[-1];s.release(handles.get(owner))
                assert handles[owner]==before['_grant'] and before['_now_ms']<before['_deadline_ms']
                assert s._grant is None
        except (Busy,LostLease):
            assert state(s)==before
        assert s._serial>=last_serial;last_serial=s._serial
        assert s._now_ms>=before['_now_ms']
# Separate instances have independent clocks and records; references are scoped to one authority.
s=LeaseSlot();other=LeaseSlot();s.acquire("A",10);s.advance(5)
assert other._grant is None and other._now_ms==0 and other._serial==0
print("Lease boundary, identity, lifecycle, and 4096 bounded traces passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['lease.py', 'demo.py'],
    stdout: expected,
    verification:
      'Exact six-line demo output; renewal at 2000 ms resets deadline to 5000 rather than adding to the old deadline; B is denied at 4999 and A cannot renew or release at exactly 5000; replacement B survives obsolete A renewals/releases; explicit release permits immediate C acquisition; reused worker names receive distinct acquisition identities; frozen Grant values; exact 1/60000 ms TTL bounds; renewal from acceptance time including deliberate shortening; zero and huge forward time advances; invalid TTL, owner and time inputs preserve all state; no-grant and wrong-acquisition operations reject without mutation; all 4096 four-step traces over eight operations satisfy atomic acquisition, renewal, release, nondecreasing time and identity invariants; independent model instances. Trusted single-scope sequential in-memory model only, with no real clock, network, client timer, persistence, authentication, failover, automatic cancellation, external writes, or destination fencing inferred.',
  };
  const out = resolve(root, '.local/software-lease');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
