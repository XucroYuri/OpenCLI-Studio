<script setup lang="ts">
import { computed, defineAsyncComponent, h, ref, watch } from 'vue';
import { NButton, NCard, NDataTable, NEmpty, NTabPane, NTabs, NTag, useMessage } from 'naive-ui';
import { buildResultExports, type ResultExportArtifact } from '../lib/export';
import { useStudioI18n } from '../lib/i18n';
import { buildResultPresentation } from '../lib/results';

const ChartPanel = defineAsyncComponent(() => import('./ChartPanel.vue'));
const message = useMessage();
const { t } = useStudioI18n();

const props = withDefaults(defineProps<{
  result?: unknown;
  title?: string;
}>(), {
  title: '',
});

const presentation = computed(() => buildResultPresentation(props.result));
const exportBundle = computed(() =>
  presentation.value.summary.kind === 'empty'
    ? null
    : buildResultExports(props.title, props.result),
);
const activeTab = ref<'table' | 'chart' | 'json'>('json');

function resolveDefaultTab(): 'table' | 'chart' | 'json' {
  if (presentation.value.rows.length) return 'table';
  if (presentation.value.chart) return 'chart';
  return 'json';
}

watch(presentation, () => {
  activeTab.value = resolveDefaultTab();
}, { immediate: true });

function isUrlLike(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/|www\.)/i.test(trimmed);
}

function normalizeUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

const columns = computed(() =>
  Object.keys(presentation.value.rows[0] ?? {}).map((key) => ({
    title: key,
    key,
    ellipsis: {
      tooltip: true,
    },
    render: (row: Record<string, unknown>) => {
      const value = row[key];
      const text = formatCellValue(value);

      if (isUrlLike(value)) {
        return h(
          'a',
          {
            href: normalizeUrl(String(value)),
            target: '_blank',
            rel: 'noreferrer noopener',
            class: 'result-link',
          },
          text,
        );
      }

      return h('span', { class: 'result-cell' }, text || '—');
    },
  })),
);

const summaryKindLabel = computed(() => t(`resultPanel.summaryKinds.${presentation.value.summary.kind}`));

async function copyArtifact(artifact: ResultExportArtifact): Promise<void> {
  try {
    await navigator.clipboard.writeText(artifact.contents);
    message.success(t('resultPanel.copied', { filename: artifact.filename }));
  } catch (error) {
    message.error(error instanceof Error ? error.message : String(error));
  }
}

function downloadArtifact(artifact: ResultExportArtifact): void {
  const blob = new Blob([artifact.contents], { type: artifact.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = artifact.filename;
  anchor.click();
  URL.revokeObjectURL(url);
  message.success(t('resultPanel.exported', { filename: artifact.filename }));
}
</script>

<template>
  <n-card :title="title || t('common.result')" class="glass-card">
    <template v-if="presentation.summary.kind === 'empty'">
      <n-empty :description="t('resultPanel.empty')" />
    </template>
    <template v-else>
      <div class="result-panel__summary">
        <div class="result-panel__summary-copy">
          <n-tag type="warning" size="small">{{ summaryKindLabel }}</n-tag>
          <span>{{ t('resultPanel.observed', { count: presentation.summary.count }) }}</span>
        </div>
        <div v-if="exportBundle" class="result-panel__exports">
          <n-button size="small" quaternary @click="copyArtifact(exportBundle.json)">{{ t('resultPanel.copyJson') }}</n-button>
          <n-button size="small" quaternary @click="downloadArtifact(exportBundle.json)">{{ t('resultPanel.downloadJson') }}</n-button>
          <n-button size="small" quaternary @click="downloadArtifact(exportBundle.markdown)">{{ t('resultPanel.downloadMarkdown') }}</n-button>
          <n-button
            v-if="exportBundle.csv"
            size="small"
            quaternary
            @click="downloadArtifact(exportBundle.csv)"
          >
            {{ t('resultPanel.downloadCsv') }}
          </n-button>
        </div>
      </div>

      <div v-if="presentation.keyFacts.length" class="result-panel__facts">
        <div v-for="fact in presentation.keyFacts" :key="fact.label" class="result-panel__fact">
          <span>{{ fact.label }}</span>
          <a
            v-if="isUrlLike(fact.value)"
            :href="normalizeUrl(fact.value)"
            target="_blank"
            rel="noreferrer noopener"
            class="result-link result-link--fact"
          >
            {{ fact.value }}
          </a>
          <strong v-else>{{ fact.value }}</strong>
        </div>
      </div>

      <n-tabs v-model:value="activeTab" type="line" animated class="result-panel__tabs">
        <n-tab-pane v-if="presentation.rows.length" name="table" :tab="t('common.table')">
          <n-data-table
            size="small"
            :columns="columns"
            :data="presentation.rows"
            :pagination="{ pageSize: 8 }"
            scroll-x="900"
          />
        </n-tab-pane>
        <n-tab-pane v-if="presentation.chart" name="chart" :tab="t('resultPanel.chart')">
          <chart-panel :model="presentation.chart" />
        </n-tab-pane>
        <n-tab-pane name="json" :tab="t('common.json')">
          <pre class="json-block">{{ JSON.stringify(result, null, 2) }}</pre>
        </n-tab-pane>
      </n-tabs>
    </template>
  </n-card>
</template>

<style scoped>
.result-link {
  color: #60a5fa;
  text-decoration: none;
  word-break: break-all;
}

.result-link:hover {
  text-decoration: underline;
}

.result-link--fact {
  display: inline-block;
  margin-top: 6px;
  font-weight: 600;
}

.result-cell {
  color: inherit;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
