<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { NAlert, NButton, NButtonGroup, NConfigProvider, NMessageProvider, NSpin, NSwitch, NTag, type GlobalThemeOverrides } from 'naive-ui';
import { useStudioI18n } from './lib/i18n';
import { useStudioStore } from './stores/studio';

const store = useStudioStore();
const route = useRoute();
const router = useRouter();
const { locale, setLocale, t } = useStudioI18n();

const navigation = computed(() => [
  { to: '/', label: t('app.nav.overview'), short: 'O1' },
  { to: '/registry', label: t('app.nav.registry'), short: 'R2' },
  { to: '/workbench', label: t('app.nav.workbench'), short: 'W3' },
  { to: '/insights', label: t('app.nav.insights'), short: 'I4' },
  { to: '/ops', label: t('app.nav.ops'), short: 'X5' },
]);

const pageTitle = computed(() => {
  const key = String(route.meta.titleKey ?? '');
  return key ? t(key) : 'OpenCLI Studio';
});
const pageDescription = computed(() => {
  const key = String(route.meta.descriptionKey ?? '');
  return key ? t(key) : t('app.shell.description');
});
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
    color: 'rgba(14, 24, 37, 0.92)',
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
            <div class="eyebrow">{{ t('app.shell.eyebrow') }}</div>
            <h1>{{ t('app.shell.title') }}</h1>
            <p>{{ t('app.shell.description') }}</p>
          </div>

          <nav class="nav-links">
            <RouterLink
              v-for="item in navigation"
              :key="item.to"
              :to="item.to"
              class="nav-link"
              :class="{ 'nav-link--active': route.path === item.to }"
            >
              <span class="nav-link__short">{{ item.short }}</span>
              <span>{{ item.label }}</span>
            </RouterLink>
          </nav>

          <div class="nav-tools">
            <div class="nav-tools__label">{{ t('app.shell.language') }}</div>
            <n-button-group>
              <n-button size="small" :type="locale === 'en' ? 'primary' : 'default'" @click="setLocale('en')">EN</n-button>
              <n-button size="small" :type="locale === 'zh-CN' ? 'primary' : 'default'" @click="setLocale('zh-CN')">中</n-button>
            </n-button-group>
          </div>

          <div class="nav-status">
            <div class="nav-status__row">
              <span>{{ t('app.shell.status.commands') }}</span>
              <strong>{{ store.env?.commandCount ?? 0 }}</strong>
            </div>
            <div class="nav-status__row">
              <span>{{ t('app.shell.status.browser') }}</span>
              <strong>{{ store.env?.browserCommandCount ?? 0 }}</strong>
            </div>
            <div class="nav-status__row">
              <span>{{ t('app.shell.status.recipes') }}</span>
              <strong>{{ store.recipes.length }}</strong>
            </div>
            <div class="nav-status__row">
              <span>{{ t('app.shell.status.plugins') }}</span>
              <strong>{{ store.plugins.length }}</strong>
            </div>
            <div class="nav-status__row">
              <span>{{ t('app.shell.status.external') }}</span>
              <strong>{{ store.externalClis.length }}</strong>
            </div>
          </div>
        </aside>

        <div class="app-main">
          <header class="topbar">
            <div class="topbar__copy">
              <div class="eyebrow">{{ t('app.shell.currentSurface') }}</div>
              <h2>{{ pageTitle }}</h2>
              <p>{{ pageDescription }}</p>
            </div>
            <div class="topbar__meta">
              <label class="switch-inline topbar__switch">
                <span>{{ t('app.shell.advancedMode') }}</span>
                <n-switch v-model:value="advancedModeModel" />
              </label>
              <n-tag size="small" type="success">{{ t('app.shell.inherited') }}</n-tag>
              <n-tag size="small" type="info">{{ t('app.shell.local') }}</n-tag>
              <n-tag size="small" type="warning">{{ t('app.shell.preview') }}</n-tag>
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
