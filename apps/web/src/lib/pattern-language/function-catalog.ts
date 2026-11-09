import type { ComponentParameter, ComponentResult, ComponentVariant } from './component-catalog';

export interface LanguageFunction {
  id: string;
  category: 'Text' | 'Numbers' | 'Collections' | 'Reference data';
  summary: string;
  signatures: readonly string[];
  parameters: ComponentParameter[];
  result: ComponentResult;
  notes: readonly string[];
  variants: ComponentVariant[];
}

const parameter = (name: string, type: string, description: string): ComponentParameter => ({
  name,
  type,
  description,
  requirement: 'Required',
  defaultValue: '—',
});
const text = parameter(
  'value',
  'text',
  'The text to transform. The original value stays unchanged.',
);
const items = parameter('items', 'list[T]', 'A homogeneous list; T is its element type.');
const callbackForms =
  'Use a named fn, a named inline lambda (n => expression), or underscore placeholders. Types are inferred; each _ is a separate parameter. Inline lambdas can read earlier immutable values.';
const library = parameter(
  'library',
  'data library',
  'An imported reference-data library and its declared record schema.',
);
const data = {
  'commons:documentation-materials': {
    record_type: { record: { id: 'text', name: 'text', density: 'number' } },
    records: [
      { id: 'wood', name: 'Wood', density: 600 },
      { id: 'steel', name: 'Steel', density: 7850 },
    ],
  },
};
const dataOptions = {
  data,
  note: 'This preview supplies a two-record materials library. In your own practice, import the ID of a published data resource.',
};
const dataImport = ':import materials from "commons:documentation-materials"';

function example(
  id: string,
  label: string,
  body: string,
  declarations = '',
  imports = '',
): ComponentVariant {
  return {
    id,
    label,
    filename: `${id}.pattern.md`,
    source: `:language 1
${imports ? imports + '\n' : ''}:output result
${declarations ? '\n' + declarations + '\n' : ''}
${body}
!show {
    Result: {{result}}
}
-> end`,
  };
}

export const functionCatalog: readonly LanguageFunction[] = [
  {
    id: 'join',
    category: 'Text',
    summary: 'Combine texts with an explicit separator.',
    signatures: ['join(items: list[text], separator: text) -> text'],
    parameters: [
      parameter('items', 'list[text]', 'Texts in the desired order.'),
      parameter(
        'separator',
        'text',
        'Inserted between adjacent items; empty text joins without a separator.',
      ),
    ],
    result: { type: 'text', description: 'The joined text. An empty list returns empty text.' },
    notes: [
      'Elements must be text; other types are not converted implicitly. The result is limited to 1 MiB.',
    ],
    variants: [
      example(
        'join-notes',
        'Join collected notes',
        'result = ["Take a pause", "Ask for help"] |> join("; ")',
      ),
    ],
  },
  {
    id: 'split',
    category: 'Text',
    summary: 'Separate text at each occurrence of a literal separator.',
    signatures: ['split(value: text, separator: text) -> list[text]'],
    parameters: [
      text,
      parameter(
        'separator',
        'text',
        'A nonempty literal separator. Empty separators fail at evaluation; regular expressions are not supported.',
      ),
    ],
    result: {
      type: 'list[text]',
      description:
        'The parts in order, including empty parts at the beginning, end, or between repeated separators. Splitting empty text returns a list containing one empty text.',
    },
    notes: [
      'Separators are case-sensitive and may contain multiple characters. Results may contain at most 10,000 items.',
    ],
    variants: [
      example('split-notes', 'Preserve empty parts', 'result = split("Pause|Ask for help||", "|")'),
    ],
  },
  {
    id: 'contains',
    category: 'Text',
    summary: 'Check for a literal substring or an equal element in a list.',
    signatures: [
      'contains(value: text, fragment: text) -> boolean',
      'contains(items: list[T], item: T) -> boolean',
    ],
    parameters: [
      parameter('value', 'text or list[T]', 'The text or list to search.'),
      parameter(
        'item',
        'text fragment or T',
        'A literal case-sensitive substring, or a list element with the exact matching type.',
      ),
    ],
    result: {
      type: 'boolean',
      description:
        'True when the substring or list element is present; otherwise false. Every text contains empty text.',
    },
    notes: [
      'List membership uses the language’s structural equality. Choices compare stable IDs rather than labels. An empty list contains no elements.',
    ],
    variants: [
      example('contains-text', 'Check a response', 'result = contains("Take a pause", "pause")'),
      example(
        'contains-record',
        'Find an equal record',
        'result = contains([{name: "Pause", score: 2}], {name: "Pause", score: 2})',
      ),
    ],
  },
  ...(['starts_with', 'ends_with'] as const).map((id): LanguageFunction => ({
    id,
    category: 'Text',
    summary: `Check whether text ${id === 'starts_with' ? 'starts' : 'ends'} with a literal fragment.`,
    signatures: [`${id}(value: text, fragment: text) -> boolean`],
    parameters: [
      text,
      parameter(
        'fragment',
        'text',
        'A case-sensitive literal prefix or suffix; empty text always matches.',
      ),
    ],
    result: {
      type: 'boolean',
      description:
        'True when the boundary matches, otherwise false. Unicode text is supported without changing its case or normalization.',
    },
    notes: [
      'No regular expressions or implicit trimming are applied. Normalize the text explicitly when needed.',
    ],
    variants: [
      example(
        `${id}-text`,
        'Check a text boundary',
        `result = ${id}("Take a pause", "${id === 'starts_with' ? 'Take' : 'pause'}")`,
      ),
    ],
  })),
  {
    id: 'sum',
    category: 'Numbers',
    summary: 'Add all numbers in a list from left to right.',
    signatures: ['sum(items: list[number]) -> number'],
    parameters: [parameter('items', 'list[number]', 'A list containing only numbers.')],
    result: { type: 'number', description: 'The total, or zero for an empty list.' },
    notes: [
      'Arithmetic uses finite floating-point numbers; a non-finite intermediate total fails explicitly. Empty literal lists need a type, such as []:number.',
    ],
    variants: [
      example('sum-scores', 'Total scores', 'result = sum([2, 4, 6])'),
      example('sum-empty', 'Empty total', 'scores: list[number] = []\nresult = sum(scores)'),
    ],
  },
  ...(['min', 'max'] as const).map((id): LanguageFunction => ({
    id,
    category: 'Numbers',
    summary: `Return the ${id === 'min' ? 'smallest' : 'largest'} number, or None for an empty list.`,
    signatures: [`${id}(items: list[number]) -> Optional[number]`],
    parameters: [parameter('items', 'list[number]', 'The numeric values to compare.')],
    result: {
      type: 'Optional[number]',
      description:
        'A present minimum or maximum for a nonempty list; None for an empty list. Use ?? to provide an explicit fallback.',
    },
    notes: ['Text ordering is not supported. No fallback value is inferred.'],
    variants: [
      example(`${id}-scores`, 'Present result', `result = ${id}([2, 8, 4]) ?? 0`),
      example(`${id}-empty`, 'Empty list fallback', `result = ${id}([]:number) ?? 0`),
    ],
  })),
  ...(['first', 'last'] as const).map((id): LanguageFunction => ({
    id,
    category: 'Collections',
    summary: `Read the ${id} element safely, returning None for an empty list.`,
    signatures: [`${id}(items: list[T]) -> Optional[T]`],
    parameters: [items],
    result: {
      type: 'Optional[T]',
      description: `The ${id} element wrapped as present, or None when the list is empty.`,
    },
    notes: [
      'Use ?? to unwrap with a fallback, or check against None before using the element.',
      'T cannot itself be Optional: directly nested Optional types are not supported.',
    ],
    variants: [
      example(
        `${id}-note`,
        'Present note',
        `result = ${id}(["Pause", "Ask for help"]) ?? "No notes yet."`,
      ),
      example(`${id}-empty`, 'Absent note', `result = ${id}([]:text) ?? "No notes yet."`),
    ],
  })),
  {
    id: 'find',
    category: 'Collections',
    summary: 'Return the first element satisfying a pure predicate.',
    signatures: ['find(items: list[T], helper: fn(T) -> boolean) -> Optional[T]'],
    parameters: [
      items,
      parameter(
        'helper',
        'callback: T -> boolean',
        'A named helper or inline lambda accepting one element and returning a Boolean.',
      ),
    ],
    result: {
      type: 'Optional[T]',
      description:
        'The first matching original element, or None if the list is empty or no element matches.',
    },
    notes: [
      'Elements are visited in order. Helpers after the first match are not evaluated.',
      callbackForms,
      'T cannot itself be Optional because nested Optional types are unsupported.',
    ],
    variants: [
      example(
        'find-score',
        'First matching score',
        'result = find([2, 8, 9], high) ?? 0',
        'fn high(n: number) -> boolean => n >= 7',
      ),
      example(
        'find-missing',
        'No matching score',
        'result = find([2, 4], high) ?? 0',
        'fn high(n: number) -> boolean => n >= 7',
      ),
      example('find-placeholders', 'Underscore lambda', 'result = find([2, 8, 9], _ >= 7) ?? 0'),
      example('find-named', 'Named inline lambda', 'result = find([2, 8, 9], n => n >= 7) ?? 0'),
    ],
  },
  ...(['any', 'all'] as const).map((id): LanguageFunction => ({
    id,
    category: 'Collections',
    summary:
      id === 'any'
        ? 'Check whether at least one element satisfies a predicate.'
        : 'Check whether every element satisfies a predicate.',
    signatures: [`${id}(items: list[T], helper: fn(T) -> boolean) -> boolean`],
    parameters: [
      items,
      parameter(
        'helper',
        'callback: T -> boolean',
        'A named helper or inline lambda accepting one element and returning a Boolean.',
      ),
    ],
    result: {
      type: 'boolean',
      description:
        id === 'any'
          ? 'True on the first match; false for an empty list or when nothing matches.'
          : 'False on the first failure; true for an empty list or when everything matches.',
    },
    notes: [
      'Helpers run in list order and stop as soon as the result is known. Later helper calls are not evaluated.',
      callbackForms,
    ],
    variants: [
      example(
        `${id}-scores`,
        'Test scores',
        `result = ${id}([2, 8, 9], high)`,
        'fn high(n: number) -> boolean => n >= 7',
      ),
      example(`${id}-placeholders`, 'Underscore lambda', `result = ${id}([4, 7], _ >= 3)`),
      example(
        `${id}-named`,
        'Named inline lambda',
        `result = ${id}([4, 7], n => n >= 3 and n <= 8)`,
      ),
      example(
        `${id}-empty`,
        'Empty list',
        `result = ${id}([]:number, high)`,
        'fn high(n: number) -> boolean => n >= 7',
      ),
    ],
  })),
  {
    id: 'distinct',
    category: 'Collections',
    summary: 'Remove duplicate list elements while keeping their first occurrence.',
    signatures: ['distinct(items: list[T]) -> list[T]'],
    parameters: [items],
    result: {
      type: 'list[T]',
      description:
        'A new list with the original type and order, containing each equal value once. Empty lists keep their element type.',
    },
    notes: [
      'Uses structural equality for records and lists. Choices compare stable IDs, so the first occurrence’s label is retained. Positive and negative zero are equal.',
      'The normal pure-evaluation work and value limits apply.',
    ],
    variants: [
      example(
        'distinct-notes',
        'Keep first occurrences',
        'result = distinct(["Pause", "Ask for help", "Pause"])',
      ),
    ],
  },
  {
    id: 'trim',
    category: 'Text',
    summary: 'Remove whitespace from the beginning and end of text.',
    signatures: ['trim(value: text) -> text'],
    parameters: [text],
    result: {
      type: 'text',
      description:
        'The text without leading or trailing Unicode whitespace. Whitespace inside the text is preserved.',
    },
    notes: ['Text containing only whitespace becomes empty text. Empty text remains empty text.'],
    variants: [
      example('trim-text', 'Keep internal spacing', 'result = trim("  Take   a pause  ")'),
    ],
  },
  {
    id: 'lowercase',
    category: 'Text',
    summary: 'Convert text to lowercase using Unicode case conversion.',
    signatures: ['lowercase(value: text) -> text'],
    parameters: [text],
    result: {
      type: 'text',
      description: 'Lowercase text with its spacing and punctuation preserved.',
    },
    notes: [
      'This is Unicode lowercase conversion without a locale parameter. It does not perform whitespace normalization or case-insensitive comparison.',
    ],
    variants: [
      example('lowercase-text', 'Lowercase a label', 'result = lowercase("Take a PAUSE")'),
    ],
  },
  {
    id: 'normalize_whitespace',
    category: 'Text',
    summary: 'Replace runs of whitespace with a single space and remove outer whitespace.',
    signatures: ['normalize_whitespace(value: text) -> text'],
    parameters: [text],
    result: {
      type: 'text',
      description:
        'Whitespace-separated words joined by one ordinary space. Whitespace-only input becomes empty text.',
    },
    notes: [
      'Tabs, newlines, and other Unicode whitespace are treated as separators. Use trim when you need to preserve internal formatting.',
    ],
    variants: [
      example(
        'normalize-text',
        'Clean up spacing',
        'result = "  Take   a   pause  " |> normalize_whitespace',
      ),
    ],
  },
  {
    id: 'concat',
    category: 'Text',
    summary: 'Join two texts or append two lists with the same element type.',
    signatures: [
      'concat(left: text, right: text) -> text',
      'concat(left: list[T], right: list[T]) -> list[T]',
    ],
    parameters: [
      parameter('left', 'text or list[T]', 'The first text or list.'),
      parameter(
        'right',
        'same type as left',
        'The second text or list. Both operands must have the same type.',
      ),
    ],
    result: {
      type: 'text or list[T]',
      description:
        'A new value of the same type as both operands. List elements retain their order.',
    },
    notes: [
      'No separator is inserted; include spaces or punctuation in your text.',
      'Mixed text/list operands and lists with different element types are rejected. Results are bounded to 1 MiB of text or 10,000 list items.',
    ],
    variants: [
      example('concat-text', 'Join text', 'result = concat("Take a ", "pause")'),
      example(
        'concat-lists',
        'Append lists',
        'result = ["Pause"] |> concat(["Ask for help", "Try again"])',
      ),
    ],
  },
  {
    id: 'clamp',
    category: 'Numbers',
    summary: 'Keep a number within inclusive lower and upper bounds.',
    signatures: ['clamp(value: number, minimum: number, maximum: number) -> number'],
    parameters: [
      parameter('value', 'number', 'The number to bound.'),
      parameter('minimum', 'number', 'Inclusive lower bound.'),
      parameter('maximum', 'number', 'Inclusive upper bound; must be at least minimum.'),
    ],
    result: {
      type: 'number',
      description:
        'The minimum for a value below the range, the maximum for a value above it, or the original value inside the range.',
    },
    notes: [
      'Equal bounds are allowed. Reversed bounds fail at evaluation; they are not swapped automatically.',
    ],
    variants: [example('clamp-number', 'Bound a score', 'result = 12 |> clamp(0, 10)')],
  },
  {
    id: 'count',
    category: 'Collections',
    summary: 'Count elements in a list or a choices catalogue.',
    signatures: ['count(items: list[T]) -> number', 'count(items: choices) -> number'],
    parameters: [
      parameter(
        'items',
        'list[T] or choices',
        'The list or choices catalogue to count; text is not accepted.',
      ),
    ],
    result: {
      type: 'number',
      description: 'The number of elements, including duplicates. An empty list returns zero.',
    },
    notes: [
      'This counts top-level elements. It does not count characters or recursively count nested lists.',
    ],
    variants: [
      example(
        'count-list',
        'Count list entries',
        'result = count(["Pause", "Ask for help", "Pause"])',
      ),
    ],
  },
  {
    id: 'shuffle',
    category: 'Collections',
    summary: 'Return all items in a shuffled order, preserving their values and duplicates.',
    signatures: [
      'shuffle(items: list[T]) -> list[T]',
      'shuffle(items: list[T], seed: text) -> list[T]',
      'shuffle(items: choices) -> choices',
      'shuffle(items: choices, seed: text) -> choices',
    ],
    parameters: [
      parameter(
        'items',
        'list[T] or choices',
        'The list or choice catalogue to reorder. The original stays unchanged.',
      ),
      {
        ...parameter(
          'seed',
          'text',
          'The same seed and input produce the same order across runs and hosts.',
        ),
        requirement: 'Optional',
        defaultValue: 'Run and invocation identity',
      },
    ],
    result: {
      type: 'Same list or choices type as the input',
      description:
        'A new permutation containing every original item exactly once, including duplicate values and complete records. Empty and single-item inputs stay unchanged.',
    },
    notes: [
      'Without a seed, use shuffle as the whole right-hand side of a binding: order = shuffle(items) or order = items |> shuffle. A new run can produce a different order; pause, resume, and saved-run restoration preserve it.',
      'With a text seed, shuffle is pure and can be nested in expressions, helpers, and pipelines.',
      'A permutation can equal the original order. This does not balance experiment groups across participants and is not intended for security-sensitive randomness.',
    ],
    variants: [
      example('shuffle-run', 'Shuffle for this run', 'result = [1, 2, 3, 4, 5, 6] |> shuffle'),
      example(
        'shuffle-seeded',
        'Repeat an order with a seed',
        'result = shuffle([1, 2, 3, 4, 5, 6], "demo")',
      ),
    ],
  },
  {
    id: 'map',
    category: 'Collections',
    summary: 'Transform every list element with a pure callback.',
    signatures: ['map(items: list[T], helper: fn(T) -> U) -> list[U]'],
    parameters: [
      items,
      parameter(
        'helper',
        'callback: T -> U',
        'A named helper or inline lambda with one parameter matching the element type. Its result determines U.',
      ),
    ],
    result: {
      type: 'list[U]',
      description:
        'A new list with one result per input element, in the same order. An empty input keeps the helper’s output element type.',
    },
    notes: [
      callbackForms,
      'Pass a declared helper by name. Wrap built-ins in a lambda, such as trim(_), or a named fn.',
      'Use map(helper) |> flatten to transform each element into a list and join those lists.',
      'Use items |>> helper or items |>> trim as an explicit mapping pipe. Extra arguments follow the item; mapping traverses one list level and preserves nested results.',
    ],
    variants: [
      example(
        'map-pipe',
        'Map with an explicit pipe',
        'result = ["  Take a pause  ", "Ask   for help"] |>> trim |>> normalize_whitespace',
      ),
      example(
        'map-list',
        'Clean every note',
        'result = map(["  Take a pause  ", "Ask   for help"], clean)',
        'fn clean(value: text) -> text => value |> normalize_whitespace',
      ),
      example(
        'map-placeholders',
        'Underscore lambda',
        'result = map(["  Take a pause  ", "Ask   for help"], normalize_whitespace(_))',
      ),
      example('map-named', 'Named inline lambda', 'result = map([2, 8, 9], n => n * n)'),
      example(
        'map-fields',
        'Underscore field access',
        'result = map([{name: "Pause"}, {name: "Ask for help"}], _.name)',
      ),
      example(
        'map-nested',
        'Nested lambdas and captured values',
        'threshold = 7\ngroups = [[2, 8], [7, 9]]\nresult = map(groups, group => filter(group, _ >= threshold))',
      ),
    ],
  },
  {
    id: 'filter',
    category: 'Collections',
    summary: 'Keep list elements whose pure callback returns true.',
    signatures: ['filter(items: list[T], helper: fn(T) -> boolean) -> list[T]'],
    parameters: [
      items,
      parameter(
        'helper',
        'callback: T -> boolean',
        'A named helper or inline lambda accepting one element and returning a Boolean.',
      ),
    ],
    result: {
      type: 'list[T]',
      description:
        'The matching original elements, in their original order. The result may be an empty typed list.',
    },
    notes: [
      'The helper must return boolean; numbers and text do not have implicit truthiness.',
      callbackForms,
      'This is a deterministic pure function. The AI-backed filter ~ statement is documented under Components → Candidate suggestion.',
    ],
    variants: [
      example(
        'filter-list',
        'Keep high scores',
        'result = [2, 8, 5, 9] |> filter(high)',
        'fn high(value: number) -> boolean => value >= 7',
      ),
      example(
        'filter-placeholders',
        'Underscore lambda and captured threshold',
        'threshold = 7\nresult = [2, 8, 5, 9] |> filter(_ >= threshold)',
      ),
      example(
        'filter-named',
        'Named lambda reuses its parameter',
        'result = filter([2, 4, 8, 9], n => n >= 3 and n <= 8)',
      ),
    ],
  },
  {
    id: 'flatten',
    category: 'Collections',
    summary: 'Join a list of lists by removing exactly one level of nesting.',
    signatures: ['flatten(items: list[list[T]]) -> list[T]'],
    parameters: [
      parameter('items', 'list[list[T]]', 'Nested lists sharing one inner element type.'),
    ],
    result: {
      type: 'list[T]',
      description:
        'The inner elements in outer-list order, preserving each inner list’s order. Empty inner lists add no elements.',
    },
    notes: [
      'Flattening is not recursive. A list nested three levels deep remains nested two levels deep.',
      'A flat list is a type error. The combined result may contain at most 10,000 items.',
    ],
    variants: [
      example(
        'flatten-lists',
        'Join groups',
        'result = flatten([["Pause"], ["Ask for help", "Try again"]])',
      ),
    ],
  },
  {
    id: 'reduce',
    category: 'Collections',
    summary: 'Combine a list from left to right, using its first element as the initial value.',
    signatures: ['reduce(items: list[T], helper: fn(T, T) -> T) -> Optional[T]'],
    parameters: [
      items,
      parameter(
        'helper',
        'callback: (T, T) -> T',
        'A named helper or inline lambda. Parameters are accumulator first, then the next element. The result must keep the element type.',
      ),
    ],
    result: {
      type: 'Optional[T]',
      description:
        'A present combined value for a nonempty list, or None for an empty list. A single-element list returns that element without calling the callback.',
    },
    notes: [
      callbackForms,
      'There is no seed argument. The first element initializes the accumulator, and remaining elements are visited in order. Use fold when you want an explicit seed or a different accumulator type.',
      'Use ?? to choose an explicit fallback. Parenthesize a pipeline result before applying ??, as in (items |> reduce(_ + _)) ?? 0.',
      'T cannot itself be Optional because directly nested Optional types are unsupported. Callback types are checked even for empty or single-element lists.',
    ],
    variants: [
      example(
        'reduce-helper',
        'Named helper',
        'result = reduce([2, 4, 8], add) ?? 0',
        'fn add(total: number, value: number) -> number => total + value',
      ),
      example(
        'reduce-placeholders',
        'Underscore lambda',
        'result = ([2, 4, 8] |> reduce(_ + _)) ?? 0',
      ),
      example(
        'reduce-named',
        'Named inline lambda',
        'result = reduce([2, 4, 8], (total, value) => total + value) ?? 0',
      ),
      example(
        'reduce-empty',
        'Empty list fallback',
        'scores: list[number] = []\nresult = reduce(scores, _ + _) ?? 0',
      ),
      example('reduce-singleton', 'Single element', 'result = reduce([7], _ + _) ?? 0'),
    ],
  },
  {
    id: 'fold',
    category: 'Collections',
    summary: 'Combine a list into one value, starting with an explicit seed.',
    signatures: ['fold(items: list[T], seed: A, helper: fn(A, T) -> A) -> A'],
    parameters: [
      items,
      parameter('seed', 'A', 'The initial accumulator; A can be a scalar, list, or record type.'),
      parameter(
        'helper',
        'callback: (A, T) -> A',
        'A named helper or inline lambda. Parameters are accumulator first, then current item. The result must match the seed’s type.',
      ),
    ],
    result: {
      type: 'A',
      description:
        'The final accumulator after visiting items from left to right. An empty list returns the seed unchanged.',
    },
    notes: [
      'All three arguments are required. No initial accumulator is inferred from the first item.',
      callbackForms,
      'For fold, _ + _ means (accumulator, item) => accumulator + item. Every underscore occurrence introduces a separate parameter.',
    ],
    variants: [
      example(
        'fold-sum',
        'Add scores',
        'result = [2, 4, 6] |> fold(0, add)',
        'fn add(total: number, value: number) -> number => total + value',
      ),
      example('fold-placeholders', 'Underscore lambda', 'result = [2, 4, 8] |> fold(0, _ + _)'),
      example(
        'fold-named',
        'Named two-parameter lambda',
        'result = fold([2, 4, 8], 0, (total, value) => total + value)',
      ),
      example(
        'fold-empty',
        'Empty list returns seed',
        'values: list[number] = []\nresult = fold(values, 10, add)',
        'fn add(total: number, value: number) -> number => total + value',
      ),
    ],
  },
  {
    id: 'records',
    category: 'Reference data',
    summary: 'Read an imported reference library as a typed list of records.',
    signatures: ['records(library: data library[R]) -> list[R]'],
    parameters: [library],
    result: {
      type: 'list[R]',
      description:
        'All records in the library’s stored order, with the exact declared record type R.',
    },
    notes: [
      'Import a published data resource with :import before using it. R represents that library’s record schema.',
      'The library is resolved when a run starts and pinned with the run. Reading its records performs no AI call.',
    ],
    variants: [
      {
        ...example(
          'library-records',
          'List materials',
          'result = records(materials)',
          '',
          dataImport,
        ),
        options: dataOptions,
      },
    ],
  },
  {
    id: 'lookup',
    category: 'Reference data',
    summary: 'Find one record by text ID or by a validated reference to the same library.',
    signatures: [
      'lookup(library: data library[R], key: text) -> Optional[R]',
      'lookup(library: data library[R], key: ref[library]) -> R',
    ],
    parameters: [
      library,
      parameter(
        'key',
        'text or ref[library]',
        'An exact record ID, or a typed reference belonging to this same library.',
      ),
    ],
    result: {
      type: 'Optional[R] with a text key; R with a typed reference',
      description:
        'A text lookup returns a present optional record or None when the ID is absent. A typed reference returns the record directly because its library and ID are already validated.',
    },
    notes: [
      'Check a text lookup against None before accessing fields. Empty or unknown text IDs return None.',
      'References from another library are type errors even if both libraries contain the same ID.',
      'The bundled materials fixture is supplied only to this preview; replace its import with your own published resource ID.',
    ],
    variants: [
      {
        ...example(
          'lookup-present',
          'Existing text ID',
          'material = lookup(materials, "wood")\n?branch {\n    :when material != None {\n        result = material.name\n    }\n    :else {\n        result = "No material found."\n    }\n}',
          '',
          dataImport,
        ),
        options: dataOptions,
      },
      {
        ...example(
          'lookup-absent',
          'Missing text ID (None)',
          'material = lookup(materials, "missing")\n?branch {\n    :when material != None {\n        result = material.name\n    }\n    :else {\n        result = "No material found."\n    }\n}',
          '',
          dataImport,
        ),
        options: dataOptions,
      },
    ],
  },
];

export const functionCategories = ['Text', 'Numbers', 'Collections', 'Reference data'] as const;

export function findFunctions(
  query: string,
  category = 'All functions',
): readonly LanguageFunction[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return functionCatalog
    .filter((item) => {
      const searchable = [
        item.id,
        item.category,
        item.summary,
        ...item.signatures,
        ...item.parameters.map((p) => `${p.name} ${p.type} ${p.description}`),
        item.result.type,
        item.result.description,
        ...item.notes,
      ]
        .join(' ')
        .toLocaleLowerCase();
      return (
        (category === 'All functions' || category === item.category) &&
        terms.every((term) => searchable.includes(term))
      );
    })
    .sort(
      (left, right) =>
        functionCategories.indexOf(left.category) - functionCategories.indexOf(right.category) ||
        left.id.localeCompare(right.id, 'en'),
    );
}
