import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(
  resolve(root, 'content/patterns/scoped-resource-management.md'),
  'utf8',
);
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article Python fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-scoped-resource-management-'));
const run = (name) => {
  const result = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['small_archive.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index]);
  const expected = ["decoded: b'red'", 'invalid archive: rejected', 'oversize: rejected'];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `from contextlib import contextmanager
from gzip import compress, BadGzipFile
from pathlib import Path
import small_archive as article


def fails(kind, call):
    try: call()
    except kind as error: return error
    raise AssertionError('Expected '+kind.__name__)


class BodyFailure(BaseException): pass
class EntryFailure(Exception): pass
class CleanupFailure(Exception): pass


@contextmanager
def observed(fault=None):
    # Wrap real resources, retain references, and leave article/ExitStack logic intact.
    old_directory,old_decoder,old_open=article.TemporaryDirectory,article.GzipFile,Path.open
    state={'events':[], 'directories':[], 'raws':[], 'decoders':[], 'exit_kinds':[]}
    events=state['events']
    class Directory:
        def __init__(self):
            self.real=old_directory();self.path=Path(self.real.name)
            state['directories'].append(self)
        def __enter__(self):
            value=self.real.__enter__();events.append('enter directory');return value
        def __exit__(self,kind,error,tb):
            assert self.path.is_dir()
            assert all(r.real.closed for r in state['raws'])
            assert all(g.real.closed for g in state['decoders'])
            events.append('remove directory');state['exit_kinds'].append(('directory',kind))
            result=self.real.__exit__(kind,error,tb)
            assert not self.path.exists();return result
    class Raw:
        def __init__(self,real): self.real=real;state['raws'].append(self)
        def __getattr__(self,name): return getattr(self.real,name)
        def __enter__(self):
            self.real.__enter__();events.append('enter raw');return self
        def __exit__(self,kind,error,tb):
            assert all(g.real.closed for g in state['decoders'])
            assert all(d.path.is_dir() for d in state['directories'])
            events.append('close raw');state['exit_kinds'].append(('raw',kind))
            result=self.real.__exit__(kind,error,tb);assert self.real.closed
            if fault=='raw cleanup': raise CleanupFailure('raw cleanup after actual close')
            return result
    class Decoder:
        def __init__(self,**kwargs):
            if fault=='decoder construction': raise EntryFailure('construction failed')
            self.raw=kwargs['fileobj'];self.real=old_decoder(**kwargs)
            state['decoders'].append(self)
        def __enter__(self):
            self.real.__enter__()
            if fault=='decoder entry':
                # Failed entry must clean its own internal partial acquisition.
                self.real.close();events.append('self-clean failed decoder entry')
                raise EntryFailure('entry failed')
            events.append('enter decoder');return self
        def read(self,n):
            assert n==9 and not self.raw.closed
            if fault=='body': raise BodyFailure('body interrupted')
            return self.real.read(n)
        def __exit__(self,kind,error,tb):
            assert not self.raw.closed
            assert all(d.path.is_dir() for d in state['directories'])
            events.append('close decoder');state['exit_kinds'].append(('decoder',kind))
            result=self.real.__exit__(kind,error,tb)
            assert self.real.closed and not self.raw.closed
            if fault=='decoder cleanup': raise CleanupFailure('decoder cleanup after actual close')
            return result
    def opened(path,*args,**kwargs):
        mode=args[0] if args else kwargs.get('mode','r')
        if mode=='rb':
            if fault=='raw open':
                # Real filesystem failure after write_bytes has already created the archive.
                assert path.exists();path.unlink()
                return old_open(path,*args,**kwargs)
            return Raw(old_open(path,*args,**kwargs))
        return old_open(path,*args,**kwargs)
    article.TemporaryDirectory=Directory;article.GzipFile=Decoder;Path.open=opened
    try: yield state
    finally:
        article.TemporaryDirectory=old_directory;article.GzipFile=old_decoder;Path.open=old_open
        assert all(not d.path.exists() for d in state['directories'])
        assert all(r.real.closed for r in state['raws'])
        assert all(g.real.closed for g in state['decoders'])


def complete(state):
    assert state['events']==['enter directory','enter raw','enter decoder','close decoder','close raw','remove directory'],state['events']
    assert len(state['directories'])==len(state['raws'])==len(state['decoders'])==1
    assert not state['directories'][0].path.exists()
    assert state['raws'][0].closed and state['decoders'][0].real.closed


# Validation precedes allocation. No Boolean, mutable buffer, empty or oversize input accepted.
for payload in [None,False,1,'gzip',bytearray(compress(b'red')),b'',b'x'*65]:
    with observed() as state:
        fails(ValueError,lambda:article.read_small_gzip(payload))
        assert state['events']==[] and state['directories']==[]

# Empty, ordinary and exact maximum decoded byte counts; detached immutable output survives cleanup.
paths=[]
for plain in [b'',b'red',b'12345678']:
    payload=compress(plain,mtime=0);before=payload
    with observed() as state:
        result=article.read_small_gzip(payload)
        complete(state);assert type(result) is bytes and result==plain and payload==before
        paths.append(state['directories'][0].path)
assert len(set(paths))==3

# The maximum compressed length is accepted: gzip permits zero padding after the member.
padded=compress(b'',mtime=0);padded+=b'\\0'*(64-len(padded))
assert len(padded)==64
with observed() as state:
    assert article.read_small_gzip(padded)==b'';complete(state)
with observed() as state:
    fails(ValueError,lambda:article.read_small_gzip(compress(b'123456789',mtime=0)))
    complete(state)

# Bad header, bad CRC and truncated trailer exercise real decoder errors and full cleanup.
valid=compress(b'red',mtime=0);bad_crc=bytearray(valid);bad_crc[-8]^=1
for payload,kind in [(b'not gzip',BadGzipFile),(bytes(bad_crc),BadGzipFile),(valid[:-4],EOFError)]:
    with observed() as state:
        fails(kind,lambda:article.read_small_gzip(payload));complete(state)
        assert all(k is kind for _,k in state['exit_kinds'])

# A real open failure unwinds only the entered directory; no decoder exists or raw exit runs.
with observed('raw open') as state:
    fails(FileNotFoundError,lambda:article.read_small_gzip(valid))
    assert state['events']==['enter directory','remove directory']
    assert not state['raws'] and not state['decoders']

# Construction failure leaves earlier owners registered. Failed entry cleans itself, never gets exited twice.
with observed('decoder construction') as state:
    fails(EntryFailure,lambda:article.read_small_gzip(valid))
    assert state['events']==['enter directory','enter raw','close raw','remove directory']
    assert not state['decoders']
with observed('decoder entry') as state:
    fails(EntryFailure,lambda:article.read_small_gzip(valid))
    assert state['events']==['enter directory','enter raw','self-clean failed decoder entry','close raw','remove directory']
    assert all(name!='decoder' for name,_ in state['exit_kinds'])

# Structured BaseException unwinding also reaches every successfully registered exit.
with observed('body') as state:
    error=fails(BodyFailure,lambda:article.read_small_gzip(valid));complete(state)
    assert str(error)=='body interrupted'
    assert all(k is BodyFailure for _,k in state['exit_kinds'])

# Exit failures are injected after actual close; remaining exits still run and failure replaces return/body error.
for fault in ['decoder cleanup','raw cleanup']:
    with observed(fault) as state:
        fails(CleanupFailure,lambda:article.read_small_gzip(valid));complete(state)
with observed('decoder cleanup') as state:
    error=fails(CleanupFailure,lambda:article.read_small_gzip(b'not gzip'));complete(state)
    assert isinstance(error.__context__,BadGzipFile)
    assert state['exit_kinds']==[('decoder',BadGzipFile),('raw',CleanupFailure),('directory',CleanupFailure)]
print('Real ownership, reverse cleanup, return boundary, partial setup, entry/body/cleanup failures and byte limits passed.')
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-scoped-resource-management');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['small_archive.py', 'demo.py'],
        stdout: expected,
        verification:
          'Actual article fences executed unchanged. Exact three-line output; invalid type, mutable input, empty and 65-byte inputs reject before any acquisition; empty, ordinary, exact eight-byte output and padded 64-byte compressed input accepted; nine-byte output rejected. Real gzip bad header, CRC and truncated trailer errors propagate. Instrumentation retains real resources and wraps entry/exit seams without replacing article logic or ExitStack. Real decoder close leaves supplied raw open; raw closes before directory removal. All live handles are closed and directories absent before caller observes a result/error. Output remains independent immutable bytes and caller input unchanged; separate calls own distinct directories. A real raw-file open failure releases only directory; injected decoder-construction and failed-entry cases clean prior acquisitions, with entry cleaning its own partial wrapper and no unmatched decoder exit. BaseException body interruption unwinds all successful registrations. Decoder/raw cleanup errors injected after actual close still run remaining exits and replace success; body plus decoder cleanup failure retains BadGzipFile as exception context. Cleanup invocation does not prove release success under arbitrary release errors. No abrupt-process cleanup, rollback, async/background completion, deadline, or decompression CPU/memory security bound is inferred.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
