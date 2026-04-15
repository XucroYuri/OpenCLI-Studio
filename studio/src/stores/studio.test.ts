import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStudioStore } from './studio';
import type { StudioCommandItem } from '../types';

function makeCommand(overrides: Partial<StudioCommandItem> = {}): StudioCommandItem {
  return {
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
      market: 'international',
      siteCategory: 'news',
      uiHints: {
        supportsLists: true,
        supportsDetails: false,
        supportsCharts: true,
        supportsTimeSeries: true,
      },
    },
    ...overrides,
  };
}

describe('useStudioStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('keeps guarded workbench commands hidden until advanced mode is enabled', () => {
    const store = useStudioStore();
    store.registry = {
      commands: [
        makeCommand({
          command: 'bilibili/hot',
          site: 'bilibili',
          name: 'hot',
          description: 'Top hot content',
          browser: true,
          strategy: 'cookie',
          meta: {
            surface: 'builtin',
            mode: 'browser',
            capability: 'discovery',
            risk: 'safe',
            market: 'domestic',
            siteCategory: 'video',
            uiHints: {
              supportsLists: true,
              supportsDetails: false,
              supportsCharts: true,
              supportsTimeSeries: true,
            },
          },
        }),
        makeCommand(),
        makeCommand({
          command: 'douyin/publish',
          site: 'douyin',
          name: 'publish',
          description: 'Publish a work item',
          browser: true,
          strategy: 'cookie',
          meta: {
            surface: 'plugin',
            mode: 'browser',
            capability: 'action',
            risk: 'confirm',
            market: 'domestic',
            siteCategory: 'video',
            uiHints: {
              supportsLists: false,
              supportsDetails: false,
              supportsCharts: false,
              supportsTimeSeries: false,
            },
          },
        }),
      ],
      sites: [],
    };

    expect(store.availableWorkbenchCommands.map((item) => item.command)).toEqual([
      'bilibili/hot',
      'google/trends',
    ]);

    store.setAdvancedMode(true);

    expect(store.availableWorkbenchCommands.map((item) => item.command)).toEqual([
      'bilibili/hot',
      'google/trends',
      'douyin/publish',
    ]);
  });

  it('falls back to a safe default when advanced mode is turned off', () => {
    const store = useStudioStore();
    store.registry = {
      commands: [
        makeCommand({
          command: 'bilibili/hot',
          site: 'bilibili',
          name: 'hot',
          description: 'Top hot content',
          browser: true,
          strategy: 'cookie',
          meta: {
            surface: 'builtin',
            mode: 'browser',
            capability: 'discovery',
            risk: 'safe',
            market: 'domestic',
            siteCategory: 'video',
            uiHints: {
              supportsLists: true,
              supportsDetails: false,
              supportsCharts: true,
              supportsTimeSeries: true,
            },
          },
        }),
        makeCommand(),
        makeCommand({
          command: 'douyin/publish',
          site: 'douyin',
          name: 'publish',
          description: 'Publish a work item',
          browser: true,
          strategy: 'cookie',
          meta: {
            surface: 'plugin',
            mode: 'browser',
            capability: 'action',
            risk: 'confirm',
            market: 'domestic',
            siteCategory: 'video',
            uiHints: {
              supportsLists: false,
              supportsDetails: false,
              supportsCharts: false,
              supportsTimeSeries: false,
            },
          },
        }),
      ],
      sites: [],
    };

    store.setAdvancedMode(true);
    store.setSelectedCommand('douyin/publish');

    expect(store.selectedCommand).toBe('douyin/publish');

    store.setAdvancedMode(false);

    expect(store.selectedCommand).toBe('bilibili/hot');
  });
});
