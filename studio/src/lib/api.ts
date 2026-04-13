import type {
  ExecuteResponse,
  StudioDoctorResult,
  StudioEnv,
  StudioHistoryEntry,
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
