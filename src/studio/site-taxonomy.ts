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
  'band',
  'bilibili',
  'boss',
  'chaoxing',
  'cnki',
  'coupang',
  'ctrip',
  'douban',
  'doubao',
  'doubao-app',
  'douyin',
  'hupu',
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
  '36kr',
  'apple-podcasts',
  'arxiv',
  'barchart',
  'bbc',
  'bloomberg',
  'bluesky',
  'chatgpt',
  'chatgpt-app',
  'chatwise',
  'dictionary',
  'discord-app',
  'devto',
  'gitee',
  'google',
  'grok',
  'hackernews',
  'hf',
  'imdb',
  'instagram',
  'linkedin',
  'lobsters',
  'medium',
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
  'v2ex',
  'web',
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
  boss: 'commerce',
  chaoxing: 'knowledge',
  chatgpt: 'ai-tool',
  'chatgpt-app': 'ai-tool',
  chatwise: 'ai-tool',
  cnki: 'knowledge',
  ctrip: 'news',
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
  notion: 'utility',
  paperreview: 'knowledge',
  pixiv: 'media',
  producthunt: 'news',
  quark: 'utility',
  reddit: 'social',
  reuters: 'news',
  sinablog: 'news',
  sinafinance: 'finance',
  smzdm: 'commerce',
  spotify: 'media',
  stackoverflow: 'knowledge',
  steam: 'commerce',
  substack: 'media',
  taobao: 'commerce',
  tieba: 'social',
  tiktok: 'video',
  twitter: 'social',
  v2ex: 'social',
  web: 'utility',
  weibo: 'social',
  weixin: 'social',
  weread: 'knowledge',
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
