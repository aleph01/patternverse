import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const contentAssetsRoot = resolve(process.cwd(), '../../content/assets');
const imageTypes: Readonly<Record<string, string>> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  txt: 'text/plain; charset=utf-8',
};

export const assetMimeType = (path: string): string | undefined =>
  /^[a-z0-9][a-z0-9/-]*\.(webp|jpe?g|png|svg|txt)$/.test(path) && !path.split('/').includes('..')
    ? imageTypes[path.split('.').at(-1)!]
    : undefined;

export const contentAssetPaths = async (directory = ''): Promise<string[]> => {
  const entries = await readdir(join(contentAssetsRoot, directory), { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return contentAssetPaths(path);
      return entry.isFile() && assetMimeType(path) ? [path] : [];
    }),
  );
  return paths.flat().sort();
};

type AssetDimensions = Readonly<Record<string, { width: number; height: number }>>;

export const contentAssetDimensions = async (): Promise<AssetDimensions> =>
  JSON.parse(await readFile(join(contentAssetsRoot, 'manifest.json'), 'utf8')) as AssetDimensions;
