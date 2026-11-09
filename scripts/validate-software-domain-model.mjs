import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'domain-model');
const article = await readFile(resolve(root, 'content/patterns/domain-model.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, itertools, json, pathlib, runpy, sys, tempfile
from dataclasses import FrozenInstanceError
examples = json.load(sys.stdin)
assert set(examples) == {'model.py', 'demo.py'}
tree = ast.parse(examples['model.py'])
assert {n.module for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)} == {'dataclasses'}
assert not any(isinstance(n, (ast.Import, ast.Global, ast.Nonlocal)) for n in ast.walk(tree))
assert not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
               and n.func.id in {'open', 'print', 'input', 'eval', 'exec', '__import__'}
               for n in ast.walk(tree))

def raises(kind, action):
    try:
        action()
    except kind as error:
        return error
    raise AssertionError('Expected ' + kind.__name__)

def snapshot(workshop):
    return workshop.bookings, workshop.remaining, workshop.registration_open

def invariant(workshop, capacity):
    records = workshop.bookings
    assert isinstance(records, tuple)
    assert len({r.reference for r in records}) == len(records)
    assert all(type(r.seats) is int and r.seats > 0 for r in records)
    total = sum(r.seats for r in records)
    assert 0 <= total <= capacity
    assert workshop.remaining == capacity - total

with tempfile.TemporaryDirectory(prefix='patternverse-domain-model-') as directory:
    for filename, source in examples.items():
        pathlib.Path(directory, filename).write_text(source)
    sys.path.insert(0, directory)
    model = importlib.import_module('model')
    Workshop, Reservation = model.Workshop, model.Reservation
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        demo = runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == 'remaining 1\\nNot enough seats\\nbooked b remaining 0\\n'
    invariant(demo['workshop'], 3)
    assert not demo['workshop'].registration_open
    for bad in [0, -1, 1.5, True, '3', None]:
        raises(ValueError, lambda: Workshop(bad))
        raises(ValueError, lambda: Reservation('a', bad))
    for bad in ['', '  ', 3, None]:
        raises(ValueError, lambda: Reservation(bad, 1))
    workshop = Workshop(3)
    assert snapshot(workshop) == ((), 3, True)
    for ref, seats in [('a', 0), ('a', -1), ('a', 1.5), ('a', True), ('', 1)]:
        before = snapshot(workshop)
        raises(ValueError, lambda: workshop.reserve(ref, seats))
        assert snapshot(workshop) == before
    accepted = workshop.reserve('a', 2)
    assert accepted == Reservation('a', 2) and workshop.remaining == 1
    old_view = workshop.bookings
    raises(FrozenInstanceError, lambda: setattr(old_view[0], 'seats', 999))
    raises(AttributeError, lambda: setattr(workshop, 'bookings', (Reservation('bad', 9),)))
    raises(AttributeError, lambda: setattr(workshop, 'remaining', 999))
    for ref, seats in [('a', 1), ('b', 2)]:
        before = snapshot(workshop)
        raises(ValueError, lambda: workshop.reserve(ref, seats))
        assert snapshot(workshop) == before
    before = snapshot(workshop)
    assert raises(KeyError, lambda: workshop.cancel('missing')).args == ('missing',)
    assert snapshot(workshop) == before
    assert workshop.cancel('a') is accepted
    assert workshop.remaining == 3 and workshop.bookings == ()
    assert old_view == (Reservation('a', 2),)  # Snapshot does not become a live collection.
    workshop.reserve('b', 3)
    assert workshop.remaining == 0
    before = snapshot(workshop)
    raises(ValueError, lambda: workshop.reserve('c', 1))
    assert snapshot(workshop) == before
    workshop.close_registration()
    before = snapshot(workshop)
    assert not workshop.registration_open
    for action in [lambda: workshop.reserve('c', 1), lambda: workshop.cancel('b'),
                   lambda: workshop.cancel('missing')]:
        assert str(raises(ValueError, action)) == 'Registration is closed'
        assert snapshot(workshop) == before
    workshop.close_registration()
    assert snapshot(workshop) == before
    empty = Workshop(3)
    empty.close_registration()
    assert snapshot(empty) == ((), 3, False)
    separate = Workshop(3)
    separate.reserve('b', 1)
    assert separate.remaining == 2 and workshop.remaining == 0
    # Two loaded copies can each be locally valid without providing global capacity protection.
    copy_a, copy_b = Workshop(3), Workshop(3)
    copy_a.reserve('x', 2)
    copy_b.reserve('y', 2)
    assert copy_a.remaining == copy_b.remaining == 1
    assert sum(r.seats for r in copy_a.bookings + copy_b.bookings) == 4

    # Bounded public-operation sequences exercise valid transitions and rejection stability.
    operations = [('reserve', 'a', 1), ('reserve', 'a', 2), ('reserve', 'b', 2),
                  ('reserve', 'b', 3), ('reserve', 'z', 0), ('cancel', 'a'),
                  ('cancel', 'b'), ('close',)]
    sequences = 0
    for length in range(5):
        for sequence in itertools.product(operations, repeat=length):
            candidate = Workshop(3)
            for operation in sequence:
                before = snapshot(candidate)
                try:
                    if operation[0] == 'reserve':
                        candidate.reserve(operation[1], operation[2])
                    elif operation[0] == 'cancel':
                        candidate.cancel(operation[1])
                    else:
                        candidate.close_registration()
                except (ValueError, KeyError):
                    assert snapshot(candidate) == before
                invariant(candidate, 3)
            sequences += 1
    assert sequences == 4681
print('Domain Model: exact output, public-operation invariants across 4,681 bounded sequences, quantity and capacity boundaries, rejection stability, cancellation, closure, immutable snapshots, independent instances, and lack of global capacity protection verified.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
