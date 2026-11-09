import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/front-controller.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected the two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-front-controller-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['dispatch.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    '200 | Bienvenue | -',
    '200 | Orders [en] | -',
    '404 | Not found | -',
    '405 | Method not allowed | GET',
    '500 | Internal error | -',
    "[('r1', 200), ('r2', 200), ('r3', 404), ('r4', 405), ('r5', 500)]",
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n')
    throw new Error('Stated demo output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from dispatch import FrontController, Request, Response
from dataclasses import FrozenInstanceError

def rejected(call, kind):
    try: call()
    except kind: return
    raise AssertionError("Expected failure")

contexts, audit, failures = [], [], []
def handler(context):
    contexts.append(context)
    return Response(202, context.language, (("X-Example", "kept"),))
controller = FrontController({("GET", "/orders"): handler}, audit, failures)
assert controller.handle(Request("GET", "/orders", "fr")) == Response(202, "fr", (("X-Example", "kept"),))
assert controller.handle(Request("GET", "/orders")).body == "en"
assert controller.handle(Request("GET", "/orders", "unsupported")).body == "en"
assert [c.request_id for c in contexts] == ["r1", "r2", "r3"]
assert contexts[0].language == "fr" and contexts[0] is not contexts[1]
rejected(lambda: setattr(contexts[0], "language", "en"), FrozenInstanceError)
# Rejected paths and methods must not invoke the selected action.
for path in ["/missing", "/orders/", "/orders?x=1", "/../orders"]:
    result = controller.handle(Request("GET", path))
    assert result == Response(404, "Not found")
    assert len(contexts) == 3
result = controller.handle(Request("POST", "/orders"))
assert result == Response(405, "Method not allowed", (("Allow", "GET"),))
assert len(contexts) == 3 and not failures
assert [status for _, status in audit] == [202, 202, 202, 404, 404, 404, 404, 405]
assert len({request_id for request_id, _ in audit}) == len(audit)

# Configuration is copied; later caller mutation cannot create a new route.
configuration = {("GET", "/"): handler}
copied = FrontController(configuration, [], [])
configuration[("POST", "/")] = handler
assert copied.handle(Request("POST", "/")).status == 405
multiple = FrontController({("POST", "/"): handler, ("GET", "/"): handler}, [], [])
assert multiple.handle(Request("PUT", "/")).headers == (("Allow", "GET, POST"),)

bad_audit, bad_failures = [], []
def broken(context): raise RuntimeError("Internal backend detail")
failed = FrontController({("GET", "/broken"): broken, ("GET", "/invalid"): lambda context: None}, bad_audit, bad_failures)
assert failed.handle(Request("GET", "/broken")) == Response(500, "Internal error")
assert failed.handle(Request("GET", "/invalid")) == Response(500, "Internal error")
assert bad_failures == [("r1", "RuntimeError"), ("r2", "TypeError")]
assert bad_audit == [("r1", 500), ("r2", 500)]
assert "Internal backend detail" not in repr(bad_failures)
assert FrontController({}, [], []).handle(Request("POST", "/")).status == 404

# Completion is neither rollback nor a guarantee that an arbitrary sink works.
effects = []
def effect(context):
    effects.append(context.request_id)
    return Response(200, "Done")
class BrokenAudit:
    def append(self, entry): raise OSError("Recorder unavailable")
broken_completion = FrontController({("GET", "/"): effect}, BrokenAudit(), [])
rejected(lambda: broken_completion.handle(Request("GET", "/")), OSError)
assert effects == ["r1"]
print("Exact dispatch, rejected-handler exclusion, Allow methods, isolated frozen context, locale fallback, copied routes, generic failures, completion, and failed-audit/no-rollback checks passed.")
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-front-controller');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['dispatch.py', 'demo.py'],
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
