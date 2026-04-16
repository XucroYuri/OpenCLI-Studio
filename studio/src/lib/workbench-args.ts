import type { SelectOption } from 'naive-ui';
import type { StudioCommandArg } from '../types';

type LocalizedText = {
  zh: string;
  en: string;
};

export interface WorkbenchArgOption extends SelectOption {
  label: string;
  value: string;
}

export interface WorkbenchArgUi {
  kind: 'select' | 'number' | 'boolean' | 'text';
  label: string;
  hint: string;
  placeholder: string;
  options: WorkbenchArgOption[];
  disabled: boolean;
}

const CHINESE_RE = /[\u4e00-\u9fff]/;
const ACRONYMS: Record<string, string> = {
  ai: 'AI',
  css: 'CSS',
  html: 'HTML',
  id: 'ID',
  llms: 'LLMs',
  r18: 'R18',
  ui: 'UI',
  url: 'URL',
};

const GENERIC_LABELS: Record<string, LocalizedText> = {
  action: { zh: '操作方式', en: 'Action' },
  aweme_id: { zh: '作品 ID', en: 'Aweme ID' },
  bvid: { zh: 'BV 号', en: 'BV id' },
  caption: { zh: '正文内容', en: 'Caption' },
  category: { zh: '分类', en: 'Category' },
  city: { zh: '城市', en: 'City' },
  content: { zh: '内容', en: 'Content' },
  cover: { zh: '封面', en: 'Cover' },
  date: { zh: '日期', en: 'Date' },
  district: { zh: '区域', en: 'District' },
  execute: { zh: '执行写入', en: 'Execute write action' },
  filter: { zh: '筛选方式', en: 'Filter' },
  handle: { zh: '账号标识', en: 'Handle' },
  id: { zh: '内容 ID', en: 'Content ID' },
  image: { zh: '图片', en: 'Image' },
  index: { zh: '序号', en: 'Index' },
  input: { zh: '输入内容', en: 'Input' },
  'job-id': { zh: '职位 ID', en: 'Job ID' },
  keyword: { zh: '搜索关键词', en: 'Search keyword' },
  lang: { zh: '语言', en: 'Language' },
  limit: { zh: '返回数量', en: 'Result limit' },
  market: { zh: '市场', en: 'Market' },
  mode: { zh: '模式', en: 'Mode' },
  model: { zh: '模型', en: 'Model' },
  name: { zh: '名称', en: 'Name' },
  'no-download': { zh: '只返回链接', en: 'Skip download' },
  'note-id': { zh: '笔记 ID', en: 'Note ID' },
  output: { zh: '输出位置', en: 'Output path' },
  page: { zh: '页码', en: 'Page' },
  period: { zh: '时间范围', en: 'Time period' },
  'post-id': { zh: '帖子 ID', en: 'Post ID' },
  prompt: { zh: '提示词', en: 'Prompt' },
  query: { zh: '搜索关键词', en: 'Search query' },
  ratio: { zh: '画幅比例', en: 'Aspect ratio' },
  region: { zh: '地区', en: 'Region' },
  scale: { zh: '放大倍数', en: 'Scale' },
  sku: { zh: 'SKU', en: 'SKU' },
  sort: { zh: '排序方式', en: 'Sort order' },
  source: { zh: '来源', en: 'Source' },
  state: { zh: '状态', en: 'State' },
  status: { zh: '状态', en: 'Status' },
  symbol: { zh: '代码', en: 'Symbol' },
  tag: { zh: '标签', en: 'Tag' },
  target: { zh: '目标格式', en: 'Target' },
  team: { zh: '团队 ID', en: 'Team ID' },
  text: { zh: '文本内容', en: 'Text' },
  timeout: { zh: '等待时长', en: 'Timeout' },
  title: { zh: '标题', en: 'Title' },
  type: { zh: '类型', en: 'Type' },
  uid: { zh: '用户 ID', en: 'User ID' },
  url: { zh: '页面链接', en: 'URL' },
  username: { zh: '用户名', en: 'Username' },
  view: { zh: '查看方式', en: 'View' },
  visibility: { zh: '可见范围', en: 'Visibility' },
};

const GENERIC_HINTS: Record<string, LocalizedText> = {
  category: { zh: '按分类缩小范围，先选最接近的内容方向。', en: 'Narrow the result set with a category.' },
  execute: { zh: '打开后才会真正执行写入类操作。', en: 'Turn this on to actually perform the write action.' },
  id: { zh: '可直接粘贴详情链接，系统通常也能自动识别其中的 ID。', en: 'You can usually paste the detail URL directly instead of extracting the ID yourself.' },
  input: { zh: '优先粘贴详情页链接；如果支持，也可以直接填对应 ID。', en: 'Paste the detail URL first. If supported, you can also enter the raw ID.' },
  keyword: { zh: '输入你想找的主题词，越具体越容易得到有用结果。', en: 'Use specific keywords to get more useful results.' },
  lang: { zh: '填写语言代码，例如 zh、en、ja。', en: 'Enter a language code such as en, zh, or ja.' },
  limit: { zh: '控制返回条数，先用 10 到 20 条通常最容易阅读。', en: 'Start with 10 to 20 items for an easy-to-read result.' },
  market: { zh: '按市场缩小范围，减少无关结果。', en: 'Choose a market to avoid unrelated results.' },
  'no-download': { zh: '打开后只返回链接或地址，不会下载文件。', en: 'Turn this on to return links only and skip downloading files.' },
  output: { zh: '不填时通常会使用默认保存位置。', en: 'Leave blank to use the default save location when available.' },
  page: { zh: '页码通常从 1 开始。', en: 'Page numbers usually start at 1.' },
  period: { zh: '先选时间范围，再看结果变化会更清楚。', en: 'Pick a time window before comparing results.' },
  prompt: { zh: '用一句清楚的话描述你希望生成或处理的内容。', en: 'Describe what you want in one clear sentence.' },
  query: { zh: '输入你要搜索的关键词，尽量具体。', en: 'Type the keywords you want to search for.' },
  region: { zh: '填写国家或地区代码，例如 CN、US、JP。', en: 'Use a country or region code such as US, CN, or JP.' },
  sort: { zh: '按不同排序方式查看结果，更容易找到想看的内容。', en: 'Try a different sort order to surface the right results.' },
  status: { zh: '只看某一种状态时，结果会更聚焦。', en: 'Filter to one status when you want a more focused result.' },
  target: { zh: '选择导出格式或目标类型。', en: 'Choose the output format or target type.' },
  text: { zh: '输入准备发送或处理的文本内容。', en: 'Enter the text you want to send or process.' },
  timeout: { zh: '等待时长单位为秒，网络慢时可以适当加大。', en: 'This value is in seconds. Increase it if the site is slow.' },
  type: { zh: '先选择内容类型，可以更快收敛到目标结果。', en: 'Pick a content type first to narrow the results quickly.' },
  url: { zh: '粘贴完整页面链接即可。', en: 'Paste the full page URL.' },
  username: { zh: '输入账号名或个人主页链接都可以。', en: 'You can usually enter a username or paste the profile URL.' },
  visibility: { zh: '选择发布后谁可以看到这条内容。', en: 'Choose who can see the content after publishing.' },
};

const COMMAND_LABELS: Record<string, LocalizedText> = {
  '36kr/hot:type': { zh: '榜单类型', en: 'Feed type' },
  'bilibili/feed:type': { zh: '动态类型', en: 'Feed type' },
  'bilibili/search:type': { zh: '搜索范围', en: 'Search scope' },
  'douban/marks:status': { zh: '标记状态', en: 'Shelf status' },
  'douyin/videos:status': { zh: '作品状态', en: 'Video status' },
  'ones/my-tasks:mode': { zh: '任务归属', en: 'Task ownership' },
  'sinafinance/news:type': { zh: '新闻分类', en: 'News category' },
  'twitter/timeline:type': { zh: '时间线类型', en: 'Timeline type' },
  'weibo/feed:type': { zh: '信息流类型', en: 'Feed type' },
  'xiaohongshu/notifications:type': { zh: '通知类型', en: 'Notification type' },
  'xueqiu/hot-stock:type': { zh: '榜单类型', en: 'Ranking type' },
  'youtube/search:type': { zh: '内容类型', en: 'Content type' },
  'youtube/transcript:mode': { zh: '字幕输出方式', en: 'Transcript format' },
};

const COMMAND_HINTS: Record<string, LocalizedText> = {
  '36kr/hot:type': { zh: '选择你要看的 36 氪热点榜单。', en: 'Choose which 36Kr hot list to load.' },
  'bilibili/feed:type': { zh: '只看视频、专栏、图文或全部动态。', en: 'Limit the feed to videos, articles, image posts, or everything.' },
  'bilibili/search:type': { zh: '选择搜视频还是搜用户。', en: 'Choose whether to search videos or users.' },
  'hupu/search:sort': { zh: '按综合、发布时间、回复时间等方式排序。', en: 'Sort by relevance, publish time, reply time, and more.' },
  'ones/my-tasks:mode': { zh: '决定任务列表按“指派给我”还是“我创建的”等方式筛选。', en: 'Choose whether the task list shows assigned items, created items, or both.' },
  'producthunt/browse:category': { zh: '选择 Product Hunt 分类，方便直接进入对应赛道。', en: 'Pick a Product Hunt category to jump into the right track faster.' },
  'producthunt/posts:category': { zh: '用分类筛掉无关产品，先看更贴近当前任务的方向。', en: 'Use a category to filter out unrelated products.' },
  'reddit/read:sort': { zh: '选择评论排序方式。', en: 'Choose how comments should be sorted.' },
  'reddit/search:sort': { zh: '选择搜索结果排序方式。', en: 'Choose how search results should be sorted.' },
  'reddit/subreddit:sort': { zh: '选择版块内容的排序方式。', en: 'Choose how subreddit posts should be sorted.' },
  'sinafinance/news:type': { zh: '按新闻栏目过滤结果。', en: 'Filter results by news category.' },
  'sinafinance/stock:market': { zh: '按 A 股、港股、美股或自动识别来查找股票。', en: 'Choose A-shares, Hong Kong, US, or auto-detect.' },
  'substack/feed:category': { zh: '按文章分类筛选 Newsletter 内容。', en: 'Filter the newsletter feed by category.' },
  'xiaohongshu/notifications:type': { zh: '只看提及、点赞或新关系提醒。', en: 'Show only mentions, likes, or connection updates.' },
  'xueqiu/hot-stock:type': { zh: '在人气榜和关注榜之间切换。', en: 'Switch between the popularity and watchlist rankings.' },
  'youtube/search:sort': { zh: '按相关度、最新、观看量或评分排序。', en: 'Sort YouTube results by relevance, date, views, or rating.' },
  'youtube/search:type': { zh: '只看 Shorts、视频、频道或播放列表。', en: 'Limit results to shorts, videos, channels, or playlists.' },
  'youtube/transcript:mode': { zh: '整理成段落更适合阅读，原始模式更适合后续处理。', en: 'Grouped mode is easier to read. Raw mode is better for downstream processing.' },
};

const PLACEHOLDER_OVERRIDES: Record<string, LocalizedText> = {
  'google/news:lang': { zh: '例如 en、zh', en: 'For example: en, zh' },
  'google/search:lang': { zh: '例如 en、zh', en: 'For example: en, zh' },
  'google/suggest:lang': { zh: '例如 zh-CN、en-US', en: 'For example: zh-CN, en-US' },
  'google/news:region': { zh: '例如 US、CN', en: 'For example: US, CN' },
  'google/trends:region': { zh: '例如 US、CN、JP', en: 'For example: US, CN, JP' },
  'youtube/transcript:lang': { zh: '例如 zh-Hans、en', en: 'For example: zh-Hans, en' },
};

const COMMON_VALUE_LABELS: Record<string, LocalizedText> = {
  all: { zh: '全部', en: 'All' },
  article: { zh: '文章', en: 'Article' },
  auto: { zh: '自动识别', en: 'Auto' },
  best: { zh: '最佳', en: 'Best' },
  book: { zh: '图书', en: 'Book' },
  business: { zh: '商业', en: 'Business' },
  call: { zh: '看涨', en: 'Call' },
  catalog: { zh: '热门资讯', en: 'Hot news' },
  category: { zh: '分类', en: 'Category' },
  channel: { zh: '频道', en: 'Channel' },
  cn: { zh: '中国大陆', en: 'China' },
  collect: { zh: '看过', en: 'Collected' },
  comment: { zh: '评论', en: 'Comment' },
  comments: { zh: '评论数', en: 'Comments' },
  connections: { zh: '新关系', en: 'Connections' },
  controversial: { zh: '有争议', en: 'Controversial' },
  culture: { zh: '文化', en: 'Culture' },
  created: { zh: '创建时间', en: 'Created time' },
  createtime: { zh: '发布时间', en: 'Publish time' },
  daily: { zh: '近一天', en: 'Daily' },
  date: { zh: '最新', en: 'Date' },
  date_d: { zh: '最新发布', en: 'Newest first' },
  default: { zh: '默认', en: 'Default' },
  'developer-tools': { zh: '开发者工具', en: 'Developer tools' },
  'design-creative': { zh: '设计创意', en: 'Design & creative' },
  do: { zh: '在看', en: 'Watching' },
  draw: { zh: '图文', en: 'Image post' },
  'engineering-development': { zh: '工程开发', en: 'Engineering & development' },
  exact: { zh: '精确匹配', en: 'Exact match' },
  female: { zh: '女性向', en: 'Female-focused' },
  finance: { zh: '金融', en: 'Finance' },
  following: { zh: '仅看关注', en: 'Following' },
  followers: { zh: '新关注', en: 'Followers' },
  'for-you': { zh: '为你推荐', en: 'For you' },
  friends: { zh: '好友可见', en: 'Friends' },
  ft: { zh: '期货', en: 'Futures' },
  general: { zh: '综合', en: 'General' },
  grouped: { zh: '分段整理', en: 'Grouped' },
  graded: { zh: '已评分', en: 'Graded' },
  health: { zh: '健康', en: 'Health' },
  hk: { zh: '港股', en: 'Hong Kong' },
  hot: { zh: '热门', en: 'Hot' },
  html: { zh: 'HTML', en: 'HTML' },
  image: { zh: '图片', en: 'Image' },
  likes: { zh: '点赞', en: 'Likes' },
  llms: { zh: '大语言模型', en: 'LLMs' },
  light: { zh: '亮帖', en: 'Featured replies' },
  lower: { zh: '下装', en: 'Lower body' },
  latest: { zh: '最新', en: 'Latest' },
  male: { zh: '男性向', en: 'Male-focused' },
  'marketing-sales': { zh: '市场销售', en: 'Marketing & sales' },
  mentions: { zh: '提及', en: 'Mentions' },
  monthly: { zh: '近一月', en: 'Monthly' },
  movie: { zh: '电影', en: 'Movie' },
  music: { zh: '音乐', en: 'Music' },
  new: { zh: '最新', en: 'Newest' },
  no: { zh: '否', en: 'No' },
  'no-code-platforms': { zh: '无代码平台', en: 'No-code platforms' },
  off: { zh: '关闭', en: 'Off' },
  ongoing: { zh: '进行中', en: 'Ongoing' },
  on: { zh: '开启', en: 'On' },
  op_likes: { zh: '楼主获赞', en: 'OP likes' },
  original: { zh: '原创', en: 'Original' },
  overall: { zh: '连体', en: 'Overall' },
  pending: { zh: '待完成', en: 'Pending' },
  phone: { zh: '手机号', en: 'Phone' },
  playlist: { zh: '播放列表', en: 'Playlist' },
  politics: { zh: '政治', en: 'Politics' },
  popular_d: { zh: '热门优先', en: 'Popular first' },
  popular_female_d: { zh: '女性向热门', en: 'Popular female-focused' },
  popular_male_d: { zh: '男性向热门', en: 'Popular male-focused' },
  posters: { zh: '活跃参与者', en: 'Active posters' },
  posts: { zh: '文章', en: 'Posts' },
  private: { zh: '仅自己', en: 'Private' },
  productivity: { zh: '效率工具', en: 'Productivity' },
  public: { zh: '公开', en: 'Public' },
  publications: { zh: 'Newsletter', en: 'Publications' },
  put: { zh: '看跌', en: 'Put' },
  qa: { zh: '问答优先', en: 'Q&A' },
  quarterly: { zh: '近一季', en: 'Quarterly' },
  raw: { zh: '原始逐条', en: 'Raw' },
  react: { zh: 'React', en: 'React' },
  relevance: { zh: '相关度', en: 'Relevance' },
  renqi: { zh: '人气', en: 'Popularity' },
  reply: { zh: '回复数', en: 'Replies' },
  replytime: { zh: '最新回复', en: 'Recent replies' },
  reviewing: { zh: '审核中', en: 'Reviewing' },
  rising: { zh: '上升中', en: 'Rising' },
  rookie: { zh: '新人', en: 'Rookie' },
  safe: { zh: '安全内容', en: 'Safe' },
  sale: { zh: '销量', en: 'Sales' },
  science: { zh: '科学', en: 'Science' },
  scheduled: { zh: '已定时', en: 'Scheduled' },
  search: { zh: '关键词搜索', en: 'Search' },
  shoucang: { zh: '收藏', en: 'Saved' },
  shorts: { zh: 'Shorts 短视频', en: 'Shorts' },
  'social-community': { zh: '社交社区', en: 'Social & community' },
  submitted: { zh: '已提交', en: 'Submitted' },
  suggest: { zh: '智能推荐', en: 'Suggest' },
  tech: { zh: '科技', en: 'Tech' },
  text: { zh: '文字', en: 'Text' },
  thinking: { zh: '深度思考', en: 'Thinking' },
  thirty: { zh: '近 30 天', en: 'Last 30 days' },
  tool: { zh: '工具', en: 'Tool' },
  top: { zh: '精华', en: 'Top' },
  upper: { zh: '上装', en: 'Upper body' },
  upcoming: { zh: '未开始', en: 'Upcoming' },
  us: { zh: '美股', en: 'US' },
  user: { zh: '用户', en: 'User' },
  video: { zh: '视频', en: 'Video' },
  'vibe-coding': { zh: '氛围编程', en: 'Vibe coding' },
  views: { zh: '观看量', en: 'Views' },
  vue: { zh: 'Vue', en: 'Vue' },
  weekly: { zh: '近一周', en: 'Weekly' },
  wechat: { zh: '微信', en: 'WeChat' },
  wh: { zh: '外汇', en: 'Forex' },
  wish: { zh: '想看', en: 'Wish list' },
  yearly: { zh: '近一年', en: 'Yearly' },
  yes: { zh: '是', en: 'Yes' },
  zonghe: { zh: '综合', en: 'Comprehensive' },
};

const COMMAND_VALUE_LABELS: Record<string, LocalizedText> = {
  'ones/my-tasks:mode:assign': { zh: '指派给我', en: 'Assigned to me' },
  'ones/my-tasks:mode:field004': { zh: '负责人字段', en: 'Owner field' },
  'ones/my-tasks:mode:owner': { zh: '我创建的', en: 'Created by me' },
  'ones/my-tasks:mode:both': { zh: '两者都算', en: 'Assigned or created' },
  'pixiv/ranking:mode:daily_r18': { zh: 'R18 日榜', en: 'Daily R18' },
  'pixiv/ranking:mode:weekly_r18': { zh: 'R18 周榜', en: 'Weekly R18' },
  'pixiv/search:mode:r18': { zh: 'R18', en: 'R18' },
  'sinafinance/news:type:0': { zh: '全部', en: 'All' },
  'sinafinance/news:type:1': { zh: 'A 股', en: 'A-shares' },
  'sinafinance/news:type:2': { zh: '宏观', en: 'Macro' },
  'sinafinance/news:type:3': { zh: '公司', en: 'Company' },
  'sinafinance/news:type:4': { zh: '数据', en: 'Data' },
  'sinafinance/news:type:5': { zh: '市场', en: 'Market' },
  'sinafinance/news:type:6': { zh: '国际', en: 'International' },
  'sinafinance/news:type:7': { zh: '观点', en: 'Opinion' },
  'sinafinance/news:type:8': { zh: '央行', en: 'Central bank' },
  'sinafinance/news:type:9': { zh: '其它', en: 'Other' },
  'xueqiu/hot-stock:type:10': { zh: '人气榜', en: 'Popularity ranking' },
  'xueqiu/hot-stock:type:12': { zh: '关注榜', en: 'Watchlist ranking' },
  'yollomi/generate:ratio:1:1': { zh: '1:1 方形', en: '1:1 square' },
  'yollomi/generate:ratio:16:9': { zh: '16:9 横屏', en: '16:9 landscape' },
  'yollomi/generate:ratio:9:16': { zh: '9:16 竖屏', en: '9:16 portrait' },
  'yollomi/generate:ratio:4:3': { zh: '4:3 标准横版', en: '4:3 standard' },
  'yollomi/generate:ratio:3:4': { zh: '3:4 标准竖版', en: '3:4 standard' },
  'yollomi/video:ratio:1:1': { zh: '1:1 方形', en: '1:1 square' },
  'yollomi/video:ratio:16:9': { zh: '16:9 横屏', en: '16:9 landscape' },
  'yollomi/video:ratio:9:16': { zh: '9:16 竖屏', en: '9:16 portrait' },
  'yollomi/video:ratio:4:3': { zh: '4:3 标准横版', en: '4:3 standard' },
  'yollomi/video:ratio:3:4': { zh: '3:4 标准竖版', en: '3:4 standard' },
};

function isChineseLocale(locale: string): boolean {
  return locale.toLowerCase().startsWith('zh');
}

function pickLocaleText(value: LocalizedText, locale: string): string {
  return isChineseLocale(locale) ? value.zh : value.en;
}

function normalizeHelp(help: string | undefined): string {
  return typeof help === 'string' ? help.trim() : '';
}

function hasChinese(text: string): boolean {
  return CHINESE_RE.test(text);
}

function toCommandArgKey(commandName: string, argName: string): string {
  return `${commandName}:${argName}`;
}

function toCommandArgValueKey(commandName: string, argName: string, value: string): string {
  return `${commandName}:${argName}:${value}`;
}

function humanizeEnglishToken(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => ACRONYMS[part.toLowerCase()] ?? `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function resolveLabel(commandName: string, argName: string, locale: string): string {
  const commandLabel = COMMAND_LABELS[toCommandArgKey(commandName, argName)];
  if (commandLabel) return pickLocaleText(commandLabel, locale);

  const genericLabel = GENERIC_LABELS[argName];
  if (genericLabel) return pickLocaleText(genericLabel, locale);

  return humanizeEnglishToken(argName);
}

function resolveChoiceLabel(commandName: string, argName: string, value: string, locale: string): string {
  const commandValue = COMMAND_VALUE_LABELS[toCommandArgValueKey(commandName, argName, value)];
  if (commandValue) return pickLocaleText(commandValue, locale);

  const commonValue = COMMON_VALUE_LABELS[value];
  if (commonValue) return pickLocaleText(commonValue, locale);

  return humanizeEnglishToken(value);
}

function inferOptionsHint(options: WorkbenchArgOption[], locale: string): string {
  if (!options.length) return '';
  if (options.length <= 6) {
    return isChineseLocale(locale)
      ? `可选：${options.map((option) => option.label).join('、')}。`
      : `Options: ${options.map((option) => option.label).join(', ')}.`;
  }

  return isChineseLocale(locale)
    ? '请从下拉列表中选择。'
    : 'Choose one option from the list.';
}

function resolveHint(commandName: string, arg: StudioCommandArg, locale: string, options: WorkbenchArgOption[]): string {
  const commandHint = COMMAND_HINTS[toCommandArgKey(commandName, arg.name)];
  if (commandHint) return pickLocaleText(commandHint, locale);

  const genericHint = GENERIC_HINTS[arg.name];
  const help = normalizeHelp(arg.help);

  if (isChineseLocale(locale)) {
    if (genericHint) return pickLocaleText(genericHint, locale);
    if (help && hasChinese(help)) return help;
    if (options.length) return inferOptionsHint(options, locale);
    if (help) return help;
    return arg.required ? '这是必填项。' : '';
  }

  if (help) return help;
  if (genericHint) return pickLocaleText(genericHint, locale);
  if (options.length) return inferOptionsHint(options, locale);
  return arg.required ? 'This field is required.' : '';
}

function resolvePlaceholder(commandName: string, arg: StudioCommandArg, locale: string, kind: WorkbenchArgUi['kind'], label: string, options: WorkbenchArgOption[]): string {
  const override = PLACEHOLDER_OVERRIDES[toCommandArgKey(commandName, arg.name)];
  if (override) return pickLocaleText(override, locale);

  if (kind === 'select') {
    if (options.length === 1) {
      return options[0]?.label ?? '';
    }
    return isChineseLocale(locale) ? `请选择${label}` : `Select ${label.toLowerCase()}`;
  }

  const genericPlaceholder = (() => {
    switch (arg.name) {
      case 'query':
      case 'keyword':
        return isChineseLocale(locale) ? '输入想查找的关键词' : 'Enter keywords';
      case 'url':
        return isChineseLocale(locale) ? '粘贴完整页面链接' : 'Paste the full URL';
      case 'id':
      case 'input':
      case 'note-id':
      case 'post-id':
      case 'bvid':
      case 'aweme_id':
        return isChineseLocale(locale) ? '输入 ID 或直接粘贴对应链接' : 'Enter an ID or paste the matching URL';
      case 'username':
      case 'handle':
        return isChineseLocale(locale) ? '输入用户名或主页链接' : 'Enter a username or profile URL';
      case 'page':
        return isChineseLocale(locale) ? '例如 1' : 'For example: 1';
      case 'limit':
        return isChineseLocale(locale) ? '例如 10 或 20' : 'For example: 10 or 20';
      case 'lang':
        return isChineseLocale(locale) ? '例如 zh、en、ja' : 'For example: zh, en, ja';
      case 'region':
        return isChineseLocale(locale) ? '例如 CN、US、JP' : 'For example: CN, US, JP';
      case 'market':
        return isChineseLocale(locale) ? '例如 cn、hk、us' : 'For example: cn, hk, us';
      case 'timeout':
        return isChineseLocale(locale) ? '单位：秒' : 'In seconds';
      case 'date':
        return isChineseLocale(locale) ? '例如 2026-04-15' : 'For example: 2026-04-15';
      case 'prompt':
        return isChineseLocale(locale) ? '用一句话描述你想要的效果' : 'Describe the result you want';
      case 'output':
        return isChineseLocale(locale) ? '可选：填写保存位置' : 'Optional: enter a save path';
      default:
        return kind === 'number'
          ? (isChineseLocale(locale) ? `输入${label}` : `Enter ${label.toLowerCase()}`)
          : (isChineseLocale(locale) ? `填写${label}` : `Enter ${label.toLowerCase()}`);
    }
  })();

  return genericPlaceholder;
}

export function inferWorkbenchFieldKind(arg: StudioCommandArg): WorkbenchArgUi['kind'] {
  if (arg.choices?.length) return 'select';

  const normalizedType = String(arg.type ?? '').toLowerCase();
  if (normalizedType.includes('bool') || typeof arg.default === 'boolean') return 'boolean';
  if (normalizedType.includes('int') || normalizedType.includes('number') || normalizedType.includes('float') || typeof arg.default === 'number') {
    return 'number';
  }

  return 'text';
}

export function buildWorkbenchArgUi(commandName: string, arg: StudioCommandArg, locale: string): WorkbenchArgUi {
  const kind = inferWorkbenchFieldKind(arg);
  const options = kind === 'select'
    ? (arg.choices ?? []).map((choice) => ({
        label: resolveChoiceLabel(commandName, arg.name, choice, locale),
        value: choice,
      }))
    : [];
  const label = resolveLabel(commandName, arg.name, locale);

  return {
    kind,
    label,
    hint: resolveHint(commandName, arg, locale, options),
    placeholder: resolvePlaceholder(commandName, arg, locale, kind, label, options),
    options,
    disabled: kind === 'select' && options.length === 1,
  };
}
