<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import {
  NAlert,
  NButton,
  NButtonGroup,
  NConfigProvider,
  NMessageProvider,
  NSpin,
  darkTheme,
  type GlobalThemeOverrides,
} from 'naive-ui';
import { useStudioI18n } from '../lib/i18n';
import { useStudioStore } from '../stores/studio';

const store = useStudioStore();
const route = useRoute();
const router = useRouter();
const { localeMode, setLocale, t } = useStudioI18n();
const initialDoctorError = ref('');

const navigation = computed(() => [
  { to: '/overview', label: t('app.nav.overview'), short: 'OV' },
  { to: '/registry', label: t('app.nav.registry'), short: 'RG' },
  { to: '/workbench', label: t('app.nav.workbench'), short: 'WB' },
  { to: '/insights', label: t('app.nav.insights'), short: 'IS' },
  { to: '/ops', label: t('app.nav.ops'), short: 'OP' },
  { to: '/about', label: t('app.nav.about'), short: 'AB' },
]);

const activePath = computed(() => route.path);
const showInitialDoctorCta = computed(() => store.needsInitialDoctor && !store.initializing);

async function startInitialDoctor(): Promise<void> {
  initialDoctorError.value = '';
  await router.push('/ops');
  try {
    await store.runDoctor({ live: true, sessions: true });
  } catch (error) {
    initialDoctorError.value = error instanceof Error ? error.message : String(error);
  }
}

const darkOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily:
      '"Inter", "Manrope", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
    primaryColor: '#2563eb',
    primaryColorHover: '#3b82f6',
    primaryColorPressed: '#1d4ed8',
    successColor: '#22c55e',
    warningColor: '#eab308',
    errorColor: '#ef4444',
    infoColor: '#06b6d4',
    bodyColor: 'transparent',
    cardColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    textColorBase: '#ffffff',
    modalColor: 'rgba(15, 15, 20, 0.95)',
    popoverColor: 'rgba(15, 15, 20, 0.95)',
    tableColor: 'transparent',
    inputColor: 'rgba(255, 255, 255, 0.04)',
  },
  Card: {
    borderRadius: '12px',
    color: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  Button: {
    borderRadiusMedium: '10px',
  },
  Input: {
    color: 'rgba(255, 255, 255, 0.04)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderHover: '1px solid rgba(37, 99, 235, 0.45)',
    borderFocus: '1px solid rgba(37, 99, 235, 0.6)',
  },
  DataTable: {
    thColor: 'transparent',
    tdColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  Drawer: {
    color: 'rgba(10, 10, 15, 0.96)',
    headerBorderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    footerBorderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  Tag: {
    borderRadius: '999px',
  },
};

onMounted(() => {
  void store.loadShell();
});
</script>

<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="darkOverrides">
    <n-message-provider>
      <div class="studio-shell">
        <div class="studio-beam studio-beam--left" />
        <div class="studio-beam studio-beam--right" />

        <header class="studio-topbar">
          <div class="studio-topbar__brand">
            <RouterLink to="/overview" class="studio-topbar__logo">{{ t('app.system.logoMark') }}</RouterLink>
            <RouterLink to="/overview" class="studio-topbar__brand-title">{{ t('app.system.title') }}</RouterLink>
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
            <div v-if="showInitialDoctorCta" class="studio-topbar__setup">
              <div class="studio-topbar__setup-copy">
                <span class="studio-topbar__setup-text">{{ t('app.shell.initialDoctorPrompt') }}</span>
                <span v-if="initialDoctorError" class="studio-topbar__setup-error">{{ initialDoctorError }}</span>
              </div>
              <n-button type="primary" size="small" :loading="store.runningDoctor" @click="startInitialDoctor()">
                {{ t('app.shell.initialDoctorAction') }}
              </n-button>
            </div>
            <n-button-group>
              <n-button size="small" :type="localeMode === 'auto' ? 'primary' : 'default'" @click="setLocale('auto')">
                {{ t('app.shell.auto') }}
              </n-button>
              <n-button size="small" :type="localeMode === 'en' ? 'primary' : 'default'" @click="setLocale('en')">
                EN
              </n-button>
              <n-button size="small" :type="localeMode === 'zh-CN' ? 'primary' : 'default'" @click="setLocale('zh-CN')">
                中文
              </n-button>
            </n-button-group>
          </div>
        </header>

        <div class="studio-layout">
          <main class="app-main">
            <main class="page-host">
              <n-alert v-if="store.loadError" type="error" class="page-alert">
                {{ store.loadError }}
              </n-alert>
              <n-spin :show="store.initializing">
                <slot />
              </n-spin>
            </main>
          </main>
        </div>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>
