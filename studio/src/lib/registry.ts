import type { StudioCapability, StudioCommandItem, StudioMode, StudioRisk, StudioSurface } from '../types';

export interface RegistryFilters {
  search: string;
  site: string;
  surface: StudioSurface | 'all';
  mode: StudioMode | 'all';
  capability: StudioCapability | 'all';
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
    if (filters.risk !== 'all' && command.meta.risk !== filters.risk) return false;
    if (filters.supportsChartsOnly && !command.meta.uiHints.supportsCharts) return false;

    return true;
  });
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
