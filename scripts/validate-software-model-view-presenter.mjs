import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/model-view-presenter.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected the two actual article code fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-mvp-'));
const run = (filename) => {
  const result = spawnSync('python3', [filename], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 15000,
  });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['booking.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = [
    'Seats left: 3 | True | Ready',
    'Seats left: 1 | True | Reserved',
    'Seats left: 1 | True | Not enough seats',
    'Seats left: 1 | True | Enter 1–3 ASCII digits',
    'Seats left: 0 | False | Reserved',
    'Seats left: 0 | False | Not enough seats',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n')
    throw new Error('Stated demo output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from booking import Booking, BookingError, ReservationPresenter, Screen
from dataclasses import FrozenInstanceError

class Recorder:
    def __init__(self): self.frames = []
    def render(self, screen): self.frames.append(screen)

def rejected(call, error_type):
    try: call()
    except error_type: return
    raise AssertionError("Expected rejection")

for capacity in [0, -1, True, False, 1.5, "3", None]:
    rejected(lambda: Booking(capacity), BookingError)
for count in [0, -1, True, False, 1.5, "1", None, 4]:
    model = Booking(3)
    rejected(lambda: model.reserve(count), BookingError)
    assert model.remaining == 3
model = Booking(3)
model.reserve(3)
assert model.remaining == 0
rejected(lambda: model.reserve(1), BookingError)
assert model.remaining == 0

model, view = Booking(3), Recorder()
presenter = ReservationPresenter(model, view)
presenter.refresh()
assert view.frames[-1] == Screen("Seats left: 3", True, "")
for raw in ["", "many", "-1", "+1", " 1", "1 ", "1.0", "１", "١", "1000", None, 1, True]:
    presenter.reserve(raw)
    assert model.remaining == 3
    assert view.frames[-1] == Screen("Seats left: 3", True, "Enter 1–3 ASCII digits")
presenter.reserve("000")
assert view.frames[-1] == Screen("Seats left: 3", True, "Positive seat count required")
presenter.reserve("002")
assert model.remaining == 1
assert view.frames[-1] == Screen("Seats left: 1", True, "Reserved")
old = view.frames[-1]
presenter.reserve("2")
assert model.remaining == 1
assert view.frames[-1] == Screen("Seats left: 1", True, "Not enough seats")
presenter.reserve("1")
assert view.frames[-1] == Screen("Seats left: 0", False, "Reserved")
presenter.reserve("1")
assert view.frames[-1] == Screen("Seats left: 0", False, "Not enough seats")
assert old == Screen("Seats left: 1", True, "Reserved")
rejected(lambda: setattr(old, "reserve_enabled", False), FrozenInstanceError)

# Another legitimate model caller requires an explicit refresh.
model2, view2 = Booking(2), Recorder()
p2 = ReservationPresenter(model2, view2)
p2.refresh()
model2.reserve(1)
assert view2.frames[-1].availability == "Seats left: 2"
p2.refresh()
assert view2.frames[-1] == Screen("Seats left: 1", True, "")
assert model.remaining == 0
assert not hasattr(view2, "model")

class UnexpectedFailure:
    def reserve(self, count): raise RuntimeError("backend unavailable")
rejected(lambda: ReservationPresenter(UnexpectedFailure(), Recorder()).reserve("1"), RuntimeError)
class BrokenView:
    def render(self, screen): raise RuntimeError("window unavailable")
m = Booking(2)
rejected(lambda: ReservationPresenter(m, BrokenView()).reserve("1"), RuntimeError)
assert m.remaining == 1  # Rendering failure is not booking rollback.
print("Boundary, independent model guards, exact view outputs, stale click, explicit refresh, frozen screen, and failure checks passed.")
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-model-view-presenter');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        code_files: ['booking.py', 'demo.py'],
        stdout: stdout.trimEnd().split('\n'),
        verification: verification.trim(),
        status: 'passed',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
