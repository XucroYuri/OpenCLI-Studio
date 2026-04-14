<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, NInputNumber, NTag } from 'naive-ui';
import ResultPanel from '../components/ResultPanel.vue';
import { useStudioStore } from '../stores/studio';

const store = useStudioStore();
const route = useRoute();
const router = useRouter();

const recipeModel = reactive<Record<string, any>>({});

const selectedRecipeId = computed({
  get: () => {
    if (typeof route.query.recipe === 'string' && route.query.recipe) {
      return route.query.recipe;
    }
    return store.selectedRecipeId || store.recipes[0]?.id || '';
  },
  set: (value: string) => {
    store.setSelectedRecipe(value);
    void router.replace({
      query: {
        ...route.query,
        recipe: value,
      },
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

watch(recipe, () => {
  resetRecipeModel();
}, { immediate: true });

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

function openInWorkbench(): void {
  if (!recipe.value) return;
  store.setSelectedCommand(recipe.value.command);
  void router.push({
    name: 'workbench',
    query: {
      command: recipe.value.command,
      ...(store.advancedMode ? { advanced: '1' } : {}),
    },
  });
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

      <result-panel
        :title="recipe ? `${recipe.title} output` : 'Recipe output'"
        :result="currentResult"
      />
    </div>
  </section>
</template>
