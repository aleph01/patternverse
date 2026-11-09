import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/api-composition.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-api-composition-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['composition.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'O42 Mira EUR 70.00 (4, 11)',
    'O43 Sol EUR 25.00 (1, 3)',
    'O44 Mira EUR 9.00 (2, 11)',
    "batches: 2 ('C2', 'C7')",
    'rejected: Missing required identity',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from composition import compose,indexed,Order,Customer,CompositionError
from dataclasses import FrozenInstanceError
from itertools import permutations
from unittest.mock import patch
from copy import deepcopy
import asyncio


async def fails(error,call,message=None):
    try: await call()
    except error as caught:
        if message is not None: assert str(caught)==message,str(caught)
        return caught
    raise AssertionError("Expected "+error.__name__)


ORDERS=[Order("O43","C2",2500,1),Order("O44","C7",900,2),Order("O42","C7",7000,4)]
CUSTOMERS=[Customer("C7","Mira",11),Customer("C2","Sol",3)]
IDS=("O42","O43","O44")
EXPECTED=[dict(order_id="O42",customer_label="Mira",total_cents=7000,currency="EUR",observed_revisions=(4,11)),dict(order_id="O43",customer_label="Sol",total_cents=2500,currency="EUR",observed_revisions=(1,3)),dict(order_id="O44",customer_label="Mira",total_cents=900,currency="EUR",observed_revisions=(2,11))]


def adapters(order_rows=ORDERS,customer_rows=CUSTOMERS):
    calls=[]
    async def orders(ids):
        calls.append(("orders",ids));await asyncio.sleep(0);return list(order_rows)
    async def customers(ids):
        calls.append(("customers",ids));await asyncio.sleep(0);return list(customer_rows)
    return orders,customers,calls


async def main():
    original=deepcopy((ORDERS,CUSTOMERS))
    for order_rows in permutations(ORDERS):
        for customer_rows in permutations(CUSTOMERS):
            orders,customers,calls=adapters(order_rows,customer_rows)
            result=await compose(IDS,orders,customers)
            assert result==EXPECTED
            assert calls==[("orders",IDS),("customers",("C2","C7"))]
    assert (ORDERS,CUSTOMERS)==original
    orders,customers,calls=adapters()
    # Input order determines the result, not source order or sorted order IDs.
    assert [r['order_id'] for r in await compose(list(reversed(IDS)),orders,customers)]==list(reversed(IDS))
    # Result dictionaries belong to this response; DTOs and repeated-key cards are independent.
    result=await compose(IDS,orders,customers);result[0]['customer_label']="changed"
    assert result[2]['customer_label']=="Mira" and (ORDERS,CUSTOMERS)==original
    try: ORDERS[0].total_cents=0
    except FrozenInstanceError: pass
    else: raise AssertionError("Order DTO was mutable")
    try: CUSTOMERS[0].label="changed"
    except FrozenInstanceError: pass
    else: raise AssertionError("Customer DTO was mutable")

    for rows,message in [([],"Missing required identity"),([CUSTOMERS[1]],"Missing required identity"),([*CUSTOMERS,CUSTOMERS[0]],"Duplicate or unexpected identity"),([*CUSTOMERS,Customer("EXTRA","X",1)],"Duplicate or unexpected identity"),([CUSTOMERS[0]]*51,"Oversized API response")]:
        orders,customers,calls=adapters(customer_rows=rows)
        await fails(CompositionError,lambda:compose(IDS,orders,customers),message)
        assert calls==[("orders",IDS),("customers",("C2","C7"))]
    for rows,message in [([],"Missing required identity"),(ORDERS[:2],"Missing required identity"),([*ORDERS,ORDERS[0]],"Duplicate or unexpected identity"),([Order("OTHER","C2",1,1)],"Duplicate or unexpected identity"),([ORDERS[0]]*51,"Oversized API response")]:
        orders,customers,calls=adapters(order_rows=rows)
        await fails(CompositionError,lambda:compose(IDS,orders,customers),message)
        assert calls==[("orders",IDS)]

    for ids in [[],(),None,"O42",{},set(IDS),["O42"]*2,["X"+str(i) for i in range(51)],[""],["has space"],["é"],["x"*65],["x' OR 1=1--"],[None],[True],[1]]:
        orders,customers,calls=adapters()
        await fails(ValueError,lambda:compose(ids,orders,customers))
        assert calls==[]
    for budget in [0,-1,0.009,1.001,float('nan'),float('inf'),True,False,"0.2",None]:
        orders,customers,calls=adapters()
        await fails(ValueError,lambda:compose(IDS,orders,customers,budget))
        assert calls==[]
    # Accepted 1/50 records, 64-character IDs, zero cents, and boundary budgets.
    for count,budget in [(1,0.01),(50,1)]:
        ids=tuple("O"+str(i) for i in range(count))
        long_id="C"*64
        async def orders(keys):return [Order(key,long_id,0,i+1) for i,key in enumerate(reversed(keys))]
        calls=[]
        async def customers(keys):calls.append(keys);return [Customer(long_id,"Label",1)]
        result=await compose(ids,orders,customers,budget)
        assert len(result)==count and [r['order_id'] for r in result]==list(ids)
        assert calls==[(long_id,)] and all(r['total_cents']==0 for r in result)
    key="O"*64
    async def one_order(ids):return [Order(key,"C7",1,1)]
    async def one_customer(ids):return [Customer("C7","Mira",1)]
    assert (await compose((key,),one_order,one_customer))[0]['order_id']==key

    # One deadline context covers both dependent calls, with no budget reset.
    orders,customers,calls=adapters()
    original_timeout=asyncio.timeout
    with patch('composition.asyncio.timeout',wraps=original_timeout) as timeout:
        assert await compose(IDS,orders,customers,0.3)==EXPECTED
        timeout.assert_called_once_with(0.3)
    # Real expiration during a dependent read runs adapter cleanup before returning an error.
    cleanup=[]
    async def blocked_customers(ids):
        try: await asyncio.Event().wait()
        finally: cleanup.append("customers closed")
    orders,_,calls=adapters()
    caught=await fails(CompositionError,lambda:compose(IDS,orders,blocked_customers,0.02),"Read timed out")
    assert isinstance(caught.__cause__,TimeoutError) and cleanup==["customers closed"]
    cleanup=[];customers_called=[]
    async def blocked_orders(ids):
        try: await asyncio.Event().wait()
        finally: cleanup.append("orders closed")
    async def not_reached(ids):customers_called.append(ids);return CUSTOMERS
    await fails(CompositionError,lambda:compose(IDS,blocked_orders,not_reached,0.02),"Read timed out")
    assert cleanup==["orders closed"] and customers_called==[]
    # A transport timeout may occur before the total budget; the error does not invent a cause.
    async def upstream_timeout(ids):raise TimeoutError("adapter deadline")
    await fails(CompositionError,lambda:compose(IDS,upstream_timeout,not_reached),"Read timed out")

    # Transport errors fail the whole required query; unknown errors propagate.
    async def unavailable(ids):raise ConnectionError("service unavailable")
    orders,customers,calls=adapters()
    caught=await fails(CompositionError,lambda:compose(IDS,orders,unavailable),"Dependency unavailable")
    assert isinstance(caught.__cause__,ConnectionError)
    await fails(CompositionError,lambda:compose(IDS,unavailable,customers),"Dependency unavailable")
    async def bad_adapter(ids):raise RuntimeError("adapter bug")
    await fails(RuntimeError,lambda:compose(IDS,orders,bad_adapter))

    # External cancellation remains cancellation, with resource cleanup and no surviving task.
    started=asyncio.Event();cleanup=[]
    async def cancellable_orders(ids):
        started.set()
        try:await asyncio.Event().wait()
        finally:cleanup.append("cancelled request closed")
    task=asyncio.create_task(compose(IDS,cancellable_orders,not_reached,1))
    await started.wait();task.cancel()
    try:await task
    except asyncio.CancelledError:pass
    else:raise AssertionError("Cancellation was converted into a successful result")
    assert task.cancelled() and cleanup==["cancelled request closed"]
    assert not [t for t in asyncio.all_tasks() if t is not asyncio.current_task() and not t.done()]

    # Owner-local revisions can differ; composition does not claim a common snapshot.
    async def older_orders(ids):return [Order("O42","C7",7000,4)]
    async def newer_customer(ids):return [Customer("C7","Updated label",99)]
    card=(await compose(("O42",),older_orders,newer_customer))[0]
    assert card['observed_revisions']==(4,99) and card['customer_label']=="Updated label"
    assert (ORDERS,CUSTOMERS)==original

asyncio.run(main())
print("API Composition identity, completeness, deadline, cancellation, and bounds checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['composition.py', 'demo.py'],
    stdout: expected,
    verification:
      'Exact demo output and EUR cent formatting; all order/customer response permutations join by identity, deduplicate shared C7 into one customer batch, and preserve requested card order; response objects and frozen DTOs remain independent/unmutated; missing, duplicate, unexpected, or oversized identities fail the required query; invalid requests/budgets call no APIs; exact 1/50-row, 64/65-character, zero-cent DTO, and 0.01/1-second budget boundaries; one timeout context spans both dependent calls; real expiration during either read runs cleanup and returns a typed timeout error, while an adapter-local timeout is not mislabeled as solely the total deadline; transport errors fail required composition and unknown errors propagate; external cancellation propagates with request cleanup and no surviving task; differing owner-local revisions are preserved without implying a shared snapshot. Validated DTO fields/authorized labels are adapter preconditions. No HTTP, response decoder, credentials, retry loop, storage, cache, parallel fan-out, or distributed snapshot test is inferred.',
  };
  const out = resolve(root, '.local/software-api-composition');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
