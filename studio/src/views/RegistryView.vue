<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NButton,
  NButtonGroup,
  NCard,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NInput,
  NSelect,
  NTag,
  NTooltip,
  useMessage,
} from 'naive-ui';
import PresetShelf from '../components/PresetShelf.vue';
import SavePresetButton from '../components/SavePresetButton.vue';
import { executeCommand, installExternalCli as requestInstallExternalCli } from '../lib/api';
import { useStudioI18n } from '../lib/i18n';
import { buildRegistryPresetState, readRegistryPresetState } from '../lib/preset-state';
import {
  CREATOR_SITE_CATEGORY_ORDER,
  filterRegistryCommands,
  inferCommandPurpose,
  sortSitesByDisplayPreference,
  type RegistryCatalogAxis,
  type RegistryFilters,
} from '../lib/registry';
import { buildRegistryQuery, parseRegistryQuery } from '../lib/routes';
import { buildStatusAriaLabel, buildStatusTone, type StatusToneState } from '../lib/status-tone';
import {
  buildAvailabilitySummary,
  buildCommandReadiness,
  buildSiteAccessSummary,
  type AvailabilitySummary,
  type CommandReadinessAction,
} from '../lib/readiness';
import { useStudioStore } from '../stores/studio';
import type { StudioCommandItem, StudioPresetEntry } from '../types';

const store = useStudioStore();
const route = useRoute();
const router = useRouter();
const message = useMessage();
const { locale, t } = useStudioI18n();

const catalogOpen = ref(false);
const expandedSiteName = ref<string | null>(null);
const expandedSiteOpen = computed({
  get: () => expandedSiteName.value !== null,
  set: (v: boolean) => { if (!v) expandedSiteName.value = null; },
});
const initialFilters = parseRegistryQuery(route.query);
if (Object.prototype.hasOwnProperty.call(route.query, 'advanced')) {
  store.setAdvancedMode(initialFilters.advancedMode);
}

const search = ref(initialFilters.search);
const site = ref(initialFilters.site);
const market = ref<RegistryFilters['market']>(initialFilters.market);
const siteCategory = ref<RegistryFilters['siteCategory']>(initialFilters.siteCategory);
const surface = ref<RegistryFilters['surface']>(initialFilters.surface);
const mode = ref<RegistryFilters['mode']>(initialFilters.mode);
const capability = ref<RegistryFilters['capability']>(initialFilters.capability);
const purpose = ref<RegistryFilters['purpose']>(initialFilters.purpose);
const risk = ref<RegistryFilters['risk']>(initialFilters.risk);
const supportsChartsOnly = ref(initialFilters.supportsChartsOnly);

const currentFilters = computed<RegistryFilters>(() => ({
  search: search.value,
  site: site.value,
  market: market.value,
  siteCategory: siteCategory.value,
  surface: surface.value,
  mode: mode.value,
  capability: capability.value,
  purpose: purpose.value,
  risk: risk.value,
  supportsChartsOnly: supportsChartsOnly.value,
  advancedMode: store.advancedMode,
}));

const filteredCommands = computed(() => filterRegistryCommands(
  store.registry.commands,
  {
    ...currentFilters.value,
    advancedMode: true,
  },
  store.getSiteCategory,
));
const favoriteCount = computed(() => store.favoriteCommandIds.size);
const sitePopularityRank = computed(() =>
  new Map(store.registry.sites.map((item, index) => [item.site, index])),
);

const marketOptions = computed(() => [
  { value: 'all', label: t('registry.market.all') },
  { value: 'domestic', label: t('registry.market.domestic') },
  { value: 'international', label: t('registry.market.international') },
  { value: 'unknown', label: t('registry.market.unknown') },
]);

const siteCategoryOptions = computed(() => {
  return [
    { value: 'all', label: t('registry.siteCategory.all') },
    ...CREATOR_SITE_CATEGORY_ORDER.map((value) => ({ value, label: t(`registry.siteCategory.${value}`) })),
  ];
});

const localeOrderedSites = computed(() =>
  sortSitesByDisplayPreference(
    store.registry.sites,
    locale.value,
    {
      resolveCategory: (item) => item.category ?? store.getSiteCategory(item.site),
      resolveMarket: (item) => item.market ?? 'unknown',
      resolvePopularity: (item) => sitePopularityRank.value.get(item.site),
      resolveCommandCount: (item) => item.commandCount,
    },
  ),
);

const siteOptions = computed(() => [
  { label: t('registry.allSites'), value: 'all' },
  ...localeOrderedSites.value.map((item) => ({ label: `${store.getSiteDisplayName(item.site, locale.value)} (${item.commandCount})`, value: item.site })),
]);

const modeOptions = computed(() => [
  { label: t('registry.allModes'), value: 'all' },
  { label: t('registry.public'), value: 'public' },
  { label: t('registry.browser'), value: 'browser' },
  { label: t('registry.desktop'), value: 'desktop' },
  { label: t('registry.external'), value: 'external' },
]);

const surfaceOptions = computed(() => [
  { label: t('registry.allSurfaces'), value: 'all' },
  { label: t('registry.builtIn'), value: 'builtin' },
  { label: t('registry.plugin'), value: 'plugin' },
  { label: t('registry.external'), value: 'external' },
]);

const capabilityOptions = computed(() => [
  { label: t('registry.allCapabilities'), value: 'all' },
  { label: t('registry.discovery'), value: 'discovery' },
  { label: t('registry.search'), value: 'search' },
  { label: t('registry.detail'), value: 'detail' },
  { label: t('registry.account'), value: 'account' },
  { label: t('registry.action'), value: 'action' },
  { label: t('registry.asset'), value: 'asset' },
  { label: t('registry.tooling'), value: 'tooling' },
  { label: t('registry.other'), value: 'other' },
]);

const purposeOptions = computed(() => [
  { label: t('registry.purpose.all'), value: 'all' },
  { label: t('registry.purpose.discovery'), value: 'discovery' },
  { label: t('registry.purpose.analysis'), value: 'analysis' },
  { label: t('registry.purpose.automation'), value: 'automation' },
  { label: t('registry.purpose.auth'), value: 'auth' },
  { label: t('registry.purpose.asset'), value: 'asset' },
  { label: t('registry.purpose.integration'), value: 'integration' },
  { label: t('registry.purpose.utility'), value: 'utility' },
]);

const purposeGroups = computed(() => {
  const counts = new Map<string, number>();
  for (const cmd of store.registry.commands) {
    const p = inferCommandPurpose(cmd);
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return purposeOptions.value
    .filter(o => o.value !== 'all')
    .map(o => ({ value: o.value, label: o.label, count: counts.get(o.value) ?? 0 }))
    .filter(g => g.count > 0)
    .sort((a, b) => b.count - a.count);
});

const riskOptions = computed(() => [
  { label: t('registry.allRisks'), value: 'all' },
  { label: t('registry.safe'), value: 'safe' },
  { label: t('registry.confirm'), value: 'confirm' },
  { label: t('registry.dangerous'), value: 'dangerous' },
]);

type RegistryCatalogEntry = {
  label: string;
  value: string;
  type: RegistryCatalogAxis;
  count: number;
};

type RegistryCatalogSection = {
  axis: RegistryCatalogAxis;
  title: string;
  entries: RegistryCatalogEntry[];
};

type CommandSection = {
  axis: RegistryCatalogAxis;
  key: string;
  commands: StudioCommandItem[];
};

const siteCatalog = computed(() => [
  { label: t('registry.allSites'), value: 'all', type: 'site' as const, count: store.registry.commands.length },
  ...localeOrderedSites.value.map((entry) => ({
    label: store.getSiteDisplayName(entry.site, locale.value),
    value: entry.site,
    type: 'site' as const,
    count: entry.commandCount,
  })),
]);

const marketCatalog = computed<RegistryCatalogEntry[]>(() => [
  { label: t('registry.market.all'), value: 'all', type: 'market', count: store.registry.commands.length },
  ...marketOptions.value
    .filter((item) => item.value !== 'all')
    .map((item) => ({
      label: item.label,
      value: item.value as RegistryFilters['market'],
      type: 'market' as const,
      count: store.registry.commands.filter((command) => command.meta.market === item.value).length,
    })),
]);

const siteCategoryCatalog = computed<RegistryCatalogEntry[]>(() => [
  { label: t('registry.siteCategory.all'), value: 'all', type: 'siteCategory', count: store.registry.commands.length },
  ...siteCategoryOptions.value
    .filter((item) => item.value !== 'all')
    .map((item) => ({
      label: item.label,
      value: item.value as RegistryFilters['siteCategory'],
      type: 'siteCategory' as const,
      count: store.registry.commands.filter((command) => store.getSiteCategory(command.site) === item.value).length,
    })),
]);

const capabilityCatalog = computed<RegistryCatalogEntry[]>(() => [
  { label: t('registry.allCapabilities'), value: 'all', type: 'capability', count: store.registry.commands.length },
  ...capabilityOptions.value
    .filter((item) => item.value !== 'all')
    .map((item) => ({
      label: item.label,
      value: item.value as RegistryFilters['capability'],
      type: 'capability' as const,
      count: store.registry.commands.filter((command) => command.meta.capability === item.value).length,
    })),
]);

const purposeCatalog = computed<RegistryCatalogEntry[]>(() => [
  { label: t('registry.purpose.all'), value: 'all', type: 'purpose', count: store.registry.commands.length },
  ...purposeOptions.value
    .filter((item) => item.value !== 'all')
    .map((item) => ({
      label: item.label,
      value: item.value as RegistryFilters['purpose'],
      type: 'purpose' as const,
      count: store.registry.commands.filter((command) => inferCommandPurpose(command) === item.value).length,
    })),
]);

const riskCatalog = computed<RegistryCatalogEntry[]>(() => [
  { label: t('registry.allRisks'), value: 'all', type: 'risk', count: store.registry.commands.length },
  { label: t('registry.safe'), value: 'safe', type: 'risk', count: store.registry.commands.filter((command) => command.meta.risk === 'safe').length },
  { label: t('registry.confirm'), value: 'confirm', type: 'risk', count: store.registry.commands.filter((command) => command.meta.risk === 'confirm').length },
  { label: t('registry.dangerous'), value: 'dangerous', type: 'risk', count: store.registry.commands.filter((command) => command.meta.risk === 'dangerous').length },
]);

const catalogSections = computed<RegistryCatalogSection[]>(() => [
  { axis: 'market', title: t('registry.catalog.byMarket'), entries: marketCatalog.value },
  { axis: 'siteCategory', title: t('registry.catalog.byCategory'), entries: siteCategoryCatalog.value },
  { axis: 'capability', title: t('registry.catalog.byCapability'), entries: capabilityCatalog.value },
  { axis: 'purpose', title: t('registry.catalog.byPurpose'), entries: purposeCatalog.value },
  { axis: 'risk', title: t('registry.catalog.byRisk'), entries: riskCatalog.value },
  { axis: 'site', title: t('registry.catalog.bySite'), entries: siteCatalog.value },
]);

const hasCatalogFilter = computed(() =>
  market.value !== 'all'
  || siteCategory.value !== 'all'
  || site.value !== 'all'
  || surface.value !== 'all'
  || mode.value !== 'all'
  || purpose.value !== 'all'
  || capability.value !== 'all'
  || risk.value !== 'all'
  || supportsChartsOnly.value,
);

const activeGroupingAxis = computed<RegistryCatalogAxis>(() => {
  if (site.value !== 'all') return 'site';
  if (market.value !== 'all') return 'market';
  if (siteCategory.value !== 'all') return 'siteCategory';
  if (capability.value !== 'all') return 'capability';
  if (purpose.value !== 'all') return 'purpose';
  if (risk.value !== 'all') return 'risk';
  return 'market';
});

const filteredSiteGroups = computed(() => {
  const groups = store.siteGroups
    .map(group => {
      const filtered = group.commands.filter(cmd => {
        if (search.value) {
          const q = search.value.toLowerCase();
          if (!cmd.command.toLowerCase().includes(q) && !(cmd.description ?? '').toLowerCase().includes(q) && !cmd.site.toLowerCase().includes(q)) return false;
        }
        if (site.value && site.value !== 'all' && cmd.site !== site.value) return false;
        if (siteCategory.value && siteCategory.value !== 'all' && store.getSiteCategory(cmd.site) !== siteCategory.value) return false;
        if (purpose.value && purpose.value !== 'all' && inferCommandPurpose(cmd) !== purpose.value) return false;
        if (market.value && market.value !== 'all' && cmd.meta?.market !== market.value) return false;
        if (surface.value && surface.value !== 'all' && cmd.meta?.surface !== surface.value) return false;
        if (mode.value && mode.value !== 'all' && cmd.meta?.mode !== mode.value) return false;
        if (capability.value && capability.value !== 'all' && cmd.meta?.capability !== capability.value) return false;
        if (risk.value && risk.value !== 'all' && cmd.meta?.risk !== risk.value) return false;
        if (supportsChartsOnly.value && !cmd.meta?.uiHints?.supportsCharts) return false;
        return true;
      });
      return { ...group, commands: filtered, count: filtered.length };
    })
    .filter(group => group.count > 0);

  return sortSitesByDisplayPreference(
    groups,
    locale.value,
    {
      resolveCategory: (group) => group.category,
      resolveMarket: (group) => group.market ?? group.commands[0]?.meta.market ?? 'unknown',
      resolvePopularity: (group) => sitePopularityRank.value.get(group.site),
      resolveCommandCount: (group) => group.count,
    },
  );
});

watch(filteredSiteGroups, (groups) => {
  void store.ensureSiteAccess(groups.map((group) => group.site));
}, { immediate: true });

const expandedSite = computed(() => {
  if (!expandedSiteName.value) return null;
  return store.siteGroups.find(g => g.site === expandedSiteName.value) ?? null;
});

function expandSite(siteName: string): void {
  expandedSiteName.value = siteName;
}

const commandSections = computed<CommandSection[]>(() => {
  const axis = activeGroupingAxis.value;
  const groups = new Map<string, StudioCommandItem[]>();

  for (const command of filteredCommands.value) {
    const key = axis === 'site'
      ? command.site
      : axis === 'market'
        ? command.meta.market
        : axis === 'siteCategory'
          ? store.getSiteCategory(command.site)
          : axis === 'capability'
            ? command.meta.capability
            : axis === 'purpose'
              ? inferCommandPurpose(command)
              : command.meta.risk;

    const list = groups.get(key) ?? [];
    list.push(command);
    groups.set(key, list);
  }

  return [...groups.entries()].map(([groupKey, commands]) => ({
    axis,
    key: groupKey,
    commands,
  })).sort((left, right) => {
    const titleCompare = commandGroupLabel({
      axis: left.axis,
      key: left.key,
      commands: left.commands,
    }).localeCompare(commandGroupLabel({
      axis: right.axis,
      key: right.key,
      commands: right.commands,
    }));
    return right.commands.length - left.commands.length || titleCompare;
  });
});

function marketLabel(value: RegistryFilters['market']): string {
  if (value === 'domestic') return t('registry.market.domestic');
  if (value === 'international') return t('registry.market.international');
  if (value === 'unknown') return t('registry.market.unknown');
  return t('registry.market.all');
}

function siteCategoryLabel(value: RegistryFilters['siteCategory']): string {
  return t(`registry.siteCategory.${value}`);
}

function modeLabel(value: RegistryFilters['mode']): string {
  return t(`registry.mode.${value}`);
}

function surfaceLabel(value: RegistryFilters['surface']): string {
  return t(`registry.surface.${value}`);
}

function capabilityLabel(value: RegistryFilters['capability']): string {
  return t(`registry.capability.${value}`);
}

function purposeLabel(value: RegistryFilters['purpose']): string {
  return t(`registry.purpose.${value}`);
}

function isCatalogSelected(entry: RegistryCatalogEntry): boolean {
  if (entry.type === 'market') return market.value === entry.value;
  if (entry.type === 'siteCategory') return siteCategory.value === entry.value;
  if (entry.type === 'surface') return surface.value === entry.value;
  if (entry.type === 'capability') return capability.value === entry.value;
  if (entry.type === 'purpose') return purpose.value === entry.value;
  if (entry.type === 'risk') return risk.value === entry.value;
  if (entry.type === 'site') return site.value === entry.value;
  return false;
}

function applyCatalog(entry: RegistryCatalogEntry): void {
  if (entry.type === 'market') market.value = entry.value as RegistryFilters['market'];
  if (entry.type === 'siteCategory') siteCategory.value = entry.value as RegistryFilters['siteCategory'];
  if (entry.type === 'surface') surface.value = entry.value as RegistryFilters['surface'];
  if (entry.type === 'capability') capability.value = entry.value as RegistryFilters['capability'];
  if (entry.type === 'purpose') purpose.value = entry.value as RegistryFilters['purpose'];
  if (entry.type === 'risk') risk.value = entry.value as RegistryFilters['risk'];
  if (entry.type === 'site') site.value = entry.value;
}

function clearCategoryFilters(): void {
  market.value = 'all';
  siteCategory.value = 'all';
  surface.value = 'all';
  mode.value = 'all';
  purpose.value = 'all';
  capability.value = 'all';
  risk.value = 'all';
  supportsChartsOnly.value = false;
}

function clearAllFilters(): void {
  search.value = '';
  site.value = 'all';
  clearCategoryFilters();
}

function openWorkbench(command: string, args: Record<string, unknown> = {}): void {
  store.setSelectedCommand(command);
  store.stageWorkbenchArgs(args);
  void router.push({
    name: 'workbench',
    query: {
      command,
      ...(store.advancedMode ? { advanced: '1' } : {}),
    },
  });
}

function openOps(): void {
  void router.push({ name: 'ops' });
}

function availabilityTagType(tone: AvailabilitySummary['tone']): 'success' | 'info' | 'warning' | 'error' | 'default' {
  if (tone === 'success') return 'success';
  if (tone === 'info') return 'info';
  if (tone === 'warning') return 'warning';
  if (tone === 'error') return 'error';
  return 'default';
}

function siteAvailabilitySummary(siteName: string): AvailabilitySummary | null {
  const displaySite = store.getSiteDisplayName(siteName, locale.value);
  if (store.isSiteAccessLoading(siteName) && !store.getSiteAccess(siteName)) {
    return {
      tone: 'info',
      label: t('readiness.siteState.checking', { site: displaySite }),
      detail: t('readiness.siteDetail.checking', { site: displaySite }),
      action: null,
    };
  }
  return buildSiteAccessSummary({
    siteAccess: store.getSiteAccess(siteName),
    siteLabel: displaySite,
    t,
  });
}

function commandAvailabilitySummary(command: StudioCommandItem): AvailabilitySummary | null {
  const displaySite = store.getSiteDisplayName(command.site, locale.value);
  if (command.meta.mode === 'browser' && store.isSiteAccessLoading(command.site) && !store.getSiteAccess(command.site)) {
    return {
      tone: 'info',
      label: t('readiness.siteState.checking', { site: displaySite }),
      detail: t('readiness.siteDetail.checking', { site: displaySite }),
      action: null,
    };
  }
  return buildAvailabilitySummary(buildCommandReadiness({
    command,
    doctor: store.doctor,
    siteAccess: store.getSiteAccess(command.site),
    plugins: store.plugins,
    externalClis: store.externalClis,
    registryCommands: store.registry.commands,
    siteLabel: displaySite,
    formatCommandLabel: (entry) => store.getCommandDisplayDesc(entry.command, entry.description || entry.name, locale.value),
    t,
  }));
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

function siteStatusTone(siteName: string): StatusToneState {
  return buildStatusTone({
    availability: siteAvailabilitySummary(siteName),
    risk: 'safe',
    t,
  });
}

function commandStatusTone(command: StudioCommandItem): StatusToneState {
  return buildStatusTone({
    availability: commandAvailabilitySummary(command),
    risk: command.meta.risk,
    t,
  });
}

function statusAriaLabel(status: StatusToneState, subject: string): string {
  return buildStatusAriaLabel(status, subject);
}

async function handleAvailabilityAction(action: CommandReadinessAction, siteName: string): Promise<void> {
  try {
    if (action.type === 'run-doctor') {
      await store.runDoctor({ live: true, sessions: true });
      await store.ensureSiteAccess([siteName], true);
      message.success(t('ops.doctorCompleted'));
      return;
    }

    if (action.type === 'open-ops') {
      openOps();
      return;
    }

    if (action.type === 'open-command' && action.command) {
      openWorkbench(action.command, action.args ?? {});
      await store.ensureSiteAccess([siteName], true);
      return;
    }

    if (action.type === 'run-command' && action.command) {
      await executeCommand(action.command, action.args ?? {});
      await store.refreshHistory();
      const nextCommand = store.registry.commands.find((entry) => entry.command === action.command);
      await store.ensureSiteAccess([siteName, nextCommand?.site || ''].filter(Boolean), true);
      message.success(t('readiness.actionCompleted'));
      return;
    }

    if (action.type === 'install-external' && action.externalName) {
      await requestInstallExternalCli(action.externalName);
      await store.refreshOpsInventory();
      await store.ensureSiteAccess([siteName], true);
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

function riskTone(riskValue: RegistryFilters['risk']): 'default' | 'success' | 'warning' | 'error' {
  if (riskValue === 'safe') return 'success';
  if (riskValue === 'confirm') return 'warning';
  return 'error';
}

function riskLabel(riskValue: RegistryFilters['risk']): string {
  if (riskValue === 'safe') return t('registry.safe');
  if (riskValue === 'confirm') return t('registry.confirm');
  return t('registry.dangerous');
}

function commandGroupLabel(group: CommandSection): string {
  if (group.axis === 'site') return store.getSiteDisplayName(group.key, locale.value);
  if (group.axis === 'market') return marketLabel(group.key as RegistryFilters['market']);
  if (group.axis === 'siteCategory') return siteCategoryLabel(group.key as RegistryFilters['siteCategory']);
  if (group.axis === 'capability') return capabilityLabel(group.key as RegistryFilters['capability']);
  if (group.axis === 'purpose') return purposeLabel(group.key as RegistryFilters['purpose']);
  return riskLabel(group.key as RegistryFilters['risk']);
}

function hasCatalogEntries(section: RegistryCatalogSection): boolean {
  return section.entries.some((entry) => entry.count > 0);
}

async function toggleCommandFavorite(command: StudioCommandItem): Promise<void> {
  const nextFavorite = !store.favoriteCommandIds.has(command.command);
  await store.toggleFavorite('command', command.command, nextFavorite);
  const commandLabel = store.getCommandDisplayDesc(command.command, command.description || command.name, locale.value);
  message.success(nextFavorite ? t('registry.favoriteSuccess', { value: commandLabel }) : t('registry.unfavoriteSuccess', { value: commandLabel }));
}

async function saveView(input: { name: string; description: string }): Promise<void> {
  await store.savePreset({
    kind: 'registry',
    name: input.name,
    description: input.description || null,
    state: buildRegistryPresetState(currentFilters.value),
  });
  message.success(t('registry.savePresetSuccess', { value: input.name }));
}

function applyRegistryPreset(preset: StudioPresetEntry): void {
  const state = readRegistryPresetState(preset.state);
  store.setAdvancedMode(state.advancedMode);
  search.value = state.search;
  site.value = state.site;
  market.value = state.market;
  siteCategory.value = state.siteCategory;
  surface.value = state.surface;
  mode.value = state.mode;
  capability.value = state.capability;
  purpose.value = state.purpose;
  risk.value = state.risk;
  supportsChartsOnly.value = state.supportsChartsOnly;
  message.success(t('registry.applyPresetSuccess', { value: preset.name }));
}

async function removeRegistryPreset(preset: StudioPresetEntry): Promise<void> {
  const proceed = window.confirm(t('registry.deletePresetConfirm', { value: preset.name }));
  if (!proceed) return;
  await store.deletePreset(preset.id);
  message.success(t('registry.deletePresetSuccess', { value: preset.name }));
}

watch(() => route.query, (query) => {
  const nextFilters = parseRegistryQuery(query);

  search.value = nextFilters.search;
  site.value = nextFilters.site;
  market.value = nextFilters.market;
  siteCategory.value = nextFilters.siteCategory;
  surface.value = nextFilters.surface;
  mode.value = nextFilters.mode;
  capability.value = nextFilters.capability;
  purpose.value = nextFilters.purpose;
  risk.value = nextFilters.risk;
  supportsChartsOnly.value = nextFilters.supportsChartsOnly;

  if (Object.prototype.hasOwnProperty.call(query, 'advanced')) {
    store.setAdvancedMode(nextFilters.advancedMode);
  }
});

watch(currentFilters, (nextFilters) => {
  const nextQuery = buildRegistryQuery(nextFilters);
  const currentQuery = JSON.stringify(route.query);
  const targetQuery = JSON.stringify(nextQuery);
  if (currentQuery !== targetQuery) {
    void router.replace({ query: nextQuery });
  }
}, { deep: true });
</script>

<template>
  <section class="page-grid registry-page">
    <div class="page-inline-header page-inline-header--compact registry-page__header">
      <h1 class="gradient-title">{{ t('routes.registry.title') }}</h1>
      <p class="page-inline-header__desc registry-page__desc">{{ t('routes.registry.description') }}</p>
    </div>

    <n-card class="glass-card registry-header-card">
      <div class="registry-filter-shell">
        <div class="registry-filter-shell__top">
          <div class="registry-filter-shell__summary">
            {{ t('registry.summary', { count: filteredCommands.length, sites: filteredSiteGroups.length }) }}
            <template v-if="siteCategory && siteCategory !== 'all'">
              · {{ store.getCategoryLabel(siteCategory, locale) }}
            </template>
          </div>
          <div class="registry-filter-shell__actions">
            <n-tag size="small" type="info" :bordered="false">{{ t('registry.favorites', { count: favoriteCount }) }}</n-tag>
            <save-preset-button
              :button-label="t('registry.saveView')"
              :title="t('registry.saveViewTitle')"
              :description="t('registry.saveViewDescription')"
              :default-name="search ? t('registry.defaultViewNameSearch', { value: search }) : t('registry.defaultViewName')"
              :default-description="site !== 'all' ? t('registry.filteredTo', { value: store.getSiteDisplayName(site, locale) }) : ''"
              :save="saveView"
            />
            <n-button size="small" tertiary @click="catalogOpen = true">{{ t('registry.openCatalog') }}</n-button>
            <n-button size="small" quaternary @click="clearAllFilters()">{{ t('registry.resetCatalog') }}</n-button>
          </div>
        </div>

        <div class="registry-filter-shell__search">
          <n-input v-model:value="search" :placeholder="t('registry.searchPlaceholder')" clearable />
          <n-select v-model:value="site" :options="siteOptions" />
        </div>

        <div class="registry-filter-row">
          <div class="registry-filter-row__title">{{ t('registry.catalog.byCategory') }}</div>
          <div class="category-tabs registry-filter-row__chips">
            <button
              class="category-tab"
              :class="{ 'category-tab--active': siteCategory === 'all' }"
              @click="siteCategory = 'all'"
            >
              {{ t('registry.allCategories') }}
              <span class="category-tab__count">{{ store.registry.commands.length }}</span>
            </button>
            <button
              v-for="group in store.categoryGroups"
              :key="group.category"
              class="category-tab"
              :class="{ 'category-tab--active': siteCategory === group.category }"
              @click="siteCategory = group.category as any"
            >
              {{ store.getCategoryLabel(group.category, locale) }}
              <span class="category-tab__count">{{ group.commands.length }}</span>
            </button>
          </div>
        </div>

        <div class="registry-filter-row registry-filter-row--secondary">
          <div class="registry-filter-row__title">{{ t('registry.catalog.byPurpose') }}</div>
          <div class="category-tabs category-tabs--secondary registry-filter-row__chips">
            <button
              class="category-tab category-tab--sm"
              :class="{ 'category-tab--active': purpose === 'all' }"
              @click="purpose = 'all'"
            >
              {{ t('registry.purpose.all') }}
            </button>
            <button
              v-for="group in purposeGroups"
              :key="group.value"
              class="category-tab category-tab--sm"
              :class="{ 'category-tab--active': purpose === group.value }"
              @click="purpose = group.value as any"
            >
              {{ group.label }}
              <span class="category-tab__count">{{ group.count }}</span>
            </button>
          </div>
        </div>
      </div>
    </n-card>

    <n-card class="glass-card registry-presets-card">
      <div class="registry-presets-card__head">
        <strong>{{ t('registry.savedViews') }}</strong>
        <span class="registry-presets-card__count">{{ store.registryPresets.length }}</span>
      </div>
      <preset-shelf
        :presets="store.registryPresets"
        :empty-description="t('registry.savedViewsEmpty')"
        @apply="applyRegistryPreset"
        @remove="removeRegistryPreset"
      />
    </n-card>

    <n-drawer v-model:show="catalogOpen" :width="380" :show-mask="false">
      <n-drawer-content :title="t('registry.catalog.title')">
        <div class="panel-note">{{ t('registry.catalog.subtitle') }}</div>
        <div class="catalog-list">
          <section v-for="section in catalogSections" :key="section.axis" class="catalog-section">
            <div class="catalog-title">{{ section.title }}</div>
            <div v-if="!hasCatalogEntries(section)" class="panel-note catalog-empty">{{ t('registry.catalog.empty') }}</div>
            <div v-else class="catalog-grid">
              <button
                v-for="entry in section.entries"
                :key="`${section.axis}-${entry.value}`"
                :class="['catalog-chip', { 'catalog-chip--active': isCatalogSelected(entry as RegistryCatalogEntry) }]"
                :disabled="entry.count === 0 && section.axis !== 'site' && section.axis !== 'market' && section.axis !== 'siteCategory'"
                @click="applyCatalog(entry as RegistryCatalogEntry)"
              >
                <span>{{ entry.label }}</span>
                <small>{{ entry.count }}</small>
              </button>
            </div>
          </section>
        </div>
        <div class="card-actions card-actions--between">
          <n-button size="small" tertiary @click="clearCategoryFilters()">{{ t('registry.clearCategoryFilters') }}</n-button>
          <n-button size="small" type="primary" @click="catalogOpen = false">{{ t('common.close') }}</n-button>
        </div>
      </n-drawer-content>
    </n-drawer>

    <div v-if="filteredSiteGroups.length" class="site-card-grid">
      <div
        v-for="group in filteredSiteGroups"
        :key="group.site"
        class="site-card"
        :class="statusSurfaceClasses(siteStatusTone(group.site), { prominent: true })"
        :aria-label="statusAriaLabel(siteStatusTone(group.site), store.getSiteDisplayName(group.site, locale))"
      >
        <div class="site-card__header">
          <div class="site-card__icon">{{ store.getCategoryIcon(group.category) }}</div>
          <div class="site-card__info">
            <n-tooltip placement="top" trigger="hover" :delay="120">
              <template #trigger>
                <div class="site-card__name">
                  {{ store.getSiteDisplayName(group.site, locale) }}
                </div>
              </template>
              <div class="status-surface__tooltip">
                <strong>{{ siteStatusTone(group.site).label }}</strong>
                <p v-if="siteStatusTone(group.site).detail">{{ siteStatusTone(group.site).detail }}</p>
              </div>
            </n-tooltip>
            <div class="site-card__meta">
              <span class="chip chip--small">{{ store.getCategoryLabel(group.category, locale) }}</span>
              <span class="site-card__count">{{ t('registry.cmdCount', { count: group.count }) }}</span>
              <span v-if="!group.domestic" class="site-card__intl-tag">{{ t('registry.market.international') }}</span>
            </div>
          </div>
          <n-button
            v-if="siteAvailabilitySummary(group.site)?.action"
            size="tiny"
            tertiary
            class="site-card__action"
            @click="handleAvailabilityAction(siteAvailabilitySummary(group.site)?.action as CommandReadinessAction, group.site)"
          >
            {{ siteAvailabilitySummary(group.site)?.action?.label }}
          </n-button>
        </div>
        <div class="site-card__commands">
          <n-tooltip
            v-for="cmd in group.commands.slice(0, 5)"
            :key="cmd.command"
            placement="top"
            trigger="hover"
            :delay="120"
          >
            <template #trigger>
              <button
                class="site-card__cmd site-card__cmd--desc"
                :class="statusSurfaceClasses(commandStatusTone(cmd))"
                :aria-label="statusAriaLabel(commandStatusTone(cmd), store.getCommandDisplayDesc(cmd.command, cmd.description || cmd.name, locale))"
                @click="openWorkbench(cmd.command)"
              >
                <span class="site-card__cmd-title">
                  <span>{{ store.getCommandDisplayDesc(cmd.command, cmd.description || cmd.name, locale) }}</span>
                </span>
              </button>
            </template>
            <div class="status-surface__tooltip">
              <strong>{{ commandStatusTone(cmd).label }}</strong>
              <p v-if="commandStatusTone(cmd).detail">{{ commandStatusTone(cmd).detail }}</p>
            </div>
          </n-tooltip>
          <button
            v-if="group.count > 5"
            class="site-card__cmd site-card__cmd--more"
            @click="expandSite(group.site)"
          >
            {{ t('registry.more', { count: group.count - 5 }) }}
          </button>
        </div>
      </div>
    </div>
    <n-empty v-else :description="t('registry.noMatches')" />

    <!-- 站点展开 Drawer -->
    <n-drawer v-model:show="expandedSiteOpen" :width="520" :show-mask="false">
      <n-drawer-content v-if="expandedSite" :title="store.getSiteDisplayName(expandedSite.site, locale)">
        <div class="registry-site-drawer">
          <div
            class="registry-site-drawer__hero"
            :class="statusSurfaceClasses(siteStatusTone(expandedSite.site), { prominent: true })"
            :aria-label="statusAriaLabel(siteStatusTone(expandedSite.site), store.getSiteDisplayName(expandedSite.site, locale))"
          >
            <div class="registry-site-drawer__hero-main">
              <div class="registry-site-drawer__icon">{{ store.getCategoryIcon(expandedSite.category) }}</div>
              <div class="registry-site-drawer__hero-copy">
                <div class="registry-site-drawer__eyebrow">{{ t('registry.siteOverview') }}</div>
                <div class="registry-site-drawer__chips">
                  <span class="chip chip--small">{{ store.getCategoryLabel(expandedSite.category, locale) }}</span>
                  <span class="chip chip--small">{{ t('registry.cmdCount', { count: expandedSite.count }) }}</span>
                  <span v-if="!expandedSite.domestic" class="site-card__intl-tag registry-site-drawer__intl">{{ t('registry.market.international') }}</span>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="siteAvailabilitySummary(expandedSite.site)"
            class="availability-panel registry-site-drawer__availability"
            :class="statusSurfaceClasses(siteStatusTone(expandedSite.site), { prominent: true })"
          >
            <div class="availability-panel__copy">
              <span class="availability-panel__label">{{ siteAvailabilitySummary(expandedSite.site)?.label }}</span>
              <span v-if="siteAvailabilitySummary(expandedSite.site)?.detail" class="availability-panel__detail">
                {{ siteAvailabilitySummary(expandedSite.site)?.detail }}
              </span>
            </div>
            <n-button
              v-if="siteAvailabilitySummary(expandedSite.site)?.action"
              size="small"
              tertiary
              @click="handleAvailabilityAction(siteAvailabilitySummary(expandedSite.site)?.action as CommandReadinessAction, expandedSite.site)"
            >
              {{ siteAvailabilitySummary(expandedSite.site)?.action?.label }}
            </n-button>
          </div>
          <div class="registry-site-drawer__list-head">
            <div class="registry-site-drawer__list-copy">
              <strong>{{ t('registry.siteCommands') }}</strong>
              <span>{{ t('registry.commandCount', { count: expandedSite.count }) }}</span>
            </div>
          </div>
          <div class="stack-list registry-site-drawer__list">
            <n-tooltip
              v-for="cmd in expandedSite.commands"
              :key="cmd.command"
              placement="top"
              trigger="hover"
              :delay="120"
            >
              <template #trigger>
                <div
                  class="stack-row stack-row--dense registry-command-row"
                  :class="statusSurfaceClasses(commandStatusTone(cmd))"
                  :aria-label="statusAriaLabel(commandStatusTone(cmd), store.getCommandDisplayDesc(cmd.command, cmd.description || cmd.name, locale))"
                  @click="openWorkbench(cmd.command)"
                >
                  <div class="stack-row__content registry-command-row__content">
                    <strong>{{ store.getCommandDisplayDesc(cmd.command, cmd.description || cmd.name, locale) }}</strong>
                    <span v-if="store.advancedMode">{{ cmd.command }}</span>
                  </div>
                  <div class="stack-row__meta stack-row__meta--workbench registry-command-row__meta">
                    <n-tag v-if="store.advancedMode" size="small" :type="riskTone(cmd.meta.risk)">{{ riskLabel(cmd.meta.risk) }}</n-tag>
                    <n-button
                      v-if="commandAvailabilitySummary(cmd)?.action"
                      size="small"
                      tertiary
                      @click.stop="handleAvailabilityAction(commandAvailabilitySummary(cmd)?.action as CommandReadinessAction, cmd.site)"
                    >
                      {{ commandAvailabilitySummary(cmd)?.action?.label }}
                    </n-button>
                    <n-button size="small" type="primary" @click.stop="openWorkbench(cmd.command)">
                      {{ t('registry.openWorkbench') }}
                    </n-button>
                  </div>
                </div>
              </template>
              <div class="status-surface__tooltip">
                <strong>{{ commandStatusTone(cmd).label }}</strong>
                <p v-if="commandStatusTone(cmd).detail">{{ commandStatusTone(cmd).detail }}</p>
              </div>
            </n-tooltip>
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>
  </section>
</template>
