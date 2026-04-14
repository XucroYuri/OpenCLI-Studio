<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NEmpty, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, NTag, useMessage } from 'naive-ui';
import PresetShelf from '../components/PresetShelf.vue';
import ResultPanel from '../components/ResultPanel.vue';
import SavePresetButton from '../components/SavePresetButton.vue';
import { buildResultComparison } from '../lib/compare';
import { useStudioI18n } from '../lib/i18n';
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
const { t } = useStudioI18n();

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
    t,
  }),
);

const snapshotOptions = computed(() =>
  currentSnapshots.value.map((snapshot) => ({
    label: `${new Date(snapshot.capturedAt).toLocaleString()} · ${snapshotStatusLabel(snapshot.status)}`,
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

const intervalOptions = computed(() => [
  { label: t('insights.intervalMinutes', { value: 15 }), value: 15 },
  { label: t('insights.intervalMinutes', { value: 60 }), value: 60 },
  { label: t('insights.intervalMinutes', { value: 180 }), value: 180 },
  { label: t('insights.intervalMinutes', { value: 360 }), value: 360 },
  { label: t('insights.intervalMinutes', { value: 1440 }), value: 1440 },
]);

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

  if (!snapshots.some((snapshot) => snapshot.id === rightSnapshotId.value) || rightSnapshotId.value === leftSnapshotId.value) {
    const candidate = snapshots.find((s) => s.id !== leftSnapshotId.value);
    rightSnapshotId.value = candidate?.id ?? null;
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

function fieldKind(key: string, value: unknown): 'boolean' | 'number' | 'text' {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'text';
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
  message.success(t('insights.captureSuccess', { value: recipe.value.title }));
}

async function toggleRecipeFavorite(): Promise<void> {
  if (!recipe.value) return;

  const nextFavorite = !isFavoriteRecipe.value;
  await store.toggleFavorite('recipe', recipe.value.id, nextFavorite);
  message.success(nextFavorite ? t('insights.favoriteSuccess', { value: recipe.value.title }) : t('insights.unfavoriteSuccess', { value: recipe.value.title }));
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
  message.success(t('insights.savePresetSuccess', { value: input.name }));
}

async function saveRecipeJob(): Promise<void> {
  if (!recipe.value) return;

  const job = await store.saveJob({
    id: currentJob.value?.id,
    sourceKind: 'recipe',
    sourceId: recipe.value.id,
    command: recipe.value.command,
    name: t('insights.jobNameTemplate', { title: recipe.value.title }),
    description: recipe.value.description,
    args: normalizedArgs(),
    intervalMinutes: jobModel.intervalMinutes,
    enabled: jobModel.enabled,
  });
  message.success(job.enabled ? t('insights.saveJobEnabled', { value: job.name }) : t('insights.saveJobDisabled', { value: job.name }));
}

async function runRecipeJobNow(): Promise<void> {
  if (!currentJob.value) return;
  const jobName = currentJob.value.name;
  await store.runJobNow(currentJob.value.id);
  message.success(t('insights.runJobSuccess', { value: jobName }));
}

async function deleteRecipeJob(): Promise<void> {
  if (!currentJob.value) return;
  const jobName = currentJob.value.name;
  const proceed = window.confirm(t('insights.deleteJobConfirm', { value: jobName }));
  if (!proceed) return;
  await store.deleteJob(currentJob.value.id);
  message.success(t('insights.deleteJobSuccess', { value: jobName }));
}

function readinessAlertType(tone: 'success' | 'info' | 'warning' | 'error'): 'success' | 'info' | 'warning' | 'error' {
  return tone;
}

function statusLabel(status: 'success' | 'error' | string): string {
  if (status === 'success') return t('common.statusSuccess');
  if (status === 'error') return t('common.statusError');
  return String(status);
}

function snapshotStatusLabel(status: 'success' | 'error' | 'idle' | string): string {
  return statusLabel(status);
}

function modeLabel(value: 'public' | 'browser' | 'desktop' | 'external'): string {
  return t(`registry.mode.${value}`);
}

function surfaceLabel(value: 'builtin' | 'plugin' | 'external'): string {
  return t(`registry.surface.${value}`);
}

function capabilityLabel(value: 'discovery' | 'search' | 'detail' | 'account' | 'action' | 'asset' | 'tooling' | 'other'): string {
  return t(`registry.capability.${value}`);
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
  message.success(t('insights.applyPresetSuccess', { value: preset.name }));
}

async function removeInsightPreset(preset: StudioPresetEntry): Promise<void> {
  const proceed = window.confirm(t('insights.deletePresetConfirm', { value: preset.name }));
  if (!proceed) return;
  await store.deletePreset(preset.id);
  message.success(t('insights.deletePresetSuccess', { value: preset.name }));
}
</script>

<template>
  <section class="page-grid">
    <div class="page-inline-header">
      <h1 class="gradient-title">{{ t('routes.insights.title') }}</h1>
      <p class="page-inline-header__desc">{{ t('routes.insights.description') }}</p>
    </div>

    <n-card :title="t('insights.catalog')" class="glass-card">
      <div v-if="store.recipes.length" class="recipe-grid">
        <button
          v-for="item in store.recipes"
          :key="item.id"
          class="recipe-card"
          :class="{ 'recipe-card--active': item.id === selectedRecipeId }"
          @click="selectedRecipeId = item.id"
        >
          <div class="eyebrow">{{ store.registry.commands.find(c => c.command === item.command)?.description || item.command }}</div>
          <strong>{{ item.title }}</strong>
          <div class="chip-cloud">
            <span v-for="tag in item.tags" :key="tag" class="chip chip--small">{{ tag }}</span>
          </div>
        </button>
      </div>
      <div v-else>
        <n-empty :description="t('insights.noRecipes')">
          <template #extra>
            <p class="panel-note">{{ t('insights.exploreRegistry') }}</p>
            <n-button size="small" type="primary" @click="$router.push({ name: 'registry' })">{{ t('routes.registry.title') }}</n-button>
          </template>
        </n-empty>
      </div>
    </n-card>

    <div class="split-grid">
      <n-card :title="t('insights.controls')" class="glass-card">
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
                <n-button size="small" tertiary @click="openOps()">{{ t('workbench.openOps') }}</n-button>
              </div>
            </div>
          </n-alert>
          <div class="chip-cloud">
            <n-tag size="small" type="warning">{{ recipeCommand?.description || recipe.command }}</n-tag>
            <n-tag v-if="recipeCommand" size="small" type="default">{{ surfaceLabel(recipeCommand.meta.surface) }}</n-tag>
            <n-tag v-if="recipeCommand" size="small" type="info">{{ modeLabel(recipeCommand.meta.mode) }}</n-tag>
            <n-tag v-if="recipeCommand" size="small" type="success">{{ capabilityLabel(recipeCommand.meta.capability) }}</n-tag>
          </div>
          <p class="panel-note">{{ recipe.description }}</p>
          <div class="card-actions">
            <n-button quaternary @click="toggleRecipeFavorite()">
              {{ isFavoriteRecipe ? t('registry.favorited') : t('insights.favoriteRecipe') }}
            </n-button>
            <save-preset-button
              :button-label="t('insights.savePreset')"
              :title="t('insights.savePresetTitle')"
              :description="t('insights.savePresetDescription')"
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
              <div v-if="fieldKind(key, value) === 'boolean'" class="switch-inline switch-inline--wide">
                <span>{{ key }}</span>
                <n-switch v-model:value="recipeModel[key]" />
              </div>
              <n-input-number
                v-else-if="fieldKind(key, value) === 'number'"
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
            <n-button type="primary" :loading="store.runningCommand" @click="runRecipe()">{{ t('insights.runRecipe') }}</n-button>
            <n-button tertiary @click="openInWorkbench()">{{ t('insights.openWorkbench') }}</n-button>
            <n-button tertiary :loading="store.runningSnapshot" @click="captureRecipeSnapshot()">{{ t('insights.captureSnapshot') }}</n-button>
            <n-button tertiary @click="resetRecipeModel()">{{ t('insights.resetDefaults') }}</n-button>
          </div>
        </template>
      </n-card>

      <div class="page-grid">
        <n-card :title="t('insights.timeline')" class="glass-card">
          <template v-if="recipe">
            <div class="card-actions card-actions--between">
              <div class="panel-note">
                {{ t('insights.timelineSummary', { count: currentSnapshots.length }) }}
              </div>
              <n-button size="small" quaternary @click="store.refreshSnapshots('recipe', recipe.id)">{{ t('common.refresh') }}</n-button>
            </div>
            <result-panel
              :title="t('insights.timelineTitle', { value: recipe.title })"
              :result="currentSnapshots.length ? timelineResult : undefined"
            />
          </template>
        </n-card>

        <n-card :title="t('insights.snapshotJob')" class="glass-card">
          <template v-if="recipe">
            <n-form label-placement="top">
              <n-form-item :label="t('insights.captureCadence')">
                <n-select v-model:value="jobModel.intervalMinutes" :options="intervalOptions" />
              </n-form-item>
              <n-form-item :label="t('insights.enabled')">
                <div class="switch-inline switch-inline--wide">
                  <span>{{ currentJob?.nextRunAt ? t('insights.nextRun', { value: new Date(currentJob.nextRunAt).toLocaleString() }) : t('insights.jobStartsAfterSave') }}</span>
                  <n-switch v-model:value="jobModel.enabled" />
                </div>
              </n-form-item>
            </n-form>

            <div v-if="currentJob" class="chip-cloud">
              <n-tag size="small" :type="currentJob.lastStatus === 'error' ? 'error' : currentJob.lastStatus === 'success' ? 'success' : 'warning'">
                {{ snapshotStatusLabel(currentJob.lastStatus) }}
              </n-tag>
              <span class="chip chip--small">{{ t('insights.lastRun', { value: currentJob.lastRunAt ? new Date(currentJob.lastRunAt).toLocaleString() : t('insights.never') }) }}</span>
            </div>

            <div class="card-actions">
              <n-button type="primary" @click="saveRecipeJob()">{{ t('insights.saveJob') }}</n-button>
              <n-button tertiary :disabled="!currentJob" @click="runRecipeJobNow()">{{ t('common.runNow') }}</n-button>
              <n-button tertiary :disabled="!currentJob" @click="deleteRecipeJob()">{{ t('insights.deleteJob') }}</n-button>
            </div>
          </template>
        </n-card>

        <n-card :title="t('insights.compareSnapshots')" class="glass-card">
          <template v-if="currentSnapshots.length">
            <div class="compare-grid">
              <n-select v-model:value="leftSnapshotId" :options="snapshotOptions" :placeholder="t('insights.baseSnapshot')" />
              <n-select v-model:value="rightSnapshotId" :options="snapshotOptions" :placeholder="t('insights.targetSnapshot')" />
            </div>
            <result-panel
              :title="recipe ? t('insights.snapshotDiff', { value: recipe.title }) : t('insights.compareSnapshots')"
              :result="snapshotComparisonResult"
            />
          </template>
          <n-empty v-else :description="t('insights.compareEmpty')" />
        </n-card>

        <n-card :title="t('insights.savedPresets')" class="glass-card">
          <preset-shelf
            :presets="store.insightPresets"
            :empty-description="t('insights.savedPresetsEmpty')"
            @apply="applyInsightPreset"
            @remove="removeInsightPreset"
          />
        </n-card>

        <result-panel
          :title="recipe ? t('insights.outputTitle', { value: recipe.title }) : t('insights.recipeOutput')"
          :result="currentResult"
        />
      </div>
    </div>
  </section>
</template>
