<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCard, NEmpty, NSpin, NTag } from 'naive-ui';
import { buildOverviewMetrics } from '../lib/dashboard';
import { useStudioStore } from '../stores/studio';

const store = useStudioStore();
const router = useRouter();

const metrics = computed(() => buildOverviewMetrics({
  commands: store.registry.commands,
  history: store.history,
  recipes: store.recipes,
}));

const leadingSites = computed(() => store.registry.sites.slice(0, 10));
const recentRuns = computed(() => store.history.slice(0, 6));
const featuredRecipes = computed(() => store.recipes.slice(0, 4));

async function handleDoctor(): Promise<void> {
  await store.runDoctor();
}

function openWorkbench(command?: string): void {
  void router.push({
    name: 'workbench',
    query: command ? { command } : undefined,
  });
}

function openInsight(recipeId?: string): void {
  void router.push({
    name: 'insights',
    query: recipeId ? { recipe: recipeId } : undefined,
  });
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
