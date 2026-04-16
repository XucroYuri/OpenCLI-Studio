<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NEmpty, NTag } from 'naive-ui';
import { useStudioI18n } from '../lib/i18n';
import type { StudioPresetEntry } from '../types';

const props = withDefaults(defineProps<{
  presets: StudioPresetEntry[];
  emptyDescription?: string;
}>(), {
  emptyDescription: '',
});

const emit = defineEmits<{
  apply: [preset: StudioPresetEntry];
  remove: [preset: StudioPresetEntry];
}>();
const { t } = useStudioI18n();

const entries = computed(() =>
  props.presets.map((preset) => ({
    ...preset,
    kindLabel:
      preset.kind === 'registry'
        ? t('preset.kinds.registry')
        : preset.kind === 'workbench'
          ? t('preset.kinds.workbench')
          : t('preset.kinds.insight'),
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
        <span>{{ t('preset.updated', { value: preset.updatedLabel }) }}</span>
      </div>
      <div class="preset-item__actions">
        <n-button size="small" tertiary type="primary" @click="emit('apply', preset)">{{ t('common.apply') }}</n-button>
        <n-button size="small" quaternary @click="emit('remove', preset)">{{ t('common.delete') }}</n-button>
      </div>
    </article>
  </div>
  <n-empty v-else :description="emptyDescription || t('preset.empty')" />
</template>
