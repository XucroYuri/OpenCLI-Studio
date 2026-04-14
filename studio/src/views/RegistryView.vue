<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NButton, NCard, NInput, NSelect, NSwitch, NTag, useMessage } from 'naive-ui';
import PresetShelf from '../components/PresetShelf.vue';
import SavePresetButton from '../components/SavePresetButton.vue';
import { buildRegistryPresetState, readRegistryPresetState } from '../lib/preset-state';
import { filterRegistryCommands, type RegistryFilters } from '../lib/registry';
import { buildRegistryQuery, parseRegistryQuery } from '../lib/routes';
import { useStudioStore } from '../stores/studio';
import type { StudioCommandItem, StudioPresetEntry } from '../types';

const store = useStudioStore();
const router = useRouter();
const route = useRoute();
const message = useMessage();

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
  { label: 'All sites', value: 'all' },
  ...store.registry.sites.map((item) => ({ label: `${item.site} (${item.commandCount})`, value: item.site })),
]);

const surfaceOptions = [
  { label: 'All surfaces', value: 'all' },
  { label: 'Built-in', value: 'builtin' },
  { label: 'Plugin', value: 'plugin' },
  { label: 'External', value: 'external' },
];

const modeOptions = [
  { label: 'All modes', value: 'all' },
  { label: 'Public', value: 'public' },
  { label: 'Browser', value: 'browser' },
  { label: 'Desktop', value: 'desktop' },
  { label: 'External', value: 'external' },
];

const capabilityOptions = [
  { label: 'All capabilities', value: 'all' },
  { label: 'Discovery', value: 'discovery' },
  { label: 'Search', value: 'search' },
  { label: 'Detail', value: 'detail' },
  { label: 'Account', value: 'account' },
  { label: 'Action', value: 'action' },
  { label: 'Asset', value: 'asset' },
  { label: 'Tooling', value: 'tooling' },
  { label: 'Other', value: 'other' },
];

const riskOptions = [
  { label: 'All risks', value: 'all' },
  { label: 'Safe', value: 'safe' },
  { label: 'Confirm', value: 'confirm' },
  { label: 'Dangerous', value: 'dangerous' },
];

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
  message.success(nextFavorite ? `Favorited ${command.command}` : `Removed ${command.command} from favorites`);
}

async function saveView(input: { name: string; description: string }): Promise<void> {
  await store.savePreset({
    kind: 'registry',
    name: input.name,
    description: input.description || null,
    state: buildRegistryPresetState(currentFilters.value),
  });
  message.success(`Saved registry preset "${input.name}"`);
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
  message.success(`Applied preset "${preset.name}"`);
}

async function removeRegistryPreset(preset: StudioPresetEntry): Promise<void> {
  const proceed = window.confirm(`Delete preset "${preset.name}"?`);
  if (!proceed) return;
  await store.deletePreset(preset.id);
  message.success(`Deleted preset "${preset.name}"`);
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
        <n-input v-model:value="search" placeholder="Search by command, site, or description" clearable />
        <n-select v-model:value="site" :options="siteOptions" />
        <n-select v-model:value="surface" :options="surfaceOptions" />
        <n-select v-model:value="mode" :options="modeOptions" />
        <n-select v-model:value="capability" :options="capabilityOptions" />
        <n-select v-model:value="risk" :options="riskOptions" />
        <label class="switch-inline">
          <span>Charts only</span>
          <n-switch v-model:value="supportsChartsOnly" />
        </label>
      </div>
      <div class="panel-toolbar">
        <div class="panel-note">
          {{ filteredCommands.length }} commands match the current facet set across {{ store.registry.sites.length }} sites.
          <template v-if="!store.advancedMode"> Risky commands are hidden until advanced mode is enabled. </template>
        </div>
        <div class="card-actions">
          <n-tag size="small" type="info">Favorites {{ favoriteCount }}</n-tag>
          <save-preset-button
            button-label="Save View"
            title="Save Registry View"
            description="Persist the current filter combination so you can reopen this slice of the registry later."
            :default-name="search ? `Registry ${search}` : 'Registry View'"
            :default-description="site !== 'all' ? `Filtered to ${site}` : ''"
            :save="saveView"
          />
        </div>
      </div>
    </n-card>

    <n-card title="Saved Views" class="glass-card">
      <preset-shelf
        :presets="store.registryPresets"
        empty-description="Save a Registry filter combination to make recurring investigations one click away."
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
              {{ store.favoriteCommandIds.has(command.command) ? 'Favorited' : 'Favorite' }}
            </n-button>
            <n-tag size="small" :type="command.meta.risk === 'safe' ? 'success' : command.meta.risk === 'confirm' ? 'warning' : 'error'">
              {{ command.meta.risk }}
            </n-tag>
          </div>
        </div>
        <p>{{ command.description || 'No description available.' }}</p>
        <div class="chip-cloud">
          <span class="chip chip--small">{{ command.meta.mode }}</span>
          <span class="chip chip--small">{{ command.meta.surface }}</span>
          <span class="chip chip--small">{{ command.meta.capability }}</span>
          <span class="chip chip--small">{{ command.strategy }}</span>
          <span v-if="command.meta.uiHints.supportsCharts" class="chip chip--small">chartable</span>
          <span v-if="command.meta.uiHints.supportsTimeSeries" class="chip chip--small">time-series</span>
        </div>
        <div class="command-card__footer">
          <span>{{ command.args.length }} args</span>
          <n-button tertiary type="primary" @click="openWorkbench(command.command)">Open in Workbench</n-button>
        </div>
      </n-card>
    </div>
  </section>
</template>
