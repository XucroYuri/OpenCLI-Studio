import type { StudioCapability, StudioCommandItem, StudioMode, StudioRisk, StudioSurface } from '../types';

export type SiteCategoryKey = 'social' | 'news' | 'finance' | 'ecommerce' | 'academic' | 'tools' | 'other';

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

export function listWorkbenchCommands(
  commands: StudioCommandItem[],
  advancedMode: boolean,
): StudioCommandItem[] {
  return commands
    .filter((command) => advancedMode || command.meta.risk === 'safe')
    .sort((left, right) => left.command.localeCompare(right.command));
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
  const modeValues = new Map<string, number>();
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
    modeValues.set(command.meta.mode, (modeValues.get(command.meta.mode) ?? 0) + 1);
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
): string {
  const availableCommands = listWorkbenchCommands(commands, advancedMode);

  if (preferredCommand && availableCommands.some((command) => command.command === preferredCommand)) {
    return preferredCommand;
  }

  const fallback = availableCommands.find((command) =>
    command.meta.risk === 'safe'
    && (command.meta.capability === 'discovery' || command.meta.capability === 'search'),
  );

  return fallback?.command ?? availableCommands[0]?.command ?? '';
}
