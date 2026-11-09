import redirects from './graphic-design-redirects.json';

type Destination = Readonly<{ type: 'pattern' | 'concept'; id: string; fragment?: string }>;
type EntityIdentity = Readonly<{ type: string; id: string }>;
const destinations: Readonly<Record<string, Destination>> = redirects as Record<
  string,
  Destination
>;

/** Only expose legacy draft routes when their consolidated destination is in this corpus. */
export function graphicDesignLegacyEntries(entities: readonly EntityIdentity[]) {
  return Object.entries(destinations).flatMap(([id, destination]) =>
    entities.some((entity) => entity.type === destination.type && entity.id === destination.id)
      ? [{ type: 'pattern', id }]
      : [],
  );
}

export function graphicDesignLegacyLocation(
  type: string,
  id: string,
  entities: readonly EntityIdentity[],
  base: string,
  search: string,
): string | null {
  if (type !== 'pattern' || !Object.hasOwn(destinations, id)) return null;
  const destination = destinations[id];
  if (!entities.some((entity) => entity.type === destination.type && entity.id === destination.id))
    return null;
  return `${base}/${destination.type}/${destination.id}${search}${destination.fragment ? `#${destination.fragment}` : ''}`;
}
