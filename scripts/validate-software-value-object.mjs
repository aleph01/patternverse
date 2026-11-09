import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'value-object');
const article = await readFile(resolve(root, 'content/patterns/value-object.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, sys, tempfile
from dataclasses import FrozenInstanceError
from datetime import date, datetime, timedelta
examples = json.load(sys.stdin)
assert set(examples) == {'model.py', 'demo.py'}
tree = ast.parse(examples['model.py'])
assert {n.module for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)} == {'dataclasses', 'datetime'}
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

with tempfile.TemporaryDirectory(prefix='patternverse-value-object-') as directory:
    for filename, source in examples.items():
        pathlib.Path(directory, filename).write_text(source)
    sys.path.insert(0, directory)
    StayDates = importlib.import_module('model').StayDates
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        demo = runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        'equal, same object: True False\\n'
        'booked: 2026-10-29 2026-11-01 3\\n'
        'proposed: 2026-10-31 2026-11-03 3\\n'
        'adjacent overlaps: False\\n'
        'lookup: 3\\n'
    ), repr(output.getvalue())
    booked, equivalent, proposed = (demo[n] for n in ['booked', 'equivalent', 'proposed'])
    assert booked == equivalent and booked is not equivalent
    assert booked != proposed and booked.nights == proposed.nights == 3
    assert booked != StayDates(booked.check_in, date(2026, 11, 2))
    assert hash(booked) == hash(equivalent)
    assert {booked: 'found'}[equivalent] == 'found'
    assert len({booked, equivalent, proposed}) == 2
    assert booked.__eq__((booked.check_in, booked.check_out)) is NotImplemented
    class OtherDates(StayDates):
        pass
    other = OtherDates(booked.check_in, booked.check_out)
    assert booked != other and other != booked
    raises(TypeError, lambda: booked < proposed)
    raises(FrozenInstanceError, lambda: setattr(booked, 'check_in', date(2026, 10, 30)))
    raises(FrozenInstanceError, lambda: setattr(booked, 'check_out', date(2026, 11, 2)))
    raises(AttributeError, lambda: setattr(booked.check_in, 'day', 30))
    assert booked.check_in == date(2026, 10, 29) and booked.check_out == date(2026, 11, 1)
    alias = booked
    replacement = alias.shifted(2)
    assert alias is booked and replacement == proposed and replacement is not proposed
    assert alias.check_in == date(2026, 10, 29)
    zero = booked.shifted(0)
    assert zero == booked and zero is not booked
    assert booked.shifted(-2).check_in == date(2026, 10, 27)
    assert booked.shifted(20).shifted(-20) == booked
    assert booked.shifted(64).check_in == date(2027, 1, 1)
    for start, end in [(date(2026, 1, 1), date(2026, 1, 1)),
                       (date(2026, 1, 2), date(2026, 1, 1))]:
        raises(ValueError, lambda: StayDates(start, end))
    for bad in [datetime(2026, 10, 29), '2026-10-29', None, 42, True]:
        raises(TypeError, lambda: StayDates(bad, booked.check_out))
        raises(TypeError, lambda: StayDates(booked.check_in, bad))
    for bad in [True, False, 0.5, 2.0, '2', None]:
        raises(TypeError, lambda: booked.shifted(bad))
    leap = StayDates(date(2028, 2, 28), date(2028, 3, 1))
    assert leap.nights == 2 and leap.shifted(1).check_in == date(2028, 2, 29)
    for value, offset in [(StayDates(date.max - timedelta(days=1), date.max), 1),
                          (StayDates(date.min, date.min + timedelta(days=1)), -1),
                          (booked, 10**15)]:
        before = (value.check_in, value.check_out, hash(value))
        raises(OverflowError, lambda: value.shifted(offset))
        assert (value.check_in, value.check_out, hash(value)) == before
    for bad in [None, (booked.check_in, booked.check_out), other]:
        raises(TypeError, lambda: booked.overlaps(bad))

    # Independent occupied-day sets check the half-open interval formula.
    origin = date(2026, 1, 1)
    ranges = [(StayDates(origin + timedelta(days=a), origin + timedelta(days=b)),
               set(range(a, b))) for a in range(8) for b in range(a + 1, 9)]
    for left, left_days in ranges:
        for right, right_days in ranges:
            expected_overlap = bool(left_days & right_days)
            assert left.overlaps(right) == right.overlaps(left) == expected_overlap
    assert not booked.overlaps(demo['adjacent'])
    assert booked.overlaps(equivalent)
print('Value Object: exact output, complete-type-and-field equality, compatible hashing, immutable dates, alias-safe replacement, invalid inputs, signed shifts, leap/year boundaries, overflow stability, and 1296 independent overlap cases verified.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
