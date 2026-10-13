export type PublicPractice = Readonly<{
  transport: 'source' | 'catalog';
  root: string;
  sources: Readonly<Record<string, string>>;
}>;
export type PracticeManifest = Readonly<Record<string, PublicPractice>>;
