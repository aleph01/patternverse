import {
  createCorpusSnapshot,
  hashCorpusContent,
  type PlanCorpusSyncInput,
} from '@patternverse/sync-domain';

/** Bind a user's choice to every reviewed version, including the successful base.
 * No private content is exposed in the token; only revisions and content hashes.
 */
export async function syncConflictReviewToken(input: PlanCorpusSyncInput): Promise<string> {
  const versions = [input.base, input.local, input.remote].map((snapshot) => [
    snapshot.revision,
    createCorpusSnapshot(snapshot).files.map(({ path, contentHash }) => [path, contentHash]),
  ]);
  return hashCorpusContent(new TextEncoder().encode(JSON.stringify(versions)));
}
