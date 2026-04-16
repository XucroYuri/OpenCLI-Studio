import { describe, expect, it } from 'vitest';
import { buildOverviewMetrics } from './dashboard';

describe('buildOverviewMetrics', () => {
  it('summarizes registry and history counts for the overview hero', () => {
    const metrics = buildOverviewMetrics({
      commands: [
        { command: 'bilibili/hot', meta: { mode: 'browser', risk: 'safe' } },
        { command: 'google/trends', meta: { mode: 'public', risk: 'safe' } },
        { command: 'douyin/publish', meta: { mode: 'browser', risk: 'confirm' } },
      ],
      history: [
        { status: 'success' },
        { status: 'error' },
        { status: 'success' },
      ],
      recipes: [
        { id: 'bilibili-hot' },
        { id: 'google-trends' },
      ],
      jobs: [
        { id: 1, enabled: true },
        { id: 2, enabled: false },
      ],
      snapshots: [
        { id: 10 },
        { id: 11 },
        { id: 12 },
      ],
    });

    expect(metrics).toEqual({
      totalCommands: 3,
      browserCommands: 2,
      publicCommands: 1,
      guardedCommands: 1,
      recentRuns: 3,
      successfulRuns: 2,
      recipes: 2,
      jobs: 2,
      activeJobs: 1,
      snapshots: 3,
    });
  });
});
