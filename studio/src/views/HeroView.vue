<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { RouterLink } from 'vue-router';
import { useStudioI18n } from '../lib/i18n';

const { t } = useStudioI18n();

const visible = ref(false);
const beamsVisible = ref(false);
const mockupEl = ref<HTMLElement | null>(null);

let beamTimer: ReturnType<typeof setTimeout> | undefined;

const chartData = [
  [65, 45], [80, 60], [55, 70], [90, 50], [75, 85], [60, 40], [95, 72],
];

const logEntries = [
  { cmd: 'weibo trending',    status: 'success' as const, time: '14:32', dur: '1.2s' },
  { cmd: 'zhihu hot',         status: 'success' as const, time: '14:28', dur: '0.8s' },
  { cmd: 'github search',     status: 'warning' as const, time: '14:15', dur: '3.4s' },
  { cmd: 'douyin trending',   status: 'success' as const, time: '14:02', dur: '1.5s' },
  { cmd: 'bilibili ranking',  status: 'error'   as const, time: '13:51', dur: '5.1s' },
  { cmd: 'xiaohongshu feed',  status: 'success' as const, time: '13:44', dur: '2.0s' },
];

const MAX_ANGLE = 8;

onMounted(() => {
  document.body.classList.add('body--hero');
  nextTick(() => {
    requestAnimationFrame(() => {
      visible.value = true;
    });
  });
  beamTimer = setTimeout(() => {
    beamsVisible.value = true;
  }, 500);
});

onUnmounted(() => {
  document.body.classList.remove('body--hero');
  if (beamTimer !== undefined) clearTimeout(beamTimer);
});

function handleMouseMove(e: MouseEvent): void {
  const el = mockupEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * MAX_ANGLE;
  const rotateX = -((e.clientY - centerY) / (rect.height / 2)) * MAX_ANGLE;
  el.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

function handleMouseLeave(): void {
  const el = mockupEl.value;
  if (!el) return;
  el.style.transform = 'rotateX(0deg) rotateY(0deg)';
}
</script>

<template>
  <div>
    <div class="beam beam-left" :class="{ 'beam--visible': beamsVisible }" />
    <div class="beam beam-right" :class="{ 'beam--visible': beamsVisible }" />

    <div class="hero-wrapper">

      <div
        class="hero-badge hero-animate hero-delay-0"
        :class="{ 'hero-animate--visible': visible }"
      >
        <span class="hero-badge__dot" />
        <span class="hero-badge__text">{{ t('hero.badge') }}</span>
      </div>

      <h1
        class="hero-title hero-animate hero-delay-1"
        :class="{ 'hero-animate--visible': visible }"
      >
        {{ t('hero.title') }}
      </h1>

      <p
        class="hero-subtitle hero-animate hero-delay-2"
        :class="{ 'hero-animate--visible': visible }"
      >
        {{ t('hero.subtitle') }}
      </p>

      <div
        class="hero-buttons hero-animate hero-delay-3"
        :class="{ 'hero-animate--visible': visible }"
      >
        <RouterLink to="/overview" class="hero-btn hero-btn--primary">
          {{ t('hero.primaryButton') }}
        </RouterLink>
        <a
          href="https://github.com/jackwener/opencli"
          target="_blank"
          rel="noopener"
          class="hero-btn hero-btn--secondary"
        >
          {{ t('hero.secondaryButton') }}
        </a>
      </div>

      <div
        class="dashboard-perspective hero-animate hero-delay-4"
        :class="{ 'hero-animate--visible': visible }"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
      >
        <div ref="mockupEl" class="dashboard-mockup">

          <aside class="dashboard-sidebar">
            <div class="sidebar-logo">
              <span class="sidebar-logo__icon">&#9675;</span>
              <span class="sidebar-logo__text">OpenCLI</span>
            </div>
            <div class="sidebar-item sidebar-item--active">
              <span class="sidebar-item__icon">&#9636;</span>
              {{ t('hero.dashboard.sidebarOverview') }}
            </div>
            <div class="sidebar-item">
              <span class="sidebar-item__icon">&#9776;</span>
              {{ t('hero.dashboard.sidebarRegistry') }}
            </div>
            <div class="sidebar-item">
              <span class="sidebar-item__icon">&#9881;</span>
              {{ t('hero.dashboard.sidebarWorkbench') }}
            </div>
            <div class="sidebar-item">
              <span class="sidebar-item__icon">&#9733;</span>
              {{ t('hero.dashboard.sidebarInsights') }}
            </div>
            <div class="sidebar-item">
              <span class="sidebar-item__icon">&#9854;</span>
              {{ t('hero.dashboard.sidebarOps') }}
            </div>
          </aside>

          <div class="dashboard-main">
            <div class="dashboard-chart">
              <div class="dashboard-section-header">
                <span class="dashboard-section-title">{{ t('hero.dashboard.chartTitle') }}</span>
                <span class="dashboard-section-subtitle">{{ t('hero.dashboard.chartSubtitle') }}</span>
              </div>
              <div class="chart-area">
                <div class="chart-grid">
                  <div class="chart-grid-line" />
                  <div class="chart-grid-line" />
                  <div class="chart-grid-line" />
                  <div class="chart-grid-line" />
                  <div class="chart-grid-line" />
                  <div class="chart-grid-line" />
                </div>
                <div class="chart-bars">
                  <div v-for="(pair, i) in chartData" :key="i" class="chart-bar-group">
                    <div class="chart-bar chart-bar--blue" :style="{ height: pair[0] + '%' }" />
                    <div class="chart-bar chart-bar--cyan" :style="{ height: pair[1] + '%' }" />
                  </div>
                </div>
              </div>
            </div>

            <div class="dashboard-logs">
              <div class="dashboard-section-header">
                <span class="dashboard-section-title">{{ t('hero.dashboard.logsTitle') }}</span>
              </div>
              <div class="log-table-header">
                <span>{{ t('hero.dashboard.logsCommand') }}</span>
                <span>{{ t('hero.dashboard.logsStatus') }}</span>
                <span>{{ t('hero.dashboard.logsTime') }}</span>
                <span>{{ t('hero.dashboard.logsDuration') }}</span>
              </div>
              <div v-for="(entry, i) in logEntries" :key="i" class="log-row">
                <span class="log-row__command">
                  <span class="log-status-dot" :class="`log-status-dot--${entry.status}`" />
                  {{ entry.cmd }}
                </span>
                <span>{{ entry.status }}</span>
                <span>{{ entry.time }}</span>
                <span>{{ entry.dur }}</span>
              </div>
            </div>
          </div>

          <div class="dashboard-config">
            <span class="config-section-title">{{ t('hero.dashboard.configTitle') }}</span>
            <div class="config-field">
              <span class="config-field__label">{{ t('hero.dashboard.configWorkspace') }}</span>
              <div class="config-field__input">~/projects/my-app</div>
            </div>
            <div class="config-field">
              <span class="config-field__label">{{ t('hero.dashboard.configBrowser') }}</span>
              <div class="config-field__input">Chrome 126 — connected</div>
            </div>
            <div class="config-toggle">
              <span class="config-toggle__label">{{ t('hero.dashboard.configAutoRepair') }}</span>
              <span class="config-toggle__switch config-toggle__switch--on" />
            </div>
            <div class="config-toggle">
              <span class="config-toggle__label">{{ t('hero.dashboard.configAdvanced') }}</span>
              <span class="config-toggle__switch config-toggle__switch--off" />
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
