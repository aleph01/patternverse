import type { Structure } from '../types';

export interface Completion {
  label: string;
  insert: string;
  detail: string;
}
export interface CompletionSet {
  from: number;
  to: number;
  items: Completion[];
}
export interface CheckedSource {
  source: string;
  structure: Structure;
}

export const item = (label: string, insert: string, detail: string): Completion => ({
  label,
  insert,
  detail,
});
