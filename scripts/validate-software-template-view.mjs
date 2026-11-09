import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/template-view.md'), 'utf8');
const blocks = [...source.matchAll(/```(html|python)\n([\s\S]*?)\n```/g)].map((m) => ({
  language: m[1],
  source: m[2] + '\n',
}));
if (blocks.map((b) => b.language).join(',') !== 'html,python,python')
  throw new Error('Expected actual HTML, renderer, and demo fences');
const directory = await mkdtemp(join(tmpdir(), 'patternverse-template-view-'));
const run = (name, cwd = directory) => {
  const result = spawnSync('python3', [join(directory, name)], {
    cwd,
    encoding: 'utf8',
    timeout: 15000,
  });
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || 'Example failed');
  return result.stdout;
};
try {
  for (const [index, name] of ['product.html', 'view.py', 'demo.py'].entries())
    await writeFile(join(directory, name), blocks[index].source);
  const expected = [
    '<article class="product-card">',
    '  <h1>A&amp;B &lt;Lab&gt;</h1>',
    '  <p>In stock</p>',
    '  <p>Units available: 3</p>',
    '</article>',
    'Unavailable',
    'Missing field: availability',
  ];
  const stdout = run('demo.py');
  if (stdout !== expected.join('\n') + '\n') throw new Error('Stated output differs: ' + stdout);
  if (run('demo.py', tmpdir()) !== stdout)
    throw new Error('Template lookup depends on caller working directory');
  await writeFile(
    join(directory, 'verify.py'),
    `import json
from pathlib import Path
from html.parser import HTMLParser
from view import product_context, render_product

class Inspect(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.tags, self.attributes, self.text = [], [], []
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        self.attributes.append(attrs)
    def handle_data(self, data): self.text.append(data)

def rejected(call, kind):
    try: call()
    except kind as error: return error
    raise AssertionError("Expected rejection")

for name in [None, 1, True, "", "  "]:
    rejected(lambda: product_context(name, 1), ValueError)
for units in [-1, 1.5, True, False, "1", None]:
    rejected(lambda: product_context("Item", units), ValueError)
zero = render_product(product_context("Empty", 0))
assert "<p>Unavailable</p>" in zero and "Units available: 0" in zero
error = rejected(lambda: render_product({"name": "Missing"}), KeyError)
assert error.args == ("availability",)
rejected(lambda: render_product({"name": "Item", "availability": "Available"}), KeyError)
rejected(lambda: render_product({"name": "Item", "availability": None, "units": "1"}), TypeError)

unsafe = '<img src="x"> \\u0024{units} & "quoted"'
for name in ["A&B <Lab>", unsafe, "工具 & <A>", "&amp;"]:
    context = product_context(name, 3)
    before = context.copy()
    html = render_product(context)
    assert context == before
    parsed = Inspect(html)
    assert parsed.tags == ["article", "h1", "p", "p"]
    assert parsed.attributes == [[("class", "product-card")], [], [], []]
    assert name in "".join(parsed.text)
    if name == unsafe:
        assert '\\u0024{units}' in html  # Inserted values are not recursively substituted.
        Path("unsafe-product.html").write_text(html, encoding="utf-8")
    if name == "A&B <Lab>":
        assert "A&amp;B &lt;Lab&gt;" in html
        Path("rendered-product.html").write_text(html, encoding="utf-8")
assert "Second" in render_product(product_context("Second", 2))
assert "First" not in render_product(product_context("Second", 2))

# Loading is relative to the module and happens once, not once per rendering call.
asset = Path(__file__).with_name("product.html")
backup = asset.read_text(encoding="utf-8")
asset.write_text("Changed template", encoding="utf-8")
try: assert '<article class="product-card">' in render_product(product_context("Cached", 1))
finally: asset.write_text(backup, encoding="utf-8")
Path("example-dom-inputs.json").write_text(json.dumps({"normal": "A&B <Lab>", "unsafe": unsafe}), encoding="utf-8")
print("Exact source output, HTML structure/text preservation, escaping, non-recursive substitution, missing fields, zero units, invalid data, context isolation, module-relative loading, and template reuse checks passed.")
`,
  );
  const verification = run('verify.py');
  const out = resolve(root, '.local/software-template-view');
  await mkdir(out, { recursive: true });
  for (const name of ['rendered-product.html', 'unsafe-product.html', 'example-dom-inputs.json'])
    await writeFile(join(out, name), await readFile(join(directory, name)));
  await writeFile(
    join(out, 'code-checks.json'),
    JSON.stringify(
      {
        status: 'passed',
        code_files: ['product.html', 'view.py', 'demo.py'],
        stdout: stdout.trimEnd().split('\n'),
        verification: verification.trim(),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(stdout + verification);
} finally {
  await rm(directory, { recursive: true, force: true });
}
