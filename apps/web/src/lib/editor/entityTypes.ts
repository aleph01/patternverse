import type { EntityType } from '@patternverse/schema';

export type EditorEntityTypeOption = {
  readonly type: EntityType;
  readonly label: string;
  readonly pluralLabel: string;
  readonly description: string;
};

export const EDITOR_ENTITY_TYPES: readonly EditorEntityTypeOption[] = [
  {
    type: 'pattern',
    label: 'pattern',
    pluralLabel: 'patterns',
    description: 'A reusable approach to a recurring situation.',
  },
  {
    type: 'concept',
    label: 'concept',
    pluralLabel: 'concepts',
    description: 'An idea that makes approaches easier to understand.',
  },
  {
    type: 'practice',
    label: 'practice',
    pluralLabel: 'practices',
    description: 'A structured activity that puts knowledge into action.',
  },
  {
    type: 'collection',
    label: 'collection',
    pluralLabel: 'collections',
    description: 'A curated path through related material.',
  },
  {
    type: 'verse',
    label: 'verse',
    pluralLabel: 'verses',
    description: 'A broad lens that groups related knowledge.',
  },
];

export const isEditorEntityType = (value: string | null): value is EntityType =>
  EDITOR_ENTITY_TYPES.some((option) => option.type === value);

export const getEditorEntityType = (type: EntityType): EditorEntityTypeOption =>
  EDITOR_ENTITY_TYPES.find((option) => option.type === type) ?? EDITOR_ENTITY_TYPES[0];
