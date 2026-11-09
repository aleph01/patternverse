import type { WidgetPackage } from '@patternverse/workspace';
import library from '../../../../../content/assets/libraries/needs.json';
import html from './templates/needs.html?raw';
import css from './templates/needs.css?raw';
import js from './templates/needs.js.txt?raw';
import starters from './needs-starters.json';
export const needsStarters: Record<string, string[]> = starters;
export function widgetTemplate(
  kind: 'needs' | 'blank' | 'choices',
  identity: string,
  name = 'Needs selector',
  slug = 'needs-selector',
): WidgetPackage {
  const manifest: WidgetPackage['manifest'] = {
    schemaVersion: 1,
    publisher: 'personal',
    name: slug,
    version: '0.1.0',
    hostApi: 1,
    permissions: [],
    exports: { needs: { kind: 'widget', path: 'widget.json' } },
  };
  let files: Record<string, string>;
  if (kind === 'blank') {
    manifest.exports = { reflection: { kind: 'widget', path: 'widget.json' } };
    files = {
      'widget.html':
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="widget.css"></head><body><label>Reflection<textarea id="note"></textarea></label><label>Energy<input id="energy" type="range" min="0" max="10" value="5"></label><script type="module" src="widget.js"></script></body></html>',
      'widget.css':
        'body{font:16px/1.5 system-ui;margin:12px;color:CanvasText;background:Canvas}label{display:grid;gap:8px;margin-bottom:18px}textarea{font:inherit;padding:10px;min-height:100px}',
      'widget.js':
        'const api=await widget.ready();const note=document.getElementById("note"),energy=document.getElementById("energy");note.value=api.draft?.note||"";energy.value=api.draft?.energy??api.inputs.energy;const update=()=>widget.setDraft({note:note.value,energy:Number(energy.value)});note.addEventListener("input",update);energy.addEventListener("input",update);void update();',
      'widget.json': JSON.stringify(
        {
          schemaVersion: 1,
          name,
          entry: 'widget.html',
          inputs: { energy: { type: 'number', default: 5, minimum: 0, maximum: 10 } },
          outputs: { note: { type: 'text' }, energy: { type: 'number', minimum: 0, maximum: 10 } },
        },
        null,
        2,
      ),
    };
  } else {
    const rows = library.records,
      needs = rows.filter((r) => r.kind === 'need'),
      categories = rows.filter((r) => r.kind === 'category');
    const ids = new Set(rows.map((r) => r.id));
    for (const r of rows)
      for (const parent of r.parent_ids) if (!ids.has(parent)) throw Error('Unknown need parent.');
    for (const starters of Object.values(needsStarters))
      for (const id of starters)
        if (!needs.some((n) => n.id === id)) throw Error('Unknown starter need.');
    const catalogue =
      kind === 'choices'
        ? {
            choices: [
              { value: 'first', label: 'First option' },
              { value: 'second', label: 'Second option' },
              { value: 'third', label: 'Third option' },
            ],
          }
        : {
            choices: needs.map((r) => ({ value: r.id, label: r.label })),
            presentation: {
              groups: categories.map((r) => ({
                id: r.id,
                label: r.label,
                parent_ids: r.parent_ids,
              })),
              memberships: Object.fromEntries(needs.map((r) => [r.id, r.parent_ids])),
              items: Object.fromEntries(
                needs.map((r) => [
                  r.id,
                  {
                    description: r.description,
                    aliases: r.aliases,
                    recognition_cues: r.recognition_cues,
                  },
                ]),
              ),
              starterIdsByArea: needsStarters,
              attribution:
                '© 2005 Center for Nonviolent Communication. www.cnvc.org · cnvc@cnvc.org · +1.505-244-4041. Vocabulary adapted; descriptions and hierarchy by Patternverse.',
            },
          };
    manifest.exports.catalogue = { kind: 'data', path: 'catalogue.json', type: 'choices' };
    files = {
      'widget.html': html,
      'needs.css': css,
      'needs.js': js,
      'catalogue.json': JSON.stringify(catalogue, null, 2),
      'widget.json': JSON.stringify(
        {
          schemaVersion: 1,
          name,
          entry: 'widget.html',
          inputs: {
            options: { type: 'choices', defaultFrom: 'catalogue' },
            initial_view: { type: 'text', default: 'simple', enum: ['simple', 'detailed'] },
            max: { type: 'number', default: 1000, integer: true, minimum: 1, maximum: 1000 },
          },
          outputs: {
            needs: { type: 'list[choice]', from: 'options', minItems: 0, maxItemsFrom: 'max' },
          },
          fallback: { kind: 'multi-choice', input: 'options', output: 'needs' },
        },
        null,
        2,
      ),
    };
  }
  return { identity, manifest, files };
}
