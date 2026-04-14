<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NEmpty, NTag } from 'naive-ui';
import type { StudioPresetEntry } from '../types';

const props = withDefaults(defineProps<{
  presets: StudioPresetEntry[];
  emptyDescription?: string;
}>(), {
  emptyDescription: 'No presets saved yet.',
});

const emit = defineEmits<{
  apply: [preset: StudioPresetEntry];
  remove: [preset: StudioPresetEntry];
}>();

const entries = computed(() =>
  props.presets.map((preset) => ({
    ...preset,
    kindLabel:
      preset.kind === 'registry'
        ? 'Registry'
        : preset.kind === 'workbench'
          ? 'Workbench'
          : 'Insight',
    updatedLabel: new Date(preset.updatedAt).toLocaleString(),
  })),
);
</script>

<template>
  <div v-if="entries.length" class="preset-list">
    <article v-for="preset in entries" :key="preset.id" class="preset-item">
      <div class="preset-item__header">
        <div>
          <strong>{{ preset.name }}</strong>
          <p v-if="preset.description">{{ preset.description }}</p>
        </div>
        <n-tag size="small" type="info">{{ preset.kindLabel }}</n-tag>
      </div>
      <div class="preset-item__meta">
        <span>Updated {{ preset.updatedLabel }}</span>
      </div>
      <div class="preset-item__actions">
        <n-button size="small" tertiary type="primary" @click="emit('apply', preset)">Apply</n-button>
        <n-button size="small" quaternary @click="emit('remove', preset)">Delete</n-button>
      </div>
    </article>
  </div>
  <n-empty v-else :description="emptyDescription" />
</template>
