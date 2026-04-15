import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const {
  mockCaptureSnapshot,
  mockDeleteJob,
  mockDeletePreset,
  mockExecuteCommand,
  mockFetchDoctor,
  mockFetchEnv,
  mockFetchExternalClis,
  mockFetchFavorites,
  mockFetchHistory,
  mockFetchJobs,
  mockFetchPresets,
  mockFetchPlugins,
  mockFetchRecipes,
  mockFetchRegistry,
  mockFetchSiteAccess,
  mockFetchSnapshots,
  mockRunJobNow,
  mockSaveJob,
  mockSavePreset,
  mockSetFavorite,
} = vi.hoisted(() => ({
  mockCaptureSnapshot: vi.fn(),
  mockDeleteJob: vi.fn(),
  mockDeletePreset: vi.fn(),
  mockExecuteCommand: vi.fn(),
  mockFetchDoctor: vi.fn(),
  mockFetchEnv: vi.fn(),
  mockFetchExternalClis: vi.fn(),
  mockFetchFavorites: vi.fn(),
  mockFetchHistory: vi.fn(),
  mockFetchJobs: vi.fn(),
  mockFetchPresets: vi.fn(),
  mockFetchPlugins: vi.fn(),
  mockFetchRecipes: vi.fn(),
  mockFetchRegistry: vi.fn(),
  mockFetchSiteAccess: vi.fn(),
  mockFetchSnapshots: vi.fn(),
  mockRunJobNow: vi.fn(),
  mockSaveJob: vi.fn(),
  mockSavePreset: vi.fn(),
  mockSetFavorite: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  captureSnapshot: mockCaptureSnapshot,
  deleteJob: mockDeleteJob,
  deletePreset: mockDeletePreset,
  executeCommand: mockExecuteCommand,
  fetchDoctor: mockFetchDoctor,
  fetchEnv: mockFetchEnv,
  fetchExternalClis: mockFetchExternalClis,
  fetchFavorites: mockFetchFavorites,
  fetchHistory: mockFetchHistory,
  fetchJobs: mockFetchJobs,
  fetchPresets: mockFetchPresets,
  fetchPlugins: mockFetchPlugins,
  fetchRecipes: mockFetchRecipes,
  fetchRegistry: mockFetchRegistry,
  fetchSiteAccess: mockFetchSiteAccess,
  fetchSnapshots: mockFetchSnapshots,
  runJobNow: mockRunJobNow,
  saveJob: mockSaveJob,
  savePreset: mockSavePreset,
  setFavorite: mockSetFavorite,
}));

import { useStudioStore } from './studio';
import type { ExecuteResponse, StudioCommandItem, StudioHistoryEntry } from '../types';

function makeCommand(overrides: Partial<StudioCommandItem> = {}): StudioCommandItem {
  return {
    command: 'google/trends',
    site: 'google',
    name: 'trends',
    description: 'Daily search trends',
    args: [],
    browser: false,
    strategy: 'public',
    meta: {
      surface: 'builtin',
      mode: 'public',
      capability: 'discovery',
      risk: 'safe',
      market: 'international',
      siteCategory: 'news',
      uiHints: {
        supportsLists: true,
        supportsDetails: false,
        supportsCharts: true,
        supportsTimeSeries: true,
      },
    },
    ...overrides,
  };
}

function makeHistoryEntry(overrides: Partial<StudioHistoryEntry> = {}): StudioHistoryEntry {
  return {
    id: 1,
    command: 'google/trends',
    site: 'google',
    name: 'trends',
    status: 'success',
    args: {},
    result: { rows: [{ title: 'Launch week' }] },
    error: null,
    startedAt: '2026-04-16T00:00:00.000Z',
    finishedAt: '2026-04-16T00:00:00.750Z',
    durationMs: 750,
    ...overrides,
  };
}

function makeExecuteResponse(overrides: Partial<ExecuteResponse> = {}): ExecuteResponse {
  const historyEntry = makeHistoryEntry(overrides.historyEntry);
  return {
    command: historyEntry.command,
    result: historyEntry.result,
    historyEntry,
    ...overrides,
  };
}

describe('useStudioStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('keeps guarded workbench commands hidden until advanced mode is enabled', () => {
    const store = useStudioStore();
    store.registry = {
      commands: [
        makeCommand({
          command: 'bilibili/hot',
          site: 'bilibili',
          name: 'hot',
          description: 'Top hot content',
          browser: true,
          strategy: 'cookie',
          meta: {
            surface: 'builtin',
            mode: 'browser',
            capability: 'discovery',
            risk: 'safe',
            market: 'domestic',
            siteCategory: 'video',
            uiHints: {
              supportsLists: true,
              supportsDetails: false,
              supportsCharts: true,
              supportsTimeSeries: true,
            },
          },
        }),
        makeCommand(),
        makeCommand({
          command: 'douyin/publish',
          site: 'douyin',
          name: 'publish',
          description: 'Publish a work item',
          browser: true,
          strategy: 'cookie',
          meta: {
            surface: 'plugin',
            mode: 'browser',
            capability: 'action',
            risk: 'confirm',
            market: 'domestic',
            siteCategory: 'video',
            uiHints: {
              supportsLists: false,
              supportsDetails: false,
              supportsCharts: false,
              supportsTimeSeries: false,
            },
          },
        }),
      ],
      sites: [],
    };

    expect(store.availableWorkbenchCommands.map((item) => item.command)).toEqual([
      'bilibili/hot',
      'google/trends',
    ]);

    store.setAdvancedMode(true);

    expect(store.availableWorkbenchCommands.map((item) => item.command)).toEqual([
      'bilibili/hot',
      'google/trends',
      'douyin/publish',
    ]);
  });

  it('falls back to a safe default when advanced mode is turned off', () => {
    const store = useStudioStore();
    store.registry = {
      commands: [
        makeCommand({
          command: 'bilibili/hot',
          site: 'bilibili',
          name: 'hot',
          description: 'Top hot content',
          browser: true,
          strategy: 'cookie',
          meta: {
            surface: 'builtin',
            mode: 'browser',
            capability: 'discovery',
            risk: 'safe',
            market: 'domestic',
            siteCategory: 'video',
            uiHints: {
              supportsLists: true,
              supportsDetails: false,
              supportsCharts: true,
              supportsTimeSeries: true,
            },
          },
        }),
        makeCommand(),
        makeCommand({
          command: 'douyin/publish',
          site: 'douyin',
          name: 'publish',
          description: 'Publish a work item',
          browser: true,
          strategy: 'cookie',
          meta: {
            surface: 'plugin',
            mode: 'browser',
            capability: 'action',
            risk: 'confirm',
            market: 'domestic',
            siteCategory: 'video',
            uiHints: {
              supportsLists: false,
              supportsDetails: false,
              supportsCharts: false,
              supportsTimeSeries: false,
            },
          },
        }),
      ],
      sites: [],
    };

    store.setAdvancedMode(true);
    store.setSelectedCommand('douyin/publish');

    expect(store.selectedCommand).toBe('douyin/publish');

    store.setAdvancedMode(false);

    expect(store.selectedCommand).toBe('bilibili/hot');
  });

  it('clears stale execution output before a rerun fails', async () => {
    const store = useStudioStore();
    const firstResponse = makeExecuteResponse();

    mockExecuteCommand
      .mockResolvedValueOnce(firstResponse)
      .mockRejectedValueOnce(new Error('Bridge session expired'));

    await expect(store.runCommand('google/trends', { region: 'US' })).resolves.toEqual(firstResponse);

    expect(store.lastExecution).toEqual(firstResponse);
    expect(store.executionError).toBeNull();

    await expect(store.runCommand('google/trends', { region: 'CN' })).rejects.toThrow('Bridge session expired');

    expect(store.lastExecution).toBeNull();
    expect(store.executionError).toBe('Bridge session expired');
  });
});
