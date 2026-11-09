// Pattern-specific collaborations in the approved light editorial style.
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const t = (x, y, s, size = 19, anchor = 'start', fill = '#252c28') =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}">${esc(s)}</text>`;
const r = (x, y, w, h, accent = false, dashed = false) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${accent ? '#edf5f0' : '#f1f2ef'}" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.2"${dashed ? ' stroke-dasharray="5 4"' : ''}/>`;
const a = (d, accent = true, dashed = false) =>
  `<path d="${d}" fill="none" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.5"${dashed ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#${accent ? 'arrow-green' : 'arrow'})"/>`;
const box = (x, y, w, lines, accent = false, dashed = false, h = 84) =>
  r(x, y, w, h, accent, dashed) +
  lines
    .map((s, i) => t(x + 16, y + 31 + i * 25, s, i ? 17 : 20, 'start', i ? '#626962' : '#252c28'))
    .join('');
const heading = (title, compact) => {
  const limit = compact ? 28 : 53;
  const words = title.split(' ');
  const lines = [''];
  for (const word of words) {
    if ((lines.at(-1) + ' ' + word).trim().length > limit) lines.push(word);
    else lines[lines.length - 1] = (lines.at(-1) + ' ' + word).trim();
  }
  return lines.map((line, index) => t(24, 32 + index * 27, line, compact ? 22 : 24)).join('');
};
const note = (lines, y) => lines.map((s, i) => t(24, y + i * 26, s, 18)).join('');

function document(title, description, compact, height, body) {
  const width = compact ? 360 : 720;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}rect,path{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#a6aca3" stroke-width="1.2"/></marker><marker id="arrow-green" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${body}</svg>\n`;
}

const flows = {
  'factory-method': {
    title: 'A creation hook inside a stable workflow',
    phone: 'A deliberate creation hook',
    nodes: [
      ['Publisher.publish', 'Stable workflow'],
      ['create_exporter', 'Overridden hook'],
      ['HtmlExporter', 'Concrete product'],
    ],
    labels: ['calls', 'supplies'],
    description:
      'The publishing workflow calls its creation hook. HtmlPublisher overrides that hook to supply HtmlExporter. The inherited workflow renders with the returned exporter; it is not copied into each variant.',
    caption:
      'The workflow decides when an exporter is needed. Its overridable creation hook supplies the concrete product.',
    footer: ['The returned product is used by the inherited workflow.'],
    phoneFooter: ['Creation varies in the hook.', 'The publishing sequence stays shared.'],
  },
  builder: {
    title: 'Keep construction separate from the finished result',
    phone: 'Make completion explicit',
    nodes: [
      ['ReportBuilder', 'Collect parts'],
      ['build()', 'Validate choices'],
      ['Report', 'Finished value'],
    ],
    labels: ['finish', 'returns'],
    description:
      'Title and sections accumulate in ReportBuilder. Build validates required parts, then returns a finished Report with a copied immutable section sequence. Incomplete construction state stays in the builder.',
    caption:
      'The builder holds partial choices; build validates them before returning a finished report.',
    footer: ['Later builder edits do not mutate the finished report.'],
    phoneFooter: ['Partial choices stay in the builder.', 'Finished results own their values.'],
  },
  adapter: {
    title: 'Translate the contract at the provider boundary',
    phone: 'One explicit translation',
    nodes: [
      ['Application', 'send(to, subject, body)'],
      ['MailAdapter', 'Map payload + result'],
      ['VendorMail', 'submit(payload)'],
    ],
    labels: ['calls', 'calls'],
    description:
      'The application calls send with its own mail contract. MailAdapter translates the fields into the vendor submit payload and converts the acceptance token on return. Acceptance is not a guarantee of delivery.',
    caption:
      'The adapter translates request fields and the returned acceptance token. The application keeps its own mail contract.',
    footer: ['Return path: acceptance token → application submission ID.'],
    phoneFooter: ['The return value means accepted.', 'Delivery is a separate outcome.'],
  },
  decorator: {
    title: 'Add one responsibility around a compatible object',
    phone: 'A compatible wrapper',
    nodes: [
      ['Caller', 'lookup(product_id)'],
      ['CountedCatalog', 'Count, then delegate'],
      ['Catalog', 'Perform lookup'],
    ],
    labels: ['calls', 'calls'],
    description:
      'The caller uses lookup on CountedCatalog, which increments an attempt counter and delegates the same operation to Catalog. The catalog result returns through the wrapper to the caller.',
    caption:
      'Both wrapper and wrapped object offer lookup. The wrapper adds counting around delegation.',
    footer: ['Increment before delegation counts attempts, including failures.'],
    phoneFooter: ['The caller keeps the same contract.', 'Wrapper order changes behavior.'],
  },
  facade: {
    title: 'One caller intention coordinates several components',
    phone: 'Export through one boundary',
    nodes: [
      ['Screen', 'Request an export'],
      ['ExportFacade', 'Own the sequence'],
      ['Subsystem', 'Load · render · package'],
    ],
    labels: ['calls', 'uses'],
    description:
      'A screen requests an export through ExportFacade. The facade coordinates asset loading, rendering, and packaging in the required order. One method does not make the steps transactional.',
    caption:
      'The facade owns routine subsystem coordination. Callers request an outcome rather than reproduce the sequence.',
    footer: ['A single entry point still needs explicit failure and cleanup rules.'],
    phoneFooter: ['One call expresses the intention.', 'The sequence can still fail partway.'],
  },
  'chain-of-responsibility': {
    title: 'Offer the request until a handler accepts it',
    phone: 'First handler to accept wins',
    nodes: [
      ['Text field', 'Declines close'],
      ['Window', 'Handles close'],
      ['Application', 'Not reached'],
    ],
    labels: ['next', 'stop'],
    lastUnused: true,
    description:
      'A close event first reaches the focused text field, which declines it. The window handles it, so the application handler is not reached. If every handler declines, the request has an explicit unhandled result.',
    caption:
      'For this close event, the window handles the request. Processing stops before the application handler.',
    footer: ['The handler order and the unhandled result are part of the contract.'],
    phoneFooter: ['Only a declined request continues.', 'The last candidate may also decline.'],
  },
  'template-method': {
    title: 'Fix the sequence; customize the reading step',
    phone: 'One shared algorithm skeleton',
    nodes: [
      ['Read records', 'Subclass supplies step'],
      ['Normalize', 'Shared implementation'],
      ['Validate + return', 'Shared implementation'],
    ],
    labels: ['then', 'then'],
    description:
      'Importer.run fixes the order: read records, normalize, validate, and return. LineImporter and SemicolonImporter customize only reading. Both formats receive the same normalization and validation.',
    caption:
      'The base run method owns this sequence. Subclasses customize reading without copying the later checks.',
    footer: ['Overriding the whole run method can bypass the shared guarantees.'],
    phoneFooter: ['The base operation owns order.', 'Subclasses vary selected steps.'],
  },
};

function flow(spec, compact) {
  let body = heading(compact ? spec.phone : spec.title, compact);
  for (let i = 0; i < 3; i++) {
    const x = compact ? 28 : 24 + i * 240;
    const y = compact ? 84 + i * 154 : 112;
    body += box(x, y, compact ? 304 : 192, spec.nodes[i], i === 1, spec.lastUnused && i === 2);
    if (i < 2) {
      const stopped = spec.lastUnused && i === 1;
      if (!stopped)
        body += compact ? a(`M180 ${y + 84}V${y + 152}`) : a(`M${x + 192} ${y + 42}H${x + 238}`);
      body += compact
        ? t(198, y + 124, spec.labels[i], 17)
        : t(x + 216, y + 21, spec.labels[i], 16, 'middle');
    }
  }
  body += note(compact ? spec.phoneFooter : spec.footer, compact ? 536 : 270);
  return document(spec.title, spec.description, compact, compact ? 612 : 326, body);
}

export const gofVisuals = Object.fromEntries(
  Object.entries(flows).map(([id, spec]) => [
    id,
    {
      ...spec,
      draw: (compact) => flow(spec, compact),
    },
  ]),
);

function add(id, title, description, caption, render) {
  gofVisuals[id] = {
    title,
    description,
    caption,
    draw: (compact) => {
      const result = render(compact);
      return document(title, description, compact, result.height, result.body);
    },
  };
}

add(
  'abstract-factory',
  'Choose a family, then create compatible products',
  'The application chooses BrowserWidgets. Its create_button and create_menu operations supply a browser button and browser menu. NativeWidgets is an unused alternative family, not an independently mixed product source.',
  'One factory selection governs both product roles. The unused family is a whole alternative, rather than a source to mix in accidentally.',
  (m) => ({
    height: m ? 650 : 438,
    body:
      heading(m ? 'One coherent family choice' : 'One coherent family choice', m) +
      box(m ? 28 : 230, 76, m ? 304 : 260, ['BrowserWidgets', 'Selected family'], true) +
      (m
        ? a('M180 160V210H102V240') + a('M180 210H258V240')
        : a('M360 160V190H170V220') + a('M360 190H550V220')) +
      box(m ? 28 : 40, m ? 242 : 222, m ? 144 : 260, ['Button', 'Browser'], true) +
      box(m ? 188 : 420, m ? 242 : 222, m ? 144 : 260, ['Menu', 'Browser'], true) +
      box(
        m ? 28 : 230,
        m ? 374 : 330,
        m ? 304 : 260,
        ['NativeWidgets', 'Unused alternative'],
        false,
        true,
      ) +
      note(m ? ['Button and menu come from', 'the same selected factory.'] : [], 520),
  }),
);

add(
  'prototype',
  'Copy the editable state; share only deliberate values',
  'An original shape is cloned into a new shape with a new identity and an independent label list. Both point to the same immutable style. Updating duplicate labels leaves the original labels unchanged.',
  'The clone gets a new identity and its own editable labels. Sharing the immutable style is an explicit copying decision.',
  (m) => ({
    height: m ? 650 : 420,
    body:
      heading(m ? 'A copy with its own identity' : 'A copy with its own identity', m) +
      box(28, 84, m ? 304 : 270, ['Original shape', 'ID A · own label list']) +
      box(
        m ? 28 : 422,
        m ? 250 : 84,
        m ? 304 : 270,
        ['Cloned shape', 'ID B · copied label list'],
        true,
      ) +
      (m
        ? a('M180 168V248') + t(198, 212, 'clone', 17)
        : a('M298 126H420') + t(360, 109, 'clone', 18, 'middle')) +
      box(
        m ? 28 : 230,
        m ? 434 : 270,
        m ? 304 : 260,
        ['Immutable style', 'Shared deliberately'],
        true,
      ) +
      (m
        ? a('M28 126H12V476H26', false) + a('M180 334V432', false)
        : a('M163 168V234H270V268', false) + a('M557 168V234H450V268', false)) +
      note(
        m
          ? ['New identity. Independent labels.', 'A shared value that cannot mutate.']
          : ['Cloning everything is not the same as defining a useful copy.'],
        m ? 566 : 397,
      ),
  }),
);

add(
  'singleton',
  'Uniqueness must have a scope',
  'Two callers access DeviceCoordinator in the same process and class scope. Both receive the same instance. A separate process can create its own instance; this design does not enforce device exclusivity across processes.',
  'Both calls return the same instance within this process. A construction lock protects creation, not every later operation.',
  (m) => ({
    height: m ? 622 : 384,
    body:
      heading(
        m ? 'One instance in this process' : 'One instance within a defined process scope',
        m,
      ) +
      box(28, 80, m ? 144 : 260, ['Caller A', 'Construct']) +
      box(m ? 188 : 432, 80, m ? 144 : 260, ['Caller B', 'Construct']) +
      (m
        ? a('M100 164V200H180V238') + a('M260 164V200H180V238')
        : a('M158 164V200H360V238') + a('M562 164V200H360V238')) +
      box(m ? 28 : 230, 240, m ? 304 : 260, ['DeviceCoordinator', 'Same instance'], true) +
      note(
        m
          ? ['The creation lock guards creation.', 'Another process has another scope.']
          : ['This does not create an operating-system or distributed lock.'],
        m ? 406 : 364,
      ),
  }),
);

add(
  'bridge',
  'Two dimensions vary without multiplying subclasses',
  'Circle and Rectangle are shape abstractions. Either can hold SvgRenderer or TextRenderer. The selected shape delegates drawing primitives to its renderer, rather than using one subclass for each shape-renderer pairing.',
  'Shape and renderer vary independently. The lines show supported pairings, not four simultaneous calls.',
  (m) => ({
    height: m ? 636 : 412,
    body:
      heading(m ? 'Shape × rendering backend' : 'Shape × rendering backend', m) +
      t(28, 84, 'Shape abstractions', 18) +
      t(m ? 28 : 432, m ? 322 : 84, 'Renderer implementations', 18) +
      box(28, 108, m ? 144 : 260, ['Circle', 'draw()']) +
      box(m ? 188 : 28, m ? 108 : 246, m ? 144 : 260, ['Rectangle', 'draw()']) +
      box(m ? 28 : 432, m ? 346 : 108, m ? 144 : 260, ['SVG', 'Renderer'], true) +
      box(m ? 188 : 432, m ? 346 : 246, m ? 144 : 260, ['Text', 'Renderer'], true) +
      (m
        ? a('M100 192V344', true) +
          a('M260 192V344', true) +
          a('M100 192L260 344', false, true) +
          a('M260 192L100 344', false, true)
        : a('M288 150H430') +
          a('M288 288H430') +
          a('M288 150L430 288', false, true) +
          a('M288 288L430 150', false, true)) +
      note(
        m
          ? ['Choose a renderer for each shape.', 'No subclass is needed per pairing.']
          : ['Adding a primitive still changes the shared renderer contract.'],
        m ? 516 : 390,
      ),
  }),
);

add(
  'composite',
  'Ask a leaf or a whole for the same operation',
  'A gift bundle contains a stationery bundle and a card. The stationery bundle contains a pencil and notebook. Price calls recurse through the same component contract, producing 600 plus 200 equals 800 cents.',
  'A group delegates to children, including other groups. Leaves and groups share price_cents; they do not need identical child-management operations.',
  (m) => ({
    height: m ? 638 : 456,
    body:
      heading(m ? 'A recursive part–whole price' : 'A recursive part–whole price', m) +
      box(m ? 28 : 230, 76, m ? 304 : 260, ['Gift bundle', '800 cents'], true) +
      (m
        ? a('M180 160V190H100V220') + a('M180 190H260V220')
        : a('M360 160V190H170V220') + a('M360 190H550V220')) +
      box(m ? 28 : 40, 222, m ? 144 : 260, ['Stationery', '600 cents'], true) +
      box(m ? 188 : 420, 222, m ? 144 : 260, ['Card', '200 cents']) +
      (m
        ? a('M100 306V340H100V374') + a('M100 340H260V374')
        : a('M170 306V330H114V352') + a('M170 330H266V352')) +
      box(m ? 28 : 40, m ? 376 : 354, m ? 144 : 138, ['Pencil', '100 cents']) +
      box(m ? 188 : 198, m ? 376 : 354, m ? 144 : 138, ['Notebook', '500 cents']) +
      note(
        m ? ['Each total follows the child links.', 'Cycles need a separate policy.'] : [],
        m ? 544 : 0,
      ),
  }),
);

add(
  'flyweight',
  'Share the common type; keep each position local',
  'Two logical tree values have different coordinates and point to the same immutable oak TreeType holding species and asset data. Changing a coordinate is not a change to the shared type.',
  'Tree positions remain separate. Shared species and asset data live in the immutable flyweight.',
  (m) => ({
    height: m ? 540 : 362,
    body:
      heading(m ? 'Many positions, one shared type' : 'Many positions, one shared type', m) +
      box(28, 82, m ? 144 : 260, ['Tree A', 'x=10, y=20']) +
      box(m ? 188 : 432, 82, m ? 144 : 260, ['Tree B', 'x=30, y=40']) +
      (m
        ? a('M100 166V210H180V246') + a('M260 166V210H180V246')
        : a('M158 166V210H360V246') + a('M562 166V210H360V246')) +
      box(m ? 28 : 230, 248, m ? 304 : 260, ['TreeType: oak', 'Shared species + asset'], true) +
      note(
        m ? ['Coordinates belong to each tree.', 'Shared state needs safe ownership.'] : [],
        424,
      ),
  }),
);

add(
  'proxy',
  'Construct the subject only when access requires it',
  'At folder opening only LazyImage exists and load count is zero. The first render constructs Image and delegates rendering. A later render reuses that same Image, so load count remains one in this single-threaded example.',
  'The proxy offers render throughout. It controls when the real image is created and reused.',
  (m) => ({
    height: m ? 652 : 436,
    body:
      heading(m ? 'Defer the expensive subject' : 'Defer the expensive subject', m) +
      t(28, 83, 'Before first render', 19) +
      box(28, 104, m ? 304 : 300, ['LazyImage', 'Subject not loaded']) +
      t(28, m ? 252 : 250, 'On render', 19) +
      box(28, m ? 274 : 272, m ? 304 : 260, ['LazyImage', 'Create once, then reuse'], true) +
      box(m ? 28 : 432, m ? 438 : 272, m ? 304 : 260, ['Image', 'Actual subject']) +
      (m
        ? a('M180 358V436') + t(198, 401, 'render', 17)
        : a('M288 314H430') + t(360, 295, 'render', 18, 'middle')) +
      note(
        m ? ['Later renders reuse the subject.', 'Concurrent loading needs a policy.'] : [],
        592,
      ),
  }),
);

add(
  'command',
  'Represent the action before choosing when to run it',
  'A menu or shortcut constructs a DeleteRange command. The invoker executes it against Document and stores the command in history. Undo is later requested through the command, whose saved state supports restoration under the stated no-intervening-edit assumption.',
  'The invoker controls execution and history. The command holds a request and the information needed for its supported undo.',
  (m) => ({
    height: m ? 722 : 426,
    body:
      heading(
        m ? 'An action with an explicit lifetime' : 'An action with an explicit lifetime',
        m,
      ) +
      box(28, 82, m ? 304 : 192, ['Invoker', 'Menu or shortcut']) +
      box(m ? 28 : 264, m ? 246 : 82, m ? 304 : 192, ['DeleteRange', 'Request + undo data'], true) +
      box(m ? 28 : 500, m ? 410 : 82, m ? 304 : 192, ['Document', 'Receiver']) +
      (m
        ? a('M180 166V244') +
          t(198, 210, 'execute', 17) +
          a('M180 330V408') +
          t(198, 374, 'edit', 17)
        : a('M220 124H262') + a('M456 124H498')) +
      box(m ? 28 : 264, m ? 576 : 278, m ? 304 : 192, ['History', 'Store command'], false) +
      (m
        ? a('M28 288H12V618H26', false)
        : a('M360 166V276', false) + t(378, 225, 'retain for undo', 17)),
  }),
);

add(
  'interpreter',
  'A small rule is a tree with evaluation meaning',
  'An And expression contains HasValue done equals False and HasValue priority equals high. Each child evaluates against the same task context. And combines the two boolean results, with short-circuit behavior.',
  'Expression types define the small language. Compound expressions evaluate their children against the same context.',
  (m) => ({
    height: m ? 566 : 390,
    body:
      heading(m ? 'Compose meaning from expressions' : 'Compose meaning from expressions', m) +
      box(m ? 28 : 230, 78, m ? 304 : 260, ['And', 'Both conditions must hold'], true) +
      (m
        ? a('M180 162V206H100V246') + a('M180 206H260V246')
        : a('M360 162V200H170V246') + a('M360 200H550V246')) +
      box(m ? 28 : 40, 248, m ? 144 : 260, ['HasValue', 'done = False']) +
      box(m ? 188 : 420, 248, m ? 144 : 260, ['HasValue', 'priority = high']) +
      note(
        m
          ? ['Both read the same task context.', 'Parsing user text is a separate step.']
          : ['These are expression objects, not calls to eval on user text.'],
        m ? 448 : 374,
      ),
  }),
);

add(
  'iterator',
  'Traversal position belongs to each iterator',
  'Two iterators read the same Root, First, Second traversal. Iterator A has already yielded Root and next yields First. Iterator B has not advanced and next yields Root. Their cursor states are independent.',
  'The collection is shared; traversal positions are independent. Reading through one iterator does not advance the other.',
  (m) => ({
    height: m ? 568 : 396,
    body:
      heading(m ? 'Independent traversal positions' : 'Independent traversal positions', m) +
      box(m ? 28 : 100, 80, m ? 304 : 520, ['Tree traversal', 'Root → First → Second']) +
      box(28, 266, m ? 144 : 260, ['Iterator A', 'Next: First'], true) +
      box(m ? 188 : 432, 266, m ? 144 : 260, ['Iterator B', 'Next: Root'], true) +
      (m
        ? a('M100 266V166', false) + a('M260 266V166', false)
        : a('M158 266V166', false) + a('M562 266V166', false)) +
      note(
        m
          ? ['Each cursor owns its position.', 'Mutation needs an explicit rule.']
          : ['The client consumes values without knowing how the tree is stored.'],
        m ? 458 : 381,
      ),
  }),
);

add(
  'mediator',
  'Put collaboration rules in one local coordinator',
  'Server and credential fields report changes to ConnectionDialog. The dialog combines both values and sets the test button availability. The fields do not hold references to the button or each other.',
  'Controls report changes to the mediator. The mediator owns the cross-control rule for enabling Test.',
  (m) => ({
    height: m ? 650 : 468,
    body:
      heading(m ? 'Coordinate the combined state' : 'Coordinate the combined state', m) +
      box(28, 80, m ? 144 : 260, ['Server field', 'Report changes']) +
      box(m ? 188 : 432, 80, m ? 144 : 260, ['Credential', 'Report changes']) +
      (m
        ? a('M100 164V200H180V238') + a('M260 164V200H180V238')
        : a('M158 164V200H360V238') + a('M562 164V200H360V238')) +
      box(m ? 28 : 230, 240, m ? 304 : 260, ['ConnectionDialog', 'Evaluate combined rule'], true) +
      (m ? a('M180 324V390') : a('M360 324V378')) +
      box(m ? 28 : 230, m ? 392 : 380, m ? 304 : 260, ['Test button', 'Enable or disable']) +
      note(
        m ? ['Fields own their local behavior.', 'The dialog owns collaboration.'] : [],
        m ? 566 : 0,
      ),
  }),
);

add(
  'memento',
  'Let the state owner define capture and restoration',
  'Layout creates a snapshot containing immutable position values. History retains that snapshot without unpacking it. When undo is requested, Layout restores its own state from the saved representation.',
  'History stores the memento. Layout owns how its state is captured and restored.',
  (m) => ({
    height: m ? 666 : 420,
    body:
      heading(m ? 'State capture keeps an owner' : 'State capture keeps an owner', m) +
      box(28, 84, m ? 304 : 260, ['Layout', 'State owner'], true) +
      box(m ? 28 : 432, m ? 260 : 84, m ? 304 : 260, ['Snapshot', 'Immutable saved values']) +
      (m
        ? a('M180 168V258') + t(198, 214, 'save', 17)
        : a('M288 113H430') +
          t(360, 97, 'save', 17, 'middle') +
          a('M432 153H290', false) +
          t(360, 185, 'restore', 17, 'middle')) +
      box(m ? 28 : 432, m ? 436 : 282, m ? 304 : 260, ['History', 'Store without unpacking']) +
      (m ? a('M180 344V434', false) + a('M28 302H12V126H26', false) : a('M562 168V280', false)) +
      note(
        m
          ? ['Restore belongs to Layout.', 'A snapshot does not undo external work.']
          : ['An immutable snapshot does not drift with later edits.'],
        m ? 590 : 398,
      ),
  }),
);

add(
  'observer',
  'Notify current subscribers without knowing their roles',
  'Document updates its title and synchronously notifies the heading and index subscribers. Each subscriber interprets the update. Unsubscribing removes that relationship so later changes are no longer delivered to it.',
  'The subject publishes a change; subscribers own their reactions. Subscription cleanup is part of the collaboration.',
  (m) => ({
    height: m ? 584 : 408,
    body:
      heading(m ? 'One change, several subscribers' : 'One change, several subscribers', m) +
      box(m ? 28 : 230, 80, m ? 304 : 260, ['Document', 'Set title, then notify'], true) +
      (m
        ? a('M180 164V206H100V254') + a('M180 206H260V254')
        : a('M360 164V208H170V254') + a('M360 208H550V254')) +
      box(m ? 28 : 40, 256, m ? 144 : 260, ['Heading', 'Update view']) +
      box(m ? 188 : 420, 256, m ? 144 : 260, ['Index', 'Update record']) +
      note(
        m
          ? ['Each arrow is a subscription.', 'Cleanup ends the relationship.']
          : ['Synchronous callbacks need a policy for ordering and failures.'],
        m ? 470 : 391,
      ),
  }),
);

add(
  'state',
  'The current state decides the valid transition',
  'Idle accepts start and transitions to Transferring. Transferring accepts pause and transitions to Paused. Paused accepts resume and returns to Transferring. Resume is invalid while Idle. This is only a subset of the full upload lifecycle.',
  'Requests delegate to the current state. Transition rules determine which state receives the next request.',
  (m) => ({
    height: m ? 694 : 420,
    body:
      heading(m ? 'Behavior follows lifecycle state' : 'Behavior follows lifecycle state', m) +
      box(28, 82, m ? 304 : 192, ['Idle', 'start allowed']) +
      box(m ? 28 : 264, m ? 250 : 82, m ? 304 : 192, ['Transferring', 'pause allowed'], true) +
      box(m ? 28 : 500, m ? 418 : 82, m ? 304 : 192, ['Paused', 'resume allowed']) +
      (m
        ? a('M180 166V248') +
          t(198, 212, 'start', 17) +
          a('M180 334V416') +
          t(198, 380, 'pause', 17) +
          a('M28 460H12V292H26', false)
        : a('M220 124H262') +
          t(242, 102, 'start', 16, 'middle') +
          a('M456 124H498') +
          t(478, 102, 'pause', 16, 'middle') +
          a('M596 166V240H360V168', false) +
          t(478, 265, 'resume', 18, 'middle')) +
      note(
        m
          ? [
              'The return arrow resumes transfer.',
              'Idle rejects resume.',
              'This shows part of the lifecycle.',
            ]
          : ['The same request can be valid in one state and invalid in another.'],
        m ? 570 : 370,
      ),
  }),
);

add(
  'visitor',
  'Select an operation and dispatch by element type',
  'Addition.accept dispatches to the chosen visitor visit_addition method. Evaluate recursively computes 2 plus 3 as 5. Format recursively produces the string parentheses 2 plus 3 parentheses. The visitor owns traversal in this example.',
  'The element chooses the type-specific method; the supplied visitor chooses the operation. Each visitor owns traversal here.',
  (m) => ({
    height: m ? 658 : 442,
    body:
      heading(m ? 'One structure, several operations' : 'One structure, several operations', m) +
      box(m ? 28 : 230, 80, m ? 304 : 260, ['Addition(2, 3)', 'accept(visitor)']) +
      (m
        ? a('M180 164V210H100V258') + a('M180 210H260V258')
        : a('M360 164V208H170V258') + a('M360 208H550V258')) +
      box(m ? 28 : 40, 260, m ? 144 : 260, ['Evaluate', 'Result: 5'], true) +
      box(m ? 188 : 420, 260, m ? 144 : 260, ['Format', 'Result: (2 + 3)'], true) +
      note(
        m
          ? [
              'Choose a visitor for one operation.',
              'accept selects its type-specific method.',
              'The lines show alternative operations.',
            ]
          : ['Each operation handles all admitted element types.'],
        m ? 474 : 413,
      ),
  }),
);

export function visualDimensions(source) {
  const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
  return { width: Number(width), height: Number(height) };
}
