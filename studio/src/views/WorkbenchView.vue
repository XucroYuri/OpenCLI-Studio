<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NEmpty, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, NTag, NTooltip, useMessage } from 'naive-ui';
import CommandReadinessBanner from '../components/CommandReadinessBanner.vue';
import PresetShelf from '../components/PresetShelf.vue';
import ResultPanel from '../components/ResultPanel.vue';
import SavePresetButton from '../components/SavePresetButton.vue';
import { executeCommand, installExternalCli as requestInstallExternalCli } from '../lib/api';
import { buildResultComparison } from '../lib/compare';
import { useStudioI18n } from '../lib/i18n';
import { buildWorkbenchPresetState, readWorkbenchPresetState } from '../lib/preset-state';
import {
  buildAvailabilitySummary,
  buildCommandReadiness,
  buildSiteAccessSummary,
  type AvailabilitySummary,
  type CommandReadinessAction,
} from '../lib/readiness';
import {
  CREATOR_SITE_CATEGORY_ORDER,
  pickDefaultWorkbenchCommand,
  sortSitesByDisplayPreference,
  type RegistryFilters,
} from '../lib/registry';
import { buildWorkbenchQuery, parseWorkbenchQuery } from '../lib/routes';
import { buildStatusAriaLabel, buildStatusTone, type StatusToneState } from '../lib/status-tone';
import { buildWorkbenchArgUi, inferWorkbenchFieldKind } from '../lib/workbench-args';
import { useStudioStore } from '../stores/studio';
import type { StudioHistoryEntry, StudioPresetEntry } from '../types';

const store = useStudioStore();
const route = useRoute();
const router = useRouter();
const message = useMessage();
const { locale, t } = useStudioI18n();

const formModel = reactive<Record<string, any>>({});
const pendingFormArgs = ref<Record<string, unknown> | null>(store.consumeWorkbenchArgs());
const leftRunId = ref<number | null>(null);
const rightRunId = ref<number | null>(null);
const pickerSearch = ref('');
const pickerMarket = ref<RegistryFilters['market']>('all');
const pickerSiteCategory = ref<RegistryFilters['siteCategory']>('all');
const pickerSelectedSite = ref<string | null>(null);

const creatorCategoryOrder: Array<Exclude<RegistryFilters['siteCategory'], 'all'>> = [...CREATOR_SITE_CATEGORY_ORDER];
const sitePopularityRank = computed(() =>
  new Map(store.registry.sites.map((item, index) => [item.site, index])),
);

const initialWorkbenchState = parseWorkbenchQuery(route.query);
if (Object.prototype.hasOwnProperty.call(route.query, 'advanced')) {
  store.setAdvancedMode(initialWorkbenchState.advancedMode);
}
pickerSearch.value = initialWorkbenchState.search;
pickerMarket.value = initialWorkbenchState.market;
pickerSiteCategory.value = initialWorkbenchState.siteCategory;
pickerSelectedSite.value = initialWorkbenchState.site || null;

const selectedCommandName = computed({
  get: () => {
    const routeState = parseWorkbenchQuery(route.query);
    const preferredCommand = routeState.command || store.selectedCommand || store.lastWorkbenchCommandId || undefined;
    return pickDefaultWorkbenchCommand(store.registry.commands, preferredCommand, store.advancedMode, locale.value);
  },
  set: (value: string) => {
    store.setSelectedCommand(value);
    void router.replace({
      query: buildWorkbenchQuery({
        command: value,
        search: pickerSearch.value,
        market: pickerMarket.value,
        siteCategory: pickerSiteCategory.value,
        site: pickerSelectedSite.value ?? '',
        advancedMode: store.advancedMode,
      }),
    });
  },
});

const command = computed(() =>
  store.registry.commands.find((item) => item.command === selectedCommandName.value) ?? null,
);
const currentSiteAccess = computed(() =>
  command.value ? store.getSiteAccess(command.value.site) : null,
);
const selectedCommandSite = computed(() => command.value?.site ?? null);
const commandDisplayLabel = computed(() =>
  command.value
    ? store.getCommandDisplayDesc(command.value.command, command.value.description || command.value.name, locale.value)
    : '',
);

function findCommand(commandName: string) {
  return store.registry.commands.find((item) => item.command === commandName) ?? null;
}

function getCommandLabel(commandName: string, fallback = ''): string {
  const item = findCommand(commandName);
  return store.getCommandDisplayDesc(
    commandName,
    item?.description || item?.name || fallback || commandName,
    locale.value,
  );
}

function getCommandIdLabel(commandName: string): string {
  return store.getCommandDisplayId(commandName, locale.value);
}

const pickerMarketOptions = computed(() => [
  { value: 'all' as const, label: t('registry.market.all') },
  { value: 'domestic' as const, label: t('registry.market.domestic') },
  { value: 'international' as const, label: t('registry.market.international') },
]);
const categoryScopedWorkbenchCommands = computed(() =>
  store.registry.commands.filter((item) =>
    matchesWorkbenchPicker(item, store.advancedMode, { ignoreCategory: true }),
  ),
);
const pickerCategoryGroups = computed(() => {
  const counts = new Map<string, number>();

  for (const item of categoryScopedWorkbenchCommands.value) {
    const category = store.getSiteCategory(item.site);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return creatorCategoryOrder
    .map((category) => ({
      category,
      count: counts.get(category) ?? 0,
    }))
    .filter((entry) => entry.count > 0);
});

function matchesWorkbenchPicker(
  commandItem: (typeof store.registry.commands)[number],
  includeGuarded: boolean,
  options: { ignoreCategory?: boolean } = {},
): boolean {
  if (!includeGuarded && commandItem.meta.risk !== 'safe') return false;
  if (pickerMarket.value !== 'all' && commandItem.meta.market !== pickerMarket.value) return false;
  if (!options.ignoreCategory && pickerSiteCategory.value !== 'all' && store.getSiteCategory(commandItem.site) !== pickerSiteCategory.value) return false;

  const normalizedSearch = pickerSearch.value.trim().toLowerCase();
  if (!normalizedSearch) return true;

  const haystack = [
    commandItem.command,
    commandItem.name,
    commandItem.description,
    commandItem.site,
    store.getSiteDisplayName(commandItem.site, locale.value),
    store.getCommandDisplayId(commandItem.command, locale.value),
    store.getCommandDisplayDesc(commandItem.command, commandItem.description || commandItem.name, locale.value),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedSearch);
}

const filteredWorkbenchSiteGroups = computed(() => {
  const groups = store.siteGroups
    .map((group) => {
      const commands = group.commands.filter((item) => {
        return matchesWorkbenchPicker(item, store.advancedMode);
      });

      return {
        ...group,
        commands,
        count: commands.length,
        market: group.commands[0]?.meta.market ?? 'unknown',
      };
    })
    .filter((group) => group.count > 0);

  return sortSitesByDisplayPreference(
    groups,
    locale.value,
    {
      resolveCategory: (group) => group.category,
      resolveMarket: (group) => group.market,
      resolvePopularity: (group) => sitePopularityRank.value.get(group.site),
      resolveCommandCount: (group) => group.count,
    },
  );
});
const filteredWorkbenchCommandCount = computed(() =>
  filteredWorkbenchSiteGroups.value.reduce((total, group) => total + group.count, 0),
);
const pickerAllCategoryCount = computed(() => categoryScopedWorkbenchCommands.value.length);
const pickerSummary = computed(() =>
  t('workbench.selectionSummary', {
    commands: filteredWorkbenchCommandCount.value,
    sites: filteredWorkbenchSiteGroups.value.length,
  }),
);
const selectedWorkbenchSiteGroup = computed(() =>
  filteredWorkbenchSiteGroups.value.find((group) => group.site === pickerSelectedSite.value) ?? null,
);
const pickerSelectedSiteLabel = computed(() =>
  selectedWorkbenchSiteGroup.value
    ? store.getSiteDisplayName(selectedWorkbenchSiteGroup.value.site, locale.value)
    : '',
);
const pickerVisibleCommands = computed(() =>
  selectedWorkbenchSiteGroup.value?.commands ?? [],
);

const recentRuns = computed(() =>
  store.history.filter((entry) => entry.command === selectedCommandName.value).slice(0, 5),
);
const runOptions = computed(() =>
  recentRuns.value.map((entry) => ({
    label: `${new Date(entry.startedAt).toLocaleString()} · ${statusLabel(entry.status)}`,
    value: entry.id,
  })),
);
const isFavoriteCommand = computed(() =>
  command.value ? store.favoriteCommandIds.has(command.value.command) : false,
);
const comparedLeftRun = computed(() =>
  recentRuns.value.find((entry) => entry.id === leftRunId.value) ?? null,
);
const comparedRightRun = computed(() =>
  recentRuns.value.find((entry) => entry.id === rightRunId.value) ?? null,
);
const runComparisonResult = computed(() => {
  if (!comparedLeftRun.value || !comparedRightRun.value) return undefined;
  return buildResultComparison(comparedLeftRun.value.result, comparedRightRun.value.result);
});
const commandSnapshots = computed(() =>
  command.value ? store.snapshotsBySource[`command:${command.value.command}`] ?? [] : [],
);
const commandReadiness = computed(() =>
  command.value?.meta.mode === 'browser' && store.isSiteAccessLoading(command.value.site) && !currentSiteAccess.value
    ? {
      tone: 'info' as const,
      title: t('readiness.siteState.checking', { site: store.getSiteDisplayName(command.value.site, locale.value) }),
      bullets: [t('readiness.siteDetail.checking', { site: store.getSiteDisplayName(command.value.site, locale.value) })],
      actions: [],
    }
    : buildCommandReadiness({
      command: command.value,
      doctor: store.doctor,
      siteAccess: currentSiteAccess.value,
      plugins: store.plugins,
      externalClis: store.externalClis,
      registryCommands: store.registry.commands,
      siteLabel: command.value ? store.getSiteDisplayName(command.value.site, locale.value) : '',
      formatCommandLabel: (item) => store.getCommandDisplayDesc(item.command, item.description || item.name, locale.value),
      t,
    }),
);
const currentAvailabilitySummary = computed(() => buildAvailabilitySummary(commandReadiness.value));
const currentStatusTone = computed<StatusToneState | null>(() =>
  command.value
    ? buildStatusTone({
      availability: currentAvailabilitySummary.value,
      risk: command.value.meta.risk,
      t,
    })
    : null,
);
const visibleCommandReadiness = computed(() => {
  const readiness = commandReadiness.value;
  if (!readiness) return null;
  return command.value?.meta.mode === 'browser' || readiness.tone !== 'success' || readiness.actions.length > 0 ? readiness : null;
});
const currentWorkbenchQuery = computed(() => buildWorkbenchQuery({
  command: selectedCommandName.value,
  search: pickerSearch.value,
  market: pickerMarket.value,
  siteCategory: pickerSiteCategory.value,
  site: pickerSelectedSite.value ?? '',
  advancedMode: store.advancedMode,
}));

function normalizeInputValue(value: unknown): string | number | boolean {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return JSON.stringify(value);
}

function resetForm(commandName: string | null): void {
  for (const key of Object.keys(formModel)) {
    delete formModel[key];
  }

  const commandItem = store.registry.commands.find((item) => item.command === commandName);
  if (!commandItem) return;

  for (const arg of commandItem.args) {
    if (arg.default !== undefined) {
      formModel[arg.name] = normalizeInputValue(arg.default);
      continue;
    }

    const fieldKind = inferWorkbenchFieldKind(arg);
    if (fieldKind === 'select' && (arg.choices?.length ?? 0) === 1) {
      formModel[arg.name] = normalizeInputValue(arg.choices?.[0] ?? '');
      continue;
    }
    formModel[arg.name] = fieldKind === 'boolean' ? false : '';
  }
}

function statusSurfaceClasses(status: StatusToneState | null, input?: { selected?: boolean; prominent?: boolean }): string[] {
  if (!status) return [];
  return [
    'status-surface',
    `status-surface--${status.tone}`,
    ...(input?.selected ? ['status-surface--selected'] : []),
    ...(input?.prominent ? ['status-surface--prominent'] : []),
  ];
}

function siteStatusTone(site: string): StatusToneState {
  return buildStatusTone({
    availability: siteAvailabilitySummary(site),
    risk: 'safe',
    t,
  });
}

function commandStatusTone(item: (typeof store.availableWorkbenchCommands)[number]): StatusToneState {
  return buildStatusTone({
    availability: commandAvailabilitySummary(item),
    risk: item.meta.risk,
    t,
  });
}

function statusAriaLabel(status: StatusToneState, subject: string): string {
  return buildStatusAriaLabel(status, subject);
}

function applyArgsToForm(args: Record<string, unknown>): void {
  if (!command.value) return;

  for (const arg of command.value.args) {
    if (Object.prototype.hasOwnProperty.call(args, arg.name)) {
      formModel[arg.name] = normalizeInputValue(args[arg.name]);
    }
  }
}

function queueArgs(args: Record<string, unknown>): void {
  pendingFormArgs.value = { ...args };
}

watch(command, (nextCommand) => {
  if (nextCommand) {
    void store.refreshSnapshots('command', nextCommand.command);
    pickerSelectedSite.value = nextCommand.site;
    void store.ensureSiteAccess([nextCommand.site]);
  }
  resetForm(nextCommand?.command ?? null);
  if (pendingFormArgs.value) {
    applyArgsToForm(pendingFormArgs.value);
    pendingFormArgs.value = null;
  }
}, { immediate: true });

watch(filteredWorkbenchSiteGroups, (groups) => {
  void store.ensureSiteAccess(groups.map((group) => group.site));
  const visibleSites = new Set(groups.map((group) => group.site));
  if (pickerSelectedSite.value && visibleSites.has(pickerSelectedSite.value)) {
    return;
  }
  if (selectedCommandSite.value && visibleSites.has(selectedCommandSite.value)) {
    pickerSelectedSite.value = selectedCommandSite.value;
    return;
  }
  pickerSelectedSite.value = groups[0]?.site ?? null;
}, { immediate: true });

watch(recentRuns, (runs) => {
  if (!runs.length) {
    leftRunId.value = null;
    rightRunId.value = null;
    return;
  }

  if (!runs.some((entry) => entry.id === leftRunId.value)) {
    leftRunId.value = runs[0]?.id ?? null;
  }

  if (!runs.some((entry) => entry.id === rightRunId.value) || rightRunId.value === leftRunId.value) {
    rightRunId.value = runs.find((entry) => entry.id !== leftRunId.value)?.id ?? null;
  }
}, { immediate: true });

watch(() => route.query, (query) => {
  const nextState = parseWorkbenchQuery(query);
  pickerSearch.value = nextState.search;
  pickerMarket.value = nextState.market;
  pickerSiteCategory.value = nextState.siteCategory;
  pickerSelectedSite.value = nextState.site || null;
  if (Object.prototype.hasOwnProperty.call(query, 'advanced')) {
    store.setAdvancedMode(nextState.advancedMode);
  }

  const nextCommand = pickDefaultWorkbenchCommand(
    store.registry.commands,
    nextState.command || store.lastWorkbenchCommandId || undefined,
    store.advancedMode,
    locale.value,
  );

  if (nextCommand && nextCommand !== store.selectedCommand) {
    store.setSelectedCommand(nextCommand);
  }

  const stagedArgs = store.consumeWorkbenchArgs();
  if (stagedArgs) {
    queueArgs(stagedArgs);
  }
});

watch(() => store.advancedMode, (advancedMode) => {
  const nextCommand = pickDefaultWorkbenchCommand(
    store.registry.commands,
    selectedCommandName.value,
    advancedMode,
    locale.value,
  );

  const nextQuery = buildWorkbenchQuery({
    command: nextCommand,
    search: pickerSearch.value,
    market: pickerMarket.value,
    siteCategory: pickerSiteCategory.value,
    site: pickerSelectedSite.value ?? '',
    advancedMode,
  });

  if (JSON.stringify(route.query) !== JSON.stringify(nextQuery)) {
    void router.replace({ query: nextQuery });
  }
});

watch([pickerSearch, pickerMarket, pickerSiteCategory, pickerSelectedSite], () => {
  if (JSON.stringify(route.query) !== JSON.stringify(currentWorkbenchQuery.value)) {
    void router.replace({ query: currentWorkbenchQuery.value });
  }
});

const cliPreview = computed(() => {
  if (!command.value) return 'opencli';

  const pieces = [`opencli ${command.value.command}`];
  for (const arg of command.value.args) {
    const value = formModel[arg.name];
    if (value === '' || value === null || value === undefined) continue;
    if (typeof value === 'boolean') {
      if (value) pieces.push(`--${arg.name}`);
      continue;
    }
    pieces.push(`--${arg.name} ${JSON.stringify(value)}`);
  }
  return pieces.join(' ');
});

const currentResult = computed(() =>
  store.lastExecution && store.lastExecution.command === command.value?.command
    ? store.lastExecution.result
    : undefined,
);
const commandArgUi = computed(() => {
  const currentCommand = command.value;
  if (!currentCommand) return new Map<string, ReturnType<typeof buildWorkbenchArgUi>>();

  return new Map(
    currentCommand.args.map((arg) => [
      arg.name,
      buildWorkbenchArgUi(currentCommand.command, arg, locale.value),
    ]),
  );
});

function collectArgs(): Record<string, unknown> {
  if (!command.value) return {};

  const args: Record<string, unknown> = {};
  for (const arg of command.value.args) {
    const value = formModel[arg.name];
    if (value === '' || value === null || value === undefined) continue;
    if (typeof value === 'boolean' && value === false) continue;
    args[arg.name] = value;
  }
  return args;
}

async function toggleCommandFavorite(): Promise<void> {
  if (!command.value) return;

  const nextFavorite = !isFavoriteCommand.value;
  await store.toggleFavorite('command', command.value.command, nextFavorite);
  message.success(nextFavorite ? t('workbench.favoriteSuccess', { value: commandDisplayLabel.value }) : t('workbench.unfavoriteSuccess', { value: commandDisplayLabel.value }));
}

async function saveWorkbenchPreset(input: { name: string; description: string }): Promise<void> {
  if (!command.value) return;

  await store.savePreset({
    kind: 'workbench',
    name: input.name,
    description: input.description || null,
    state: buildWorkbenchPresetState({
      command: command.value.command,
      args: collectArgs(),
      search: pickerSearch.value,
      market: pickerMarket.value,
      siteCategory: pickerSiteCategory.value,
      site: pickerSelectedSite.value ?? '',
      advancedMode: store.advancedMode,
    }),
  });
  message.success(t('workbench.savePresetSuccess', { value: input.name }));
}

async function handleRun(): Promise<void> {
  if (!command.value) return;

  if (command.value.meta.risk !== 'safe') {
    const proceed = window.confirm(t('workbench.riskyConfirm', { value: commandDisplayLabel.value, risk: command.value.meta.risk }));
    if (!proceed) return;
  }

  await store.runCommand(command.value.command, collectArgs());
  await store.ensureSiteAccess([command.value.site], true);
}

async function captureCommandSnapshot(): Promise<void> {
  if (!command.value) return;
  await store.captureSourceSnapshot({
    sourceKind: 'command',
    sourceId: command.value.command,
    command: command.value.command,
    args: collectArgs(),
  });
  message.success(t('workbench.captureSuccess', { value: commandDisplayLabel.value }));
}

function selectCommand(commandName: string): void {
  selectedCommandName.value = commandName;
  const nextCommand = store.registry.commands.find((item) => item.command === commandName);
  if (nextCommand) {
    pickerSelectedSite.value = nextCommand.site;
  }
}

function resetPickerFilters(): void {
  pickerSearch.value = '';
  pickerMarket.value = 'all';
  pickerSiteCategory.value = 'all';
  pickerSelectedSite.value = selectedCommandSite.value;
}

function selectPickerSite(site: string): void {
  pickerSelectedSite.value = site;
}

function siteCategoryLabel(value: Exclude<RegistryFilters['siteCategory'], 'all'>): string {
  return t(`registry.siteCategory.${value}`);
}

function availabilityTagType(tone: AvailabilitySummary['tone']): 'success' | 'info' | 'warning' | 'error' | 'default' {
  if (tone === 'success') return 'success';
  if (tone === 'info') return 'info';
  if (tone === 'warning') return 'warning';
  if (tone === 'error') return 'error';
  return 'default';
}

function siteAvailabilitySummary(site: string): AvailabilitySummary | null {
  const displaySite = store.getSiteDisplayName(site, locale.value);
  if (store.isSiteAccessLoading(site) && !store.getSiteAccess(site)) {
    return {
      tone: 'info',
      label: t('readiness.siteState.checking', { site: displaySite }),
      detail: t('readiness.siteDetail.checking', { site: displaySite }),
      action: null,
    };
  }
  return buildSiteAccessSummary({
    siteAccess: store.getSiteAccess(site),
    siteLabel: displaySite,
    t,
  });
}

function commandAvailabilitySummary(item: (typeof store.availableWorkbenchCommands)[number]): AvailabilitySummary | null {
  const displaySite = store.getSiteDisplayName(item.site, locale.value);
  if (item.meta.mode === 'browser' && store.isSiteAccessLoading(item.site) && !store.getSiteAccess(item.site)) {
    return {
      tone: 'info',
      label: t('readiness.siteState.checking', { site: displaySite }),
      detail: t('readiness.siteDetail.checking', { site: displaySite }),
      action: null,
    };
  }
  return buildAvailabilitySummary(buildCommandReadiness({
    command: item,
    doctor: store.doctor,
    siteAccess: store.getSiteAccess(item.site),
    plugins: store.plugins,
    externalClis: store.externalClis,
    registryCommands: store.registry.commands,
    siteLabel: displaySite,
    formatCommandLabel: (entry) => store.getCommandDisplayDesc(entry.command, entry.description || entry.name, locale.value),
    t,
  }));
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

function riskLabel(value: 'safe' | 'confirm' | 'dangerous'): string {
  if (value === 'safe') return t('registry.status.safe');
  if (value === 'confirm') return t('registry.status.confirm');
  return t('registry.status.dangerous');
}

function statusLabel(status: 'success' | 'error' | string): string {
  if (status === 'success') return t('common.statusSuccess');
  if (status === 'error') return t('common.statusError');
  return String(status);
}

function openOps(): void {
  void router.push({ name: 'ops' });
}

async function handleReadinessAction(action: CommandReadinessAction): Promise<void> {
  try {
    if (action.type === 'run-doctor') {
      await store.runDoctor({ live: true, sessions: true });
      if (command.value) {
        await store.ensureSiteAccess([command.value.site], true);
      }
      message.success(t('ops.doctorCompleted'));
      return;
    }

    if (action.type === 'open-ops') {
      openOps();
      return;
    }

    if (action.type === 'open-command' && action.command) {
      selectCommand(action.command);
      const nextCommand = findCommand(action.command);
      if (nextCommand) {
        await store.ensureSiteAccess([nextCommand.site], true);
      }
      return;
    }

    if (action.type === 'run-command' && action.command) {
      await executeCommand(action.command, action.args ?? {});
      await store.refreshHistory();
      const nextCommand = findCommand(action.command);
      if (nextCommand) {
        await store.ensureSiteAccess([nextCommand.site], true);
      }
      message.success(t('readiness.actionCompleted'));
      return;
    }

    if (action.type === 'install-external' && action.externalName) {
      await requestInstallExternalCli(action.externalName);
      await store.refreshOpsInventory();
      if (command.value) {
        await store.ensureSiteAccess([command.value.site], true);
      }
      message.success(t('readiness.installSuccess', { value: action.externalName }));
      return;
    }

    if (action.type === 'open-url' && action.url) {
      window.open(action.url, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : String(error));
  }
}

function reuseHistoryEntry(entry: StudioHistoryEntry): void {
  queueArgs(entry.args);
  if (selectedCommandName.value !== entry.command) {
    selectedCommandName.value = entry.command;
    return;
  }
  applyArgsToForm(entry.args);
  pendingFormArgs.value = null;
}

function applyWorkbenchPreset(preset: StudioPresetEntry): void {
  const state = readWorkbenchPresetState(preset.state);
  store.setAdvancedMode(state.advancedMode);
  pickerSearch.value = state.search;
  pickerMarket.value = state.market;
  pickerSiteCategory.value = state.siteCategory;
  pickerSelectedSite.value = state.site || null;
  queueArgs(state.args);
  if (selectedCommandName.value !== state.command) {
    selectedCommandName.value = state.command;
  } else {
    applyArgsToForm(state.args);
    pendingFormArgs.value = null;
  }
  message.success(t('workbench.applyPresetSuccess', { value: preset.name }));
}

async function removeWorkbenchPreset(preset: StudioPresetEntry): Promise<void> {
  const proceed = window.confirm(t('workbench.deletePresetConfirm', { value: preset.name }));
  if (!proceed) return;
  await store.deletePreset(preset.id);
  message.success(t('workbench.deletePresetSuccess', { value: preset.name }));
}

function argUi(argName: string) {
  return commandArgUi.value.get(argName);
}
</script>

<template>
  <section class="page-grid workbench-layout">
    <div class="page-inline-header workbench-layout__header" style="grid-column: 1 / -1;">
      <h1 class="gradient-title">{{ t('routes.workbench.title') }}</h1>
      <p class="page-inline-header__desc">{{ t('routes.workbench.description') }}</p>
    </div>

    <n-card :title="t('workbench.selection')" class="glass-card workbench-section-card workbench-selection-card">
      <div class="workbench-picker">
        <div class="workbench-picker__toolbar">
          <div class="workbench-picker__summary">{{ pickerSummary }}</div>
          <n-button class="workbench-picker__clear" size="tiny" tertiary @click="resetPickerFilters()">
            {{ t('workbench.clearPicker') }}
          </n-button>
        </div>

        <n-input
          v-model:value="pickerSearch"
          :placeholder="t('workbench.searchPlaceholder')"
          clearable
        />

        <div class="workbench-picker__filters">
          <div class="workbench-picker__row workbench-picker__row--market">
            <div class="workbench-picker__row-header">
              <strong>{{ t('registry.catalog.byMarket') }}</strong>
            </div>
            <div class="category-tabs category-tabs--secondary workbench-picker__markets">
              <button
                v-for="option in pickerMarketOptions"
                :key="option.value"
                class="category-tab category-tab--sm workbench-market-tab"
                :class="{ 'category-tab--active': pickerMarket === option.value }"
                @click="pickerMarket = option.value"
              >
                <span class="workbench-market-tab__label">{{ option.label }}</span>
              </button>
            </div>
          </div>

          <div class="workbench-picker__row workbench-picker__row--category">
            <div class="workbench-picker__row-header">
              <strong>{{ t('workbench.categoryColumn') }}</strong>
              <span>{{ pickerAllCategoryCount }}</span>
            </div>
            <div class="workbench-picker__categories">
              <button
                class="category-tab category-tab--sm workbench-category-tab"
                :class="{ 'category-tab--active': pickerSiteCategory === 'all' }"
                @click="pickerSiteCategory = 'all'"
              >
                <span class="workbench-category-tab__label">
                  <span class="workbench-category-tab__text">{{ t('registry.siteCategory.all') }}</span>
                </span>
                <span class="category-tab__count">{{ pickerAllCategoryCount }}</span>
              </button>
              <button
                v-for="group in pickerCategoryGroups"
                :key="group.category"
                class="category-tab category-tab--sm workbench-category-tab"
                :class="{ 'category-tab--active': pickerSiteCategory === group.category }"
                @click="pickerSiteCategory = group.category"
              >
                <span class="workbench-category-tab__label">
                  <span class="workbench-category-tab__text">{{ siteCategoryLabel(group.category) }}</span>
                </span>
                <span class="category-tab__count">{{ group.count }}</span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredWorkbenchSiteGroups.length" class="workbench-picker__panels">
          <section class="workbench-picker__panel workbench-picker__panel--site">
            <div class="workbench-picker__row-header">
              <strong>{{ t('workbench.siteColumn') }}</strong>
              <span>{{ filteredWorkbenchSiteGroups.length }}</span>
            </div>
            <div class="workbench-picker__capsules workbench-picker__capsules--sites">
              <n-tooltip
                v-for="group in filteredWorkbenchSiteGroups"
                :key="group.site"
                placement="top"
                trigger="hover"
                :delay="120"
              >
                <template #trigger>
                  <button
                    class="workbench-picker__capsule workbench-picker__capsule--site"
                    :class="[
                      { 'workbench-picker__capsule--active': pickerSelectedSite === group.site },
                      ...statusSurfaceClasses(siteStatusTone(group.site), { selected: pickerSelectedSite === group.site }),
                    ]"
                    :aria-label="statusAriaLabel(siteStatusTone(group.site), store.getSiteDisplayName(group.site, locale))"
                    @click="selectPickerSite(group.site)"
                  >
                    <span class="workbench-picker__capsule-text">
                      <span class="workbench-picker__capsule-title">{{ store.getSiteDisplayName(group.site, locale) }}</span>
                    </span>
                    <span class="workbench-picker__capsule-count">{{ group.count }}</span>
                  </button>
                </template>
                <div class="status-surface__tooltip">
                  <strong>{{ siteStatusTone(group.site).label }}</strong>
                  <p v-if="siteStatusTone(group.site).detail">{{ siteStatusTone(group.site).detail }}</p>
                </div>
              </n-tooltip>
            </div>
          </section>

          <section class="workbench-picker__panel workbench-picker__panel--command">
            <div class="workbench-picker__row-header">
              <strong>
                {{
                  pickerSelectedSiteLabel
                    ? t('workbench.commandColumnSelected', { value: pickerSelectedSiteLabel })
                    : t('workbench.commandColumn')
                }}
              </strong>
              <span>{{ pickerVisibleCommands.length }}</span>
            </div>
            <div class="workbench-picker__panel-body">
              <div v-if="pickerVisibleCommands.length" class="workbench-picker__capsules workbench-picker__capsules--commands">
                <n-tooltip
                  v-for="item in pickerVisibleCommands"
                  :key="item.command"
                  placement="top"
                  trigger="hover"
                  :delay="120"
                >
                  <template #trigger>
                    <button
                      class="workbench-picker__capsule workbench-picker__capsule--command"
                      :class="[
                        { 'workbench-picker__capsule--active': selectedCommandName === item.command },
                        ...statusSurfaceClasses(commandStatusTone(item), { selected: selectedCommandName === item.command }),
                      ]"
                      :aria-label="statusAriaLabel(commandStatusTone(item), getCommandLabel(item.command, item.description || item.name))"
                      @click="selectCommand(item.command)"
                    >
                      <span class="workbench-picker__capsule-title">
                        {{ store.getCommandDisplayDesc(item.command, item.description || item.name, locale) }}
                      </span>
                    </button>
                  </template>
                  <div class="status-surface__tooltip">
                    <strong>{{ commandStatusTone(item).label }}</strong>
                    <p v-if="commandStatusTone(item).detail">{{ commandStatusTone(item).detail }}</p>
                  </div>
                </n-tooltip>
              </div>
              <div v-else class="panel-note workbench-picker__empty">
                {{ pickerSelectedSiteLabel ? t('workbench.noCommandsForSite') : t('workbench.pickSiteFirst') }}
              </div>

              <div v-if="command" class="workbench-picker__selected">
                <n-tooltip placement="top" trigger="hover" :delay="120">
                  <template #trigger>
                    <div
                      class="command-summary-bar command-summary-bar--compact"
                      :class="statusSurfaceClasses(currentStatusTone, { prominent: true })"
                      :aria-label="currentStatusTone ? statusAriaLabel(currentStatusTone, commandDisplayLabel) : commandDisplayLabel"
                    >
                      <div class="command-summary-bar__main">
                        <div class="command-summary-bar__copy">
                          <strong class="command-summary-bar__title">{{ commandDisplayLabel }}</strong>
                          <span class="command-summary-bar__meta">
                            {{ currentAvailabilitySummary?.detail || store.getCommandDisplayDesc(command.command, command.description || '', locale) || t('common.noDescription') }}
                          </span>
                        </div>
                        <div class="command-summary-bar__actions">
                          <n-button quaternary size="small" @click="toggleCommandFavorite()">
                            {{ isFavoriteCommand ? t('registry.favorited') : t('workbench.favoriteCommand') }}
                          </n-button>
                          <save-preset-button
                            :button-label="t('workbench.savePreset')"
                            :title="t('workbench.savePresetTitle')"
                            :description="t('workbench.savePresetDescription')"
                            :default-name="commandDisplayLabel"
                            :default-description="command.description || ''"
                            :save="saveWorkbenchPreset"
                          />
                        </div>
                      </div>
                      <div class="command-summary-bar__meta-row">
                        <span class="chip chip--small">{{ store.getSiteDisplayName(command.site, locale) }}</span>
                        <span class="chip chip--small">{{ capabilityLabel(command.meta.capability) }}</span>
                        <span class="chip chip--small">{{ modeLabel(command.meta.mode) }}</span>
                        <span
                          v-if="store.advancedMode && command.meta.risk !== 'safe'"
                          class="chip chip--small"
                        >
                          {{ riskLabel(command.meta.risk) }}
                        </span>
                      </div>
                    </div>
                  </template>
                  <div v-if="currentStatusTone" class="status-surface__tooltip">
                    <strong>{{ currentStatusTone.label }}</strong>
                    <p v-if="currentStatusTone.detail">{{ currentStatusTone.detail }}</p>
                  </div>
                </n-tooltip>

                <command-readiness-banner
                  v-if="visibleCommandReadiness"
                  :readiness="visibleCommandReadiness"
                  @action="handleReadinessAction"
                />
              </div>
            </div>
          </section>
        </div>
        <div v-else class="workbench-picker__row workbench-picker__row--empty">
          <n-empty size="small" :description="t('workbench.noCommandMatches')" />
        </div>
      </div>
    </n-card>

    <div class="workbench-config-grid">
      <n-card :title="t('workbench.arguments')" class="glass-card workbench-section-card workbench-args-card">
        <n-alert v-if="store.executionError" type="error" class="page-alert">
          {{ store.executionError }}
        </n-alert>

        <n-form v-if="command" label-placement="top" class="workbench-form">
          <template v-if="command.args.some(a => a.required) && command.args.some(a => !a.required)">
            <div class="eyebrow" style="margin-bottom: 4px;">{{ t('workbench.requiredArgs') }}</div>
          </template>
          <n-form-item
            v-for="arg in command.args"
            :key="arg.name"
            :feedback="argUi(arg.name)?.hint || (arg.required ? t('workbench.requiredArgument') : '')"
          >
            <template #label>
              <div class="arg-field__label">
                <div class="arg-field__headline">
                  <span class="arg-field__title">{{ argUi(arg.name)?.label ?? arg.name }}</span>
                  <span class="arg-field__key">{{ arg.name }}</span>
                  <span v-if="arg.required" class="arg-field__badge">{{ t('workbench.requiredArgs') }}</span>
                </div>
              </div>
            </template>
            <n-select
              v-if="inferWorkbenchFieldKind(arg) === 'select'"
              v-model:value="formModel[arg.name]"
              :options="argUi(arg.name)?.options ?? []"
              :placeholder="argUi(arg.name)?.placeholder"
              :filterable="(argUi(arg.name)?.options.length ?? 0) > 6"
              :clearable="!arg.required"
              :disabled="argUi(arg.name)?.disabled"
            />
            <n-input-number
              v-else-if="inferWorkbenchFieldKind(arg) === 'number'"
              v-model:value="formModel[arg.name]"
              class="field-fill"
              :placeholder="argUi(arg.name)?.placeholder"
            />
            <div v-else-if="inferWorkbenchFieldKind(arg) === 'boolean'" class="switch-inline switch-inline--wide">
              <span>{{ argUi(arg.name)?.hint || t('workbench.toggleFlag') }}</span>
              <n-switch v-model:value="formModel[arg.name]" />
            </div>
            <n-input
              v-else
              v-model:value="formModel[arg.name]"
              :placeholder="argUi(arg.name)?.placeholder || (arg.default !== undefined ? t('workbench.defaultValue', { value: String(arg.default) }) : t('workbench.enterValue'))"
              clearable
            />
          </n-form-item>
        </n-form>

        <div class="card-actions workbench-actions workbench-actions--form">
          <n-button type="primary" :loading="store.runningCommand" @click="handleRun()">{{ t('workbench.runCommand') }}</n-button>
          <n-button tertiary :loading="store.runningSnapshot" @click="captureCommandSnapshot()">{{ t('workbench.captureSnapshot') }}</n-button>
          <n-button tertiary @click="resetForm(command?.command ?? null)">{{ t('workbench.resetArgs') }}</n-button>
          <save-preset-button
            :button-label="t('workbench.savePreset')"
            :title="t('workbench.savePresetTitle')"
            :description="t('workbench.savePresetDescription')"
            :default-name="command ? t('workbench.commandPreset', { value: commandDisplayLabel }) : t('workbench.fallbackPreset')"
            :default-description="command?.description || ''"
            :disabled="!command"
            :save="saveWorkbenchPreset"
          />
        </div>
      </n-card>
    </div>

    <div class="workbench-output-layout">
      <div class="workbench-history-rail">
        <n-card :title="t('workbench.recentRuns')" class="glass-card workbench-section-card workbench-history-card">
          <div v-if="recentRuns.length" class="stack-list">
            <div v-for="entry in recentRuns" :key="entry.id" class="stack-row stack-row--dense">
              <button class="stack-row__primary stack-row__primary--workbench" @click="selectCommand(entry.command)">
                <strong>{{ getCommandLabel(entry.command) }}</strong>
                <span>{{ new Date(entry.startedAt).toLocaleString() }}</span>
              </button>
              <div class="stack-row__meta stack-row__meta--workbench">
                <n-button size="small" quaternary @click.stop="reuseHistoryEntry(entry)">{{ t('workbench.reuseArgs') }}</n-button>
                <n-tag :type="entry.status === 'success' ? 'success' : 'error'" size="small">{{ statusLabel(entry.status) }}</n-tag>
                <span>{{ entry.durationMs }} ms</span>
              </div>
            </div>
          </div>
          <div v-else class="panel-note">{{ t('workbench.noHistory') }}</div>
        </n-card>

        <n-card :title="t('workbench.savedPresets')" class="glass-card workbench-section-card workbench-history-card">
          <preset-shelf
            :presets="store.workbenchPresets"
            :empty-description="t('workbench.savedPresetsEmpty')"
            @apply="applyWorkbenchPreset"
            @remove="removeWorkbenchPreset"
          />
        </n-card>

        <n-card :title="t('workbench.snapshots')" class="glass-card workbench-section-card workbench-history-card">
          <div v-if="commandSnapshots.length" class="stack-list">
            <div v-for="snapshot in commandSnapshots.slice(0, 5)" :key="snapshot.id" class="stack-row stack-row--dense">
              <div class="stack-row__content">
                <strong>{{ new Date(snapshot.capturedAt).toLocaleString() }}</strong>
                <span>{{ getCommandIdLabel(snapshot.command) }}</span>
              </div>
              <div class="stack-row__meta stack-row__meta--workbench">
                <n-tag :type="snapshot.status === 'success' ? 'success' : 'error'" size="small">{{ statusLabel(snapshot.status) }}</n-tag>
                <span>{{ snapshot.durationMs }} ms</span>
              </div>
            </div>
          </div>
          <div v-else class="panel-note">{{ t('workbench.noSnapshots') }}</div>
          <div v-if="commandSnapshots.length" class="card-actions workbench-actions workbench-actions--snapshots">
            <n-button size="small" quaternary @click="router.push({ name: 'insights' })">{{ t('workbench.viewInInsights') }}</n-button>
          </div>
        </n-card>
      </div>

      <div class="workbench-output-main">
        <n-card :title="t('workbench.compareRuns')" class="glass-card workbench-section-card workbench-compare-card">
          <template v-if="recentRuns.length">
            <div class="compare-grid">
              <n-select v-model:value="leftRunId" :options="runOptions" :placeholder="t('workbench.baseRun')" />
              <n-select v-model:value="rightRunId" :options="runOptions" :placeholder="t('workbench.targetRun')" />
            </div>
            <result-panel
              :title="command ? t('workbench.runDiff', { value: commandDisplayLabel }) : t('workbench.compareRuns')"
              :result="runComparisonResult"
            />
          </template>
          <n-empty v-else :description="t('workbench.compareEmpty')" />
        </n-card>

        <div class="workbench-result-panel">
          <result-panel
            :title="command ? t('workbench.output', { value: commandDisplayLabel }) : t('workbench.defaultOutput')"
            :result="currentResult"
          />
        </div>
      </div>
    </div>
  </section>
</template>
