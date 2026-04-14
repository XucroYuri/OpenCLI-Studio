<script setup lang="ts">
import { computed } from 'vue';
import { buildSvgChartLayout } from '../lib/chart-layout';
import { useStudioI18n } from '../lib/i18n';
import type { ResultChartModel } from '../lib/results';

const props = defineProps<{
  model: ResultChartModel;
}>();

const { t } = useStudioI18n();

const width = 720;
const height = 320;
const layout = computed(() => buildSvgChartLayout(props.model, { width, height }));
</script>

<template>
  <div class="chart-panel">
    <svg
      class="chart-panel__svg"
      :viewBox="`0 0 ${layout.width} ${layout.height}`"
      role="img"
      :aria-label="t('resultPanel.chartAriaLabel', { label: props.model.labelKey })"
    >
      <g>
        <line
          v-for="tick in layout.ticks"
          :key="`grid-${tick.y}`"
          x1="48"
          :y1="tick.y"
          x2="702"
          :y2="tick.y"
          class="chart-panel__grid"
        />
        <text
          v-for="tick in layout.ticks"
          :key="`tick-${tick.y}`"
          x="40"
          :y="tick.y + 4"
          text-anchor="end"
          class="chart-panel__tick"
        >
          {{ tick.value }}
        </text>
      </g>

      <g v-if="props.model.kind === 'bar'">
        <template v-for="series in layout.series" :key="series.key">
          <rect
            v-for="bar in series.bars"
            :key="`${series.key}-${bar.x}`"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            rx="6"
            :fill="series.color"
            opacity="0.88"
          />
        </template>
      </g>

      <g v-else>
        <template v-for="series in layout.series" :key="series.key">
          <polyline
            :points="series.polyline"
            fill="none"
            :stroke="series.color"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            v-for="point in series.points"
            :key="`${series.key}-${point.x}`"
            :cx="point.x"
            :cy="point.y"
            r="4"
            :fill="series.color"
          />
        </template>
      </g>

      <g>
        <text
          v-for="label in layout.labels"
          :key="`label-${label.x}`"
          :x="label.x"
          :y="label.y"
          text-anchor="middle"
          class="chart-panel__label"
        >
          {{ label.text }}
        </text>
      </g>

      <g>
        <g
          v-for="(series, index) in layout.series"
          :key="`legend-${series.key}`"
          :transform="`translate(${48 + index * 150}, 20)`"
        >
          <rect x="0" y="-10" width="16" height="16" rx="4" :fill="series.color" />
          <text x="24" y="3" class="chart-panel__legend">{{ series.key }}</text>
        </g>
      </g>
    </svg>
  </div>
</template>
