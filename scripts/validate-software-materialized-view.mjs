import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/data-materialized-views.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-materialized-view-'));
const checks = `
import contextlib,io,runpy,json,sqlite3
from contextlib import closing
from pathlib import Path
from tempfile import TemporaryDirectory
output=io.StringIO()
with contextlib.redirect_stdout(output):
    module=runpy.run_path('materialized_view.py',run_name='__main__')
expected=['initial (1, 3, 10000)','stale (1, 3, 10000)','refreshed (2, 4, 11000)','failed (2, 4, 11000)','recovered (3, 3, 7000)']
assert output.getvalue().splitlines()==expected
try: module['db'].execute('SELECT 1')
except sqlite3.ProgrammingError: pass
else: raise AssertionError('Example connection was not closed')
initialize,refresh,report=(module[n] for n in ['initialize','refresh','report'])
def seed(db):
    db.executemany("INSERT INTO sales VALUES (?, 'A', 'USD', ?)",[(1,5000),(2,3000),(3,2000)])
def target(db):
    return db.execute('SELECT * FROM shop_sales ORDER BY shop,currency').fetchall()
with closing(sqlite3.connect(':memory:',isolation_level=None)) as db:
    initialize(db)
    try: report(db)
    except LookupError: pass
    else: raise AssertionError('Uninitialized result presented as empty sales')
    # Failed first publication must retain generation zero and no partial result.
    seed(db)
    db.execute("CREATE TRIGGER reject_publication AFTER UPDATE ON publication BEGIN SELECT RAISE(ABORT, 'blocked'); END")
    try: refresh(db)
    except sqlite3.IntegrityError as e: assert str(e)=='blocked'
    else: raise AssertionError('Expected publication failure')
    assert target(db)==[] and db.execute('SELECT generation FROM publication').fetchone()==(0,)
    assert not db.in_transaction
    db.execute('DROP TRIGGER reject_publication')
    refresh(db); assert report(db)==(1,3,10000)
    # Reads remain independent of source aggregation.
    db.execute("INSERT INTO sales VALUES (4,'A','USD',1000)")
    def deny_source(action,name,column,database,trigger):
        return sqlite3.SQLITE_DENY if action==sqlite3.SQLITE_READ and name=='sales' else sqlite3.SQLITE_OK
    db.set_authorizer(deny_source)
    assert report(db)==(1,3,10000)
    try: refresh(db)
    except sqlite3.DatabaseError: pass
    else: raise AssertionError('Source read failure swallowed')
    db.set_authorizer(None)
    assert report(db)==(1,3,10000) and not db.in_transaction
    refresh(db); assert report(db)==(2,4,11000)
    # Full refresh replaces, rather than incrementally re-adds, contributions.
    refresh(db); assert report(db)==(3,4,11000)
    db.execute('UPDATE sales SET cents=4000 WHERE id=1')
    db.execute('DELETE FROM sales WHERE id=2')
    old=target(db); generation=report(db)[0]
    db.execute("CREATE TRIGGER reject_publication AFTER UPDATE ON publication BEGIN SELECT RAISE(ABORT, 'blocked'); END")
    try: refresh(db)
    except sqlite3.IntegrityError: pass
    else: raise AssertionError('Expected rollback')
    assert target(db)==old and report(db)==(generation,4,11000) and not db.in_transaction
    db.execute('DROP TRIGGER reject_publication')
    refresh(db); assert report(db)==(generation+1,3,7000)
    # Composite grain keeps shop/currency apart; real zero is not absence.
    db.execute("INSERT INTO sales VALUES (5,'A','EUR',900)")
    db.execute("INSERT INTO sales VALUES (6,'B','USD',0)")
    refresh(db)
    assert report(db,'A','EUR')[1:]==(1,900)
    assert report(db,'B','USD')[1:]==(1,0)
    assert report(db,'missing','USD')[1:]==(0,0)
    assert target(db)==[('A','EUR',1,900),('A','USD',3,7000),('B','USD',1,0)]
    before=target(db)
    for value in [-1,1.5,None]:
        try: db.execute("INSERT INTO sales VALUES (99,'A','USD',?)",(value,))
        except sqlite3.IntegrityError: pass
        else: raise AssertionError(('Invalid cents accepted',value))
    try: db.execute("INSERT INTO sales VALUES (1,'A','USD',100)")
    except sqlite3.IntegrityError: pass
    else: raise AssertionError('Duplicate source identity accepted')
    assert target(db)==before
    # Refusal to nest must not seize ownership of a caller transaction.
    db.execute('BEGIN'); db.execute("UPDATE sales SET cents=100 WHERE id=6")
    try: refresh(db)
    except ValueError: pass
    else: raise AssertionError('Nested refresh accepted')
    assert db.in_transaction
    db.rollback(); assert report(db,'B','USD')[1:]==(1,0)
    # Empty full rebuild clears all prior groups, and remains initialized.
    db.execute('DELETE FROM sales'); refresh(db)
    assert target(db)==[] and report(db)[1:]==(0,0) and report(db)[0]>0
# Real independent connections overlap transactions in a temporary WAL database.
with TemporaryDirectory() as temp:
    path=Path(temp)/'sales.sqlite'
    with closing(sqlite3.connect(path,isolation_level=None,timeout=0.01)) as writer:
        assert writer.execute('PRAGMA journal_mode=WAL').fetchone()==('wal',)
        initialize(writer); seed(writer); refresh(writer)
        with closing(sqlite3.connect(path.resolve().as_uri()+'?mode=ro',uri=True,isolation_level=None)) as reader, closing(sqlite3.connect(path,isolation_level=None,timeout=0.01)) as contender:
            reader.execute('BEGIN'); assert report(reader)==(1,3,10000)
            writer.execute("INSERT INTO sales VALUES (4,'A','USD',1000)")
            during=[]; locked=[]
            def observe(sql):
                if sql.lstrip().upper().startswith('INSERT INTO SHOP_SALES'):
                    during.append(report(reader))
                    try: contender.execute('BEGIN IMMEDIATE')
                    except sqlite3.OperationalError as e: locked.append(str(e))
            writer.set_trace_callback(observe)
            refresh(writer); writer.set_trace_callback(None)
            assert during==[(1,3,10000)] and locked and 'locked' in locked[0]
            assert not contender.in_transaction and not writer.in_transaction
            assert report(reader)==(1,3,10000)  # Existing read snapshot survives commit.
            reader.execute('COMMIT'); assert report(reader)==(2,4,11000)
            try: reader.execute('DELETE FROM shop_sales')
            except sqlite3.OperationalError: pass
            else: raise AssertionError('Read-only connection allowed maintenance')
    # SQLite can retain WAL sidecars after close; the directory owner removes them.
    for connection in (writer,reader,contender):
        try: connection.execute('SELECT 1')
        except sqlite3.ProgrammingError: pass
        else: raise AssertionError('Owned connection remained open')
assert not Path(temp).exists()
print(json.dumps({'status':'passed','output':expected,'initial':[1,3,10000],'stale':[1,3,10000],'refreshed':[2,4,11000],'failed':[2,4,11000],'recovered':[3,3,7000],'checks':['uninitialized and failed first publication','report never reads source','source-read failure rollback','full refresh retry is non-additive','correction and deletion','atomic summary and generation rollback','shop/currency grouping','zero versus absent group','invalid cents and duplicate identity','caller transaction ownership','empty refresh removes old groups','independent WAL reader sees old result during refresh','existing read snapshot versus fresh statement','competing writer exclusion','read-only consumer and owned connection/file cleanup']}))
`;
try {
  await writeFile(join(directory, 'materialized_view.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 20000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const record = JSON.parse(result.stdout);
  const visuals = (
    await readFile(resolve(root, 'scripts/build-software-materialized-view-visuals.mjs'), 'utf8')
  ).replaceAll(/\s/g, '');
  for (const row of [
    "['Initial publication',3,10000,1,3,10000]",
    "['New sale committed',4,11000,1,3,10000]",
    "['Refresh committed',4,11000,2,4,11000]",
    "['Published before refresh',2,4,11000",
    "['Candidate inside transaction',3,3,7000",
    "['Failure rolls back',2,4,11000",
    "['Retry commits',3,3,7000",
  ]) {
    if (!visuals.includes(row.replaceAll(/\s/g, '')))
      throw new Error('Diagram differs from program: ' + row);
  }
  const out = resolve(root, '.local/software-materialized-view');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'code-checks.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(
    'Actual program, failure/empty/identity boundaries, rollback and real WAL reader/writer overlap verified.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
