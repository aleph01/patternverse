import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/health-endpoint.md'), 'utf8');
const blocks = [...source.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== 2) throw new Error('Expected two actual article Python fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-health-endpoint-'));
const run = (name) => {
  const r = spawnSync('python3', [name], { cwd: directory, encoding: 'utf8', timeout: 25000 });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message || 'Example failed');
  return r.stdout;
};
try {
  for (const [i, name] of ['health.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[i]);
  const expected = [
    'starting 200 503 503',
    'ready 200 200 200',
    'dependency down 200 200 503',
    'recovered 200 200 200',
    'draining 200 200 503',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  await writeFile(
    join(directory, 'verify.py'),
    `import json
from contextlib import redirect_stderr
from io import StringIO
from itertools import product
from pathlib import Path
from threading import Lock,Thread,enumerate as threads
from urllib.error import HTTPError
from urllib.request import ProxyHandler,Request,build_opener
from wsgiref.simple_server import make_server,WSGIRequestHandler
from wsgiref.validate import validator
from health import health_app

baseline={t.ident for t in threads()}
state=(False,False,False);lock=Lock();reads=[]
def snapshot():
    with lock:reads.append(state);return state
class Quiet(WSGIRequestHandler):
    def log_message(self,*args):pass
client=build_opener(ProxyHandler({}));responses=[]
with make_server('127.0.0.1',0,validator(health_app(snapshot)),handler_class=Quiet) as server:
    worker=Thread(target=server.serve_forever,kwargs={'poll_interval':0.01});worker.start()
    base='http://127.0.0.1:'+str(server.server_port)
    def request(path,method='GET'):
        try:response=client.open(Request(base+path,method=method),timeout=1)
        except HTTPError as error:response=error
        with response:
            status=response.status;headers=response.headers;body=response.read()
        assert response.closed
        responses.append(response)
        return status,headers,body
    try:
        phases=[('starting',(False,False,False)),('ready',(True,True,False)),('dependency down',(True,False,False)),('recovered',(True,True,False)),('draining',(True,True,True))]
        trace=[]
        for label,value in phases:
            with lock:state=value
            trace.append([label,*[request(path)[0] for path in ['/livez','/startupz','/readyz']]])
        assert trace==[['starting',200,503,503],['ready',200,200,200],['dependency down',200,200,503],['recovered',200,200,200],['draining',200,200,503]]
        Path('trace.json').write_text(json.dumps(trace))
        for flags in product([False,True],repeat=3):
            with lock:state=flags
            expected=[200,200 if flags[0] else 503,200 if flags[0] and flags[1] and not flags[2] else 503]
            for path,want in zip(['/livez','/startupz','/readyz'],expected):
                before=len(reads)
                status,headers,body=request(path)
                assert status==want and body==(b'ok\\n' if want==200 else b'unavailable\\n')
                assert headers['Content-Type']=='text/plain' and headers['Cache-Control']=='no-store'
                assert int(headers['Content-Length'])==len(body)
                assert len(reads)-before==(0 if path=='/livez' else 1)
                status,head_headers,head_body=request(path,'HEAD')
                assert status==want and not head_body
                assert head_headers['Content-Length']==headers['Content-Length']
                assert head_headers['Cache-Control']=='no-store'
        for path in ['/health','/readyz/','/missing']:
            before=len(reads);status,headers,body=request(path)
            assert status==404 and body==b'unavailable\\n' and len(reads)==before
        for method in ['POST','PUT','DELETE']:
            before=len(reads);status,headers,body=request('/readyz',method)
            assert status==405 and headers['Allow']=='GET, HEAD' and body==b'unavailable\\n'
            assert len(reads)==before and headers['Cache-Control']=='no-store'
        with lock:state=(True,True,False)
        assert request('/readyz?debug=private')[0]==200
        assert all(r.closed for r in responses)
    finally:
        server.shutdown();worker.join(2)
    assert not worker.is_alive()
assert server.socket.fileno()==-1

# A failed snapshot provider is not consulted by shallow liveness. Stateful
# failure remains failure: the HTTP server reports 500, not a fabricated 200.
error=RuntimeError('check failed')
def broken():raise error
app=health_app(broken);captured=[]
def start(status,headers):captured.append((status,headers))
assert app({'REQUEST_METHOD':'GET','PATH_INFO':'/livez'},start)==[b'ok\\n']
assert captured[-1][0]=='200 OK'
try:app({'REQUEST_METHOD':'GET','PATH_INFO':'/readyz'},start)
except RuntimeError as observed:assert observed is error
else:raise AssertionError('State failure must propagate')
with redirect_stderr(StringIO()):
    with make_server('127.0.0.1',0,validator(app),handler_class=Quiet) as failed_server:
        worker=Thread(target=failed_server.serve_forever,kwargs={'poll_interval':0.01});worker.start()
        try:
            try:client.open('http://127.0.0.1:'+str(failed_server.server_port)+'/readyz',timeout=1)
            except HTTPError as response:
                with response:
                    assert response.status==500
                    assert b'check failed' not in response.read()
            else:raise AssertionError('Expected HTTP failure')
        finally:failed_server.shutdown();worker.join(2)
        assert not worker.is_alive()
assert failed_server.socket.fileno()==-1
assert {t.ident for t in threads()}==baseline
print('Actual loopback HTTP, exact five-phase trace, all eight state combinations, liveness independence, snapshot calls, HEAD/method/route boundaries, no-store/minimal bodies, failed provider and owned response/listener/thread cleanup passed.')
`,
  );
  const verification = run('verify.py');
  const actual = JSON.parse(await readFile(join(directory, 'trace.json'), 'utf8'));
  const generator = await readFile(
    resolve(root, 'scripts/build-software-health-endpoint-visuals.mjs'),
    'utf8',
  );
  const literal = generator.match(/const rows\s*=\s*(\[[\s\S]*?\]);/)[1];
  const drawn = JSON.parse(literal.replaceAll("'", '"').replace(/,\s*([\]}])/g, '$1'));
  if (JSON.stringify(actual) !== JSON.stringify(drawn))
    throw new Error('Lifecycle figure differs from actual HTTP responses');
  const out = resolve(root, '.local/software-health-endpoint');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['health.py', 'demo.py'],
        stdout: expected,
        illustration_trace_matches_actual_http: true,
        verification:
          'Actual article fences run unchanged on Python 3.11+. Real ephemeral loopback HTTP requests produce all five exact output rows and match every lifecycle figure value. WSGI validation middleware verifies the app/server boundary. All eight Boolean state combinations are tested over GET and HEAD: liveness never reads the dependency snapshot, startup tracks initialization, readiness requires initialization plus dependency and excludes draining, and stateful requests read one snapshot. HEAD has empty body with matching content-length semantics. Unsupported methods return 405/Allow without consulting state, unknown paths return 404, query strings do not echo private values, and ordinary responses use minimal fixed bodies and no-store. A broken provider propagates its exact error through the app and becomes HTTP 500 at the server, without a green fallback or diagnostic disclosure; shallow liveness remains independent. Responses close, listeners close and server threads are shut down/joined with inventory returning to baseline. No real dependency verification, freshness enforcement, business handler, production server, authentication/TLS, observer/controller, routing removal, restart action or complete deadline is inferred.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
