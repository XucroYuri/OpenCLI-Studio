import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { StudioStore } from './store.js';

describe('StudioStore', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'opencli-studio-store-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('stores favorites and presets for later retrieval', () => {
    const store = new StudioStore(tempDir);
    try {
      const favorite = store.setFavorite({
        kind: 'command',
        targetId: 'google/trends',
        favorite: true,
      });

      const preset = store.savePreset({
        kind: 'workbench',
        name: 'US Trends',
        description: 'Track daily US trends',
        state: {
          command: 'google/trends',
          args: { region: 'US', limit: 10 },
        },
      });

      expect(favorite).toMatchObject({
        kind: 'command',
        targetId: 'google/trends',
      });
      expect(store.listFavorites()).toMatchObject([
        {
          kind: 'command',
          targetId: 'google/trends',
        },
      ]);

      expect(preset).toMatchObject({
        kind: 'workbench',
        name: 'US Trends',
        description: 'Track daily US trends',
        state: {
          command: 'google/trends',
          args: { region: 'US', limit: 10 },
        },
      });
      expect(store.listPresets()).toHaveLength(1);

      store.setFavorite({
        kind: 'command',
        targetId: 'google/trends',
        favorite: false,
      });
      store.deletePreset(preset.id);

      expect(store.listFavorites()).toEqual([]);
      expect(store.listPresets()).toEqual([]);
    } finally {
      store.close();
    }
  });

  it('stores snapshots and jobs for recurring captures', () => {
    const store = new StudioStore(tempDir);
    try {
      const job = store.saveJob({
        sourceKind: 'recipe',
        sourceId: 'google-trends',
        command: 'google/trends',
        name: 'Google Trends Hourly',
        description: 'Capture hourly trend snapshots',
        args: { region: 'US', limit: 10 },
        intervalMinutes: 60,
        enabled: true,
      });

      expect(job).toMatchObject({
        sourceKind: 'recipe',
        sourceId: 'google-trends',
        command: 'google/trends',
        intervalMinutes: 60,
        enabled: true,
        lastStatus: 'idle',
      });
      expect(store.listJobs()).toHaveLength(1);

      const snapshot = store.recordSnapshot({
        sourceKind: 'recipe',
        sourceId: 'google-trends',
        sourceName: 'Google Trends',
        command: 'google/trends',
        args: { region: 'US', limit: 10 },
        status: 'success',
        result: {
          items: [
            { title: 'AI', score: 93 },
            { title: 'OpenAI', score: 84 },
          ],
        },
        error: null,
        capturedAt: '2026-04-14T00:00:00.000Z',
        durationMs: 321,
      });

      expect(snapshot).toMatchObject({
        sourceKind: 'recipe',
        sourceId: 'google-trends',
        command: 'google/trends',
        status: 'success',
      });
      expect(store.listSnapshots({ sourceKind: 'recipe', sourceId: 'google-trends' })).toHaveLength(1);

      const updatedJob = store.markJobRun({
        id: job.id,
        lastRunAt: '2026-04-14T00:00:00.000Z',
        nextRunAt: '2026-04-14T01:00:00.000Z',
        lastStatus: 'success',
      });

      expect(updatedJob).toMatchObject({
        id: job.id,
        lastStatus: 'success',
        lastRunAt: '2026-04-14T00:00:00.000Z',
        nextRunAt: '2026-04-14T01:00:00.000Z',
      });

      store.deleteJob(job.id);
      expect(store.listJobs()).toEqual([]);
    } finally {
      store.close();
    }
  });
});
