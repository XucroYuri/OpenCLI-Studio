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
const LABEL_HINT = /(title|name|label|keyword|topic|tag|date|time|day|month|week|hour|region)$/i;
const TIME_HINT = /(date|time|day|month|week|hour)$/i;
const URL_HINT = /^(https?:\/\/|www\.)/i;
const NON_METRIC_HINT = /(^id$|[_-]id$|(?:^|[_-])(rank|ranking|position|index|no)(?:$|[_-]))/i;

function isRecord(value: unknown): value is ResultRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function isUrlLike(value: unknown): boolean {
  return typeof value === 'string' && URL_HINT.test(value.trim());
}

function hasStringValue(row: ResultRecord | undefined, key: string): boolean {
  return typeof row?.[key] === 'string' && String(row[key]).trim().length > 0;
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
    keys.find((key) => LABEL_HINT.test(key) && hasStringValue(rows[0], key))
    ?? keys.find((key) => hasStringValue(rows[0], key))
    ?? keys.find((key) => LABEL_HINT.test(key))
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

  const preferredKeys = numericKeys.filter((key) => !NON_METRIC_HINT.test(key));
  return (preferredKeys.length > 0 ? preferredKeys : numericKeys).slice(0, 2);
}

export function extractPrimaryMetric(rows: ResultRecord[]): { labelKey: string; numericKey: string } | null {
  if (rows.length === 0) return null;

  const labelKey = pickLabelKey(rows);
  const numericKey = pickNumericKeys(rows, labelKey)[0] ?? null;
  if (!labelKey || !numericKey) return null;

  return { labelKey, numericKey };
}

function shouldVisualize(rows: ResultRecord[], labelKey: string, numericKeys: string[]): boolean {
  if (rows.length < 2 || numericKeys.length === 0) return false;

  const keys = Object.keys(rows[0] ?? {});
  const textKeys = keys.filter((key) =>
    key !== labelKey
    && !numericKeys.includes(key)
    && rows.some((row) => typeof row[key] === 'string' && String(row[key]).trim().length > 0),
  );
  const hasUrlColumn = keys.some((key) => rows.some((row) => isUrlLike(row[key])));
  const averageLabelLength = rows.reduce((total, row) => total + formatValue(row[labelKey]).length, 0) / rows.length;
  const isTimeSeries = TIME_HINT.test(labelKey);

  if (isTimeSeries) {
    return rows.length <= 48 && numericKeys.length <= 2;
  }

  if (rows.length > 8) return false;
  if (numericKeys.length !== 1) return false;
  if (NON_METRIC_HINT.test(numericKeys[0]) || NON_METRIC_HINT.test(labelKey)) return false;
  if (hasUrlColumn) return false;
  if (textKeys.length > 1) return false;
  if (averageLabelLength > 24) return false;

  return true;
}

function buildChart(rows: ResultRecord[]): ResultChartModel | null {
  if (rows.length === 0) return null;

  const labelKey = pickLabelKey(rows);
  if (!labelKey) return null;

  const numericKeys = pickNumericKeys(rows, labelKey);
  if (numericKeys.length === 0) return null;
  if (!shouldVisualize(rows, labelKey, numericKeys)) return null;

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
