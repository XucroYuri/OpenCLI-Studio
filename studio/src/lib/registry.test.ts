import { describe, expect, it } from 'vitest';
import { filterRegistryCommands, listWorkbenchCommands, pickDefaultWorkbenchCommand } from './registry';
import type { StudioCommandItem } from '../types';

const COMMANDS: StudioCommandItem[] = [
  {
    command: 'bilibili/hot',
    site: 'bilibili',
    name: 'hot',
    description: 'Top hot content',
    args: [],
    browser: true,
    strategy: 'cookie',
    meta: {
      surface: 'builtin',
      mode: 'browser',
      capability: 'discovery',
      risk: 'safe',
      uiHints: {
        supportsLists: true,
        supportsDetails: false,
        supportsCharts: true,
        supportsTimeSeries: true,
      },
    },
  },
  {
    command: 'google/trends',
    site: 'google',
    name: 'trends',
    description: 'Daily search trends',
    args: [],
    browser: false,
    strategy: 'public',
    meta: {
      surface: 'builtin',
      mode: 'public',
      capability: 'discovery',
      risk: 'safe',
      uiHints: {
        supportsLists: true,
        supportsDetails: false,
        supportsCharts: true,
        supportsTimeSeries: true,
      },
    },
  },
  {
    command: 'douyin/publish',
    site: 'douyin',
    name: 'publish',
    description: 'Publish a work item',
    args: [],
    browser: true,
    strategy: 'cookie',
    meta: {
      surface: 'plugin',
      mode: 'browser',
      capability: 'action',
      risk: 'confirm',
      uiHints: {
        supportsLists: false,
        supportsDetails: false,
        supportsCharts: false,
        supportsTimeSeries: false,
      },
    },
  },
];

describe('filterRegistryCommands', () => {
  it('filters registry commands across query, site, mode, and charts support', () => {
    const filtered = filterRegistryCommands(COMMANDS, {
      search: 'trend',
      site: 'google',
      surface: 'builtin',
      mode: 'public',
      capability: 'all',
      risk: 'all',
      supportsChartsOnly: true,
      advancedMode: true,
    });

    expect(filtered.map((item) => item.command)).toEqual(['google/trends']);
  });

  it('hides confirm and dangerous commands until advanced mode is enabled', () => {
    const safeOnly = filterRegistryCommands(COMMANDS, {
      search: '',
      site: 'all',
      surface: 'all',
      mode: 'all',
      capability: 'all',
      risk: 'all',
      supportsChartsOnly: false,
      advancedMode: false,
    });

    const advanced = filterRegistryCommands(COMMANDS, {
      search: '',
      site: 'all',
      surface: 'all',
      mode: 'all',
      capability: 'all',
      risk: 'all',
      supportsChartsOnly: false,
      advancedMode: true,
    });

    expect(safeOnly.map((item) => item.command)).toEqual(['bilibili/hot', 'google/trends']);
    expect(advanced.map((item) => item.command)).toEqual(['bilibili/hot', 'google/trends', 'douyin/publish']);
  });

  it('filters commands by surface', () => {
    const filtered = filterRegistryCommands(COMMANDS, {
      search: '',
      site: 'all',
      surface: 'plugin',
      mode: 'all',
      capability: 'all',
      risk: 'all',
      supportsChartsOnly: false,
      advancedMode: true,
    });

    expect(filtered.map((item) => item.command)).toEqual(['douyin/publish']);
  });
});

describe('listWorkbenchCommands', () => {
  it('keeps risky commands out of the picker unless advanced mode is active', () => {
    expect(listWorkbenchCommands(COMMANDS, false).map((item) => item.command)).toEqual([
      'bilibili/hot',
      'google/trends',
    ]);

    expect(listWorkbenchCommands(COMMANDS, true).map((item) => item.command)).toEqual([
      'bilibili/hot',
      'douyin/publish',
      'google/trends',
    ]);
  });
});

describe('pickDefaultWorkbenchCommand', () => {
  it('prefers the explicitly selected command and otherwise falls back to a safe discovery command', () => {
    expect(pickDefaultWorkbenchCommand(COMMANDS, 'google/trends')).toBe('google/trends');
    expect(pickDefaultWorkbenchCommand(COMMANDS, 'missing/command')).toBe('bilibili/hot');
  });
});
