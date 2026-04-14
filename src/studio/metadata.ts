import { isElectronApp } from '../electron-apps.js';
import { fullName, Strategy, type CliCommand } from '../registry.js';
import { inferMarket, inferSiteCategory } from './site-taxonomy.js';
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
  return {
    command: fullName(cmd),
    site: cmd.site,
    name: cmd.name,
    description: cmd.description,
    args: cmd.args,
    browser: !!cmd.browser,
    strategy,
    meta: buildStudioCommandMeta(cmd, options),
  };
}

export function buildStudioRegistry(commands: CliCommand[], options: StudioMetadataOptions = {}): StudioRegistryPayload {
  const normalized = commands
    .map((command) => toStudioRegistryCommand(command, options))
    .sort((a, b) => a.command.localeCompare(b.command));

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
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([site, siteCommands]) => {
      const firstCommand = siteCommands[0];
      if (!firstCommand) {
        return { site, commandCount: 0 } satisfies StudioRegistrySite;
      }

      const commandCountByTag: Record<string, number> = {
        all: siteCommands.length,
      };

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
        commandCountByTag,
      };
    });

  return { commands: normalized, sites };
}
