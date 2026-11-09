import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'domain-service');
const article = await readFile(resolve(root, 'content/patterns/domain-service.md'), 'utf8');
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

with tempfile.TemporaryDirectory(prefix='patternverse-domain-service-') as directory:
    for filename, source in examples.items():
        pathlib.Path(directory, filename).write_text(source)
    sys.path.insert(0, directory)
    model = importlib.import_module('model')
    RoomRequest, RoomOffer, select_room = model.RoomRequest, model.RoomOffer, model.select_room
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        demo = runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        'selected: room-A\\n'
        'spare seats: 0\\n'
        'reordered: room-A\\n'
        'no match: None\\n'
        'still offered: 4\\n'
    ), repr(output.getvalue())
    projector = frozenset({'projector'})
    request, offers = demo['request'], demo['offers']
    assert demo['selected'] is offers[2]
    assert select_room(request, ()) is None
    assert select_room(RoomRequest(21, projector), offers) is None
    assert offers[2].can_host(request) and not offers[3].can_host(request)
    assert select_room(RoomRequest(1, frozenset({'whiteboard'})), offers) is None
    assert select_room(RoomRequest(1, frozenset()), offers).room_id == 'room-D'
    assert select_room(RoomRequest(1, frozenset({'Projector'})), offers) is None
    for order in itertools.permutations(offers):
        assert select_room(request, order).room_id == 'room-A'
    candidates = list(offers)
    before = candidates[:]
    assert select_room(request, iter(candidates)).room_id == 'room-A'
    assert candidates == before
    for candidate in [request, *offers]:
        field = 'attendees' if type(candidate) is RoomRequest else 'seats'
        raises(FrozenInstanceError, lambda: setattr(candidate, field, 999))
    raises(AttributeError, lambda: offers[0].features.add('whiteboard'))
    for bad in [0, -1, 1.5, 1.0, True, False, None, '12']:
        raises(ValueError, lambda: RoomRequest(bad, projector))
        raises(ValueError, lambda: RoomOffer('A', bad, projector))
    for bad in [set(), {'projector'}, [], 'projector', None,
                frozenset({''}), frozenset({' '}), frozenset({1}), frozenset({False})]:
        raises(ValueError, lambda: RoomRequest(1, bad))
        raises(ValueError, lambda: RoomOffer('A', 1, bad))
    for bad in ['', ' ', None, 1, True]:
        raises(ValueError, lambda: RoomOffer(bad, 12, projector))
    for bad in [None, 12, {'attendees': 12}, object()]:
        raises(TypeError, lambda: select_room(bad, offers))
        raises(TypeError, lambda: offers[0].can_host(bad))
    for bad in [None, object(), {'room_id': 'X'}, 'A']:
        raises(TypeError, lambda: select_room(request, [offers[0], bad]))
    raises(TypeError, lambda: select_room(request, None))
    for duplicate in [offers[0], RoomOffer('room-C', 30, frozenset())]:
        raises(ValueError, lambda: select_room(request, [offers[0], duplicate]))
        raises(ValueError, lambda: select_room(RoomRequest(100, projector), [offers[0], duplicate]))
    mixed_case = [RoomOffer('room-a', 12, projector), RoomOffer('room-A', 12, projector)]
    assert select_room(request, mixed_case).room_id == 'room-A'
    huge = RoomOffer('huge', 10**50, frozenset())
    assert select_room(RoomRequest(10**50, frozenset()), [huge]) is huge

    # Independent eligibility and no-better-candidate properties over every subset.
    pool = [RoomOffer('A', 12, projector), RoomOffer('B', 12, projector),
            RoomOffer('C', 20, frozenset({'projector', 'whiteboard'})),
            RoomOffer('D', 10, frozenset()), RoomOffer('E', 8, frozenset({'whiteboard'})),
            RoomOffer('F', 12, frozenset())]
    cases = 0
    for mask in range(1 << len(pool)):
        subset = [room for i, room in enumerate(pool) if mask & (1 << i)]
        for attendees in [1, 8, 12, 13, 21]:
            for required in [(), ('projector',), ('whiteboard',), ('projector', 'whiteboard')]:
                query = RoomRequest(attendees, frozenset(required))
                eligible = [r for r in subset if r.seats >= attendees
                            and all(feature in r.features for feature in required)]
                chosen = select_room(query, subset)
                if not eligible:
                    assert chosen is None
                else:
                    assert chosen in eligible
                    assert not any(r.seats < chosen.seats or
                                   (r.seats == chosen.seats and r.room_id < chosen.room_id)
                                   for r in eligible)
                assert select_room(query, reversed(subset)) == chosen
                cases += 1
    assert cases == 1280

    # Repeated calls retain no previous decision and perform no reservation.
    first = select_room(request, offers)
    assert select_room(request, []) is None
    assert select_room(request, [offers[0]]).room_id == 'room-C'
    assert select_room(request, offers) is first
    assert select_room(request, offers) is first  # Another caller can choose A too.
    refreshed = tuple(o for o in offers if o.room_id != 'room-A')
    assert select_room(request, refreshed).room_id == 'room-B'
    assert len(offers) == 4 and offers[2].room_id == 'room-A'
print('Domain Service: exact output, local compatibility, exact-seat and feature boundaries, deterministic tie-breaking, 1280 candidate-set/query cases, all demo permutations, invalid/duplicate inputs, immutable snapshots, repeated independent calls, and reload/reselection verified. Selection performs no booking or I/O.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
