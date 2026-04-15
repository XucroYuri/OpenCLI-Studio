import { isElectronApp } from '../electron-apps.js';
import { fullName, Strategy, type CliCommand } from '../registry.js';
import { getCreatorSitePriority, inferMarket, inferSiteCategory } from './site-taxonomy.js';
import type {
  StudioCapability,
  StudioCommandMeta,
  StudioRegistryCommand,
  StudioRegistryPayload,
  StudioRegistrySite,
  StudioRisk,
} from './types.js';

export interface StudioMetadataOptions {
  pluginSites?: Set<string>;
}

const DISCOVERY_NAMES = new Set([
  'hot', 'top', 'trending', 'popular', 'ranking', 'news', 'explore', 'frontpage',
  'best', 'latest', 'today', 'gainers', 'losers', 'movers-shakers', 'top-sellers',
  'movie-hot', 'book-hot', 'trends', 'stats',
]);
const SEARCH_NAMES = new Set([
  'search', 'suggest', 'tag', 'tags', 'topic', 'topics', 'hashtag', 'category',
  'categories', 'node', 'nodes', 'subreddit', 'feed', 'feeds', 'browse', 'recommend',
]);
const DETAIL_NAMES = new Set([
  'read', 'video', 'videos', 'paper', 'question', 'subject', 'item', 'product',
  'stock', 'title', 'topic-content', 'detail', 'quote', 'episode', 'book', 'user',
  'profile', 'person', 'publication', 'podcast', 'task', 'current', 'get',
  'source-get', 'source-fulltext', 'notes-get', 'thread',
]);
const ACCOUNT_NAMES = new Set([
  'me', 'history', 'favorite', 'favorites', 'following', 'followers', 'notifications',
  'bookmarks', 'saved', 'watchlist', 'shelf', 'notes', 'highlights', 'drafts',
  'draft', 'collections', 'friends', 'bands', 'my-tasks', 'sidebar', 'status',
  'source-list', 'note-list',
]);
const ACTION_NAMES = new Set([
  'post', 'reply', 'comment', 'like', 'unlike', 'upvote', 'follow', 'unfollow',
  'bookmark', 'unbookmark', 'save', 'unsave', 'publish', 'delete', 'update', 'play',
  'pause', 'next', 'prev', 'queue', 'shuffle', 'repeat', 'send', 'greet',
  'batchgreet', 'invite', 'mark', 'exchange', 'mkdir', 'mv', 'rename', 'rm', 'write',
  'new', 'auth', 'login', 'logout', 'create', 'join-group', 'add-friend', 'answer',
]);
const ASSET_NAMES = new Set([
  'download', 'subtitle', 'transcript', 'photos', 'assets', 'export', 'screenshot',
  'dump', 'play-url',
]);
const DANGEROUS_NAMES = new Set(['delete', 'rm']);
const CONFIRM_NAMES = new Set([
  'post', 'reply', 'comment', 'like', 'unlike', 'upvote', 'follow', 'unfollow',
  'bookmark', 'unbookmark', 'save', 'unsave', 'publish', 'update', 'play', 'pause',
  'next', 'prev', 'queue', 'shuffle', 'repeat', 'send', 'greet', 'batchgreet',
  'invite', 'mark', 'exchange', 'mkdir', 'mv', 'rename', 'write', 'new', 'auth',
  'login', 'logout', 'create', 'join-group', 'add-friend', 'answer',
]);
const TIME_SERIES_NAMES = new Set(['trends', 'stats', 'kline', 'quote', 'top', 'hot']);
const CREATOR_COMMAND_NAME_PRIORITY: Record<string, number> = {
  hot: 0,
  trending: 1,
  top: 2,
  ranking: 3,
  popular: 4,
  latest: 5,
  today: 6,
  feed: 7,
  dynamic: 8,
  subscriptions: 9,
  search: 10,
  suggest: 11,
  topic: 12,
  topics: 13,
  hashtag: 14,
  explore: 15,
  recommend: 16,
  ask: 17,
  image: 18,
  summary: 19,
  stats: 20,
  video: 21,
  videos: 22,
  playlist: 23,
  'watch-later': 24,
  detail: 25,
  read: 26,
  creator: 27,
  channel: 28,
  profile: 29,
  user: 30,
  'user-videos': 31,
  comments: 32,
  transcript: 33,
  subtitle: 34,
  quote: 35,
  episode: 36,
  episodes: 37,
  'source-list': 38,
  'source-get': 39,
  download: 40,
  export: 41,
  screenshot: 42,
  'source-fulltext': 43,
  'notes-get': 44,
  'note-list': 45,
  current: 46,
  open: 47,
  list: 48,
  history: 70,
  favorites: 71,
  favorite: 72,
  status: 73,
  me: 74,
  model: 75,
  login: 80,
  logout: 81,
  publish: 82,
  post: 83,
  write: 84,
  update: 85,
  delete: 90,
  rm: 91,
};
const CREATOR_CAPABILITY_PRIORITY: Record<StudioCapability, number> = {
  discovery: 0,
  search: 1,
  detail: 2,
  asset: 3,
  account: 4,
  action: 5,
  tooling: 6,
  other: 7,
};
const RISK_PRIORITY: Record<StudioRisk, number> = {
  safe: 0,
  confirm: 1,
  dangerous: 2,
};
const STUDIO_ARG_CHOICE_OVERRIDES: Record<string, string[]> = {
  '36kr/hot:type': ['catalog', 'renqi', 'zonghe', 'shoucang'],
  'bilibili/feed:type': ['all', 'video', 'article', 'draw', 'text'],
  'bilibili/search:type': ['video', 'user'],
  'hupu/search:sort': ['general', 'createtime', 'replytime', 'light', 'reply'],
  'producthunt/browse:category': [
    'ai-agents',
    'ai-coding-agents',
    'ai-code-editors',
    'ai-chatbots',
    'ai-workflow-automation',
    'vibe-coding',
    'developer-tools',
    'productivity',
    'design-creative',
    'marketing-sales',
    'no-code-platforms',
    'llms',
    'finance',
    'social-community',
    'engineering-development',
  ],
  'producthunt/posts:category': [
    'ai-agents',
    'ai-coding-agents',
    'ai-code-editors',
    'ai-chatbots',
    'ai-workflow-automation',
    'vibe-coding',
    'developer-tools',
    'productivity',
    'design-creative',
    'marketing-sales',
    'no-code-platforms',
    'llms',
    'finance',
    'social-community',
    'engineering-development',
  ],
  'reddit/read:sort': ['best', 'top', 'new', 'controversial', 'old', 'qa'],
  'reddit/search:sort': ['relevance', 'hot', 'top', 'new', 'comments'],
  'reddit/subreddit:sort': ['hot', 'new', 'top', 'rising', 'controversial'],
  'sinafinance/news:type': ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  'sinafinance/stock:market': ['auto', 'cn', 'hk', 'us'],
  'substack/feed:category': ['all', 'tech', 'business', 'culture', 'politics', 'science', 'health'],
  'xiaohongshu/notifications:type': ['mentions', 'likes', 'connections'],
  'xueqiu/hot-stock:type': ['10', '12'],
  'youtube/search:sort': ['relevance', 'date', 'views', 'rating'],
  'youtube/search:type': ['shorts', 'video', 'channel', 'playlist'],
  'youtube/transcript:mode': ['grouped', 'raw'],
};

function studioArgOverrideKey(commandName: string, argName: string): string {
  return `${commandName}:${argName}`;
}

function enrichStudioArg(commandName: string, arg: CliCommand['args'][number]): CliCommand['args'][number] {
  const explicitChoices = Array.isArray(arg.choices)
    ? arg.choices.filter((choice): choice is string => typeof choice === 'string' && choice.length > 0)
    : [];
  const inferredChoices = STUDIO_ARG_CHOICE_OVERRIDES[studioArgOverrideKey(commandName, arg.name)] ?? [];
  const mergedChoices = [...new Set([...explicitChoices, ...inferredChoices])];

  if (mergedChoices.length === explicitChoices.length && mergedChoices.every((choice, index) => choice === explicitChoices[index])) {
    return arg;
  }

  return {
    ...arg,
    choices: mergedChoices,
  };
}

function enrichStudioArgs(commandName: string, args: CliCommand['args']): CliCommand['args'] {
  return args.map((arg) => enrichStudioArg(commandName, arg));
}

function inferCapability(name: string): StudioCapability {
  if (DISCOVERY_NAMES.has(name)) return 'discovery';
  if (SEARCH_NAMES.has(name)) return 'search';
  if (DETAIL_NAMES.has(name)) return 'detail';
  if (ACCOUNT_NAMES.has(name)) return 'account';
  if (ACTION_NAMES.has(name)) return 'action';
  if (ASSET_NAMES.has(name)) return 'asset';
  return 'other';
}

function inferMode(cmd: CliCommand) {
  if (isElectronApp(cmd.site)) return 'desktop' as const;
  if (cmd.browser === false || cmd.strategy === Strategy.PUBLIC) return 'public' as const;
  return 'browser' as const;
}

function inferRisk(capability: StudioCapability, name: string): StudioRisk {
  if (DANGEROUS_NAMES.has(name)) return 'dangerous';
  if (CONFIRM_NAMES.has(name) || capability === 'action') return 'confirm';
  return 'safe';
}

export function buildStudioCommandMeta(cmd: CliCommand, options: StudioMetadataOptions = {}): StudioCommandMeta {
  const capability = inferCapability(cmd.name);
  const mode = inferMode(cmd);
  const risk = inferRisk(capability, cmd.name);
  const surface = options.pluginSites?.has(cmd.site) ? 'plugin' : 'builtin';
  const market = inferMarket(cmd.site, cmd);
  const siteCategory = inferSiteCategory(cmd.site, cmd);

  return {
    surface,
    mode,
    capability,
    risk,
    market,
    siteCategory,
    uiHints: {
      supportsLists: capability === 'discovery' || capability === 'search' || capability === 'account' || capability === 'detail',
      supportsDetails: capability === 'detail' || capability === 'account',
      supportsCharts: capability === 'discovery' || capability === 'search',
      supportsTimeSeries: TIME_SERIES_NAMES.has(cmd.name),
    },
  };
}

function toStudioRegistryCommand(cmd: CliCommand, options: StudioMetadataOptions): StudioRegistryCommand {
  const strategy = (cmd.strategy ?? (cmd.browser === false ? Strategy.PUBLIC : Strategy.COOKIE)).toString();
  const commandName = fullName(cmd);
  return {
    command: commandName,
    site: cmd.site,
    name: cmd.name,
    description: cmd.description,
    args: enrichStudioArgs(commandName, cmd.args),
    browser: !!cmd.browser,
    strategy,
    meta: buildStudioCommandMeta(cmd, options),
  };
}

function getCommandCreatorPriority(command: StudioRegistryCommand): number {
  const explicit = CREATOR_COMMAND_NAME_PRIORITY[command.name];
  if (explicit !== undefined) {
    return explicit;
  }

  let priority = 100 + (CREATOR_CAPABILITY_PRIORITY[command.meta.capability] ?? CREATOR_CAPABILITY_PRIORITY.other) * 10;
  priority += RISK_PRIORITY[command.meta.risk] ?? 0;

  if (command.meta.uiHints.supportsCharts) {
    priority -= 2;
  }
  if (command.meta.uiHints.supportsTimeSeries) {
    priority -= 1;
  }

  return priority;
}

function compareStudioRegistryCommands(left: StudioRegistryCommand, right: StudioRegistryCommand): number {
  const leftSitePriority = getCreatorSitePriority({
    site: left.site,
    market: left.meta.market,
    category: left.meta.siteCategory,
  });
  const rightSitePriority = getCreatorSitePriority({
    site: right.site,
    market: right.meta.market,
    category: right.meta.siteCategory,
  });

  if (leftSitePriority !== rightSitePriority) {
    return leftSitePriority - rightSitePriority;
  }

  const leftCommandPriority = getCommandCreatorPriority(left);
  const rightCommandPriority = getCommandCreatorPriority(right);
  if (leftCommandPriority !== rightCommandPriority) {
    return leftCommandPriority - rightCommandPriority;
  }

  return left.command.localeCompare(right.command);
}

export function buildStudioRegistry(commands: CliCommand[], options: StudioMetadataOptions = {}): StudioRegistryPayload {
  const normalized = commands
    .map((command) => toStudioRegistryCommand(command, options))
    .sort(compareStudioRegistryCommands);

  const sitesByName = new Map<string, StudioRegistryCommand[]>();
  for (const command of normalized) {
    const existing = sitesByName.get(command.site);
    if (existing) {
      existing.push(command);
    } else {
      sitesByName.set(command.site, [command]);
    }
  }

  const sites: StudioRegistrySite[] = [...sitesByName.entries()]
    .sort((left, right) => {
      const leftFirst = left[1][0];
      const rightFirst = right[1][0];
      const leftPriority = getCreatorSitePriority({
        site: left[0],
        market: leftFirst?.meta.market,
        category: leftFirst?.meta.siteCategory,
      });
      const rightPriority = getCreatorSitePriority({
        site: right[0],
        market: rightFirst?.meta.market,
        category: rightFirst?.meta.siteCategory,
      });

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      const countDiff = right[1].length - left[1].length;
      if (countDiff !== 0) {
        return countDiff;
      }

      return left[0].localeCompare(right[0]);
    })
    .map(([site, siteCommands]) => {
      const firstCommand = siteCommands[0];
      if (!firstCommand) {
        return { site, commandCount: 0 } satisfies StudioRegistrySite;
      }

      const commandCountByTag: Record<string, number> = {
        all: siteCommands.length,
      };
      const popularity = getCreatorSitePriority({
        site,
        market: firstCommand.meta.market,
        category: firstCommand.meta.siteCategory,
      });

      for (const command of siteCommands) {
        const marketTag = `market:${command.meta.market}`;
        const categoryTag = `siteCategory:${command.meta.siteCategory}`;
        commandCountByTag[marketTag] = (commandCountByTag[marketTag] ?? 0) + 1;
        commandCountByTag[categoryTag] = (commandCountByTag[categoryTag] ?? 0) + 1;
      }

      return {
        site,
        commandCount: siteCommands.length,
        market: firstCommand.meta.market,
        category: firstCommand.meta.siteCategory,
        popularity,
        commandCountByTag,
      };
    });

  return { commands: normalized, sites };
}
