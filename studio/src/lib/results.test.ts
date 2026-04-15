import { describe, expect, it } from 'vitest';
import { buildResultPresentation } from './results';

describe('buildResultPresentation', () => {
  it('extracts tabular rows and only charts compact single-series collections', () => {
    const presentation = buildResultPresentation({
      items: [
        { topic: 'Topic A', heat: 91 },
        { topic: 'Topic B', heat: 72 },
      ],
    });

    expect(presentation.summary).toEqual({
      kind: 'collection',
      count: 2,
    });
    expect(presentation.rows).toHaveLength(2);
    expect(presentation.chart).toMatchObject({
      kind: 'bar',
      labelKey: 'topic',
      numericKeys: ['heat'],
    });
  });

  it('ignores identifier columns when picking chart labels and metrics', () => {
    const presentation = buildResultPresentation({
      items: [
        { id: 101, title: 'Topic A', heat: 91 },
        { id: 102, title: 'Topic B', heat: 72 },
      ],
    });

    expect(presentation.chart).toMatchObject({
      kind: 'bar',
      labelKey: 'title',
      numericKeys: ['heat'],
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

  it('suppresses charts for url-heavy ranking style results', () => {
    const presentation = buildResultPresentation({
      items: [
        { rank: 1, title: 'Video A', score: 91, url: 'https://www.bilibili.com/video/BV1' },
        { rank: 2, title: 'Video B', score: 72, url: 'https://www.bilibili.com/video/BV2' },
      ],
    });

    expect(presentation.rows).toHaveLength(2);
    expect(presentation.chart).toBeNull();
  });
});
