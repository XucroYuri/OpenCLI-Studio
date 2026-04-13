import { describe, expect, it } from 'vitest';
import { filterRegistryCommands, pickDefaultWorkbenchCommand } from './registry';
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
      mode: 'public',
      capability: 'all',
      risk: 'all',
      supportsChartsOnly: true,
    });

    expect(filtered.map((item) => item.command)).toEqual(['google/trends']);
  });
});

describe('pickDefaultWorkbenchCommand', () => {
  it('prefers the explicitly selected command and otherwise falls back to a safe discovery command', () => {
    expect(pickDefaultWorkbenchCommand(COMMANDS, 'google/trends')).toBe('google/trends');
    expect(pickDefaultWorkbenchCommand(COMMANDS, 'missing/command')).toBe('bilibili/hot');
  });
});
