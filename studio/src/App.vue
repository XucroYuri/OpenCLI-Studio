<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import StudioLayout from './layouts/StudioLayout.vue';

const route = useRoute();
const isStudioLayout = computed(() => route.meta.layout === 'studio');
</script>

<template>
  <StudioLayout v-if="isStudioLayout">
    <RouterView />
  </StudioLayout>
  <RouterView v-else />
</template>
