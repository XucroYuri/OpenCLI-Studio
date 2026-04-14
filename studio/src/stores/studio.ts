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
