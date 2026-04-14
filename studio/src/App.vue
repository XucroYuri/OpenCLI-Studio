<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { NAlert, NConfigProvider, NMessageProvider, NSpin, NSwitch, NTag, type GlobalThemeOverrides } from 'naive-ui';
import { useStudioStore } from './stores/studio';

const store = useStudioStore();
const route = useRoute();
const router = useRouter();

const navigation = [
  { to: '/', label: 'Overview' },
  { to: '/registry', label: 'Registry' },
  { to: '/workbench', label: 'Workbench' },
  { to: '/insights', label: 'Insights' },
];

const pageTitle = computed(() => String(route.meta.title ?? 'OpenCLI Studio'));
const pageDescription = computed(() => String(route.meta.description ?? 'Local-first control surface for the OpenCLI registry.'));
const advancedModeModel = computed({
  get: () => store.advancedMode,
  set: (value: boolean) => {
    store.setAdvancedMode(value);
    const nextQuery: LocationQueryRaw = { ...route.query };
    if (value) nextQuery.advanced = '1';
    else delete nextQuery.advanced;
    void router.replace({ query: nextQuery });
  },
});

const themeOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: '"Avenir Next", "Segoe UI Variable Text", "Trebuchet MS", sans-serif',
    primaryColor: '#f28c28',
    primaryColorHover: '#ff9e46',
    primaryColorPressed: '#d0670f',
    successColor: '#5cbf82',
    warningColor: '#f28c28',
    errorColor: '#ef5e52',
    infoColor: '#2ea7a0',
    textColorBase: '#eff3ee',
    bodyColor: '#07131f',
    cardColor: 'rgba(11, 23, 34, 0.88)',
    borderColor: 'rgba(139, 163, 173, 0.18)',
  },
  Card: {
    borderRadius: '24px',
    color: 'rgba(8, 20, 30, 0.86)',
  },
  Input: {
    color: 'rgba(13, 29, 42, 0.92)',
    borderHover: '1px solid rgba(242, 140, 40, 0.5)',
  },
  Select: {
    peers: {
      InternalSelection: {
        color: 'rgba(13, 29, 42, 0.92)',
      },
    },
  },
};

onMounted(() => {
  void store.loadShell();
});
</script>

<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <div class="app-shell">
        <aside class="app-nav">
          <div class="brand-block">
            <div class="eyebrow">OpenCLI Studio</div>
            <h1>Local-first web console for the existing CLI universe.</h1>
            <p>
              Contributor-oriented front-end surfaces for the OpenCLI registry:
              browse, execute, inspect, and promote high-value command families into dashboards.
            </p>
          </div>

          <nav class="nav-links">
            <RouterLink
              v-for="item in navigation"
              :key="item.to"
              :to="item.to"
              class="nav-link"
              :class="{ 'nav-link--active': route.path === item.to }"
            >
              {{ item.label }}
            </RouterLink>
          </nav>

          <div class="nav-status">
            <div class="nav-status__row">
              <span>Commands</span>
              <strong>{{ store.env?.commandCount ?? 0 }}</strong>
            </div>
            <div class="nav-status__row">
              <span>Browser-backed</span>
              <strong>{{ store.env?.browserCommandCount ?? 0 }}</strong>
            </div>
            <div class="nav-status__row">
              <span>Recipes</span>
              <strong>{{ store.recipes.length }}</strong>
            </div>
          </div>
        </aside>

        <div class="app-main">
          <header class="topbar">
            <div>
              <div class="eyebrow">Current surface</div>
              <h2>{{ pageTitle }}</h2>
              <p>{{ pageDescription }}</p>
            </div>
            <div class="topbar__meta">
              <label class="switch-inline topbar__switch">
                <span>Advanced mode</span>
                <n-switch v-model:value="advancedModeModel" />
              </label>
              <n-tag size="small" type="success">CLI inherited</n-tag>
              <n-tag size="small" type="info">Local execution</n-tag>
              <n-tag size="small" type="warning">Contributor preview</n-tag>
            </div>
          </header>

          <main class="page-host">
            <n-alert v-if="store.loadError" type="error" class="page-alert">
              {{ store.loadError }}
            </n-alert>
            <n-spin :show="store.initializing">
              <RouterView />
            </n-spin>
          </main>
        </div>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>
