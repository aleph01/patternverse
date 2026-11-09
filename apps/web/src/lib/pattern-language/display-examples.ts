const ideas = `[
    {name: "Take a pause", effort: 1, impact: 3, category: "Rest"},
    {name: "Ask for help", effort: 2, impact: 5, category: "Support"},
    {name: "Take a walk", effort: 3, impact: 4, category: "Rest"},
]`;

function display(binding: string, data: string, properties: string): string {
  return `:language 1

${binding} = ${data}
!show {{${binding}}} {
${properties}
}
-> end`;
}

/** Shared, self-contained sources for the guide and component gallery. */
export const visualizationExamples = [
  {
    id: 'map',
    label: 'Mapping',
    filename: 'show-mapping.pattern.md',
    source: display('ideas', ideas, '    :map effort, impact'),
    note: 'Effort is horizontal and impact is vertical. Edit a number and run changes to move its point.',
  },
  {
    id: 'group',
    label: 'Grouping',
    filename: 'show-grouping.pattern.md',
    source: display('ideas', ideas, '    :group category'),
    note: 'Rest contains two ideas and Support contains one. Change a category to move an idea into another labelled group.',
  },
  {
    id: 'order',
    label: 'Ordering',
    filename: 'show-ordering.pattern.md',
    source: display('ideas', ideas, '    :order impact desc'),
    note: 'Highest impact comes first: Ask for help, Take a walk, then Take a pause. Change desc to asc to reverse the order.',
  },
  {
    id: 'relationships',
    label: 'Relationships',
    filename: 'relationships.pattern.md',
    source: display(
      'steps',
      `[
    {id: "notice", name: "Notice", parent: ""},
    {id: "pause", name: "Pause", parent: "notice"},
    {id: "explore", name: "Explore", parent: "notice"},
    {id: "try", name: "Try", parent: "explore"},
]`,
      '    :link parent',
    ),
    note: 'A parent field connects each step to its parent. Notice branches into Pause and Explore; Explore leads to Try.',
  },
  {
    id: 'split',
    label: 'Split views',
    filename: 'show-split-views.pattern.md',
    source: display(
      'scenarios',
      `[
    {name: "Take a pause", effort: 1, impact: 3, scenario: "Expected"},
    {name: "Ask for help", effort: 2, impact: 5, scenario: "Expected"},
    {name: "Take a walk", effort: 3, impact: 4, scenario: "Expected"},
    {name: "Take a pause", effort: 1, impact: 4, scenario: "Optimistic"},
    {name: "Ask for help", effort: 2, impact: 6, scenario: "Optimistic"},
    {name: "Take a walk", effort: 3, impact: 5, scenario: "Optimistic"},
]`,
      '    :map effort, impact\n    :split scenario',
    ),
    note: 'Expected and Optimistic appear in separate panels with the same effort and impact scales, so their positions are comparable.',
  },
] as const;
