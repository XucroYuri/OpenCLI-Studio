import type {
  ExecuteResponse,
  StudioExternalCliEntry,
  StudioFavoriteEntry,
  StudioFavoriteKind,
  StudioDoctorResult,
  StudioEnv,
  StudioHistoryEntry,
  StudioJobEntry,
  StudioPluginEntry,
  StudioPresetEntry,
  StudioPresetKind,
  StudioRecipe,
  StudioRegistryPayload,
  StudioSiteAccessEntry,
  StudioSnapshotEntry,
  StudioSnapshotSourceKind,
} from '../types';

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchRegistry(): Promise<StudioRegistryPayload> {
  return requestJson<StudioRegistryPayload>('/api/registry');
}

export async function fetchHistory(): Promise<{ entries: StudioHistoryEntry[] }> {
  return requestJson<{ entries: StudioHistoryEntry[] }>('/api/history');
}

export async function fetchSnapshots(input: {
  sourceKind?: StudioSnapshotSourceKind;
  sourceId?: string;
  limit?: number;
} = {}): Promise<{ entries: StudioSnapshotEntry[] }> {
  const query = new URLSearchParams();
  if (input.sourceKind) query.set('sourceKind', input.sourceKind);
  if (input.sourceId) query.set('sourceId', input.sourceId);
  if (input.limit) query.set('limit', String(input.limit));
  const suffix = query.size ? `?${query.toString()}` : '';
  return requestJson<{ entries: StudioSnapshotEntry[] }>(`/api/snapshots${suffix}`);
}

export async function captureSnapshot(input: {
  sourceKind: StudioSnapshotSourceKind;
  sourceId: string;
  command?: string;
  args?: Record<string, unknown>;
}): Promise<{ snapshot: StudioSnapshotEntry }> {
  return requestJson<{ snapshot: StudioSnapshotEntry }>('/api/snapshots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function fetchEnv(): Promise<StudioEnv> {
  return requestJson<StudioEnv>('/api/env');
}

export async function fetchPlugins(): Promise<{ entries: StudioPluginEntry[] }> {
  return requestJson<{ entries: StudioPluginEntry[] }>('/api/plugins');
}

export async function fetchExternalClis(): Promise<{ entries: StudioExternalCliEntry[] }> {
  return requestJson<{ entries: StudioExternalCliEntry[] }>('/api/external');
}

export async function installExternalCli(name: string): Promise<{ ok: boolean; entry: StudioExternalCliEntry }> {
  return requestJson<{ ok: boolean; entry: StudioExternalCliEntry }>(`/api/external/${encodeURIComponent(name)}/install`, {
    method: 'POST',
  });
}

export async function fetchRecipes(): Promise<{ recipes: StudioRecipe[] }> {
  return requestJson<{ recipes: StudioRecipe[] }>('/api/recipes');
}

export async function fetchFavorites(): Promise<{ entries: StudioFavoriteEntry[] }> {
  return requestJson<{ entries: StudioFavoriteEntry[] }>('/api/favorites');
}

export async function setFavorite(
  kind: StudioFavoriteKind,
  targetId: string,
  favorite: boolean,
): Promise<{ favorite: boolean; entry: StudioFavoriteEntry | null }> {
  return requestJson<{ favorite: boolean; entry: StudioFavoriteEntry | null }>('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, targetId, favorite }),
  });
}

export async function fetchPresets(): Promise<{ presets: StudioPresetEntry[] }> {
  return requestJson<{ presets: StudioPresetEntry[] }>('/api/presets');
}

export async function fetchJobs(): Promise<{ jobs: StudioJobEntry[] }> {
  return requestJson<{ jobs: StudioJobEntry[] }>('/api/jobs');
}

export async function saveJob(input: {
  id?: number;
  sourceKind: StudioSnapshotSourceKind;
  sourceId: string;
  command: string;
  name: string;
  description?: string | null;
  args: Record<string, unknown>;
  intervalMinutes: number;
  enabled: boolean;
}): Promise<{ job: StudioJobEntry }> {
  return requestJson<{ job: StudioJobEntry }>('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function runJobNow(id: number): Promise<{ job: StudioJobEntry; snapshot: StudioSnapshotEntry }> {
  return requestJson<{ job: StudioJobEntry; snapshot: StudioSnapshotEntry }>(`/api/jobs/${id}/run`, {
    method: 'POST',
  });
}

export async function deleteJob(id: number): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>(`/api/jobs/${id}`, {
    method: 'DELETE',
  });
}

export async function savePreset(input: {
  id?: number;
  kind: StudioPresetKind;
  name: string;
  description?: string | null;
  state: Record<string, unknown>;
}): Promise<{ preset: StudioPresetEntry }> {
  return requestJson<{ preset: StudioPresetEntry }>('/api/presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function deletePreset(id: number): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>(`/api/presets/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchDoctor(input: { live?: boolean; sessions?: boolean } = {}): Promise<StudioDoctorResult> {
  return requestJson<StudioDoctorResult>('/api/doctor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function fetchSiteAccess(sites: string[]): Promise<{ doctor: StudioDoctorResult | null; entries: StudioSiteAccessEntry[] }> {
  return requestJson<{ doctor: StudioDoctorResult | null; entries: StudioSiteAccessEntry[] }>('/api/site-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sites }),
  });
}

export async function executeCommand(command: string, args: Record<string, unknown>): Promise<ExecuteResponse> {
  return requestJson<ExecuteResponse>('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, args }),
  });
}
