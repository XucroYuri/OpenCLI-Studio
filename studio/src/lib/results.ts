type ResultRecord = Record<string, unknown>;

export interface ResultSummary {
  kind: 'empty' | 'collection' | 'object' | 'scalar';
  count: number;
}

export interface ResultChartModel {
  kind: 'bar' | 'line';
  labelKey: string;
  numericKeys: string[];
  rows: ResultRecord[];
}

export interface ResultPresentation {
  summary: ResultSummary;
  rows: ResultRecord[];
  chart: ResultChartModel | null;
  keyFacts: Array<{ label: string; value: string }>;
  raw: unknown;
}

const COLLECTION_KEYS = ['items', 'data', 'list', 'results', 'rows'] as const;
const LABEL_HINT = /(title|name|label|keyword|topic|tag|date|time|day|month|week|hour|region|id)$/i;
const TIME_HINT = /(date|time|day|month|week|hour)$/i;

function isRecord(value: unknown): value is ResultRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function normalizeArray(input: unknown[]): ResultRecord[] {
  return input.map((item) => (isRecord(item) ? item : { value: item }));
}

function extractRows(result: unknown): ResultRecord[] {
  if (Array.isArray(result)) {
    return normalizeArray(result);
  }

  if (isRecord(result)) {
    for (const key of COLLECTION_KEYS) {
      const value = result[key];
      if (Array.isArray(value)) {
        return normalizeArray(value);
      }
    }
  }

  return [];
}

function pickLabelKey(rows: ResultRecord[]): string | null {
  const keys = Object.keys(rows[0] ?? {});
  return (
    keys.find((key) => LABEL_HINT.test(key))
    ?? keys.find((key) => typeof rows[0]?.[key] === 'string')
    ?? keys[0]
    ?? null
  );
}

function pickNumericKeys(rows: ResultRecord[], labelKey: string | null): string[] {
  const sample = rows.slice(0, 5);
  const numericKeys = Object.keys(rows[0] ?? {}).filter((key) => {
    if (key === labelKey) return false;
    return sample.some((row) => typeof row[key] === 'number');
  });

  return numericKeys.slice(0, 2);
}

function buildChart(rows: ResultRecord[]): ResultChartModel | null {
  if (rows.length === 0) return null;

  const labelKey = pickLabelKey(rows);
  if (!labelKey) return null;

  const numericKeys = pickNumericKeys(rows, labelKey);
  if (numericKeys.length === 0) return null;

  return {
    kind: TIME_HINT.test(labelKey) ? 'line' : 'bar',
    labelKey,
    numericKeys,
    rows,
  };
}

function buildKeyFacts(result: unknown): Array<{ label: string; value: string }> {
  if (!isRecord(result)) return [];

  return Object.entries(result)
    .filter(([, value]) => !Array.isArray(value) && !isRecord(value))
    .map(([label, value]) => ({ label, value: formatValue(value) }));
}

export function buildResultPresentation(result: unknown): ResultPresentation {
  const rows = extractRows(result);

  if (rows.length > 0) {
    return {
      summary: {
        kind: 'collection',
        count: rows.length,
      },
      rows,
      chart: buildChart(rows),
      keyFacts: [],
      raw: result,
    };
  }

  if (isRecord(result)) {
    return {
      summary: {
        kind: 'object',
        count: Object.keys(result).length,
      },
      rows: [],
      chart: null,
      keyFacts: buildKeyFacts(result),
      raw: result,
    };
  }

  if (result === null || result === undefined) {
    return {
      summary: {
        kind: 'empty',
        count: 0,
      },
      rows: [],
      chart: null,
      keyFacts: [],
      raw: result,
    };
  }

  return {
    summary: {
      kind: 'scalar',
      count: 1,
    },
    rows: [],
    chart: null,
    keyFacts: [{ label: 'value', value: formatValue(result) }],
    raw: result,
  };
}
