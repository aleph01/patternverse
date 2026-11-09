import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/competing-consumers.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-competing-consumers-'));
const checks = `
import contextlib,io,runpy,json,copy,random
output=io.StringIO()
with contextlib.redirect_stdout(output):
    module=runpy.run_path('competing_consumers.py',run_name='__main__')
expected=['in flight J1 J2','next J3','redelivered J1 4','stale ack rejected','drained True']
assert output.getvalue().splitlines()==expected
WorkQueue,Delivery=(module[n] for n in ['WorkQueue','Delivery'])
def raises(kind,operation):
    try: operation()
    except kind: pass
    else: raise AssertionError('Expected '+kind.__name__)
for jobs in [None,[],['J1'],'J1',(1,),('',),('   ',),('J1','J1'),([],),({'id':'J1'},)]:
    raises(ValueError,lambda:WorkQueue(jobs))
e=WorkQueue(());assert e.receive('A') is None and e.receive('B') is None
assert not e.ready and not e.inflight
e.disconnect('A');assert not e.ready and not e.inflight
q=WorkQueue(('J1','J2','J3'));first=q.receive('A');second=q.receive('B')
assert first.job=='J1' and second.job=='J2' and list(q.ready)==['J3']
assert set(q.inflight)=={'A','B'} and len({d.job for d in q.inflight.values()})==2
snapshot=copy.deepcopy(q.__dict__)
for worker in ['A','B','C',None,[]]:
    raises(ValueError,lambda:q.receive(worker));assert q.__dict__==snapshot
# One worker makes further progress while the other retains its job.
q.ack(second);third=q.receive('B');assert third.job=='J3' and q.inflight['A']==first
q.ack(third);assert not q.ready and q.inflight=={'A':first}
assert q.receive('B') is None  # Empty ready queue is not completed work.
q.disconnect('A');assert list(q.ready)==['J1'] and not q.inflight
q.disconnect('A');assert list(q.ready)==['J1']  # No duplicate release.
retry=q.receive('B');assert retry.job==first.job and retry.token==4
snapshot=copy.deepcopy(q.__dict__)
for bad in [first,second,third,None,Delivery(retry.token,retry.job,'A'),Delivery(999,retry.job,'B')]:
    raises(ValueError,lambda:q.ack(bad));assert q.__dict__==snapshot
q.ack(retry);snapshot=copy.deepcopy(q.__dict__)
raises(ValueError,lambda:q.ack(retry));assert q.__dict__==snapshot
assert not q.ready and not q.inflight
# Rejoining with the same worker name cannot let its old token retire new work.
q=WorkQueue(('J1',));old=q.receive('A');q.disconnect('A');new=q.receive('A')
assert new.job==old.job and new.token!=old.token
raises(ValueError,lambda:q.ack(old));assert q.inflight['A']==new
q.ack(new);assert not q.ready and not q.inflight
# Randomized bounded interleavings conserve every job across ready/owned/acked states.
for seed in range(12):
    rng=random.Random(seed);jobs=tuple('J'+str(n) for n in range(50));q=WorkQueue(jobs)
    acknowledged=set();tokens=set();retired=[]
    for step in range(500):
        worker=rng.choice(('A','B'))
        if worker in q.inflight:
            delivery=q.inflight[worker]
            if rng.randrange(4)==0:
                retired.append(delivery);q.disconnect(worker)
            else:
                q.ack(delivery);assert delivery.job not in acknowledged;acknowledged.add(delivery.job)
        else:
            delivery=q.receive(worker)
            if delivery is not None:
                assert delivery.token not in tokens;tokens.add(delivery.token)
        active=[d.job for d in q.inflight.values()];all_jobs=list(q.ready)+active+list(acknowledged)
        assert len(all_jobs)==len(set(all_jobs))==len(jobs) and set(all_jobs)==set(jobs)
        assert len(q.inflight)<=2
    # Finish outstanding work, then drain any remainder, without simulated new failures.
    for delivery in list(q.inflight.values()):
        q.ack(delivery);assert delivery.job not in acknowledged;acknowledged.add(delivery.job)
    while q.ready:
        delivery=q.receive('A');q.ack(delivery)
        assert delivery.job not in acknowledged;acknowledged.add(delivery.job)
    assert acknowledged==set(jobs) and not q.inflight
    for delivery in retired:raises(ValueError,lambda:q.ack(delivery))
print(json.dumps({'status':'passed','output':expected,'scheduled_interleavings':12,'jobs_per_interleaving':50,'checks':['invalid and duplicate message IDs','empty batch','exclusive outstanding delivery per worker','distinct jobs held simultaneously in modeled time','continued progress while another consumer holds work','queue emptiness differs from drained delivery state','disconnection returns unacknowledged job once','fresh token with stable logical identity','stale and wrong-current acknowledgments rejected without effects','duplicate acknowledgment refused','same worker-name reuse does not revive old token','job conservation under randomized bounded interleavings','all deliveries drained after recovery']}))
`;
try {
  await writeFile(join(directory, 'competing_consumers.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 20000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const record = JSON.parse(result.stdout);
  const visuals = await readFile(
    resolve(root, 'scripts/build-software-competing-consumers-visuals.mjs'),
    'utf8',
  );
  for (const label of [
    'Holds J1 / token 1',
    'Holds J2 / token 2',
    'Delivery token 1',
    'New delivery token 4',
    'Old token 1: rejected',
    'Current token 4: accepted',
  ]) {
    if (!visuals.includes(label)) throw new Error('Diagram differs from program: ' + label);
  }
  const out = resolve(root, '.local/software-competing-consumers');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'code-checks.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(
    'Actual program, exclusive assignment, interleaved progress, redelivery, stale tokens and job conservation verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
