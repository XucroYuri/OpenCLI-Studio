<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCard, NEmpty, NTag, useMessage } from 'naive-ui';
import ResultPanel from '../components/ResultPanel.vue';
import { executeCommand } from '../lib/api';
import { useStudioI18n } from '../lib/i18n';
import {
  buildOverviewComboMergedResult,
  listOverviewCombos,
  type OverviewComboDefinition,
  type OverviewComboRunOutcome,
} from '../lib/overview-combos';
import { useStudioStore } from '../stores/studio';

type StatusTagType = 'default' | 'success' | 'warning' | 'error' | 'info';
type SurfaceName = 'registry' | 'workbench' | 'insights' | 'ops';

const store = useStudioStore();
const router = useRouter();
const message = useMessage();
const { locale, t } = useStudioI18n();

const visible = ref(false);
const selectedComboId = ref('');
const runningComboId = ref<string | null>(null);
const comboResult = ref<ReturnType<typeof buildOverviewComboMergedResult> | null>(null);
const comboProgress = ref({ current: 0, total: 0, label: '' });

onMounted(() => {
  requestAnimationFrame(() => {
    visible.value = true;
  });
});

const comboCatalog = computed(() => listOverviewCombos(store.registry.commands));
watch(comboCatalog, (combos) => {
  if (combos.some((combo) => combo.id === selectedComboId.value)) return;
  selectedComboId.value = combos[0]?.id ?? '';
}, { immediate: true });

const activeCombo = computed(() =>
  comboCatalog.value.find((combo) => combo.id === selectedComboId.value) ?? comboCatalog.value[0] ?? null,
);
watch(selectedComboId, () => {
  if (runningComboId.value) return;
  comboResult.value = null;
});

const doctorIssueCount = computed(() => store.doctor?.issues?.length ?? 0);
const doctorStatusText = computed(() => {
  if (!store.doctor) return t('overview.doctorNotRun');
  return doctorIssueCount.value > 0
    ? t('overview.doctorIssues', { count: doctorIssueCount.value })
    : t('overview.doctorHealthy');
});
const doctorTagType = computed<StatusTagType>(() => {
  if (!store.doctor) return 'default';
  return doctorIssueCount.value > 0 ? 'warning' : 'success';
});

const comboTitle = computed(() => (
  activeCombo.value ? t(`overview.combos.definitions.${activeCombo.value.id}.title`) : t('overview.combos.title')
));
const comboPanelTitle = computed(() => t('overview.combos.resultTitle', { value: comboTitle.value }));
const comboResultPayload = computed(() => (
  comboResult.value && comboResult.value.items.length
    ? { items: comboResult.value.items }
    : undefined
));
const comboErrorPreview = computed(() => comboResult.value?.errors.slice(0, 3) ?? []);

const entryCards = computed(() => [
  {
    id: 'registry',
    title: t('overview.entries.registry.title'),
    stat: t('overview.entries.registry.stat', {
      sites: String(store.siteGroups.length),
      commands: String(store.registry.commands.length),
    }),
    action: t('overview.entries.registry.action'),
  },
  {
    id: 'workbench',
    title: t('overview.entries.workbench.title'),
    stat: t('overview.entries.workbench.stat', {
      count: String(store.availableWorkbenchCommands.length),
    }),
    action: t('overview.entries.workbench.action'),
  },
  {
    id: 'insights',
    title: t('overview.entries.insights.title'),
    stat: t('overview.entries.insights.stat', {
      count: String(store.recipes.length),
    }),
    action: t('overview.entries.insights.action'),
  },
  {
    id: 'ops',
    title: t('overview.entries.ops.title'),
    stat: t('overview.entries.ops.stat', {
      count: String(store.env?.browserCommandCount ?? 0),
    }),
    action: t('overview.entries.ops.action'),
  },
]);

const statusTiles = computed(() => [
  {
    key: 'environment',
    label: t('overview.status.environment.label'),
    value: doctorStatusText.value,
    tag: doctorTagType.value,
  },
  {
    key: 'browser',
    label: t('overview.status.browser.label'),
    value: t('overview.status.browser.value', { count: String(store.env?.browserCommandCount ?? 0) }),
    tag: 'info' as StatusTagType,
  },
  {
    key: 'library',
    label: t('overview.status.library.label'),
    value: t('overview.status.library.value', {
      sites: String(store.siteGroups.length),
      commands: String(store.registry.commands.length),
    }),
    tag: 'default' as StatusTagType,
  },
]);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function openSurface(name: SurfaceName): void {
  void router.push({ name });
}

function openWorkbench(command?: string): void {
  void router.push({
    name: 'workbench',
    query: {
      ...(command ? { command } : {}),
      ...(store.advancedMode ? { advanced: '1' } : {}),
    },
  });
}

function openComboRegistry(combo: OverviewComboDefinition): void {
  if (combo.id === 'creator-hot-domestic') {
    void router.push({ name: 'registry', query: { market: 'domestic', purpose: 'discovery' } });
    return;
  }
  if (combo.id === 'creator-hot-global') {
    void router.push({ name: 'registry', query: { market: 'international', purpose: 'discovery' } });
    return;
  }
  void router.push({ name: 'registry', query: { purpose: 'discovery' } });
}

async function handleDoctor(): Promise<void> {
  await store.runDoctor();
}

async function handleRunCombo(combo: OverviewComboDefinition | null = activeCombo.value): Promise<void> {
  if (!combo || combo.steps.length === 0) return;

  selectedComboId.value = combo.id;
  runningComboId.value = combo.id;
  comboProgress.value = { current: 0, total: combo.steps.length, label: '' };
  comboResult.value = null;

  try {
    const outcomes: OverviewComboRunOutcome[] = [];

    for (const [index, step] of combo.steps.entries()) {
      comboProgress.value = {
        current: index + 1,
        total: combo.steps.length,
        label: store.getSiteDisplayName(step.item.site, locale.value),
      };

      try {
        const response = await executeCommand(step.command, step.args);
        outcomes.push({ step, response });
      } catch (error) {
        outcomes.push({ step, error: getErrorMessage(error) });
      }
    }

    comboResult.value = buildOverviewComboMergedResult(outcomes, {
      fieldLabels: {
        source: t('overview.combos.columns.source'),
        title: t('overview.combos.columns.title'),
        summary: t('overview.combos.columns.summary'),
        rank: t('overview.combos.columns.rank'),
        metric: t('overview.combos.columns.metric'),
        url: t('overview.combos.columns.url'),
      },
      getSourceLabel: (step) => store.getSiteDisplayName(step.item.site, locale.value),
      getCommandLabel: (step) => store.getCommandDisplayDesc(
        step.command,
        step.item.description || step.item.name,
        locale.value,
      ),
      maxRowsPerSource: 8,
    });

    if (comboResult.value.successCount > 0) {
      void store.refreshHistory().catch(() => {});
    }

    if (comboResult.value.successCount > 0 && comboResult.value.failureCount === 0) {
      message.success(t('overview.combos.runSuccess', { count: comboResult.value.totalRows }));
      return;
    }

    if (comboResult.value.successCount > 0) {
      message.warning(t('overview.combos.runPartial', {
        success: comboResult.value.successCount,
        failed: comboResult.value.failureCount,
      }));
      return;
    }

    message.error(t('overview.combos.runFailed'));
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    runningComboId.value = null;
  }
}
</script>

<template>
  <section class="page-grid">
    <div class="page-inline-header studio-animate studio-delay-0" :class="{ 'studio-animate--visible': visible }">
      <h1 class="gradient-title">{{ t('routes.overview.title') }}</h1>
    </div>

    <n-card class="glass-card studio-animate studio-delay-0" :class="{ 'studio-animate--visible': visible }">
      <div class="panel-toolbar overview-card-toolbar">
        <div>
          <strong class="overview-section-title">{{ t('overview.combos.title') }}</strong>
        </div>
        <div class="card-actions">
          <n-button
            size="small"
            tertiary
            :disabled="!activeCombo"
            @click="activeCombo && openComboRegistry(activeCombo)"
          >
            {{ t('overview.combos.openRegistry') }}
          </n-button>
          <n-button
            size="small"
            type="primary"
            :loading="runningComboId === activeCombo?.id"
            :disabled="!activeCombo"
            @click="handleRunCombo(activeCombo)"
          >
            {{ t('overview.combos.run') }}
          </n-button>
        </div>
      </div>

      <div v-if="comboCatalog.length" class="overview-combo-grid">
        <button
          v-for="combo in comboCatalog"
          :key="combo.id"
          class="overview-combo-tile"
          :class="{ 'overview-combo-tile--active': combo.id === activeCombo?.id }"
          :disabled="Boolean(runningComboId)"
          @click="selectedComboId = combo.id"
        >
          <div class="overview-combo-tile__top">
            <strong>{{ t(`overview.combos.definitions.${combo.id}.title`) }}</strong>
            <n-tag size="small" round>{{ t('overview.combos.sourceCount', { count: combo.sourceCount }) }}</n-tag>
          </div>
          <p>{{ t(`overview.combos.definitions.${combo.id}.description`) }}</p>
          <div class="overview-chip-row">
            <n-tag
              v-for="step in combo.steps.slice(0, 4)"
              :key="step.command"
              size="small"
              type="default"
            >
              {{ store.getSiteDisplayName(step.item.site, locale) }}
            </n-tag>
            <n-tag v-if="combo.steps.length > 4" size="small" type="default">+{{ combo.steps.length - 4 }}</n-tag>
          </div>
          <div class="overview-combo-tile__meta">
            <span>{{ combo.browserCount > 0 ? t('overview.combos.browserCount', { count: combo.browserCount }) : t('overview.combos.directOnly') }}</span>
          </div>
        </button>
      </div>
      <n-empty v-else :description="t('overview.combos.empty')" />

        <div v-if="activeCombo" class="overview-combo-summary">
          <div class="overview-chip-row">
            <n-tag size="small" round>{{ t('overview.combos.sourceCount', { count: activeCombo.sourceCount }) }}</n-tag>
          <n-tag v-if="activeCombo.browserCount > 0" size="small" round type="warning">
            {{ t('overview.combos.browserCount', { count: activeCombo.browserCount }) }}
          </n-tag>
          <n-tag v-if="comboResult" size="small" round type="success">
            {{ t('overview.combos.rowCount', { count: comboResult.totalRows }) }}
          </n-tag>
          <n-tag v-if="comboResult?.failureCount" size="small" round type="warning">
            {{ t('overview.combos.failureCount', { count: comboResult.failureCount }) }}
          </n-tag>
        </div>
        <div v-if="runningComboId === activeCombo.id" class="overview-inline-note">
          <strong>{{ t('overview.combos.running') }}</strong>
          <span>{{ t('overview.combos.runningStep', comboProgress) }}</span>
        </div>
        <div v-if="comboErrorPreview.length" class="overview-inline-note overview-inline-note--warning">
          <strong>{{ t('overview.combos.errorsTitle') }}</strong>
          <span v-for="error in comboErrorPreview" :key="`${error.source}-${error.message}`">
            {{ error.source }}: {{ error.message }}
          </span>
        </div>
      </div>
    </n-card>

    <result-panel
      class="studio-animate studio-delay-1"
      :class="{ 'studio-animate--visible': visible }"
      :title="comboPanelTitle"
      :result="comboResultPayload"
    />

    <div class="split-grid studio-animate studio-delay-2" :class="{ 'studio-animate--visible': visible }">
      <n-card class="glass-card">
        <div class="panel-toolbar overview-card-toolbar">
          <div>
            <strong class="overview-section-title">{{ t('overview.entries.title') }}</strong>
          </div>
        </div>

        <div class="overview-entry-grid">
          <button
            v-for="entry in entryCards"
            :key="entry.id"
            class="overview-entry-tile"
            @click="entry.id === 'workbench' ? openWorkbench(store.selectedCommand || undefined) : openSurface(entry.id as SurfaceName)"
          >
            <span>{{ entry.title }}</span>
            <strong>{{ entry.stat }}</strong>
            <small>{{ entry.action }}</small>
          </button>
        </div>
      </n-card>

      <n-card class="glass-card">
        <div class="panel-toolbar overview-card-toolbar">
          <div>
            <strong class="overview-section-title">{{ t('overview.status.title') }}</strong>
          </div>
          <div class="card-actions">
            <n-button size="small" quaternary :loading="store.runningDoctor" @click="handleDoctor()">
              {{ t('overview.status.runDoctor') }}
            </n-button>
            <n-button size="small" type="primary" @click="openSurface('ops')">
              {{ t('overview.status.openOps') }}
            </n-button>
          </div>
        </div>

        <div class="overview-status-grid">
          <div v-for="tile in statusTiles" :key="tile.key" class="overview-status-tile">
            <span>{{ tile.label }}</span>
            <strong>{{ tile.value }}</strong>
            <n-tag size="small" round :type="tile.tag">{{ tile.value }}</n-tag>
          </div>
        </div>
      </n-card>
    </div>
  </section>
</template>
