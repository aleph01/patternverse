export const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast' as const;
export const MAX_REQUEST_BYTES = 192 * 1024;
export const MAX_PROMPT_BYTES = 8192;
export const MAX_OUTPUT_TOKENS = 512;
export const SHARDS = 8;
export const REQUESTS_PER_SHARD = 16;
export const REQUESTS_PER_NETWORK = 12;
export const MINUTE_REQUESTS_PER_NETWORK = 2;
// Reserve before inference, including failed/cancelled requests. At current model
// prices, 8192 UTF-8 input bytes + 1024 template tokens + 512 output tokens <60
// neurons. 128 requests reserve <7680 neurons; the rest is account-wide headroom.
// This estimate is not a billing guarantee: remain on Workers Free for a hard stop.
export const RESERVED_NEURONS_PER_REQUEST = 60;

export function nextUtcDay(now: number): number {
  return (Math.floor(now / 86_400_000) + 1) * 86_400_000;
}
