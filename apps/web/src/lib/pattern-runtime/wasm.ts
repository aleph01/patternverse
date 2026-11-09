import init, { dispatch, editor } from '$lib/mira/engine/pattern_wasm.js';

// The generated binary remains at its existing build-script location. It contains
// the shared Rust core; its directory name does not imply a Mira dependency.
let initialization: Promise<unknown> | undefined;

/** One initialization path for catalog runs, authored practices and editor inspection. */
export async function executePatternRequest(
  transport: 'source' | 'catalog',
  request: Record<string, unknown>,
): Promise<unknown> {
  initialization ??= init();
  await initialization;
  if (
    transport === 'source' &&
    typeof request.source === 'string' &&
    ['inspect', 'start', 'worksheet', 'worksheet_availability'].includes(
      String(request.operation),
    ) &&
    !Object.hasOwn(request, 'data')
  ) {
    let imports: string[] = [];
    try {
      imports = JSON.parse(
        editor(JSON.stringify({ operation: 'data_imports', source: request.source })),
      ) as string[];
    } catch {
      /* Invalid draft syntax is diagnosed by the normal inspection. */
    }
    if (imports.length) {
      const { resolveDataLibraries } = await import('./data-libraries');
      request = { ...request, data: await resolveDataLibraries(imports) };
    }
  }
  let remember:
    | ((packages: Record<string, import('@patternverse/workspace').WidgetPackage>) => Promise<void>)
    | undefined;
  if (
    transport === 'source' &&
    typeof request.source === 'string' &&
    ['inspect', 'start'].includes(String(request.operation)) &&
    !Object.hasOwn(request, 'widgets')
  ) {
    let imports: string[] = [];
    try {
      imports = JSON.parse(
        editor(JSON.stringify({ operation: 'widget_imports', source: request.source })),
      );
    } catch {
      /* Normal inspection diagnoses incomplete source. */
    }
    if (imports.length) {
      const { widgetEnvironment } = await import('$lib/widgets/library');
      const environment = await widgetEnvironment(request.source);
      request = { ...request, widgets: environment.packages };
      remember = environment.remember;
    }
  }
  const invoke = transport === 'source' ? editor : dispatch;
  const result = JSON.parse(invoke(JSON.stringify(request)));
  if (remember) {
    const packages = result.widgets ?? result.saved?.manager?.snapshot?.widgets;
    if (packages) await remember(packages);
  }
  return result as unknown;
}
