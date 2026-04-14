<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
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

const columns = computed(() =>
  Object.keys(presentation.value.rows[0] ?? {}).map((key) => ({
    title: key,
    key,
    ellipsis: {
      tooltip: true,
    },
  })),
);

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
          <n-tag type="warning" size="small">{{ presentation.summary.kind }}</n-tag>
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
          <strong>{{ fact.value }}</strong>
        </div>
      </div>

      <chart-panel v-if="presentation.chart" :model="presentation.chart" />

      <n-tabs type="line" animated class="result-panel__tabs">
        <n-tab-pane v-if="presentation.rows.length" name="table" :tab="t('common.table')">
          <n-data-table
            size="small"
            :columns="columns"
            :data="presentation.rows"
            :pagination="{ pageSize: 8 }"
            scroll-x="900"
          />
        </n-tab-pane>
        <n-tab-pane name="json" :tab="t('common.json')">
          <pre class="json-block">{{ JSON.stringify(result, null, 2) }}</pre>
        </n-tab-pane>
      </n-tabs>
    </template>
  </n-card>
</template>
