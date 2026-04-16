import type { CliCommand } from '../registry.js';
import type { StudioRecipe } from './types.js';

const BUILTIN_RECIPES: StudioRecipe[] = [
  {
    id: 'creator-hot-domestic',
    kind: 'builtin',
    visibility: 'primary',
    objective: 'hotspots',
    title: 'Domestic Creator Hotspots',
    summary: 'Mainland creator hotspots across short video, community, and discussion platforms.',
    description: 'Batch the highest-signal mainland creator feeds into one reusable hotspot template.',
    command: 'bilibili/ranking',
    defaultArgs: { limit: 10 },
    tags: ['hotspots', 'domestic', 'creator'],
    steps: [
      { id: 'bilibili-ranking', command: 'bilibili/ranking', args: { limit: 10 } },
      { id: 'weibo-hot', command: 'weibo/hot', args: { limit: 10 } },
      { id: 'zhihu-hot', command: 'zhihu/hot', args: { limit: 10 } },
      { id: 'douyin-hashtag', command: 'douyin/hashtag', args: { action: 'hot', limit: 10 } },
    ],
    prerequisites: [
      { type: 'browser', target: 'domestic' },
    ],
    merge: {
      mode: 'table',
      primaryFields: ['source', 'title', 'summary', 'rank', 'metric', 'url'],
    },
    output: {
      defaultView: 'table',
      chartPolicy: 'off',
    },
    schedule: {
      supported: true,
      defaultIntervalMinutes: 360,
    },
    snapshotPolicy: 'suggested',
    i18nKey: 'insights.builtins.creator-hot-domestic',
    createdFrom: 'overview',
  },
  {
    id: 'creator-hot-global',
    kind: 'builtin',
    visibility: 'primary',
    objective: 'hotspots',
    title: 'Global Trend Radar',
    summary: 'Track global public attention across search and community surfaces.',
    description: 'A reusable international trend template tuned for cross-platform topic scouting.',
    command: 'google/trends',
    defaultArgs: { region: 'US', limit: 10 },
    tags: ['hotspots', 'international', 'trend'],
    steps: [
      { id: 'google-trends', command: 'google/trends', args: { region: 'US', limit: 10 } },
      { id: 'reddit-popular', command: 'reddit/popular', args: { limit: 10 } },
      { id: 'wikipedia-trending', command: 'wikipedia/trending', args: { limit: 10 } },
    ],
    prerequisites: [
      { type: 'browser', target: 'international' },
    ],
    merge: {
      mode: 'table',
      primaryFields: ['source', 'title', 'summary', 'rank', 'metric', 'url'],
    },
    output: {
      defaultView: 'table',
      chartPolicy: 'off',
    },
    schedule: {
      supported: true,
      defaultIntervalMinutes: 360,
    },
    snapshotPolicy: 'suggested',
    i18nKey: 'insights.builtins.creator-hot-global',
    createdFrom: 'overview',
  },
  {
    id: 'creator-reference',
    kind: 'builtin',
    visibility: 'primary',
    objective: 'reference',
    title: 'Creative Reference Pack',
    summary: 'Collect visual and topic references from creator-friendly platforms.',
    description: 'Use this template when you need quick reference material instead of a one-off command run.',
    command: 'bilibili/search',
    defaultArgs: { query: '动画', limit: 10 },
    tags: ['reference', 'creator', 'multi-source'],
    steps: [
      { id: 'bilibili-search', command: 'bilibili/search', args: { query: '动画', limit: 10 } },
      { id: 'youtube-search', command: 'youtube/search', args: { query: 'animation', limit: 10 } },
      { id: 'reddit-search', command: 'reddit/search', args: { query: 'animation', time: 'week', limit: 10 } },
    ],
    prerequisites: [
      { type: 'browser', target: 'creator-reference' },
    ],
    merge: {
      mode: 'table',
      primaryFields: ['source', 'title', 'summary', 'rank', 'metric', 'url'],
    },
    output: {
      defaultView: 'table',
      chartPolicy: 'off',
    },
    schedule: {
      supported: true,
      defaultIntervalMinutes: 720,
    },
    snapshotPolicy: 'suggested',
    i18nKey: 'insights.builtins.creator-reference',
    createdFrom: 'overview',
  },
  {
    id: 'topic-watch',
    kind: 'builtin',
    visibility: 'primary',
    objective: 'tracking',
    title: 'Topic Watch',
    summary: 'Keep watching one topic with reusable search defaults.',
    description: 'A tracking-oriented template for repeated keyword checks.',
    command: 'google/trends',
    defaultArgs: { region: 'US', limit: 10 },
    tags: ['tracking', 'keyword', 'trend'],
    steps: [
      { id: 'google-trends', command: 'google/trends', args: { region: 'US', limit: 10 } },
    ],
    prerequisites: [
      { type: 'browser', target: 'google' },
    ],
    merge: {
      mode: 'timeline',
      primaryFields: ['date', 'query', 'value'],
      sortBy: 'date',
    },
    output: {
      defaultView: 'table',
      chartPolicy: 'auto',
    },
    schedule: {
      supported: true,
      defaultIntervalMinutes: 1440,
    },
    snapshotPolicy: 'suggested',
    i18nKey: 'insights.builtins.topic-watch',
    createdFrom: 'manual',
  },
  {
    id: 'account-watch',
    kind: 'builtin',
    visibility: 'primary',
    objective: 'monitoring',
    title: 'Account Watch',
    summary: 'Keep one creator or work item under repeated observation.',
    description: 'A monitoring template intended for repeated checks and snapshot comparison.',
    command: 'douyin/stats',
    defaultArgs: { aweme_id: '' },
    tags: ['monitoring', 'account', 'timeseries'],
    inputs: [
      {
        key: 'aweme_id',
        label: '作品 ID',
        type: 'text',
        required: true,
        default: '',
      },
    ],
    steps: [
      { id: 'douyin-stats', command: 'douyin/stats', args: { aweme_id: '' } },
    ],
    prerequisites: [
      { type: 'login', target: 'douyin' },
      { type: 'browser', target: 'douyin' },
    ],
    merge: {
      mode: 'timeline',
      primaryFields: ['date', 'views', 'likes'],
    },
    output: {
      defaultView: 'timeline',
      chartPolicy: 'explicit',
    },
    schedule: {
      supported: true,
      defaultIntervalMinutes: 180,
    },
    snapshotPolicy: 'required',
    i18nKey: 'insights.builtins.account-watch',
    createdFrom: 'manual',
  },
  {
    id: 'material-collection',
    kind: 'builtin',
    visibility: 'primary',
    objective: 'collection',
    title: 'Material Collection',
    summary: 'Collect reusable material leads from video and creator platforms.',
    description: 'A collection-first template for finding assets, references, and source material.',
    command: 'bilibili/search',
    defaultArgs: { query: '动画 素材', limit: 10 },
    tags: ['collection', 'asset', 'reference'],
    steps: [
      { id: 'bilibili-material-search', command: 'bilibili/search', args: { query: '动画 素材', limit: 10 } },
    ],
    prerequisites: [
      { type: 'browser', target: 'bilibili' },
    ],
    merge: {
      mode: 'table',
      primaryFields: ['title', 'summary', 'url'],
    },
    output: {
      defaultView: 'table',
      chartPolicy: 'off',
    },
    schedule: {
      supported: false,
    },
    snapshotPolicy: 'manual',
    i18nKey: 'insights.builtins.material-collection',
    createdFrom: 'manual',
  },
  {
    id: 'bilibili-hot',
    kind: 'builtin',
    visibility: 'legacy',
    objective: 'workspace',
    title: 'Bilibili Hot',
    summary: 'Legacy single-command template kept for compatibility.',
    description: 'Legacy single-command template kept for compatibility.',
    command: 'bilibili/hot',
    defaultArgs: { limit: 10 },
    tags: ['legacy', 'video', 'discovery', 'hot'],
  },
  {
    id: 'google-trends',
    kind: 'builtin',
    visibility: 'legacy',
    objective: 'workspace',
    title: 'Google Trends',
    summary: 'Legacy single-command template kept for compatibility.',
    description: 'Legacy single-command template kept for compatibility.',
    command: 'google/trends',
    defaultArgs: { region: 'US', limit: 10 },
    tags: ['legacy', 'search', 'trends', 'public'],
  },
  {
    id: 'reddit-topic-search',
    kind: 'builtin',
    visibility: 'legacy',
    objective: 'workspace',
    title: 'Reddit Topic Search',
    summary: 'Legacy single-command template kept for compatibility.',
    description: 'Legacy single-command template kept for compatibility.',
    command: 'reddit/search',
    defaultArgs: { query: 'AI', time: 'week', limit: 10 },
    tags: ['legacy', 'community', 'search', 'topic'],
  },
  {
    id: 'douyin-hashtag-hot',
    kind: 'builtin',
    visibility: 'legacy',
    objective: 'workspace',
    title: 'Douyin Hashtag Hot',
    summary: 'Legacy single-command template kept for compatibility.',
    description: 'Legacy single-command template kept for compatibility.',
    command: 'douyin/hashtag',
    defaultArgs: { action: 'hot', limit: 10 },
    tags: ['legacy', 'video', 'topic', 'browser'],
  },
  {
    id: 'douyin-work-stats',
    kind: 'builtin',
    visibility: 'legacy',
    objective: 'workspace',
    title: 'Douyin Work Stats',
    summary: 'Legacy single-command template kept for compatibility.',
    description: 'Legacy single-command template kept for compatibility.',
    command: 'douyin/stats',
    defaultArgs: { aweme_id: '' },
    tags: ['legacy', 'video', 'metrics', 'timeseries'],
  },
];

export function listStudioRecipes(commands: CliCommand[]): StudioRecipe[] {
  const available = new Set(commands.map((command) => `${command.site}/${command.name}`));

  return BUILTIN_RECIPES
    .filter((recipe) => available.has(recipe.command))
    .map((recipe) => {
      const steps = (recipe.steps ?? [])
        .filter((step) => available.has(step.command));

      return {
        ...recipe,
        summary: recipe.summary ?? recipe.description,
        steps: steps.length > 0
          ? steps
          : [{ id: recipe.id, command: recipe.command, args: recipe.defaultArgs }],
      };
    })
    .filter((recipe) => (recipe.steps?.length ?? 0) > 0);
}
