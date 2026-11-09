import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/saga.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-saga-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['saga.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = ['waiting_compensation 2 1 1', 'compensated 4 1 0', 'other order: 1'];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from saga import Pool,Step,Saga,advance,Declined,Unavailable
from copy import deepcopy


def fails(error,call):
    try: call()
    except error: return
    raise AssertionError("Expected "+error.__name__)


def decline(): raise Declined("No accepted effect")

def unavailable(): raise Unavailable("Outcome uncertain")

def no_action(): pass

# The exact example's execution order and progress across a compensation pause.
stock,packing=Pool(5),Pool(1)
trace=[]; attempts=0

def reserve_stock(): stock.reserve("O42",2);trace.append("T1")
def reserve_packing(): packing.reserve("O42",1);trace.append("T2")
def carrier(): stock.reserve("O99",1);trace.append("T3 refused");decline()
def release_packing(): packing.release("O42");trace.append("C2")
def release_stock():
    global attempts
    attempts+=1
    trace.append("C1 attempt")
    if attempts==1: unavailable()
    stock.release("O42")
steps=(Step(reserve_stock,release_stock),Step(reserve_packing,release_packing),Step(carrier,no_action))
s=Saga()
assert advance(s,steps)=="waiting_compensation"
assert s.phase=="compensating" and s.done==1
assert stock.held=={"O42":2,"O99":1} and stock.available==2
assert packing.available==1 and packing.closed=={"O42"}
assert trace==["T1","T2","T3 refused","C2","C1 attempt"]
assert advance(s,steps)=="compensated" and s.done==0
assert trace==["T1","T2","T3 refused","C2","C1 attempt","C1 attempt"]
assert stock.held=={"O99":1} and stock.available==4 and packing.available==1
before=deepcopy((trace,stock,packing,s))
assert advance(s,steps)=="compensated"
assert (trace,stock,packing,s)==before

# Success is a different terminal outcome and never invokes compensation.
stock,packing=Pool(5),Pool(1)
calls=[]
steps=(Step(lambda:stock.reserve("O42",2),lambda:calls.append("C1")),Step(lambda:packing.reserve("O42",1),lambda:calls.append("C2")),Step(lambda:calls.append("T3 accepted"),no_action))
s=Saga();assert advance(s,steps)=="completed" and s.done==3
assert stock.available==3 and packing.available==0 and calls==["T3 accepted"]
assert advance(s,steps)=="completed" and calls==["T3 accepted"]

# First refusal compensates nothing; second refusal compensates only the first step.
calls=[]
steps=(Step(decline,lambda:calls.append("unneeded compensation")),Step(lambda:calls.append("unreached"),no_action))
s=Saga();assert advance(s,steps)=="compensated" and s.done==0 and calls==[]
stock=Pool(5);calls=[]
steps=(Step(lambda:stock.reserve("O42",2),lambda:(stock.release("O42"),calls.append("C1"))),Step(decline,lambda:calls.append("C2")),Step(lambda:calls.append("T3"),no_action))
s=Saga();assert advance(s,steps)=="compensated"
assert stock.available==5 and calls==["C1"]

# Forward timeout after the effect is applied is uncertain, not a business refusal.
stock=Pool(5);attempts=0;calls=[]
def lost_reply():
    global attempts
    attempts+=1
    stock.reserve("O42",2)
    if attempts==1: unavailable()
steps=(Step(lost_reply,lambda:(stock.release("O42"),calls.append("C1"))),Step(decline,no_action))
s=Saga();assert advance(s,steps)=="waiting_forward"
assert s.phase=="forward" and s.done==0 and stock.available==3 and calls==[]
assert advance(s,steps)=="compensated"
assert attempts==2 and stock.available==5 and calls==["C1"]

# A forward outage before effect does not spin or compensate a known earlier step.
stock,packing=Pool(5),Pool(1);attempts=0

def try_packing():
    global attempts
    attempts+=1
    if attempts<=2: unavailable()
    packing.reserve("O42",1)
steps=(Step(lambda:stock.reserve("O42",2),lambda:stock.release("O42")),Step(try_packing,lambda:packing.release("O42")))
s=Saga()
for expected_attempts in [1,2]:
    assert advance(s,steps)=="waiting_forward"
    assert s.done==1 and s.phase=="forward" and stock.available==3 and packing.available==1
    assert attempts==expected_attempts
assert advance(s,steps)=="completed" and stock.available==3 and packing.available==0

# Lost compensation reply: repeat releases no extra capacity and preserves O99.
stock=Pool(5);stock.reserve("O99",1);attempts=0

def lost_release_reply():
    global attempts
    attempts+=1
    stock.release("O42")
    if attempts==1: unavailable()
steps=(Step(lambda:stock.reserve("O42",2),lost_release_reply),Step(decline,no_action))
s=Saga();assert advance(s,steps)=="waiting_compensation"
assert s.phase=="compensating" and s.done==1 and stock.available==4 and stock.held=={"O99":1}
assert advance(s,steps)=="compensated" and attempts==2 and stock.available==4
assert stock.held=={"O99":1}

# Unknown programming/provider errors propagate instead of triggering blind compensation.
stock=Pool(5);calls=[]
def unexpected(): raise RuntimeError("Needs investigation")
steps=(Step(lambda:stock.reserve("O42",2),lambda:calls.append("compensated")),Step(unexpected,no_action))
s=Saga();fails(RuntimeError,lambda:advance(s,steps))
assert s.phase=="forward" and s.done==1 and calls==[] and stock.available==3

# Local participant rules: repeat same identity, reject conflicting payload, preserve others.
p=Pool(5);p.reserve("O42",2);before=deepcopy(p)
p.reserve("O42",2);assert p==before
fails(ValueError,lambda:p.reserve("O42",3));assert p==before
p.reserve("O99",1);p.release("O42");assert p.available==4 and p.held=={"O99":1}
before=deepcopy(p);p.release("O42");assert p==before
fails(Declined,lambda:p.reserve("O42",2));assert p==before
# Close-before-reserve guards a late forward request, too.
p.release("LATE");before=deepcopy(p)
fails(Declined,lambda:p.reserve("LATE",1));assert p==before

for capacity in [0,-1,1001,True,False,1.0,"5",None]: fails(ValueError,lambda:Pool(capacity))
for capacity in [1,1000]:
    p=Pool(capacity);p.reserve("FULL",capacity);assert p.available==0
    fails(Declined,lambda:p.reserve("OTHER",1));assert p.available==0
    p.release("FULL");assert p.available==capacity
p=Pool(1000)
for quantity in [0,-1,1001,True,False,1.0,"1",None]:
    before=deepcopy(p);fails(ValueError,lambda:p.reserve("INVALID",quantity));assert p==before
# Separate participant ledgers and separate coordinator objects do not share defaults.
a,b=Pool(5),Pool(1);a.reserve("O42",2);b.reserve("O42",1)
a.release("O42");assert a.available==5 and b.available==0 and b.closed==set()
x,y=Saga(),Saga();x.done=1;assert y.done==0 and y.phase=="forward"
print("Saga forward, compensation, uncertainty, identity, and boundary checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['saga.py', 'demo.py'],
    stdout: expected,
    verification:
      'Exact demo output and trace T1/T2/T3 refusal/C2/C1 pause/C1 resume; pending compensation retains done=1, completed compensation is not rerun, and unrelated O99 remains held with four mugs available; terminal compensated calls are inert; successful forward completion invokes no compensation and is separately terminal; first/second-step refusal compensates only accepted earlier work; uncertain forward response after effect retries the same identity without double reservation or blind compensation; unavailable-before-effect pauses after one attempt and resumes on the same plan/state; compensation response lost after release can be retried without adding capacity; unexpected errors propagate without pretending recovery succeeded; repeated reserve/release, conflicting identity payload, closed-key late-request rejection, independent ledgers, and exact 1/1000 capacity/quantity boundaries. Trusted nonempty string operation keys and single-caller fixed-plan ownership are preconditions. In-memory sequential simulation only: no durable crash recovery, network, concurrency, transactional database, scheduler, or production idempotency retention is inferred.',
  };
  const out = resolve(root, '.local/software-saga');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
