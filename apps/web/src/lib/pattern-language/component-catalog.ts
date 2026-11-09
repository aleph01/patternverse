import type { WidgetPackage } from '@patternverse/workspace';
import { widgetTemplate } from '$lib/widgets/templates';
import * as examples from './examples';
import { exampleOptions, type ExampleOptions } from './options';
import { visualizationExamples } from './display-examples';

export type ComponentCategory =
  | 'Questions & choices'
  | 'Content & media'
  | 'Flow & composition'
  | 'AI & wording'
  | 'Extension widgets';
export interface ComponentParameter {
  name: string;
  type: string;
  requirement: 'Required' | 'Optional' | 'Conditional';
  defaultValue: string;
  description: string;
}
export interface ComponentResult {
  type: string;
  description: string;
  fields?: ComponentParameter[];
}
export interface ComponentVariant {
  id: string;
  label: string;
  filename: string;
  source: string;
  options?: ExampleOptions;
  parameters?: ComponentParameter[];
  result?: ComponentResult;
}
export interface LanguageComponent {
  id: string;
  name: string;
  command: string;
  category: ComponentCategory;
  summary: string;
  parameters: ComponentParameter[];
  result: ComponentResult;
  notes: string[];
  variants: ComponentVariant[];
  guideAnchor: string;
}

const p = (
  name: string,
  type: string,
  requirement: ComponentParameter['requirement'],
  defaultValue: string,
  description: string,
): ComponentParameter => ({ name, type, requirement, defaultValue, description });
const v = (
  id: string,
  label: string,
  filename: string,
  source: string,
  options = exampleOptions[filename],
): ComponentVariant => ({ id, label, filename, source, options });
const binding = p(
  'binding',
  'identifier',
  'Required',
  '—',
  'The immutable name receiving the confirmed result.',
);
const prompt = p(
  'body',
  'Markdown',
  'Optional',
  'Empty body',
  'Authored text inside braces; references can read earlier bindings.',
);
const options = p(
  'options',
  'ID: "Label" entries',
  'Conditional',
  '—',
  'Static options, or use from instead. IDs must be unique and labels quoted.',
);
const from = p(
  'from',
  'choices or list[choice]',
  'Conditional',
  'Static options',
  'An existing catalogue or list. Cannot be combined with static options.',
);

const singleChoice = `:language 1
choice = !choose {
    What would help right now?
    - pause: "Take a pause"
    - support: "Ask for support"
}
!show {
    You chose {{choice.label}} (ID: {{choice.value}}).
}
-> end`;
const multipleChoice = `:language 1
choices = !choose [multi, min=0, max=2, prefer=checklist] {
    Which possibilities would help?
    - pause: "Take a pause"
    - support: "Ask for support"
    - plan: "Make a small plan"
}
!show {{choices}} {
}
-> end`;
const ranking = `:language 1
ordered = !rank {
    Arrange these in your preferred order.
    - rest: "Rest"
    - connection: "Connection"
    - learning: "Learning"
}
!show {{ordered}} {
}
-> end`;
const requiredQuestion = `:language 1
reflection = !form {
    thought = !ask {
        :placeholder "One small observation…"
        What did you notice?
    }
}
!show {
    You noticed {{reflection.thought}}.
}
-> end`;
const optionalQuestion = `:language 1
reflection = !form {
    note = !ask [optional] {
        :multiline false
        :placeholder "Optional note"
        Anything else to remember?
    }
}
!show {
    Your note: {{reflection.note}}
}
-> end`;
const groupedForm = `:language 1
reflection = !form {
    :title "A short check-in"
    !show {
        Notice what would help today.
    }
    focus = !ask {
        What matters most?
    }
    energy = !rate 0..10 {
        How much energy is available?
    }
    next = !choose {
        What would help?
        - pause: "A pause"
        - support: "Support"
    }
}
!show {
    Focus: {{reflection.focus}}
    Energy: {{reflection.energy}}
    Next: {{reflection.next.label}}
}
-> end`;
const blockingTimer = `:language 1
pause = !timer {
    :duration 5
    :blocking true
    :sticky false
    Take a five-second pause.
}
!show {
    Completed: {{pause.completed}}
}
-> end`;
const turn = `:language 1
reply = !agent {
    Write one brief invitation to pause and notice the present moment.
}
!show {
    {{reply}}
}
-> end`;

interface WidgetField {
  type: string;
  default?: unknown;
  defaultFrom?: string;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  integer?: boolean;
  from?: string;
  minItems?: number;
  maxItems?: number;
  maxItemsFrom?: string;
}

/** Widget documentation comes from the exact template contract supplied to the runtime. */
function widgetFields(fields: Record<string, WidgetField>, input: boolean): ComponentParameter[] {
  return Object.entries(fields).map(([name, field]) => {
    const rules = [
      field.enum ? `Allowed: ${field.enum.join(', ')}.` : '',
      field.integer ? 'Whole numbers only.' : '',
      field.minimum !== undefined ? `Minimum ${field.minimum}.` : '',
      field.maximum !== undefined ? `Maximum ${field.maximum}.` : '',
      field.minItems !== undefined ? `At least ${field.minItems} items.` : '',
      field.maxItems !== undefined ? `At most ${field.maxItems} items.` : '',
      field.maxItemsFrom ? `Maximum item count comes from ${field.maxItemsFrom}.` : '',
      field.from ? `Choices must belong to ${field.from}; IDs and labels are validated.` : '',
    ]
      .filter(Boolean)
      .join(' ');
    return p(
      input ? `:with ${name}` : name,
      field.type,
      !input || (!Object.hasOwn(field, 'default') && !field.defaultFrom) ? 'Required' : 'Optional',
      field.defaultFrom
        ? `Bundled ${field.defaultFrom}`
        : Object.hasOwn(field, 'default')
          ? JSON.stringify(field.default)
          : '—',
      rules ||
        (input
          ? 'Passed explicitly to this widget instance.'
          : 'Returned after participant confirmation.'),
    );
  });
}

function widgetVariant(
  kind: 'blank' | 'choices' | 'needs',
  id: string,
  label: string,
): ComponentVariant {
  const pkg: WidgetPackage = widgetTemplate(kind, `documentation/${id}`, label, `gallery-${id}`);
  const exportName = kind === 'blank' ? 'reflection' : 'needs';
  const definition = JSON.parse(pkg.files[pkg.manifest.exports[exportName].path]) as {
    inputs: Record<string, WidgetField>;
    outputs: Record<string, WidgetField>;
  };
  const reference = `${pkg.manifest.publisher}/${pkg.manifest.name}@${pkg.manifest.version}`;
  const source = `:language 1
:import "${reference}" as ui

selection = !widget ui.${exportName} {
    ${kind === 'blank' ? ':with energy = 5' : ':with max = 2'}
    ${kind === 'blank' ? 'What would you like to remember?' : 'Choose up to two possibilities.'}
}
!show {
    ${kind === 'blank' ? 'Note: {{selection.note}}\n    Energy: {{selection.energy}}' : 'Selected: {{selection.needs}}'}
}
-> end`;
  return {
    ...v(id, label, `widget-${id}.pattern.md`, source, {
      widgets: { [reference]: pkg },
      note: 'This preview supplies a bundled template without installing it. For your own practice, release a template in Settings → Widgets and use its import reference.',
    }),
    parameters: [
      binding,
      p(
        'export',
        'import alias.export',
        'Required',
        '—',
        'A widget export from an explicitly supplied, versioned package.',
      ),
      prompt,
      ...widgetFields(definition.inputs, true),
    ],
    result: {
      type: `{${Object.entries(definition.outputs)
        .map(([name, field]) => `${name}: ${field.type}`)
        .join(', ')}}`,
      description:
        'The complete declared output record, accepted only when the participant confirms a valid draft.',
      fields: widgetFields(definition.outputs, false),
    },
  };
}

export const componentCatalog: readonly LanguageComponent[] = [
  {
    id: 'ask',
    name: 'Text question',
    command: '!ask',
    category: 'Questions & choices',
    summary: 'Collect a text response, on its own or as a field in a grouped form.',
    guideAnchor: 'questions',
    parameters: [
      binding,
      prompt,
      p(
        '[optional]',
        'flag',
        'Optional',
        'Standalone: empty allowed; form: required',
        'In a form, allow an explicitly submitted empty answer. The result remains text, rather than None.',
      ),
      p(
        ':required',
        'boolean',
        'Optional',
        'Form: true',
        'Form requiredness. Standalone questions accept only false here; use a form for nonblank required text.',
      ),
      p(
        ':multiline',
        'boolean',
        'Optional',
        'true',
        'Form fields only. False requests a single-line text field.',
      ),
      p(
        ':placeholder',
        'quoted text',
        'Optional',
        'No authored hint',
        'Form fields only. A hint rather than a submitted default answer.',
      ),
    ],
    result: {
      type: 'text',
      description:
        'The confirmed text, including empty text where permitted. A form exposes it as form.field.',
    },
    notes: [
      'Form fields cannot read unfinished sibling answers. References may read earlier outer bindings.',
      'Optional[text] is a value type; it does not change the question’s empty-answer rules.',
    ],
    variants: [
      v('standalone', 'Standalone question', 'a-small-check-in.pattern.md', examples.example),
      v('required', 'Required form field', 'required-question.pattern.md', requiredQuestion),
      v('optional', 'Optional single line', 'optional-question.pattern.md', optionalQuestion),
    ],
  },
  {
    id: 'choose',
    name: 'Choice',
    command: '!choose',
    category: 'Questions & choices',
    guideAnchor: 'choices',
    summary: 'Offer a single choice or a bounded multiple selection with stable option IDs.',
    parameters: [
      binding,
      prompt,
      options,
      from,
      p(
        'multi',
        'flag',
        'Optional',
        'Single choice',
        'Return multiple choices rather than exactly one.',
      ),
      p(
        'min',
        'nonnegative integer',
        'Optional',
        '1 for multi',
        'Minimum confirmed selections. Zero permits an explicitly empty list.',
      ),
      p(
        'max',
        'nonnegative integer',
        'Optional',
        'Offered count',
        'Maximum confirmed selections. Static bounds must fit the catalogue; dynamic maxima are capped to it.',
      ),
      p(
        'prefer',
        'radio | chips | checklist',
        'Optional',
        'Single: radio; multi: checklist',
        'Radio/chips for single choice; checklist/chips for multi. Presentation does not alter validation.',
      ),
    ],
    result: {
      type: 'choice or list[choice]',
      description:
        'A single choice has .value (ID) and .label (wording). Multi-selection returns catalogue order, rather than click order.',
    },
    notes: [
      'Do not mix from with literal options. IDs must be unique; labels may repeat.',
      'Legacy :option, :from, :multi, :min, and :max attributes remain accepted. Configured selections are bounded to 1,000 items.',
    ],
    variants: [
      v('single', 'Single choice', 'single-choice.pattern.md', singleChoice),
      v('multi', 'Multiple choice', 'multiple-choice.pattern.md', multipleChoice),
    ],
  },
  {
    id: 'rank',
    name: 'Ranking',
    command: '!rank',
    category: 'Questions & choices',
    guideAnchor: 'choices',
    summary:
      'Arrange every offered item in a confirmed order, including a previously selected subset.',
    parameters: [
      binding,
      prompt,
      options,
      { ...from, type: 'choices, list[choice], or list[record]' },
      p(
        'label',
        'text field name',
        'Conditional',
        'Choice labels',
        'Required when ranking a list of records. The field must contain nonblank text.',
      ),
      p(
        'prefer',
        'reorder',
        'Optional',
        'reorder',
        'A presentation hint. Selection min/max bounds do not apply to ranking.',
      ),
    ],
    result: {
      type: 'list[choice] or list[record]',
      description:
        'Every original item exactly once in the confirmed order. Record ranking preserves all original fields.',
    },
    notes: [
      'No ties or partial rankings. Choose a subset first, then rank that returned list.',
      'An empty catalogue still requires confirmation and returns a typed empty list. !rank cannot be a form field.',
    ],
    variants: [
      v('all', 'Rank all items', 'rank-items.pattern.md', ranking),
      v('subset', 'Choose, then rank', 'choices-and-ranking.pattern.md', examples.selectionExample),
      v(
        'records',
        'Rank complete records',
        'rank-records.pattern.md',
        `:language 1
steps = [{name: "Take a pause", effort: 1}, {name: "Ask for help", effort: 2}]
ordered = !rank [from=steps, label=name] {
    Which step would you like to consider first?
}
!show {{ordered}} {
}
-> end`,
      ),
    ],
  },
  {
    id: 'rate',
    name: 'Rating',
    command: '!rate',
    category: 'Questions & choices',
    guideAnchor: 'questions',
    summary: 'Collect a finite number inside an inclusive authored range.',
    parameters: [
      binding,
      p(
        'minimum..maximum',
        'number range',
        'Required',
        '—',
        'Inclusive numeric bounds; negative and decimal bounds are supported.',
      ),
      prompt,
      p(':low', 'quoted text', 'Optional', 'No low label', 'Label at the low end of the scale.'),
      p(':high', 'quoted text', 'Optional', 'No high label', 'Label at the high end of the scale.'),
      p(
        ':prefer',
        'slider',
        'Optional',
        'Host presentation',
        'A presentation preference; the numeric contract is unchanged.',
      ),
    ],
    result: {
      type: 'number',
      description:
        'The confirmed rating. Invalid types and out-of-range values leave the interaction pending.',
    },
    notes: [
      'Supported as a standalone step and inside a form.',
      'A form rating begins unanswered; displaying a slider position does not by itself submit a reply.',
    ],
    variants: [
      v('energy', 'Energy scale', 'rate-energy.pattern.md', examples.ratingExample),
      v('branch', 'Rate, then branch', 'conditional-path.pattern.md', examples.branchExample),
    ],
  },
  {
    id: 'form',
    name: 'Grouped form',
    command: '!form',
    category: 'Questions & choices',
    guideAnchor: 'grouped-steps',
    summary: 'Confirm related text fields, ratings, choices, and timers as one typed record.',
    parameters: [
      binding,
      p(
        ':title',
        'quoted text',
        'Optional',
        'No authored title',
        'A visible heading for the grouped step.',
      ),
      p(
        'body',
        '1–256 child blocks',
        'Required',
        '—',
        'Ordered !show, !ask, !rate, !choose, or !timer blocks. Field IDs must be unique.',
      ),
    ],
    result: {
      type: 'record of named fields',
      description:
        'Each answer keeps its original type. Fields become available together after the whole form is accepted.',
    },
    notes: [
      'Text fields are required and multiline by default. Use [optional] for an empty text answer.',
      'No unfinished sibling references, nested forms, ranking, branches, child calls, or model steps inside a form.',
      'If a field is invalid, the complete draft stays open for correction.',
    ],
    variants: [
      v('mixed', 'Text, rating & choice', 'grouped-form.pattern.md', groupedForm),
      v('timer', 'Form with a timer', 'timed-reflection.pattern.md', examples.timerExample),
    ],
  },
  {
    id: 'timer',
    name: 'Countdown timer',
    command: '!timer',
    category: 'Questions & choices',
    guideAnchor: 'timers',
    summary: 'Show a countdown and return a snapshot of its state at continuation.',
    parameters: [
      binding,
      prompt,
      p(':duration', 'whole seconds', 'Required', '—', 'From 1 through 86,400 seconds.'),
      p(
        ':blocking',
        'boolean',
        'Required',
        '—',
        'True waits for completion. A nonblocking standalone timer permits continuation after starting.',
      ),
      p(':adjustable', 'boolean', 'Optional', 'false', 'Permit duration changes before starting.'),
      p(
        ':min',
        'whole seconds',
        'Conditional',
        'Fixed duration',
        'Required with adjustable=true; not permitted otherwise.',
      ),
      p(
        ':max',
        'whole seconds',
        'Conditional',
        'Fixed duration',
        'Required with adjustable=true. Initial duration must be inside the ordered bounds.',
      ),
      p(
        ':sticky',
        'boolean',
        'Optional',
        'true',
        'Move a started timer to the practice timer area. False keeps it in its authored step.',
      ),
      p(
        ':persistent',
        'boolean',
        'Optional',
        'false',
        'Form timers only. Keep a nonblocking timer controllable in the visible completed step. Cannot be combined with blocking=true.',
      ),
    ],
    result: {
      type: '{duration_seconds: number, elapsed_seconds: number, completed: boolean}',
      description:
        'An immutable snapshot at confirmation. Later clock changes do not change the receipt.',
    },
    notes: [
      'The participant explicitly continues; clock completion does not automatically advance the run.',
      'Pausing the run pauses its clocks. Leaving removes countdowns, and historical receipts do not restart timers.',
    ],
    variants: [
      v('blocking', 'Blocking five seconds', 'blocking-timer.pattern.md', blockingTimer),
      v(
        'adjustable',
        'Adjustable & nonblocking',
        'adjustable-timer.pattern.md',
        examples.timerOnlyExample,
      ),
    ],
  },
  {
    id: 'show',
    name: 'Data visualization & display',
    command: '!show',
    category: 'Content & media',
    guideAnchor: 'displays',
    summary:
      'Compose data visualizations with mapping, grouping, ordering, relationships, and split views, or display authored Markdown.',
    parameters: [
      prompt,
      p(
        '{{source}}',
        'binding or field path',
        'Optional',
        'Markdown display',
        'An existing collection. Transform it in a separate binding before displaying it.',
      ),
      p(
        ':map',
        'one or two scalar attributes',
        'Optional',
        'Labelled collection',
        'One dimension produces a spectrum/timeline/bands; two produce horizontal and vertical axes.',
      ),
      p(
        ':group',
        'scalar attribute',
        'Optional',
        'No grouping',
        'Labelled groups without overriding mapped positions.',
      ),
      p(
        ':order',
        'attribute [asc|desc]',
        'Optional',
        'Source order; asc when specified',
        'Stable ordering by the named attribute.',
      ),
      p(
        ':link',
        'ID-valued attribute',
        'Optional',
        'No relationships',
        'One ID, a list of IDs, or choices. A field named parent points from parent to item.',
      ),
      p(
        ':split',
        'scalar attribute',
        'Optional',
        'One view',
        'Separate context views with shared axis domains.',
      ),
    ],
    result: {
      type: 'No result binding',
      description: 'A nonblocking content effect. The source values are unchanged.',
    },
    notes: [
      'The properties compose like a grammar of graphics: describe the data attributes and the renderer builds the view.',
      'Mapping/grouping/order/link/split properties apply to collection displays and can each occur once.',
      'Nested scalar fields work. Labels prefer name, title, label, idea, text, then id.',
      'All attributes remain readable as text. Narrow screens use lists; invalid relationships produce warnings and a labelled fallback.',
    ],
    variants: [
      ...visualizationExamples.map((example) =>
        v(example.id, example.label, example.filename, example.source, { note: example.note }),
      ),
      v('composition', 'Combining properties', 'show-ideas.pattern.md', examples.displayExample),
      v('markdown', 'Markdown', 'markdown.pattern.md', examples.markdownExample),
    ],
  },
  {
    id: 'image',
    name: 'Image',
    command: '!image',
    category: 'Content & media',
    guideAnchor: 'media',
    summary: 'Display an image with an alternative, optional heading, and Markdown caption.',
    parameters: [
      p(
        ':url',
        'quoted HTTPS URL',
        'Required',
        '—',
        'An HTTPS image source; URLs are literal rather than interpolated.',
      ),
      p(
        ':alt',
        'quoted text',
        'Required',
        '—',
        'Describe the image’s meaning. Use exactly "" for a purely decorative image.',
      ),
      p(':title', 'quoted text', 'Optional', 'No heading', 'A visible title.'),
      p(
        'body',
        'Markdown',
        'Optional',
        'No caption',
        'A caption or guidance. Ordinary references may appear here.',
      ),
    ],
    result: {
      type: 'No result binding',
      description:
        'A nonblocking content effect. Loading or enlarging an image does not answer another step.',
    },
    notes: [
      'Meaningful images can be enlarged using the pointer or keyboard.',
      'Unknown/duplicate attributes, unsupported schemes, credentials, custom ports, and blank nondecorative alternatives are rejected. A failed image keeps an alternative and source link.',
    ],
    variants: [v('captioned', 'Captioned image', 'image.pattern.md', examples.imageExample)],
  },
  {
    id: 'video',
    name: 'Video excerpt',
    command: '!video',
    category: 'Content & media',
    guideAnchor: 'media',
    summary: 'Display a whole video or a bounded excerpt with explicit playback preferences.',
    parameters: [
      p(
        ':url',
        'quoted HTTPS URL',
        'Required',
        '—',
        'YouTube, Vimeo, Dailymotion, or a direct MP4/WebM source.',
      ),
      p(
        ':title',
        'quoted text',
        'Optional',
        'Provider/default label',
        'A visible heading and accessible player title.',
      ),
      p(
        ':start',
        'seconds or quoted M:SS / H:MM:SS',
        'Optional',
        'URL timestamp, otherwise 0',
        'An absolute position in the original source.',
      ),
      p(
        ':end',
        'seconds or quoted M:SS / H:MM:SS',
        'Optional',
        'URL bound, otherwise source end',
        'An absolute position greater than start; not an excerpt duration.',
      ),
      ...['autoplay', 'muted', 'loop'].map((name) =>
        p(
          `:${name}`,
          'boolean',
          'Optional',
          'false',
          name === 'loop'
            ? 'Repeat the selected excerpt.'
            : name === 'muted'
              ? 'Request an initially muted player.'
              : 'Request autoplay, subject to browser policy.',
        ),
      ),
      p(
        ':captions',
        'quoted language code',
        'Optional',
        'Provider preference',
        'Prefer an available caption track; cannot create a missing track.',
      ),
      prompt,
    ],
    result: {
      type: 'No result binding',
      description:
        'A nonblocking content effect. Playback position is local presentation state, rather than a saved answer.',
    },
    notes: [
      'Explicit time attributes override shared-URL timestamps. Source length/availability errors appear in the player.',
      'Pausing or ending a run pauses playback. Dailymotion requires the host’s player configuration.',
    ],
    variants: [v('excerpt', 'Twenty-second excerpt', 'video.pattern.md', examples.videoExample)],
  },
  {
    id: 'collect',
    name: 'Collection',
    command: '!collect / each',
    category: 'Flow & composition',
    guideAnchor: 'collections',
    summary:
      'Build participant-created entries, or traverse an existing list with one interaction sequence per item.',
    parameters: [
      binding,
      p(
        ':min',
        'nonnegative integer',
        'Optional',
        '1 in open mode',
        'Minimum completed entries before the participant can finish. Zero asks whether to begin.',
      ),
      p(
        ':max',
        'nonnegative integer',
        'Conditional',
        '—',
        'Required finite bound in open mode; must be at least min.',
      ),
      p(
        ':from',
        'list or choices',
        'Conditional',
        'Open mode',
        'A frozen source to traverse. Cannot be combined with open min/max bounds.',
      ),
      p(':as', 'identifier', 'Conditional', '—', 'Required alias for a mapped !collect item.'),
      p(
        'body',
        'straight-line steps',
        'Required',
        '—',
        'Fresh locals per entry; more complex procedures belong in called flows.',
      ),
      p(
        '-> yield',
        'typed expression',
        'Conditional',
        'Legacy !collect exports record fields',
        'Required final result for each; optional explicit output for language-one !collect.',
      ),
    ],
    result: {
      type: 'list[yield type] or list[record]',
      description:
        'A homogeneous list in entry/source order. Empty input produces a typed empty list.',
    },
    notes: [
      'Append an entry only after its body completes. Finishing an open collection is an explicit participant choice.',
      'Iteration aliases and locals do not escape; access the completed result list.',
    ],
    variants: [
      v('open', 'Open collection', 'open-collection.pattern.md', examples.openCollectionExample),
      v('each', 'Traverse two questions', 'two-questions.pattern.md', examples.collectionExample),
    ],
  },
  {
    id: 'use',
    name: 'Reusable flow',
    command: '!use',
    category: 'Flow & composition',
    guideAnchor: 'flows',
    summary: 'Call a local flow or pinned imported pattern using an explicit typed interface.',
    parameters: [
      binding,
      p(
        'target',
        'flow name or imported alias',
        'Required',
        '—',
        'A declared local flow or resolvable pinned pattern.',
      ),
      p(
        ':with',
        'input [= expression]',
        'Conditional',
        'No ambient inputs',
        'Supply every declared input exactly once. A bare name forwards the same-named binding.',
      ),
    ],
    result: {
      type: 'Record of declared outputs',
      description: 'Available when the child completes. Internal child bindings are not exported.',
    },
    notes: [
      'Declare flows before the main steps. They can share declarations but cannot capture caller-local bindings.',
      'Missing/extra/mistyped inputs and recursive dependency cycles are rejected. Existing runs keep their pinned dependencies.',
    ],
    variants: [v('local', 'Local typed flow', 'ask-a-topic.pattern.md', examples.flowExample)],
  },
  {
    id: 'message-handler',
    name: 'Message handler',
    command: 'events / on user.message',
    category: 'Flow & composition',
    guideAnchor: 'events',
    summary: 'Handle a side question while preserving the original unanswered text step.',
    parameters: [
      p(
        'on user.message',
        'local flow target',
        'Required',
        'No message hook',
        'Declare an active-pattern handler inside an events block.',
      ),
      p(
        ':input message',
        'text',
        'Required',
        'Submitted message',
        'The handler receives the participant’s text, rather than ambient chat history.',
      ),
      p(
        ':input prompt',
        'text',
        'Required',
        'Rendered question',
        'The exact pending question for which the message was submitted.',
      ),
      p(
        ':output disposition',
        'pass | handled',
        'Required',
        '—',
        'Return text or an appropriate closed enum. pass delivers the original answer once; handled returns to the unanswered question.',
      ),
    ],
    result: {
      type: 'Handler disposition',
      description:
        'No new root binding. The handler determines whether the original text answers the pending question or the question remains pending.',
    },
    notes: [
      'Handlers apply to active text questions, including called flows. They do not intercept their own messages, ratings, selections, or review decisions.',
      'Pausing or ending remains an explicit participant action. Unsupported event kinds are compile errors.',
    ],
    variants: [
      v('help', 'Explain, then return', 'message-handler.pattern.md', examples.eventExample),
    ],
  },
  {
    id: 'decision',
    name: 'Decision',
    command: '?match / ?branch',
    category: 'Flow & composition',
    guideAnchor: 'control-flow',
    summary: 'Choose authored local paths using an exact value or ordered Boolean conditions.',
    parameters: [
      p(
        'subject',
        'typed expression',
        'Conditional',
        '—',
        '?match compares one subject to literal values, choice IDs, or enum variants.',
      ),
      p(
        ':case',
        'value { steps }',
        'Conditional',
        '—',
        'A local exact-match arm; static choice IDs and enums can be exhaustively covered.',
      ),
      p(
        ':when',
        'boolean { steps }',
        'Conditional',
        '—',
        'A ?branch condition; the first true condition runs.',
      ),
      p(
        ':else',
        '{ steps }',
        'Conditional',
        '—',
        'Required for ?branch and for matches without proven exhaustive coverage.',
      ),
    ],
    result: {
      type: 'No direct result binding',
      description:
        'Arms may provide the same immutable binding when mutually exclusive; subsequent reads require a consistent value on every continuing path.',
    },
    notes: [
      'An arm normally continues below the decision. -> end completes the current pattern/flow.',
      'No labels or escaping jumps in local arms. Match stable choice IDs rather than display wording.',
    ],
    variants: [
      v('match', 'Match a choice', 'choose-a-path.pattern.md', examples.decisionExample),
      v('branch', 'Ordered conditions', 'conditional-path.pattern.md', examples.branchExample),
    ],
  },
  {
    id: 'loop',
    name: 'Functional loop',
    command: '?loop',
    category: 'Flow & composition',
    guideAnchor: 'loops',
    summary: 'Carry an immutable state value through repeated participant interactions.',
    parameters: [
      p(
        '[max]',
        'nonnegative integer',
        'Optional',
        'No authored maximum',
        'Total iterations including the first; zero skips the body. Host limits still apply.',
      ),
      p(
        'state = initial',
        'identifier and expression',
        'Required',
        '—',
        'Evaluate the initial state once and expose the state alias to each iteration.',
      ),
      p(
        '-> repeat',
        'same-type expression',
        'Conditional',
        'Body fallthrough exits',
        'The last statement supplies the next state; a repeated body must include a participant interaction.',
      ),
      p('-> break', 'terminal statement', 'Optional', '—', 'Exit the loop and continue below it.'),
    ],
    result: {
      type: 'No escaping loop-local binding',
      description:
        'State and iteration locals remain scoped to the loop. The authored continuation runs on normal loop exit.',
    },
    notes: [
      'The participant can leave the loop independently of ending the whole run.',
      'Bodies are straight-line. Repeated iterations receive fresh locals, without mutating outer bindings.',
    ],
    variants: [
      v('bounded', 'Up to three iterations', 'bounded-loop.pattern.md', examples.loopExample),
    ],
  },
  {
    id: 'refine',
    name: 'Wording review',
    command: '!refine',
    category: 'AI & wording',
    guideAnchor: 'ai-and-control',
    summary:
      'Review an initial candidate, request bounded revisions, and explicitly keep or finish without accepting it.',
    parameters: [
      binding,
      p(
        'initial',
        'text expression',
        'Required',
        '—',
        'The first wording is reviewed before the revision body runs.',
      ),
      p(
        'rounds',
        'positive integer',
        'Required',
        '—',
        'Revision budget per batch, rather than a model token/retry limit.',
      ),
      p(
        'renewable',
        'boolean flag',
        'Optional',
        'false',
        'Allow a new budget only after explicit participant approval.',
      ),
      p(
        ':as',
        'identifier',
        'Required',
        '—',
        'Read-only alias for the current candidate inside the revision body.',
      ),
      p(
        '-> propose',
        'text expression',
        'Required',
        '—',
        'Final statement of the revision body; offers wording rather than accepting it.',
      ),
    ],
    result: {
      type: '{value: text, outcome: choice, rounds: number}',
      description:
        'Inspect outcome.value: accepted, unresolved, or limit_reached. Completion alone does not establish acceptance.',
    },
    notes: [
      'A participant may keep the initial wording, request revision, edit directly, or finish without keeping it.',
      'Compatible :initial, :rounds, :renewable, and :next attributes remain accepted; do not duplicate header parameters or combine :next with -> propose.',
    ],
    variants: [
      v('review', 'Review and revise', 'review-wording.pattern.md', examples.refineExample),
    ],
  },
  {
    id: 'realize',
    name: 'Flexible wording',
    command: '~',
    category: 'AI & wording',
    guideAnchor: 'ai-and-control',
    summary:
      'Ask a model to phrase one predetermined authored move, while the program keeps control of the next step.',
    parameters: [
      p(
        'instruction',
        'text or braced text',
        'Required',
        '—',
        'The authored wording intent, with explicit references passed as data.',
      ),
      p(
        'placement',
        'question, display, standalone, or binding',
        'Required',
        '—',
        'A bound realization stores text; a standalone realization displays it. A realized question/display contains one realization without mixed literal text.',
      ),
    ],
    result: {
      type: 'text, when bound',
      description:
        'Generated wording is not participant endorsement. Its later use in !show, !ask, or !refine stays explicit.',
    },
    notes: [
      'The sample reply in this gallery is fixed and requires a click; no model is called.',
      'Generated wording remains data and is never parsed as executable Pattern Language.',
    ],
    variants: [
      v(
        'question',
        'Realized question',
        'realized-wording.pattern.md',
        examples.realizationExample,
      ),
    ],
  },
  {
    id: 'agent',
    name: 'Typed generation',
    command: '!agent',
    category: 'AI & wording',
    guideAnchor: 'ai-and-control',
    summary: 'Request model output with an explicit contract and declared context.',
    parameters: [
      p(
        'binding',
        'identifier',
        'Conditional',
        '—',
        'Required when :returns declares a typed result.',
      ),
      prompt,
      p(
        ':returns',
        'Pattern Language type',
        'Optional',
        'Text turn',
        'A scalar, closed enum, structural record, list, optional, or resource-reference result contract.',
      ),
      p(
        ':context',
        'bound expression path',
        'Optional',
        'No extra context',
        'Up to eight distinct bound paths supplied explicitly, separate from instructions.',
      ),
      p(
        ':min',
        'nonnegative count',
        'Optional',
        'No authored minimum',
        'List/choices results only; minimum accepted size.',
      ),
      p(
        ':max',
        'nonnegative count',
        'Optional',
        'Host/result limits',
        'List/choices results only; maximum accepted size, at least min.',
      ),
    ],
    result: {
      type: 'Declared :returns type',
      description:
        'The runtime checks exact fields, element types, bounds, and reference membership before advancing.',
    },
    notes: [
      'The gallery uses explicitly selected fixed replies, with the same contract validation.',
      'A contract-valid result may still be wrong or irrelevant; typed structure is not a quality guarantee.',
    ],
    variants: [
      v('record', 'Typed record', 'typed-agent.pattern.md', examples.agentExample),
      v('turn', 'Text turn', 'agent-turn.pattern.md', turn, {
        mockResults: [
          {
            kind: 'agent.turn',
            label: 'Use sample turn',
            result: { kind: 'turn', value: 'Take a brief pause and notice what would help.' },
          },
        ],
      }),
    ],
  },
  {
    id: 'classify',
    name: 'Closed classification',
    command: '?~',
    category: 'AI & wording',
    guideAnchor: 'ai-and-control',
    summary: 'Interpret one text input within authored closed categories and explicit context.',
    parameters: [
      binding,
      p(
        'classifier',
        'declared classifier name',
        'Required',
        '—',
        'Returns a declared closed enum.',
      ),
      p(
        ':case',
        'variant and quoted rule',
        'Required',
        '—',
        'Describe every non-fallback variant inside the classifier declaration.',
      ),
      p(
        ':fallback',
        'enum variant',
        'Required',
        '—',
        'The ambiguity category, rather than a model/network failure result.',
      ),
      p(
        ':context',
        'name and type',
        'Optional',
        'No ambient context',
        'Declare the classifier context interface.',
      ),
      p(
        ':with',
        'context [= expression]',
        'Conditional',
        '—',
        'Supply every declared context input when invoking the classifier.',
      ),
    ],
    result: {
      type: 'Declared closed enum',
      description:
        'An interpretation that can be matched exhaustively. Only the authored arms determine subsequent behavior.',
    },
    notes: [
      'Classifiers do not infer acceptance, cancellation, diagnosis, or permission.',
      'Operational errors and invalid categories leave the model step pending.',
    ],
    variants: [
      v('intent', 'Classify a message', 'classify-a-message.pattern.md', examples.semanticExample),
    ],
  },
  {
    id: 'suggest',
    name: 'Candidate suggestion',
    command: 'select ~ / filter ~ / rank ~',
    category: 'AI & wording',
    guideAnchor: 'ai-and-control',
    summary: 'Suggest only from offered candidates, with explicit decided or uncertain outcomes.',
    parameters: [
      binding,
      p(
        'source',
        'list or choices',
        'Required',
        '—',
        'The original candidate catalogue; candidate identity is preserved.',
      ),
      p(
        'operation',
        'select | filter | rank',
        'Required',
        '—',
        'Select exactly one, filter in catalogue order, or rank every original item once.',
      ),
      p(
        'criteria',
        'authored text and references',
        'Required',
        '—',
        'Criteria after ~, on one line or inside braces. These are whole effectful binding statements.',
      ),
    ],
    result: {
      type: '{outcome: SemanticOutcome, items: list[T]}',
      description:
        'Decided or uncertain. Uncertain always has an empty typed list; a decided empty filter is a different result.',
    },
    notes: [
      'Invented IDs, duplicates, incomplete ranks, and wrong cardinalities are rejected.',
      'Pure filter(items, helper) remains deterministic. A model suggestion is separate from a participant’s choice.',
    ],
    variants: ['rank', 'select', 'filter'].map((operation) =>
      v(
        operation,
        `${operation[0].toUpperCase()}${operation.slice(1)} candidates`,
        `suggest-${operation}.pattern.md`,
        examples.suggestionExample
          .replace('items |> rank ~', `items |> ${operation} ~`)
          .replace(
            'Order by score, highest first.',
            operation === 'select'
              ? 'Select the item with the highest score.'
              : operation === 'filter'
                ? 'Keep items whose score is at least 5.'
                : 'Order by score, highest first.',
          ),
        {
          ...exampleOptions['semantic-suggestion.pattern.md'],
          mockResults: [
            {
              kind: 'semantic.suggest',
              label: `Use sample ${operation}`,
              result: {
                kind: 'suggested',
                value: {
                  outcome: 'decided',
                  ids: operation === 'rank' ? ['item-1', 'item-0'] : ['item-1'],
                },
              },
            },
            {
              kind: 'semantic.suggest',
              label: 'Use uncertain result',
              result: { kind: 'suggested', value: { outcome: 'uncertain', ids: [] } },
            },
          ],
        },
      ),
    ),
  },
  {
    id: 'widget',
    name: 'Extension widget',
    command: '!widget',
    category: 'Extension widgets',
    guideAnchor: 'imports',
    summary:
      'Run a versioned custom interface and confirm its typed output record. The parameter table follows the selected template’s own contract.',
    parameters: [],
    result: {
      type: 'Declared output record',
      description: 'Defined by the selected widget export.',
    },
    notes: [
      'Input names, types, defaults, bounds, and output fields below are read from the same template JSON used by the runtime.',
      'Widget code edits a draft. The host validates the draft and the participant explicitly confirms; installing a package is not part of this gallery.',
      'The bundled choice/needs template names its selected-choice output needs. A widget may declare other record fields, as the reflection template demonstrates.',
    ],
    variants: [
      widgetVariant('blank', 'reflection', 'Reflection & rating'),
      widgetVariant('choices', 'choice-tags', 'Choice tags'),
      widgetVariant('needs', 'needs', 'Needs selector'),
    ],
  },
];

export const componentCategories = [
  'Questions & choices',
  'Content & media',
  'Flow & composition',
  'AI & wording',
  'Extension widgets',
] as const;

/** Search command spellings, field names, descriptions, and variant names together. */
export function findComponents(
  query: string,
  category = 'All components',
): readonly LanguageComponent[] {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return componentCatalog
    .filter((component) => {
      if (category !== 'All components' && component.category !== category) return false;
      const text = [
        component.name,
        component.command,
        component.summary,
        component.category,
        ...component.parameters.flatMap((parameter) => [
          parameter.name,
          parameter.type,
          parameter.description,
        ]),
        ...component.variants.flatMap((variant) => [
          variant.label,
          ...(variant.parameters ?? []).flatMap((parameter) => [
            parameter.name,
            parameter.type,
            parameter.description,
          ]),
        ]),
      ]
        .join(' ')
        .toLocaleLowerCase();
      return words.every((word) => text.includes(word));
    })
    .sort(
      (left, right) =>
        componentCategories.indexOf(left.category) - componentCategories.indexOf(right.category) ||
        left.name.localeCompare(right.name, 'en'),
    );
}
