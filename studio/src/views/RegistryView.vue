<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  NButton,
  NButtonGroup,
  NCard,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NInput,
  NSelect,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui';
import PresetShelf from '../components/PresetShelf.vue';
import SavePresetButton from '../components/SavePresetButton.vue';
import { useStudioI18n } from '../lib/i18n';
import { buildRegistryPresetState, readRegistryPresetState } from '../lib/preset-state';
import { filterRegistryCommands, inferCommandPurpose, type RegistryFilters } from '../lib/registry';
import { buildRegistryQuery, parseRegistryQuery } from '../lib/routes';
import { useStudioStore } from '../stores/studio';
import type { StudioCommandItem, StudioPresetEntry } from '../types';

const store = useStudioStore();
const router = useRouter();
const route = useRoute();
const message = useMessage();
const { t } = useStudioI18n();

const catalogOpen = ref(false);
const initialFilters = parseRegistryQuery(route.query);
if (Object.prototype.hasOwnProperty.call(route.query, 'advanced')) {
  store.setAdvancedMode(initialFilters.advancedMode);
}

const search = ref(initialFilters.search);
const site = ref(initialFilters.site);
const surface = ref<RegistryFilters['surface']>(initialFilters.surface);
const mode = ref<RegistryFilters['mode']>(initialFilters.mode);
const capability = ref<RegistryFilters['capability']>(initialFilters.capability);
const purpose = ref<RegistryFilters['purpose']>(initialFilters.purpose);
const risk = ref<RegistryFilters['risk']>(initialFilters.risk);
const supportsChartsOnly = ref(initialFilters.supportsChartsOnly);

const currentFilters = computed<RegistryFilters>(() => ({
  search: search.value,
  site: site.value,
  surface: surface.value,
  mode: mode.value,
  capability: capability.value,
  purpose: purpose.value,
  risk: risk.value,
  supportsChartsOnly: supportsChartsOnly.value,
  advancedMode: store.advancedMode,
}));

const filteredCommands = computed(() => filterRegistryCommands(store.registry.commands, currentFilters.value));
const favoriteCount = computed(() => store.favoriteCommandIds.size);

const siteOptions = computed(() => [
  { label: t('registry.allSites'), value: 'all' },
  ...store.registry.sites.map((item) => ({ label: `${item.site} (${item.commandCount})`, value: item.site })),
]);

const surfaceOptions = computed(() => [
  { label: t('registry.allSurfaces'), value: 'all' },
  { label: t('registry.builtIn'), value: 'builtin' },
  { label: t('registry.plugin'), value: 'plugin' },
  { label: t('registry.external'), value: 'external' },
]);

const modeOptions = computed(() => [
  { label: t('registry.allModes'), value: 'all' },
  { label: t('registry.public'), value: 'public' },
  { label: t('registry.browser'), value: 'browser' },
  { label: t('registry.desktop'), value: 'desktop' },
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

const riskOptions = computed(() => [
  { label: t('registry.allRisks'), value: 'all' },
  { label: t('registry.safe'), value: 'safe' },
  { label: t('registry.confirm'), value: 'confirm' },
  { label: t('registry.dangerous'), value: 'dangerous' },
]);

const siteCatalog = computed(() => [
  { label: t('registry.allSites'), value: 'all', type: 'site' as const, count: store.registry.commands.length },
  ...store.registry.sites.map((entry) => ({
    label: entry.site,
    value: entry.site,
    type: 'site' as const,
    count: entry.commandCount,
  })),
]);

const surfaceCatalog = computed(() => [
  { label: t('registry.allSurfaces'), value: 'all', type: 'surface' as const, count: store.registry.commands.length },
  ...surfaceOptions.value
    .filter((item) => item.value !== 'all')
    .map((item) => ({
      label: item.label,
      value: item.value as RegistryFilters['surface'],
      type: 'surface' as const,
      count: store.registry.commands.filter((command) => command.meta.surface === item.value).length,
    })),
]);

const capabilityCatalog = computed(() => [
  { label: t('registry.allCapabilities'), value: 'all', type: 'capability' as const, count: store.registry.commands.length },
  ...capabilityOptions.value
    .filter((item) => item.value !== 'all')
    .map((item) => ({
      label: item.label,
      value: item.value as RegistryFilters['capability'],
      type: 'capability' as const,
      count: store.registry.commands.filter((command) => command.meta.capability === item.value).length,
    }))
    .filter((entry) => entry.count > 0),
]);

const purposeCatalog = computed(() => [
  { label: t('registry.purpose.all'), value: 'all', type: 'purpose' as const, count: store.registry.commands.length },
  ...purposeOptions.value
    .filter((item) => item.value !== 'all')
    .map((item) => ({
      label: item.label,
      value: item.value as RegistryFilters['purpose'],
      type: 'purpose' as const,
      count: store.registry.commands.filter((command) => inferCommandPurpose(command) === item.value).length,
    }))
    .filter((entry) => entry.count > 0),
]);

const riskCatalog = computed(() => [
  { label: t('registry.allRisks'), value: 'all', type: 'risk' as const, count: store.registry.commands.length },
  { label: t('registry.safe'), value: 'safe', type: 'risk' as const, count: store.registry.commands.filter((command) => command.meta.risk === 'safe').length },
  { label: t('registry.confirm'), value: 'confirm', type: 'risk' as const, count: store.registry.commands.filter((command) => command.meta.risk === 'confirm').length },
  { label: t('registry.dangerous'), value: 'dangerous', type: 'risk' as const, count: store.registry.commands.filter((command) => command.meta.risk === 'dangerous').length },
]);

const hasCategoryFilter = computed(() =>
  site.value !== 'all'
  || surface.value !== 'all'
  || mode.value !== 'all'
  || purpose.value !== 'all'
  || capability.value !== 'all'
  || risk.value !== 'all'
  || supportsChartsOnly.value,
);

type RegistryCatalogAxis = 'site' | 'surface' | 'capability' | 'purpose' | 'risk';
type RegistryCatalogEntry = {
  label: string;
  value: string;
  type: RegistryCatalogAxis;
  count?: number;
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

const catalogSections = computed<RegistryCatalogSection[]>(() => [
  {
    axis: 'site',
    title: t('registry.catalog.bySite'),
    entries: siteCatalog.value,
  },
  {
    axis: 'surface',
    title: t('registry.catalog.bySurface'),
    entries: surfaceCatalog.value,
  },
  {
    axis: 'capability',
    title: t('registry.catalog.byCapability'),
    entries: capabilityCatalog.value,
  },
  {
    axis: 'purpose',
    title: t('registry.catalog.byPurpose'),
    entries: purposeCatalog.value,
  },
  {
    axis: 'risk',
    title: t('registry.catalog.byRisk'),
    entries: riskCatalog.value,
  },
]);

const activeGroupingAxis = computed<RegistryCatalogAxis>(() => {
  if (site.value !== 'all') return 'site';
  if (surface.value !== 'all') return 'surface';
  if (capability.value !== 'all') return 'capability';
  if (purpose.value !== 'all') return 'purpose';
  if (risk.value !== 'all') return 'risk';
  return 'site';
});

const commandSections = computed<CommandSection[]>(() => {
  const axis = activeGroupingAxis.value;
  const groups = new Map<string, StudioCommandItem[]>();

  for (const command of filteredCommands.value) {
    const key = axis === 'site'
      ? command.site
      : axis === 'surface'
        ? command.meta.surface
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
    const titleCompare = commandGroupLabel(left).localeCompare(commandGroupLabel(right));
    return right.commands.length - left.commands.length || titleCompare;
  });
});

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
  if (entry.type === 'site') return site.value === entry.value;
  if (entry.type === 'surface') return surface.value === entry.value;
  if (entry.type === 'capability') return capability.value === entry.value;
  if (entry.type === 'purpose') return purpose.value === entry.value;
  if (entry.type === 'risk') return risk.value === entry.value;
  return false;
}

function applyCatalog(entry: RegistryCatalogEntry): void {
  if (entry.type === 'site') site.value = entry.value;
  if (entry.type === 'surface') surface.value = entry.value as RegistryFilters['surface'];
  if (entry.type === 'capability') capability.value = entry.value as RegistryFilters['capability'];
  if (entry.type === 'purpose') purpose.value = entry.value as RegistryFilters['purpose'];
  if (entry.type === 'risk') risk.value = entry.value as RegistryFilters['risk'];
  catalogOpen.value = false;
}

function clearAllFilters(): void {
  site.value = 'all';
  surface.value = 'all';
  mode.value = 'all';
  purpose.value = 'all';
  capability.value = 'all';
  risk.value = 'all';
  supportsChartsOnly.value = false;
}

function openWorkbench(command: string): void {
  store.setSelectedCommand(command);
  void router.push({
    name: 'workbench',
    query: {
      command,
      ...(store.advancedMode ? { advanced: '1' } : {}),
    },
  });
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
  if (group.axis === 'site') return group.key;
  if (group.axis === 'surface') return surfaceLabel(group.key as RegistryFilters['surface']);
  if (group.axis === 'capability') return capabilityLabel(group.key as RegistryFilters['capability']);
  if (group.axis === 'purpose') return purposeLabel(group.key as RegistryFilters['purpose']);
  return riskLabel(group.key as RegistryFilters['risk']);
}

async function toggleCommandFavorite(command: StudioCommandItem): Promise<void> {
  const nextFavorite = !store.favoriteCommandIds.has(command.command);
  await store.toggleFavorite('command', command.command, nextFavorite);
  message.success(nextFavorite ? t('registry.favoriteSuccess', { value: command.command }) : t('registry.unfavoriteSuccess', { value: command.command }));
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
  <section class="page-grid">
    <n-card class="glass-card">
      <div class="filter-bar">
        <n-input v-model:value="search" :placeholder="t('registry.searchPlaceholder')" clearable />
        <n-select v-model:value="site" :options="siteOptions" />
        <n-select v-model:value="surface" :options="surfaceOptions" />
        <n-select v-model:value="mode" :options="modeOptions" />
        <n-select v-model:value="purpose" :options="purposeOptions" />
        <n-select v-model:value="capability" :options="capabilityOptions" />
        <n-select v-model:value="risk" :options="riskOptions" />
        <label class="switch-inline filter-bar__switch">
          <span>{{ t('registry.chartsOnly') }}</span>
          <n-switch v-model:value="supportsChartsOnly" />
        </label>
        <div class="filter-bar__buttons">
          <n-button size="small" @click="catalogOpen = true">{{ t('registry.openCatalog') }}</n-button>
            <n-button size="small" tertiary @click="clearAllFilters()">{{ t('registry.resetCatalog') }}</n-button>
          </div>
        </div>

      <n-drawer v-model:show="catalogOpen" :width="340" :show-mask="false">
        <n-drawer-content :title="t('registry.catalog.title')">
          <div class="panel-note">{{ t('registry.catalog.subtitle') }}</div>

          <div class="catalog-list">
            <section v-for="section in catalogSections" :key="section.axis" class="catalog-section">
              <div class="catalog-title">{{ section.title }}</div>
              <div class="catalog-grid">
                <button
                  v-for="entry in section.entries"
                  :key="`${section.axis}-${entry.value}`"
                  :class="['catalog-chip', { 'catalog-chip--active': isCatalogSelected(entry as RegistryCatalogEntry) }]"
                  :disabled="(entry.count ?? 0) === 0 && section.axis !== 'site'"
                  @click="applyCatalog(entry as RegistryCatalogEntry)"
                >
                  <span>{{ entry.label }}</span>
                  <small>{{ entry.count ?? 0 }}</small>
                </button>
              </div>
            </section>
          </div>

          <div class="card-actions">
            <n-button size="small" secondary @click="clearAllFilters()">{{ t('registry.clearFilter') }}</n-button>
            <n-button size="small" tertiary @click="catalogOpen = false">{{ t('common.cancel') }}</n-button>
          </div>
        </n-drawer-content>
      </n-drawer>

      <div class="panel-toolbar">
        <div class="panel-note">
          {{ t('registry.summary', { count: filteredCommands.length, sites: commandSections.length }) }}
          <template v-if="hasCategoryFilter"> · {{ t('registry.activeCategory') }} </template>
          <template v-if="!store.advancedMode"> {{ t('registry.hiddenRisk') }} </template>
        </div>
        <n-button-group class="card-actions">
          <n-tag size="small" type="info">{{ t('registry.favorites', { count: favoriteCount }) }}</n-tag>
          <save-preset-button
            :button-label="t('registry.saveView')"
            :title="t('registry.saveViewTitle')"
            :description="t('registry.saveViewDescription')"
            :default-name="search ? t('registry.defaultViewNameSearch', { value: search }) : t('registry.defaultViewName')"
            :default-description="site !== 'all' ? t('registry.filteredTo', { value: site }) : ''"
            :save="saveView"
          />
        </n-button-group>
      </div>
    </n-card>

    <n-card :title="t('registry.savedViews')" class="glass-card">
      <preset-shelf
        :presets="store.registryPresets"
        :empty-description="t('registry.savedViewsEmpty')"
        @apply="applyRegistryPreset"
        @remove="removeRegistryPreset"
      />
    </n-card>

    <div v-if="commandSections.length" class="command-site-grid">
      <section v-for="group in commandSections" :key="`${group.axis}-${group.key}`" class="command-site-group">
        <div class="command-site-group__head">
          <strong>{{ commandGroupLabel(group) }}</strong>
          <n-tag size="small" type="info">{{ t('registry.commandCount', { count: group.commands.length }) }}</n-tag>
        </div>
        <div class="command-grid">
          <n-card v-for="command in group.commands" :key="command.command" class="glass-card command-card">
            <div class="command-card__header">
              <div>
                <div class="eyebrow">{{ command.site }}</div>
                <h3>{{ command.command }}</h3>
              </div>
              <div class="command-card__header-meta">
                <n-button size="small" quaternary @click="toggleCommandFavorite(command)">
                  {{ store.favoriteCommandIds.has(command.command) ? t('registry.favorited') : t('registry.favorite') }}
                </n-button>
                <n-tag size="small" :type="riskTone(command.meta.risk)">{{ riskLabel(command.meta.risk) }}</n-tag>
              </div>
            </div>
            <p>{{ command.description || t('common.noDescription') }}</p>
            <div class="chip-cloud">
              <span class="chip chip--small">{{ modeLabel(command.meta.mode) }}</span>
              <span class="chip chip--small">{{ surfaceLabel(command.meta.surface) }}</span>
              <span class="chip chip--small">{{ capabilityLabel(command.meta.capability) }}</span>
              <span class="chip chip--small">{{ command.strategy }}</span>
              <span v-if="command.meta.uiHints.supportsCharts" class="chip chip--small">{{ t('registry.chartable') }}</span>
              <span v-if="command.meta.uiHints.supportsTimeSeries" class="chip chip--small">{{ t('registry.timeSeries') }}</span>
              <span class="chip chip--small">{{ purposeLabel(inferCommandPurpose(command)) }}</span>
            </div>
            <div class="command-card__footer">
              <span>{{ t('registry.args', { count: command.args.length }) }}</span>
              <div class="card-actions">
                <n-button tertiary type="primary" @click="openWorkbench(command.command)">
                  {{ t('registry.openWorkbench') }}
                </n-button>
              </div>
            </div>
          </n-card>
        </div>
      </section>
    </div>
    <n-empty v-else :description="t('registry.noMatches')" />
  </section>
</template>
