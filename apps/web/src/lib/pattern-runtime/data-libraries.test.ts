// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { resolveDataLibraries } from './data-libraries';

const resource = { record_type: { record: { id: 'text' } }, records: [{ id: 'one' }] };
function fixture(body = JSON.stringify(resource), path?: string) {
  const revision = createHash('sha256').update(JSON.stringify(resource)).digest('hex');
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          'commons:test': { revision, path: path ?? `/library/data/${revision}.json` },
        }),
      ),
    )
    .mockResolvedValueOnce(new Response(body));
  return fetcher;
}
describe('public reference resource resolution', () => {
  it('fetches current pointers and checks content before returning data', async () => {
    const fetcher = fixture();
    expect(await resolveDataLibraries(['commons:test', 'commons:test'], fetcher)).toEqual({
      'commons:test': resource,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1]).toEqual({ cache: 'no-store' });
    expect(fetcher.mock.calls[1][1]).toEqual({ cache: 'force-cache' });
  });
  it('rejects modified bytes and external or unexpected resource paths', async () => {
    await expect(resolveDataLibraries(['commons:test'], fixture('{}'))).rejects.toThrow(
      'content check',
    );
    const external = fixture(undefined, 'https://example.com/data.json');
    await expect(resolveDataLibraries(['commons:test'], external)).rejects.toThrow('unavailable');
    expect(external).toHaveBeenCalledTimes(1);
  });
  it('does not fetch without data imports and rejects missing resources', async () => {
    const fetcher = fixture();
    expect(await resolveDataLibraries([], fetcher)).toEqual({});
    expect(fetcher).not.toHaveBeenCalled();
    await expect(resolveDataLibraries(['commons:missing'], fetcher)).rejects.toThrow('unavailable');
  });
});
