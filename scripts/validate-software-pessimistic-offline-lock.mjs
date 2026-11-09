import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bundle = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = bundle.patterns.find((p) => p.id === 'pessimistic-offline-lock');
const article = await readFile(
  resolve(root, 'content/patterns/pessimistic-offline-lock.md'),
  'utf8',
);
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length) throw new Error('Code file count mismatch');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import contextlib, importlib, io, json, pathlib, runpy, sqlite3, sys, tempfile
from dataclasses import FrozenInstanceError
examples=json.load(sys.stdin)
def raises(kind, action):
    try: action()
    except kind as error: return error
    raise AssertionError('Expected '+kind.__name__)
with tempfile.TemporaryDirectory(prefix='patternverse-pessimistic-') as directory:
    for name,source in examples.items(): pathlib.Path(directory,name).write_text(source)
    sys.path.insert(0,directory)
    module=importlib.import_module('checkout')
    Busy,LostLock,acquire,cancel,save=module.Busy,module.LostLock,module.acquire,module.cancel,module.save
    output=io.StringIO()
    with contextlib.redirect_stdout(output): runpy.run_path(str(pathlib.Path(directory,'demo.py')))
    assert output.getvalue()==('alice acquired: Draft\\nbob: busy\\ntransactions open: False False\\nold handle: rejected\\nbob still owns: True\\nbob cancel: True\\nstored: Launch plan\\n'),repr(output.getvalue())
    def connect(path=':memory:'):
        db=sqlite3.connect(path,isolation_level=None,timeout=0)
        db.execute('CREATE TABLE notes(id INTEGER PRIMARY KEY,title TEXT NOT NULL)')
        db.execute('CREATE TABLE locks(note_id INTEGER PRIMARY KEY,token TEXT NOT NULL)')
        db.execute("INSERT INTO notes VALUES(1,'Draft')")
        return db
    def owner(db,key=1):
        row=db.execute('SELECT token FROM locks WHERE note_id=?',(key,)).fetchone()
        return row[0] if row else None
    def title(db): return db.execute('SELECT title FROM notes WHERE id=1').fetchone()[0]
    with contextlib.closing(connect()) as db:
        trace=[];db.set_trace_callback(trace.append)
        for bad in [None,True,False,0,-1,1.0,'1',2**63]: raises(ValueError,lambda:acquire(db,bad))
        assert trace==[]
        first=acquire(db,1)
        assert len(first.token)==32 and owner(db)==first.token and not db.in_transaction
        raises(FrozenInstanceError,lambda:setattr(first,'token','other'))
        raises(Busy,lambda:acquire(db,1))
        assert owner(db)==first.token and not db.in_transaction
        for bad in [None,True,1,'',' ','x'*81,'bad\\nline']:
            raises(ValueError,lambda:save(db,first,bad))
        assert title(db)=='Draft' and owner(db)==first.token
        # Save changes and release ownership atomically; failure at release rolls back both.
        db.execute("CREATE TRIGGER fail_release BEFORE DELETE ON locks BEGIN SELECT RAISE(ABORT,'release unavailable'); END")
        raises(sqlite3.IntegrityError,lambda:save(db,first,'Must roll back'))
        assert title(db)=='Draft' and owner(db)==first.token and not db.in_transaction
        db.execute('DROP TRIGGER fail_release')
        save(db,first,"O'Connor")
        assert title(db)=="O'Connor" and owner(db) is None and not db.in_transaction
        second=acquire(db,1)
        assert second.token!=first.token and second.title=="O'Connor"
        raises(LostLock,lambda:save(db,first,'Stale'))
        assert not cancel(db,first) and owner(db)==second.token and title(db)=="O'Connor"
        assert cancel(db,second) and owner(db) is None
        assert not cancel(db,second)
        third=acquire(db,1)
        save(db,third,'x'*80)
        assert title(db)=='x'*80
        raises(LookupError,lambda:acquire(db,99))
        assert owner(db,99) is None and not db.in_transaction
        db.execute("INSERT INTO notes VALUES(2,'')")
        raises(ValueError,lambda:acquire(db,2))
        assert owner(db,2) is None
        # Transaction ownership is explicit; caller work is not rolled back.
        db.execute('BEGIN')
        db.execute("UPDATE notes SET title='Caller pending' WHERE id=1")
        raises(RuntimeError,lambda:acquire(db,1))
        assert db.in_transaction and title(db)=='Caller pending'
        db.execute('ROLLBACK')
        assert title(db)=='x'*80
        held=acquire(db,1)
        db.execute('DELETE FROM notes WHERE id=1')
        raises(LostLock,lambda:save(db,held,'Deleted row'))
        assert owner(db)==held.token and cancel(db,held)
    path=str(pathlib.Path(directory,'real.sqlite'))
    with contextlib.closing(connect(path)) as first, contextlib.closing(sqlite3.connect(path,isolation_level=None,timeout=0)) as second:
        held=acquire(first,1)
        assert owner(second)==held.token and title(second)=='Draft'
        assert not first.in_transaction and not second.in_transaction
        raises(Busy,lambda:acquire(second,1))
        # Physical database contention is separate from a committed logical reservation.
        first.execute('BEGIN IMMEDIATE')
        raises(sqlite3.OperationalError,lambda:cancel(second,held))
        assert first.in_transaction and not second.in_transaction and owner(first)==held.token
        first.execute('ROLLBACK')
        # Trusted revocation followed by acquisition invalidates stale ownership.
        assert cancel(second,held)
        replacement=acquire(second,1)
        raises(LostLock,lambda:save(first,held,'Revoked'))
        assert not cancel(first,held) and owner(first)==replacement.token
        save(second,replacement,'Reviewed')
        assert title(first)=='Reviewed' and owner(first) is None
        # Bypassing participating writers is deliberately not prevented by the table.
        held=acquire(first,1)
        second.execute("UPDATE notes SET title='Direct bypass' WHERE id=1")
        assert owner(first)==held.token and title(first)=='Direct bypass'
        assert cancel(first,held)
    # A committed reservation survives connection closure, requiring deliberate recovery.
    abandoned_db=sqlite3.connect(path,isolation_level=None)
    abandoned=acquire(abandoned_db,1);abandoned_db.close()
    with contextlib.closing(sqlite3.connect(path,isolation_level=None)) as recovery:
        assert owner(recovery)==abandoned.token
        raises(Busy,lambda:acquire(recovery,1))
        assert cancel(recovery,abandoned)
        current=acquire(recovery,1)
        raises(LostLock,lambda:save(recovery,abandoned,'Late client'))
        assert owner(recovery)==current.token
        assert cancel(recovery,current)
    default=sqlite3.connect(':memory:')
    raises(RuntimeError,lambda:acquire(default,1));default.close()
    closed=connect();closed.close()
    raises(sqlite3.ProgrammingError,lambda:acquire(closed,1))
print('Pessimistic Offline Lock: seven exact output lines; durable acquisition, competing refusal, fresh owner tokens, guarded save/release, stale and revoked handles, release-failure rollback, input bounds, missing/corrupt rows, connection-close abandonment/recovery, transaction ownership, physical contention, and bypass-writer limits checked.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
