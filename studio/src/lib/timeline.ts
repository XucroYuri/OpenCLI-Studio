import { buildResultPresentation } from './results';

type MinimalSnapshot = {
  id: number;
  capturedAt: string;
  status: 'success' | 'error';
  result: unknown;
};

export interface SnapshotTimelineRow {
  snapshotId: number;
  capturedAt: string;
  status: 'success' | 'error';
  count: number;
  primaryLabel: string | null;
  primaryValue: number | null;
}

export function buildSnapshotTimelineRows(entries: MinimalSnapshot[]): SnapshotTimelineRow[] {
  return [...entries]
    .sort((left, right) => Date.parse(left.capturedAt) - Date.parse(right.capturedAt))
    .map((entry) => {
      const presentation = buildResultPresentation(entry.result);
      const chart = presentation.chart;
      const firstRow = chart?.rows[0] ?? null;
      const labelKey = chart?.labelKey ?? null;
      const numericKey = chart?.numericKeys[0] ?? null;

      return {
        snapshotId: entry.id,
        capturedAt: entry.capturedAt,
        status: entry.status,
        count: presentation.summary.count,
        primaryLabel: labelKey && firstRow ? String(firstRow[labelKey] ?? '') : null,
        primaryValue: numericKey && firstRow && typeof firstRow[numericKey] === 'number'
          ? Number(firstRow[numericKey])
          : null,
      };
    });
}
