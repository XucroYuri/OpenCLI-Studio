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

  it('covers creator-facing site market and category mappings for sites that previously fell through', () => {
    const domesticNews = buildStudioCommandMeta(makeCommand({
      site: '36kr',
      name: 'news',
      strategy: Strategy.PUBLIC,
      browser: false,
    }));
    const domesticCommerce = buildStudioCommandMeta(makeCommand({
      site: 'jd',
      name: 'search',
      strategy: Strategy.PUBLIC,
      browser: false,
    }));
    const domesticUtility = buildStudioCommandMeta(makeCommand({
      site: 'boss',
      name: 'joblist',
      strategy: Strategy.COOKIE,
      browser: true,
    }));
    const internationalAi = buildStudioCommandMeta(makeCommand({
      site: 'codex',
      name: 'ask',
      strategy: Strategy.PUBLIC,
      browser: false,
    }));
    const internationalKnowledge = buildStudioCommandMeta(makeCommand({
      site: 'wikipedia',
      name: 'summary',
      strategy: Strategy.PUBLIC,
      browser: false,
    }));
    const internationalSocial = buildStudioCommandMeta(makeCommand({
      site: 'band',
      name: 'posts',
      strategy: Strategy.COOKIE,
      browser: true,
    }));

    expect(domesticNews.market).toBe('domestic');
    expect(domesticNews.siteCategory).toBe('news');
    expect(domesticCommerce.market).toBe('domestic');
    expect(domesticCommerce.siteCategory).toBe('commerce');
    expect(domesticUtility.market).toBe('domestic');
    expect(domesticUtility.siteCategory).toBe('utility');
    expect(internationalAi.market).toBe('international');
    expect(internationalAi.siteCategory).toBe('ai-tool');
    expect(internationalKnowledge.market).toBe('international');
    expect(internationalKnowledge.siteCategory).toBe('knowledge');
    expect(internationalSocial.market).toBe('international');
    expect(internationalSocial.siteCategory).toBe('social');
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
  it('sorts commands for creator-oriented discovery and includes command-level metadata', () => {
    const commands = [
      makeCommand({ site: 'youtube', name: 'search', strategy: Strategy.PUBLIC, browser: false }),
      makeCommand({ site: 'bilibili', name: 'publish', strategy: Strategy.COOKIE, browser: true }),
      makeCommand({ site: 'bilibili', name: 'hot', strategy: Strategy.COOKIE, browser: true }),
      makeCommand({ site: 'xiaohongshu', name: 'search', strategy: Strategy.COOKIE, browser: true }),
    ];

    const registry = buildStudioRegistry(commands);

    expect(registry.commands.map((item) => item.command)).toEqual([
      'bilibili/hot',
      'bilibili/publish',
      'xiaohongshu/search',
      'youtube/search',
    ]);
    expect(registry.sites.map((item) => item.site)).toEqual([
      'bilibili',
      'xiaohongshu',
      'youtube',
    ]);

    expect(registry.sites).toEqual(expect.arrayContaining([
      expect.objectContaining({
        site: 'bilibili',
        commandCount: 2,
        market: 'domestic',
        category: 'video',
        commandCountByTag: expect.objectContaining({
          all: 2,
          'market:domestic': 2,
          'siteCategory:video': 2,
        }),
      }),
      expect.objectContaining({
        site: 'youtube',
        commandCount: 1,
        market: 'international',
        category: 'video',
        commandCountByTag: expect.objectContaining({
          all: 1,
          'market:international': 1,
          'siteCategory:video': 1,
        }),
      }),
    ]));
  });

  it('keeps creator-relevant mainland platforms ahead of low-relevance or international sites', () => {
    const registry = buildStudioRegistry([
      makeCommand({ site: 'amazon', name: 'search', strategy: Strategy.PUBLIC, browser: false }),
      makeCommand({ site: 'youtube', name: 'search', strategy: Strategy.PUBLIC, browser: false }),
      makeCommand({ site: 'jd', name: 'search', strategy: Strategy.PUBLIC, browser: false }),
      makeCommand({ site: 'codex', name: 'ask', strategy: Strategy.PUBLIC, browser: false }),
      makeCommand({ site: 'jimeng', name: 'ask', strategy: Strategy.COOKIE, browser: true }),
      makeCommand({ site: 'bilibili', name: 'ranking', strategy: Strategy.COOKIE, browser: true }),
      makeCommand({ site: 'weibo', name: 'hot', strategy: Strategy.COOKIE, browser: true }),
      makeCommand({ site: 'reuters', name: 'news', strategy: Strategy.PUBLIC, browser: false }),
    ]);

    expect(registry.sites.map((item) => item.site)).toEqual([
      'bilibili',
      'weibo',
      'jimeng',
      'jd',
      'youtube',
      'codex',
      'reuters',
      'amazon',
    ]);
    expect(registry.commands.map((item) => item.command)).toEqual([
      'bilibili/ranking',
      'weibo/hot',
      'jimeng/ask',
      'jd/search',
      'youtube/search',
      'codex/ask',
      'reuters/news',
      'amazon/search',
    ]);
  });

  it('infers select choices for fixed-value arguments that are missing choices in the source registry', () => {
    const registry = buildStudioRegistry([
      makeCommand({
        site: 'youtube',
        name: 'search',
        strategy: Strategy.PUBLIC,
        browser: false,
        args: [
          { name: 'type', type: 'str', help: 'Filter type: shorts, video, channel, playlist' },
          { name: 'sort', type: 'str', help: 'Sort by: relevance, date, views, rating' },
        ],
      }),
    ]);

    expect(registry.commands[0]?.args).toEqual([
      expect.objectContaining({
        name: 'type',
        choices: ['shorts', 'video', 'channel', 'playlist'],
      }),
      expect.objectContaining({
        name: 'sort',
        choices: ['relevance', 'date', 'views', 'rating'],
      }),
    ]);
  });

  it('keeps explicit choices and extends catalog-style categories for workbench selection', () => {
    const registry = buildStudioRegistry([
      makeCommand({
        site: 'producthunt',
        name: 'posts',
        strategy: Strategy.PUBLIC,
        browser: false,
        args: [
          {
            name: 'category',
            type: 'string',
            default: '',
            help: 'Category filter: ai-agents, ai-coding-agents, ai-code-editors, ai-chatbots, ai-workflow-automation, vibe-coding, developer-tools, productivity, design-creative, marketing-sales, no-code-platforms, llms, finance, social-community, engineering-development',
          },
        ],
      }),
      makeCommand({
        site: 'sinafinance',
        name: 'stock-rank',
        strategy: Strategy.PUBLIC,
        browser: false,
        args: [
          {
            name: 'market',
            type: 'string',
            default: 'cn',
            help: 'Market: cn (A股), hk (港股), us (美股), wh (外汇), ft (期货)',
            choices: ['cn', 'hk', 'us', 'wh', 'ft'],
          },
        ],
      }),
    ]);

    const producthuntPosts = registry.commands.find((command) => command.command === 'producthunt/posts');
    const stockRank = registry.commands.find((command) => command.command === 'sinafinance/stock-rank');

    expect(producthuntPosts?.args[0]).toEqual(expect.objectContaining({
      name: 'category',
      choices: expect.arrayContaining(['ai-agents', 'developer-tools', 'engineering-development']),
    }));
    expect(stockRank?.args[0]).toEqual(expect.objectContaining({
      name: 'market',
      choices: ['cn', 'hk', 'us', 'wh', 'ft'],
    }));
  });
});
