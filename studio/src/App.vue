<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import {
  NAlert,
  NButton,
  NButtonGroup,
  NConfigProvider,
  NMessageProvider,
  NSpin,
  NSwitch,
  NTag,
  type GlobalThemeOverrides,
} from 'naive-ui';
import { useStudioI18n } from './lib/i18n';
import { useStudioStore } from './stores/studio';

const THEME_STORAGE_KEY = 'opencli-studio-theme';
type StudioTheme = 'light' | 'focus';

const store = useStudioStore();
const route = useRoute();
const router = useRouter();
const { locale, setLocale, t } = useStudioI18n();

const theme = ref<StudioTheme>('light');
const navigation = computed(() => [
  { to: '/', label: t('app.nav.overview'), short: 'OV' },
  { to: '/registry', label: t('app.nav.registry'), short: 'RG' },
  { to: '/workbench', label: t('app.nav.workbench'), short: 'WB' },
  { to: '/insights', label: t('app.nav.insights'), short: 'IS' },
  { to: '/ops', label: t('app.nav.ops'), short: 'OP' },
]);

const workspaceName = computed(() => {
  if (!store.env?.storageDir) {
    return t('app.shell.workspaceUnknown');
  }
  const chunks = store.env.storageDir.split(/[\\/]/).filter(Boolean);
  return chunks.length ? chunks.at(-1) ?? chunks.join(' / ') : store.env.storageDir;
});

const activeTaskCount = computed(() => {
  return Number(Boolean(store.runningCommand)) + Number(Boolean(store.runningSnapshot)) + Number(Boolean(store.runningDoctor));
});

const activeTasksLabel = computed(() =>
  activeTaskCount.value > 0
    ? t('app.shell.activeTaskCount', { count: activeTaskCount.value })
    : t('app.shell.noActiveTask'),
);

const pageTitle = computed(() => {
  const key = String(route.meta.titleKey ?? '');
  return key ? t(key) : 'OpenCLI Studio';
});

const pageDescription = computed(() => {
  const key = String(route.meta.descriptionKey ?? '');
  return key ? t(key) : t('app.shell.description');
});

const activePath = computed(() => route.path);

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

const currentTheme = computed(() => theme.value);

const lightOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily:
      '"Manrope", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
    primaryColor: '#2563eb',
    primaryColorHover: '#1d4ed8',
    primaryColorPressed: '#1e40af',
    successColor: '#059669',
    warningColor: '#d97706',
    errorColor: '#dc2626',
    infoColor: '#0f766e',
    textColorBase: '#0f172a',
    bodyColor: '#f5f8fc',
    cardColor: '#ffffff',
    borderColor: '#d6deeb',
  },
  Card: {
    borderRadius: '14px',
    color: '#ffffff',
  },
  Button: {
    borderRadiusMedium: '10px',
  },
  Input: {
    color: '#ffffff',
    borderRadius: '10px',
    borderHover: '1px solid rgba(37, 99, 235, 0.45)',
  },
};

const focusOverrides: GlobalThemeOverrides = {
  ...lightOverrides,
  common: {
    ...lightOverrides.common,
    primaryColor: '#0284c7',
    primaryColorHover: '#0369a1',
    primaryColorPressed: '#075985',
    infoColor: '#0284c7',
  },
};

const themeOverrides = computed(() => (theme.value === 'focus' ? focusOverrides : lightOverrides));

function setTheme(nextTheme: StudioTheme): void {
  theme.value = nextTheme;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }
}

function syncStoredTheme(): void {
  if (typeof window === 'undefined') return;
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (value === 'light' || value === 'focus') {
    theme.value = value;
  }
}

function clearFilters(): void {
  const nextQuery: LocationQueryRaw = {};
  if (store.advancedMode) {
    nextQuery.advanced = '1';
  }
  void router.replace({ path: route.path, query: nextQuery });
}

onMounted(() => {
  syncStoredTheme();
  void store.loadShell();
});
</script>

<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <div class="studio-shell" :class="`studio-shell--${currentTheme}`">
        <header class="studio-topbar">
          <div class="studio-topbar__brand">
            <span class="studio-topbar__logo">{{ t('app.system.logoMark') }}</span>
            <div class="studio-topbar__title-wrap">
              <div class="studio-topbar__brand-title">{{ t('app.system.title') }}</div>
              <div class="studio-topbar__meta">
                {{ t('app.shell.workspace') }}{{ workspaceName }}
                <n-tag size="small" type="default">{{ activeTasksLabel }}</n-tag>
              </div>
            </div>
          </div>

          <nav class="studio-topbar__menu">
            <RouterLink
              v-for="item in navigation"
              :key="item.to"
              :to="item.to"
              class="studio-topbar__menu-link"
              :class="{ 'studio-topbar__menu-link--active': activePath === item.to }"
            >
              <span>{{ item.label }}</span>
            </RouterLink>
          </nav>

          <div class="studio-topbar__controls">
            <label class="studio-control">
              <span>{{ t('app.shell.advancedMode') }}</span>
              <n-switch v-model:value="advancedModeModel" />
            </label>

            <label class="studio-control">
              <span>{{ t('app.shell.theme') }}</span>
              <n-button-group>
                <n-button size="small" :type="theme === 'light' ? 'primary' : 'default'" @click="setTheme('light')">
                  {{ t('app.shell.themeLight') }}
                </n-button>
                <n-button size="small" :type="theme === 'focus' ? 'primary' : 'default'" @click="setTheme('focus')">
                  {{ t('app.shell.themeFocus') }}
                </n-button>
              </n-button-group>
            </label>

            <label class="studio-control">
              <span>{{ t('app.shell.language') }}</span>
              <n-button-group>
                <n-button size="small" :type="locale === 'en' ? 'primary' : 'default'" @click="setLocale('en')">
                  EN
                </n-button>
                <n-button size="small" :type="locale === 'zh-CN' ? 'primary' : 'default'" @click="setLocale('zh-CN')">
                  中
                </n-button>
              </n-button-group>
            </label>
          </div>
        </header>

        <div class="studio-layout">
          <aside class="studio-sidepanel">
            <div class="studio-sidepanel__card">
              <div class="eyebrow">{{ t('app.shell.eyebrow') }}</div>
              <h1>{{ t('app.shell.title') }}</h1>
              <p>{{ t('app.shell.description') }}</p>
            </div>

            <div class="studio-sidepanel__stats">
              <div class="studio-sidepanel__stat">
                <span>{{ t('app.shell.status.commands') }}</span>
                <strong>{{ store.env?.commandCount ?? 0 }}</strong>
              </div>
              <div class="studio-sidepanel__stat">
                <span>{{ t('app.shell.status.browser') }}</span>
                <strong>{{ store.env?.browserCommandCount ?? 0 }}</strong>
              </div>
              <div class="studio-sidepanel__stat">
                <span>{{ t('app.shell.status.recipes') }}</span>
                <strong>{{ store.recipes.length }}</strong>
              </div>
              <div class="studio-sidepanel__stat">
                <span>{{ t('app.shell.status.plugins') }}</span>
                <strong>{{ store.plugins.length }}</strong>
              </div>
              <div class="studio-sidepanel__stat">
                <span>{{ t('app.shell.status.external') }}</span>
                <strong>{{ store.externalClis.length }}</strong>
              </div>
            </div>

            <n-button block size="small" tertiary @click="clearFilters()">{{ t('app.shell.resetFilters') }}</n-button>
          </aside>

          <main class="app-main">
            <header class="page-head">
              <div class="page-head__copy">
                <div class="eyebrow">{{ t('app.shell.currentSurface') }}</div>
                <h2>{{ pageTitle }}</h2>
                <p>{{ pageDescription }}</p>
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
          </main>
        </div>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>
