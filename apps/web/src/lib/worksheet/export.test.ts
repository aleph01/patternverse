// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { exportWorksheet, inspectWorksheet, worksheetPlainText, worksheetFilename } from './export';
import { executePatternRequest } from '$lib/pattern-runtime/wasm';
vi.mock('$lib/pattern-runtime/wasm', () => ({ executePatternRequest: vi.fn() }));

describe('blank worksheet adapters', () => {
  it('shares exact-definition eligibility requests without passing answers or run state', async () => {
    vi.mocked(executePatternRequest).mockResolvedValue({
      available: false,
      reason: 'AI-dependent steps',
    });
    const definition = { source: 'eligibility-source-one' };
    const first = inspectWorksheet(definition);
    expect(inspectWorksheet(definition)).toBe(first);
    expect(await first).toEqual({ available: false, reason: 'AI-dependent steps' });
    expect(executePatternRequest).toHaveBeenLastCalledWith('source', {
      operation: 'worksheet_availability',
      source: definition.source,
    });
    await inspectWorksheet({ techniqueId: 'eligibility-catalog-one' });
    expect(executePatternRequest).toHaveBeenLastCalledWith('source', {
      operation: 'worksheet_availability',
      technique_id: 'eligibility-catalog-one',
    });
  });
  it('retries failed eligibility checks instead of caching a transient failure', async () => {
    const definition = { source: 'eligibility-failed-source' };
    vi.mocked(executePatternRequest).mockRejectedValueOnce(new Error('load failed'));
    await expect(inspectWorksheet(definition)).rejects.toThrow('load failed');
    vi.mocked(executePatternRequest).mockResolvedValueOnce({ available: true });
    await expect(inspectWorksheet(definition)).resolves.toEqual({ available: true });
  });
  it('sends only the definition, without run state or answers', async () => {
    const worksheet = { title: 'Test', markdown: '# Test', fidelity: 'complete', notices: [] };
    vi.mocked(executePatternRequest).mockResolvedValue(worksheet);
    expect(await exportWorksheet({ source: '!ask answer { Question? }' })).toEqual(worksheet);
    expect(executePatternRequest).toHaveBeenLastCalledWith('source', {
      operation: 'worksheet',
      source: '!ask answer { Question? }',
    });
    await exportWorksheet({ techniqueId: 'cbt.thought-record' });
    expect(executePatternRequest).toHaveBeenLastCalledWith('source', {
      operation: 'worksheet',
      technique_id: 'cbt.thought-record',
    });
  });
  it('removes formatting without losing prompts, checklists, scales and notices', () => {
    const result = worksheetPlainText(
      '# Title\n\n> Partial worksheet.\n\n**Question?**\n\n- [ ] One\n- [x] Two\n\n1. First\n2. Next\n\n**Rating:** [0–10.]\n\n`earlier.answer`\n\n[Reference](https://patternverse.org)',
    );
    expect(result).toContain('Title\n\nPartial worksheet.');
    expect(result).toContain('☐ One\n☑ Two');
    expect(result).toContain('1. First\n2. Next');
    expect(result).toContain('Rating: [0–10.]');
    expect(result).toContain('earlier.answer');
    expect(result).toContain('Reference (https://patternverse.org)');
    expect(result).not.toMatch(/\*\*|^#|`|^- \[/m);
  });
  it('keeps table data and excludes HTML', () => {
    const result = worksheetPlainText(
      '| Option | Score |\n| --- | --- |\n| A | 2 |\n\n<script>alert(1)</script>',
    );
    expect(result).toContain('Option — Score\nA — 2');
    expect(result).not.toContain('script');
  });
  it('creates safe text and Markdown filenames', () => {
    expect(worksheetFilename('Thought Record / Cognitive Restructuring', 'txt')).toBe(
      'thought-record-cognitive-restructuring-worksheet.txt',
    );
    expect(worksheetFilename('../', 'md')).toBe('pattern-worksheet.md');
  });
});
