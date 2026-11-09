import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/cache-aside.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 1) throw new Error('Expected one complete Python program.');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-cache-aside-'));
const checks = `
import contextlib, io, runpy
output = io.StringIO()
with contextlib.redirect_stdout(output):
    module = runpy.run_path('cache_aside.py')
expected = ['1200 1200 1', '1300 2', '1300 2', '1400 3', 'missing not cached True']
assert output.getvalue().splitlines() == expected
Cache = module['CacheAside']
now = [0.0]
db = {'a': 0, 'b': 2, 'c': 3}
calls = []
def load(k):
    calls.append(k)
    return db[k]
def save(k, v):
    db[k] = v
c = Cache(load, save, clock=lambda: now[0])
assert c.read('a') == c.read('a') == 0 and calls == ['a']
assert c.read('b') == 2
assert c.read('a') == 0
assert c.read('c') == 3 and list(c.entries) == ['a', 'c']
assert c.read('b') == 2 and len(c.entries) == 2 and 'a' not in c.entries
# Hits update recency, but never extend a fixed expiry.
c = Cache(load, save, clock=lambda: now[0])
assert c.read('a') == 0
now[0] = 9.999
assert c.read('a') == 0 and c.entries['a'][1] == 10
before = len(calls)
now[0] = 10
assert c.read('a') == 0 and len(calls) == before + 1
assert c.entries['a'][1] == 20
# Repeated missing reads reach the source; failures create no cache entry.
for _ in range(2):
    try: c.read('missing')
    except KeyError: pass
    else: raise AssertionError('Expected KeyError')
assert calls[-2:] == ['missing', 'missing'] and 'missing' not in c.entries
# An expired entry is not served when its reload fails.
del db['a']; now[0] = 20
try: c.read('a')
except KeyError: pass
else: raise AssertionError('Expected failed reload')
assert 'a' not in c.entries
# Source-first ordering: a failing save is propagated before invalidation.
db['a'] = 10; now[0] = 0
c = Cache(load, save, clock=lambda: now[0]); c.read('a')
observed = []
def failing_save(k, v):
    observed.append((db[k], c.entries[k][0]))
    raise RuntimeError('source rejected write before commit')
c.save = failing_save
try: c.write('a', 11)
except RuntimeError: pass
else: raise AssertionError('Expected save failure')
assert observed == [(10, 10)] and c.read('a') == db['a'] == 10
# A committed source value exists while the old cache still awaits deletion.
def inspect_save(k, v):
    db[k] = v
    observed.append((db[k], c.entries[k][0]))
c.save = inspect_save; c.write('a', 11)
assert observed[-1] == (11, 10) and 'a' not in c.entries
assert c.read('a') == 11
# Private caches have separate copies; one writer cannot invalidate the other.
x = Cache(load, save, clock=lambda: now[0])
y = Cache(load, save, clock=lambda: now[0])
assert x.read('a') == y.read('a') == 11
x.write('a', 12)
assert x.read('a') == 12 and y.read('a') == 11
# A controlled reentrant loader reproduces the figure's late-fill race.
db['P7'] = 1200
trace = []
def delayed_load(k):
    value = db[k]
    trace.append(['reader reads', value])
    race.write(k, 1300)
    trace.append(['writer invalidated', k not in race.entries])
    return value
def racing_save(k, v):
    db[k] = v
    trace.append(['writer commits', v])
race = Cache(delayed_load, racing_save, clock=lambda: now[0])
assert race.read('P7') == 1200
trace.append(['late fill', race.entries['P7'][0]])
assert db['P7'] == 1300 and race.read('P7') == 1200
assert trace == [['reader reads',1200],['writer commits',1300],['writer invalidated',True],['late fill',1200]]
# TTL begins after load, so an old snapshot can be installed with a new lifetime.
now[0] = 0
def slow_load(k):
    value = db[k]
    now[0] = 100
    return value
slow = Cache(slow_load, save, clock=lambda: now[0])
slow.read('P7')
assert slow.entries['P7'][1] == 110
# The default clock is monotonic; clear/cold cache reloads the source.
from time import monotonic
assert Cache(load, save).clock is monotonic
before = len(calls); x.entries.clear(); x.read('b')
assert len(calls) == before + 1
import json
print(json.dumps({'status':'passed','output':expected,'checks':['zero value and warm hit','bounded LRU and recency','fixed TTL before/equal expiry','missing and failed expired reload','source-first ordering and pre-commit failure','independent local instances','controlled stale late fill','TTL from installation not source age','monotonic default','cold-cache reload'],'late_fill_trace':trace}))
`;
try {
  await writeFile(join(directory, 'cache_aside.py'), blocks[0]);
  await writeFile(join(directory, 'check.py'), checks);
  const result = spawnSync('python3', ['check.py'], { cwd: directory, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const record = JSON.parse(result.stdout);
  const visuals = await readFile(
    resolve(root, 'scripts/build-software-cache-aside-visuals.mjs'),
    'utf8',
  );
  for (const phrase of [
    'A reads source price 1200',
    'B writes source price 1300',
    'B deletes the cache key',
    'A installs its earlier 1200',
    'Source 1300; cache 1200',
  ]) {
    if (!visuals.includes(phrase)) throw new Error('Race illustration differs: ' + phrase);
  }
  const out = resolve(root, '.local/software-cache-aside');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'code-checks.json'), JSON.stringify(record, null, 2) + '\n');
  console.log('Article program and ten meaningful boundaries pass; late-fill race reproduced.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
