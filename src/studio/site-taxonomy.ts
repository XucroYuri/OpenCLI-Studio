import type { CliCommand } from '../registry.js';

export type StudioMarket = 'domestic' | 'international' | 'unknown';
export type StudioSiteCategory =
  | 'social'
  | 'news'
  | 'commerce'
  | 'finance'
  | 'media'
  | 'knowledge'
  | 'video'
  | 'ai-tool'
  | 'utility'
  | 'other';

export const DOMESTIC_SITES = new Set([
  '1688',
  'bilibili',
  'boss',
  'chaoxing',
  'cnki',
  'ctrip',
  '36kr',
  'douban',
  'doubao',
  'doubao-app',
  'douyin',
  'gitee',
  'hupu',
  'jd',
  'jianyu',
  'linux-do',
  'jike',
  'jimeng',
  'ke',
  'maimai',
  'mubu',
  'ones',
  'quark',
  'sinablog',
  'sinafinance',
  'smzdm',
  'taobao',
  'tieba',
  'v2ex',
  'weibo',
  'weixin',
  'weread',
  'xianyu',
  'xiaoe',
  'xiaohongshu',
  'xueqiu',
  'yuanbao',
  'zhihu',
  'zsxq',
]);

export const INTERNATIONAL_SITES = new Set([
  'amazon',
  'apple-podcasts',
  'arxiv',
  'band',
  'barchart',
  'bbc',
  'bloomberg',
  'bluesky',
  'chatgpt',
  'chatgpt-app',
  'chatwise',
  'codex',
  'coupang',
  'cursor',
  'dictionary',
  'discord-app',
  'devto',
  'facebook',
  'gemini',
  'google',
  'grok',
  'hackernews',
  'hf',
  'imdb',
  'instagram',
  'linkedin',
  'lobsters',
  'medium',
  'notebooklm',
  'notion',
  'paperreview',
  'pixiv',
  'producthunt',
  'reddit',
  'reuters',
  'spotify',
  'stackoverflow',
  'steam',
  'substack',
  'tiktok',
  'twitter',
  'uiverse',
  'web',
  'wikipedia',
  'yahoo-finance',
  'yollomi',
  'youtube',
]);

export const SITE_CATEGORY_OVERRIDES: Record<string, StudioSiteCategory> = {
  '1688': 'commerce',
  '36kr': 'news',
  amazon: 'commerce',
  antigravity: 'ai-tool',
  'apple-podcasts': 'media',
  arxiv: 'knowledge',
  band: 'social',
  barchart: 'finance',
  bbc: 'news',
  bilibili: 'video',
  binance: 'finance',
  bloomberg: 'news',
  bluesky: 'social',
  boss: 'utility',
  chaoxing: 'knowledge',
  chatgpt: 'ai-tool',
  'chatgpt-app': 'ai-tool',
  chatwise: 'ai-tool',
  cnki: 'knowledge',
  codex: 'ai-tool',
  ctrip: 'commerce',
  coupang: 'commerce',
  cursor: 'ai-tool',
  devto: 'knowledge',
  dictionary: 'utility',
  'discord-app': 'social',
  douban: 'media',
  doubao: 'ai-tool',
  'doubao-app': 'ai-tool',
  douyin: 'video',
  facebook: 'social',
  gemini: 'ai-tool',
  gitee: 'knowledge',
  google: 'utility',
  grok: 'ai-tool',
  hackernews: 'news',
  hf: 'knowledge',
  hupu: 'social',
  imdb: 'media',
  instagram: 'social',
  jd: 'commerce',
  jianyu: 'commerce',
  jike: 'social',
  jimeng: 'ai-tool',
  ke: 'commerce',
  lesswrong: 'knowledge',
  linkedin: 'social',
  'linux-do': 'knowledge',
  lobsters: 'news',
  maimai: 'social',
  medium: 'media',
  mubu: 'knowledge',
  notebooklm: 'ai-tool',
  notion: 'utility',
  ones: 'utility',
  paperreview: 'knowledge',
  pixiv: 'media',
  producthunt: 'news',
  quark: 'utility',
  reddit: 'social',
  reuters: 'news',
  sinablog: 'news',
  sinafinance: 'finance',
  slock: 'utility',
  smzdm: 'commerce',
  spotify: 'media',
  stackoverflow: 'knowledge',
  steam: 'commerce',
  substack: 'media',
  taobao: 'commerce',
  tieba: 'social',
  tiktok: 'video',
  twitter: 'social',
  uiverse: 'utility',
  v2ex: 'social',
  web: 'utility',
  weibo: 'social',
  weixin: 'social',
  weread: 'knowledge',
  wikipedia: 'knowledge',
  xianyu: 'commerce',
  xiaoe: 'knowledge',
  xiaohongshu: 'video',
  xiaoyuzhou: 'media',
  xueqiu: 'finance',
  'yahoo-finance': 'finance',
  yollomi: 'ai-tool',
  youtube: 'video',
  yuanbao: 'ai-tool',
  zhihu: 'social',
  zsxq: 'social',
};

function buildCreatorSitePriority(groups: string[][]): Record<string, number> {
  const entries: Array<[string, number]> = [];
  let nextPriority = 0;

  for (const group of groups) {
    for (const site of group) {
      entries.push([site, nextPriority]);
      nextPriority += 1;
    }
  }

  return Object.fromEntries(entries);
}

// Prioritized for film / animation studio creators:
// mainland publishing / inspiration platforms first, then creation tools,
// then research/news, and finally low-relevance commerce / finance utilities.
const CREATOR_SITE_PRIORITY_OVERRIDES: Record<string, number> = buildCreatorSitePriority([
  [
    'bilibili',
    'xiaohongshu',
    'douyin',
    'weibo',
    'zhihu',
    'jike',
    'douban',
    'weixin',
    'xiaoyuzhou',
    'zsxq',
    'tieba',
    'hupu',
  ],
  [
    'jimeng',
    'doubao',
    'doubao-app',
    'yuanbao',
    'quark',
    'mubu',
    'ones',
    'weread',
    'xiaoe',
    'cnki',
    'chaoxing',
    'paperreview',
    'gitee',
    'linux-do',
    'v2ex',
    '36kr',
    'maimai',
  ],
  [
    'jd',
    'taobao',
    '1688',
    'xianyu',
    'smzdm',
    'ke',
    'jianyu',
    'ctrip',
    'sinafinance',
    'xueqiu',
  ],
  [
    'boss',
    'youtube',
    'pixiv',
    'instagram',
    'tiktok',
    'twitter',
    'reddit',
    'imdb',
    'spotify',
    'apple-podcasts',
    'substack',
    'medium',
    'bluesky',
  ],
  [
    'chatgpt',
    'chatgpt-app',
    'gemini',
    'grok',
    'codex',
    'cursor',
    'chatwise',
    'antigravity',
    'yollomi',
    'notebooklm',
    'notion',
    'hf',
    'uiverse',
  ],
  [
    'google',
    'reuters',
    'bbc',
    'bloomberg',
    'hackernews',
    'producthunt',
    'devto',
    'lobsters',
    'stackoverflow',
    'arxiv',
    'wikipedia',
    'dictionary',
    'lesswrong',
  ],
  [
    'discord-app',
    'facebook',
    'linkedin',
    'web',
    'steam',
    'amazon',
    'coupang',
    'band',
    'yahoo-finance',
    'barchart',
    'binance',
    'slock',
  ],
]);

const CREATOR_CATEGORY_PRIORITY: Record<StudioSiteCategory, number> = {
  video: 0,
  social: 1,
  'ai-tool': 2,
  media: 3,
  knowledge: 4,
  utility: 5,
  news: 6,
  commerce: 8,
  finance: 9,
  other: 10,
};

export const CATEGORY_KEYWORDS: Record<StudioSiteCategory, string[]> = {
  social: [
    'friend',
    'follow',
    'followers',
    'comment',
    'timeline',
    'profile',
    'message',
    'chat',
    'post',
    'group',
    'member',
    'feed',
  ],
  news: [
    'news',
    'headline',
    'headlines',
    'article',
    'frontpage',
    'trending',
    'latest',
  ],
  commerce: [
    'cart',
    'item',
    'product',
    'buy',
    'order',
    'review',
    'shop',
    'seller',
    'price',
    'checkout',
  ],
  finance: [
    'quote',
    'stock',
    'crypto',
    'trading',
    'gainers',
    'fund',
    'earnings',
    'finance',
    'kline',
  ],
  media: [
    'movie',
    'channel',
    'podcast',
    'episode',
    'videos',
    'play',
    'series',
  ],
  knowledge: [
    'paper',
    'course',
    'courses',
    'dictionary',
    'user',
    'detail',
    'search',
  ],
  video: [
    'video',
    'videos',
    'transcript',
    'caption',
    'explore',
    'creator',
    'watch',
    'stream',
  ],
  'ai-tool': [
    'ask',
    'prompt',
    'model',
    'chat',
    'generate',
    'assistant',
    'summary',
    'history',
    'meeting',
  ],
  utility: [
    'export',
    'status',
    'login',
    'logout',
    'new',
    'open',
    'dump',
    'extract',
    'download',
  ],
  other: [],
};

function inferMarketFromDomain(domain: string | undefined): StudioMarket | null {
  if (!domain) {
    return null;
  }
  const normalized = domain.toLowerCase();
  if (normalized === 'localhost' || normalized.startsWith('localhost:')) {
    return 'unknown';
  }
  if (normalized.endsWith('.cn') || normalized.endsWith('.中国') || normalized.includes('.cn/') || normalized.includes('.cn:') || normalized.includes('.cn.')) {
    return 'domestic';
  }
  return null;
}

function inferMarketFallback(domain: string | undefined): StudioMarket {
  return inferMarketFromDomain(domain) ?? 'unknown';
}

function commandNameText(cmd: CliCommand): string {
  return [
    cmd.site,
    cmd.name,
    cmd.description ?? '',
  ].join(' ').toLowerCase();
}

export function inferMarket(site: string, cmd: { domain?: string } = {}): StudioMarket {
  if (DOMESTIC_SITES.has(site)) return 'domestic';
  if (INTERNATIONAL_SITES.has(site)) return 'international';
  return inferMarketFallback(cmd.domain);
}

export function inferSiteCategory(site: string, cmd: CliCommand): StudioSiteCategory {
  const explicit = SITE_CATEGORY_OVERRIDES[site];
  if (explicit) return explicit;

  const haystack = commandNameText(cmd);
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<[StudioSiteCategory, string[]]>) {
    if (category === 'other') continue;
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return category;
    }
  }
  return 'other';
}

export function getCreatorSitePriority(input: {
  site: string;
  market?: StudioMarket;
  category?: StudioSiteCategory;
}): number {
  const market = input.market ?? 'unknown';
  const category = input.category ?? 'other';
  const marketBase =
    market === 'domestic'
      ? 0
      : market === 'international'
        ? 1000
        : 2000;
  const explicit = CREATOR_SITE_PRIORITY_OVERRIDES[input.site];
  if (explicit !== undefined) {
    return marketBase + explicit;
  }
  return marketBase + 500 + (CREATOR_CATEGORY_PRIORITY[category] ?? CREATOR_CATEGORY_PRIORITY.other);
}

export function buildCommandTagCounts(commands: CliCommand[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const command of commands) {
    const market = inferMarket(command.site, command);
    const category = inferSiteCategory(command.site, command);
    const marketTag = `market:${market}`;
    const categoryTag = `siteCategory:${category}`;
    counts[marketTag] = (counts[marketTag] ?? 0) + 1;
    counts[categoryTag] = (counts[categoryTag] ?? 0) + 1;
  }
  return counts;
}
