import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = metadata.patterns.find((p) => p.id === 'layers');
const article = await readFile(resolve(root, 'content/patterns/layers.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length)
  throw new Error('Code files and article blocks disagree.');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));
const check = `
import ast, contextlib, importlib, io, json, pathlib, runpy, sys, tempfile
examples = json.load(sys.stdin)
expected_imports = {
    'prices.py': set(),
    'pricing.py': {'prices'},
    'presentation.py': {'pricing'},
    'main.py': {'prices', 'pricing', 'presentation'},
}
assert set(examples) == set(expected_imports)
with tempfile.TemporaryDirectory(prefix='patternverse-layers-') as directory:
    for name, source in examples.items():
        tree = ast.parse(source, filename=name)
        imports = {node.module for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)}
        assert imports == expected_imports[name], (name, imports)
        assert not any(isinstance(node, ast.Import) for node in ast.walk(tree)), name
        pathlib.Path(directory, name).write_text(source)
    sys.path.insert(0, directory)
    PriceBook = importlib.import_module('prices').PriceBook
    QuoteService = importlib.import_module('pricing').QuoteService
    quote_text = importlib.import_module('presentation').quote_text
    class RecordingPrices(PriceBook):
        def __init__(self):
            super().__init__()
            self.lookups = []
        def unit_price_cents(self, product):
            self.lookups.append(product)
            return super().unit_price_cents(product)
    prices = RecordingPrices()
    service = QuoteService(prices)
    assert quote_text(service, 'notebook', '2') == '6.00 EUR'
    assert quote_text(service, 'notebook', '10') == '25.00 EUR'
    assert service.total_cents('notebook', 1) == 350
    assert service.total_cents('notebook', 9) == 2350
    assert service.total_cents('notebook', 10) == 2500
    assert service.total_cents('notebook', 11) == 2750
    count = len(prices.lookups)
    for quantity in [0, -1, True, 2.5, '2']:
        try:
            service.total_cents('notebook', quantity)
        except ValueError:
            pass
        else:
            raise AssertionError(('Accepted invalid quantity', quantity))
    assert len(prices.lookups) == count, 'Invalid quantities reached data access'
    for text in ['0', '-1', 'two', '2.5']:
        try:
            quote_text(service, 'notebook', text)
        except ValueError:
            pass
        else:
            raise AssertionError(('Accepted invalid input', text))
    assert len(prices.lookups) == count
    try:
        service.total_cents('missing', 2)
    except KeyError:
        pass
    else:
        raise AssertionError('Missing product did not fail as documented')
    class ReplacementPrices(PriceBook):
        def unit_price_cents(self, product):
            return 500
    assert quote_text(QuoteService(ReplacementPrices()), 'notebook', '2') == '11.00 EUR'
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        runpy.run_path(str(pathlib.Path(directory, 'main.py')), run_name='__main__')
    assert output.getvalue() == '6.00 EUR\\n25.00 EUR\\n', output.getvalue()
print('Layers: four real modules, downward imports, displayed totals, fee boundary, invalid input, missing product, and storage replacement verified.')
`;
const result = spawnSync('python3', ['-I', '-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  timeout: 10_000,
});
if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
process.stdout.write(result.stdout);
