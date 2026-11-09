import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/correlation-identifier.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-correlation-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['matching.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'forwarded: relay:M9 desk:C2',
    'wrong source: None',
    "express: ('O42', 'express', 1200)",
    'duplicate: None',
    "economy: ('O42', 'economy', 500)",
    'cleanup: True',
    'late: None',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from matching import Matcher, Reply
from dataclasses import replace, FrozenInstanceError
from itertools import permutations

def rejected(call, kind):
    try: call()
    except kind: return
    raise AssertionError("Expected failure")

# Both reply orders recover distinct modes for the same business order.
for order in permutations(range(2)):
    m = Matcher("session")
    a, b = m.begin("O42", "economy", "carrier"), m.begin("O42", "express", "carrier")
    assert a.correlation_id != b.correlation_id
    assert a.message_id != a.correlation_id
    assert len(m.pending) == 2
    forwarded = replace(b, message_id="relay:M9")
    assert forwarded.correlation_id == b.correlation_id
    answers = [Reply("carrier:R1", a.correlation_id, 500), Reply("carrier:R2", forwarded.correlation_id, 1200)]
    for i in order:
        assert m.accept(answers[i], "other") is None
        assert answers[i].correlation_id in m.pending
        assert m.accept(answers[i], "carrier") == ("O42", ["economy", "express"][i], [500, 1200][i])
        assert m.accept(answers[i], "carrier") is None
    assert not m.pending

# A repeated envelope ID does not merge different conversations.
m = Matcher("same-envelope")
a, b = m.begin("O42", "economy", "carrier"), m.begin("O42", "express", "carrier")
assert m.accept(Reply("same:R", b.correlation_id, 1200), "carrier") == ("O42", "express", 1200)
assert m.accept(Reply("same:R", a.correlation_id, 500), "carrier") == ("O42", "economy", 500)

# Unknown IDs, malformed inputs, and unexpected responders preserve live state.
m = Matcher("validation")
a = m.begin("O42", "economy", "carrier")
before = dict(m.pending)
assert m.accept(Reply("R", "unknown", 0), "carrier") is None
assert m.accept(Reply("R", a.correlation_id, 0), "other") is None
rejected(lambda: m.accept(None, "carrier"), TypeError)
rejected(lambda: m.accept(Reply("R", a.correlation_id, 0), ""), ValueError)
assert m.pending == before
for value in [True, False, -1, 1.5, "500", None]:
    rejected(lambda: Reply("R", a.correlation_id, value), ValueError)
assert m.pending == before
assert m.accept(Reply("free", a.correlation_id, 0), "carrier") == ("O42", "economy", 0)

# Capacity, explicit disposal, and nonreuse after terminal state.
m = Matcher("cleanup")
a, b = m.begin("O42", "economy", "carrier"), m.begin("O42", "express", "carrier")
rejected(lambda: m.begin("O43", "economy", "carrier"), OverflowError)
assert m.forget(a.correlation_id) is True
assert m.forget(a.correlation_id) is False
assert m.forget("unknown") is False
c = m.begin("O43", "economy", "carrier")
assert c.correlation_id not in [a.correlation_id, b.correlation_id]
assert m.accept(Reply("late", a.correlation_id, 999), "carrier") is None
assert set(m.pending) == {b.correlation_id, c.correlation_id}
assert m.forget(b.correlation_id) and m.forget(c.correlation_id)
assert not m.pending

# Separate fresh session namespaces avoid cross-caller association.
left, right = Matcher("left"), Matcher("right")
a, b = left.begin("O42", "economy", "carrier"), right.begin("O42", "economy", "carrier")
assert a.correlation_id != b.correlation_id
assert left.accept(Reply("R", b.correlation_id, 500), "carrier") is None
assert a.correlation_id in left.pending
rejected(lambda: setattr(a, "correlation_id", "changed"), FrozenInstanceError)
reply = Reply("R", a.correlation_id, 500)
rejected(lambda: setattr(reply, "usd_cents", 0), FrozenInstanceError)
for value in ["", " ", None, 1, True, "a" * 129]:
    rejected(lambda: Matcher(value), ValueError)
    rejected(lambda: left.begin(value, "economy", "carrier"), ValueError)
    rejected(lambda: left.begin("O42", value, "carrier"), ValueError)
    rejected(lambda: left.begin("O42", "economy", value), ValueError)
    rejected(lambda: Reply(value, "C", 0), ValueError)
    rejected(lambda: Reply("R", value, 0), ValueError)
    rejected(lambda: left.forget(value), ValueError)
# Exact string comparison: no case folding, trimming, or guessing by business ID.
assert left.accept(Reply("R", a.correlation_id + " ", 500), "carrier") is None
assert left.accept(Reply("R", a.correlation_id.upper(), 500), "carrier") is None
assert a.correlation_id in left.pending
print("Matching and boundary checks passed")
`,
  );
  run('verify.py');
  const result = {
    status: 'passed',
    code_files: ['matching.py', 'demo.py'],
    stdout: expected,
    verification:
      'Both reply order permutations, same-order independent contexts, envelope rewrite, independent reply IDs, repeated envelope ID across conversations, unexpected-source preservation, unknown/duplicate/late replies, invalid input without context consumption, zero and invalid cents, capacity/disposal, ID nonreuse, separate fresh namespaces, exact token matching, and immutable envelopes passed.',
  };
  const out = resolve(root, '.local/software-correlation-identifier');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(stdout + result.verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
