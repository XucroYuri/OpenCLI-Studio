<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NEmpty, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, NTag, useMessage } from 'naive-ui';
import PresetShelf from '../components/PresetShelf.vue';
import ResultPanel from '../components/ResultPanel.vue';
import SavePresetButton from '../components/SavePresetButton.vue';
import { buildResultComparison } from '../lib/compare';
import { buildInsightPresetState, readInsightPresetState } from '../lib/preset-state';
import { buildCommandReadiness } from '../lib/readiness';
import { buildInsightQuery, buildWorkbenchQuery, parseInsightQuery } from '../lib/routes';
import { buildSnapshotTimelineRows } from '../lib/timeline';
import { useStudioStore } from '../stores/studio';
import type { StudioPresetEntry, StudioSnapshotEntry } from '../types';

const store = useStudioStore();
const route = useRoute();
const router = useRouter();
const message = useMessage();

const recipeModel = reactive<Record<string, any>>({});
const jobModel = reactive({
  intervalMinutes: 60,
  enabled: true,
});
const pendingRecipeArgs = ref<Record<string, unknown> | null>(store.consumeInsightArgs());
const leftSnapshotId = ref<number | null>(null);
const rightSnapshotId = ref<number | null>(null);

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

const currentSnapshots = computed<StudioSnapshotEntry[]>(() => {
  const recipeItem = recipe.value;
  if (!recipeItem) return [];
  return store.snapshotsBySource[`recipe:${recipeItem.id}`] ?? [];
});

const currentJob = computed(() => {
  const recipeItem = recipe.value;
  if (!recipeItem) return null;
  return store.jobs.find((job) => job.sourceKind === 'recipe' && job.sourceId === recipeItem.id) ?? null;
});
const commandReadiness = computed(() =>
  buildCommandReadiness({
    command: recipeCommand.value,
    doctor: store.doctor,
    plugins: store.plugins,
  }),
);

const snapshotOptions = computed(() =>
  currentSnapshots.value.map((snapshot) => ({
    label: `${new Date(snapshot.capturedAt).toLocaleString()} · ${snapshot.status}`,
    value: snapshot.id,
  })),
);

const timelineResult = computed(() => ({
  items: buildSnapshotTimelineRows(currentSnapshots.value),
}));

const leftSnapshot = computed(() =>
  currentSnapshots.value.find((snapshot) => snapshot.id === leftSnapshotId.value) ?? null,
);

const rightSnapshot = computed(() =>
  currentSnapshots.value.find((snapshot) => snapshot.id === rightSnapshotId.value) ?? null,
);

const snapshotComparisonResult = computed(() => {
  if (!leftSnapshot.value || !rightSnapshot.value) return undefined;
  return buildResultComparison(leftSnapshot.value.result, rightSnapshot.value.result);
});

const intervalOptions = [
  { label: '15 min', value: 15 },
  { label: '60 min', value: 60 },
  { label: '180 min', value: 180 },
  { label: '360 min', value: 360 },
  { label: '1440 min', value: 1440 },
];

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

watch(recipe, (recipeItem) => {
  resetRecipeModel();
  if (recipeItem) {
    void store.refreshSnapshots('recipe', recipeItem.id);
  }
  if (pendingRecipeArgs.value) {
    applyArgsToRecipeModel(pendingRecipeArgs.value);
    pendingRecipeArgs.value = null;
  }
}, { immediate: true });

watch(currentJob, (job) => {
  if (job) {
    jobModel.intervalMinutes = job.intervalMinutes;
    jobModel.enabled = job.enabled;
    return;
  }

  jobModel.intervalMinutes = 60;
  jobModel.enabled = true;
});

watch(currentSnapshots, (snapshots) => {
  if (!snapshots.length) {
    leftSnapshotId.value = null;
    rightSnapshotId.value = null;
    return;
  }

  if (!snapshots.some((snapshot) => snapshot.id === leftSnapshotId.value)) {
    leftSnapshotId.value = snapshots[0]?.id ?? null;
  }

  if (!snapshots.some((snapshot) => snapshot.id === rightSnapshotId.value)) {
    rightSnapshotId.value = snapshots[1]?.id ?? snapshots[0]?.id ?? null;
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

async function captureRecipeSnapshot(): Promise<void> {
  if (!recipe.value) return;

  await store.captureSourceSnapshot({
    sourceKind: 'recipe',
    sourceId: recipe.value.id,
    command: recipe.value.command,
    args: normalizedArgs(),
  });
  message.success(`Captured snapshot for ${recipe.value.title}`);
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

async function saveRecipeJob(): Promise<void> {
  if (!recipe.value) return;

  const job = await store.saveJob({
    id: currentJob.value?.id,
    sourceKind: 'recipe',
    sourceId: recipe.value.id,
    command: recipe.value.command,
    name: `${recipe.value.title} Snapshot Job`,
    description: recipe.value.description,
    args: normalizedArgs(),
    intervalMinutes: jobModel.intervalMinutes,
    enabled: jobModel.enabled,
  });
  message.success(job.enabled ? `Saved snapshot job "${job.name}"` : `Updated disabled snapshot job "${job.name}"`);
}

async function runRecipeJobNow(): Promise<void> {
  if (!currentJob.value) return;
  const jobName = currentJob.value.name;
  await store.runJobNow(currentJob.value.id);
  message.success(`Ran snapshot job "${jobName}"`);
}

async function deleteRecipeJob(): Promise<void> {
  if (!currentJob.value) return;
  const jobName = currentJob.value.name;
  const proceed = window.confirm(`Delete snapshot job "${jobName}"?`);
  if (!proceed) return;
  await store.deleteJob(currentJob.value.id);
  message.success(`Deleted snapshot job "${jobName}"`);
}

function readinessAlertType(tone: 'success' | 'info' | 'warning' | 'error'): 'success' | 'info' | 'warning' | 'error' {
  return tone;
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

function openOps(): void {
  void router.push({ name: 'ops' });
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
          <n-alert
            v-if="commandReadiness"
            :type="readinessAlertType(commandReadiness.tone)"
            class="page-alert"
          >
            <div class="readiness-block">
              <strong>{{ commandReadiness.title }}</strong>
              <div v-for="bullet in commandReadiness.bullets" :key="bullet" class="panel-note">{{ bullet }}</div>
              <div v-if="commandReadiness.needsOps" class="card-actions">
                <n-button size="small" tertiary @click="openOps()">Open Ops</n-button>
              </div>
            </div>
          </n-alert>
          <div class="chip-cloud">
            <n-tag size="small" type="warning">{{ recipe.command }}</n-tag>
            <n-tag v-if="recipeCommand" size="small" type="default">{{ recipeCommand.meta.surface }}</n-tag>
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
            <n-button tertiary :loading="store.runningSnapshot" @click="captureRecipeSnapshot()">Capture Snapshot</n-button>
            <n-button tertiary @click="resetRecipeModel()">Reset Defaults</n-button>
          </div>
        </template>
      </n-card>

      <div class="page-grid">
        <n-card title="Snapshot Timeline" class="glass-card">
          <template v-if="recipe">
            <div class="card-actions card-actions--between">
              <div class="panel-note">
                {{ currentSnapshots.length }} snapshots captured for this recipe. The timeline is derived from the leading numeric series in each result.
              </div>
              <n-button size="small" quaternary @click="store.refreshSnapshots('recipe', recipe.id)">Refresh</n-button>
            </div>
            <result-panel
              :title="`${recipe.title} timeline`"
              :result="currentSnapshots.length ? timelineResult : undefined"
            />
          </template>
        </n-card>

        <n-card title="Snapshot Job" class="glass-card">
          <template v-if="recipe">
            <n-form label-placement="top">
              <n-form-item label="Capture cadence">
                <n-select v-model:value="jobModel.intervalMinutes" :options="intervalOptions" />
              </n-form-item>
              <n-form-item label="Enabled">
                <div class="switch-inline switch-inline--wide">
                  <span>{{ currentJob?.nextRunAt ? `Next run ${new Date(currentJob.nextRunAt).toLocaleString()}` : 'Job will start scheduling after save' }}</span>
                  <n-switch v-model:value="jobModel.enabled" />
                </div>
              </n-form-item>
            </n-form>

            <div v-if="currentJob" class="chip-cloud">
              <n-tag size="small" :type="currentJob.lastStatus === 'error' ? 'error' : currentJob.lastStatus === 'success' ? 'success' : 'warning'">
                {{ currentJob.lastStatus }}
              </n-tag>
              <span class="chip chip--small">last {{ currentJob.lastRunAt ? new Date(currentJob.lastRunAt).toLocaleString() : 'never' }}</span>
            </div>

            <div class="card-actions">
              <n-button type="primary" @click="saveRecipeJob()">Save Job</n-button>
              <n-button tertiary :disabled="!currentJob" @click="runRecipeJobNow()">Run Now</n-button>
              <n-button tertiary :disabled="!currentJob" @click="deleteRecipeJob()">Delete Job</n-button>
            </div>
          </template>
        </n-card>

        <n-card title="Compare Snapshots" class="glass-card">
          <template v-if="currentSnapshots.length">
            <div class="compare-grid">
              <n-select v-model:value="leftSnapshotId" :options="snapshotOptions" placeholder="Base snapshot" />
              <n-select v-model:value="rightSnapshotId" :options="snapshotOptions" placeholder="Target snapshot" />
            </div>
            <result-panel
              :title="recipe ? `${recipe.title} snapshot diff` : 'Snapshot diff'"
              :result="snapshotComparisonResult"
            />
          </template>
          <n-empty v-else description="Capture at least one snapshot to compare recipe output over time." />
        </n-card>

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
