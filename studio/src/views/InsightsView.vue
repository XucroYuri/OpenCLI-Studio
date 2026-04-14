<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, NInputNumber, NTag, useMessage } from 'naive-ui';
import PresetShelf from '../components/PresetShelf.vue';
import ResultPanel from '../components/ResultPanel.vue';
import SavePresetButton from '../components/SavePresetButton.vue';
import { buildInsightPresetState, readInsightPresetState } from '../lib/preset-state';
import { buildInsightQuery, buildWorkbenchQuery, parseInsightQuery } from '../lib/routes';
import { useStudioStore } from '../stores/studio';
import type { StudioPresetEntry } from '../types';

const store = useStudioStore();
const route = useRoute();
const router = useRouter();
const message = useMessage();

const recipeModel = reactive<Record<string, any>>({});
const pendingRecipeArgs = ref<Record<string, unknown> | null>(store.consumeInsightArgs());

const initialInsightState = parseInsightQuery(route.query);
if (Object.prototype.hasOwnProperty.call(route.query, 'advanced')) {
  store.setAdvancedMode(initialInsightState.advancedMode);
}

const selectedRecipeId = computed({
  get: () => {
    const routeState = parseInsightQuery(route.query);
    if (routeState.recipeId) return routeState.recipeId;
    return store.selectedRecipeId || store.recipes[0]?.id || '';
  },
  set: (value: string) => {
    store.setSelectedRecipe(value);
    void router.replace({
      query: buildInsightQuery({
        recipeId: value,
        advancedMode: store.advancedMode,
      }),
    });
  },
});

const recipe = computed(() =>
  store.recipes.find((item) => item.id === selectedRecipeId.value) ?? null,
);

const recipeCommand = computed(() =>
  store.registry.commands.find((item) => item.command === recipe.value?.command) ?? null,
);

const currentResult = computed(() =>
  store.lastExecution && store.lastExecution.command === recipe.value?.command
    ? store.lastExecution.result
    : undefined,
);
const isFavoriteRecipe = computed(() =>
  recipe.value ? store.favoriteRecipeIds.has(recipe.value.id) : false,
);

function normalizeInputValue(value: unknown): string | number | boolean {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return JSON.stringify(value);
}

function resetRecipeModel(): void {
  for (const key of Object.keys(recipeModel)) {
    delete recipeModel[key];
  }

  if (!recipe.value) return;
  for (const [key, value] of Object.entries(recipe.value.defaultArgs)) {
    recipeModel[key] = normalizeInputValue(value);
  }
}

function applyArgsToRecipeModel(args: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(args)) {
    recipeModel[key] = normalizeInputValue(value);
  }
}

function queueRecipeArgs(args: Record<string, unknown>): void {
  pendingRecipeArgs.value = { ...args };
}

watch(recipe, () => {
  resetRecipeModel();
  if (pendingRecipeArgs.value) {
    applyArgsToRecipeModel(pendingRecipeArgs.value);
    pendingRecipeArgs.value = null;
  }
}, { immediate: true });

watch(() => route.query, (query) => {
  const nextState = parseInsightQuery(query);
  if (Object.prototype.hasOwnProperty.call(query, 'advanced')) {
    store.setAdvancedMode(nextState.advancedMode);
  }
  if (nextState.recipeId && nextState.recipeId !== store.selectedRecipeId) {
    store.setSelectedRecipe(nextState.recipeId);
  }

  const stagedArgs = store.consumeInsightArgs();
  if (stagedArgs) {
    queueRecipeArgs(stagedArgs);
  }
});

watch(() => store.advancedMode, (advancedMode) => {
  const nextQuery = buildInsightQuery({
    recipeId: selectedRecipeId.value,
    advancedMode,
  });

  if (JSON.stringify(route.query) !== JSON.stringify(nextQuery)) {
    void router.replace({ query: nextQuery });
  }
});

function fieldKind(value: unknown): 'number' | 'text' {
  return typeof value === 'number' ? 'number' : 'text';
}

function normalizedArgs(): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(recipeModel).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  );
}

async function runRecipe(): Promise<void> {
  if (!recipe.value) return;
  await store.runRecipe(recipe.value.id, normalizedArgs());
}

async function toggleRecipeFavorite(): Promise<void> {
  if (!recipe.value) return;

  const nextFavorite = !isFavoriteRecipe.value;
  await store.toggleFavorite('recipe', recipe.value.id, nextFavorite);
  message.success(nextFavorite ? `Favorited ${recipe.value.title}` : `Removed ${recipe.value.title} from favorites`);
}

async function saveInsightPreset(input: { name: string; description: string }): Promise<void> {
  if (!recipe.value) return;

  await store.savePreset({
    kind: 'insight',
    name: input.name,
    description: input.description || null,
    state: buildInsightPresetState({
      recipeId: recipe.value.id,
      args: normalizedArgs(),
      advancedMode: store.advancedMode,
    }),
  });
  message.success(`Saved insight preset "${input.name}"`);
}

function openInWorkbench(): void {
  if (!recipe.value) return;
  store.setSelectedCommand(recipe.value.command);
  store.stageWorkbenchArgs(normalizedArgs());
  void router.push({
    name: 'workbench',
    query: buildWorkbenchQuery({
      command: recipe.value.command,
      advancedMode: store.advancedMode,
    }),
  });
}

function applyInsightPreset(preset: StudioPresetEntry): void {
  const state = readInsightPresetState(preset.state);
  store.setAdvancedMode(state.advancedMode);
  queueRecipeArgs(state.args);
  if (selectedRecipeId.value !== state.recipeId) {
    selectedRecipeId.value = state.recipeId;
  } else {
    applyArgsToRecipeModel(state.args);
    pendingRecipeArgs.value = null;
  }
  message.success(`Applied preset "${preset.name}"`);
}

async function removeInsightPreset(preset: StudioPresetEntry): Promise<void> {
  const proceed = window.confirm(`Delete preset "${preset.name}"?`);
  if (!proceed) return;
  await store.deletePreset(preset.id);
  message.success(`Deleted preset "${preset.name}"`);
}
</script>

<template>
  <section class="page-grid">
    <n-card title="Recipe Catalog" class="glass-card">
      <div class="recipe-grid">
        <button
          v-for="item in store.recipes"
          :key="item.id"
          class="recipe-card"
          :class="{ 'recipe-card--active': item.id === selectedRecipeId }"
          @click="selectedRecipeId = item.id"
        >
          <div class="eyebrow">{{ item.command }}</div>
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
          <div class="chip-cloud">
            <span v-for="tag in item.tags" :key="tag" class="chip chip--small">{{ tag }}</span>
          </div>
        </button>
      </div>
    </n-card>

    <div class="split-grid">
      <n-card title="Recipe Controls" class="glass-card">
        <n-alert v-if="store.executionError" type="error" class="page-alert">
          {{ store.executionError }}
        </n-alert>
        <template v-if="recipe">
          <div class="chip-cloud">
            <n-tag size="small" type="warning">{{ recipe.command }}</n-tag>
            <n-tag v-if="recipeCommand" size="small" type="info">{{ recipeCommand.meta.mode }}</n-tag>
            <n-tag v-if="recipeCommand" size="small" type="success">{{ recipeCommand.meta.capability }}</n-tag>
          </div>
          <p class="panel-note">{{ recipe.description }}</p>
          <div class="card-actions">
            <n-button quaternary @click="toggleRecipeFavorite()">
              {{ isFavoriteRecipe ? 'Favorited' : 'Favorite Recipe' }}
            </n-button>
            <save-preset-button
              button-label="Save Preset"
              title="Save Insight Preset"
              description="Persist this recipe plus the current override values so you can replay the exact insight configuration."
              :default-name="recipe.title"
              :default-description="recipe.description"
              :save="saveInsightPreset"
            />
          </div>

          <n-form label-placement="top">
            <n-form-item
              v-for="[key, value] in Object.entries(recipeModel)"
              :key="key"
              :label="key"
            >
              <n-input-number
                v-if="fieldKind(value) === 'number'"
                v-model:value="recipeModel[key]"
                class="field-fill"
              />
              <n-input
                v-else
                v-model:value="recipeModel[key]"
              />
            </n-form-item>
          </n-form>

          <div class="card-actions">
            <n-button type="primary" :loading="store.runningCommand" @click="runRecipe()">Run Recipe</n-button>
            <n-button tertiary @click="openInWorkbench()">Open in Workbench</n-button>
            <n-button tertiary @click="resetRecipeModel()">Reset Defaults</n-button>
          </div>
        </template>
      </n-card>

      <div class="page-grid">
        <n-card title="Saved Presets" class="glass-card">
          <preset-shelf
            :presets="store.insightPresets"
            empty-description="Save recurring recipe configurations here for fast topic monitoring."
            @apply="applyInsightPreset"
            @remove="removeInsightPreset"
          />
        </n-card>

        <result-panel
          :title="recipe ? `${recipe.title} output` : 'Recipe output'"
          :result="currentResult"
        />
      </div>
    </div>
  </section>
</template>
