import type { RawEntity } from '@patternverse/workspace';

export interface StructureDraft {
  title: string;
  summary: string;
  destination: string;
  addingId: string;
}

export interface StructurePanelActions {
  close(): void;
  save(): Promise<void>;
  add(): Promise<void>;
  remove(entity: RawEntity): Promise<void>;
  delete(): Promise<void>;
}

export function emptyStructureDraft(): StructureDraft {
  return { title: '', summary: '', destination: '', addingId: '' };
}
