import type { StudioCapability, StudioCommandItem, StudioMode, StudioRisk } from '../types';

export interface RegistryFilters {
  search: string;
  site: string;
  mode: StudioMode | 'all';
  capability: StudioCapability | 'all';
  risk: StudioRisk | 'all';
  supportsChartsOnly: boolean;
}

export function filterRegistryCommands(
  commands: StudioCommandItem[],
  filters: RegistryFilters,
): StudioCommandItem[] {
  const search = filters.search.trim().toLowerCase();

  return commands.filter((command) => {
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
): string {
  if (preferredCommand && commands.some((command) => command.command === preferredCommand)) {
    return preferredCommand;
  }

  const fallback = commands.find((command) =>
    command.meta.risk === 'safe'
    && (command.meta.capability === 'discovery' || command.meta.capability === 'search'),
  );

  return fallback?.command ?? commands[0]?.command ?? '';
}
