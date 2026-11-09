import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/leader-election.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-leader-election-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['election.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'isolated C elected: False',
    "elected: A 1 ('A', 'B')",
    "replacement: B 2 ('B', 'C')",
    'stale A rejected',
    'stored: manifest-B',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from election import Election,Voter,Elected,Register,StaleLeader
from dataclasses import FrozenInstanceError
from copy import deepcopy
from itertools import permutations,product,combinations


def fails(error,call):
    try:call()
    except error:return
    raise AssertionError("Expected "+error.__name__)


members=("A","B","C")
e=Election(members)
assert e.quorum==2
assert e.campaign("C",1,("C",)) is None
assert e.voters["C"]==Voter(1,"C")
a=e.campaign("A",1,("A","B"))
assert a==Elected("A",1,("A","B"))
assert e.campaign("B",1,members) is None
assert e.voters=={"A":Voter(1,"A"),"B":Voter(1,"A"),"C":Voter(1,"C")}
reg=Register();reg.install(a);reg.write(a,"manifest-A")
b=e.campaign("B",2,("B","C"))
assert b==Elected("B",2,("B","C"))
assert a==Elected("A",1,("A","B"))
# Winning B alone does not update this independent destination.
reg.write(a,"old owner still eligible before handover")
assert reg.term==1 and reg.owner=="A"
fails(StaleLeader,lambda:reg.write(b,"uninstalled B"))
reg.install(b)
reg.write(b,"manifest-B")
before=deepcopy(reg)
fails(StaleLeader,lambda:reg.write(a,"manifest-A-late"))
fails(StaleLeader,lambda:reg.install(a))
fails(StaleLeader,lambda:reg.install(Elected("C",2,("A","C"))))
fails(StaleLeader,lambda:reg.write(Elected("C",3,("A","C")),"uninstalled newer term"))
assert reg==before
# Equal installed authority permits more than one write: fencing is not deduplication.
reg.install(b);assert reg==before
reg.write(b,"manifest-B-next");assert reg.value=="manifest-B-next"
reg.install(b);assert reg.value=="manifest-B-next"
fresh=Register();fails(StaleLeader,lambda:fresh.write(a,"not installed"));assert fresh==Register()
fails(FrozenInstanceError,lambda:setattr(a,"term",2))

# Lower terms are rejected; a newer term clears only that voter's earlier choice.
v=Voter();assert v.vote("A",1)
assert v.vote("A",1) and not v.vote("B",1)
before=deepcopy(v);assert not v.vote("C",0) and v==before
assert v.vote("B",2) and v==Voter(2,"B")
assert not v.vote("A",1) and not v.vote("C",2) and v==Voter(2,"B")

# Contact duplication cannot manufacture a quorum. Full configured membership defines it.
e=Election(members)
assert e.campaign("A",1,("A","A","A")) is None
assert e.quorum==2
assert e.campaign("A",1,("A","B","B"))==Elected("A",1,("A","B"))
assert len(e.campaign("A",1,members).votes)==3
# Even-sized and boundary-sized cohorts use floor(N/2)+1, not reachable count.
for count in range(1,8):
    group=tuple("N"+str(i) for i in range(count));model=Election(group)
    assert model.quorum==count//2+1
    if model.quorum>1:assert model.campaign(group[0],1,group[:model.quorum-1]) is None
    winner=model.campaign(group[0],1,group[:model.quorum])
    assert winner is not None and len(winner.votes)==model.quorum

# All distinct candidate orders and all self-containing reachable subsets for three voters:
# at most one candidate can win a given term while records are retained.
subsets={candidate:[tuple(subset) for size in range(1,4) for subset in combinations(members,size) if candidate in subset] for candidate in members}
traces=0
for order in permutations(members):
    for reaches in product(*(subsets[c] for c in order)):
        model=Election(members);winners=set()
        for candidate,reachable in zip(order,reaches):
            result=model.campaign(candidate,1,reachable)
            if result:winners.add(result.candidate)
        assert len(winners)<=1,(order,reaches,winners)
        traces+=1
assert traces==384,traces
# A split round can have no winner; a later term can make progress with a reachable majority.
e=Election(members)
for node in members:assert e.campaign(node,1,(node,)) is None
assert e.campaign("B",1,members) is None
assert e.campaign("B",2,members)==Elected("B",2,members)
assert e.campaign("C",1,members) is None

# Rejected configuration/request bounds leave retained voting state untouched.
for configured in [(),("A","A"),("",),(None,),(1,),tuple(str(i) for i in range(8))]:
    fails(ValueError,lambda:Election(configured))
e=Election(members);original=deepcopy(e.voters)
for term in [0,-1,True,False,1.0,"1",None]:
    fails(ValueError,lambda:e.campaign("A",term,members))
    assert e.voters==original
fails(ValueError,lambda:e.campaign("UNKNOWN",1,members));assert e.voters==original
for reachable in [(),("B","C"),("A","UNKNOWN")]:
    fails(ValueError,lambda:e.campaign("A",1,reachable));assert e.voters==original
# Separate models retain independent voter records, not shared class defaults.
other=Election(members);e.campaign("A",1,("A","B"))
assert other.voters==original
print("Leader Election term, majority, partition, and destination-handover checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['election.py', 'demo.py'],
    stdout: expected,
    verification:
      'Exact five-line demo output; isolated C cannot win; A wins A/B in term one, competing same-term B fails, and B later wins B/C in term two while A’s immutable historical result survives; newer election alone leaves old A eligible at the independent register until explicit handover; uninstalled newer claims, stale writes, stale installs, and conflicting same-term owners are rejected without mutating the register; duplicate install of current authority preserves value and repeated same-term writes remain eligible, distinguishing fencing from deduplication; lower-term vote rejection and one retained candidate per term; duplicate reachable identities count once; full-membership quorum formula for cohorts 1–7 including even sizes; 384 exhaustive three-member traces cover every candidate order and self-containing reachable subset, with at most one winner per term; split vote stalls until a later successful term; invalid membership, candidate, term, and reachability inputs preserve state; independent model instances do not share voting state. Sequential trusted same-scope model only: no real network, clocks, persistence, safe membership change, process roles, Raft log replication/freshness, authentication, or crash recovery is inferred.',
  };
  const out = resolve(root, '.local/software-leader-election');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
