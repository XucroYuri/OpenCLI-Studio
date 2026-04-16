import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { StudioJobScheduler } from './scheduler.js';
import { StudioStore } from './store.js';

describe('StudioJobScheduler', () => {
  let tempDir: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'opencli-studio-scheduler-'));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('runs enabled jobs on schedule and records snapshots', async () => {
    const store = new StudioStore(tempDir);
    try {
      store.saveJob({
        sourceKind: 'recipe',
        sourceId: 'google-trends',
        command: 'google/trends',
        name: 'Google Trends Rapid',
        args: { region: 'US' },
        intervalMinutes: 0.001,
        enabled: true,
      });

      const execute = vi.fn(async () => ({
        items: [{ title: 'AI', score: 99 }],
      }));

      const scheduler = new StudioJobScheduler({
        store,
        resolveSourceName: (job) => job.name,
        execute,
      });

      scheduler.start();
      await vi.advanceTimersByTimeAsync(70);

      expect(execute).toHaveBeenCalledTimes(1);
      expect(store.listSnapshots({ sourceKind: 'recipe', sourceId: 'google-trends' })).toHaveLength(1);
      expect(store.listJobs()[0]).toMatchObject({
        lastStatus: 'success',
      });

      scheduler.close();
    } finally {
      store.close();
    }
  });
});
