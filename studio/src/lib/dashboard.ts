type MinimalCommand = {
  command: string;
  meta: {
    mode: 'public' | 'browser' | 'desktop' | 'external';
    risk: 'safe' | 'confirm' | 'dangerous';
  };
};

type MinimalHistory = { status: 'success' | 'error' };
type MinimalRecipe = { id: string };
type MinimalJob = { id: number; enabled: boolean };
type MinimalSnapshot = { id: number };

export interface OverviewMetrics {
  totalCommands: number;
  browserCommands: number;
  publicCommands: number;
  guardedCommands: number;
  recentRuns: number;
  successfulRuns: number;
  recipes: number;
  jobs: number;
  activeJobs: number;
  snapshots: number;
}

export function buildOverviewMetrics(input: {
  commands: MinimalCommand[];
  history: MinimalHistory[];
  recipes: MinimalRecipe[];
  jobs: MinimalJob[];
  snapshots: MinimalSnapshot[];
}): OverviewMetrics {
  const browserCommands = input.commands.filter((command) => command.meta.mode === 'browser').length;
  const publicCommands = input.commands.filter((command) => command.meta.mode === 'public').length;
  const guardedCommands = input.commands.filter((command) => command.meta.risk !== 'safe').length;
  const successfulRuns = input.history.filter((entry) => entry.status === 'success').length;
  const activeJobs = input.jobs.filter((job) => job.enabled).length;

  return {
    totalCommands: input.commands.length,
    browserCommands,
    publicCommands,
    guardedCommands,
    recentRuns: input.history.length,
    successfulRuns,
    recipes: input.recipes.length,
    jobs: input.jobs.length,
    activeJobs,
    snapshots: input.snapshots.length,
  };
}
