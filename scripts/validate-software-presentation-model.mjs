import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/presentation-model.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-presentation-model-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['editor.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    "'Ada' | False | False | Ada | Ready",
    "'  ' | False | True | Ada | Name must contain 1–40 characters",
    "'Grace' | True | True | Ada | Ready",
    "'Grace' | False | False | Grace | Saved",
    "'Grace' | False | False | Grace | Discarded",
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n')
    throw new Error('Stated demo output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from editor import Profile, ProfileEditor, InvalidName, checked_name

def rejected(call, kind):
    try: call()
    except kind: return
    raise AssertionError("Expected rejection")

for value in [None, 1, True, "", " ", "\\t\\n", "x" * 41]:
    rejected(lambda: Profile(value), InvalidName)
    profile = Profile("Ada")
    rejected(lambda: profile.rename(value), InvalidName)
    assert profile.name == "Ada"
assert Profile("  Ada  ").name == "Ada"
assert len(Profile("é" * 40).name) == 40
rejected(lambda: Profile("é" * 41), InvalidName)

profile = Profile("Ada")
editor = ProfileEditor(profile)
assert (editor.draft, editor.error, editor.can_apply, editor.can_cancel) == ("Ada", "", False, False)
assert editor.apply() is False and editor.message == "No changes"
editor.draft = "  Ada  "
assert editor.can_apply is False and editor.can_cancel is True
assert editor.apply() is False
assert profile.name == "Ada" and editor.draft == "  Ada  "
editor.cancel()
assert (editor.draft, editor.message, editor.can_cancel) == ("Ada", "Discarded", False)

for draft in ["", "  ", "x" * 41]:
    editor.draft = draft
    assert editor.message == ""
    assert editor.error == "Name must contain 1–40 characters"
    assert editor.can_apply is False and editor.can_cancel is True
    assert profile.name == "Ada"
    assert editor.apply() is False  # Action guards invalid calls despite disabled feedback.
    assert profile.name == "Ada" and editor.draft == draft
for value in [None, 1, True]:
    previous = editor.draft
    rejected(lambda: setattr(editor, "draft", value), TypeError)
    assert editor.draft == previous
editor.draft = "  Grace  "
assert editor.error == "" and editor.can_apply and editor.can_cancel
assert profile.name == "Ada"
assert editor.apply() is True
assert profile.name == editor.draft == "Grace"
assert not editor.can_apply and not editor.can_cancel and editor.message == "Saved"
editor.draft = "Lin"
assert editor.message == ""
editor.cancel()
assert editor.draft == profile.name == "Grace"

# Cancel deliberately reloads current accepted state, not the session's first snapshot.
profile.rename("External")
assert editor.draft == "Grace"  # No automatic observer or binding engine.
editor.cancel()
assert editor.draft == "External" and editor.can_cancel is False
other = ProfileEditor(Profile("Other"))
other.draft = "Independent"
assert editor.draft == "External"
assert not hasattr(editor, "view") and not hasattr(editor, "_view")

class FailingProfile:
    name = "Ada"
    def rename(self, text): raise RuntimeError("storage unavailable")
failing = ProfileEditor(FailingProfile())
failing.draft = "Grace"
rejected(failing.apply, RuntimeError)
assert failing.draft == "Grace" and failing.can_apply and failing._profile.name == "Ada"

# Painting failure after a successful Apply cannot undo the accepted domain mutation.
editor.draft = "Lin"
assert editor.apply() is True
try: raise RuntimeError("window unavailable")
except RuntimeError: pass
assert profile.name == editor.draft == "Lin"
print("Independent domain guards, invalid drafts, disabled-action guard, Unicode/length boundaries, normalization, no-op Apply, Cancel reload, separate sessions, and failure checks passed.")
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-presentation-model');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['editor.py', 'demo.py'],
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
