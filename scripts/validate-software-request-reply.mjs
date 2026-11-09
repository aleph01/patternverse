import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/request-reply.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-request-reply-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['conversation.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    "answer: ('shoe', 'ok', 8)",
    "duplicate: (None, 'ignored', None)",
    "answer: ('book', 'ok', 3)",
    "expired: ('desk:3',)",
    "late: (None, 'ignored', None)",
    'pending: 0',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from conversation import Requestor, Reply, stock_reply
from dataclasses import FrozenInstanceError
from itertools import permutations

def rejected(call, kind):
    try: call()
    except kind: return
    raise AssertionError("Expected failure")

# Every order of two replies completes the correct request, not the next arrival slot.
for order in permutations(range(2)):
    c = Requestor("session", "shared.inbox")
    requests = [c.begin("book", 0), c.begin("shoe", 0)]
    answers = [stock_reply(q) for q in requests]
    for time, index in enumerate(order, 1):
        address, reply = answers[index]
        assert address == "shared.inbox"
        assert reply.correlation_id == requests[index].request_id
        assert c.accept(reply, time) == (["book", "shoe"][index], "ok", [3, 8][index])
    assert not c.pending
    assert c.accept(answers[0][1], 3) == (None, "ignored", None)

# Exact deadline is rejected even without a cleanup timer running.
for arrival, expected in [(499, "ok"), (500, "timed out"), (501, "timed out")]:
    c = Requestor("boundary", "inbox")
    request = c.begin("book", 0)
    _, reply = stock_reply(request)
    assert c.accept(reply, arrival)[1] == expected
    assert not c.pending
    assert c.accept(reply, arrival) == (None, "ignored", None)

# Expiration releases capacity, runs once, and cannot match a new request.
c = Requestor("expiry", "inbox")
a, b = c.begin("book", 0, 10), c.begin("shoe", 0, 20)
rejected(lambda: c.begin("book", 1), OverflowError)
assert c.expire(9) == ()
assert c.expire(10) == (a.request_id,)
d = c.begin("book", 10)
assert d.request_id not in [a.request_id, b.request_id]
assert c.accept(stock_reply(a)[1], 11) == (None, "ignored", None)
assert set(c.pending) == {b.request_id, d.request_id}
assert c.expire(20) == (b.request_id,)
assert c.expire(20) == ()
assert c.expire(510) == (d.request_id,)
assert not c.pending

# Unknown correlation does not consume another conversation; unknown SKU is an answer.
c = Requestor("business", "inbox")
request = c.begin("missing", 0)
assert c.accept(Reply("unrelated:1", 99), 0) == (None, "ignored", None)
assert request.request_id in c.pending
assert c.accept(stock_reply(request)[1], 1) == ("missing", "unknown SKU", None)
assert not c.pending

# Distinct fresh session namespaces and return addresses keep caller contexts separate.
left, right = Requestor("left", "left.replies"), Requestor("right", "right.replies")
l, r = left.begin("book", 0), right.begin("shoe", 0)
assert l.request_id != r.request_id
assert stock_reply(l)[0] == "left.replies" and stock_reply(r)[0] == "right.replies"
assert left.accept(stock_reply(r)[1], 1) == (None, "ignored", None)
assert l.request_id in left.pending
assert right.accept(stock_reply(r)[1], 1) == ("shoe", "ok", 8)
assert left.accept(stock_reply(l)[1], 2) == ("book", "ok", 3)
rejected(lambda: setattr(l, "sku", "mutated"), FrozenInstanceError)
reply = stock_reply(l)[1]
rejected(lambda: setattr(reply, "units", 0), FrozenInstanceError)

# Invalid configuration/clock/timeout cannot create pending entries or rewind time.
for value in ["", " ", None, 1, True]:
    rejected(lambda: Requestor(value, "inbox"), ValueError)
    rejected(lambda: Requestor("session", value), ValueError)
c = Requestor("validation", "inbox")
for value in ["", " ", None, 1, True]: rejected(lambda: c.begin(value, 0), ValueError)
for value in [0, -1, True, False, 0.5, "500", None]: rejected(lambda: c.begin("book", 0, value), ValueError)
for value in [-1, True, False, 1.5, "0", None]: rejected(lambda: c.expire(value), ValueError)
assert not c.pending and c.sequence == 0
q = c.begin("book", 100)
rejected(lambda: c.accept(stock_reply(q)[1], 99), ValueError)
rejected(lambda: c.expire(99), ValueError)
assert q.request_id in c.pending
assert c.accept(stock_reply(q)[1], 100) == ("book", "ok", 3)
print("Boundary and conversation checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['conversation.py', 'demo.py'],
    stdout: expected,
    verification:
      'Both reply order permutations, duplicate/unknown correlation, exact deadline before/at/after, expiration and released capacity, ID nonreuse, explicit return routing, isolated session contexts, unknown SKU business outcome, immutable envelopes, validation, and nondecreasing clock checks passed.',
  };
  const out = resolve(root, '.local/software-request-reply');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
