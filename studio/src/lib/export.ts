import { buildResultPresentation } from './results';

export interface ResultExportArtifact {
  filename: string;
  mimeType: string;
  contents: string;
}

export interface ResultExportBundle {
  baseName: string;
  json: ResultExportArtifact;
  markdown: ResultExportArtifact;
  csv: ResultExportArtifact | null;
}

function sanitizeBaseName(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'opencli-studio-result';
}

function escapeCsvCell(value: unknown): string {
  const normalized = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function toMarkdownTable(rows: Record<string, unknown>[]): string {
  const headers = Object.keys(rows[0] ?? {});
  const headerLine = `| ${headers.join(' | ')} |`;
  const dividerLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const bodyLines = rows.map((row) => `| ${headers.map((key) => String(row[key] ?? '')).join(' | ')} |`);
  return [headerLine, dividerLine, ...bodyLines].join('\n');
}

function toMarkdownFacts(facts: Array<{ label: string; value: string }>): string {
  return facts.map((fact) => `- **${fact.label}**: ${fact.value}`).join('\n');
}

function toCsv(rows: Record<string, unknown>[]): string | null {
  if (rows.length === 0) return null;
  const headers = Object.keys(rows[0] ?? {});
  const headerLine = headers.join(',');
  const bodyLines = rows.map((row) => headers.map((key) => escapeCsvCell(row[key])).join(','));
  return [headerLine, ...bodyLines].join('\n');
}

export function buildResultExports(title: string, result: unknown): ResultExportBundle {
  const presentation = buildResultPresentation(result);
  const baseName = sanitizeBaseName(title);
  const jsonContents = JSON.stringify(result ?? null, null, 2) ?? 'null';

  const markdownContents = presentation.rows.length > 0
    ? toMarkdownTable(presentation.rows)
    : presentation.keyFacts.length > 0
      ? toMarkdownFacts(presentation.keyFacts)
      : `\`\`\`json\n${jsonContents}\n\`\`\``;

  const csvContents = toCsv(presentation.rows);

  return {
    baseName,
    json: {
      filename: `${baseName}.json`,
      mimeType: 'application/json;charset=utf-8',
      contents: jsonContents,
    },
    markdown: {
      filename: `${baseName}.md`,
      mimeType: 'text/markdown;charset=utf-8',
      contents: markdownContents,
    },
    csv: csvContents
      ? {
          filename: `${baseName}.csv`,
          mimeType: 'text/csv;charset=utf-8',
          contents: csvContents,
        }
      : null,
  };
}
