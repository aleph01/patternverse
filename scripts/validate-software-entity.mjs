import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'entity');
const article = await readFile(resolve(root, 'content/patterns/entity.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, sys, tempfile
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

with tempfile.TemporaryDirectory(prefix='patternverse-entity-') as directory:
    for filename, source in examples.items():
        pathlib.Path(directory, filename).write_text(source)
    sys.path.insert(0, directory)
    model = importlib.import_module('model')
    EquipmentId, Equipment = model.EquipmentId, model.Equipment
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        demo = runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        'recreated: True False\\n'
        'identity equal, labels equal: True False\\n'
        'same label, same entity: True False\\n'
        'other catalog: False\\n'
    ), repr(output.getvalue())
    assert demo['camera'] == demo['restored']
    assert demo['camera'] is not demo['restored']
    assert (demo['camera'].label, demo['restored'].label) == ('Camera B', 'Camera C')
    assert json.loads(demo['encoded']) == {'catalog': 'studio', 'number': '42', 'label': 'Camera B'}

    for bad in ['', ' ', ' studio', 'studio ', 42, True, None]:
        raises(ValueError, lambda: EquipmentId(bad, '42'))
        raises(ValueError, lambda: EquipmentId('studio', bad))
    key = EquipmentId('studio', '42')
    assert key == EquipmentId('studio', '42')
    assert key != EquipmentId('rental', '42')
    assert key != EquipmentId('studio', '43')
    assert key != EquipmentId('Studio', '42')
    assert key != EquipmentId('studio', '0042')
    assert EquipmentId('studio', '0').number == '0'  # Opaque identifier, not a count.
    raises(FrozenInstanceError, lambda: setattr(key, 'number', '99'))
    raises(FrozenInstanceError, lambda: setattr(key, 'catalog', 'rental'))
    for bad in [None, 'studio/42', ('studio', '42'), {'catalog': 'studio', 'number': '42'}]:
        raises(TypeError, lambda: Equipment(bad, 'Camera'))
    for bad in ['', '  ', 42, None]:
        raises(ValueError, lambda: Equipment(key, bad))

    camera = Equipment(key, ' Camera ')
    assert camera.identity is key and camera.label == 'Camera'
    original_hash = hash(key)
    by_id = {key: camera}
    raises(TypeError, lambda: hash(camera))
    raises(AttributeError, lambda: setattr(camera, 'identity', EquipmentId('rental', '42')))
    raises(AttributeError, lambda: setattr(camera, 'label', 'bypassed'))
    for label in ['Camera B', '  Camera C  ', 'カメラ']:
        camera.rename(label)
        assert camera.identity is key
        assert camera.label == label.strip()
        assert hash(key) == original_hash
        assert by_id[EquipmentId('studio', '42')] is camera
    for bad in ['', '  ', 42, None]:
        previous = camera.label
        raises(ValueError, lambda: camera.rename(bad))
        assert camera.label == previous and camera.identity is key
    assert camera.__eq__(object()) is NotImplemented
    assert camera != object()
    assert camera == camera

    class OtherEquipmentKind(Equipment):
        pass
    other_kind = OtherEquipmentKind(key, camera.label)
    assert camera != other_kind and other_kind != camera
    assert camera.__eq__(other_kind) is NotImplemented

    first = Equipment(key, 'Old label')
    second = Equipment(EquipmentId('studio', '42'), 'New label')
    third = Equipment(EquipmentId('studio', '43'), 'Old label')
    assert first == second and second == first
    assert first != third and first.label == third.label
    # Equal identity is not unique-instance enforcement or synchronization.
    assert first is not second
    first.rename('Changed only here')
    assert first == second and second.label == 'New label'
    assert by_id[key] is camera  # No global registry is silently updating unrelated objects.

    record = {'catalog': 'studio', 'number': '42', 'label': 'Saved label'}
    encoded = json.dumps(record)
    decoded = json.loads(encoded)
    reconstructed = Equipment(EquipmentId(decoded['catalog'], decoded['number']), decoded['label'])
    assert reconstructed == first and reconstructed is not first
    assert reconstructed.identity is not key and reconstructed.identity == key
    assert {key: 'found'}[reconstructed.identity] == 'found'
    reconstructed.rename('Independent newer label')
    assert record['label'] == decoded['label'] == 'Saved label'
    assert json.loads(encoded)['label'] == 'Saved label'
    assert first.label == 'Changed only here'
print('Entity: exact output, scoped immutable identities, concrete-type comparison, reconstruction, independent divergent state, attribute collisions, stable key lookup after rename, unhashable entities, and invalid-input stability verified.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
