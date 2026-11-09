import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'domain-event');
const article = await readFile(resolve(root, 'content/patterns/domain-event.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, sys, tempfile
from dataclasses import FrozenInstanceError
from datetime import date, datetime, timedelta, timezone
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

with tempfile.TemporaryDirectory(prefix='patternverse-domain-event-') as directory:
    for filename, source in examples.items():
        pathlib.Path(directory, filename).write_text(source)
    sys.path.insert(0, directory)
    model = importlib.import_module('model')
    Shipment, ShipmentDispatched = model.Shipment, model.ShipmentDispatched
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        demo = runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        'status: dispatched\\n'
        'fact: ShipmentDispatched E1\\n'
        'archive: S1 TRACK-9\\n'
        'notice: S1 E1\\n'
        'rejected: Shipment is not ready\\n'
        'pending: 1\\n'
    ), repr(output.getvalue())
    when = demo['when']
    fact, shipment = demo['fact'], demo['shipment']
    assert when.isoformat() == '2026-10-29T10:00:00+00:00'
    assert fact == ShipmentDispatched('E1', 'S1', 'TRACK-9', when)
    assert fact.occurred_at is when and fact.occurred_at.tzinfo is timezone.utc
    assert shipment.status == 'dispatched' and shipment.pending_events == (fact,)
    assert shipment.pending_events[0] is fact
    for field, replacement in [('event_id', 'E9'), ('shipment_id', 'S9'),
                               ('tracking_code', 'OTHER'), ('occurred_at', when + timedelta(days=1))]:
        raises(FrozenInstanceError, lambda: setattr(fact, field, replacement))
    raises(AttributeError, lambda: setattr(fact.occurred_at, 'hour', 11))
    raises(AttributeError, lambda: shipment.pending_events.clear())
    raises(AttributeError, lambda: setattr(shipment, 'pending_events', ()))
    raises(AttributeError, lambda: setattr(shipment, 'status', 'ready'))
    for event_id, tracking in [('E1', 'TRACK-9'), ('E2', 'TRACK-10')]:
        raises(ValueError, lambda: shipment.dispatch(event_id, tracking, when))
        assert shipment.pending_events == (fact,) and shipment.status == 'dispatched'
    for bad in ['', ' ', None, 1, True, [], {}]:
        raises(ValueError, lambda: Shipment(bad))
        for field in ['event_id', 'shipment_id', 'tracking_code']:
            values = dict(event_id='E1', shipment_id='S1', tracking_code='TRACK-9', occurred_at=when)
            values[field] = bad
            raises(ValueError, lambda: ShipmentDispatched(**values))
        for args in [(bad, 'TRACK-9', when), ('E1', bad, when)]:
            root = Shipment('S1')
            raises(ValueError, lambda: root.dispatch(*args))
            assert root.status == 'ready' and root.pending_events == ()
    class OtherDatetime(datetime):
        pass
    for bad in [None, '2026-10-29T10:00:00Z', date(2026, 10, 29),
                datetime(2026, 10, 29, 10), datetime(2026, 10, 29, 10, tzinfo=timezone(timedelta(hours=1))),
                OtherDatetime(2026, 10, 29, 10, tzinfo=timezone.utc)]:
        raises(ValueError, lambda: ShipmentDispatched('E1', 'S1', 'TRACK-9', bad))
        root = Shipment('S1')
        raises(ValueError, lambda: root.dispatch('E1', 'TRACK-9', bad))
        assert root.status == 'ready' and root.pending_events == ()

    root = Shipment('S2')
    earlier = root.pending_events
    assert root.status == 'ready' and earlier == ()
    root.dispatch('E2', 'TRACK-10', when + timedelta(hours=2))
    later = root.pending_events
    assert earlier == () and len(later) == 1 and root.pending_events == later
    next_fact = later[0]
    assert next_fact.shipment_id == 'S2' and next_fact.occurred_at.hour == 12
    assert fact.shipment_id == 'S1' and fact.tracking_code == 'TRACK-9' and fact.occurred_at.hour == 10
    assert demo['archive_description'](next_fact) == 'archive: S2 TRACK-10'
    assert demo['notice_description'](next_fact) == 'notice: S2 E2'
    assert demo['archive_description'](fact) == 'archive: S1 TRACK-9'
    assert demo['notice_description'](fact) == 'notice: S1 E1'
    assert root.pending_events == later and shipment.pending_events == (fact,)
    opaque = Shipment(' S3 ')
    opaque.dispatch(' E3 ', ' TRACK-11 ', when)
    assert opaque.pending_events[0].shipment_id == ' S3 '
    assert opaque.pending_events[0].event_id == ' E3 '
    assert opaque.pending_events[0].tracking_code == ' TRACK-11 '
    historical = Shipment('S4')
    supplied_time = datetime(1970, 1, 1, tzinfo=timezone.utc)
    historical.dispatch('E4', 'TRACK-12', supplied_time)
    assert historical.pending_events[0].occurred_at is supplied_time

    # IDs are caller-supplied: neither a global allocator nor a consumer inbox exists.
    another = Shipment('S5')
    another.dispatch('E1', 'TRACK-13', when)
    assert another.pending_events[0].event_id == fact.event_id
    assert another.pending_events[0] != fact
    assert shipment.pending_events == (fact,)
print('Domain Event: exact output, immutable occurrence data, UTC input contract, invalid-input stability, one accepted local transition, repeat rejection, nondestructive pending snapshots, independent pure descriptions, retained original context, and explicit caller-supplied identity/time limits verified. No persistence or delivery is implemented.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
