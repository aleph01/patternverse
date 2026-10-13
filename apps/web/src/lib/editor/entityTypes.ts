import type { EntityType } from '@patternverse/schema';
import { isPersonalCreationType } from '@patternverse/workspace';

export type EditorEntityTypeOption = {
  readonly type: EntityType;
  readonly label: string;
  readonly pluralLabel: string;
  readonly description: string;
};

const ENTITY_TYPE_DETAILS: readonly EditorEntityTypeOption[] = [
  {
    type: 'pattern',
    label: 'pattern',
    pluralLabel: 'patterns',
    description: 'A reusable approach, with an optional interactive practice.',
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

/** Creation choices; older concepts and standalone practices remain editable. */
export const EDITOR_ENTITY_TYPES = ENTITY_TYPE_DETAILS.filter((option) =>
  isPersonalCreationType(option.type),
);

export const isEditorEntityType = isPersonalCreationType;

export const getEditorEntityType = (type: EntityType): EditorEntityTypeOption =>
  ENTITY_TYPE_DETAILS.find((option) => option.type === type) ?? ENTITY_TYPE_DETAILS[0];
