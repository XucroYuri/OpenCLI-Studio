import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  deletePreset as requestDeletePreset,
  executeCommand as postExecuteCommand,
  fetchDoctor,
  fetchEnv,
  fetchFavorites,
  fetchHistory,
  fetchPresets,
  fetchRecipes,
  fetchRegistry,
  savePreset as requestSavePreset,
  setFavorite as requestSetFavorite,
} from '../lib/api';
import { listWorkbenchCommands, pickDefaultWorkbenchCommand } from '../lib/registry';
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readBooleanPreference(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === '1';
}

function writeBooleanPreference(key: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value ? '1' : '0');
}

export const useStudioStore = defineStore('studio', () => {
  const registry = ref<StudioRegistryPayload>({ commands: [], sites: [] });
  const env = ref<StudioEnv | null>(null);
  const history = ref<StudioHistoryEntry[]>([]);
  const recipes = ref<StudioRecipe[]>([]);
  const favorites = ref<StudioFavoriteEntry[]>([]);
  const presets = ref<StudioPresetEntry[]>([]);
  const doctor = ref<StudioDoctorResult | null>(null);
  const lastExecution = ref<ExecuteResponse | null>(null);
  const stagedWorkbenchArgs = ref<Record<string, unknown> | null>(null);
  const stagedInsightArgs = ref<Record<string, unknown> | null>(null);

  const initializing = ref(false);
  const runningCommand = ref(false);
  const runningDoctor = ref(false);
  const loadError = ref<string | null>(null);
  const executionError = ref<string | null>(null);

  const selectedCommand = ref('');
  const selectedRecipeId = ref('');
  const advancedMode = ref(readBooleanPreference('opencli-studio:advanced-mode', false));

  const selectedCommandItem = computed(() =>
    registry.value.commands.find((command) => command.command === selectedCommand.value) ?? null,
  );
  const selectedRecipe = computed(() =>
    recipes.value.find((recipe) => recipe.id === selectedRecipeId.value) ?? null,
  );
  const availableWorkbenchCommands = computed(() =>
    listWorkbenchCommands(registry.value.commands, advancedMode.value),
  );
  const favoriteCommandIds = computed(() =>
    new Set(
      favorites.value
        .filter((entry) => entry.kind === 'command')
        .map((entry) => entry.targetId),
    ),
  );
  const favoriteRecipeIds = computed(() =>
    new Set(
      favorites.value
        .filter((entry) => entry.kind === 'recipe')
        .map((entry) => entry.targetId),
    ),
  );
  const registryPresets = computed(() =>
    presets.value.filter((preset) => preset.kind === 'registry'),
  );
  const workbenchPresets = computed(() =>
    presets.value.filter((preset) => preset.kind === 'workbench'),
  );
  const insightPresets = computed(() =>
    presets.value.filter((preset) => preset.kind === 'insight'),
  );

  function ensureSelectedCommand(): void {
    const nextCommand = pickDefaultWorkbenchCommand(
      registry.value.commands,
      selectedCommand.value,
      advancedMode.value,
    );

    if (nextCommand) {
      selectedCommand.value = nextCommand;
    }
  }

  function setSelectedCommand(command: string): void {
    selectedCommand.value = command;
  }

  function setSelectedRecipe(recipeId: string): void {
    selectedRecipeId.value = recipeId;
  }

  function setAdvancedMode(value: boolean): void {
    advancedMode.value = value;
    writeBooleanPreference('opencli-studio:advanced-mode', value);
    ensureSelectedCommand();
  }

  async function loadShell(force: boolean = false): Promise<void> {
    if (initializing.value) return;
    if (!force && registry.value.commands.length > 0 && env.value) return;

    initializing.value = true;
    loadError.value = null;

    try {
      const [
        registryPayload,
        historyPayload,
        envPayload,
        recipePayload,
        favoritesPayload,
        presetsPayload,
      ] = await Promise.all([
        fetchRegistry(),
        fetchHistory(),
        fetchEnv(),
        fetchRecipes(),
        fetchFavorites(),
        fetchPresets(),
      ]);

      registry.value = registryPayload;
      history.value = historyPayload.entries;
      env.value = envPayload;
      recipes.value = recipePayload.recipes;
      favorites.value = favoritesPayload.entries;
      presets.value = presetsPayload.presets;

      selectedCommand.value = pickDefaultWorkbenchCommand(
        registryPayload.commands,
        selectedCommand.value,
        advancedMode.value,
      );
      if (!selectedRecipeId.value) {
        selectedRecipeId.value = recipePayload.recipes[0]?.id ?? '';
      }
    } catch (error) {
      loadError.value = getErrorMessage(error);
    } finally {
      initializing.value = false;
    }
  }

  function stageWorkbenchArgs(args: Record<string, unknown>): void {
    stagedWorkbenchArgs.value = { ...args };
  }

  function consumeWorkbenchArgs(): Record<string, unknown> | null {
    const nextArgs = stagedWorkbenchArgs.value;
    stagedWorkbenchArgs.value = null;
    return nextArgs;
  }

  function stageInsightArgs(args: Record<string, unknown>): void {
    stagedInsightArgs.value = { ...args };
  }

  function consumeInsightArgs(): Record<string, unknown> | null {
    const nextArgs = stagedInsightArgs.value;
    stagedInsightArgs.value = null;
    return nextArgs;
  }

  function upsertHistory(entry: StudioHistoryEntry): void {
    history.value = [entry, ...history.value.filter((item) => item.id !== entry.id)].slice(0, 50);
  }

  async function runCommand(command: string, args: Record<string, unknown>): Promise<ExecuteResponse> {
    runningCommand.value = true;
    executionError.value = null;

    try {
      const response = await postExecuteCommand(command, args);
      lastExecution.value = response;
      upsertHistory(response.historyEntry);
      selectedCommand.value = command;
      return response;
    } catch (error) {
      executionError.value = getErrorMessage(error);
      throw error;
    } finally {
      runningCommand.value = false;
    }
  }

  async function runRecipe(recipeId: string, overrides: Record<string, unknown> = {}): Promise<ExecuteResponse> {
    const recipe = recipes.value.find((item) => item.id === recipeId);
    if (!recipe) {
      throw new Error(`Unknown recipe: ${recipeId}`);
    }

    selectedRecipeId.value = recipeId;
    return runCommand(recipe.command, {
      ...recipe.defaultArgs,
      ...overrides,
    });
  }

  async function refreshHistory(): Promise<void> {
    const historyPayload = await fetchHistory();
    history.value = historyPayload.entries;
  }

  async function refreshFavorites(): Promise<void> {
    const favoritesPayload = await fetchFavorites();
    favorites.value = favoritesPayload.entries;
  }

  async function refreshPresets(): Promise<void> {
    const presetsPayload = await fetchPresets();
    presets.value = presetsPayload.presets;
  }

  async function toggleFavorite(
    kind: StudioFavoriteKind,
    targetId: string,
    favorite: boolean,
  ): Promise<void> {
    await requestSetFavorite(kind, targetId, favorite);
    await refreshFavorites();
  }

  async function savePreset(input: {
    id?: number;
    kind: StudioPresetKind;
    name: string;
    description?: string | null;
    state: Record<string, unknown>;
  }): Promise<StudioPresetEntry> {
    const response = await requestSavePreset(input);
    const nextPreset = response.preset;
    presets.value = [nextPreset, ...presets.value.filter((preset) => preset.id !== nextPreset.id)];
    return nextPreset;
  }

  async function deletePreset(id: number): Promise<void> {
    await requestDeletePreset(id);
    presets.value = presets.value.filter((preset) => preset.id !== id);
  }

  async function runDoctor(): Promise<void> {
    runningDoctor.value = true;

    try {
      doctor.value = await fetchDoctor();
    } finally {
      runningDoctor.value = false;
    }
  }

  return {
    registry,
    env,
    history,
    recipes,
    favorites,
    presets,
    doctor,
    lastExecution,
    stagedWorkbenchArgs,
    stagedInsightArgs,
    initializing,
    runningCommand,
    runningDoctor,
    loadError,
    executionError,
    selectedCommand,
    selectedRecipeId,
    advancedMode,
    selectedCommandItem,
    selectedRecipe,
    availableWorkbenchCommands,
    favoriteCommandIds,
    favoriteRecipeIds,
    registryPresets,
    workbenchPresets,
    insightPresets,
    setSelectedCommand,
    setSelectedRecipe,
    setAdvancedMode,
    stageWorkbenchArgs,
    consumeWorkbenchArgs,
    stageInsightArgs,
    consumeInsightArgs,
    loadShell,
    runCommand,
    runRecipe,
    refreshHistory,
    refreshFavorites,
    refreshPresets,
    toggleFavorite,
    savePreset,
    deletePreset,
    runDoctor,
  };
});
