<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { init, use, type ECharts, type EChartsCoreOption } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import type { ResultChartModel } from '../lib/results';

use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, SVGRenderer]);

const props = defineProps<{
  model: ResultChartModel;
}>();

const chartElement = ref<HTMLDivElement | null>(null);
let chart: ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

const option = computed<EChartsCoreOption>(() => {
  const categories = props.model.rows.map((row) => String(row[props.model.labelKey] ?? ''));

  return {
    backgroundColor: 'transparent',
    color: ['#f28c28', '#2ea7a0', '#e55812'],
    grid: {
      top: 36,
      right: 18,
      bottom: 24,
      left: 48,
    },
    tooltip: {
      trigger: props.model.kind === 'line' ? 'axis' : 'item',
      backgroundColor: 'rgba(9, 21, 32, 0.92)',
      borderColor: 'rgba(242, 140, 40, 0.32)',
      textStyle: {
        color: '#f4efe6',
      },
    },
    legend: {
      top: 4,
      textStyle: {
        color: '#c8d6dd',
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: '#9eb4be',
        interval: 0,
        rotate: categories.length > 6 ? 24 : 0,
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(124, 157, 169, 0.32)',
        },
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#9eb4be',
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(124, 157, 169, 0.14)',
        },
      },
    },
    series: props.model.numericKeys.map((key) => ({
      name: key,
      type: props.model.kind,
      smooth: props.model.kind === 'line',
      showSymbol: props.model.kind === 'line',
      barMaxWidth: 28,
      emphasis: {
        focus: 'series',
      },
      areaStyle: props.model.kind === 'line'
        ? { opacity: 0.12 }
        : undefined,
      data: props.model.rows.map((row) => Number(row[key] ?? 0)),
    })),
  };
});

function renderChart(): void {
  if (!chartElement.value) return;

  if (!chart) {
    chart = init(chartElement.value, undefined, { renderer: 'svg' });
  }

  chart.setOption(option.value, true);
  chart.resize();
}

onMounted(() => {
  renderChart();
  resizeObserver = new ResizeObserver(() => {
    chart?.resize();
  });
  if (chartElement.value) {
    resizeObserver.observe(chartElement.value);
  }
});

watch(option, () => {
  renderChart();
}, { deep: true });

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
  resizeObserver = null;
  chart = null;
});
</script>

<template>
  <div ref="chartElement" class="chart-panel"></div>
</template>
