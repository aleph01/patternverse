import {
  practiceDefinitionSchema,
  rawEntitySchema,
  type EntityStatus,
  type EntityType,
  type PracticeDefinition,
  type RawEntity,
} from '@patternverse/schema';
import {
  parsePracticeFromBody,
  upsertPracticeFence,
  parseLanguagePracticeFromBody,
  upsertLanguagePracticeFence,
  legacyPracticeSource,
} from '@patternverse/compiler/practice';

export type EditorValues = {
  id: string;
  type: EntityType;
  title: string;
  summary: string;
  status: EntityStatus;
  aliases: string;
  tags: string;
  attribution: string;
  verses: string;
  implements: string;
  durationMinutes: string;
  items: string[];
  body: string;
  /** Compatibility input for callers importing old records, never a YAML authoring mode. */
  practice?: PracticeDefinition;
  languagePracticeSource?: string;
};

export type EditorValidation =
  | { readonly success: true; readonly entity: RawEntity; readonly errors: readonly [] }
  | { readonly success: false; readonly errors: readonly string[] };

export const emptyEditorValues = (type: EntityType = 'pattern'): EditorValues => ({
  id: '',
  type,
  title: '',
  summary: '',
  status: 'draft',
  aliases: '',
  tags: '',
  attribution: '',
  verses: '',
  implements: '',
  durationMinutes: '',
  items: [],
  body: '',
  practice: undefined,
});

export const parseEditorList = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const optionalText = (value: string): string | undefined => value.trim() || undefined;

export const editorValuesFromEntity = (entity: RawEntity): EditorValues => {
  const parsedPractice = parsePracticeFromBody(entity.body);
  const parsedLanguage = parseLanguagePracticeFromBody(parsedPractice.articleBody);
  const hasValidPractice = parsedPractice.errors.length === 0;
  const hasValidLanguage = parsedLanguage.errors.length === 0;
  const hasValidDocument =
    hasValidPractice &&
    hasValidLanguage &&
    !(parsedPractice.practice && parsedLanguage.source !== undefined);
  return {
    id: entity.id,
    type: entity.type,
    title: entity.title,
    summary: entity.summary ?? '',
    status: entity.status,
    aliases: (entity.aliases ?? []).join('\n'),
    tags: (entity.tags ?? []).join('\n'),
    attribution: entity.attribution ?? '',
    verses: ('verses' in entity ? (entity.verses ?? []) : []).join('\n'),
    implements: (entity.type === 'practice' ? (entity.implements ?? []) : []).join('\n'),
    durationMinutes:
      entity.type === 'practice' && entity.duration_minutes ? String(entity.duration_minutes) : '',
    items: entity.type === 'collection' ? [...entity.items] : [],
    body: hasValidDocument ? parsedLanguage.articleBody : entity.body,
    practice: undefined,
    languagePracticeSource: hasValidDocument
      ? (parsedLanguage.source ??
        (parsedPractice.practice ? legacyPracticeSource(parsedPractice.practice) : undefined))
      : undefined,
  };
};

export const editorSignature = (values: EditorValues): string => JSON.stringify(values);

export const validateEditorValues = (values: EditorValues): EditorValidation => {
  if (values.practice && values.languagePracticeSource !== undefined)
    return { success: false, errors: ['Choose one practice format, not both.'] };
  if (
    (values.practice || values.languagePracticeSource !== undefined) &&
    values.type !== 'pattern' &&
    values.type !== 'practice'
  ) {
    return {
      success: false,
      errors: ['practice: Only Pattern or Practice entities may contain an embedded Practice.'],
    };
  }
  let body = values.body;
  if (values.languagePracticeSource !== undefined) {
    body = upsertLanguagePracticeFence(body, values.languagePracticeSource);
    const validation = parseLanguagePracticeFromBody(body);
    if (validation.errors.length) return { success: false, errors: validation.errors };
  }
  if (values.practice) {
    const parsedPractice = practiceDefinitionSchema.safeParse(values.practice);
    if (!parsedPractice.success) {
      return {
        success: false,
        errors: parsedPractice.error.issues.map((issue) => {
          const field = issue.path.length > 0 ? `practice.${issue.path.join('.')}: ` : 'practice: ';
          return `${field}${issue.message}`;
        }),
      };
    }
    body = upsertLanguagePracticeFence(
      upsertPracticeFence(values.body, undefined),
      legacyPracticeSource(parsedPractice.data),
    );
  }

  const legacyBody = parsePracticeFromBody(body);
  const languageBody = parseLanguagePracticeFromBody(body);
  const fenceErrors = [...legacyBody.errors, ...languageBody.errors];
  if (legacyBody.practice && languageBody.source !== undefined)
    fenceErrors.push('Choose one practice format, not both.');
  if (fenceErrors.length) return { success: false, errors: fenceErrors };

  const common = {
    id: values.id.trim(),
    type: values.type,
    title: values.title.trim(),
    summary: optionalText(values.summary),
    status: values.status,
    aliases:
      parseEditorList(values.aliases).length > 0 ? parseEditorList(values.aliases) : undefined,
    tags: parseEditorList(values.tags).length > 0 ? parseEditorList(values.tags) : undefined,
    attribution: optionalText(values.attribution),
    sourceId: 'personal',
    body,
  };

  let candidate: unknown;
  switch (values.type) {
    case 'practice': {
      const verses = parseEditorList(values.verses);
      const implementsPatterns = parseEditorList(values.implements);
      candidate = {
        ...common,
        verses: verses.length > 0 ? verses : undefined,
        implements: implementsPatterns.length > 0 ? implementsPatterns : undefined,
        duration_minutes: values.durationMinutes.trim()
          ? Number(values.durationMinutes)
          : undefined,
      };
      break;
    }
    case 'collection': {
      const verses = parseEditorList(values.verses);
      candidate = {
        ...common,
        verses: verses.length > 0 ? verses : undefined,
        items: values.items.map((item) => item.trim()).filter(Boolean),
      };
      break;
    }
    case 'pattern':
    case 'concept': {
      const verses = parseEditorList(values.verses);
      candidate = { ...common, verses: verses.length > 0 ? verses : undefined };
      break;
    }
    case 'verse':
      candidate = common;
      break;
  }

  const parsed = rawEntitySchema.safeParse(candidate);
  if (parsed.success) return { success: true, entity: parsed.data, errors: [] };
  return {
    success: false,
    errors: parsed.error.issues.map((issue) => {
      const field = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${field}${issue.message}`;
    }),
  };
};

export const slugFromTitle = (title: string): string =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
