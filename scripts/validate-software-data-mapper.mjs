import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bundle = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = bundle.patterns.find((p) => p.id === 'data-mapper');
const article = await readFile(resolve(root, 'content/patterns/data-mapper.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length) throw new Error('Code file count mismatch');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, sqlite3, sys, tempfile
from dataclasses import FrozenInstanceError
examples = json.load(sys.stdin)
tree = ast.parse(examples['model.py'])
assert {n.module for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)} == {'dataclasses'}
assert not any(isinstance(n, ast.Import) for n in ast.walk(tree))
def raises(kind, action):
    try:
        action()
    except kind as error:
        return error
    raise AssertionError('Expected ' + kind.__name__)

with tempfile.TemporaryDirectory(prefix='patternverse-data-mapper-') as directory:
    for name, source in examples.items():
        pathlib.Path(directory, name).write_text(source)
    sys.path.insert(0, directory)
    model = importlib.import_module('model')
    Appointment, TimeSlot = model.Appointment, model.TimeSlot
    AppointmentMapper = importlib.import_module('mapper').AppointmentMapper
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        'loaded end minute: 570\\n'
        'adjacent overlaps: False\\n'
        'stored start, duration: (600, 45)\\n'
        'reloaded end minute: 645\\n'
        'old snapshot end: 570\\n'
        'missing: None\\n'
    ), repr(output.getvalue())
    for start, end in [(0, 1), (1439, 1440), (0, 1440), (540, 570)]:
        slot = TimeSlot(start, end)
        assert slot.overlaps(slot)
        raises(FrozenInstanceError, lambda: setattr(slot, 'end', 0))
    for start, end in [(-1, 1), (0, 0), (2, 1), (0, 1441), (True, 2), (0, False), (1.5, 2), (0, '1')]:
        raises(ValueError, lambda: TimeSlot(start, end))
    first, adjacent, crossing = TimeSlot(540, 570), TimeSlot(570, 600), TimeSlot(569, 580)
    assert not first.overlaps(adjacent) and not adjacent.overlaps(first)
    assert first.overlaps(crossing) and crossing.overlaps(first)
    raises(TypeError, lambda: first.overlaps((540, 570)))
    for bad in ['', ' ', None, 1, True, 'é']:
        raises(ValueError, lambda: Appointment(bad, first))
    raises(TypeError, lambda: Appointment('A', (540, 570)))

    def connect(path=':memory:'):
        db = sqlite3.connect(path)
        db.execute('CREATE TABLE appointments (appointment_key TEXT PRIMARY KEY, begin_minute INTEGER NOT NULL, duration_minutes INTEGER NOT NULL)')
        return db
    with contextlib.closing(connect()) as db:
        mapper = AppointmentMapper(db)
        assert mapper.find('absent') is None
        for index, (start, end) in enumerate([(0, 1), (1439, 1440), (0, 1440), (540, 570)]):
            expected = Appointment(str(index), TimeSlot(start, end))
            with db:
                mapper.insert(expected)
            loaded = mapper.find(str(index))
            assert loaded == expected and loaded is not expected
            assert loaded is not mapper.find(str(index))
            assert loaded.slot.overlaps(expected.slot)
            assert db.execute('SELECT begin_minute, duration_minutes FROM appointments WHERE appointment_key = ?', (str(index),)).fetchone() == (start, end-start)
            raises(FrozenInstanceError, lambda: setattr(loaded, 'slot', TimeSlot(1, 2)))
            before = db.execute('SELECT * FROM appointments WHERE appointment_key = ?', (str(index),)).fetchone()
            with db:
                mapper.update(loaded)  # A matching unchanged row is not missing.
            try:
                with db:
                    mapper.insert(expected)
            except sqlite3.IntegrityError:
                pass
            else:
                raise AssertionError('Duplicate must propagate')
            assert db.execute('SELECT * FROM appointments WHERE appointment_key = ?', (str(index),)).fetchone() == before
        for bad in ['', ' ', None, 1, True, 'é']:
            raises(ValueError, lambda: mapper.find(bad))
        for bad in [None, {}, ('A', first)]:
            raises(TypeError, lambda: mapper.insert(bad))
            raises(TypeError, lambda: mapper.update(bad))
        try:
            with db:
                mapper.update(Appointment('missing', first))
        except LookupError:
            pass
        else:
            raise AssertionError('Missing update must reject')
        assert mapper.find('missing') is None
        with db:
            mapper.insert(Appointment(" A-'quoted' ", first))
        assert mapper.find(" A-'quoted' ").appointment_id == " A-'quoted' "
        for index, (start, duration) in enumerate([(540, 0), (540, -1), (1440, 1), (-1, 2), (0, 1.5)]):
            key = 'bad-' + str(index)
            with db:
                db.execute('INSERT INTO appointments VALUES (?, ?, ?)', (key, start, duration))
            raises(ValueError, lambda: mapper.find(key))
        with db:
            mapper.insert(Appointment('stale', TimeSlot(100, 120)))
        old = mapper.find('stale')
        with db:
            mapper.update(Appointment('stale', TimeSlot(200, 230)))
        assert old.slot == TimeSlot(100, 120)
        with db:
            mapper.update(old)  # Deliberately demonstrates the absence of version protection.
        assert mapper.find('stale').slot == TimeSlot(100, 120)
        db.execute('DROP TABLE appointments')
        raises(sqlite3.OperationalError, lambda: mapper.find('0'))

    path = str(pathlib.Path(directory, 'appointments.sqlite'))
    with contextlib.closing(connect(path)) as writer, contextlib.closing(sqlite3.connect(path)) as reader:
        mapper, observer = AppointmentMapper(writer), AppointmentMapper(reader)
        item = Appointment('A', TimeSlot(540, 570))
        mapper.insert(item)
        assert writer.in_transaction and observer.find('A') is None
        writer.rollback()
        assert mapper.find('A') is None
        with writer:
            mapper.insert(item)
        assert observer.find('A') == item
        mapper.update(Appointment('A', TimeSlot(600, 645)))
        assert writer.in_transaction and observer.find('A') == item
        writer.rollback()
        assert mapper.find('A') == item
        class Abort(Exception):
            pass
        try:
            with writer:
                mapper.update(Appointment('A', TimeSlot(600, 645)))
                mapper.insert(Appointment('B', TimeSlot(700, 720)))
                raise Abort()
        except Abort:
            pass
        assert observer.find('A') == item and observer.find('B') is None
print('Data Mapper: three runnable files and exact output verified; storage-free model, inverse start/end ↔ start/duration round trips, midnight/day-end boundaries, half-open overlap behavior, immutable independent loads, missing/duplicate/invalid data failures, exact IDs, explicit unchanged-row updates, caller commit and rollback, connection lifetime, cross-connection visibility, and the demonstrated stale-overwrite limitation checked.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
