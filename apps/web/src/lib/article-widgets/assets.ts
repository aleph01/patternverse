// Raw imports keep authored HTML in inert, content-addressed JS modules. It is never
// served as a same-origin executable HTML page, even when opened directly.
const sources = import.meta.glob<string>('../../../../../content/assets/widgets/*.html', {
  query: '?raw',
  import: 'default',
});

export async function loadWidgetSource(filename: string): Promise<string> {
  const load = sources[`../../../../../content/assets/widgets/${filename}`];
  if (!load) throw new Error('This widget file is unavailable.');
  const source = await load();
  if (source.length > 512_000) throw new Error('Widget files must be smaller than 512 KB.');
  return source;
}
