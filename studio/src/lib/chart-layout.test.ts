import { describe, expect, it } from 'vitest';
import { buildSvgChartLayout } from './chart-layout';
import type { ResultChartModel } from './results';

describe('buildSvgChartLayout', () => {
  it('builds grouped bar geometry from categorical data', () => {
    const model: ResultChartModel = {
      kind: 'bar',
      labelKey: 'title',
      numericKeys: ['score'],
      rows: [
        { title: 'A', score: 10 },
        { title: 'B', score: 20 },
      ],
    };

    const layout = buildSvgChartLayout(model, { width: 720, height: 320 });

    expect(layout.maxValue).toBe(20);
    expect(layout.labels.map((label) => label.text)).toEqual(['A', 'B']);
    expect(layout.series).toHaveLength(1);
    expect(layout.series[0].bars).toHaveLength(2);
    expect(layout.series[0].bars[0].height).toBeLessThan(layout.series[0].bars[1].height);
    expect(layout.series[0].bars[0].x).toBeLessThan(layout.series[0].bars[1].x);
  });

  it('builds line geometry for time-like series with multiple numeric tracks', () => {
    const model: ResultChartModel = {
      kind: 'line',
      labelKey: 'date',
      numericKeys: ['score', 'volume'],
      rows: [
        { date: '2026-04-01', score: 10, volume: 30 },
        { date: '2026-04-02', score: 30, volume: 20 },
        { date: '2026-04-03', score: 50, volume: 40 },
      ],
    };

    const layout = buildSvgChartLayout(model, { width: 720, height: 320 });

    expect(layout.maxValue).toBe(50);
    expect(layout.series).toHaveLength(2);
    expect(layout.series[0].points).toHaveLength(3);
    expect(layout.series[0].polyline).toContain(',');
    expect(layout.series[0].points[0].x).toBeLessThan(layout.series[0].points[2].x);
    expect(layout.series[0].points[0].y).toBeGreaterThan(layout.series[0].points[2].y);
  });
});
