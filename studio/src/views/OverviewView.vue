<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCard, NEmpty, NSpin, NTag, useMessage } from 'naive-ui';
import PresetShelf from '../components/PresetShelf.vue';
import { buildOverviewMetrics } from '../lib/dashboard';
import { buildInsightQuery, buildRegistryQuery, buildWorkbenchQuery } from '../lib/routes';
import { readInsightPresetState, readRegistryPresetState, readWorkbenchPresetState } from '../lib/preset-state';
import { useStudioStore } from '../stores/studio';
import type { StudioPresetEntry } from '../types';

const store = useStudioStore();
const router = useRouter();
const message = useMessage();

const metrics = computed(() => buildOverviewMetrics({
  commands: store.registry.commands,
  history: store.history,
  recipes: store.recipes,
}));

const leadingSites = computed(() => store.registry.sites.slice(0, 10));
const recentRuns = computed(() => store.history.slice(0, 6));
const featuredRecipes = computed(() => store.recipes.slice(0, 4));
const favoriteCommands = computed(() =>
  store.registry.commands.filter((command) => store.favoriteCommandIds.has(command.command)).slice(0, 5),
);
const favoriteRecipes = computed(() =>
  store.recipes.filter((recipe) => store.favoriteRecipeIds.has(recipe.id)).slice(0, 5),
);
const recentPresets = computed(() => store.presets.slice(0, 6));

async function handleDoctor(): Promise<void> {
  await store.runDoctor();
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
    await router.push({
      name: 'registry',
      query: buildRegistryQuery(state),
    });
    return;
  }

  if (preset.kind === 'workbench') {
    const state = readWorkbenchPresetState(preset.state);
    store.setAdvancedMode(state.advancedMode);
    store.setSelectedCommand(state.command);
    store.stageWorkbenchArgs(state.args);
    await router.push({
      name: 'workbench',
      query: buildWorkbenchQuery({
        command: state.command,
        advancedMode: state.advancedMode,
      }),
    });
    return;
  }

  const state = readInsightPresetState(preset.state);
  store.setAdvancedMode(state.advancedMode);
  store.setSelectedRecipe(state.recipeId);
  store.stageInsightArgs(state.args);
  await router.push({
    name: 'insights',
    query: buildInsightQuery({
      recipeId: state.recipeId,
      advancedMode: state.advancedMode,
    }),
  });
}

async function removePreset(preset: StudioPresetEntry): Promise<void> {
  const proceed = window.confirm(`Delete preset "${preset.name}"?`);
  if (!proceed) return;
  await store.deletePreset(preset.id);
  message.success(`Deleted preset "${preset.name}"`);
}
</script>

<template>
  <section class="page-grid">
    <n-card class="hero-card">
      <div class="hero-card__copy">
        <div class="eyebrow">Contributor cockpit</div>
        <h3>OpenCLI Studio makes the existing CLI registry legible, runnable, and analysable.</h3>
        <p>
          The web surface stays local-first: browse the full registry, execute commands with form-driven inputs,
          and promote high-value trend workflows into recipe pages without weakening the current CLI model.
        </p>
      </div>
      <div class="hero-card__actions">
        <n-button type="primary" size="large" @click="openWorkbench(store.selectedCommand)">Open Workbench</n-button>
        <n-button tertiary size="large" @click="openInsight()">Open Insights</n-button>
        <n-button quaternary size="large" :loading="store.runningDoctor" @click="handleDoctor()">Run Doctor</n-button>
      </div>
      <div class="metrics-grid">
        <div class="metric-tile">
          <span>Total commands</span>
          <strong>{{ metrics.totalCommands }}</strong>
        </div>
        <div class="metric-tile">
          <span>Browser-backed</span>
          <strong>{{ metrics.browserCommands }}</strong>
        </div>
        <div class="metric-tile">
          <span>Public-safe</span>
          <strong>{{ metrics.publicCommands }}</strong>
        </div>
        <div class="metric-tile">
          <span>Recipes</span>
          <strong>{{ metrics.recipes }}</strong>
        </div>
      </div>
    </n-card>

    <div class="split-grid">
      <n-card title="Environment" class="glass-card">
        <div v-if="store.env" class="kv-grid">
          <div class="kv-item">
            <span>Platform</span>
            <strong>{{ store.env.platform }}</strong>
          </div>
          <div class="kv-item">
            <span>Node</span>
            <strong>{{ store.env.nodeVersion }}</strong>
          </div>
          <div class="kv-item">
            <span>Storage</span>
            <strong>{{ store.env.storageDir }}</strong>
          </div>
          <div class="kv-item">
            <span>Command surface</span>
            <strong>{{ store.env.commandCount }} total / {{ store.env.browserCommandCount }} browser</strong>
          </div>
        </div>
        <n-spin :show="store.runningDoctor">
          <div v-if="store.doctor" class="doctor-block">
            <pre class="json-block">{{ JSON.stringify(store.doctor, null, 2) }}</pre>
          </div>
          <n-empty v-else description="Doctor has not been run in this session." />
        </n-spin>
      </n-card>

      <n-card title="Recent Activity" class="glass-card">
        <div v-if="recentRuns.length" class="stack-list">
          <button v-for="entry in recentRuns" :key="entry.id" class="stack-row" @click="openWorkbench(entry.command)">
            <div>
              <strong>{{ entry.command }}</strong>
              <span>{{ entry.startedAt }}</span>
            </div>
            <div class="stack-row__meta">
              <n-tag :type="entry.status === 'success' ? 'success' : 'error'" size="small">{{ entry.status }}</n-tag>
              <span>{{ entry.durationMs }} ms</span>
            </div>
          </button>
        </div>
        <n-empty v-else description="No runs captured yet." />
      </n-card>
    </div>

    <div class="split-grid">
      <n-card title="Favorites" class="glass-card">
        <div class="favorites-block">
          <div>
            <div class="eyebrow">Commands</div>
            <div v-if="favoriteCommands.length" class="stack-list">
              <button
                v-for="command in favoriteCommands"
                :key="command.command"
                class="stack-row"
                @click="openWorkbench(command.command)"
              >
                <div>
                  <strong>{{ command.command }}</strong>
                  <span>{{ command.description || command.site }}</span>
                </div>
                <n-tag size="small" type="info">{{ command.meta.capability }}</n-tag>
              </button>
            </div>
            <n-empty v-else description="Favorite commands will appear here." />
          </div>

          <div>
            <div class="eyebrow">Recipes</div>
            <div v-if="favoriteRecipes.length" class="stack-list">
              <button
                v-for="recipe in favoriteRecipes"
                :key="recipe.id"
                class="stack-row"
                @click="openInsight(recipe.id)"
              >
                <div>
                  <strong>{{ recipe.title }}</strong>
                  <span>{{ recipe.command }}</span>
                </div>
                <n-tag size="small" type="warning">recipe</n-tag>
              </button>
            </div>
            <n-empty v-else description="Favorite recipes will appear here." />
          </div>
        </div>
      </n-card>

      <n-card title="Saved Presets" class="glass-card">
        <preset-shelf
          :presets="recentPresets"
          empty-description="Save Registry views, Workbench setups, or Insight recipe states to reuse them here."
          @apply="applyPreset"
          @remove="removePreset"
        />
      </n-card>
    </div>

    <div class="split-grid">
      <n-card title="Registry Shape" class="glass-card">
        <div class="chip-cloud">
          <button v-for="site in leadingSites" :key="site.site" class="chip" @click="router.push({ name: 'registry', query: { site: site.site } })">
            <span>{{ site.site }}</span>
            <strong>{{ site.commandCount }}</strong>
          </button>
        </div>
      </n-card>

      <n-card title="Featured Recipes" class="glass-card">
        <div v-if="featuredRecipes.length" class="recipe-grid">
          <button v-for="recipe in featuredRecipes" :key="recipe.id" class="recipe-card" @click="openInsight(recipe.id)">
            <div class="eyebrow">{{ recipe.command }}</div>
            <strong>{{ recipe.title }}</strong>
            <p>{{ recipe.description }}</p>
            <div class="chip-cloud">
              <span v-for="tag in recipe.tags" :key="tag" class="chip chip--small">{{ tag }}</span>
            </div>
          </button>
        </div>
        <n-empty v-else description="No recipes available for the current registry." />
      </n-card>
    </div>
  </section>
</template>
