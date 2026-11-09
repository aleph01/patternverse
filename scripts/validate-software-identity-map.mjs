import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bundle = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = bundle.patterns.find((p) => p.id === 'identity-map');
const article = await readFile(resolve(root, 'content/patterns/identity-map.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length) throw new Error('Code file count mismatch');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import contextlib, gc, importlib, io, json, pathlib, runpy, sqlite3, sys, tempfile, weakref
examples = json.load(sys.stdin)
def raises(kind, action):
    try:
        action()
    except kind as error:
        return error
    raise AssertionError('Expected ' + kind.__name__)

with tempfile.TemporaryDirectory(prefix='patternverse-identity-map-') as directory:
    for name, source in examples.items():
        pathlib.Path(directory, name).write_text(source)
    sys.path.insert(0, directory)
    module = importlib.import_module('contacts')
    Contact, ContactScope = module.Contact, module.ContactScope
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        runpy.run_path(str(pathlib.Path(directory, 'demo.py')))
    assert output.getvalue() == (
        'same object: True\\n'
        'other path: Ada Lovelace\\n'
        'stored: Ada\\n'
        'same scope: Ada Lovelace\\n'
        'missing: None\\n'
        'new scope: Augusta\\n'
        'different object: True\\n'
    ), repr(output.getvalue())
    for bad in [None, True, False, 0, -1, 1.0, '1']:
        raises(ValueError, lambda: Contact(bad, 'Ada'))
    for bad in [None, True, 1, '', ' ', 'x'*81, 'bad\\nname']:
        raises(ValueError, lambda: Contact(1, bad))
    contact = Contact(1, 'x'*80)
    assert len(contact.name) == 80
    raises(AttributeError, lambda: setattr(contact, 'contact_id', 2))
    raises(AttributeError, lambda: setattr(contact, 'name', 'bypass'))
    raises(ValueError, lambda: contact.rename(''))
    assert contact.name == 'x'*80
    contact.rename("O'Connor")
    assert contact.name == "O'Connor"
    assert Contact(1, 'Ada') is not Contact(1, 'Ada')

    def connect(path=':memory:'):
        db = sqlite3.connect(path, isolation_level=None)
        db.execute('CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT NOT NULL)')
        db.execute("INSERT INTO contacts VALUES (1, 'Ada')")
        return db
    class Abort(Exception):
        pass
    with contextlib.closing(connect()) as db:
        trace = []
        db.set_trace_callback(trace.append)
        scope = ContactScope(db)
        raises(RuntimeError, lambda: scope.get(1))
        assert trace == []
        with scope:
            raises(RuntimeError, scope.__enter__)
            for bad in [None, True, 0, -1, 1.0, '1']:
                raises(ValueError, lambda: scope.get(bad))
            assert trace == []
            billing = scope.get(1)
            shipping = scope.get(1)
            assert billing is shipping and len(trace) == 1
            assert trace[0].startswith('SELECT') and not db.in_transaction
            billing.rename('Ada Lovelace')
            assert shipping.name == 'Ada Lovelace' and len(trace) == 1
            assert db.execute('SELECT name FROM contacts WHERE id = 1').fetchone() == ('Ada',)
            db.execute("UPDATE contacts SET name = 'Augusta' WHERE id = 1")
            trace.clear()
            assert scope.get(1) is billing and billing.name == 'Ada Lovelace' and trace == []
            assert scope.get(99) is None and scope.get(99) is None
            assert len(trace) == 2 and all(s.startswith('SELECT') for s in trace)
            assert 99 not in scope._loaded
            db.execute("INSERT INTO contacts VALUES (99, 'Ada Lovelace')")
            other = scope.get(99)
            assert other.name == billing.name and other is not billing and other.contact_id == 99
            db.execute("INSERT INTO contacts VALUES (3, '')")
            raises(ValueError, lambda: scope.get(3))
            assert 3 not in scope._loaded
            db.execute("UPDATE contacts SET name = 'Repaired' WHERE id = 3")
            assert scope.get(3).name == 'Repaired'
        assert scope._loaded == {} and scope._closed
        assert billing.name == 'Ada Lovelace'
        raises(RuntimeError, lambda: scope.get(1))
        raises(RuntimeError, scope.__enter__)
        with ContactScope(db) as fresh:
            assert fresh.get(1).name == 'Augusta' and fresh.get(1) is not billing
        assert db.execute('SELECT COUNT(*) FROM contacts').fetchone()[0] == 3
        # Strong references keep an unreferenced result alive only until scope exit.
        with ContactScope(db) as retaining:
            reference = weakref.ref(retaining.get(1))
            gc.collect()
            assert reference() is not None
        gc.collect()
        assert reference() is None
        try:
            with ContactScope(db) as failing:
                escaped = failing.get(1)
                escaped.rename('Local only')
                raise Abort()
        except Abort:
            pass
        assert failing._loaded == {} and failing._closed
        assert escaped.name == 'Local only'
        assert db.execute('SELECT name FROM contacts WHERE id = 1').fetchone()[0] == 'Augusta'
        # Caller-owned transaction stays open through normal and exceptional exit.
        db.execute('BEGIN')
        trace.clear()
        with ContactScope(db) as borrowed:
            borrowed.get(1)
        assert db.in_transaction and len(trace) == 1 and trace[0].startswith('SELECT')
        try:
            with ContactScope(db) as borrowed_failure:
                borrowed_failure.get(1)
                raise Abort()
        except Abort:
            pass
        assert db.in_transaction
        db.execute('ROLLBACK')
        with contextlib.closing(connect()) as other_db:
            other_db.execute("UPDATE contacts SET name = 'Different database' WHERE id = 1")
            with ContactScope(db) as left, ContactScope(other_db) as right:
                assert left.get(1) is not right.get(1)
                assert left.get(1).name != right.get(1).name

    # Two actual connections demonstrate stale hits and external deletion.
    path = str(pathlib.Path(directory, 'contacts.sqlite'))
    with contextlib.closing(connect(path)) as reader, contextlib.closing(sqlite3.connect(path, isolation_level=None)) as writer:
        with ContactScope(reader) as current:
            old = current.get(1)
            writer.execute("UPDATE contacts SET name = 'External' WHERE id = 1")
            assert current.get(1) is old and old.name == 'Ada'
            with ContactScope(reader) as another:
                assert another.get(1).name == 'External' and another.get(1) is not old
            writer.execute('DELETE FROM contacts WHERE id = 1')
            assert current.get(1) is old
        with ContactScope(reader) as after_delete:
            assert after_delete.get(1) is None
        assert old.name == 'Ada'
    closed = sqlite3.connect(':memory:')
    closed.close()
    with ContactScope(closed) as broken:
        raises(sqlite3.ProgrammingError, lambda: broken.get(1))
        assert broken._loaded == {}
print('Identity Map: both article files and exact output verified; shared references, one SELECT per loaded ID, local mutation without persistence, strict inputs, misses without negative caching, failed hydration and repair, scope cleanup, strong-reference release, caller transaction/connection ownership, namespaces, storage failures, external updates/deletion, and distinct objects across scopes checked.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
