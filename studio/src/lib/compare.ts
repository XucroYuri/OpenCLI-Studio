import { buildResultPresentation } from './results';

type ResultRecord = Record<string, unknown>;

function pickLabelKey(rows: ResultRecord[]): string | null {
  const first = rows[0] ?? {};
  return Object.keys(first).find((key) => typeof first[key] === 'string') ?? Object.keys(first)[0] ?? null;
}

function pickNumericKey(rows: ResultRecord[], labelKey: string | null): string | null {
  const first = rows[0] ?? {};
  return Object.keys(first).find((key) => key !== labelKey && typeof first[key] === 'number') ?? null;
}

function compareCollections(leftRows: ResultRecord[], rightRows: ResultRecord[]): { items: ResultRecord[] } | null {
  if (leftRows.length === 0 || rightRows.length === 0) return null;

  const labelKey = pickLabelKey(leftRows) ?? pickLabelKey(rightRows);
  const numericKey = pickNumericKey(leftRows, labelKey) ?? pickNumericKey(rightRows, labelKey);
  if (!labelKey || !numericKey) return null;

  const leftMap = new Map(leftRows.map((row) => [String(row[labelKey] ?? ''), row]));
  const rightMap = new Map(rightRows.map((row) => [String(row[labelKey] ?? ''), row]));
  const labels = [...new Set([...leftMap.keys(), ...rightMap.keys()])];

  return {
    items: labels.map((label) => {
      const leftValue = leftMap.get(label)?.[numericKey];
      const rightValue = rightMap.get(label)?.[numericKey];
      const normalizedLeft = typeof leftValue === 'number' ? leftValue : 0;
      const normalizedRight = typeof rightValue === 'number' ? rightValue : 0;
      return {
        label,
        left: normalizedLeft,
        right: normalizedRight,
        delta: normalizedRight - normalizedLeft,
      };
    }),
  };
}

function compareFacts(left: Array<{ label: string; value: string }>, right: Array<{ label: string; value: string }>): { items: ResultRecord[] } {
  const leftMap = new Map(left.map((fact) => [fact.label, fact.value]));
  const rightMap = new Map(right.map((fact) => [fact.label, fact.value]));

  const fields = [...new Set([...leftMap.keys(), ...rightMap.keys()])].sort((a, b) => a.localeCompare(b));

  return {
    items: fields.map((field) => ({
      field,
      left: leftMap.get(field) ?? '',
      right: rightMap.get(field) ?? '',
    })),
  };
}

export function buildResultComparison(left: unknown, right: unknown): { items: ResultRecord[] } {
  const leftPresentation = buildResultPresentation(left);
  const rightPresentation = buildResultPresentation(right);

  if (leftPresentation.rows.length > 0 && rightPresentation.rows.length > 0) {
    return compareCollections(leftPresentation.rows, rightPresentation.rows)
      ?? { items: [] };
  }

  return compareFacts(leftPresentation.keyFacts, rightPresentation.keyFacts);
}
