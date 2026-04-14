import type {
  ExecuteResponse,
  StudioFavoriteEntry,
  StudioFavoriteKind,
  StudioDoctorResult,
  StudioEnv,
  StudioHistoryEntry,
  StudioPresetEntry,
  StudioPresetKind,
  StudioRecipe,
  StudioRegistryPayload,
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

export async function fetchEnv(): Promise<StudioEnv> {
  return requestJson<StudioEnv>('/api/env');
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

export async function fetchDoctor(): Promise<StudioDoctorResult> {
  return requestJson<StudioDoctorResult>('/api/doctor', {
    method: 'POST',
  });
}

export async function executeCommand(command: string, args: Record<string, unknown>): Promise<ExecuteResponse> {
  return requestJson<ExecuteResponse>('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, args }),
  });
}
