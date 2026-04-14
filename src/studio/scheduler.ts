import { StudioStore, type RecordStudioSnapshotInput } from './store.js';
import type { StudioJobEntry, StudioSnapshotEntry } from './types.js';

export interface StudioJobSchedulerOptions {
  store: StudioStore;
  resolveSourceName: (job: StudioJobEntry) => string;
  execute: (command: string, args: Record<string, unknown>) => Promise<unknown>;
}

export class StudioJobScheduler {
  private readonly store: StudioStore;
  private readonly resolveSourceName: StudioJobSchedulerOptions['resolveSourceName'];
  private readonly execute: StudioJobSchedulerOptions['execute'];
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(options: StudioJobSchedulerOptions) {
    this.store = options.store;
    this.resolveSourceName = options.resolveSourceName;
    this.execute = options.execute;
  }

  start(): void {
    this.sync();
  }

  sync(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    for (const job of this.store.listJobs()) {
      this.schedule(job);
    }
  }

  async runNow(jobId: number): Promise<{ job: StudioJobEntry; snapshot: StudioSnapshotEntry }> {
    const job = this.store.listJobs().find((entry) => entry.id === jobId);
    if (!job) {
      throw new Error(`Unknown job: ${jobId}`);
    }

    const snapshot = await this.executeJob(job);
    return { job: this.store.listJobs().find((entry) => entry.id === jobId)!, snapshot };
  }

  close(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  private schedule(job: StudioJobEntry): void {
    if (!job.enabled) return;

    const nextRunAt = job.nextRunAt
      ? Date.parse(job.nextRunAt)
      : Date.now() + job.intervalMinutes * 60_000;
    const delay = Math.max(0, nextRunAt - Date.now());

    const timer = setTimeout(() => {
      void this.executeJob(job)
        .catch(() => undefined)
        .finally(() => {
          this.sync();
        });
    }, delay);

    this.timers.set(job.id, timer);
  }

  private async executeJob(job: StudioJobEntry) {
    const capturedAt = new Date().toISOString();
    const started = Date.now();

    try {
      const result = await this.execute(job.command, job.args);
      const snapshot = this.store.recordSnapshot({
        sourceKind: job.sourceKind,
        sourceId: job.sourceId,
        sourceName: this.resolveSourceName(job),
        command: job.command,
        args: job.args,
        status: 'success',
        result,
        error: null,
        capturedAt,
        durationMs: Date.now() - started,
      });
      this.store.markJobRun({
        id: job.id,
        lastRunAt: capturedAt,
        nextRunAt: new Date(Date.now() + job.intervalMinutes * 60_000).toISOString(),
        lastStatus: 'success',
      });
      return snapshot;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const snapshot = this.store.recordSnapshot({
        sourceKind: job.sourceKind,
        sourceId: job.sourceId,
        sourceName: this.resolveSourceName(job),
        command: job.command,
        args: job.args,
        status: 'error',
        result: null,
        error: { message },
        capturedAt,
        durationMs: Date.now() - started,
      });
      this.store.markJobRun({
        id: job.id,
        lastRunAt: capturedAt,
        nextRunAt: new Date(Date.now() + job.intervalMinutes * 60_000).toISOString(),
        lastStatus: 'error',
      });
      return snapshot;
    }
  }
}
