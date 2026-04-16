function hasChineseText(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function humanizeSegment(segment: string): string {
  return segment
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const ACTION_ZH_MAP: Record<string, string> = {
  answer: '回答',
  article: '文章',
  articles: '文章',
  ask: '提问',
  asks: '卖单',
  auth: '授权',
  bestsellers: '畅销榜',
  books: '图书',
  businessweek: '商业周刊',
  channel: '频道',
  channels: '频道',
  check: '检查',
  comments: '评论',
  comment: '评论',
  config: '配置',
  depth: '深度数据',
  details: '详情',
  detail: '详情',
  doctor: '环境自检',
  download: '下载',
  dump: '页面导出',
  dynamic: '动态',
  economics: '经济',
  episodes: '单集',
  export: '导出',
  favorite: '收藏',
  feed: '动态',
  feeds: '信息流',
  headlines: '头条',
  follow: '关注',
  gainers: '涨幅榜',
  hot: '热点',
  'hot-stock': '热门股票',
  import: '导入',
  industries: '行业',
  install: '安装',
  klines: 'K线',
  latest: '最新内容',
  like: '点赞',
  list: '列表',
  lists: '列表',
  login: '登录',
  logout: '退出登录',
  losers: '跌幅榜',
  main: '首页头条',
  market: '市场',
  markets: '市场',
  me: '我的账号',
  mentions: '提及',
  message: '消息',
  messages: '消息',
  model: '模型',
  'movers-shakers': '飙升榜',
  news: '新闻',
  'new-releases': '新品榜',
  new: '新建',
  notifications: '通知',
  offer: '报价',
  offers: '报价',
  paper: '论文',
  papers: '论文',
  pairs: '交易对',
  politics: '政治',
  post: '帖子详情',
  posts: '帖子列表',
  price: '价格',
  prices: '价格',
  product: '商品',
  products: '商品',
  profile: '账号资料',
  quote: '报价',
  quotes: '报价',
  ranking: '排行榜',
  read: '读取',
  replies: '回复',
  reply: '回复',
  search: '搜索',
  'search-suggestions': '搜索建议',
  send: '发送',
  settings: '设置',
  status: '状态',
  transcript: '字幕',
  trades: '成交记录',
  trade: '交易记录',
  summary: '摘要',
  summaries: '摘要',
  tags: '标签',
  tag: '标签',
  top: '热门榜',
  topic: '话题',
  topics: '话题',
  trend: '趋势',
  trending: '趋势',
  trends: '趋势',
  upload: '上传',
  video: '视频',
  videos: '视频',
  watch: '监听',
};

const ACTION_TOKEN_ZH_MAP: Record<string, string> = {
  account: '账号',
  action: '操作',
  answer: '回答',
  article: '文章',
  articles: '文章',
  ask: '提问',
  asks: '卖单',
  asset: '素材',
  auth: '授权',
  best: '最佳',
  browser: '浏览器',
  books: '图书',
  channel: '频道',
  channels: '频道',
  check: '检查',
  cli: 'CLI',
  comment: '评论',
  comments: '评论',
  config: '配置',
  data: '数据',
  detail: '详情',
  details: '详情',
  doctor: '自检',
  download: '下载',
  dynamic: '动态',
  export: '导出',
  external: '外部',
  favorite: '收藏',
  feed: '动态',
  feeds: '信息流',
  follow: '关注',
  gainers: '涨幅榜',
  hot: '热点',
  install: '安装',
  klines: 'K线',
  latest: '最新',
  like: '点赞',
  list: '列表',
  lists: '列表',
  live: '直播',
  login: '登录',
  logout: '退出',
  losers: '跌幅榜',
  main: '首页',
  market: '市场',
  markets: '市场',
  me: '我的',
  mention: '提及',
  mentions: '提及',
  message: '消息',
  messages: '消息',
  model: '模型',
  new: '新建',
  news: '新闻',
  notification: '通知',
  notifications: '通知',
  offer: '报价',
  offers: '报价',
  paper: '论文',
  papers: '论文',
  post: '帖子',
  posts: '帖子',
  price: '价格',
  prices: '价格',
  product: '商品',
  products: '商品',
  profile: '资料',
  quote: '报价',
  quotes: '报价',
  rank: '排行',
  ranking: '排行榜',
  read: '读取',
  recent: '最近',
  recommendation: '推荐',
  recommendations: '推荐',
  reply: '回复',
  replies: '回复',
  search: '搜索',
  send: '发送',
  setup: '设置',
  snapshot: '快照',
  status: '状态',
  stock: '股票',
  suggestion: '建议',
  suggestions: '建议',
  summary: '摘要',
  summaries: '摘要',
  tag: '标签',
  tags: '标签',
  timeline: '时间线',
  tool: '工具',
  tools: '工具',
  top: '热门',
  topic: '话题',
  topics: '话题',
  trade: '交易',
  trades: '交易记录',
  trend: '趋势',
  trending: '趋势',
  trends: '趋势',
  transcript: '字幕',
  upload: '上传',
  user: '用户',
  video: '视频',
  videos: '视频',
  watch: '监听',
};

function translateActionSegment(segment: string): string {
  const normalized = segment.trim().toLowerCase();
  if (!normalized) return '';

  const direct = ACTION_ZH_MAP[normalized];
  if (direct) return direct;

  const tokens = normalized.split(/[-_]+/).filter(Boolean);
  if (!tokens.length) return normalized;

  const translatedTokens = tokens.map((token) => ACTION_TOKEN_ZH_MAP[token] ?? humanizeSegment(token));
  const translatedCount = tokens.filter((token) => ACTION_TOKEN_ZH_MAP[token]).length;

  if (translatedCount === 0) {
    return humanizeSegment(segment);
  }

  return translatedTokens.join('');
}

function joinSiteAndAction(siteLabel: string, actionLabel: string): string {
  if (!actionLabel) return siteLabel;

  const needsSpace = /[A-Za-z0-9)]$/.test(siteLabel);
  return needsSpace ? `${siteLabel} ${actionLabel}` : `${siteLabel}${actionLabel}`;
}

export function buildLocalizedCommandId(
  command: string,
  options: {
    locale: string;
    siteLabel: string;
  },
): string {
  if (options.locale !== 'zh-CN') return command;

  const [site = '', action = ''] = command.split('/', 2);
  const siteLabel = options.siteLabel || site || command;
  if (!action) return siteLabel;

  return `${siteLabel}/${translateActionSegment(action)}`;
}

export function buildLocalizedCommandTitle(
  command: string,
  originalDesc: string,
  options: {
    locale: string;
    siteLabel: string;
    mappedTitle?: string;
    siteAliases?: string[];
  },
): string {
  if (options.locale !== 'zh-CN') return originalDesc;
  if (options.mappedTitle?.trim()) {
    let title = options.mappedTitle.trim();
    for (const alias of options.siteAliases ?? []) {
      if (!alias.trim()) continue;
      title = title.replace(new RegExp(escapeRegExp(alias), 'g'), options.siteLabel);
    }
    return title;
  }
  if (originalDesc.trim() && hasChineseText(originalDesc)) return originalDesc.trim();

  const [, action = ''] = command.split('/', 2);
  const localizedAction = translateActionSegment(action);

  if (localizedAction) {
    return joinSiteAndAction(options.siteLabel, localizedAction);
  }

  return buildLocalizedCommandId(command, options);
}
