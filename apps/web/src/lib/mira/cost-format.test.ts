import { describe, expect, it } from 'vitest';
import { formatUsd, isCurrentUtcMonth } from './cost-format';

describe('shared Mira usage presentation', () => {
  it('shows small model charges without rounding them to zero', () => {
    expect(formatUsd(0.0012)).toBe('$0.0012');
    expect(formatUsd(12.5)).toBe('$12.50');
  });
  it('uses UTC month boundaries and excludes missing, invalid or previous-month reports', () => {
    const now = new Date('2026-11-01T00:00:00Z');
    expect(isCurrentUtcMonth('2026-10-31T23:59:59Z', now)).toBe(false);
    expect(isCurrentUtcMonth('2026-11-01T01:00:00+01:00', now)).toBe(true);
    expect(isCurrentUtcMonth('2025-11-01T00:00:00Z', now)).toBe(false);
    expect(isCurrentUtcMonth(null, now)).toBe(false);
    expect(isCurrentUtcMonth('invalid', now)).toBe(false);
  });
});
