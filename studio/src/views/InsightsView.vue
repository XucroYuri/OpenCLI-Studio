<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NEmpty, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, NTag, useMessage } from 'naive-ui';
import CommandReadinessBanner from '../components/CommandReadinessBanner.vue';
import ResultPanel from '../components/ResultPanel.vue';
import SavePresetButton from '../components/SavePresetButton.vue';
import { executeCommand, installExternalCli as requestInstallExternalCli } from '../lib/api';
import { buildResultComparison } from '../lib/compare';
import { useStudioI18n } from '../lib/i18n';
import { buildInsightPresetState, readInsightPresetState, readWorkbenchPresetState } from '../lib/preset-state';
import { buildOverviewComboMergedResult, type OverviewComboRunOutcome } from '../lib/overview-combos';
import { buildCommandReadiness, type CommandReadinessAction } from '../lib/readiness';
import { buildInsightQuery, buildWorkbenchQuery, parseInsightQuery } from '../lib/routes';
import { buildSnapshotTimelineRows } from '../lib/timeline';
import { buildWorkbenchArgUi, inferWorkbenchFieldKind } from '../lib/workbench-args';
import { useStudioStore } from '../stores/studio';
import type { StudioCommandArg, StudioJobEntry, StudioPresetEntry, StudioRecipe, StudioSnapshotEntry } from '../types';

type SelectionPane = 'official' | 'user' | 'job';

interface UserTemplateCard {
  id: string;
  preset: StudioPresetEntry;
  source: 'workbench' | 'insight';
  title: string;
  description: string;
  updatedAt: string;
}

const store = useStudioStore();
const route = useRoute();
const router = useRouter();
const message = useMessage();
const { locale, t } = useStudioI18n();

const templateModel = reactive<Record<string, any>>({});
const jobModel = reactive({
  intervalMinutes: 60,
  enabled: true,
});
const pendingTemplateArgs = ref<Record<string, unknown> | null>(store.consumeInsightArgs());
const runningTemplate = ref(false);
const templateResult = ref<unknown>(undefined);
const selectedPane = ref<SelectionPane>('official');
const selectedUserTemplateId = ref('');
const selectedJobId = ref<number | null>(null);
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
    selectedPane.value = 'official';
    void router.replace({
      query: buildInsightQuery({
        recipeId: value,
        advancedMode: store.advancedMode,
      }),
    });
  },
});

const officialTemplates = computed(() =>
  store.recipes.filter((item) => item.visibility !== 'legacy'),
);
const selectedRecipe = computed(() =>
  store.recipes.find((item) => item.id === selectedRecipeId.value) ?? null,
);
const selectedRecipeCommand = computed(() =>
  store.registry.commands.find((item) => item.command === selectedRecipe.value?.command) ?? null,
);

const myTemplates = computed<UserTemplateCard[]>(() => {
  const workbenchCards = store.workbenchPresets.map((preset) => ({
    id: `workbench-${preset.id}`,
    preset,
    source: 'workbench' as const,
    title: preset.name,
    description: preset.description || t('insights.userTemplateFromWorkbench'),
    updatedAt: preset.updatedAt,
  }));
  const insightCards = store.insightPresets.map((preset) => ({
    id: `insight-${preset.id}`,
    preset,
    source: 'insight' as const,
    title: preset.name,
    description: preset.description || t('insights.userTemplateFromInsights'),
    updatedAt: preset.updatedAt,
  }));

  return [...workbenchCards, ...insightCards]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
});

const selectedUserTemplate = computed(() =>
  myTemplates.value.find((item) => item.id === selectedUserTemplateId.value) ?? null,
);

const scheduledTemplates = computed(() =>
  [...store.jobs].sort((left, right) => {
    const leftTime = Date.parse(left.nextRunAt || left.updatedAt || left.createdAt);
    const rightTime = Date.parse(right.nextRunAt || right.updatedAt || right.createdAt);
    return rightTime - leftTime;
  }),
);
const selectedJob = computed(() =>
  scheduledTemplates.value.find((job) => job.id === selectedJobId.value) ?? null,
);

const activeSnapshotSource = computed(() => {
  if (selectedPane.value === 'official' && selectedRecipe.value) {
    return { sourceKind: 'recipe' as const, sourceId: selectedRecipe.value.id };
  }
  if (selectedPane.value === 'job' && selectedJob.value) {
    return { sourceKind: selectedJob.value.sourceKind, sourceId: selectedJob.value.sourceId };
  }
  return null;
});

const currentSnapshots = computed<StudioSnapshotEntry[]>(() => {
  const source = activeSnapshotSource.value;
  if (!source) return [];
  return store.snapshotsBySource[`${source.sourceKind}:${source.sourceId}`] ?? [];
});

const currentJob = computed(() => {
  const recipe = selectedRecipe.value;
  if (selectedPane.value === 'official' && recipe) {
    return store.jobs.find((job) => job.sourceKind === 'recipe' && job.sourceId === recipe.id) ?? null;
  }
  if (selectedPane.value === 'job') {
    return selectedJob.value;
  }
  return null;
});

function recipeTitleText(recipe: StudioRecipe): string {
  const key = recipe.i18nKey ? `${recipe.i18nKey}.title` : `insights.builtins.${recipe.id}.title`;
  const localized = t(key);
  return localized === key ? recipe.title : localized;
}

function recipeSummaryText(recipe: StudioRecipe): string {
  const key = recipe.i18nKey ? `${recipe.i18nKey}.description` : `insights.builtins.${recipe.id}.description`;
  const localized = t(key);
  return localized === key ? (recipe.summary || recipe.description) : localized;
}

function templateObjectiveLabel(objective: StudioRecipe['objective'] | 'workspace' | undefined): string {
  const normalized = objective ?? 'workspace';
  const key = `insights.objectives.${normalized}`;
  const localized = t(key);
  return localized === key ? normalized : localized;
}

function normalizeInputValue(value: unknown): string | number | boolean {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return JSON.stringify(value);
}

function applyTemplateDefaults(recipe: StudioRecipe | null): void {
  for (const key of Object.keys(templateModel)) {
    delete templateModel[key];
  }

  if (!recipe) return;

  for (const [key, value] of Object.entries(recipe.defaultArgs)) {
    templateModel[key] = normalizeInputValue(value);
  }
}

function applyArgsToTemplateModel(args: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(args)) {
    templateModel[key] = normalizeInputValue(value);
  }
}

function queueTemplateArgs(args: Record<string, unknown>): void {
  pendingTemplateArgs.value = { ...args };
}

const templateInputEntries = computed(() => {
  const recipe = selectedRecipe.value;
  const command = selectedRecipeCommand.value;
  if (!recipe || !command || !recipe.inputs?.length) return [];

  return recipe.inputs.map((input) => {
    const matchedArg = command.args.find((arg) => arg.name === input.key);
    const arg: StudioCommandArg = matchedArg ?? {
      name: input.key,
      type: input.type === 'text' ? 'string' : input.type,
      required: input.required,
      default: input.default,
      choices: input.options?.map((option) => option.value),
    };

    return {
      input,
      arg,
      ui: buildWorkbenchArgUi(command.command, arg, locale.value),
    };
  });
});

const commandReadiness = computed(() =>
  selectedPane.value !== 'official'
    ? null
    : buildCommandReadiness({
      command: selectedRecipeCommand.value,
      doctor: store.doctor,
      siteAccess: selectedRecipeCommand.value ? store.getSiteAccess(selectedRecipeCommand.value.site) : null,
      plugins: store.plugins,
      externalClis: store.externalClis,
      registryCommands: store.registry.commands,
      siteLabel: selectedRecipeCommand.value ? store.getSiteDisplayName(selectedRecipeCommand.value.site, locale.value) : '',
      formatCommandLabel: (item) => store.getCommandDisplayDesc(item.command, item.description || item.name, locale.value),
      t,
    }),
);

const visibleCommandReadiness = computed(() => {
  const readiness = commandReadiness.value;
  if (!readiness) return null;
  return readiness.tone !== 'success' || readiness.actions.length > 0 ? readiness : null;
});

const timelineResult = computed(() => ({
  items: buildSnapshotTimelineRows(currentSnapshots.value),
}));

const snapshotOptions = computed(() =>
  currentSnapshots.value.map((snapshot) => ({
    label: `${new Date(snapshot.capturedAt).toLocaleString()} · ${snapshotStatusLabel(snapshot.status)}`,
    value: snapshot.id,
  })),
);

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

const officialSelectionMeta = computed(() => {
  const recipe = selectedRecipe.value;
  if (!recipe) return null;
  return {
    title: recipeTitleText(recipe),
    summary: recipeSummaryText(recipe),
    objective: templateObjectiveLabel(recipe.objective || 'workspace'),
    sourceCount: recipe.steps?.length ?? 1,
    supportsSchedule: Boolean(recipe.schedule?.supported),
    sourceCommand: selectedRecipeCommand.value
      ? store.getCommandDisplayDesc(selectedRecipeCommand.value.command, selectedRecipeCommand.value.description || selectedRecipeCommand.value.name, locale.value)
      : recipe.command,
  };
});

watch([officialTemplates, myTemplates, scheduledTemplates], () => {
  if (!selectedUserTemplateId.value) {
    selectedUserTemplateId.value = myTemplates.value[0]?.id ?? '';
  }
  if (!selectedJobId.value) {
    selectedJobId.value = scheduledTemplates.value[0]?.id ?? null;
  }
  if (selectedPane.value === 'official' && selectedRecipe.value) return;
  if (selectedPane.value === 'user' && selectedUserTemplate.value) return;
  if (selectedPane.value === 'job' && selectedJob.value) return;

  if (selectedRecipe.value) {
    selectedPane.value = 'official';
    return;
  }
  if (myTemplates.value[0]) {
    selectedPane.value = 'user';
    selectedUserTemplateId.value = myTemplates.value[0].id;
    return;
  }
  if (scheduledTemplates.value[0]) {
    selectedPane.value = 'job';
    selectedJobId.value = scheduledTemplates.value[0].id;
  }
}, { immediate: true });

watch(selectedRecipe, (recipe) => {
  applyTemplateDefaults(recipe);
  templateResult.value = undefined;
  if (recipe) {
    void store.refreshSnapshots('recipe', recipe.id);
  }
  if (pendingTemplateArgs.value) {
    applyArgsToTemplateModel(pendingTemplateArgs.value);
    pendingTemplateArgs.value = null;
  }
}, { immediate: true });

watch(activeSnapshotSource, (source) => {
  if (!source) return;
  void store.refreshSnapshots(source.sourceKind, source.sourceId);
});

watch(currentJob, (job) => {
  if (!job) {
    jobModel.intervalMinutes = selectedRecipe.value?.schedule?.defaultIntervalMinutes ?? 60;
    jobModel.enabled = true;
    return;
  }
  jobModel.intervalMinutes = job.intervalMinutes;
  jobModel.enabled = job.enabled;
}, { immediate: true });

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
    rightSnapshotId.value = snapshots.find((snapshot) => snapshot.id !== leftSnapshotId.value)?.id ?? null;
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
    queueTemplateArgs(stagedArgs);
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

function templateTagLabel(tag: string): string {
  const key = `insights.tags.${tag}`;
  const localized = t(key);
  return localized === key ? tag : localized;
}

function snapshotStatusLabel(status: 'success' | 'error' | 'idle' | string): string {
  if (status === 'success') return t('common.statusSuccess');
  if (status === 'error') return t('common.statusError');
  if (status === 'idle') return t('common.statusIdle');
  return String(status);
}

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : t('insights.never');
}

function normalizedTemplateArgs(): Record<string, unknown> {
  const recipe = selectedRecipe.value;
  if (!recipe) return {};

  const args: Record<string, unknown> = { ...recipe.defaultArgs };
  for (const [key, value] of Object.entries(templateModel)) {
    if (value === '' || value === null || value === undefined) {
      if (typeof recipe.defaultArgs[key] === 'undefined') {
        delete args[key];
      }
      continue;
    }
    args[key] = value;
  }
  return args;
}

function validateTemplateInputs(recipe: StudioRecipe): string | null {
  const args = normalizedTemplateArgs();
  for (const input of recipe.inputs ?? []) {
    const value = args[input.key];
    if (input.required && (value === '' || value === null || value === undefined)) {
      return input.label;
    }
  }
  return null;
}

function selectOfficialTemplate(recipeId: string): void {
  selectedPane.value = 'official';
  selectedRecipeId.value = recipeId;
}

function selectUserTemplate(item: UserTemplateCard): void {
  selectedPane.value = 'user';
  selectedUserTemplateId.value = item.id;
}

function selectScheduledTemplate(job: StudioJobEntry): void {
  selectedPane.value = 'job';
  selectedJobId.value = job.id;
}

async function runTemplate(): Promise<void> {
  const recipe = selectedRecipe.value;
  if (!recipe) return;

  const missingInput = validateTemplateInputs(recipe);
  if (missingInput) {
    message.warning(t('insights.requiredInputMissing', { value: missingInput }));
    return;
  }

  runningTemplate.value = true;
  const args = normalizedTemplateArgs();

  try {
    const steps = recipe.steps?.length
      ? recipe.steps
      : [{ id: recipe.id, command: recipe.command, args: recipe.defaultArgs }];

    if (steps.length === 1) {
      const response = await executeCommand(recipe.command, args);
      templateResult.value = response.result;
      await store.refreshHistory();
      message.success(t('insights.runRecipeSuccess', { value: recipeTitleText(recipe) }));
      return;
    }

    const outcomes: OverviewComboRunOutcome[] = [];
    for (const step of steps) {
      const item = store.registry.commands.find((command) => command.command === step.command);
      if (!item) continue;

      try {
        const response = await executeCommand(step.command, {
          ...(step.args ?? {}),
          ...args,
        });
        outcomes.push({
          step: { command: step.command, args: { ...(step.args ?? {}), ...args }, item },
          response,
        });
      } catch (error) {
        outcomes.push({
          step: { command: step.command, args: { ...(step.args ?? {}), ...args }, item },
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const merged = buildOverviewComboMergedResult(outcomes, {
      fieldLabels: {
        source: t('overview.combos.columns.source'),
        title: t('overview.combos.columns.title'),
        summary: t('overview.combos.columns.summary'),
        rank: t('overview.combos.columns.rank'),
        metric: t('overview.combos.columns.metric'),
        url: t('overview.combos.columns.url'),
      },
      getSourceLabel: (step) => store.getSiteDisplayName(step.item.site, locale.value),
      getCommandLabel: (step) => store.getCommandDisplayDesc(step.command, step.item.description || step.item.name, locale.value),
      maxRowsPerSource: 8,
    });

    templateResult.value = { items: merged.items };
    if (merged.successCount > 0) {
      await store.refreshHistory();
    }

    if (merged.successCount > 0 && merged.failureCount === 0) {
      message.success(t('insights.runRecipeSuccess', { value: recipeTitleText(recipe) }));
      return;
    }
    if (merged.successCount > 0) {
      message.warning(t('overview.combos.runPartial', { success: merged.successCount, failed: merged.failureCount }));
      return;
    }
    message.error(t('overview.combos.runFailed'));
  } finally {
    runningTemplate.value = false;
  }
}

function openInWorkbench(): void {
  const recipe = selectedRecipe.value;
  if (!recipe) return;
  store.setSelectedCommand(recipe.command);
  store.stageWorkbenchArgs(normalizedTemplateArgs());
  void router.push({
    name: 'workbench',
    query: buildWorkbenchQuery({
      command: recipe.command,
      search: '',
      market: 'all',
      siteCategory: 'all',
      site: '',
      advancedMode: store.advancedMode,
    }),
  });
}

async function captureTemplateSnapshot(): Promise<void> {
  const recipe = selectedRecipe.value;
  if (!recipe) return;

  await store.captureSourceSnapshot({
    sourceKind: 'recipe',
    sourceId: recipe.id,
    command: recipe.command,
    args: normalizedTemplateArgs(),
  });
  message.success(t('insights.captureSuccess', { value: recipeTitleText(recipe) }));
}

async function saveTemplatePreset(input: { name: string; description: string }): Promise<void> {
  const recipe = selectedRecipe.value;
  if (!recipe) return;

  await store.savePreset({
    kind: 'insight',
    name: input.name,
    description: input.description || null,
    state: buildInsightPresetState({
      recipeId: recipe.id,
      args: normalizedTemplateArgs(),
      advancedMode: store.advancedMode,
    }),
  });
  message.success(t('insights.savePresetSuccess', { value: input.name }));
}

async function saveTemplateJob(): Promise<void> {
  const recipe = selectedRecipe.value;
  if (!recipe) return;

  const job = await store.saveJob({
    id: currentJob.value?.sourceKind === 'recipe' ? currentJob.value.id : undefined,
    sourceKind: 'recipe',
    sourceId: recipe.id,
    command: recipe.command,
    name: t('insights.jobNameTemplate', { title: recipeTitleText(recipe) }),
    description: recipeSummaryText(recipe),
    args: normalizedTemplateArgs(),
    intervalMinutes: jobModel.intervalMinutes,
    enabled: jobModel.enabled,
  });
  message.success(job.enabled ? t('insights.saveJobEnabled', { value: job.name }) : t('insights.saveJobDisabled', { value: job.name }));
}

async function runSelectedJobNow(): Promise<void> {
  const job = currentJob.value;
  if (!job) return;
  await store.runJobNow(job.id);
  message.success(t('insights.runJobSuccess', { value: job.name }));
}

async function deleteSelectedJob(): Promise<void> {
  const job = currentJob.value;
  if (!job) return;
  const proceed = window.confirm(t('insights.deleteJobConfirm', { value: job.name }));
  if (!proceed) return;
  await store.deleteJob(job.id);
  if (selectedPane.value === 'job') {
    selectedJobId.value = store.jobs[0]?.id ?? null;
  }
  message.success(t('insights.deleteJobSuccess', { value: job.name }));
}

function applyInsightPreset(preset: StudioPresetEntry): void {
  const state = readInsightPresetState(preset.state);
  store.setAdvancedMode(state.advancedMode);
  queueTemplateArgs(state.args);
  selectOfficialTemplate(state.recipeId);
  message.success(t('insights.applyPresetSuccess', { value: preset.name }));
}

function openUserTemplate(item: UserTemplateCard): void {
  if (item.source === 'workbench') {
    const state = readWorkbenchPresetState(item.preset.state);
    store.setAdvancedMode(state.advancedMode);
    store.setSelectedCommand(state.command);
    store.stageWorkbenchArgs(state.args);
    void router.push({
      name: 'workbench',
      query: buildWorkbenchQuery({
        command: state.command,
        search: state.search,
        market: state.market,
        siteCategory: state.siteCategory,
        site: state.site,
        advancedMode: state.advancedMode,
      }),
    });
    return;
  }

  applyInsightPreset(item.preset);
}

async function removeUserTemplate(item: UserTemplateCard): Promise<void> {
  const proceed = window.confirm(t('insights.deletePresetConfirm', { value: item.title }));
  if (!proceed) return;
  await store.deletePreset(item.preset.id);
  message.success(t('insights.deletePresetSuccess', { value: item.title }));
}

function openJobSource(job: StudioJobEntry): void {
  if (job.sourceKind === 'recipe') {
    selectOfficialTemplate(job.sourceId);
    return;
  }
  store.setSelectedCommand(job.sourceId);
  void router.push({
    name: 'workbench',
    query: buildWorkbenchQuery({
      command: job.sourceId,
      search: '',
      market: 'all',
      siteCategory: 'all',
      site: '',
      advancedMode: store.advancedMode,
    }),
  });
}

async function handleReadinessAction(action: CommandReadinessAction): Promise<void> {
  try {
    if (action.type === 'run-doctor') {
      await store.runDoctor({ live: true, sessions: true });
      message.success(t('ops.doctorCompleted'));
      return;
    }

    if (action.type === 'open-ops') {
      void router.push({ name: 'ops' });
      return;
    }

    if (action.type === 'open-command' && action.command) {
      store.setSelectedCommand(action.command);
      store.stageWorkbenchArgs(action.args ?? {});
      void router.push({
        name: 'workbench',
        query: buildWorkbenchQuery({
          command: action.command,
          search: '',
          market: 'all',
          siteCategory: 'all',
          site: '',
          advancedMode: store.advancedMode,
        }),
      });
      return;
    }

    if (action.type === 'run-command' && action.command) {
      await executeCommand(action.command, action.args ?? {});
      await store.refreshHistory();
      const nextCommand = store.registry.commands.find((entry) => entry.command === action.command);
      if (nextCommand) {
        await store.ensureSiteAccess([nextCommand.site], true);
      }
      message.success(t('readiness.actionCompleted'));
      return;
    }

    if (action.type === 'install-external' && action.externalName) {
      await requestInstallExternalCli(action.externalName);
      await store.refreshOpsInventory();
      message.success(t('readiness.installSuccess', { value: action.externalName }));
      return;
    }

    if (action.type === 'copy-text' && action.text) {
      await navigator.clipboard.writeText(action.text);
      message.success(t('ops.installCopied'));
      return;
    }

    if (action.type === 'open-url' && action.url) {
      window.open(action.url, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : String(error));
  }
}
</script>

<template>
  <section class="page-grid templates-layout">
    <div class="page-inline-header templates-layout__header">
      <h1 class="gradient-title">{{ t('routes.insights.title') }}</h1>
    </div>

    <div class="templates-layout__sidebar">
      <n-card :title="t('insights.catalogOfficial')" class="glass-card">
        <div v-if="officialTemplates.length" class="stack-list">
          <button
            v-for="item in officialTemplates"
            :key="item.id"
            class="stack-row stack-row--button template-nav-card"
            :class="{ 'template-nav-card--active': selectedPane === 'official' && selectedRecipeId === item.id }"
            @click="selectOfficialTemplate(item.id)"
          >
            <div class="stack-row__content">
              <strong>{{ recipeTitleText(item) }}</strong>
              <span>{{ recipeSummaryText(item) }}</span>
            </div>
            <div class="stack-row__meta stack-row__meta--wrap">
              <span class="chip chip--small">{{ templateObjectiveLabel(item.objective || 'workspace') }}</span>
              <span class="chip chip--small">{{ t('insights.sourceCount', { count: item.steps?.length ?? 1 }) }}</span>
            </div>
          </button>
        </div>
        <n-empty v-else :description="t('insights.noRecipes')" />
      </n-card>

      <n-card :title="t('insights.catalogMine')" class="glass-card">
        <div v-if="myTemplates.length" class="stack-list">
          <button
            v-for="item in myTemplates"
            :key="item.id"
            class="stack-row stack-row--button template-nav-card"
            :class="{ 'template-nav-card--active': selectedPane === 'user' && selectedUserTemplateId === item.id }"
            @click="selectUserTemplate(item)"
          >
            <div class="stack-row__content">
              <strong>{{ item.title }}</strong>
              <span>{{ item.description }}</span>
            </div>
            <div class="stack-row__meta stack-row__meta--wrap">
              <span class="chip chip--small">{{ item.source === 'workbench' ? t('routes.workbench.title') : t('routes.insights.title') }}</span>
              <span class="chip chip--small">{{ new Date(item.updatedAt).toLocaleDateString() }}</span>
            </div>
          </button>
        </div>
        <n-empty v-else :description="t('insights.savedPresetsEmpty')" />
      </n-card>

      <n-card :title="t('insights.catalogScheduled')" class="glass-card">
        <div v-if="scheduledTemplates.length" class="stack-list">
          <button
            v-for="job in scheduledTemplates"
            :key="job.id"
            class="stack-row stack-row--button template-nav-card"
            :class="{ 'template-nav-card--active': selectedPane === 'job' && selectedJobId === job.id }"
            @click="selectScheduledTemplate(job)"
          >
            <div class="stack-row__content">
              <strong>{{ job.name }}</strong>
              <span>{{ job.description || t('common.noDescription') }}</span>
            </div>
            <div class="stack-row__meta stack-row__meta--wrap">
              <n-tag size="small" :type="job.lastStatus === 'error' ? 'error' : job.lastStatus === 'success' ? 'success' : 'warning'">
                {{ snapshotStatusLabel(job.lastStatus) }}
              </n-tag>
              <span class="chip chip--small">{{ t('insights.intervalMinutes', { value: job.intervalMinutes }) }}</span>
            </div>
          </button>
        </div>
        <n-empty v-else :description="t('insights.noJobs')" />
      </n-card>
    </div>

    <div class="templates-layout__workspace">
      <n-card class="glass-card">
        <template v-if="selectedPane === 'official' && selectedRecipe && officialSelectionMeta">
          <div class="template-workspace__header">
            <div class="template-workspace__copy">
              <div class="chip-cloud">
                <span class="chip chip--small">{{ officialSelectionMeta.objective }}</span>
                <span class="chip chip--small">{{ t('insights.sourceCount', { count: officialSelectionMeta.sourceCount }) }}</span>
                <span v-if="officialSelectionMeta.supportsSchedule" class="chip chip--small">{{ t('insights.scheduleSupported') }}</span>
              </div>
              <strong class="template-workspace__title">{{ officialSelectionMeta.title }}</strong>
              <p class="template-workspace__summary">{{ officialSelectionMeta.summary }}</p>
              <div class="chip-cloud">
                <span v-for="tag in selectedRecipe.tags" :key="tag" class="chip chip--small">{{ templateTagLabel(tag) }}</span>
              </div>
              <div class="panel-note">{{ officialSelectionMeta.sourceCommand }}</div>
            </div>
            <div class="card-actions template-workspace__actions">
              <n-button type="primary" :loading="runningTemplate" @click="runTemplate()">{{ t('insights.runRecipe') }}</n-button>
              <n-button tertiary @click="openInWorkbench()">{{ t('insights.openWorkbench') }}</n-button>
              <n-button tertiary :loading="store.runningSnapshot" @click="captureTemplateSnapshot()">{{ t('insights.captureSnapshot') }}</n-button>
              <save-preset-button
                :button-label="t('insights.savePreset')"
                :title="t('insights.savePresetTitle')"
                :description="t('insights.savePresetDescription')"
                :default-name="officialSelectionMeta.title"
                :default-description="officialSelectionMeta.summary"
                :save="saveTemplatePreset"
              />
            </div>
          </div>

          <command-readiness-banner
            v-if="visibleCommandReadiness"
            :readiness="visibleCommandReadiness"
            @action="handleReadinessAction"
          />

          <n-alert v-if="store.executionError" type="error" class="page-alert">
            {{ store.executionError }}
          </n-alert>

          <n-form v-if="templateInputEntries.length" label-placement="top" class="template-inputs">
            <n-form-item
              v-for="entry in templateInputEntries"
              :key="entry.input.key"
              :feedback="entry.ui.hint || (entry.input.required ? t('workbench.requiredArgument') : '')"
            >
              <template #label>
                <div class="arg-field__label">
                  <div class="arg-field__headline">
                    <span class="arg-field__title">{{ entry.input.label }}</span>
                    <span class="arg-field__key">{{ entry.input.key }}</span>
                  </div>
                </div>
              </template>

              <div v-if="inferWorkbenchFieldKind(entry.arg) === 'boolean'" class="switch-inline switch-inline--wide">
                <span>{{ entry.ui.hint || entry.input.label }}</span>
                <n-switch v-model:value="templateModel[entry.input.key]" />
              </div>
              <n-input-number
                v-else-if="inferWorkbenchFieldKind(entry.arg) === 'number'"
                v-model:value="templateModel[entry.input.key]"
                class="field-fill"
                :placeholder="entry.ui.placeholder"
              />
              <n-select
                v-else-if="inferWorkbenchFieldKind(entry.arg) === 'select'"
                v-model:value="templateModel[entry.input.key]"
                :options="entry.ui.options"
                :placeholder="entry.ui.placeholder"
                :filterable="entry.ui.options.length > 6"
                :clearable="!entry.input.required"
              />
              <n-input
                v-else
                v-model:value="templateModel[entry.input.key]"
                :placeholder="entry.ui.placeholder || t('workbench.enterValue')"
                clearable
              />
            </n-form-item>
          </n-form>
        </template>

        <template v-else-if="selectedPane === 'user' && selectedUserTemplate">
          <div class="template-workspace__header">
            <div class="template-workspace__copy">
              <div class="chip-cloud">
                <span class="chip chip--small">{{ t('insights.userTemplate') }}</span>
                <span class="chip chip--small">{{ selectedUserTemplate.source === 'workbench' ? t('routes.workbench.title') : t('routes.insights.title') }}</span>
              </div>
              <strong class="template-workspace__title">{{ selectedUserTemplate.title }}</strong>
              <p class="template-workspace__summary">{{ selectedUserTemplate.description }}</p>
              <div class="panel-note">{{ t('insights.updatedAt', { value: new Date(selectedUserTemplate.updatedAt).toLocaleString() }) }}</div>
            </div>
            <div class="card-actions template-workspace__actions">
              <n-button type="primary" @click="openUserTemplate(selectedUserTemplate)">{{ t('insights.openUserTemplate') }}</n-button>
              <n-button tertiary @click="removeUserTemplate(selectedUserTemplate)">{{ t('insights.deletePreset') }}</n-button>
            </div>
          </div>
        </template>

        <template v-else-if="selectedPane === 'job' && selectedJob">
          <div class="template-workspace__header">
            <div class="template-workspace__copy">
              <div class="chip-cloud">
                <span class="chip chip--small">{{ t('insights.catalogScheduled') }}</span>
                <span class="chip chip--small">{{ t('insights.intervalMinutes', { value: selectedJob.intervalMinutes }) }}</span>
              </div>
              <strong class="template-workspace__title">{{ selectedJob.name }}</strong>
              <p class="template-workspace__summary">{{ selectedJob.description || t('common.noDescription') }}</p>
              <div class="chip-cloud">
                <n-tag size="small" :type="selectedJob.lastStatus === 'error' ? 'error' : selectedJob.lastStatus === 'success' ? 'success' : 'warning'">
                  {{ snapshotStatusLabel(selectedJob.lastStatus) }}
                </n-tag>
                <span class="chip chip--small">{{ t('insights.lastRun', { value: formatDateTime(selectedJob.lastRunAt) }) }}</span>
                <span class="chip chip--small">{{ t('insights.nextRun', { value: formatDateTime(selectedJob.nextRunAt) }) }}</span>
              </div>
            </div>
            <div class="card-actions template-workspace__actions">
              <n-button type="primary" @click="runSelectedJobNow()">{{ t('common.runNow') }}</n-button>
              <n-button tertiary @click="openJobSource(selectedJob)">{{ t('insights.openJobSource') }}</n-button>
              <n-button tertiary @click="deleteSelectedJob()">{{ t('insights.deleteJob') }}</n-button>
            </div>
          </div>
        </template>

        <n-empty v-else :description="t('insights.noRecipes')" />
      </n-card>

      <template v-if="selectedPane === 'official' && selectedRecipe">
        <div class="split-grid">
          <n-card :title="t('insights.snapshotJob')" class="glass-card">
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

            <div class="card-actions">
              <n-button type="primary" @click="saveTemplateJob()">{{ t('insights.saveJob') }}</n-button>
              <n-button tertiary :disabled="!currentJob" @click="runSelectedJobNow()">{{ t('common.runNow') }}</n-button>
              <n-button tertiary :disabled="!currentJob" @click="deleteSelectedJob()">{{ t('insights.deleteJob') }}</n-button>
            </div>
          </n-card>

          <n-card :title="t('insights.timeline')" class="glass-card">
            <div class="panel-note">{{ t('insights.timelineSummary', { count: currentSnapshots.length }) }}</div>
            <result-panel
              :title="t('insights.timelineTitle', { value: officialSelectionMeta?.title || recipeTitleText(selectedRecipe) })"
              :result="currentSnapshots.length ? timelineResult : undefined"
            />
          </n-card>
        </div>

        <n-card :title="t('insights.compareSnapshots')" class="glass-card">
          <template v-if="currentSnapshots.length">
            <div class="compare-grid">
              <n-select v-model:value="leftSnapshotId" :options="snapshotOptions" :placeholder="t('insights.baseSnapshot')" />
              <n-select v-model:value="rightSnapshotId" :options="snapshotOptions" :placeholder="t('insights.targetSnapshot')" />
            </div>
            <result-panel
              :title="t('insights.snapshotDiff', { value: officialSelectionMeta?.title || recipeTitleText(selectedRecipe) })"
              :result="snapshotComparisonResult"
            />
          </template>
          <n-empty v-else :description="t('insights.compareEmpty')" />
        </n-card>

        <result-panel
          :title="t('insights.outputTitle', { value: officialSelectionMeta?.title || recipeTitleText(selectedRecipe) })"
          :result="templateResult"
        />
      </template>

      <template v-else-if="selectedPane === 'job' && selectedJob">
        <div class="split-grid">
          <n-card :title="t('insights.timeline')" class="glass-card">
            <div class="panel-note">{{ t('insights.timelineSummary', { count: currentSnapshots.length }) }}</div>
            <result-panel
              :title="t('insights.timelineTitle', { value: selectedJob.name })"
              :result="currentSnapshots.length ? timelineResult : undefined"
            />
          </n-card>

          <n-card :title="t('insights.compareSnapshots')" class="glass-card">
            <template v-if="currentSnapshots.length">
              <div class="compare-grid">
                <n-select v-model:value="leftSnapshotId" :options="snapshotOptions" :placeholder="t('insights.baseSnapshot')" />
                <n-select v-model:value="rightSnapshotId" :options="snapshotOptions" :placeholder="t('insights.targetSnapshot')" />
              </div>
              <result-panel
                :title="t('insights.snapshotDiff', { value: selectedJob.name })"
                :result="snapshotComparisonResult"
              />
            </template>
            <n-empty v-else :description="t('insights.compareEmpty')" />
          </n-card>
        </div>
      </template>
    </div>
  </section>
</template>
