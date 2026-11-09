import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'microkernel');
const article = await readFile(resolve(root, 'content/patterns/microkernel.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, sys, tempfile
examples = json.load(sys.stdin)
expected_imports = {
    'kernel.py': {'typing'},
    'plugins.py': set(),
    'main.py': {'kernel', 'plugins'},
}
assert set(examples) == set(expected_imports)
with tempfile.TemporaryDirectory(prefix='patternverse-microkernel-') as directory:
    for name, source in examples.items():
        tree = ast.parse(source, filename=name)
        imports = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                imports.add(node.module)
            elif isinstance(node, ast.Import):
                imports.update(alias.name for alias in node.names)
        assert imports == expected_imports[name], (name, imports)
        pathlib.Path(directory, name).write_text(source)
    sys.path.insert(0, directory)
    DocumentKernel = importlib.import_module('kernel').DocumentKernel
    assert 'plugins' not in sys.modules, 'The core imported its extensions'
    text = 'Draft notes\\r\\nTODO: cite sources'
    assert DocumentKernel().inspect(text) == {'lines': 2, 'extensions': {}}
    plugins = importlib.import_module('plugins')

    def configured():
        app = DocumentKernel()
        app.register(plugins.WordCount())
        app.register(plugins.TodoCount())
        return app

    app = configured()
    expected = {'lines': 2, 'extensions': {'words': 5, 'todos': 1}}
    assert app.inspect(text) == expected
    assert app.inspect(text) == expected, 'Pure analyzers changed between requests'
    assert app.inspect('  Draft notes\\r\\n  TODO: cite sources  \\r') == expected
    assert app.inspect('   \\r\\n') == {'lines': 0, 'extensions': {'words': 0, 'todos': 0}}
    assert app.inspect('TODO: first\\rTODO: second') == {'lines': 2, 'extensions': {'words': 4, 'todos': 2}}
    try:
        app.register(plugins.WordCount())
    except RuntimeError:
        pass
    else:
        raise AssertionError('Sealed registry accepted new configuration')

    # Invalid input does not begin execution or close registration.
    app = DocumentKernel()
    for value in [None, 4, b'text', []]:
        try:
            app.inspect(value)
        except TypeError:
            pass
        else:
            raise AssertionError(('Accepted non-string input', value))
    app.register(plugins.WordCount())
    assert app.inspect('one') == {'lines': 1, 'extensions': {'words': 1}}

    # Rejected registration cannot silently replace a working extension.
    app = DocumentKernel()
    app.register(plugins.WordCount())
    class Duplicate:
        name = 'words'
        api_version = 1
        def analyze(self, text):
            return 999
    try:
        app.register(Duplicate())
    except ValueError:
        pass
    else:
        raise AssertionError('Duplicate identity was accepted')
    class Incompatible:
        name = 'future'
        api_version = 2
        def analyze(self, text):
            raise AssertionError('Incompatible extension executed')
    try:
        app.register(Incompatible())
    except ValueError:
        pass
    else:
        raise AssertionError('Incompatible API was accepted')
    for name in ['', ' ', 1, None]:
        invalid = Duplicate()
        invalid.name = name
        try:
            app.register(invalid)
        except ValueError:
            pass
        else:
            raise AssertionError(('Invalid identity accepted', name))
    assert app.inspect('one two') == {'lines': 1, 'extensions': {'words': 2}}

    # Each extension receives the same normalized input, in registration order.
    calls = []
    class RecordingAnalyzer:
        api_version = 1
        def __init__(self, name, count):
            self.name, self.count = name, count
        def analyze(self, text):
            calls.append((self.name, text))
            return self.count
    app = DocumentKernel()
    app.register(RecordingAnalyzer('second-alphabetically', 7))
    app.register(RecordingAnalyzer('first-alphabetically', 4))
    result = app.inspect('  A\\r\\nB  ')
    assert calls == [('second-alphabetically', 'A\\nB'), ('first-alphabetically', 'A\\nB')]
    assert list(result['extensions']) == ['second-alphabetically', 'first-alphabetically']
    assert result['extensions'] == {'second-alphabetically': 7, 'first-alphabetically': 4}

    # No partial report is returned after a plug-in exception. Earlier effects
    # remain, later extensions do not run, and configuration stays sealed.
    class Broken(RecordingAnalyzer):
        def analyze(self, text):
            calls.append((self.name, text))
            raise RuntimeError('extension failed')
    calls.clear()
    app = DocumentKernel()
    app.register(RecordingAnalyzer('before', 1))
    app.register(Broken('broken', 0))
    app.register(RecordingAnalyzer('after', 1))
    try:
        app.inspect('input')
    except RuntimeError as error:
        assert str(error) == 'extension failed'
    else:
        raise AssertionError('A failing extension produced a report')
    assert calls == [('before', 'input'), ('broken', 'input')]
    try:
        app.register(plugins.WordCount())
    except RuntimeError:
        pass
    else:
        raise AssertionError('A failed request reopened configuration')

    for value in [-1, 1.5, True, '2', None]:
        app = DocumentKernel()
        app.register(RecordingAnalyzer('invalid-count', value))
        try:
            app.inspect('input')
        except ValueError:
            pass
        else:
            raise AssertionError(('Invalid count accepted', value))

    captured = io.StringIO()
    with contextlib.redirect_stdout(captured):
        runpy.run_path(str(pathlib.Path(directory, 'main.py')), run_name='__main__')
    assert captured.getvalue() == (
        "{'lines': 2, 'extensions': {}}\\n"
        "{'lines': 2, 'extensions': {'words': 5, 'todos': 1}}\\n"
    ), captured.getvalue()
print('Microkernel: useful base core, optional extensions, normalization, empty input, compatibility and identity checks, sealed registration, execution order, invalid results, and failure semantics verified.')
`;
const result = spawnSync('python3', ['-I', '-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  timeout: 10_000,
});
if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
process.stdout.write(result.stdout);
