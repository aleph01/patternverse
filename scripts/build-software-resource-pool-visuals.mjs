import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets');
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 19, secondary = false) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${secondary ? '#626962' : '#252c28'}">${esc(value)}</text>`;
const rect = (x, y, width, height, accent = false, surface = false) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${surface ? '#fff' : accent ? '#edf5f0' : '#f1f2ef'}" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.2"/>`;
const arrow = (d) =>
  `<path d="${d}" fill="none" stroke="#00855b" stroke-width="1.5" marker-end="url(#arrow)"/>`;
const card = (x, y, width, title, detail, accent = false, height = 76, small = false) =>
  rect(x, y, width, height, accent) +
  text(x + 16, y + 29, title, small ? 18 : 20) +
  text(x + 16, y + 55, detail, small ? 16 : 17, true);

function svg(title, description, width, height, drawing) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}path,rect{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker><marker id="wiring" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#626962" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}

const descriptions = {
  ownership:
    'A pool manages two resources. One belongs exclusively to caller A while another is idle and available to caller B. Caller C must wait if both are borrowed. Use takes place outside the pool’s coordination lock, and a resource becomes available again only after return cleanup.',
  return:
    'A borrow owns a buffer until its scope ends, including on a job exception. Scope exit invalidates the old handle and resets all eight bytes before publishing the buffer as idle. If the pool has closed, the returned buffer is dropped instead. The next borrow receives a new handle; the old handle remains invalid.',
};
function ownership(phone) {
  let d = text(
    24,
    34,
    phone ? 'Pool owns resource lifetime' : 'The pool owns lifetime; callers borrow exclusive use',
    phone ? 22 : 24,
  );
  if (phone) {
    d += rect(24, 112, 312, 184, true) + text(40, 144, 'Pool owns two 8-byte buffers', 19);
    d += text(40, 190, 'R0 is already lent to caller A.', 16, true);
    d += text(40, 232, 'R1 is idle until caller B checks out.', 16, true);
    d += text(40, 274, 'No extra buffer on exhaustion.', 16, true);
    d += rect(24, 384, 312, 136) + text(40, 416, 'Caller B borrows R1', 20);
    d += text(40, 460, 'R1 changes from idle to borrowed.', 16, true);
    d += text(40, 496, 'It is the same resource, not a copy.', 16, true);
    d += rect(24, 608, 312, 136) + text(40, 640, 'Caller A still holds R0', 20);
    d += text(40, 684, 'Use outside the coordination lock.', 16, true);
    d += text(40, 720, 'No other borrower gets R0.', 16, true);
    d += arrow('M180 296V382') + text(196, 346, 'checkout', 16, true);
    d += text(40, 566, 'Two active borrows, distinct resources.', 16, true);
    d += rect(24, 840, 312, 184, true) + text(40, 872, 'Both borrowed or resetting?', 19);
    d += text(40, 916, 'Caller C waits for availability.', 16, true);
    d += text(40, 960, 'Return cleanup must finish first.', 16, true);
    d += text(40, 1000, 'Close wakes waiters to reject them.', 15, true);
    d += text(24, 1100, 'Capacity: idle + borrowed + resetting.', 16, true);
    d +=
      text(24, 1150, 'An active borrow occupies a place', 16, true) +
      text(24, 1182, 'even while its caller is doing no work.', 16, true);
    d += text(24, 1260, 'Arrow: checkout of R1 to caller B.', 16, true);
  } else {
    d += rect(24, 112, 672, 288, true) + text(40, 148, 'Pool owns two resources: R0 and R1', 21);
    d += card(48, 200, 296, 'R0: already lent to A', 'Unavailable to another caller', false, 160);
    d += card(376, 200, 296, 'R1: idle', 'Available until checkout', false, 160);
    d +=
      arrow('M196 400V450M196 500V558') + text(48, 478, 'Exclusive use already granted', 16, true);
    d +=
      arrow('M524 400V450M524 500V558') + text(384, 478, 'Checkout grants exclusive use', 16, true);
    d += card(48, 560, 296, 'Caller A uses R0', 'Work outside the pool lock', false, 144);
    d += card(376, 560, 296, 'Caller B now uses R1', 'Same resource, not a copy', false, 144);
    d += card(
      24,
      816,
      672,
      'If both resources are borrowed or resetting, caller C waits',
      'This fixed pool creates no third instance; close wakes waiters to reject them.',
      true,
      160,
    );
    d += text(24, 1050, 'Capacity counts idle + borrowed + resetting resources.', 20);
    d += text(
      24,
      1092,
      'A returned resource becomes available only after cleanup completes.',
      17,
      true,
    );
    d += text(
      24,
      1150,
      'Arrows: exclusive-use grants, not physical copies or permanent ownership.',
      17,
      true,
    );
  }
  return svg(
    'Resource Pool: lifetime and exclusive use',
    descriptions.ownership,
    phone ? 360 : 720,
    phone ? 1312 : 1200,
    d,
  );
}
function returned(phone) {
  let d = text(
    24,
    34,
    phone ? 'End the borrow before reuse' : 'Return cleanup separates one borrower from the next',
    phone ? 22 : 24,
  );
  if (phone) {
    const steps = [
      ['1 / scope ends', 'Normal return or a job exception.'],
      ['2 / invalidate old handle', 'Public read/write now reject it.'],
      ['3 / zero all eight bytes', 'Buffer stays unavailable during reset.'],
      ['4 / if open, make it idle', 'Next borrow gets a fresh handle.'],
    ];
    for (const [i, lines] of steps.entries()) {
      const y = 112 + i * 208;
      d += card(24, y, 312, lines[0], lines[1], i === 2, 136, true);
      if (i < 3) d += arrow(`M180 ${y + 136}V${y + 206}`);
    }
    d += rect(24, 1024, 312, 232, true) + text(40, 1056, 'If the pool has closed', 20);
    d += text(40, 1100, 'Reset the returning buffer, then drop it.', 15, true);
    d += text(40, 1144, 'Never put it back into circulation.', 16, true);
    d += text(40, 1188, 'Active borrows can finish their scope.', 16, true);
    d += text(40, 1232, 'No new borrows; waiters wake and fail.', 15, true);
    d += text(24, 1332, 'Arrows: cleanup order before reuse.', 16, true);
    d += text(24, 1376, 'An old handle never becomes valid again.', 16, true);
  } else {
    d += card(
      24,
      112,
      672,
      'The borrow scope ends, even when the job raises',
      'The pool’s finally block starts return cleanup.',
      false,
      128,
    );
    d += arrow('M360 240V318');
    d += card(
      24,
      320,
      672,
      'Invalidate the old handle, then reset all eight bytes',
      'The backing buffer remains unavailable while reset runs outside the pool lock.',
      true,
      144,
    );
    d += arrow('M360 464V542');
    d += card(
      24,
      544,
      672,
      'Under the condition lock, check whether the pool is still open',
      'Availability is published only after cleanup; notify waiting callers.',
      false,
      128,
    );
    d += arrow('M360 672V716H196V798') + arrow('M360 716H524V798');
    d += text(136, 760, 'open', 18, true) + text(548, 760, 'closed', 18, true);
    d += card(48, 800, 296, 'Return to idle', 'Next borrow: fresh handle', true, 144);
    d += card(376, 800, 296, 'Drop the buffer', 'No new borrow permitted', false, 144);
    d +=
      text(64, 910, 'Old handle stays invalid.', 16, true) +
      text(392, 910, 'Active use was not revoked.', 15, true);
    d += text(
      24,
      1040,
      'Pool close stops admission and wakes waiters; it does not join borrowers.',
      18,
    );
    d += text(24, 1090, 'Open-pool return reuses the resource, not the previous handle.', 18);
    d += text(
      24,
      1150,
      'Arrows: cleanup order and the open-versus-closed return decision.',
      17,
      true,
    );
  }
  return svg(
    'Resource Pool: reset before reuse',
    descriptions.return,
    phone ? 360 : 720,
    phone ? 1424 : 1200,
    d,
  );
}
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, build] of [
  ['ownership', ownership],
  ['return', returned],
])
  for (const phone of [false, true]) {
    const key = `software-engineering/resource-pool-${name}${phone ? '-mobile' : ''}.svg`;
    const source = build(phone);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    await writeFile(resolve(assets, key), source);
    manifest[key] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Generated Resource Pool: two native figures with separate phone compositions.');
