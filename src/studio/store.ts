import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  StudioFavoriteEntry,
  StudioFavoriteKind,
  StudioHistoryEntry,
  StudioJobEntry,
  StudioPresetEntry,
  StudioPresetKind,
  StudioSnapshotEntry,
  StudioSnapshotListOptions,
  StudioSnapshotSourceKind,
} from './types.js';

export interface RecordStudioRunInput {
  command: string;
  site: string;
  name: string;
  status: 'success' | 'error';
  args: Record<string, unknown>;
  result: unknown;
  error: { message: string } | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface SetStudioFavoriteInput {
  kind: StudioFavoriteKind;
  targetId: string;
  favorite: boolean;
}

export interface SaveStudioPresetInput {
  id?: number;
  kind: StudioPresetKind;
  name: string;
  description?: string | null;
  state: Record<string, unknown>;
}

export interface RecordStudioSnapshotInput {
  sourceKind: StudioSnapshotSourceKind;
  sourceId: string;
  sourceName: string;
  command: string;
  args: Record<string, unknown>;
  status: 'success' | 'error';
  result: unknown;
  error: { message: string } | null;
  capturedAt: string;
  durationMs: number;
}

export interface SaveStudioJobInput {
  id?: number;
  sourceKind: StudioSnapshotSourceKind;
  sourceId: string;
  command: string;
  name: string;
  description?: string | null;
  args: Record<string, unknown>;
  intervalMinutes: number;
  enabled: boolean;
}

export interface MarkStudioJobRunInput {
  id: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: StudioJobEntry['lastStatus'];
}

function parseJson<T>(value: string | null): T {
  if (!value) return null as T;
  return JSON.parse(value) as T;
}

export class StudioStore {
  private readonly db: DatabaseSync;

  constructor(storageDir: string) {
    fs.mkdirSync(storageDir, { recursive: true });
    const dbPath = path.join(storageDir, 'studio.db');
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS run_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command TEXT NOT NULL,
        site TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        args_json TEXT NOT NULL,
        result_json TEXT,
        error_json TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT NOT NULL,
        duration_ms INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS favorites (
        kind TEXT NOT NULL,
        target_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (kind, target_id)
      );

      CREATE TABLE IF NOT EXISTS saved_presets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        state_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_kind TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_name TEXT NOT NULL,
        command TEXT NOT NULL,
        args_json TEXT NOT NULL,
        status TEXT NOT NULL,
        result_json TEXT,
        error_json TEXT,
        captured_at TEXT NOT NULL,
        duration_ms INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_kind TEXT NOT NULL,
        source_id TEXT NOT NULL,
        command TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        args_json TEXT NOT NULL,
        interval_minutes REAL NOT NULL,
        enabled INTEGER NOT NULL,
        last_status TEXT NOT NULL,
        last_run_at TEXT,
        next_run_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  recordRun(input: RecordStudioRunInput): StudioHistoryEntry {
    const statement = this.db.prepare(`
      INSERT INTO run_history (
        command,
        site,
        name,
        status,
        args_json,
        result_json,
        error_json,
        started_at,
        finished_at,
        duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    const row = statement.get(
      input.command,
      input.site,
      input.name,
      input.status,
      JSON.stringify(input.args ?? {}),
      JSON.stringify(input.result ?? null),
      JSON.stringify(input.error ?? null),
      input.startedAt,
      input.finishedAt,
      input.durationMs,
    ) as Record<string, unknown>;

    return this.toHistoryEntry(row);
  }

  listHistory(limit: number = 50): StudioHistoryEntry[] {
    const statement = this.db.prepare(`
      SELECT *
      FROM run_history
      ORDER BY id DESC
      LIMIT ?
    `);

    return statement.all(limit).map((row) => this.toHistoryEntry(row as Record<string, unknown>));
  }

  recordSnapshot(input: RecordStudioSnapshotInput): StudioSnapshotEntry {
    const statement = this.db.prepare(`
      INSERT INTO snapshots (
        source_kind,
        source_id,
        source_name,
        command,
        args_json,
        status,
        result_json,
        error_json,
        captured_at,
        duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    const row = statement.get(
      input.sourceKind,
      input.sourceId,
      input.sourceName,
      input.command,
      JSON.stringify(input.args ?? {}),
      input.status,
      JSON.stringify(input.result ?? null),
      JSON.stringify(input.error ?? null),
      input.capturedAt,
      input.durationMs,
    ) as Record<string, unknown>;

    return this.toSnapshotEntry(row);
  }

  listSnapshots(options: StudioSnapshotListOptions = {}): StudioSnapshotEntry[] {
    const clauses: string[] = [];
    const values: Array<string | number> = [];

    if (options.sourceKind) {
      clauses.push('source_kind = ?');
      values.push(options.sourceKind);
    }

    if (options.sourceId) {
      clauses.push('source_id = ?');
      values.push(options.sourceId);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = options.limit ?? 50;
    const statement = this.db.prepare(`
      SELECT *
      FROM snapshots
      ${whereClause}
      ORDER BY id DESC
      LIMIT ?
    `);

    return statement.all(...values, limit).map((row) => this.toSnapshotEntry(row as Record<string, unknown>));
  }

  setFavorite(input: SetStudioFavoriteInput): StudioFavoriteEntry | null {
    if (!input.favorite) {
      const statement = this.db.prepare(`
        DELETE FROM favorites
        WHERE kind = ? AND target_id = ?
      `);
      statement.run(input.kind, input.targetId);
      return null;
    }

    const createdAt = new Date().toISOString();
    const statement = this.db.prepare(`
      INSERT INTO favorites (
        kind,
        target_id,
        created_at
      ) VALUES (?, ?, ?)
      ON CONFLICT(kind, target_id) DO UPDATE SET
        created_at = excluded.created_at
      RETURNING *
    `);
    const row = statement.get(input.kind, input.targetId, createdAt) as Record<string, unknown>;
    return this.toFavoriteEntry(row);
  }

  listFavorites(): StudioFavoriteEntry[] {
    const statement = this.db.prepare(`
      SELECT *
      FROM favorites
      ORDER BY created_at DESC
    `);
    return statement.all().map((row) => this.toFavoriteEntry(row as Record<string, unknown>));
  }

  savePreset(input: SaveStudioPresetInput): StudioPresetEntry {
    const timestamp = new Date().toISOString();

    if (input.id) {
      const updateStatement = this.db.prepare(`
        UPDATE saved_presets
        SET
          kind = ?,
          name = ?,
          description = ?,
          state_json = ?,
          updated_at = ?
        WHERE id = ?
      `);
      updateStatement.run(
        input.kind,
        input.name,
        input.description ?? null,
        JSON.stringify(input.state ?? {}),
        timestamp,
        input.id,
      );

      const selectStatement = this.db.prepare(`
        SELECT *
        FROM saved_presets
        WHERE id = ?
      `);
      const row = selectStatement.get(input.id) as Record<string, unknown>;
      return this.toPresetEntry(row);
    }

    const insertStatement = this.db.prepare(`
      INSERT INTO saved_presets (
        kind,
        name,
        description,
        state_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    const row = insertStatement.get(
      input.kind,
      input.name,
      input.description ?? null,
      JSON.stringify(input.state ?? {}),
      timestamp,
      timestamp,
    ) as Record<string, unknown>;

    return this.toPresetEntry(row);
  }

  listPresets(): StudioPresetEntry[] {
    const statement = this.db.prepare(`
      SELECT *
      FROM saved_presets
      ORDER BY updated_at DESC, id DESC
    `);
    return statement.all().map((row) => this.toPresetEntry(row as Record<string, unknown>));
  }

  deletePreset(id: number): void {
    const statement = this.db.prepare(`
      DELETE FROM saved_presets
      WHERE id = ?
    `);
    statement.run(id);
  }

  saveJob(input: SaveStudioJobInput): StudioJobEntry {
    const timestamp = new Date().toISOString();
    const nextRunAt = input.enabled
      ? new Date(Date.now() + input.intervalMinutes * 60_000).toISOString()
      : null;

    if (input.id) {
      const updateStatement = this.db.prepare(`
        UPDATE jobs
        SET
          source_kind = ?,
          source_id = ?,
          command = ?,
          name = ?,
          description = ?,
          args_json = ?,
          interval_minutes = ?,
          enabled = ?,
          next_run_at = ?,
          updated_at = ?
        WHERE id = ?
      `);
      updateStatement.run(
        input.sourceKind,
        input.sourceId,
        input.command,
        input.name,
        input.description ?? null,
        JSON.stringify(input.args ?? {}),
        input.intervalMinutes,
        input.enabled ? 1 : 0,
        nextRunAt,
        timestamp,
        input.id,
      );

      const selectStatement = this.db.prepare(`
        SELECT *
        FROM jobs
        WHERE id = ?
      `);
      const row = selectStatement.get(input.id) as Record<string, unknown>;
      return this.toJobEntry(row);
    }

    const insertStatement = this.db.prepare(`
      INSERT INTO jobs (
        source_kind,
        source_id,
        command,
        name,
        description,
        args_json,
        interval_minutes,
        enabled,
        last_status,
        last_run_at,
        next_run_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    const row = insertStatement.get(
      input.sourceKind,
      input.sourceId,
      input.command,
      input.name,
      input.description ?? null,
      JSON.stringify(input.args ?? {}),
      input.intervalMinutes,
      input.enabled ? 1 : 0,
      'idle',
      null,
      nextRunAt,
      timestamp,
      timestamp,
    ) as Record<string, unknown>;

    return this.toJobEntry(row);
  }

  listJobs(): StudioJobEntry[] {
    const statement = this.db.prepare(`
      SELECT *
      FROM jobs
      ORDER BY updated_at DESC, id DESC
    `);
    return statement.all().map((row) => this.toJobEntry(row as Record<string, unknown>));
  }

  markJobRun(input: MarkStudioJobRunInput): StudioJobEntry {
    const statement = this.db.prepare(`
      UPDATE jobs
      SET
        last_status = ?,
        last_run_at = ?,
        next_run_at = ?,
        updated_at = ?
      WHERE id = ?
    `);
    statement.run(
      input.lastStatus,
      input.lastRunAt,
      input.nextRunAt,
      new Date().toISOString(),
      input.id,
    );

    const selectStatement = this.db.prepare(`
      SELECT *
      FROM jobs
      WHERE id = ?
    `);
    const row = selectStatement.get(input.id) as Record<string, unknown>;
    return this.toJobEntry(row);
  }

  deleteJob(id: number): void {
    const statement = this.db.prepare(`
      DELETE FROM jobs
      WHERE id = ?
    `);
    statement.run(id);
  }

  close(): void {
    this.db.close();
  }

  private toHistoryEntry(row: Record<string, unknown>): StudioHistoryEntry {
    return {
      id: Number(row.id),
      command: String(row.command),
      site: String(row.site),
      name: String(row.name),
      status: String(row.status) as StudioHistoryEntry['status'],
      args: parseJson<Record<string, unknown>>(String(row.args_json)),
      result: parseJson<unknown>(row.result_json === null ? null : String(row.result_json)),
      error: parseJson<{ message: string } | null>(row.error_json === null ? null : String(row.error_json)),
      startedAt: String(row.started_at),
      finishedAt: String(row.finished_at),
      durationMs: Number(row.duration_ms),
    };
  }

  private toFavoriteEntry(row: Record<string, unknown>): StudioFavoriteEntry {
    return {
      kind: String(row.kind) as StudioFavoriteKind,
      targetId: String(row.target_id),
      createdAt: String(row.created_at),
    };
  }

  private toPresetEntry(row: Record<string, unknown>): StudioPresetEntry {
    return {
      id: Number(row.id),
      kind: String(row.kind) as StudioPresetKind,
      name: String(row.name),
      description: row.description === null ? null : String(row.description),
      state: parseJson<Record<string, unknown>>(String(row.state_json)),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private toSnapshotEntry(row: Record<string, unknown>): StudioSnapshotEntry {
    return {
      id: Number(row.id),
      sourceKind: String(row.source_kind) as StudioSnapshotSourceKind,
      sourceId: String(row.source_id),
      sourceName: String(row.source_name),
      command: String(row.command),
      args: parseJson<Record<string, unknown>>(String(row.args_json)),
      status: String(row.status) as StudioSnapshotEntry['status'],
      result: parseJson<unknown>(row.result_json === null ? null : String(row.result_json)),
      error: parseJson<{ message: string } | null>(row.error_json === null ? null : String(row.error_json)),
      capturedAt: String(row.captured_at),
      durationMs: Number(row.duration_ms),
    };
  }

  private toJobEntry(row: Record<string, unknown>): StudioJobEntry {
    return {
      id: Number(row.id),
      sourceKind: String(row.source_kind) as StudioJobEntry['sourceKind'],
      sourceId: String(row.source_id),
      command: String(row.command),
      name: String(row.name),
      description: row.description === null ? null : String(row.description),
      args: parseJson<Record<string, unknown>>(String(row.args_json)),
      intervalMinutes: Number(row.interval_minutes),
      enabled: Number(row.enabled) === 1,
      lastStatus: String(row.last_status) as StudioJobEntry['lastStatus'],
      lastRunAt: row.last_run_at === null ? null : String(row.last_run_at),
      nextRunAt: row.next_run_at === null ? null : String(row.next_run_at),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
