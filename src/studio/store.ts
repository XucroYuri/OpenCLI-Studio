import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { StudioHistoryEntry } from './types.js';

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
}
