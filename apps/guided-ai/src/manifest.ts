export type PublicPractice = Readonly<{
  transport: 'source' | 'catalog';
  root: string;
  sources: Readonly<Record<string, string>>;
  data?: Readonly<Record<string, unknown>>;
}>;
export type PracticeManifest = Readonly<Record<string, PublicPractice>>;
