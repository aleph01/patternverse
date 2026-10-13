import type { Entity, RawEntity } from '@patternverse/schema';
import { stringify as stringifyYaml } from 'yaml';

const withoutUndefined = <T extends Record<string, unknown>>(value: T): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined));

export const entityMetadata = (entity: RawEntity): Entity => {
  const common = {
    id: entity.id,
    type: entity.type,
    title: entity.title,
    summary: entity.summary,
    status: entity.status,
    aliases: entity.aliases,
    tags: entity.tags,
    ...('verses' in entity ? { verses: entity.verses } : {}),
    attribution: entity.attribution,
    copied_from: entity.copied_from,
  };

  switch (entity.type) {
    case 'practice':
      return withoutUndefined({
        ...common,
        implements: entity.implements,
        duration_minutes: entity.duration_minutes,
      }) as Entity;
    case 'collection':
      return withoutUndefined({ ...common, items: entity.items }) as Entity;
    case 'pattern':
    case 'concept':
    case 'verse':
      return withoutUndefined(common) as Entity;
  }
};

export const serializeEntity = (entity: RawEntity): string => {
  const frontmatter = stringifyYaml(entityMetadata(entity), { lineWidth: 0 }).trimEnd();
  const body = entity.body.trimEnd();
  return `---\n${frontmatter}\n---${body ? `\n\n${body}` : ''}\n`;
};
