import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  captureSnapshot as requestCaptureSnapshot,
  deleteJob as requestDeleteJob,
  deletePreset as requestDeletePreset,
  executeCommand as postExecuteCommand,
  fetchDoctor,
  fetchEnv,
  fetchExternalClis,
  fetchFavorites,
  fetchHistory,
  fetchJobs,
  fetchPresets,
  fetchPlugins,
  fetchRecipes,
  fetchRegistry,
  fetchSnapshots,
  runJobNow as requestRunJobNow,
  saveJob as requestSaveJob,
  savePreset as requestSavePreset,
  setFavorite as requestSetFavorite,
} from '../lib/api';
import { listWorkbenchCommands, pickDefaultWorkbenchCommand } from '../lib/registry';
import type {
  ExecuteResponse,
  StudioExternalCliEntry,
  StudioFavoriteEntry,
  StudioFavoriteKind,
  StudioDoctorResult,
  StudioEnv,
  StudioHistoryEntry,
  StudioJobEntry,
  StudioPluginEntry,
  StudioPresetEntry,
  StudioPresetKind,
  StudioRecipe,
  StudioRegistryPayload,
  StudioSnapshotEntry,
  StudioSnapshotSourceKind,
} from '../types';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readBooleanPreference(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === '1';
}

function writeBooleanPreference(key: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value ? '1' : '0');
}

export const useStudioStore = defineStore('studio', () => {
  const registry = ref<StudioRegistryPayload>({ commands: [], sites: [] });
  const env = ref<StudioEnv | null>(null);
  const history = ref<StudioHistoryEntry[]>([]);
  const recentSnapshots = ref<StudioSnapshotEntry[]>([]);
  const snapshotsBySource = ref<Record<string, StudioSnapshotEntry[]>>({});
  const jobs = ref<StudioJobEntry[]>([]);
  const plugins = ref<StudioPluginEntry[]>([]);
  const externalClis = ref<StudioExternalCliEntry[]>([]);
  const recipes = ref<StudioRecipe[]>([]);
  const favorites = ref<StudioFavoriteEntry[]>([]);
  const presets = ref<StudioPresetEntry[]>([]);
  const doctor = ref<StudioDoctorResult | null>(null);
  const lastExecution = ref<ExecuteResponse | null>(null);
  const stagedWorkbenchArgs = ref<Record<string, unknown> | null>(null);
  const stagedInsightArgs = ref<Record<string, unknown> | null>(null);

  const initializing = ref(false);
  const runningCommand = ref(false);
  const runningSnapshot = ref(false);
  const runningDoctor = ref(false);
  const loadError = ref<string | null>(null);
  const executionError = ref<string | null>(null);

  const selectedCommand = ref('');
  const selectedRecipeId = ref('');
  const advancedMode = ref(readBooleanPreference('opencli-studio:advanced-mode', false));

  const selectedCommandItem = computed(() =>
    registry.value.commands.find((command) => command.command === selectedCommand.value) ?? null,
  );
  const selectedRecipe = computed(() =>
    recipes.value.find((recipe) => recipe.id === selectedRecipeId.value) ?? null,
  );
  const availableWorkbenchCommands = computed(() =>
    listWorkbenchCommands(registry.value.commands, advancedMode.value),
  );
  const favoriteCommandIds = computed(() =>
    new Set(
      favorites.value
        .filter((entry) => entry.kind === 'command')
        .map((entry) => entry.targetId),
    ),
  );
  const favoriteRecipeIds = computed(() =>
    new Set(
      favorites.value
        .filter((entry) => entry.kind === 'recipe')
        .map((entry) => entry.targetId),
    ),
  );
  const registryPresets = computed(() =>
    presets.value.filter((preset) => preset.kind === 'registry'),
  );
  const workbenchPresets = computed(() =>
    presets.value.filter((preset) => preset.kind === 'workbench'),
  );
  const insightPresets = computed(() =>
    presets.value.filter((preset) => preset.kind === 'insight'),
  );

  function snapshotKey(sourceKind: StudioSnapshotSourceKind, sourceId: string): string {
    return `${sourceKind}:${sourceId}`;
  }

  function ensureSelectedCommand(): void {
    const nextCommand = pickDefaultWorkbenchCommand(
      registry.value.commands,
      selectedCommand.value,
      advancedMode.value,
    );

    if (nextCommand) {
      selectedCommand.value = nextCommand;
    }
  }

  function setSelectedCommand(command: string): void {
    selectedCommand.value = command;
  }

  function setSelectedRecipe(recipeId: string): void {
    selectedRecipeId.value = recipeId;
  }

  function setAdvancedMode(value: boolean): void {
    advancedMode.value = value;
    writeBooleanPreference('opencli-studio:advanced-mode', value);
    ensureSelectedCommand();
  }

  async function loadShell(force: boolean = false): Promise<void> {
    if (initializing.value) return;
    if (!force && registry.value.commands.length > 0 && env.value) return;

    initializing.value = true;
    loadError.value = null;

    try {
      const [
        registryPayload,
        historyPayload,
        envPayload,
        recipePayload,
        pluginsPayload,
        externalPayload,
        favoritesPayload,
        presetsPayload,
        jobsPayload,
        snapshotsPayload,
      ] = await Promise.all([
        fetchRegistry(),
        fetchHistory(),
        fetchEnv(),
        fetchRecipes(),
        fetchPlugins(),
        fetchExternalClis(),
        fetchFavorites(),
        fetchPresets(),
        fetchJobs(),
        fetchSnapshots({ limit: 12 }),
      ]);

      registry.value = registryPayload;
      history.value = historyPayload.entries;
      env.value = envPayload;
      recipes.value = recipePayload.recipes;
      plugins.value = pluginsPayload.entries;
      externalClis.value = externalPayload.entries;
      favorites.value = favoritesPayload.entries;
      presets.value = presetsPayload.presets;
      jobs.value = jobsPayload.jobs;
      recentSnapshots.value = snapshotsPayload.entries;

      selectedCommand.value = pickDefaultWorkbenchCommand(
        registryPayload.commands,
        selectedCommand.value,
        advancedMode.value,
      );
      if (!selectedRecipeId.value) {
        selectedRecipeId.value = recipePayload.recipes[0]?.id ?? '';
      }
    } catch (error) {
      loadError.value = getErrorMessage(error);
    } finally {
      initializing.value = false;
    }
  }

  function stageWorkbenchArgs(args: Record<string, unknown>): void {
    stagedWorkbenchArgs.value = { ...args };
  }

  function consumeWorkbenchArgs(): Record<string, unknown> | null {
    const nextArgs = stagedWorkbenchArgs.value;
    stagedWorkbenchArgs.value = null;
    return nextArgs;
  }

  function stageInsightArgs(args: Record<string, unknown>): void {
    stagedInsightArgs.value = { ...args };
  }

  function consumeInsightArgs(): Record<string, unknown> | null {
    const nextArgs = stagedInsightArgs.value;
    stagedInsightArgs.value = null;
    return nextArgs;
  }

  function upsertHistory(entry: StudioHistoryEntry): void {
    history.value = [entry, ...history.value.filter((item) => item.id !== entry.id)].slice(0, 50);
  }

  function upsertSnapshot(entry: StudioSnapshotEntry): void {
    recentSnapshots.value = [entry, ...recentSnapshots.value.filter((item) => item.id !== entry.id)].slice(0, 20);
    const key = snapshotKey(entry.sourceKind, entry.sourceId);
    const current = snapshotsBySource.value[key] ?? [];
    snapshotsBySource.value = {
      ...snapshotsBySource.value,
      [key]: [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, 50),
    };
  }

  function upsertJob(entry: StudioJobEntry): void {
    jobs.value = [entry, ...jobs.value.filter((item) => item.id !== entry.id)];
  }

  async function runCommand(command: string, args: Record<string, unknown>): Promise<ExecuteResponse> {
    runningCommand.value = true;
    executionError.value = null;

    try {
      const response = await postExecuteCommand(command, args);
      lastExecution.value = response;
      upsertHistory(response.historyEntry);
      selectedCommand.value = command;
      return response;
    } catch (error) {
      executionError.value = getErrorMessage(error);
      throw error;
    } finally {
      runningCommand.value = false;
    }
  }

  async function runRecipe(recipeId: string, overrides: Record<string, unknown> = {}): Promise<ExecuteResponse> {
    const recipe = recipes.value.find((item) => item.id === recipeId);
    if (!recipe) {
      throw new Error(`Unknown recipe: ${recipeId}`);
    }

    selectedRecipeId.value = recipeId;
    return runCommand(recipe.command, {
      ...recipe.defaultArgs,
      ...overrides,
    });
  }

  async function refreshHistory(): Promise<void> {
    const historyPayload = await fetchHistory();
    history.value = historyPayload.entries;
  }

  async function refreshRecentSnapshots(): Promise<void> {
    const snapshotsPayload = await fetchSnapshots({ limit: 12 });
    recentSnapshots.value = snapshotsPayload.entries;
  }

  async function refreshSnapshots(sourceKind: StudioSnapshotSourceKind, sourceId: string, limit: number = 40): Promise<void> {
    const snapshotsPayload = await fetchSnapshots({ sourceKind, sourceId, limit });
    snapshotsBySource.value = {
      ...snapshotsBySource.value,
      [snapshotKey(sourceKind, sourceId)]: snapshotsPayload.entries,
    };
  }

  async function refreshFavorites(): Promise<void> {
    const favoritesPayload = await fetchFavorites();
    favorites.value = favoritesPayload.entries;
  }

  async function refreshPresets(): Promise<void> {
    const presetsPayload = await fetchPresets();
    presets.value = presetsPayload.presets;
  }

  async function refreshJobs(): Promise<void> {
    const jobsPayload = await fetchJobs();
    jobs.value = jobsPayload.jobs;
  }

  async function refreshOpsInventory(): Promise<void> {
    const [envPayload, pluginsPayload, externalPayload] = await Promise.all([
      fetchEnv(),
      fetchPlugins(),
      fetchExternalClis(),
    ]);
    env.value = envPayload;
    plugins.value = pluginsPayload.entries;
    externalClis.value = externalPayload.entries;
  }

  async function captureSourceSnapshot(input: {
    sourceKind: StudioSnapshotSourceKind;
    sourceId: string;
    command?: string;
    args?: Record<string, unknown>;
  }): Promise<StudioSnapshotEntry> {
    runningSnapshot.value = true;
    executionError.value = null;

    try {
      const response = await requestCaptureSnapshot(input);
      upsertSnapshot(response.snapshot);
      return response.snapshot;
    } catch (error) {
      executionError.value = getErrorMessage(error);
      throw error;
    } finally {
      runningSnapshot.value = false;
    }
  }

  async function saveJob(input: {
    id?: number;
    sourceKind: StudioSnapshotSourceKind;
    sourceId: string;
    command: string;
    name: string;
    description?: string | null;
    args: Record<string, unknown>;
    intervalMinutes: number;
    enabled: boolean;
  }): Promise<StudioJobEntry> {
    const response = await requestSaveJob(input);
    upsertJob(response.job);
    return response.job;
  }

  async function runJobNow(id: number): Promise<{ job: StudioJobEntry; snapshot: StudioSnapshotEntry }> {
    const response = await requestRunJobNow(id);
    upsertJob(response.job);
    upsertSnapshot(response.snapshot);
    return response;
  }

  async function deleteJob(id: number): Promise<void> {
    await requestDeleteJob(id);
    jobs.value = jobs.value.filter((job) => job.id !== id);
  }

  async function toggleFavorite(
    kind: StudioFavoriteKind,
    targetId: string,
    favorite: boolean,
  ): Promise<void> {
    await requestSetFavorite(kind, targetId, favorite);
    await refreshFavorites();
  }

  async function savePreset(input: {
    id?: number;
    kind: StudioPresetKind;
    name: string;
    description?: string | null;
    state: Record<string, unknown>;
  }): Promise<StudioPresetEntry> {
    const response = await requestSavePreset(input);
    const nextPreset = response.preset;
    presets.value = [nextPreset, ...presets.value.filter((preset) => preset.id !== nextPreset.id)];
    return nextPreset;
  }

  async function deletePreset(id: number): Promise<void> {
    await requestDeletePreset(id);
    presets.value = presets.value.filter((preset) => preset.id !== id);
  }

  async function runDoctor(options: { live?: boolean; sessions?: boolean } = {}): Promise<void> {
    runningDoctor.value = true;

    try {
      doctor.value = await fetchDoctor(options);
    } finally {
      runningDoctor.value = false;
    }
  }

  // ── 站点→市场（国内/国际）映射 ──

  const domesticSites = new Set([
    '1688', '36kr', 'bilibili', 'boss', 'chaoxing', 'chatwise', 'cnki',
    'ctrip', 'douban', 'doubao', 'doubao-app', 'douyin', 'gitee', 'hupu',
    'jd', 'jianyu', 'jike', 'jimeng', 'ke', 'linux-do', 'maimai', 'mubu',
    'ones', 'paperreview', 'quark', 'sinablog', 'sinafinance', 'smzdm',
    'taobao', 'tieba', 'v2ex', 'weibo', 'weixin', 'weread', 'xianyu',
    'xiaoe', 'xiaohongshu', 'xiaoyuzhou', 'xueqiu', 'yuanbao', 'yollomi',
    'zhihu', 'zsxq',
  ]);

  function isSiteDomestic(site: string): boolean {
    return domesticSites.has(site);
  }

  // ── 站点→中文显示名映射 ──

  const siteZhNameMap: Record<string, string> = {
    bilibili: '哔哩哔哩', douyin: '抖音', xiaohongshu: '小红书',
    weibo: '微博', zhihu: '知乎', douban: '豆瓣', jike: '即刻',
    tieba: '贴吧', weixin: '微信', hupu: '虎扑', xiaoyuzhou: '小宇宙',
    zsxq: '知识星球', maimai: '脉脉', weread: '微信读书',
    '36kr': '36氪', sinablog: '新浪博客', sinafinance: '新浪财经',
    jd: '京东', taobao: '淘宝', ctrip: '携程', smzdm: '什么值得买',
    xianyu: '闲鱼', ke: '贝壳找房', cnki: '中国知网', chaoxing: '超星学习通',
    doubao: '豆包', 'doubao-app': '豆包 App', jimeng: '即梦',
    mubu: '幕布', quark: '夸克', yuanbao: '元宝', xiaoe: '小鹅通',
    jianyu: '简鱼', boss: 'BOSS直聘', yollomi: 'Yollomi',
    chatwise: 'ChatWise', paperreview: '论文评审',
    xueqiu: '雪球', wikipedia: '维基百科', linkedin: '领英',
  };

  function getSiteDisplayName(site: string, locale: string): string {
    if (locale === 'zh-CN') {
      return siteZhNameMap[site] ?? site;
    }
    return site;
  }

  // ── 命令→中文描述映射 ──

  const commandZhDescMap: Record<string, string> = {
    // 36kr
    '36kr/news': '36氪最新科技/创业资讯',
    // amazon
    'amazon/bestsellers': '亚马逊畅销榜商品',
    'amazon/discussion': '亚马逊商品评论摘要与用户讨论',
    'amazon/movers-shakers': '亚马逊飙升榜（短期增长信号）',
    'amazon/new-releases': '亚马逊新品发布榜',
    'amazon/offer': '亚马逊卖家/配送/价格信息',
    'amazon/product': '亚马逊商品详情页信息',
    'amazon/search': '亚马逊商品搜索',
    // antigravity
    'antigravity/dump': '导出 Antigravity 页面 DOM',
    'antigravity/extract-code': '提取 Antigravity 对话中的代码块',
    'antigravity/model': '切换 Antigravity 活跃模型',
    'antigravity/new': '新建 Antigravity 对话',
    'antigravity/read': '读取 Antigravity 最新消息',
    'antigravity/send': '向 Antigravity AI 发送消息',
    'antigravity/status': '检查 Antigravity 连接状态',
    'antigravity/watch': '实时监听 Antigravity 新消息',
    // apple-podcasts
    'apple-podcasts/episodes': '列出 Apple Podcast 最新单集',
    'apple-podcasts/search': '搜索 Apple Podcasts',
    'apple-podcasts/top': 'Apple Podcasts 热门排行',
    // arxiv
    'arxiv/paper': '获取 arXiv 论文详情',
    'arxiv/search': '搜索 arXiv 论文',
    // band
    'band/bands': '列出已加入的 Band 社群',
    'band/mentions': '查看 Band 中 @我 的通知',
    'band/post': '导出 Band 帖子完整内容和评论',
    'band/posts': '列出 Band 社群帖子',
    // barchart
    'barchart/flow': 'Barchart 异常期权活动/期权流',
    'barchart/greeks': 'Barchart 期权希腊值概览',
    'barchart/options': 'Barchart 期权链（希腊值/成交量/持仓）',
    'barchart/quote': 'Barchart 股票报价（价格/成交量/指标）',
    // bbc
    'bbc/news': 'BBC 新闻头条',
    // bilibili
    'bilibili/dynamic': '获取B站用户动态',
    'bilibili/me': '我的B站个人信息',
    'bilibili/ranking': 'B站视频排行榜',
    'bilibili/search': '搜索B站视频或用户',
    // binance
    'binance/asks': '交易对卖单挂单价格',
    'binance/depth': '交易对买单挂单价格',
    'binance/gainers': '24h 涨幅最大的交易对',
    'binance/klines': '交易对 K 线数据',
    'binance/losers': '24h 跌幅最大的交易对',
    'binance/pairs': '币安活跃交易对列表',
    'binance/price': '快速查看交易对价格',
    'binance/prices': '所有交易对最新价格',
    'binance/top': '币安 24h 成交量最大的交易对',
    'binance/trades': '交易对最近成交记录',
    // bloomberg
    'bloomberg/businessweek': '彭博商业周刊头条',
    'bloomberg/economics': '彭博经济头条',
    'bloomberg/feeds': '列出彭博 RSS 源别名',
    'bloomberg/industries': '彭博行业头条',
    'bloomberg/main': '彭博首页头条',
    'bloomberg/markets': '彭博市场头条',
    'bloomberg/news': '读取彭博文章全文',
    'bloomberg/opinions': '彭博观点头条',
    'bloomberg/politics': '彭博政治头条',
    'bloomberg/tech': '彭博科技头条',
    // bluesky
    'bluesky/feeds': 'Bluesky 热门信息流',
    'bluesky/followers': '列出 Bluesky 用户的粉丝',
    'bluesky/following': '列出 Bluesky 用户的关注',
    'bluesky/profile': '获取 Bluesky 用户资料',
    'bluesky/search': '搜索 Bluesky 用户',
    'bluesky/starter-packs': '获取 Bluesky 新手包',
    'bluesky/thread': '获取 Bluesky 帖子串',
    'bluesky/trending': 'Bluesky 热门话题',
    'bluesky/user': '获取 Bluesky 用户最新帖子',
    // chatgpt-app
    'chatgpt-app/ask': '发送提示词并等待 AI 回复',
    'chatgpt-app/model': '切换 ChatGPT 桌面版模型',
    'chatgpt-app/new': '新建 ChatGPT 桌面版对话',
    'chatgpt-app/read': '读取 ChatGPT 桌面版最新消息',
    'chatgpt-app/send': '向 ChatGPT 桌面版发送消息',
    'chatgpt-app/status': '检查 ChatGPT 桌面版运行状态',
    // chatgpt
    'chatgpt/ask': '发送提示词并等待 AI 回复',
    'chatgpt/image': '用 ChatGPT 生成图片并保存',
    'chatgpt/model': '切换 ChatGPT 桌面版模型',
    'chatgpt/new': '新建 ChatGPT 桌面版对话',
    'chatgpt/read': '读取 ChatGPT 桌面版最新消息',
    'chatgpt/send': '向 ChatGPT 桌面版发送消息',
    'chatgpt/status': '检查 ChatGPT 桌面版运行状态',
    // chatwise
    'chatwise/ask': '发送提示词并等待 AI 回复',
    'chatwise/export': '导出 ChatWise 对话为 Markdown',
    'chatwise/history': '列出 ChatWise 对话历史',
    'chatwise/model': '获取或切换 ChatWise 活跃模型',
    'chatwise/read': '读取 ChatWise 当前对话',
    'chatwise/send': '向 ChatWise 发送消息',
    // codex
    'codex/ask': '发送提示词并等待 AI 回复',
    'codex/export': '导出 Codex 对话为 Markdown',
    'codex/extract-diff': '提取 Codex 代码审查差异',
    'codex/history': '列出 Codex 最近对话',
    'codex/model': '获取或切换 Codex 活跃模型',
    'codex/read': '读取 Codex 当前对话内容',
    'codex/send': '向 Codex AI 发送命令',
    // coupang
    'coupang/add-to-cart': 'Coupang 加入购物车',
    'coupang/search': 'Coupang 商品搜索',
    // cursor
    'cursor/ask': '发送提示词并等待 AI 回复',
    'cursor/composer': '向 Cursor Composer 发送提示词',
    'cursor/export': '导出 Cursor 对话为 Markdown',
    'cursor/extract-code': '提取 Cursor 对话中的代码块',
    'cursor/history': '列出 Cursor 最近对话',
    'cursor/model': '获取或切换 Cursor 活跃模型',
    'cursor/read': '读取 Cursor 当前对话内容',
    'cursor/send': '向 Cursor Composer/Chat 发送消息',
    // devto
    'devto/tag': 'DEV.to 指定标签的最新文章',
    'devto/top': 'DEV.to 今日热门文章',
    'devto/user': 'DEV.to 指定用户的最新文章',
    // dictionary
    'dictionary/examples': '查看单词的真实例句',
    'dictionary/search': '查询英文词典释义和发音',
    'dictionary/synonyms': '查找同义词',
    // discord-app
    'discord-app/channels': '列出 Discord 服务器频道',
    'discord-app/delete': '删除 Discord 频道中的消息',
    'discord-app/members': '列出 Discord 频道在线成员',
    'discord-app/read': '读取 Discord 频道最近消息',
    'discord-app/search': '搜索 Discord 服务器/频道消息',
    'discord-app/send': '在 Discord 频道发送消息',
    'discord-app/servers': '列出所有 Discord 服务器',
    'discord-app/status': '检查 Discord 桌面版连接状态',
    // doubao-app
    'doubao-app/ask': '向豆包桌面版发送消息并等待回复',
    'doubao-app/dump': '导出豆包桌面版 DOM 快照',
    'doubao-app/new': '新建豆包桌面版对话',
    'doubao-app/read': '读取豆包桌面版对话历史',
    'doubao-app/screenshot': '截取豆包桌面版窗口截图',
    'doubao-app/send': '向豆包桌面版发送消息',
    'doubao-app/status': '检查豆包桌面版连接状态',
    // doubao
    'doubao/ask': '向豆包发送提示词并等待回复',
    'doubao/detail': '读取豆包指定对话详情',
    'doubao/history': '列出豆包对话历史',
    'doubao/meeting-summary': '获取豆包会议摘要和章节',
    'doubao/meeting-transcript': '获取或下载豆包会议转录',
    'doubao/new': '新建豆包网页对话',
    'doubao/read': '读取豆包当前对话',
    'doubao/send': '向豆包网页版发送消息',
    'doubao/status': '检查豆包页面可用性和登录状态',
    // facebook
    'facebook/add-friend': '发送 Facebook 好友请求',
    'facebook/events': '浏览 Facebook 活动分类',
    'facebook/feed': '获取 Facebook 动态消息流',
    'facebook/friends': '获取 Facebook 好友推荐',
    'facebook/groups': '列出我的 Facebook 群组',
    'facebook/join-group': '加入 Facebook 群组',
    'facebook/memories': '获取 Facebook 回忆（那年今日）',
    'facebook/notifications': '获取 Facebook 最新通知',
    'facebook/profile': '获取 Facebook 用户/主页资料',
    'facebook/search': '搜索 Facebook 用户、主页或帖子',
    // gemini
    'gemini/ask': '向 Gemini 发送提示词并获取回复',
    'gemini/deep-research': '启动 Gemini 深度研究',
    'gemini/deep-research-result': '导出 Gemini 深度研究报告链接',
    'gemini/image': '用 Gemini 生成图片并保存',
    'gemini/new': '新建 Gemini 网页对话',
    // gitee
    'gitee/search': '搜索 Gitee 仓库',
    'gitee/trending': 'Gitee 开源项目推荐',
    'gitee/user': '查看 Gitee 用户资料',
    // google
    'google/news': '获取 Google 新闻头条',
    'google/search': '搜索 Google',
    'google/suggest': '获取 Google 搜索建议',
    'google/trends': '获取 Google 每日热搜趋势',
    // grok
    'grok/ask': '向 Grok 发送消息并获取回复',
    // hackernews
    'hackernews/ask': 'Hacker News Ask HN 帖子',
    'hackernews/best': 'Hacker News 最佳故事',
    'hackernews/jobs': 'Hacker News 招聘帖',
    'hackernews/new': 'Hacker News 最新故事',
    'hackernews/search': '搜索 Hacker News',
    'hackernews/show': 'Hacker News Show HN 帖子',
    'hackernews/top': 'Hacker News 热门故事',
    'hackernews/user': 'Hacker News 用户资料',
    // hf
    'hf/top': 'Hugging Face 热门论文',
    // imdb
    'imdb/person': '获取演员/导演信息',
    'imdb/reviews': '获取影视作品用户评论',
    'imdb/search': '搜索 IMDb 影视作品',
    'imdb/title': '获取影视作品详情',
    'imdb/top': 'IMDb Top 250 电影',
    'imdb/trending': 'IMDb 最受欢迎电影',
    // instagram
    'instagram/comment': '评论 Instagram 帖子',
    'instagram/download': '下载 Instagram 图片和视频',
    'instagram/explore': 'Instagram 发现/热门帖子',
    'instagram/follow': '关注 Instagram 用户',
    'instagram/followers': '列出 Instagram 粉丝',
    'instagram/following': '列出 Instagram 关注的人',
    'instagram/like': '点赞 Instagram 帖子',
    'instagram/note': '发布 Instagram 文字笔记',
    'instagram/post': '发布 Instagram 图文帖子',
    'instagram/profile': '获取 Instagram 用户资料',
    'instagram/reel': '发布 Instagram Reel 短视频',
    'instagram/save': '收藏 Instagram 帖子',
    'instagram/saved': '查看 Instagram 已收藏帖子',
    'instagram/search': '搜索 Instagram 用户',
    'instagram/story': '发布 Instagram 快拍',
    'instagram/unfollow': '取消关注 Instagram 用户',
    'instagram/unlike': '取消点赞 Instagram 帖子',
    'instagram/unsave': '取消收藏 Instagram 帖子',
    'instagram/user': '获取 Instagram 用户最新帖子',
    // lesswrong
    'lesswrong/comments': '帖子热门评论',
    'lesswrong/curated': '编辑精选',
    'lesswrong/frontpage': '算法推荐首页',
    'lesswrong/new': '最新帖子',
    'lesswrong/read': '阅读帖子全文',
    'lesswrong/sequences': '帖子合集列表',
    'lesswrong/shortform': '短想法/速记',
    'lesswrong/tag': '按标签浏览帖子',
    'lesswrong/tags': '热门标签列表',
    'lesswrong/top': '历史最佳',
    'lesswrong/top-month': '本月最佳',
    'lesswrong/top-week': '本周最佳',
    'lesswrong/top-year': '年度最佳',
    'lesswrong/user': '用户资料',
    'lesswrong/user-posts': '用户帖子列表',
    // linkedin
    'linkedin/search': '搜索领英职位',
    'linkedin/timeline': '读取领英首页动态',
    // linux-do
    'linux-do/topic-content': '获取 linux.do 帖子正文',
    // lobsters
    'lobsters/active': 'Lobste.rs 最活跃讨论',
    'lobsters/hot': 'Lobste.rs 热门故事',
    'lobsters/newest': 'Lobste.rs 最新故事',
    'lobsters/tag': 'Lobste.rs 按标签浏览',
    // maimai
    'maimai/search-talents': '脉脉多维度搜索候选人',
    // medium
    'medium/feed': 'Medium 热门文章',
    // notebooklm
    'notebooklm/current': '查看当前 NotebookLM 笔记本信息',
    'notebooklm/get': '获取当前 NotebookLM 笔记本详细数据',
    'notebooklm/history': '列出 NotebookLM 对话历史',
    'notebooklm/list': '列出 NotebookLM 笔记本',
    'notebooklm/note-list': '列出 NotebookLM 已保存笔记',
    'notebooklm/notes-get': '获取 NotebookLM 单条笔记',
    'notebooklm/open': '打开指定 NotebookLM 笔记本',
    'notebooklm/source-fulltext': '获取 NotebookLM 来源全文',
    'notebooklm/source-get': '获取 NotebookLM 单个来源',
    'notebooklm/source-guide': '获取 NotebookLM 来源摘要和关键词',
    'notebooklm/source-list': '列出 NotebookLM 来源列表',
    'notebooklm/status': '检查 NotebookLM 页面状态',
    'notebooklm/summary': '获取 NotebookLM 笔记本摘要',
    // notion
    'notion/export': '导出 Notion 当前页面为 Markdown',
    'notion/favorites': '列出 Notion 收藏的页面',
    'notion/new': '新建 Notion 页面',
    'notion/read': '读取当前 Notion 页面内容',
    'notion/search': '搜索 Notion 页面和数据库',
    'notion/sidebar': '列出 Notion 侧边栏页面',
    'notion/status': '检查 Notion 桌面版连接状态',
    'notion/write': '向当前 Notion 页面追加文本',
    // ones
    'ones/login': 'ONES 登录（通过浏览器桥接）',
    'ones/logout': 'ONES 注销当前会话',
    'ones/me': 'ONES 当前用户信息',
    'ones/my-tasks': 'ONES 我的工作项',
    'ones/task': 'ONES 工作项详情',
    'ones/tasks': 'ONES 工作项列表',
    'ones/token-info': 'ONES 会话详情（用户/团队/组织）',
    'ones/worklog': 'ONES 记录工时',
    // paperreview
    'paperreview/feedback': '提交论文评审反馈',
    'paperreview/review': '获取论文评审结果',
    'paperreview/submit': '提交 PDF 论文进行评审',
    // pixiv
    'pixiv/detail': '查看 Pixiv 插画详情',
    'pixiv/download': '下载 Pixiv 插画图片',
    'pixiv/illusts': '列出 Pixiv 画师作品',
    'pixiv/ranking': 'Pixiv 插画排行榜',
    'pixiv/search': '搜索 Pixiv 插画',
    'pixiv/user': '查看 Pixiv 画师资料',
    // producthunt
    'producthunt/browse': 'Product Hunt 分类浏览',
    'producthunt/hot': 'Product Hunt 今日热门发布',
    'producthunt/posts': 'Product Hunt 最新发布',
    'producthunt/today': 'Product Hunt 今日发布',
    // quark
    'quark/ls': '列出夸克网盘文件',
    'quark/mkdir': '在夸克网盘创建文件夹',
    'quark/mv': '移动夸克网盘文件',
    'quark/rename': '重命名夸克网盘文件',
    'quark/rm': '删除夸克网盘文件',
    'quark/save': '保存分享文件到夸克网盘',
    'quark/share-tree': '获取夸克网盘分享链接目录树',
    // reddit
    'reddit/comment': '评论 Reddit 帖子',
    'reddit/frontpage': 'Reddit 首页 / r/all',
    'reddit/popular': 'Reddit 热门帖子（/r/popular）',
    'reddit/read': '读取 Reddit 帖子和评论',
    'reddit/save': '收藏或取消收藏 Reddit 帖子',
    'reddit/saved': '浏览已收藏的 Reddit 帖子',
    'reddit/search': '搜索 Reddit 帖子',
    'reddit/subreddit': '获取指定子版块帖子',
    'reddit/subscribe': '订阅或取消订阅子版块',
    'reddit/upvote': 'Reddit 帖子投票',
    'reddit/upvoted': '浏览已点赞的 Reddit 帖子',
    'reddit/user': '查看 Reddit 用户资料',
    'reddit/user-comments': '查看 Reddit 用户评论历史',
    'reddit/user-posts': '查看 Reddit 用户发帖历史',
    // spotify
    'spotify/auth': 'Spotify 授权认证',
    'spotify/next': '下一首',
    'spotify/pause': '暂停播放',
    'spotify/play': '播放或搜索播放曲目',
    'spotify/prev': '上一首',
    'spotify/queue': '添加曲目到播放队列',
    'spotify/repeat': '设置重复模式',
    'spotify/search': '搜索曲目',
    'spotify/shuffle': '切换随机播放',
    'spotify/status': '查看当前播放状态',
    'spotify/volume': '设置播放音量',
    // stackoverflow
    'stackoverflow/bounties': 'Stack Overflow 悬赏问题',
    'stackoverflow/hot': 'Stack Overflow 热门问题',
    'stackoverflow/search': '搜索 Stack Overflow 问题',
    'stackoverflow/unanswered': 'Stack Overflow 高票未回答问题',
    // steam
    'steam/top-sellers': 'Steam 畅销游戏榜',
    // substack
    'substack/feed': 'Substack 热门文章',
    // tieba
    'tieba/hot': '贴吧热议话题',
    'tieba/posts': '浏览贴吧帖子',
    'tieba/read': '阅读贴吧帖子',
    'tieba/search': '搜索贴吧帖子',
    // tiktok
    'tiktok/comment': '评论 TikTok 视频',
    'tiktok/explore': 'TikTok 发现/热门视频',
    'tiktok/follow': '关注 TikTok 用户',
    'tiktok/following': '列出 TikTok 关注的人',
    'tiktok/friends': 'TikTok 好友推荐',
    'tiktok/like': '点赞 TikTok 视频',
    'tiktok/live': '浏览 TikTok 直播',
    'tiktok/notifications': '获取 TikTok 通知',
    'tiktok/profile': '获取 TikTok 用户资料',
    'tiktok/save': '收藏 TikTok 视频',
    'tiktok/search': '搜索 TikTok 视频',
    'tiktok/unfollow': '取消关注 TikTok 用户',
    'tiktok/unlike': '取消点赞 TikTok 视频',
    'tiktok/unsave': '取消收藏 TikTok 视频',
    'tiktok/user': '获取 TikTok 用户最新视频',
    // twitter
    'twitter/accept': '自动接受含关键词的私信请求',
    'twitter/article': '获取推特长文并导出 Markdown',
    'twitter/block': '屏蔽推特用户',
    'twitter/bookmark': '收藏推文',
    'twitter/bookmarks': '获取推特书签',
    'twitter/delete': '删除指定推文',
    'twitter/follow': '关注推特用户',
    'twitter/followers': '获取推特粉丝列表',
    'twitter/following': '获取推特关注列表',
    'twitter/hide-reply': '隐藏推文回复',
    'twitter/like': '点赞推文',
    'twitter/likes': '获取用户点赞的推文',
    'twitter/lists': '获取推特列表',
    'twitter/notifications': '获取推特通知',
    'twitter/post': '发布推文/串',
    'twitter/profile': '获取推特用户资料',
    'twitter/reply': '回复推文',
    'twitter/reply-dm': '回复推特私信',
    'twitter/search': '搜索推特',
    'twitter/thread': '获取推文串（原文+回复）',
    'twitter/timeline': '获取推特时间线',
    'twitter/trending': '推特热搜话题',
    'twitter/unblock': '取消屏蔽推特用户',
    'twitter/unbookmark': '移除推文书签',
    'twitter/unfollow': '取消关注推特用户',
    // web
    'web/read': '抓取网页并导出为 Markdown',
    // weibo
    'weibo/comments': '获取微博评论',
    'weibo/feed': '微博关注动态',
    'weibo/me': '我的微博资料',
    'weibo/post': '获取单条微博',
    'weibo/user': '获取微博用户资料',
    // weread
    'weread/book': '查看微信读书书籍详情',
    'weread/highlights': '列出微信读书划线笔记',
    'weread/notebooks': '列出有笔记的书籍',
    'weread/notes': '列出微信读书想法笔记',
    'weread/ranking': '微信读书分类排行榜',
    'weread/search': '搜索微信读书书籍',
    'weread/shelf': '列出微信读书书架',
    // wikipedia
    'wikipedia/random': '获取随机维基百科文章',
    'wikipedia/search': '搜索维基百科',
    'wikipedia/summary': '获取维基百科文章摘要',
    'wikipedia/trending': '维基百科昨日热门文章',
    // xiaohongshu
    'xiaohongshu/user': '获取小红书用户公开笔记',
    // xiaoyuzhou
    'xiaoyuzhou/episode': '查看小宇宙播客单集详情',
    'xiaoyuzhou/podcast': '查看小宇宙播客资料',
    'xiaoyuzhou/podcast-episodes': '列出小宇宙播客最近单集',
    // yahoo-finance
    'yahoo-finance/quote': '雅虎财经股票行情',
    // yollomi
    'yollomi/background': 'AI 生成商品背景图',
    'yollomi/edit': 'AI 文本提示词编辑图片',
    'yollomi/face-swap': 'AI 换脸',
    'yollomi/generate': 'AI 生成图片（文生图/图生图）',
    'yollomi/models': '列出 Yollomi AI 可用模型',
    'yollomi/object-remover': 'AI 移除图片中的物体',
    'yollomi/remove-bg': 'AI 去除图片背景',
    'yollomi/restore': 'AI 修复老旧/损坏照片',
    'yollomi/try-on': 'AI 虚拟试穿',
    'yollomi/upload': '上传图片/视频到 Yollomi',
    'yollomi/upscale': 'AI 提升图片分辨率',
    'yollomi/video': 'AI 生成视频',
    // youtube
    'youtube/channel': '获取 YouTube 频道信息和最新视频',
    'youtube/comments': '获取 YouTube 视频评论',
    'youtube/search': '搜索 YouTube 视频',
    'youtube/transcript': '获取 YouTube 视频字幕',
    'youtube/video': '获取 YouTube 视频详情',
    // yuanbao
    'yuanbao/ask': '向元宝发送提示词并等待回复',
    'yuanbao/new': '新建元宝网页对话',
    // zhihu
    'zhihu/answer': '回答知乎问题',
    'zhihu/comment': '评论知乎回答或文章',
    'zhihu/favorite': '收藏知乎回答或文章到收藏夹',
    'zhihu/follow': '关注知乎用户或问题',
    'zhihu/like': '赞同知乎回答或文章',
    // reuters
    'reuters/search': '路透社新闻搜索',
  };

  function getCommandDisplayDesc(command: string, originalDesc: string, locale: string): string {
    if (locale === 'zh-CN') {
      return commandZhDescMap[command] ?? originalDesc;
    }
    return originalDesc;
  }

  // ── 站点→功能分类映射 ──

  const siteCategoryMap: Record<string, string> = {
    // 社交媒体
    twitter: 'social', instagram: 'social', facebook: 'social',
    tiktok: 'social', douyin: 'social', bilibili: 'social',
    bluesky: 'social', weibo: 'social', xiaohongshu: 'social',
    jike: 'social', tieba: 'social', reddit: 'social',
    'discord-app': 'social', band: 'social', linkedin: 'social',
    maimai: 'social', zsxq: 'social', pixiv: 'social',
    youtube: 'social', hupu: 'social', xiaoyuzhou: 'social',
    douban: 'social', weixin: 'social',
    // 新闻资讯
    '36kr': 'news', bbc: 'news', reuters: 'news',
    hackernews: 'news', devto: 'news', producthunt: 'news',
    google: 'news', v2ex: 'news', 'linux-do': 'news',
    lesswrong: 'news', lobsters: 'news', medium: 'news',
    substack: 'news', sinablog: 'news',
    // 财经热点
    xueqiu: 'finance', sinafinance: 'finance', bloomberg: 'finance',
    barchart: 'finance', binance: 'finance', 'yahoo-finance': 'finance',
    // 电商购物
    amazon: 'ecommerce', '1688': 'ecommerce', jd: 'ecommerce',
    taobao: 'ecommerce', coupang: 'ecommerce', ctrip: 'ecommerce',
    smzdm: 'ecommerce', xianyu: 'ecommerce', steam: 'ecommerce',
    ke: 'ecommerce',
    // 学术科研
    arxiv: 'academic', cnki: 'academic', chaoxing: 'academic',
    paperreview: 'academic', wikipedia: 'academic', dictionary: 'academic',
    stackoverflow: 'academic', zhihu: 'academic', weread: 'academic',
    // 效率工具
    chatgpt: 'tools', 'chatgpt-app': 'tools', chatwise: 'tools',
    codex: 'tools', cursor: 'tools', doubao: 'tools',
    'doubao-app': 'tools', gemini: 'tools', grok: 'tools',
    hf: 'tools', jimeng: 'tools', mubu: 'tools',
    notion: 'tools', notebooklm: 'tools', ones: 'tools',
    quark: 'tools', yuanbao: 'tools', yollomi: 'tools',
    xiaoe: 'tools', web: 'tools', jianyu: 'tools', gitee: 'tools',
    // 其他
    antigravity: 'other', imdb: 'other', spotify: 'other',
    'apple-podcasts': 'other', boss: 'other',
  };

  const categoryLabelMap: Record<string, { en: string; zh: string; icon: string }> = {
    social: { en: 'Social Media', zh: '社交媒体', icon: '💬' },
    news: { en: 'News & Info', zh: '新闻资讯', icon: '📰' },
    finance: { en: 'Finance', zh: '财经热点', icon: '💰' },
    ecommerce: { en: 'E-commerce', zh: '电商购物', icon: '🛒' },
    academic: { en: 'Academic', zh: '学术科研', icon: '🎓' },
    tools: { en: 'Tools', zh: '效率工具', icon: '🔧' },
    other: { en: 'Other', zh: '其他', icon: '📦' },
  };

  function getSiteCategory(site: string): string {
    return siteCategoryMap[site] ?? 'other';
  }

  function getCategoryLabel(category: string, locale: string): string {
    const entry = categoryLabelMap[category];
    if (!entry) return category;
    return locale === 'zh-CN' ? entry.zh : entry.en;
  }

  function getCategoryIcon(category: string): string {
    return categoryLabelMap[category]?.icon ?? '📦';
  }

  const categoryGroups = computed(() => {
    const groups = new Map<string, typeof registry.value.commands>();
    for (const cmd of registry.value.commands) {
      const cat = getSiteCategory(cmd.site);
      const list = groups.get(cat) ?? [];
      list.push(cmd);
      groups.set(cat, list);
    }
    return Array.from(groups.entries())
      .map(([category, commands]) => ({ category, commands, count: commands.length }))
      .sort((a, b) => b.count - a.count);
  });

  const siteGroups = computed(() => {
    const groups = new Map<string, typeof registry.value.commands>();
    for (const cmd of registry.value.commands) {
      const list = groups.get(cmd.site) ?? [];
      list.push(cmd);
      groups.set(cmd.site, list);
    }
    return Array.from(groups.entries())
      .map(([site, commands]) => {
        const category = getSiteCategory(site);
        const domestic = isSiteDomestic(site);
        return { site, commands, count: commands.length, category, icon: getCategoryIcon(category), domestic };
      })
      .sort((a, b) => {
        if (a.domestic !== b.domestic) return a.domestic ? -1 : 1;
        return b.count - a.count;
      });
  });

  return {
    registry,
    env,
    history,
    recentSnapshots,
    snapshotsBySource,
    jobs,
    plugins,
    externalClis,
    recipes,
    favorites,
    presets,
    doctor,
    lastExecution,
    stagedWorkbenchArgs,
    stagedInsightArgs,
    initializing,
    runningCommand,
    runningSnapshot,
    runningDoctor,
    loadError,
    executionError,
    selectedCommand,
    selectedRecipeId,
    advancedMode,
    selectedCommandItem,
    selectedRecipe,
    availableWorkbenchCommands,
    favoriteCommandIds,
    favoriteRecipeIds,
    registryPresets,
    workbenchPresets,
    insightPresets,
    categoryGroups,
    siteGroups,
    getSiteCategory,
    getCategoryLabel,
    getCategoryIcon,
    isSiteDomestic,
    getSiteDisplayName,
    getCommandDisplayDesc,
    setSelectedCommand,
    setSelectedRecipe,
    setAdvancedMode,
    stageWorkbenchArgs,
    consumeWorkbenchArgs,
    stageInsightArgs,
    consumeInsightArgs,
    loadShell,
    runCommand,
    runRecipe,
    refreshHistory,
    refreshRecentSnapshots,
    refreshSnapshots,
    refreshFavorites,
    refreshPresets,
    refreshJobs,
    refreshOpsInventory,
    captureSourceSnapshot,
    saveJob,
    runJobNow,
    deleteJob,
    toggleFavorite,
    savePreset,
    deletePreset,
    runDoctor,
  };
});
