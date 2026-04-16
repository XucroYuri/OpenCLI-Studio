import { buildResultPresentation } from './results';
import type { ExecuteResponse, StudioCommandItem } from '../types';

export type OverviewComboId =
  | 'creator-hot-domestic'
  | 'creator-hot-global'
  | 'creator-reference';

interface OverviewComboBlueprintStep {
  command: string;
  args?: Record<string, unknown>;
}

interface OverviewComboBlueprint {
  id: OverviewComboId;
  steps: OverviewComboBlueprintStep[];
}

export interface OverviewComboStep {
  command: string;
  args: Record<string, unknown>;
  item: StudioCommandItem;
}

export interface OverviewComboDefinition {
  id: OverviewComboId;
  steps: OverviewComboStep[];
  sourceCount: number;
  browserCount: number;
}

export interface OverviewComboRunOutcome {
  step: OverviewComboStep;
  response?: ExecuteResponse;
  error?: string;
}

export interface OverviewComboFieldLabels {
  source: string;
  title: string;
  summary: string;
  rank: string;
  metric: string;
  url: string;
}

export interface OverviewComboMergedResult {
  items: Array<Record<string, unknown>>;
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ source: string; message: string }>;
}

const DEFAULT_FIELD_LABELS: OverviewComboFieldLabels = {
  source: 'Source',
  title: 'Title',
  summary: 'Summary',
  rank: 'Rank',
  metric: 'Metric',
  url: 'URL',
};

const OVERVIEW_COMBO_BLUEPRINTS: OverviewComboBlueprint[] = [
  {
    id: 'creator-hot-domestic',
    steps: [
      { command: 'bilibili/ranking', args: { limit: 8 } },
      { command: 'weibo/hot', args: { limit: 8 } },
      { command: 'zhihu/hot', args: { limit: 8 } },
      { command: 'douyin/hashtag', args: { action: 'hot', limit: 8 } },
      { command: 'tieba/hot', args: { limit: 8 } },
    ],
  },
  {
    id: 'creator-hot-global',
    steps: [
      { command: 'google/trends', args: { region: 'US', limit: 8 } },
      { command: 'twitter/trending', args: { limit: 8 } },
      { command: 'reddit/popular', args: { limit: 8 } },
      { command: 'wikipedia/trending', args: { limit: 8 } },
    ],
  },
  {
    id: 'creator-reference',
    steps: [
      { command: 'bilibili/ranking', args: { limit: 6 } },
      { command: 'pixiv/ranking', args: { limit: 6 } },
      { command: 'imdb/trending', args: { limit: 6 } },
      { command: 'producthunt/hot', args: { limit: 6 } },
    ],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUrlLike(value: unknown): value is string {
  return typeof value === 'string' && /^(https?:\/\/|www\.)/i.test(value.trim());
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function pickFirstKey(keys: string[], row: Record<string, unknown>, pattern: RegExp): string | null {
  return keys.find((key) => pattern.test(key) && formatScalar(row[key])) ?? null;
}

function pickFirstNumberKey(keys: string[], row: Record<string, unknown>, pattern?: RegExp, exclude: string[] = []): string | null {
  return keys.find((key) => {
    if (exclude.includes(key)) return false;
    if (pattern && !pattern.test(key)) return false;
    return typeof row[key] === 'number';
  }) ?? null;
}

function normalizeUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function isIdentifierKey(key: string): boolean {
  return /(^id$|[_-]id$)/i.test(key);
}

function buildSummaryFromRow(
  row: Record<string, unknown>,
  excludeKeys: string[],
): string {
  return Object.entries(row)
    .filter(([key, value]) => !excludeKeys.includes(key) && formatScalar(value))
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${formatScalar(value)}`)
    .join(' · ');
}

function normalizeMergedRow(
  row: Record<string, unknown>,
  input: {
    sourceLabel: string;
    commandLabel: string;
    fieldLabels: OverviewComboFieldLabels;
  },
): Record<string, unknown> {
  const keys = Object.keys(row);
  const urlKey =
    pickFirstKey(keys, row, /(url|link|href)$/i)
    ?? keys.find((key) => isUrlLike(row[key]))?.toString()
    ?? null;
  const rankKey = pickFirstNumberKey(keys, row, /(^rank$|^position$|^index$|^no$|(?:^|[_-])(rank|position|index|no)(?:$|[_-]))/i);
  const titleKey =
    pickFirstKey(keys, row, /(title|name|label|keyword|topic|tag|headline|question|query)/i)
    ?? keys.find((key) => {
      if (key === urlKey) return false;
      return typeof row[key] === 'string' && formatScalar(row[key]).length > 0;
    })
    ?? null;
  const metricExcludeKeys = [rankKey ?? '', titleKey ?? '', urlKey ?? ''];
  const metricKey =
    pickFirstNumberKey(keys, row, /(views?|plays?|likes?|score|heat|count|comments?|followers?|fans?|hot)/i, metricExcludeKeys)
    ?? pickFirstKey(keys, row, /(views?|plays?|likes?|score|heat|count|comments?|followers?|fans?|hot)/i)
    ?? pickFirstNumberKey(keys, row, undefined, [
      ...metricExcludeKeys,
      ...keys.filter((key) => isIdentifierKey(key)),
    ]);

  const title = titleKey ? formatScalar(row[titleKey]) : input.commandLabel;
  const url = urlKey ? normalizeUrl(String(row[urlKey])) : '';
  const metric = metricKey ? formatScalar(row[metricKey]) : '';
  const summary = buildSummaryFromRow(row, [titleKey ?? '', urlKey ?? '', rankKey ?? '', metricKey ?? '']);

  return {
    [input.fieldLabels.source]: input.sourceLabel,
    [input.fieldLabels.title]: title || input.commandLabel,
    [input.fieldLabels.rank]: rankKey ? row[rankKey] : '',
    [input.fieldLabels.metric]: metric,
    [input.fieldLabels.summary]: summary || input.commandLabel,
    [input.fieldLabels.url]: url,
  };
}

function buildFallbackRow(
  outcome: OverviewComboRunOutcome,
  input: {
    sourceLabel: string;
    commandLabel: string;
    fieldLabels: OverviewComboFieldLabels;
  },
): Record<string, unknown> {
  const presentation = buildResultPresentation(outcome.response?.result);
  const summary = presentation.keyFacts
    .slice(0, 3)
    .map((fact) => `${fact.label}: ${fact.value}`)
    .join(' · ');

  return {
    [input.fieldLabels.source]: input.sourceLabel,
    [input.fieldLabels.title]: input.commandLabel,
    [input.fieldLabels.rank]: '',
    [input.fieldLabels.metric]: '',
    [input.fieldLabels.summary]: summary || input.commandLabel,
    [input.fieldLabels.url]: '',
  };
}

export function listOverviewCombos(commands: StudioCommandItem[]): OverviewComboDefinition[] {
  const commandMap = new Map(commands.map((command) => [command.command, command]));

  return OVERVIEW_COMBO_BLUEPRINTS
    .map((combo) => {
      const steps = combo.steps
        .map((step) => {
          const item = commandMap.get(step.command);
          if (!item || item.meta.risk !== 'safe') return null;
          return {
            command: step.command,
            args: step.args ?? {},
            item,
          } satisfies OverviewComboStep;
        })
        .filter((item): item is OverviewComboStep => Boolean(item));

      return {
        id: combo.id,
        steps,
        sourceCount: steps.length,
        browserCount: steps.filter((step) => step.item.meta.mode === 'browser').length,
      } satisfies OverviewComboDefinition;
    })
    .filter((combo) => combo.steps.length > 1);
}

export function buildOverviewComboMergedResult(
  outcomes: OverviewComboRunOutcome[],
  input: {
    fieldLabels?: Partial<OverviewComboFieldLabels>;
    getSourceLabel?: (step: OverviewComboStep) => string;
    getCommandLabel?: (step: OverviewComboStep) => string;
    maxRowsPerSource?: number;
  } = {},
): OverviewComboMergedResult {
  const fieldLabels = { ...DEFAULT_FIELD_LABELS, ...input.fieldLabels };
  const maxRowsPerSource = input.maxRowsPerSource ?? 10;
  const items: Array<Record<string, unknown>> = [];
  const errors: Array<{ source: string; message: string }> = [];
  let successCount = 0;
  let failureCount = 0;

  for (const outcome of outcomes) {
    const sourceLabel = input.getSourceLabel?.(outcome.step) ?? outcome.step.item.site;
    const commandLabel =
      input.getCommandLabel?.(outcome.step)
      ?? outcome.step.item.description
      ?? outcome.step.command;

    if (outcome.error) {
      failureCount += 1;
      errors.push({ source: sourceLabel, message: outcome.error });
      continue;
    }

    successCount += 1;
    const presentation = buildResultPresentation(outcome.response?.result);
    const rows = presentation.rows.slice(0, maxRowsPerSource);

    if (rows.length === 0) {
      items.push(buildFallbackRow(outcome, { sourceLabel, commandLabel, fieldLabels }));
      continue;
    }

    for (const row of rows) {
      if (!isRecord(row)) continue;
      items.push(normalizeMergedRow(row, { sourceLabel, commandLabel, fieldLabels }));
    }
  }

  return {
    items,
    totalRows: items.length,
    successCount,
    failureCount,
    errors,
  };
}
