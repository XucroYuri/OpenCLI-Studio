import type { StudioCapability, StudioCommandItem, StudioMode, StudioRisk, StudioSiteCategory, StudioSurface } from '../types';

export type SiteCategoryKey = StudioSiteCategory;

export const CREATOR_SITE_CATEGORY_ORDER: SiteCategoryKey[] = [
  'video',
  'social',
  'ai-tool',
  'media',
  'knowledge',
  'utility',
  'news',
  'commerce',
  'finance',
  'other',
];

const SITE_CATEGORY_ALIASES: Record<string, SiteCategoryKey> = {
  social: 'social',
  news: 'news',
  commerce: 'commerce',
  ecommerce: 'commerce',
  finance: 'finance',
  media: 'media',
  knowledge: 'knowledge',
  academic: 'knowledge',
  video: 'video',
  'ai-tool': 'ai-tool',
  utility: 'utility',
  tools: 'utility',
  other: 'other',
};

const SITE_CATEGORY_SORT_PRIORITY: Record<string, number> = Object.fromEntries(
  CREATOR_SITE_CATEGORY_ORDER.map((category, index) => [category, index]),
) as Record<string, number>;

SITE_CATEGORY_SORT_PRIORITY.ecommerce = SITE_CATEGORY_SORT_PRIORITY.commerce;
SITE_CATEGORY_SORT_PRIORITY.academic = SITE_CATEGORY_SORT_PRIORITY.knowledge;
SITE_CATEGORY_SORT_PRIORITY.tools = SITE_CATEGORY_SORT_PRIORITY.utility;

export type RegistryPurpose =
  | 'discovery'
  | 'automation'
  | 'auth'
  | 'asset'
  | 'analysis'
  | 'integration'
  | 'utility';

export interface RegistryFilters {
  search: string;
  site: string;
  market: 'domestic' | 'international' | 'unknown' | 'all';
  siteCategory: SiteCategoryKey | 'all';
  surface: StudioSurface | 'all';
  mode: StudioMode | 'all';
  capability: StudioCapability | 'all';
  purpose: RegistryPurpose | 'all';
  risk: StudioRisk | 'all';
  supportsChartsOnly: boolean;
  advancedMode: boolean;
}

export function normalizeSiteCategory(
  value: unknown,
  fallback: SiteCategoryKey | 'all' = 'all',
): SiteCategoryKey | 'all' {
  if (typeof value !== 'string') return fallback;
  if (value === 'all') return 'all';
  return SITE_CATEGORY_ALIASES[value] ?? fallback;
}

function siteCategorySortRank(category: unknown): number {
  const normalized = normalizeSiteCategory(category, 'other');
  if (normalized === 'all') {
    return Number.MAX_SAFE_INTEGER;
  }
  return SITE_CATEGORY_SORT_PRIORITY[normalized] ?? Number.MAX_SAFE_INTEGER;
}

type RegistryMarket = RegistryFilters['market'];

function preferredMarketForLocale(locale?: string): Exclude<RegistryMarket, 'unknown' | 'all'> | null {
  if (!locale) return null;
  return locale === 'zh-CN' ? 'domestic' : 'international';
}

function marketSortRank(
  market: RegistryMarket | string | undefined,
  locale?: string,
): number {
  const preferred = preferredMarketForLocale(locale);
  if (!preferred) return 0;
  if (market === preferred) return 0;
  if (market === 'unknown' || !market) return 2;
  return 1;
}

export function sortByLocaleMarketPreference<T>(
  items: T[],
  locale: string | undefined,
  resolveMarket: (item: T) => RegistryMarket | string | undefined,
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) =>
      marketSortRank(resolveMarket(left.item), locale)
      - marketSortRank(resolveMarket(right.item), locale)
      || left.index - right.index)
    .map(({ item }) => item);
}

export function sortSitesByDisplayPreference<T>(
  items: T[],
  locale: string | undefined,
  options: {
    resolveCategory: (item: T) => string | undefined,
    resolveMarket: (item: T) => RegistryMarket | string | undefined,
    resolvePopularity?: (item: T) => number | undefined,
    resolveCommandCount?: (item: T) => number | undefined,
  },
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const categoryDiff =
        siteCategorySortRank(options.resolveCategory(left.item))
        - siteCategorySortRank(options.resolveCategory(right.item));
      if (categoryDiff !== 0) return categoryDiff;

      const marketDiff =
        marketSortRank(options.resolveMarket(left.item), locale)
        - marketSortRank(options.resolveMarket(right.item), locale);
      if (marketDiff !== 0) return marketDiff;

      const leftPopularity = options.resolvePopularity?.(left.item) ?? Number.MAX_SAFE_INTEGER;
      const rightPopularity = options.resolvePopularity?.(right.item) ?? Number.MAX_SAFE_INTEGER;
      if (leftPopularity !== rightPopularity) {
        return leftPopularity - rightPopularity;
      }

      const leftCount = options.resolveCommandCount?.(left.item) ?? 0;
      const rightCount = options.resolveCommandCount?.(right.item) ?? 0;
      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
}

export function listWorkbenchCommands(
  commands: StudioCommandItem[],
  advancedMode: boolean,
): StudioCommandItem[] {
  return commands.filter((command) => advancedMode || command.meta.risk === 'safe');
}

export function filterRegistryCommands(
  commands: StudioCommandItem[],
  filters: RegistryFilters,
  resolveSiteCategory: (site: string) => string = () => 'other',
): StudioCommandItem[] {
  const search = filters.search.trim().toLowerCase();

  return commands.filter((command) => {
    if (!filters.advancedMode && command.meta.risk !== 'safe') return false;

    if (search) {
      const haystack = [
        command.command,
        command.description,
        command.site,
        command.name,
      ].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (filters.site !== 'all' && command.site !== filters.site) return false;
    if (filters.surface !== 'all' && command.meta.surface !== filters.surface) return false;
    if (filters.mode !== 'all' && command.meta.mode !== filters.mode) return false;
    if (filters.capability !== 'all' && command.meta.capability !== filters.capability) return false;
    if (filters.market !== 'all' && command.meta.market !== filters.market) return false;
    if (filters.siteCategory !== 'all' && resolveSiteCategory(command.site) !== filters.siteCategory) return false;
    if (filters.risk !== 'all' && command.meta.risk !== filters.risk) return false;
    if (filters.purpose !== 'all' && inferCommandPurpose(command) !== filters.purpose) return false;
    if (filters.supportsChartsOnly && !command.meta.uiHints.supportsCharts) return false;

    return true;
  });
}

export type RegistryCatalogAxis =
  | 'market'
  | 'siteCategory'
  | 'site'
  | 'surface'
  | 'capability'
  | 'purpose'
  | 'risk';

export interface RegistryCatalogEntry {
  axis: RegistryCatalogAxis;
  value: string;
  count: number;
}

export function buildRegistryCatalog(
  commands: StudioCommandItem[],
  resolveSiteCategory: (site: string) => string = () => 'other',
): Record<RegistryCatalogAxis, RegistryCatalogEntry[]> {
  const marketValues = new Map<string, number>();
  const siteValues = new Map<string, number>();
  const surfaceValues = new Map<string, number>();
  const categoryValues = new Map<string, number>();
  const capabilityValues = new Map<string, number>();
  const purposeValues = new Map<string, number>();
  const riskValues = new Map<string, number>();

  for (const command of commands) {
    const market = command.meta.market ?? 'unknown';
    const siteCategory = resolveSiteCategory(command.site);
    const purpose = inferCommandPurpose(command);

    marketValues.set(market, (marketValues.get(market) ?? 0) + 1);
    siteValues.set(command.site, (siteValues.get(command.site) ?? 0) + 1);
    categoryValues.set(siteCategory, (categoryValues.get(siteCategory) ?? 0) + 1);
    surfaceValues.set(command.meta.surface, (surfaceValues.get(command.meta.surface) ?? 0) + 1);
    capabilityValues.set(command.meta.capability, (capabilityValues.get(command.meta.capability) ?? 0) + 1);
    purposeValues.set(purpose, (purposeValues.get(purpose) ?? 0) + 1);
    riskValues.set(command.meta.risk, (riskValues.get(command.meta.risk) ?? 0) + 1);
  }

  const fromMap = (axis: RegistryCatalogAxis, values: Map<string, number>): RegistryCatalogEntry[] =>
    [...values.entries()].map(([value, count]) => ({ axis, value, count }));

  return {
    market: fromMap('market', marketValues),
    site: fromMap('site', siteValues),
    siteCategory: fromMap('siteCategory', categoryValues),
    surface: fromMap('surface', surfaceValues),
    capability: fromMap('capability', capabilityValues),
    purpose: fromMap('purpose', purposeValues),
    risk: fromMap('risk', riskValues),
  };
}

export function inferCommandPurpose(command: StudioCommandItem): RegistryPurpose {
  const haystack = [
    command.command,
    command.name,
    command.description,
    command.strategy,
  ]
    .join(' ')
    .toLowerCase();

  if (command.meta.surface === 'external' || command.meta.mode === 'external' || command.meta.capability === 'tooling') {
    return 'integration';
  }

  if (command.meta.capability === 'account' || haystack.includes('login') || haystack.includes('auth')) {
    return 'auth';
  }

  if (command.meta.capability === 'discovery' || command.meta.capability === 'search' || haystack.includes('discover') || haystack.includes('search')) {
    return 'discovery';
  }

  if (command.meta.capability === 'detail' || haystack.includes('list') || haystack.includes('get') || haystack.includes('show')) {
    return 'analysis';
  }

  if (command.meta.capability === 'action' || command.meta.capability === 'asset') {
    if (haystack.includes('snapshot') || haystack.includes('monitor') || haystack.includes('watch')) {
      return 'automation';
    }
    return command.meta.capability === 'asset' ? 'asset' : 'automation';
  }

  if (command.meta.capability === 'other') {
    return 'utility';
  }

  return haystack.includes('asset') ? 'asset' : 'utility';
}

export function pickDefaultWorkbenchCommand(
  commands: StudioCommandItem[],
  preferredCommand?: string,
  advancedMode: boolean = false,
  locale?: string,
): string {
  const availableCommands = listWorkbenchCommands(commands, advancedMode);
  const orderedCommands = sortByLocaleMarketPreference(
    availableCommands,
    locale,
    (command) => command.meta.market,
  );

  if (preferredCommand && orderedCommands.some((command) => command.command === preferredCommand)) {
    return preferredCommand;
  }

  const fallback = orderedCommands.find((command) =>
    command.meta.risk === 'safe'
    && (command.meta.capability === 'discovery' || command.meta.capability === 'search'),
  );

  return fallback?.command ?? orderedCommands[0]?.command ?? '';
}
