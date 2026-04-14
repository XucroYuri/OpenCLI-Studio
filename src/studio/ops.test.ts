import { describe, expect, it } from 'vitest';
import { buildStudioExternalInventory, buildStudioPluginInventory } from './ops.js';
import type { StudioRegistryPayload } from './types.js';

describe('buildStudioPluginInventory', () => {
  it('summarizes installed plugins with registry command coverage', () => {
    const registry: StudioRegistryPayload = {
      commands: [
        {
          command: 'hot-digest/hot',
          site: 'hot-digest',
          name: 'hot',
          description: 'hot',
          args: [],
          browser: false,
          strategy: 'public',
          meta: {
            surface: 'plugin',
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
      ],
      sites: [{ site: 'hot-digest', commandCount: 1 }],
    };

    const plugins = buildStudioPluginInventory([
      {
        name: 'hot-digest',
        path: '/tmp/hot-digest',
        commands: ['hot'],
        source: 'github:example/opencli-plugin-hot-digest',
        description: 'Aggregate hot lists',
        version: '1.2.3',
        installedAt: '2026-04-14T00:00:00.000Z',
      },
    ], registry);

    expect(plugins).toEqual([
      expect.objectContaining({
        name: 'hot-digest',
        sourceKind: 'git',
        declaredCommandCount: 1,
        registeredCommandCount: 1,
      }),
    ]);
  });
});

describe('buildStudioExternalInventory', () => {
  it('marks external CLIs as installed or missing', () => {
    const external = buildStudioExternalInventory([
      {
        name: 'gh',
        binary: 'gh',
        description: 'GitHub CLI',
        tags: ['git', 'github'],
        install: { default: 'brew install gh' },
      },
      {
        name: 'yt-dlp',
        binary: 'yt-dlp',
        description: 'Downloader',
      },
    ], (binary) => binary === 'gh');

    expect(external).toEqual([
      expect.objectContaining({
        name: 'gh',
        installed: true,
        installAvailable: true,
      }),
      expect.objectContaining({
        name: 'yt-dlp',
        installed: false,
        installAvailable: false,
      }),
    ]);
  });
});
