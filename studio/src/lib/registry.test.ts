import { describe, expect, it } from 'vitest';
import {
  CREATOR_SITE_CATEGORY_ORDER,
  filterRegistryCommands,
  listWorkbenchCommands,
  pickDefaultWorkbenchCommand,
  sortByLocaleMarketPreference,
  sortSitesByDisplayPreference,
} from './registry';
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
      market: 'domestic',
      siteCategory: 'video',
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
      market: 'international',
      siteCategory: 'news',
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
      market: 'domestic',
      siteCategory: 'video',
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
      market: 'all',
      siteCategory: 'all',
      surface: 'builtin',
      mode: 'public',
      capability: 'all',
      purpose: 'all',
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
      market: 'all',
      siteCategory: 'all',
      surface: 'all',
      mode: 'all',
      capability: 'all',
      purpose: 'all',
      risk: 'all',
      supportsChartsOnly: false,
      advancedMode: false,
    });

    const advanced = filterRegistryCommands(COMMANDS, {
      search: '',
      site: 'all',
      market: 'all',
      siteCategory: 'all',
      surface: 'all',
      mode: 'all',
      capability: 'all',
      purpose: 'all',
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
      market: 'all',
      siteCategory: 'all',
      surface: 'plugin',
      mode: 'all',
      capability: 'all',
      purpose: 'all',
      risk: 'all',
      supportsChartsOnly: false,
      advancedMode: true,
    });

    expect(filtered.map((item) => item.command)).toEqual(['douyin/publish']);
  });

  it('filters commands by market and site category', () => {
    // 模拟前端分类解析（与 store.getSiteCategory 同源逻辑）
    const resolveSiteCategory = (site: string) =>
      ({ bilibili: 'video', google: 'news', douyin: 'video' })[site] ?? 'other';

    const marketFiltered = filterRegistryCommands(COMMANDS, {
      search: '',
      site: 'all',
      market: 'domestic',
      siteCategory: 'all',
      surface: 'all',
      mode: 'all',
      capability: 'all',
      purpose: 'all',
      risk: 'all',
      supportsChartsOnly: false,
      advancedMode: true,
    });

    const categoryFiltered = filterRegistryCommands(COMMANDS, {
      search: '',
      site: 'all',
      market: 'all',
      siteCategory: 'news',
      surface: 'all',
      mode: 'all',
      capability: 'all',
      purpose: 'all',
      risk: 'all',
      supportsChartsOnly: false,
      advancedMode: true,
    }, resolveSiteCategory);

    expect(marketFiltered.map((item) => item.command)).toEqual(['bilibili/hot', 'douyin/publish']);
    expect(categoryFiltered.map((item) => item.command)).toEqual(['google/trends']);
  });
});

describe('listWorkbenchCommands', () => {
  it('keeps risky commands out of the picker unless advanced mode is active and preserves incoming relevance order', () => {
    expect(listWorkbenchCommands(COMMANDS, false).map((item) => item.command)).toEqual([
      'bilibili/hot',
      'google/trends',
    ]);

    expect(listWorkbenchCommands(COMMANDS, true).map((item) => item.command)).toEqual([
      'bilibili/hot',
      'google/trends',
      'douyin/publish',
    ]);
  });
});

describe('sortByLocaleMarketPreference', () => {
  it('moves domestic sites to the front for Chinese and international sites to the front for English', () => {
    const items = [
      { id: 'bilibili', market: 'domestic' },
      { id: 'google', market: 'international' },
      { id: 'douyin', market: 'domestic' },
      { id: 'reddit', market: 'international' },
      { id: 'local', market: 'unknown' },
    ];

    expect(sortByLocaleMarketPreference(items, 'zh-CN', (item) => item.market).map((item) => item.id)).toEqual([
      'bilibili',
      'douyin',
      'google',
      'reddit',
      'local',
    ]);

    expect(sortByLocaleMarketPreference(items, 'en', (item) => item.market).map((item) => item.id)).toEqual([
      'google',
      'reddit',
      'bilibili',
      'douyin',
      'local',
    ]);
  });
});

describe('sortSitesByDisplayPreference', () => {
  it('sorts sites by category first, then locale-specific market preference, then popularity', () => {
    const items = [
      { id: 'youtube', category: 'video', market: 'international', popularity: 0, count: 320 },
      { id: 'bilibili', category: 'video', market: 'domestic', popularity: 1, count: 280 },
      { id: 'instagram', category: 'social', market: 'international', popularity: 0, count: 260 },
      { id: 'weibo', category: 'social', market: 'domestic', popularity: 1, count: 240 },
      { id: 'quark', category: 'utility', market: 'domestic', popularity: 0, count: 90 },
      { id: 'amazon', category: 'commerce', market: 'international', popularity: 0, count: 400 },
    ];

    expect(sortSitesByDisplayPreference(items, 'zh-CN', {
      resolveCategory: (item) => item.category,
      resolveMarket: (item) => item.market,
      resolvePopularity: (item) => item.popularity,
      resolveCommandCount: (item) => item.count,
    }).map((item) => item.id)).toEqual([
      'bilibili',
      'youtube',
      'weibo',
      'instagram',
      'quark',
      'amazon',
    ]);

    expect(sortSitesByDisplayPreference(items, 'en', {
      resolveCategory: (item) => item.category,
      resolveMarket: (item) => item.market,
      resolvePopularity: (item) => item.popularity,
      resolveCommandCount: (item) => item.count,
    }).map((item) => item.id)).toEqual([
      'youtube',
      'bilibili',
      'instagram',
      'weibo',
      'quark',
      'amazon',
    ]);
  });

  it('normalizes category aliases before sorting', () => {
    const items = [
      { id: 'boss', category: 'tools', market: 'domestic', popularity: 1, count: 20 },
      { id: 'google', category: 'utility', market: 'international', popularity: 0, count: 80 },
      { id: 'cnki', category: 'academic', market: 'domestic', popularity: 0, count: 30 },
    ];

    expect(sortSitesByDisplayPreference(items, 'zh-CN', {
      resolveCategory: (item) => item.category,
      resolveMarket: (item) => item.market,
      resolvePopularity: (item) => item.popularity,
      resolveCommandCount: (item) => item.count,
    }).map((item) => item.id)).toEqual([
      'cnki',
      'boss',
      'google',
    ]);
  });
});

describe('pickDefaultWorkbenchCommand', () => {
  it('prefers the explicitly selected command and otherwise falls back to a safe discovery command', () => {
    expect(pickDefaultWorkbenchCommand(COMMANDS, 'google/trends')).toBe('google/trends');
    expect(pickDefaultWorkbenchCommand(COMMANDS, 'missing/command')).toBe('bilibili/hot');
  });

  it('adapts the fallback command to the current locale preference', () => {
    expect(pickDefaultWorkbenchCommand(COMMANDS, undefined, false, 'zh-CN')).toBe('bilibili/hot');
    expect(pickDefaultWorkbenchCommand(COMMANDS, undefined, false, 'en')).toBe('google/trends');
  });
});

describe('CREATOR_SITE_CATEGORY_ORDER', () => {
  it('keeps creator-facing categories ahead of commerce and finance buckets', () => {
    expect(CREATOR_SITE_CATEGORY_ORDER).toEqual([
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
    ]);
  });
});
