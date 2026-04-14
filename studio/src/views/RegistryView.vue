<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NButton, NCard, NInput, NSelect, NSwitch, NTag } from 'naive-ui';
import { filterRegistryCommands, type RegistryFilters } from '../lib/registry';
import { buildRegistryQuery, parseRegistryQuery } from '../lib/routes';
import { useStudioStore } from '../stores/studio';

const store = useStudioStore();
const router = useRouter();
const route = useRoute();

const initialFilters = parseRegistryQuery(route.query);
if (Object.prototype.hasOwnProperty.call(route.query, 'advanced')) {
  store.setAdvancedMode(initialFilters.advancedMode);
}

const search = ref(initialFilters.search);
const site = ref(initialFilters.site);
const mode = ref<RegistryFilters['mode']>(initialFilters.mode);
const capability = ref<RegistryFilters['capability']>(initialFilters.capability);
const risk = ref<RegistryFilters['risk']>(initialFilters.risk);
const supportsChartsOnly = ref(initialFilters.supportsChartsOnly);

const currentFilters = computed<RegistryFilters>(() => ({
  search: search.value,
  site: site.value,
  mode: mode.value,
  capability: capability.value,
  risk: risk.value,
  supportsChartsOnly: supportsChartsOnly.value,
  advancedMode: store.advancedMode,
}));

const filteredCommands = computed(() => filterRegistryCommands(store.registry.commands, currentFilters.value));

const siteOptions = computed(() => [
  { label: 'All sites', value: 'all' },
  ...store.registry.sites.map((item) => ({ label: `${item.site} (${item.commandCount})`, value: item.site })),
]);

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

watch(() => route.query, (query) => {
  const nextFilters = parseRegistryQuery(query);

  search.value = nextFilters.search;
  site.value = nextFilters.site;
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
        <n-select v-model:value="mode" :options="modeOptions" />
        <n-select v-model:value="capability" :options="capabilityOptions" />
        <n-select v-model:value="risk" :options="riskOptions" />
        <label class="switch-inline">
          <span>Charts only</span>
          <n-switch v-model:value="supportsChartsOnly" />
        </label>
      </div>
      <div class="panel-note">
        {{ filteredCommands.length }} commands match the current facet set across {{ store.registry.sites.length }} sites.
        <template v-if="!store.advancedMode"> Risky commands are hidden until advanced mode is enabled. </template>
      </div>
    </n-card>

    <div class="command-grid">
      <n-card v-for="command in filteredCommands" :key="command.command" class="glass-card command-card">
        <div class="command-card__header">
          <div>
            <div class="eyebrow">{{ command.site }}</div>
            <h3>{{ command.command }}</h3>
          </div>
          <n-tag size="small" :type="command.meta.risk === 'safe' ? 'success' : command.meta.risk === 'confirm' ? 'warning' : 'error'">
            {{ command.meta.risk }}
          </n-tag>
        </div>
        <p>{{ command.description || 'No description available.' }}</p>
        <div class="chip-cloud">
          <span class="chip chip--small">{{ command.meta.mode }}</span>
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
