import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(
  resolve(root, 'content/patterns/data-publish-subscribe-distribution.md'),
  'utf8',
);
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-pubsub-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['broker.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'enqueued: 3 3',
    'worker-a: E901',
    'worker-b: E902',
    'analytics: E901',
    'publish E903: blocked',
    'fulfillment pending: None',
    'after unsubscribe: 2',
    'analytics next: E902',
    'fulfillment next: E903',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from broker import Broker, Message
from dataclasses import FrozenInstanceError

def rejected(call, kind):
    try: call()
    except kind: return
    raise AssertionError("Expected failure")

def drain(broker, subscription):
    values = []
    while True:
        message = broker.take(subscription)
        if message is None: return values
        values.append(message.event_id)

first, second, third = Message("E901", "O42"), Message("E902", "O43"), Message("E903", "O44")
broker = Broker(2)
for subscription in ["fulfillment", "analytics", "notifications"]: broker.subscribe("orders", subscription)
assert broker.publish("orders", first) == 3
assert broker.publish("orders", second) == 3
assert broker.take("fulfillment") == first
assert broker.take("fulfillment") == second
assert broker.take("fulfillment") is None
assert broker.take("analytics") == first
rejected(lambda: broker.publish("orders", third), OverflowError)
assert broker.take("fulfillment") is None  # Preflight prevented a partial delivery to a fast queue.
assert drain(broker, "analytics") == ["E902"]
assert drain(broker, "notifications") == ["E901", "E902"]
assert broker.publish("orders", third) == 3
assert drain(broker, "fulfillment") == ["E903"]

# Topic eligibility, absent history, and duplicate publication are independent contracts.
other = Broker(3)
assert other.publish("orders", first) == 0
other.subscribe("orders", "late")
assert other.take("late") is None
other.subscribe("other", "unrelated")
assert other.publish("orders", first) == 1
assert other.publish("orders", first) == 1
assert other.take("unrelated") is None
assert drain(other, "late") == ["E901", "E901"]
assert other.publish("orders ", second) == 0  # Exact topic matching; no trimming or wildcards.
other.publish("orders", second)
rejected(lambda: other.subscribe("other", "late"), ValueError)
assert other.take("late") == second  # A duplicate subscription cannot overwrite its backlog.
other.publish("orders", third)
other.unsubscribe("late")
other.unsubscribe("late")  # Cleanup is idempotent in this model.
rejected(lambda: other.take("late"), KeyError)
other.subscribe("orders", "late")
assert other.take("late") is None
assert other.publish("other", first) == 1
assert other.take("unrelated") == first

# A destructive take followed by worker failure has no automatic redelivery.
other.publish("orders", first)
removed = other.take("late")
assert removed == first and other.take("late") is None
rejected(lambda: setattr(removed, "order_id", "changed"), FrozenInstanceError)
for capacity in [0, -1, True, False, 1.5, "2", None]: rejected(lambda: Broker(capacity), ValueError)
for value in ["", "  ", None, 1, True]:
    rejected(lambda: Message(value, "O42"), ValueError)
    rejected(lambda: Message("E901", value), ValueError)
    rejected(lambda: other.subscribe(value, "bad"), ValueError)
    rejected(lambda: other.subscribe("orders", value), ValueError)
    rejected(lambda: other.publish(value, first), ValueError)
for value in [None, "payload", {"event_id": "E901"}]: rejected(lambda: other.publish("orders", value), TypeError)
rejected(lambda: other.take("missing"), KeyError)
assert first.event_id == "E901" and first.order_id == "O42"
print("Independent fan-out/FIFO progress, shared workers, capacity without partial enqueue, topic isolation, no history, duplicate publication, destructive loss, cleanup/deletion, immutable payload, and validation checks passed.")
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-publish-subscribe');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['broker.py', 'demo.py'],
        stdout: stdout.trimEnd().split('\n'),
        verification: verification.trim(),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
