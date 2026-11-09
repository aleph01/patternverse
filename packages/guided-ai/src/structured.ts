/** JSON adaptation only. Rust remains authoritative for all contracts and transitions. */
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const fail = (): never => {
  throw new Error('The model returned data outside the pattern contract. Try this step again.');
};
const keys = (value: Record<string, unknown>, expected: string[]) =>
  Object.keys(value).length === expected.length &&
  expected.every((key) => Object.hasOwn(value, key));

export function modelSchema(type: unknown, depth = 0): Record<string, unknown> {
  if (depth > 16) return fail();
  if (type === 'text') return { type: 'string' };
  if (type === 'number') return { type: 'number' };
  if (type === 'boolean') return { type: 'boolean' };
  if (type === 'choice')
    return {
      type: 'object',
      properties: { value: { type: 'string' }, label: { type: 'string' } },
      required: ['value', 'label'],
      additionalProperties: false,
    };
  if (type === 'choices')
    return { type: 'array', items: modelSchema('choice', depth + 1), minItems: 1 };
  if (!object(type) || Object.keys(type).length !== 1) return fail();
  if (object(type.reference) && Array.isArray(type.reference.ids))
    return { type: 'string', enum: type.reference.ids };
  if (object(type.enum) && Array.isArray(type.enum.variants))
    return { type: 'string', enum: type.enum.variants };
  if (Object.hasOwn(type, 'list'))
    return { type: 'array', items: modelSchema(type.list, depth + 1) };
  if (Object.hasOwn(type, 'optional'))
    return { anyOf: [modelSchema(type.optional, depth + 1), { type: 'null' }] };
  if (object(type.record))
    return {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(type.record).map(([key, ty]) => [key, modelSchema(ty, depth + 1)]),
      ),
      required: Object.keys(type.record),
      additionalProperties: false,
    };
  return fail();
}

export function modelValue(json: unknown, type: unknown, depth = 0): Record<string, unknown> {
  if (depth > 16) return fail();
  if (type === 'text' && typeof json === 'string') return { type: 'text', value: json };
  if (type === 'number' && typeof json === 'number' && Number.isFinite(json))
    return { type: 'number', value: json };
  if (type === 'boolean' && typeof json === 'boolean') return { type: 'boolean', value: json };
  if (
    type === 'choice' &&
    object(json) &&
    keys(json, ['value', 'label']) &&
    typeof json.value === 'string' &&
    json.value.trim() &&
    typeof json.label === 'string' &&
    json.label.trim()
  )
    return { type: 'choice', value: json };
  if (type === 'choices' && Array.isArray(json) && json.length > 0) {
    const values = json.map((value) => modelValue(value, 'choice', depth + 1).value);
    if (new Set(values.map((v) => (v as { value: string }).value)).size !== values.length)
      return fail();
    return { type: 'choices', value: values };
  }
  if (!object(type) || Object.keys(type).length !== 1) return fail();
  if (
    object(type.reference) &&
    Array.isArray(type.reference.ids) &&
    typeof json === 'string' &&
    type.reference.ids.includes(json)
  )
    return { type: 'reference', value: { schema: type.reference, id: json } };
  if (
    object(type.enum) &&
    Array.isArray(type.enum.variants) &&
    typeof json === 'string' &&
    type.enum.variants.includes(json)
  )
    return { type: 'enum', value: { schema: type.enum, variant: json } };
  if (Object.hasOwn(type, 'list') && Array.isArray(json) && json.length <= 10000)
    return {
      type: 'list',
      value: {
        element_type: type.list,
        items: json.map((value) => modelValue(value, type.list, depth + 1)),
      },
    };
  if (Object.hasOwn(type, 'optional'))
    return {
      type: 'optional',
      value: {
        element_type: type.optional,
        value: json === null ? null : modelValue(json, type.optional, depth + 1),
      },
    };
  if (object(type.record) && object(json) && keys(json, Object.keys(type.record)))
    return {
      type: 'record',
      value: Object.fromEntries(
        Object.entries(type.record).map(([key, ty]) => [key, modelValue(json[key], ty, depth + 1)]),
      ),
    };
  return fail();
}

/** Strip transport tags, keeping only the explicitly authored context visible to the model. */
export function plainContext(value: unknown, depth = 0): unknown {
  if (depth > 20) return fail();
  if (!object(value) || typeof value.type !== 'string') return fail();
  const data = value.value;
  switch (value.type) {
    case 'text':
    case 'number':
    case 'boolean':
    case 'choice':
    case 'choices':
      return data;
    case 'enum':
      return object(data) ? data.variant : fail();
    case 'reference':
      return object(data) ? data.id : fail();
    case 'catalog':
      return object(data) && Array.isArray(data.records)
        ? data.records.map((v) => plainContext(v, depth + 1))
        : fail();
    case 'list':
      return object(data) && Array.isArray(data.items)
        ? data.items.map((v) => plainContext(v, depth + 1))
        : fail();
    case 'optional':
      return object(data)
        ? data.value === null
          ? null
          : plainContext(data.value, depth + 1)
        : fail();
    case 'record':
      return object(data)
        ? Object.fromEntries(
            Object.entries(data).map(([key, v]) => [key, plainContext(v, depth + 1)]),
          )
        : fail();
    default:
      return fail();
  }
}
