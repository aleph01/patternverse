import { inspectWorksheet, worksheetDefinitionKey, type WorksheetDefinition } from './export';

/** Reactive, fail-closed adapter shared by article actions and the authoring button. */
export function worksheetEligibility(definition: () => WorksheetDefinition | undefined) {
  let available = $state(false);
  let reason = $state('');
  let key = $state('');
  $effect(() => {
    const current = definition();
    available = false;
    reason = '';
    if (!current) return;
    let active = true;
    void inspectWorksheet(current)
      .then((result) => {
        if (!active) return;
        key = worksheetDefinitionKey(current);
        available = result.available === true;
        reason = result.reason ?? '';
      })
      .catch(() => {
        if (active) reason = 'A workbook is unavailable for this definition.';
      });
    return () => {
      active = false;
    };
  });
  return {
    get available() {
      const current = definition();
      return Boolean(current && available && key === worksheetDefinitionKey(current));
    },
    get reason() {
      return reason;
    },
  };
}
