import { describe, expect, it } from 'vitest';
import { buildResultComparison } from './compare';

describe('buildResultComparison', () => {
  it('compares collection results by label and numeric deltas', () => {
    const comparison = buildResultComparison(
      {
        items: [
          { title: 'AI', score: 90 },
          { title: 'OpenAI', score: 70 },
        ],
      },
      {
        items: [
          { title: 'AI', score: 95 },
          { title: 'OpenAI', score: 62 },
        ],
      },
    );

    expect(comparison).toEqual({
      items: [
        { label: 'AI', left: 90, right: 95, delta: 5 },
        { label: 'OpenAI', left: 70, right: 62, delta: -8 },
      ],
    });
  });

  it('falls back to scalar object field comparison', () => {
    const comparison = buildResultComparison(
      { keyword: 'AI', total: 42, region: 'US' },
      { keyword: 'AI', total: 58, region: 'US' },
    );

    expect(comparison).toEqual({
      items: [
        { field: 'keyword', left: 'AI', right: 'AI' },
        { field: 'region', left: 'US', right: 'US' },
        { field: 'total', left: '42', right: '58' },
      ],
    });
  });
});
