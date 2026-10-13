import { item, type Completion } from './types';

/** Templates use a single caret marker; inserted text still goes through the Rust compiler. */
export function commandSnippets(bound: boolean): Completion[] {
  const snippets = [
    item('!ask', `!ask${bound ? '' : ' response'} {\n  ¦What comes to mind?\n}`, 'Ask for text'),
    item(
      '!form',
      `!form${bound ? '' : ' reflection'} {\n  :title "Reflect"\n  !ask thought {\n    :required true\n    :multiline true\n    ¦What comes to mind?\n  }\n}`,
      'Grouped questions · one record',
    ),
    item(
      '!image',
      '!image {\n  :url "¦https://example.com/decision-tree.png"\n  :alt "A decision tree showing three possible next steps."\n}',
      'Display an image',
    ),
    item('!video', '!video {\n  :url "¦https://youtu.be/M7lc1UVf-VE"\n}', 'Display a video'),
    item('!show', '!show {\n  ¦Notice this.\n}', 'Display text'),
    item(
      '!timer',
      `!timer${bound ? '' : ' pause'} {\n  :duration 60\n  :adjustable false\n  :blocking true\n  ¦Take a quiet pause.\n}`,
      'Countdown timer',
    ),
    item(
      '!rate',
      `!rate${bound ? '' : ' rating'} 0..10 {\n  ¦How strong is it?\n}`,
      'Ask for a rating',
    ),
    item(
      '!choose',
      `!choose${bound ? '' : ' choice'} {\n  ¦Choose what fits.\n  - first: "First option"\n  - second: "Second option"\n}`,
      'Participant choice',
    ),
    item(
      '!rank',
      `!rank${bound ? '' : ' ordered'} [from=items] {\n  ¦Arrange these in your order.\n}`,
      'Participant ranking',
    ),
    item(
      '!collect',
      `!collect${bound ? '' : ' entries'} {\n  :max 3\n  response = !ask {\n    ¦What would you add?\n  }\n  -> yield response\n}`,
      'Collect explicit results',
    ),
    item(
      '!refine',
      `!refine[rounds=4] ${bound ? '' : 'review = '}wording {\n  :as current\n  edited = !ask {\n    ¦How would you change {{current}}?\n  }\n  -> propose edited\n}`,
      'Participant review of wording',
    ),
    item(
      '!agent',
      `!agent${bound ? '' : ' suggestion'} {\n  :returns text\n  ¦Prepare a short suggestion.\n}`,
      'Generate a typed value',
    ),
    item(
      '!turn',
      `!turn${bound ? '' : ' response'} {\n  ¦Reflect briefly.\n}`,
      'Conversational reply',
    ),
    item(
      '!use',
      `!use ¦helper${bound ? '' : ' as result'} {\n  :with topic\n}`,
      'Call a pinned pattern',
    ),
    item('~', '~ ¦Restate {{original}} without changing meaning.', 'Realize wording'),
    item(
      '?match',
      '?match ¦value {\n  :case variant -> label\n  :else -> end\n}',
      'Branch by value',
    ),
    item(
      '?loop',
      '?loop[4] state = initial {\n  next = !ask {\n    ¦What follows from {{state}}?\n  }\n  -> repeat next\n}',
      'Cancellable interaction loop',
    ),
    item(
      'classifier',
      'classifier intent -> Intent {\n  :case answer "¦Answers the prompt."\n  :fallback other\n}',
      'Declare a semantic classifier',
    ),
    item('type', 'type Intent = answer | other', 'Declare a closed enum'),
    item('fn', 'fn clean(s: text) -> text => s |> trim', 'Declare a pure helper'),
    item(
      'flow',
      'flow ¦ask_topic {\n  :input topic text\n  :output answer\n  answer = !ask {\n    What comes to mind about {{topic}}?\n  }\n  -> end\n}',
      'Declare an isolated effectful procedure',
    ),
    item(
      'events',
      'events {\n  on user.message -> ¦handle_message\n}',
      'Handle side questions only during this pattern',
    ),
  ];
  return bound
    ? snippets.filter(
        (value) =>
          (value.label.startsWith('!') && !['!show', '!video', '!image'].includes(value.label)) ||
          value.label === '~',
      )
    : snippets;
}

/** Scope-specific authoring templates, not language validation rules. */
export function attributeSuggestions(kind: string, insideForm: boolean): Completion[] {
  const attributes =
    kind === 'image'
      ? [
          'url "¦https://example.com/decision-tree.png"',
          'alt "¦Describe the image"',
          'title "¦Image title"',
        ]
      : kind === 'video'
        ? [
            'url "¦https://youtu.be/M7lc1UVf-VE"',
            'title "¦Video title"',
            'start "0:00"',
            'end "1:00"',
            'autoplay false',
            'muted false',
            'loop false',
            'captions "en"',
          ]
        : kind === 'form'
          ? ['title "¦Step title"']
          : kind === 'ask' && insideForm
            ? ['required true', 'multiline true', 'placeholder "¦Write here…"']
            : kind === 'flow'
              ? ['input topic text', 'output result']
              : kind === 'root'
                ? ['language 1', 'title "¦Title"', 'input topic text', 'output result', 'import ¦']
                : kind === 'classifier'
                  ? ['context prompt text', 'case answer "¦Meaning"', 'fallback other']
                  : kind === 'match'
                    ? ['case ¦variant -> label', 'else -> label']
                    : kind === 'branch'
                      ? ['when ¦condition -> label', 'else -> label']
                      : kind === 'classify' || kind === 'use'
                        ? ['with ¦input']
                        : kind === 'refine'
                          ? ['as current']
                          : kind === 'collect'
                            ? ['min 1', 'max 3', 'from items', 'as item']
                            : kind === 'agent'
                              ? ['returns text', 'min 1', 'max 3']
                              : kind === 'timer'
                                ? [
                                    'duration 60',
                                    'adjustable false',
                                    'min 10',
                                    'max 300',
                                    'blocking true',
                                    'sticky true',
                                    ...(insideForm ? ['persistent false'] : []),
                                  ]
                                : kind === 'rate'
                                  ? ['prefer slider', 'low "¦Low"', 'high "High"']
                                  : ['choose', 'rank'].includes(kind)
                                    ? ['from items', 'option id "¦Label"']
                                    : [];
  return attributes.map((value) => item(':' + value.split(' ')[0], ':' + value, 'Attribute'));
}

export function parameterSuggestions(kind: string, supplied: readonly string[]): Completion[] {
  return (
    kind === 'refine'
      ? ['rounds=4', 'renewable']
      : kind === 'rank'
        ? ['from=items', 'label=label', 'prefer=reorder']
        : [
            'multi',
            'min=1',
            'max=3',
            'from=items',
            'prefer=checklist',
            'prefer=chips',
            'prefer=radio',
          ]
  )
    .filter((value) => !supplied.includes(value.split('=')[0]))
    .map((value) => item(value, value, 'Optional parameter'));
}

/** Keep pipeline and ordinary-call templates in the same suggestion order. */
export function pureFunctionSuggestions(pipeline: boolean): Completion[] {
  const options: Completion[] = [];
  options.push(
    ...['trim', 'lowercase', 'normalize_whitespace', 'count', 'flatten'].map((name) =>
      item(name, pipeline ? name : `${name}(¦value)`, 'Pure function'),
    ),
  );
  options.push(
    ...[
      ['clamp', '0, 10'],
      ['concat', '"text"'],
      ['map', 'helper'],
      ['filter', 'helper'],
      ['fold', '0, helper'],
    ].map(([name, args]) =>
      item(name!, `${name}(${pipeline ? '¦' : '¦value, '}${args})`, 'Pure function'),
    ),
  );
  return options;
}
