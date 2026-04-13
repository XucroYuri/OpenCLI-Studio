import type { CliCommand } from '../registry.js';
import type { StudioRecipe } from './types.js';

const BUILTIN_RECIPES: StudioRecipe[] = [
  {
    id: 'bilibili-hot',
    title: 'Bilibili Hot',
    description: 'Top hot content on Bilibili.',
    command: 'bilibili/hot',
    defaultArgs: { limit: 10 },
    tags: ['video', 'discovery', 'hot'],
  },
  {
    id: 'google-trends',
    title: 'Google Trends',
    description: 'Daily trending searches by region.',
    command: 'google/trends',
    defaultArgs: { region: 'US', limit: 10 },
    tags: ['search', 'trends', 'public'],
  },
  {
    id: 'reddit-topic-search',
    title: 'Reddit Topic Search',
    description: 'Search Reddit posts by topic and time window.',
    command: 'reddit/search',
    defaultArgs: { query: 'AI', time: 'week', limit: 10 },
    tags: ['community', 'search', 'topic'],
  },
  {
    id: 'douyin-hashtag-hot',
    title: 'Douyin Hashtag Hot',
    description: 'Hot Douyin hashtags from the creator surface.',
    command: 'douyin/hashtag',
    defaultArgs: { action: 'hot', limit: 10 },
    tags: ['video', 'topic', 'browser'],
  },
  {
    id: 'douyin-work-stats',
    title: 'Douyin Work Stats',
    description: 'Metrics trend for a Douyin work item.',
    command: 'douyin/stats',
    defaultArgs: { aweme_id: '' },
    tags: ['video', 'metrics', 'timeseries'],
  },
];

export function listStudioRecipes(commands: CliCommand[]): StudioRecipe[] {
  const available = new Set(commands.map((command) => `${command.site}/${command.name}`));
  return BUILTIN_RECIPES.filter((recipe) => available.has(recipe.command));
}
