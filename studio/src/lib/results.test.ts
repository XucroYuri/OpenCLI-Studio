import { describe, expect, it } from 'vitest';
import { buildResultPresentation } from './results';

describe('buildResultPresentation', () => {
  it('extracts tabular rows and chartable numeric series from collection results', () => {
    const presentation = buildResultPresentation({
      items: [
        { title: 'Topic A', heat: 91, comments: 17 },
        { title: 'Topic B', heat: 72, comments: 9 },
      ],
    });

    expect(presentation.summary).toEqual({
      kind: 'collection',
      count: 2,
    });
    expect(presentation.rows).toHaveLength(2);
    expect(presentation.chart).toMatchObject({
      kind: 'bar',
      labelKey: 'title',
      numericKeys: ['heat', 'comments'],
    });
  });

  it('detects time-series style data and exposes key facts for plain objects', () => {
    const seriesPresentation = buildResultPresentation([
      { date: '2026-04-10', views: 10 },
      { date: '2026-04-11', views: 18 },
    ]);

    expect(seriesPresentation.chart).toMatchObject({
      kind: 'line',
      labelKey: 'date',
      numericKeys: ['views'],
    });

    const objectPresentation = buildResultPresentation({
      keyword: 'AI',
      total: 42,
      region: 'US',
    });

    expect(objectPresentation.keyFacts).toEqual([
      { label: 'keyword', value: 'AI' },
      { label: 'total', value: '42' },
      { label: 'region', value: 'US' },
    ]);
  });
});
