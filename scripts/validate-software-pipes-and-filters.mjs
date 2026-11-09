import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'pipes-and-filters');
const article = await readFile(resolve(root, 'content/patterns/pipes-and-filters.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, sys, tempfile
from dataclasses import FrozenInstanceError
examples = json.load(sys.stdin)
expected_imports = {
    'filters.py': {'csv', 'math', 'dataclasses'},
    'pipeline.py': {'filters'},
    'main.py': {'pipeline'},
}
assert set(examples) == set(expected_imports)
with tempfile.TemporaryDirectory(prefix='patternverse-pipes-filters-') as directory:
    for name, source in examples.items():
        tree = ast.parse(source, filename=name)
        imports = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                imports.add(node.module)
            elif isinstance(node, ast.Import):
                imports.update(alias.name for alias in node.names)
        assert imports == expected_imports[name], (name, imports)
        pathlib.Path(directory, name).write_text(source)
    sys.path.insert(0, directory)
    stages = importlib.import_module('filters')
    report = importlib.import_module('pipeline').report
    lines = ['kitchen,18.0\\n', 'loft,25.0\\n', 'boiler,30.0\\n']
    assert list(report(lines)) == ['loft: 77.0 F', 'boiler: 86.0 F']
    assert list(report([])) == []
    assert list(report(['cold,24.9999\\n'])) == [], 'Display rounding changed selection'
    assert list(report(['exact,25.0\\n'])) == ['exact: 77.0 F']
    assert list(report(['z,30\\n', 'a,25\\n'])) == ['z: 86.0 F', 'a: 77.0 F']
    assert list(report(['"loft, west",25\\n'])) == ['loft, west: 77.0 F']
    assert list(report(['  loft  , 25 \\r\\n'])) == ['loft: 77.0 F']
    assert list(report(['ice,-40\\n', 'water,0\\n', 'steam,100\\n'], -50)) == [
        'ice: -40.0 F', 'water: 32.0 F', 'steam: 212.0 F',
    ]

    # Wiring generators does not consume data. Producing the first accepted
    # result reads a rejected record and a selected record, but not the third.
    consumed = []
    def tracked(values):
        for value in values:
            consumed.append(value)
            yield value
    stream = report(tracked(lines))
    assert consumed == []
    assert next(stream) == 'loft: 77.0 F'
    assert consumed == lines[:2]
    assert next(stream) == 'boiler: 86.0 F'
    assert consumed == lines
    assert list(stream) == []

    consumed.clear()
    stream = report(tracked(lines))
    assert next(stream) == 'loft: 77.0 F'
    stream.close()
    assert consumed == lines[:2], 'Early stop consumed further records'

    for record in ['sensor\\n', 'sensor,25,extra\\n', ' ,25\\n', '\\n']:
        try:
            list(report([record]))
        except ValueError as error:
            assert 'Record 1:' in str(error)
        else:
            raise AssertionError(('Invalid record shape accepted', record))
    for value in ['bad', '', 'nan', 'inf', '-inf']:
        try:
            list(report(['sensor,' + value + '\\n']))
        except ValueError as error:
            assert 'Record 1:' in str(error)
        else:
            raise AssertionError(('Invalid temperature accepted', value))
    for minimum in [float('nan'), float('inf'), float('-inf')]:
        try:
            list(report([], minimum))
        except ValueError as error:
            assert str(error) == 'Threshold must be finite'
        else:
            raise AssertionError('Non-finite threshold accepted')
    try:
        list(report(['too-large,1e308\\n']))
    except ValueError as error:
        assert str(error) == 'Converted temperature is out of range'
    else:
        raise AssertionError('Non-finite converted output accepted')
    try:
        list(report(['"unterminated,25\\n']))
    except stages.csv.Error:
        pass
    else:
        raise AssertionError('Malformed CSV syntax accepted')

    # A later parse failure stops the pipeline. Previously consumed output
    # remains visible, and the record following the failure is not consumed.
    consumed.clear()
    broken = ['good,25\\n', 'bad,not-a-number\\n', 'later,30\\n']
    stream = report(tracked(broken))
    published = [next(stream)]
    try:
        next(stream)
    except ValueError as error:
        assert str(error) == 'Record 2: invalid temperature'
        assert isinstance(error.__cause__, ValueError)
    else:
        raise AssertionError('A bad record was silently omitted')
    assert published == ['good: 77.0 F']
    assert consumed == broken[:2]
    assert list(stream) == []

    # Reuse the same stages in a composition that omits selection.
    all_readings = stages.format_rows(stages.fahrenheit_rows(stages.parse_csv(lines)))
    assert list(all_readings) == ['kitchen: 64.4 F', 'loft: 77.0 F', 'boiler: 86.0 F']
    reading = next(stages.parse_csv(['loft,25\\n']))
    try:
        reading.celsius = 26
    except FrozenInstanceError:
        pass
    else:
        raise AssertionError('Parsed readings are mutable')
    with io.StringIO('loft,25\\nboiler,30\\n') as source:
        stream = report(source)
        assert next(stream) == 'loft: 77.0 F'
        stream.close()
        assert not source.closed, 'A stage closed a caller-owned source'
    assert source.closed
    captured = io.StringIO()
    with contextlib.redirect_stdout(captured):
        runpy.run_path(str(pathlib.Path(directory, 'main.py')), run_name='__main__')
    assert captured.getvalue() == 'loft: 77.0 F\\nboiler: 86.0 F\\n', captured.getvalue()
print('Pipes and Filters: actual modules, unit conversion, threshold boundary, lazy demand, early stop, record order, CSV failures, partial output, reusable composition, and source ownership verified.')
`;
const result = spawnSync('python3', ['-I', '-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  timeout: 10_000,
});
if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
process.stdout.write(result.stdout);
