<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NButton, NCard, NInput, NSelect, NSwitch, NTag, useMessage } from 'naive-ui';
import PresetShelf from '../components/PresetShelf.vue';
import SavePresetButton from '../components/SavePresetButton.vue';
import { useStudioI18n } from '../lib/i18n';
import { buildRegistryPresetState, readRegistryPresetState } from '../lib/preset-state';
import { filterRegistryCommands, type RegistryFilters } from '../lib/registry';
import { buildRegistryQuery, parseRegistryQuery } from '../lib/routes';
import { useStudioStore } from '../stores/studio';
import type { StudioCommandItem, StudioPresetEntry } from '../types';

const store = useStudioStore();
const router = useRouter();
const route = useRoute();
const message = useMessage();
const { t } = useStudioI18n();

const initialFilters = parseRegistryQuery(route.query);
if (Object.prototype.hasOwnProperty.call(route.query, 'advanced')) {
  store.setAdvancedMode(initialFilters.advancedMode);
}

const search = ref(initialFilters.search);
const site = ref(initialFilters.site);
const surface = ref<RegistryFilters['surface']>(initialFilters.surface);
const mode = ref<RegistryFilters['mode']>(initialFilters.mode);
const capability = ref<RegistryFilters['capability']>(initialFilters.capability);
const risk = ref<RegistryFilters['risk']>(initialFilters.risk);
const supportsChartsOnly = ref(initialFilters.supportsChartsOnly);

const currentFilters = computed<RegistryFilters>(() => ({
  search: search.value,
  site: site.value,
  surface: surface.value,
  mode: mode.value,
  capability: capability.value,
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

const riskOptions = computed(() => [
  { label: t('registry.allRisks'), value: 'all' },
  { label: t('registry.safe'), value: 'safe' },
  { label: t('registry.confirm'), value: 'confirm' },
  { label: t('registry.dangerous'), value: 'dangerous' },
]);

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
        <n-select v-model:value="capability" :options="capabilityOptions" />
        <n-select v-model:value="risk" :options="riskOptions" />
        <label class="switch-inline">
          <span>{{ t('registry.chartsOnly') }}</span>
          <n-switch v-model:value="supportsChartsOnly" />
        </label>
      </div>
      <div class="panel-toolbar">
        <div class="panel-note">
          {{ t('registry.summary', { count: filteredCommands.length, sites: store.registry.sites.length }) }}
          <template v-if="!store.advancedMode"> {{ t('registry.hiddenRisk') }} </template>
        </div>
        <div class="card-actions">
          <n-tag size="small" type="info">{{ t('registry.favorites', { count: favoriteCount }) }}</n-tag>
          <save-preset-button
            :button-label="t('registry.saveView')"
            :title="t('registry.saveViewTitle')"
            :description="t('registry.saveViewDescription')"
            :default-name="search ? t('registry.defaultViewNameSearch', { value: search }) : t('registry.defaultViewName')"
            :default-description="site !== 'all' ? t('registry.filteredTo', { value: site }) : ''"
            :save="saveView"
          />
        </div>
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

    <div class="command-grid">
      <n-card v-for="command in filteredCommands" :key="command.command" class="glass-card command-card">
        <div class="command-card__header">
          <div>
            <div class="eyebrow">{{ command.site }}</div>
            <h3>{{ command.command }}</h3>
          </div>
          <div class="command-card__header-meta">
            <n-button size="small" quaternary @click="toggleCommandFavorite(command)">
              {{ store.favoriteCommandIds.has(command.command) ? t('registry.favorited') : t('registry.favorite') }}
            </n-button>
            <n-tag size="small" :type="command.meta.risk === 'safe' ? 'success' : command.meta.risk === 'confirm' ? 'warning' : 'error'">
              {{ command.meta.risk }}
            </n-tag>
          </div>
        </div>
        <p>{{ command.description || t('common.noDescription') }}</p>
        <div class="chip-cloud">
          <span class="chip chip--small">{{ command.meta.mode }}</span>
          <span class="chip chip--small">{{ command.meta.surface }}</span>
          <span class="chip chip--small">{{ command.meta.capability }}</span>
          <span class="chip chip--small">{{ command.strategy }}</span>
          <span v-if="command.meta.uiHints.supportsCharts" class="chip chip--small">{{ t('registry.chartable') }}</span>
          <span v-if="command.meta.uiHints.supportsTimeSeries" class="chip chip--small">{{ t('registry.timeSeries') }}</span>
        </div>
        <div class="command-card__footer">
          <span>{{ t('registry.args', { count: command.args.length }) }}</span>
          <n-button tertiary type="primary" @click="openWorkbench(command.command)">{{ t('registry.openWorkbench') }}</n-button>
        </div>
      </n-card>
    </div>
  </section>
</template>
