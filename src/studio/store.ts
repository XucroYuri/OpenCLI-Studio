import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  StudioFavoriteEntry,
  StudioFavoriteKind,
  StudioHistoryEntry,
  StudioPresetEntry,
  StudioPresetKind,
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
}
