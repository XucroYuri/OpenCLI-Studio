import { describe, expect, it } from 'vitest';
import { Strategy, type CliCommand } from '../registry.js';
import { buildStudioCommandMeta, buildStudioRegistry } from './metadata.js';

function makeCommand(overrides: Partial<CliCommand>): CliCommand {
  return {
    site: 'studio-test',
    name: 'sample',
    description: 'sample command',
    args: [],
    ...overrides,
  };
}

describe('buildStudioCommandMeta', () => {
  it('classifies read-oriented browser discovery commands as safe insights surfaces', () => {
    const meta = buildStudioCommandMeta(makeCommand({
      site: 'bilibili',
      name: 'hot',
      strategy: Strategy.COOKIE,
      browser: true,
    }));

    expect(meta.mode).toBe('browser');
    expect(meta.capability).toBe('discovery');
    expect(meta.risk).toBe('safe');
    expect(meta.uiHints.supportsCharts).toBe(true);
  });

  it('classifies public search commands as searchable list surfaces', () => {
    const meta = buildStudioCommandMeta(makeCommand({
      site: 'google',
      name: 'trends',
      strategy: Strategy.PUBLIC,
      browser: false,
    }));

    expect(meta.mode).toBe('public');
    expect(meta.capability).toBe('discovery');
    expect(meta.uiHints.supportsLists).toBe(true);
  });

  it('marks write actions as confirmation-required', () => {
    const meta = buildStudioCommandMeta(makeCommand({
      site: 'douyin',
      name: 'publish',
      strategy: Strategy.COOKIE,
      browser: true,
    }));

    expect(meta.capability).toBe('action');
    expect(meta.risk).toBe('confirm');
  });

  it('marks destructive actions as dangerous', () => {
    const meta = buildStudioCommandMeta(makeCommand({
      site: 'douyin',
      name: 'delete',
      strategy: Strategy.COOKIE,
      browser: true,
    }));

    expect(meta.capability).toBe('action');
    expect(meta.risk).toBe('dangerous');
  });

  it('marks plugin-owned sites as plugin surfaces', () => {
    const meta = buildStudioCommandMeta(makeCommand({
      site: 'hot-digest',
      name: 'hot',
      strategy: Strategy.PUBLIC,
      browser: false,
    }), {
      pluginSites: new Set(['hot-digest']),
    });

    expect(meta.surface).toBe('plugin');
  });

  it('marks domestic and international market by site white lists', () => {
    const domesticMeta = buildStudioCommandMeta(makeCommand({
      site: 'bilibili',
      name: 'hot',
      strategy: Strategy.COOKIE,
      browser: true,
    }));
    const internationalMeta = buildStudioCommandMeta(makeCommand({
      site: 'google',
      name: 'trends',
      strategy: Strategy.PUBLIC,
      browser: false,
    }));

    expect(domesticMeta.market).toBe('domestic');
    expect(internationalMeta.market).toBe('international');
  });

  it('uses siteCategory fallback and keeps unknown/other for unrecognized patterns', () => {
    const categoryMeta = buildStudioCommandMeta(makeCommand({
      site: 'custom-repo',
      name: 'watch',
      domain: 'example.org',
      strategy: Strategy.PUBLIC,
      browser: false,
    }));
    const unknownMeta = buildStudioCommandMeta(makeCommand({
      site: 'custom-repo',
      name: 'unknown-activity',
      strategy: Strategy.PUBLIC,
      browser: false,
    }));

    expect(categoryMeta.market).toBe('unknown');
    expect(categoryMeta.siteCategory).toBe('video');
    expect(unknownMeta.market).toBe('unknown');
    expect(unknownMeta.siteCategory).toBe('other');
  });
});

describe('buildStudioRegistry', () => {
  it('sorts commands and includes command-level metadata', () => {
    const commands = [
      makeCommand({ site: 'reddit', name: 'search', strategy: Strategy.COOKIE, browser: true }),
      makeCommand({ site: 'bilibili', name: 'hot', strategy: Strategy.COOKIE, browser: true }),
    ];

    const registry = buildStudioRegistry(commands);

  expect(registry.commands.map((item) => item.command)).toEqual([
      'bilibili/hot',
      'reddit/search',
    ]);
      expect(registry.sites).toEqual(expect.arrayContaining([
        {
          site: 'bilibili',
          commandCount: 1,
          market: 'domestic',
          category: 'video',
          commandCountByTag: expect.objectContaining({
            all: 1,
            'market:domestic': 1,
            'siteCategory:video': 1,
          }),
        },
      {
        site: 'reddit',
        commandCount: 1,
        market: 'international',
        category: 'social',
        commandCountByTag: expect.objectContaining({
          all: 1,
          'market:international': 1,
          'siteCategory:social': 1,
        }),
      },
    ]));
  });
});
