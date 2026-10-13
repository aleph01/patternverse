export interface Scope {
  kind: string;
  names: Map<string, unknown>;
  subject?: string | undefined;
  pending?: string | undefined;
}

/** Prose bodies suppress ordinary suggestions, except inside interpolations/directives. */
export function isProseScope(kind: string) {
  return [
    'ask',
    'show',
    'video',
    'image',
    'turn',
    'agent',
    'realize',
    'choose',
    'rank',
    'rate',
    'timer',
    'semantic',
  ].includes(kind);
}

const identifier = '[A-Za-z_][A-Za-z0-9_-]*';

/** Cosmetic lexical context only. Suggestions never validate, execute or rewrite a Pattern. */
export function contextAt(source: string, position: number) {
  const scopes: Scope[] = [{ kind: 'root', names: new Map() }];
  const enums = new Map<string, string[]>(),
    classifiers = new Map<string, string>();
  const imports: string[] = [],
    helpers: string[] = [],
    flows: string[] = [];
  const beforeLine = source.slice(0, source.lastIndexOf('\n', position - 1) + 1);
  for (const raw of beforeLine.split('\n')) {
    const line = raw.trim();
    const scope = scopes.at(-1)!;
    if (line === '}') {
      if (scopes.length > 1) scopes.pop();
      continue;
    }
    if (!line || line.startsWith('#')) continue;
    if (isProseScope(scope.kind)) {
      // Old implicit Markdown blocks end only at a real directive boundary.
      if (!scope.subject || !/^(?:[!?]|->|=\s)/.test(line)) continue;
      scopes.pop();
    }
    const current = scopes.at(-1)!;
    const type = line.match(/^type\s+(\w+)\s*=\s*(.*)$/);
    if (type) {
      enums.set(
        type[1]!,
        type[2]!
          .split('|')
          .map((v) => v.trim())
          .filter(Boolean),
      );
      continue;
    }
    if (line.startsWith('|') && !line.startsWith('|>')) {
      const last = [...enums.values()].at(-1);
      last?.push(
        ...line
          .split('|')
          .map((v) => v.trim())
          .filter(Boolean),
      );
      continue;
    }
    const classifier = line.match(/^classifier\s+([\w-]+)\s*->\s*(\w+)/);
    if (classifier) classifiers.set(classifier[1]!, classifier[2]!);
    const helper = line.match(/^fn\s+([\w-]+)\(/);
    if (helper) helpers.push(helper[1]!);
    const flow = line.match(/^flow\s+([\w-]+)\s*\{/);
    if (flow) flows.push(flow[1]!);
    const imported = line.match(/^:import\s+"[^"\n]+"\s+as\s+([\w.-]+)/);
    if (imported) imports.push(imported[1]!);
    const input = line.match(/^:input\s+([\w-]+)\s+(\w+)/);
    if (input) current.names.set(input[1]!, input[2]);
    const binding = line.match(
      new RegExp(
        `^(?:(${identifier})\\s*=(?!=)|=\\s+(${identifier})\\s|!(?:ask|form|timer|rate|choose|rank|agent|turn|collect)\\s+(${identifier})(?=\\s|$))`,
      ),
    );
    const name = binding?.[1] ?? binding?.[2] ?? binding?.[3];
    if (name) {
      const classified = line.match(/\?~\s*([\w-]+)/);
      const constant = line.match(/=\s*(\w+)\.\w+\s*$/);
      current.names.set(name, classified ? classifiers.get(classified[1]!) : constant?.[1]);
    }
    const kind =
      line.includes('|>') && /\b(select|filter|rank)\s*~/.test(line)
        ? 'semantic'
        : /(?:^|=\s*)~/.test(line)
          ? 'realize'
          : line.includes('?~')
            ? 'classify'
            : (line.match(/[!?]([\w-]+)/)?.[1] ??
              (flow
                ? 'flow'
                : line.startsWith('events ')
                  ? 'events'
                  : line.includes('each ')
                    ? 'each'
                    : classifier
                      ? 'classifier'
                      : 'expression'));
    const isBody = isProseScope(kind);
    if (line.endsWith('{') || isBody) {
      const nested: Scope = {
        kind,
        names: new Map(),
        pending: name,
        ...(!line.endsWith('{') ? { subject: 'implicit' } : {}),
      };
      if (kind === 'match') nested.subject = line.match(/\?match\s+([^ {]+)/)?.[1];
      const alias =
        line.match(/each\s+([\w-]+)\s+in\s/) ?? line.match(/\?loop(?:\[[^\]]*\])?\s+([\w-]+)\s*=/);
      if (alias) nested.names.set(alias[1]!, undefined);
      scopes.push(nested);
    }
    const alias = line.match(/^:as\s+([\w-]+)/);
    if (alias) current.names.set(alias[1]!, undefined);
  }
  const localStart = scopes.findIndex((scope) => scope.kind === 'flow');
  const visibleScopes = localStart < 0 ? scopes : scopes.slice(localStart);
  return {
    scopes,
    names: new Map(
      visibleScopes
        .filter((s) => s.kind !== 'form')
        .flatMap((s) => [...s.names])
        .filter(([name]) => !scopes.some((scope) => scope.pending === name)),
    ),
    enums,
    classifiers,
    helpers,
    imports,
    flows,
  };
}
