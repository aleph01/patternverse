import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bundle = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = bundle.patterns.find((p) => p.id === 'optimistic-offline-lock');
const article = await readFile(
  resolve(root, 'content/patterns/optimistic-offline-lock.md'),
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
with tempfile.TemporaryDirectory(prefix='patternverse-optimistic-') as directory:
    for name,source in examples.items(): pathlib.Path(directory,name).write_text(source)
    sys.path.insert(0,directory)
    module=importlib.import_module('notes')
    Note,Conflict,load,save=module.Note,module.Conflict,module.load,module.save
    output=io.StringIO()
    with contextlib.redirect_stdout(output): runpy.run_path(str(pathlib.Path(directory,'demo.py')))
    assert output.getvalue()==('read versions: 1 1\\nalice saved: 2\\nbob: reload and review\\nstored: Launch plan 2\\nreviewed save: 3\\nedit-log rows: 2\\n'),repr(output.getvalue())
    for bad in [None,True,False,0,-1,1.0,'1',2**63]:
        raises(ValueError,lambda:Note(bad,'Title',1))
        raises(ValueError,lambda:Note(1,'Title',bad))
    for bad in [None,True,1,'',' ','x'*81,'bad\\nline']:
        raises(ValueError,lambda:Note(1,bad,1))
    assert len(Note(1,'x'*80,1).title)==80
    frozen=Note(1,'Original',1)
    raises(FrozenInstanceError,lambda:setattr(frozen,'version',2))
    def connect(path=':memory:'):
        db=sqlite3.connect(path,isolation_level=None,timeout=0)
        db.execute('CREATE TABLE notes(id INTEGER PRIMARY KEY,title TEXT NOT NULL,version INTEGER NOT NULL)')
        db.execute('CREATE TABLE edits(note_id INTEGER,version INTEGER,title TEXT,UNIQUE(note_id,version))')
        db.execute("INSERT INTO notes VALUES(1,'Draft',1)")
        return db
    def logs(db): return db.execute('SELECT * FROM edits ORDER BY note_id,version').fetchall()
    with contextlib.closing(connect()) as db:
        trace=[];db.set_trace_callback(trace.append)
        a,b=load(db,1),load(db,1)
        assert a is not b and a.version==b.version==1 and not db.in_transaction
        trace.clear()
        stored=save(db,a,"O'Connor")
        assert stored==Note(1,"O'Connor",2) and a.version==1
        assert [s.split()[0] for s in trace]==['BEGIN','UPDATE','INSERT','COMMIT']
        trace.clear()
        raises(Conflict,lambda:save(db,b,'Stale'))
        assert trace[-1]=='ROLLBACK' and not db.in_transaction
        assert load(db,1)==stored and logs(db)==[(1,2,"O'Connor")]
        # A failure after the guarded UPDATE must restore both title and version.
        db.execute("CREATE TRIGGER fail_log BEFORE INSERT ON edits BEGIN SELECT RAISE(ABORT,'log unavailable'); END")
        raises(sqlite3.IntegrityError,lambda:save(db,stored,'Must roll back'))
        assert load(db,1)==stored and logs(db)==[(1,2,"O'Connor")] and not db.in_transaction
        db.execute('DROP TRIGGER fail_log')
        next_note=save(db,stored,stored.title)
        assert next_note.version==3 and len(logs(db))==2
        # Exhaustion and invalid proposals fail before SQL.
        trace.clear()
        raises(ValueError,lambda:save(db,Note(1,'Max',2**63-1),'No wrap'))
        raises(ValueError,lambda:save(db,next_note,''))
        raises(TypeError,lambda:save(db,None,'Wrong snapshot'))
        assert trace==[]
        assert load(db,99) is None
        raises(Conflict,lambda:save(db,Note(99,'Absent',1),'Missing'))
        assert not db.in_transaction
        missing=load(db,1);db.execute('DELETE FROM notes WHERE id=1')
        raises(Conflict,lambda:save(db,missing,'Deleted'))
        assert load(db,1) is None
        # Caller transactions are rejected and not rolled back by this operation.
        db.execute("INSERT INTO notes VALUES(1,'Restored',4)")
        base=load(db,1)
        db.execute('BEGIN')
        db.execute("UPDATE notes SET title='Caller pending' WHERE id=1")
        raises(RuntimeError,lambda:save(db,base,'Not owned'))
        assert db.in_transaction and load(db,1).title=='Caller pending'
        db.execute('ROLLBACK')
        assert load(db,1)==base
        db.execute("INSERT INTO notes VALUES(2,'Corrupt',0)")
        raises(ValueError,lambda:load(db,2))
    # Two actual connections retain snapshots without holding a transaction.
    path=str(pathlib.Path(directory,'real.sqlite'))
    with contextlib.closing(connect(path)) as first, contextlib.closing(sqlite3.connect(path,isolation_level=None,timeout=0)) as second:
        a,b=load(first,1),load(second,1)
        assert not first.in_transaction and not second.in_transaction
        winner=save(first,a,'First wins')
        raises(Conflict,lambda:save(second,b,'Stale loses'))
        assert load(second,1)==winner and len(logs(second))==1
        # Physical contention remains an OperationalError, not a version conflict.
        first.execute('BEGIN IMMEDIATE')
        raises(sqlite3.OperationalError,lambda:save(second,winner,'Busy'))
        assert first.in_transaction and not second.in_transaction
        first.execute('ROLLBACK')
        assert load(second,1)==winner
        # Deliberately bypassing the token protocol makes stale detection fail.
        proposal=load(first,1)
        second.execute("UPDATE notes SET title='Unversioned bypass' WHERE id=1")
        assert save(first,proposal,'Overwrites bypass').version==proposal.version+1
        # Per-row guards do not validate a cross-row read set.
        first.execute("INSERT INTO notes VALUES(3,'On call',1)")
        first.execute("INSERT INTO notes VALUES(4,'On call',1)")
        left,right=load(first,3),load(second,4)
        save(first,left,'Off call');save(second,right,'Off call')
        assert first.execute("SELECT COUNT(*) FROM notes WHERE id IN (3,4) AND title='On call'").fetchone()[0]==0
    default=sqlite3.connect(':memory:')
    raises(RuntimeError,lambda:save(default,Note(1,'x',1),'y'));default.close()
    closed=connect();snapshot=load(closed,1);closed.close()
    raises(sqlite3.ProgrammingError,lambda:save(closed,snapshot,'Closed'))
print('Optimistic Offline Lock: six exact output lines; two-connection stale rejection, version advance, immutable snapshots, missing/deleted rows, post-update log rollback, no-op saves, input and counter bounds, owned transactions, physical contention, bypass-writer and cross-row read-set limits checked.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
