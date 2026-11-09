import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'specification');
const article = await readFile(resolve(root, 'content/patterns/specification.md'), 'utf8');
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
assert {n.module for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)} == {'dataclasses', 'typing'}
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

with tempfile.TemporaryDirectory(prefix='patternverse-specification-') as directory:
    for filename, source in examples.items():
        pathlib.Path(directory, filename).write_text(source)
    sys.path.insert(0, directory)
    model = importlib.import_module('model')
    PrintJob, Specification, at_most_pages = model.PrintJob, model.Specification, model.at_most_pages
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        demo = runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        "selected: ['A', 'C']\\n"
        'validate C: True\\n'
        'exact limit: True\\n'
        'over limit: False\\n'
        'cancelled: False\\n'
    ), repr(output.getvalue())
    eligible, jobs = demo['eligible'], demo['jobs']
    assert [eligible.is_satisfied_by(job) for job in jobs] == [True, False, True, False, False]
    assert [job.job_id for job in reversed(jobs) if eligible.is_satisfied_by(job)] == ['C', 'A']
    assert [job for job in () if eligible.is_satisfied_by(job)] == []
    assert demo['approved'].is_satisfied_by(jobs[4]) is True
    assert demo['cancelled'].is_satisfied_by(jobs[4]) is True
    assert demo['cancelled'].not_().is_satisfied_by(jobs[4]) is False
    raises(FrozenInstanceError, lambda: setattr(jobs[0], 'pages', 1))
    raises(FrozenInstanceError, lambda: setattr(eligible, 'predicate', lambda job: True))
    for bad in [0, -1, 1.5, 1.0, True, False, None, '40']:
        raises(ValueError, lambda: PrintJob('X', bad))
        raises(ValueError, lambda: at_most_pages(bad))
    for bad in ['', ' ', None, 1, True]:
        raises(ValueError, lambda: PrintJob(bad, 1))
    for field in ['approved', 'proof_copy', 'cancelled']:
        for bad in [None, 0, 1, 'True', [], object()]:
            raises(TypeError, lambda: PrintJob('X', 1, **{field: bad}))
    for bad in [None, 1, 'predicate', []]:
        raises(TypeError, lambda: Specification(bad))
        raises(TypeError, lambda: eligible.and_(bad))
        raises(TypeError, lambda: eligible.or_(bad))
    for bad in [None, {'pages': 1}, object(), 1]:
        raises(TypeError, lambda: eligible.is_satisfied_by(bad))
    for bad in [None, 0, 1, 'True', [], object()]:
        wrong_result = Specification(lambda job: bad)
        raises(TypeError, lambda: wrong_result.is_satisfied_by(jobs[0]))
    def unavailable(job):
        raise RuntimeError('dependency unavailable')
    raises(RuntimeError, lambda: Specification(unavailable).is_satisfied_by(jobs[0]))

    # Explicit Boolean truth tables, independent of the composite implementation.
    truth = {(False, False): (False, False), (False, True): (False, True),
             (True, False): (False, True), (True, True): (True, True)}
    for (left, right), (expected_and, expected_or) in truth.items():
        a = Specification(lambda job, value=left: value)
        b = Specification(lambda job, value=right: value)
        conjunction, disjunction = a.and_(b), a.or_(b)
        assert conjunction is not a and conjunction is not b
        assert conjunction.is_satisfied_by(jobs[0]) is expected_and
        assert disjunction.is_satisfied_by(jobs[0]) is expected_or
        assert a.not_().is_satisfied_by(jobs[0]) is (not left)
        assert a.is_satisfied_by(jobs[0]) is left
        assert b.is_satisfied_by(jobs[0]) is right

    # Instrumentation only: production predicates should not depend on side effects.
    for left, op, expected_trace in [(False, 'and_', ['left']), (True, 'and_', ['left', 'right']),
                                     (True, 'or_', ['left']), (False, 'or_', ['left', 'right'])]:
        trace = []
        def first(job):
            trace.append('left')
            return left
        def second(job):
            trace.append('right')
            return True
        getattr(Specification(first), op)(Specification(second)).is_satisfied_by(jobs[0])
        assert trace == expected_trace
    assert Specification(lambda job: False).and_(Specification(unavailable)).is_satisfied_by(jobs[0]) is False
    assert Specification(lambda job: True).or_(Specification(unavailable)).is_satisfied_by(jobs[0]) is True

    cases = 0
    accepted_approval_pairs = {(False, True), (True, False), (True, True)}
    for limit in [1, 40, 100]:
        policy = demo['approved'].or_(demo['proof']).and_(at_most_pages(limit)).and_(demo['cancelled'].not_())
        for pages in [1, 39, 40, 41, 200]:
            for approved, proof, cancelled in itertools.product([False, True], repeat=3):
                candidate = PrintJob('X', pages, approved, proof, cancelled)
                expected = ((approved, proof) in accepted_approval_pairs
                            and pages <= limit and cancelled is False)
                assert policy.is_satisfied_by(candidate) is expected
                assert (candidate.job_id, candidate.pages, candidate.approved,
                        candidate.proof_copy, candidate.cancelled) == ('X', pages, approved, proof, cancelled)
                cases += 1
    assert cases == 120
    assert not eligible.is_satisfied_by(PrintJob('oversize-proof', 41, proof_copy=True))
    assert not eligible.is_satisfied_by(PrintJob('cancelled-proof', 1, proof_copy=True, cancelled=True))

    # A frozen wrapper does not freeze external mutable state captured by a predicate.
    external_limit = [40]
    changing = Specification(lambda job: job.pages <= external_limit[0])
    assert changing.is_satisfied_by(jobs[0])
    external_limit[0] = 39
    assert not changing.is_satisfied_by(jobs[0])
    assert eligible.is_satisfied_by(jobs[0])  # The example captures an immutable integer limit.
print('Specification: exact output, inclusive limits, strict input/result types, AND/OR/NOT truth tables, left-to-right short-circuiting, 120 grouped-policy cases, bounded OR exception, selection/validation agreement, immutable candidates, propagated failures, and closure-state limits verified. No SQL translation or release effect is implemented.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
