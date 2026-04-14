import type { ResultChartModel } from './results';

interface ChartDimensions {
  width: number;
  height: number;
}

interface ChartLabel {
  text: string;
  x: number;
  y: number;
}

interface ChartPoint {
  x: number;
  y: number;
  value: number;
}

interface ChartBar {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
}

interface ChartSeries {
  key: string;
  color: string;
  points: ChartPoint[];
  bars: ChartBar[];
  polyline: string;
}

export interface SvgChartLayout {
  width: number;
  height: number;
  maxValue: number;
  labels: ChartLabel[];
  ticks: Array<{ value: number; y: number }>;
  series: ChartSeries[];
}

const COLORS = ['#3b82f6', '#06b6d4', '#818cf8'];

function clampNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function buildSvgChartLayout(model: ResultChartModel, dimensions: ChartDimensions): SvgChartLayout {
  const width = dimensions.width;
  const height = dimensions.height;
  const margin = { top: 36, right: 18, bottom: 56, left: 48 };
  const plotWidth = Math.max(1, width - margin.left - margin.right);
  const plotHeight = Math.max(1, height - margin.top - margin.bottom);
  const maxValue = Math.max(
    1,
    ...model.rows.flatMap((row) => model.numericKeys.map((key) => clampNumber(row[key]))),
  );

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const ratio = index / tickCount;
    const value = Math.round((maxValue * (tickCount - index)) * 100) / 100 / tickCount * tickCount;
    return {
      value: Math.round(maxValue * (1 - ratio)),
      y: margin.top + (plotHeight * ratio),
    };
  });

  const stepX = model.rows.length > 1 ? plotWidth / (model.rows.length - 1) : plotWidth;
  const groupWidth = model.rows.length > 0 ? plotWidth / model.rows.length : plotWidth;
  const barSlotWidth = Math.max(12, groupWidth * 0.68);
  const barWidth = Math.max(8, barSlotWidth / Math.max(model.numericKeys.length, 1) - 6);

  const labels = model.rows.map((row, index) => ({
    text: String(row[model.labelKey] ?? ''),
    x: margin.left + (model.kind === 'line' ? stepX * index : groupWidth * index + groupWidth / 2),
    y: height - 22,
  }));

  const series = model.numericKeys.map((key, seriesIndex) => {
    const color = COLORS[seriesIndex % COLORS.length];
    const points = model.rows.map((row, rowIndex) => {
      const value = clampNumber(row[key]);
      const x = margin.left + (model.kind === 'line' ? stepX * rowIndex : groupWidth * rowIndex + groupWidth / 2);
      const y = margin.top + plotHeight - ((value / maxValue) * plotHeight);
      return { x, y, value };
    });

    const bars = model.kind === 'bar'
      ? model.rows.map((row, rowIndex) => {
          const value = clampNumber(row[key]);
          const barHeight = (value / maxValue) * plotHeight;
          const slotStart = margin.left + groupWidth * rowIndex + (groupWidth - barSlotWidth) / 2;
          const x = slotStart + (seriesIndex * (barWidth + 6));
          const y = margin.top + plotHeight - barHeight;
          return {
            x,
            y,
            width: barWidth,
            height: barHeight,
            value,
          };
        })
      : [];

    return {
      key,
      color,
      points,
      bars,
      polyline: points.map((point) => `${point.x},${point.y}`).join(' '),
    };
  });

  return {
    width,
    height,
    maxValue,
    labels,
    ticks,
    series,
  };
}
