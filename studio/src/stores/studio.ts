import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { executeCommand as postExecuteCommand, fetchDoctor, fetchEnv, fetchHistory, fetchRecipes, fetchRegistry } from '../lib/api';
import { pickDefaultWorkbenchCommand } from '../lib/registry';
import type {
  ExecuteResponse,
  StudioDoctorResult,
  StudioEnv,
  StudioHistoryEntry,
  StudioRecipe,
  StudioRegistryPayload,
} from '../types';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const useStudioStore = defineStore('studio', () => {
  const registry = ref<StudioRegistryPayload>({ commands: [], sites: [] });
  const env = ref<StudioEnv | null>(null);
  const history = ref<StudioHistoryEntry[]>([]);
  const recipes = ref<StudioRecipe[]>([]);
  const doctor = ref<StudioDoctorResult | null>(null);
  const lastExecution = ref<ExecuteResponse | null>(null);

  const initializing = ref(false);
  const runningCommand = ref(false);
  const runningDoctor = ref(false);
  const loadError = ref<string | null>(null);
  const executionError = ref<string | null>(null);

  const selectedCommand = ref('');
  const selectedRecipeId = ref('');

  const selectedCommandItem = computed(() =>
    registry.value.commands.find((command) => command.command === selectedCommand.value) ?? null,
  );
  const selectedRecipe = computed(() =>
    recipes.value.find((recipe) => recipe.id === selectedRecipeId.value) ?? null,
  );

  function setSelectedCommand(command: string): void {
    selectedCommand.value = command;
  }

  function setSelectedRecipe(recipeId: string): void {
    selectedRecipeId.value = recipeId;
  }

  async function loadShell(force: boolean = false): Promise<void> {
    if (initializing.value) return;
    if (!force && registry.value.commands.length > 0 && env.value) return;

    initializing.value = true;
    loadError.value = null;

    try {
      const [registryPayload, historyPayload, envPayload, recipePayload] = await Promise.all([
        fetchRegistry(),
        fetchHistory(),
        fetchEnv(),
        fetchRecipes(),
      ]);

      registry.value = registryPayload;
      history.value = historyPayload.entries;
      env.value = envPayload;
      recipes.value = recipePayload.recipes;

      if (!selectedCommand.value) {
        selectedCommand.value = pickDefaultWorkbenchCommand(registryPayload.commands);
      }
      if (!selectedRecipeId.value) {
        selectedRecipeId.value = recipePayload.recipes[0]?.id ?? '';
      }
    } catch (error) {
      loadError.value = getErrorMessage(error);
    } finally {
      initializing.value = false;
    }
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
    doctor,
    lastExecution,
    initializing,
    runningCommand,
    runningDoctor,
    loadError,
    executionError,
    selectedCommand,
    selectedRecipeId,
    selectedCommandItem,
    selectedRecipe,
    setSelectedCommand,
    setSelectedRecipe,
    loadShell,
    runCommand,
    runRecipe,
    refreshHistory,
    runDoctor,
  };
});
