<script setup lang="ts">
import { computed } from 'vue';
import { NAlert, NButton } from 'naive-ui';
import type { CommandReadiness, CommandReadinessAction } from '../lib/readiness';

const props = defineProps<{
  readiness: CommandReadiness;
}>();

const emit = defineEmits<{
  action: [action: CommandReadinessAction];
}>();

const primaryBullet = computed(() => props.readiness.bullets[0] ?? '');
const secondaryBullets = computed(() => props.readiness.bullets.slice(1));
const actions = computed(() => props.readiness.actions.slice(0, 4));
</script>

<template>
  <n-alert :type="readiness.tone" :show-icon="false" class="readiness-banner">
    <div class="readiness-banner__body">
        <div class="readiness-banner__lead">
          <span class="readiness-banner__dot" :class="`readiness-banner__dot--${readiness.tone}`" />
          <div class="readiness-banner__copy">
            <strong class="readiness-banner__title">{{ readiness.title }}</strong>
            <p v-if="primaryBullet" class="readiness-banner__summary">{{ primaryBullet }}</p>
          </div>
        </div>

      <div v-if="actions.length" class="readiness-banner__actions">
        <n-button
          v-for="action in actions"
          :key="action.id"
          size="small"
          :type="action.kind === 'primary' ? 'primary' : undefined"
          :tertiary="action.kind !== 'primary'"
          @click="emit('action', action)"
        >
          {{ action.label }}
        </n-button>
      </div>
    </div>

    <ul v-if="secondaryBullets.length" class="readiness-banner__list">
      <li v-for="bullet in secondaryBullets" :key="bullet">{{ bullet }}</li>
    </ul>
  </n-alert>
</template>
