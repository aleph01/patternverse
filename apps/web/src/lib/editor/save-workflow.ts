import type { CreatePersonalEntityInput, LocalWorkspace, RawEntity } from '@patternverse/workspace';
import { assertVerseHome, type VerseCatalog } from '@patternverse/workspace';
import {
  editorSignature,
  editorValuesFromEntity,
  validateEditorValues,
  type EditorValues,
} from '$lib/editor';
import type { Inspection } from '$lib/pattern-editor/types';

export type EditorSaveWorkspace = Pick<
  LocalWorkspace,
  'listEntities' | 'createEntity' | 'updateEntity'
>;
export type AcceptedEditorSave = Readonly<{
  entity: RawEntity;
  values: EditorValues;
  signature: string;
  submittedSignature: string;
}>;

type Ports = Readonly<{
  workspace: () => EditorSaveWorkspace | undefined;
  values: () => EditorValues;
  editingId: () => string | undefined;
  commons: () => VerseCatalog;
  practicePending: () => boolean;
  commitPending: () => void;
  inspect: (source: string) => Promise<Inspection>;
  started: () => void;
  busyChanged: (busy: boolean) => void;
  catalogChanged: (entities: readonly RawEntity[]) => void;
  accepted: (saved: AcceptedEditorSave) => void;
  failed: (errors: readonly string[]) => void;
}>;

const messageOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : 'The entity could not be saved.';

/** Save coordination only: the compiler, editor model and workspace keep their existing rules. */
export function createEditorSaveWorkflow(ports: Ports) {
  let busy = false;
  let disposed = false;

  async function save(): Promise<void> {
    const workspace = ports.workspace();
    if (!workspace || busy || disposed || ports.practicePending()) return;
    busy = true;
    let persisted: RawEntity | undefined;
    try {
      // Commit keyword drafts while their controls are still enabled, then capture one document.
      ports.commitPending();
      if (disposed) return;
      const submittedSignature = editorSignature(ports.values());
      // EditorValues are JSON data; unlike structuredClone this also accepts Svelte draft proxies.
      const values = JSON.parse(submittedSignature) as EditorValues;
      const editingId = ports.editingId();
      const commons = ports.commons();
      ports.started();
      ports.busyChanged(true);

      if (values.languagePracticeSource !== undefined) {
        let inspection: Inspection;
        try {
          inspection = await ports.inspect(values.languagePracticeSource);
        } catch {
          if (!disposed)
            ports.failed([
              'The practice compiler is unavailable. Your unsaved source is still here.',
            ]);
          return;
        }
        if (disposed) return;
        if (!inspection.structure) {
          ports.failed(
            inspection.diagnostics.length
              ? inspection.diagnostics.map((item) => item.message)
              : ['The practice could not be validated. Your unsaved source is still here.'],
          );
          return;
        }
      }

      const validation = validateEditorValues(values);
      if (!validation.success) {
        ports.failed(validation.errors);
        return;
      }
      const personal = await workspace.listEntities();
      if (disposed) return;
      ports.catalogChanged(personal);
      assertVerseHome(validation.entity, personal, commons);

      const entity = validation.entity;
      if (editingId) {
        persisted = await workspace.updateEntity(editingId, () => entity);
      } else {
        const { sourceId, sourcePath, ...input } = entity;
        void sourceId;
        void sourcePath;
        persisted = await workspace.createEntity(input as CreatePersonalEntityInput);
      }
      // A write that already started may finish after unmount; never publish it into a new editor.
      if (disposed) return;
      const normalized = editorValuesFromEntity(persisted);
      ports.accepted({
        entity: persisted,
        values: normalized,
        signature: editorSignature(normalized),
        submittedSignature,
      });

      // Accept the persisted identity before this read, so a refresh failure cannot cause a duplicate create.
      const refreshed = await workspace.listEntities();
      if (!disposed) ports.catalogChanged(refreshed);
    } catch (cause) {
      if (!disposed)
        ports.failed([
          persisted
            ? `Saved “${persisted.title}”, but the editor could not refresh: ${messageOf(cause)}`
            : messageOf(cause),
        ]);
    } finally {
      busy = false;
      if (!disposed) ports.busyChanged(false);
    }
  }

  return {
    save,
    dispose: () => {
      disposed = true;
    },
  };
}
