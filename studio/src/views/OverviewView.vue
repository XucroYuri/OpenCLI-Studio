<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCard, NEmpty, NSpin, NTag, useMessage } from 'naive-ui';
import PresetShelf from '../components/PresetShelf.vue';
import { buildOverviewMetrics } from '../lib/dashboard';
import { useStudioI18n } from '../lib/i18n';
import { buildDoctorStatusRowsWithLabel } from '../lib/ops';
import { buildInsightQuery, buildRegistryQuery, buildWorkbenchQuery } from '../lib/routes';
import { readInsightPresetState, readRegistryPresetState, readWorkbenchPresetState } from '../lib/preset-state';
import { useStudioStore } from '../stores/studio';
import type { StudioPresetEntry } from '../types';

const store = useStudioStore();
const router = useRouter();
const message = useMessage();
const { locale, t } = useStudioI18n();

const visible = ref(false);
onMounted(() => { requestAnimationFrame(() => { visible.value = true; }); });

const metrics = computed(() => buildOverviewMetrics({
  commands: store.registry.commands,
  history: store.history,
  recipes: store.recipes,
  jobs: store.jobs,
  snapshots: store.recentSnapshots,
}));

const doctorRows = computed(() => buildDoctorStatusRowsWithLabel(store.doctor, t));

const doctorStatusText = computed(() => {
  if (!store.doctor) return t('overview.doctorNotRun');
  const issueCount = store.doctor.issues?.length ?? 0;
  return issueCount > 0 ? t('overview.doctorIssues', { count: issueCount }) : t('overview.doctorHealthy');
});

const recentRuns = computed(() => store.history.slice(0, 6));
const featuredRecipes = computed(() => store.recipes.slice(0, 4));
const favoriteCommands = computed(() =>
  store.registry.commands.filter((command) => store.favoriteCommandIds.has(command.command)).slice(0, 5),
);
const favoriteRecipes = computed(() =>
  store.recipes.filter((recipe) => store.favoriteRecipeIds.has(recipe.id)).slice(0, 5),
);
const recentPresets = computed(() => store.presets.slice(0, 6));
const activeJobs = computed(() => store.jobs.filter((job) => job.enabled).slice(0, 4));
const recentSnapshots = computed(() => store.recentSnapshots.slice(0, 4));
const topCategories = computed(() => store.categoryGroups.slice(0, 6));
const topSites = computed(() => store.siteGroups.slice(0, 8));

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

async function handleDoctor(): Promise<void> {
  await store.runDoctor();
}

async function refreshSnapshots(): Promise<void> {
  await store.refreshRecentSnapshots();
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

function openInsight(recipeId?: string): void {
  void router.push({
    name: 'insights',
    query: {
      ...(recipeId ? { recipe: recipeId } : {}),
      ...(store.advancedMode ? { advanced: '1' } : {}),
    },
  });
}

async function applyPreset(preset: StudioPresetEntry): Promise<void> {
  if (preset.kind === 'registry') {
    const state = readRegistryPresetState(preset.state);
    store.setAdvancedMode(state.advancedMode);
    await router.push({ name: 'registry', query: buildRegistryQuery(state) });
    return;
  }
  if (preset.kind === 'workbench') {
    const state = readWorkbenchPresetState(preset.state);
    store.setAdvancedMode(state.advancedMode);
    store.setSelectedCommand(state.command);
    store.stageWorkbenchArgs(state.args);
    await router.push({ name: 'workbench', query: buildWorkbenchQuery({ command: state.command, advancedMode: state.advancedMode }) });
    return;
  }
  const state = readInsightPresetState(preset.state);
  store.setAdvancedMode(state.advancedMode);
  store.setSelectedRecipe(state.recipeId);
  store.stageInsightArgs(state.args);
  await router.push({ name: 'insights', query: buildInsightQuery({ recipeId: state.recipeId, advancedMode: state.advancedMode }) });
}

async function removePreset(preset: StudioPresetEntry): Promise<void> {
  const proceed = window.confirm(t('registry.deletePresetConfirm', { value: preset.name }));
  if (!proceed) return;
  await store.deletePreset(preset.id);
  message.success(t('registry.deletePresetSuccess', { value: preset.name }));
}

function openSnapshotSource(sourceKind: string, sourceId: string, command: string): void {
  if (sourceKind === 'recipe') { openInsight(sourceId); return; }
  openWorkbench(command);
}

function statusLabel(status: 'success' | 'error' | string): string {
  if (status === 'success') return t('common.statusSuccess');
  if (status === 'error') return t('common.statusError');
  return String(status);
}

function jobStatusLabel(status: 'idle' | 'success' | 'error' | string): string {
  if (status === 'idle') return t('common.statusIdle');
  return statusLabel(status);
}

function doctorRowTone(tone: string): 'default' | 'info' | 'success' | 'warning' | 'error' {
  if (tone === 'success' || tone === 'warning' || tone === 'error' || tone === 'info') return tone;
  return 'default';
}

function capabilityLabel(value: string): string {
  return t(`registry.capability.${value}`);
}
</script>

<template>
  <section class="page-grid">
    <div class="page-inline-header studio-animate studio-delay-0" :class="{ 'studio-animate--visible': visible }">
      <h1 class="gradient-title">{{ t('routes.overview.title') }}</h1>
      <p class="page-inline-header__desc">{{ t('routes.overview.description') }}</p>
    </div>

    <!-- Hero 卡片：核心指标 + 快捷操作 -->
    <n-card class="hero-card studio-animate studio-delay-0" :class="{ 'studio-animate--visible': visible }">
      <div class="hero-card__copy">
        <div class="eyebrow">{{ t('overview.hero.eyebrow') }}</div>
        <h3 class="gradient-title">{{ t('overview.hero.title') }}</h3>
        <p>{{ t('overview.hero.description') }}</p>
      </div>
      <div class="hero-card__actions">
        <n-button type="primary" size="large" @click="openWorkbench(store.selectedCommand)">{{ t('overview.hero.workbench') }}</n-button>
        <n-button tertiary size="large" @click="openInsight()">{{ t('overview.hero.insights') }}</n-button>
        <n-button quaternary size="large" :loading="store.runningDoctor" @click="handleDoctor()">{{ t('overview.hero.doctor') }}</n-button>
      </div>
      <div class="metrics-grid">
        <div class="metric-tile">
          <span>{{ t('overview.metrics.total') }}</span>
          <strong>{{ metrics.totalCommands }}</strong>
        </div>
        <div class="metric-tile">
          <span>{{ t('overview.metrics.recipes') }}</span>
          <strong>{{ metrics.recipes }}</strong>
        </div>
        <div class="metric-tile">
          <span>{{ t('overview.metrics.jobs') }}</span>
          <strong>{{ metrics.jobs }}</strong>
        </div>
        <div class="metric-tile">
          <span>{{ t('overview.hero.doctor') }}</span>
          <strong>{{ doctorStatusText }}</strong>
        </div>
      </div>
    </n-card>

    <!-- 环境 + Doctor 结构化 -->
    <div class="split-grid studio-animate studio-delay-1" :class="{ 'studio-animate--visible': visible }">
      <n-card :title="t('overview.environment')" class="glass-card">
        <div v-if="store.env" class="kv-grid">
          <div class="kv-item">
            <span>{{ t('overview.platform') }}</span>
            <strong>{{ store.env.platform }}</strong>
          </div>
          <div class="kv-item">
            <span>{{ t('overview.node') }}</span>
            <strong>{{ store.env.nodeVersion }}</strong>
          </div>
          <div class="kv-item">
            <span>{{ t('overview.storage') }}</span>
            <strong>{{ store.env.storageDir }}</strong>
          </div>
        </div>
        <n-spin :show="store.runningDoctor">
          <div v-if="store.doctor" class="doctor-block">
            <div class="kv-grid">
              <div v-for="row in doctorRows" :key="row.label" class="kv-item">
                <span>{{ row.label }}</span>
                <n-tag size="small" :type="doctorRowTone(row.tone)">{{ row.value }}</n-tag>
              </div>
            </div>
          </div>
          <n-empty v-else :description="t('overview.doctorEmpty')" />
        </n-spin>
      </n-card>

      <n-card :title="t('overview.recentActivity')" class="glass-card">
        <div v-if="recentRuns.length" class="stack-list">
          <button v-for="entry in recentRuns" :key="entry.id" class="stack-row" @click="openWorkbench(entry.command)">
            <div>
              <strong>{{ store.registry.commands.find(c => c.command === entry.command)?.description || entry.command }}</strong>
              <span>{{ formatTime(entry.startedAt) }}</span>
            </div>
            <div class="stack-row__meta">
              <n-tag :type="entry.status === 'success' ? 'success' : 'error'" size="small">{{ statusLabel(entry.status) }}</n-tag>
              <span>{{ entry.durationMs }} ms</span>
            </div>
          </button>
        </div>
        <n-empty v-else :description="t('overview.noRuns')" />
      </n-card>
    </div>

    <!-- 命令库速览 -->
    <n-card :title="t('overview.commandLibrary')" class="glass-card studio-animate studio-delay-2" :class="{ 'studio-animate--visible': visible }">
      <div v-if="topCategories.length" class="category-tabs" style="margin-bottom: 12px;">
        <button
          v-for="cat in topCategories"
          :key="cat.category"
          class="category-tab"
          @click="router.push({ name: 'registry', query: { siteCategory: cat.category } })"
        >
          {{ store.getCategoryIcon(cat.category) }}
          {{ store.getCategoryLabel(cat.category, locale) }}
          <span class="category-tab__count">{{ cat.count }}</span>
        </button>
      </div>
      <div v-if="topSites.length" class="site-card-grid site-card-grid--compact">
        <div v-for="group in topSites" :key="group.site" class="site-card site-card--mini" @click="router.push({ name: 'registry', query: { site: group.site } })">
          <div class="site-card__header">
            <div class="site-card__icon">{{ group.icon }}</div>
            <div class="site-card__info">
              <div class="site-card__name">
                {{ store.getSiteDisplayName(group.site, locale) }}
                <span v-if="!group.domestic" class="site-card__intl-tag">{{ t('registry.market.international') }}</span>
              </div>
              <div class="site-card__category">{{ t('registry.cmdCount', { count: group.count }) }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-actions" style="margin-top: 8px;">
        <n-button size="small" type="primary" @click="router.push({ name: 'registry' })">{{ t('overview.viewAll') }}</n-button>
      </div>
    </n-card>

    <!-- 快照与任务（合并） -->
    <n-card :title="t('overview.snapshotsAndJobs')" class="glass-card studio-animate studio-delay-3" :class="{ 'studio-animate--visible': visible }">
      <div class="card-actions card-actions--between" style="margin-bottom: 8px;">
        <div class="panel-note">{{ t('overview.snapshotNote') }}</div>
        <n-button size="small" quaternary :loading="store.runningSnapshot" @click="refreshSnapshots()">{{ t('common.refresh') }}</n-button>
      </div>
      <div class="split-grid">
        <div>
          <div class="eyebrow" style="margin-bottom: 6px;">{{ t('overview.snapshotJobs') }}</div>
          <div v-if="activeJobs.length" class="stack-list">
            <div v-for="job in activeJobs" :key="job.id" class="stack-row">
              <button class="stack-row__primary" @click="openSnapshotSource(job.sourceKind, job.sourceId, job.command)">
                <strong>{{ job.name }}</strong>
                <span>{{ t('overview.everyMinutes', { value: job.intervalMinutes }) }}</span>
              </button>
              <n-tag size="small" :type="job.lastStatus === 'error' ? 'error' : job.lastStatus === 'success' ? 'success' : 'warning'">
                {{ jobStatusLabel(job.lastStatus) }}
              </n-tag>
            </div>
          </div>
          <n-empty v-else :description="t('overview.noJobs')" />
        </div>
        <div>
          <div class="eyebrow" style="margin-bottom: 6px;">{{ t('overview.recentSnapshots') }}</div>
          <div v-if="recentSnapshots.length" class="stack-list">
            <button
              v-for="snapshot in recentSnapshots"
              :key="snapshot.id"
              class="stack-row"
              @click="openSnapshotSource(snapshot.sourceKind, snapshot.sourceId, snapshot.command)"
            >
              <div>
                <strong>{{ snapshot.sourceName }}</strong>
                <span>{{ formatTime(snapshot.capturedAt) }}</span>
              </div>
              <n-tag :type="snapshot.status === 'success' ? 'success' : 'error'" size="small">{{ statusLabel(snapshot.status) }}</n-tag>
            </button>
          </div>
          <n-empty v-else :description="t('overview.noSnapshots')" />
        </div>
      </div>
    </n-card>

    <!-- 收藏 + 预设 -->
    <div class="split-grid studio-animate studio-delay-4" :class="{ 'studio-animate--visible': visible }">
      <n-card :title="t('overview.favorites')" class="glass-card">
        <div class="favorites-block">
          <div>
            <div class="eyebrow">{{ t('overview.commands') }}</div>
            <div v-if="favoriteCommands.length" class="stack-list">
              <button
                v-for="command in favoriteCommands"
                :key="command.command"
                class="stack-row"
                @click="openWorkbench(command.command)"
              >
                <div>
                  <strong>{{ command.description || command.name }}</strong>
                  <span>{{ store.getSiteDisplayName(command.site, locale) }}</span>
                </div>
                <n-tag size="small" type="info">{{ capabilityLabel(command.meta.capability) }}</n-tag>
              </button>
            </div>
            <n-empty v-else :description="t('overview.favoriteCommandsEmpty')" />
          </div>
          <div>
            <div class="eyebrow">{{ t('overview.recipes') }}</div>
            <div v-if="favoriteRecipes.length" class="stack-list">
              <button
                v-for="recipe in favoriteRecipes"
                :key="recipe.id"
                class="stack-row"
                @click="openInsight(recipe.id)"
              >
                <div>
                  <strong>{{ recipe.title }}</strong>
                  <span>{{ store.registry.commands.find(c => c.command === recipe.command)?.description || recipe.command }}</span>
                </div>
                <n-tag size="small" type="warning">{{ t('overview.recipeBadge') }}</n-tag>
              </button>
            </div>
            <n-empty v-else :description="t('overview.favoriteRecipesEmpty')" />
          </div>
        </div>
      </n-card>

      <n-card :title="t('overview.savedPresets')" class="glass-card">
        <preset-shelf
          :presets="recentPresets"
          :empty-description="t('overview.savedPresetsEmpty')"
          @apply="applyPreset"
          @remove="removePreset"
        />
      </n-card>
    </div>

    <!-- 精选配方 -->
    <n-card v-if="featuredRecipes.length" :title="t('overview.featuredRecipes')" class="glass-card studio-animate studio-delay-5" :class="{ 'studio-animate--visible': visible }">
      <div class="recipe-grid">
        <button v-for="recipe in featuredRecipes" :key="recipe.id" class="recipe-card" @click="openInsight(recipe.id)">
          <div class="eyebrow">{{ recipe.command }}</div>
          <strong>{{ recipe.title }}</strong>
          <p>{{ recipe.description }}</p>
          <div class="chip-cloud">
            <span v-for="tag in recipe.tags" :key="tag" class="chip chip--small">{{ tag }}</span>
          </div>
        </button>
      </div>
    </n-card>
  </section>
</template>
