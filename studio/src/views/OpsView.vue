<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCard, NEmpty, NSwitch, NTag, useMessage } from 'naive-ui';
import { useStudioI18n } from '../lib/i18n';
import { buildDoctorStatusRowsWithLabel, buildOpsMetrics, type OpsTone } from '../lib/ops';
import { useStudioStore } from '../stores/studio';
import type { StudioExternalCliEntry, StudioPluginEntry } from '../types';

const store = useStudioStore();
const router = useRouter();
const message = useMessage();
const { t } = useStudioI18n();

const liveMode = ref(true);
const includeSessions = ref(true);

const metrics = computed(() =>
  buildOpsMetrics({
    env: store.env,
    plugins: store.plugins,
    externalClis: store.externalClis,
    doctor: store.doctor,
    t,
  }),
);

const doctorRows = computed(() => buildDoctorStatusRowsWithLabel(store.doctor, t));
const sessions = computed(() => store.doctor?.sessions ?? []);
const unresolvedPluginCount = computed(() =>
  store.plugins.filter((plugin) => plugin.registeredCommandCount < plugin.declaredCommandCount).length,
);
const missingExternalCount = computed(() =>
  store.externalClis.filter((entry) => !entry.installed).length,
);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toneToTagType(tone: OpsTone): 'default' | 'info' | 'success' | 'warning' | 'error' {
  if (tone === 'default') return 'default';
  return tone;
}

function toneLabel(tone: OpsTone | string): string {
  if (tone === 'success') return t('common.statusSuccess');
  if (tone === 'warning') return t('common.statusWarning');
  if (tone === 'error') return t('common.statusError');
  if (tone === 'info') return t('common.statusInfo');
  return t('common.statusNeutral');
}

function pluginSourceType(plugin: StudioPluginEntry): 'default' | 'info' | 'warning' {
  if (plugin.sourceKind === 'git') return 'info';
  if (plugin.sourceKind === 'local') return 'warning';
  return 'default';
}

function pluginCoverageType(plugin: StudioPluginEntry): 'success' | 'warning' {
  return plugin.registeredCommandCount >= plugin.declaredCommandCount ? 'success' : 'warning';
}

function externalInstallType(entry: StudioExternalCliEntry): 'success' | 'warning' {
  return entry.installed ? 'success' : 'warning';
}

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : t('common.unknown');
}

function formatIdleTime(ms: number): string {
  if (ms <= 0) return t('ops.expiringNow');
  const minutes = Math.round(ms / 60000);
  if (minutes <= 1) return t('ops.aboutMinute');
  return t('ops.aboutMinutes', { value: minutes });
}

function pluginCommands(plugin: StudioPluginEntry) {
  return store.registry.commands.filter((command) => command.site === plugin.name);
}

function pluginSourceKindLabel(value: StudioPluginEntry['sourceKind']): string {
  if (value === 'git') return t('ops.sourceKind.git');
  if (value === 'local') return t('ops.sourceKind.local');
  return t('ops.sourceKind.unknown');
}

function openOpsRegistry(site?: string, surface?: 'plugin' | 'external' | 'builtin'): void {
  void router.push({
    name: 'registry',
    query: {
      ...(site ? { site } : {}),
      ...(surface ? { surface } : {}),
      ...(store.advancedMode ? { advanced: '1' } : {}),
    },
  });
}

function openWorkbench(command: string): void {
  store.setSelectedCommand(command);
  void router.push({
    name: 'workbench',
    query: {
      command,
      ...(store.advancedMode ? { advanced: '1' } : {}),
    },
  });
}

async function copyInstallCommand(command: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(command);
    message.success(t('ops.installCopied'));
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function refreshInventory(): Promise<void> {
  try {
    await store.refreshOpsInventory();
    message.success(t('ops.inventoryRefreshed'));
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function runDoctor(): Promise<void> {
  try {
    await store.runDoctor({
      live: liveMode.value,
      sessions: includeSessions.value,
    });
    message.success(t('ops.doctorCompleted'));
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}
</script>

<template>
  <section class="page-grid">
    <div class="page-inline-header">
      <h1 class="gradient-title">{{ t('routes.ops.title') }}</h1>
      <p class="page-inline-header__desc">{{ t('routes.ops.description') }}</p>
    </div>

    <n-card class="hero-card glass-card">
      <div class="hero-card__copy">
        <div class="eyebrow">{{ t('ops.eyebrow') }}</div>
        <h3 class="gradient-title">{{ t('ops.title') }}</h3>
        <p>{{ t('ops.description') }}</p>
      </div>
      <div class="card-actions">
        <label class="switch-inline topbar__switch">
          <span>{{ t('ops.liveProbe') }}</span>
          <n-switch v-model:value="liveMode" />
        </label>
        <label class="switch-inline topbar__switch">
          <span>{{ t('ops.includeSessions') }}</span>
          <n-switch v-model:value="includeSessions" />
        </label>
        <n-button tertiary :loading="store.initializing" @click="refreshInventory()">{{ t('ops.refreshInventory') }}</n-button>
        <n-button type="primary" :loading="store.runningDoctor" @click="runDoctor()">{{ t('ops.runDoctor') }}</n-button>
      </div>
      <div class="metrics-grid">
        <div v-for="metric in metrics" :key="metric.label" class="metric-tile">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <n-tag size="small" :type="toneToTagType(metric.tone)">{{ toneLabel(metric.tone) }}</n-tag>
        </div>
      </div>
    </n-card>

    <div class="split-grid">
      <n-card :title="t('ops.bridgeHealth')" class="glass-card">
        <div class="panel-note">{{ t('ops.bridgeSummary') }}</div>

        <div class="ops-status-grid">
          <div v-for="row in doctorRows" :key="row.label" class="kv-item">
            <span>{{ row.label }}</span>
            <strong>{{ row.value }}</strong>
            <n-tag size="small" :type="toneToTagType(row.tone)">{{ toneLabel(row.tone) }}</n-tag>
          </div>
        </div>

        <div v-if="store.env" class="inventory-notes">
          <div class="inventory-note">
            <span>{{ t('ops.platform') }}</span>
            <strong>{{ store.env.platform }}</strong>
          </div>
          <div class="inventory-note">
            <span>{{ t('ops.node') }}</span>
            <strong>{{ store.env.nodeVersion }}</strong>
          </div>
          <div class="inventory-note inventory-note--wide">
            <span>{{ t('ops.storage') }}</span>
            <strong>{{ store.env.storageDir }}</strong>
          </div>
        </div>

        <ol v-if="store.doctor?.issues?.length" class="issue-list">
          <li v-for="(issue, idx) in store.doctor.issues" :key="idx" class="issue-item">
            {{ issue }}
          </li>
        </ol>

        <n-empty v-if="!store.doctor" :description="t('ops.doctorEmpty')" />
      </n-card>

      <n-card :title="t('ops.activeSessions')" class="glass-card">
        <div class="panel-note">{{ t('ops.sessionsSummary') }}</div>

        <div v-if="sessions.length" class="inventory-list">
          <article v-for="session in sessions" :key="`${session.workspace}:${session.windowId}`" class="inventory-item">
            <div class="inventory-item__header">
              <div>
                <strong>{{ session.workspace }}</strong>
                <p>{{ t('ops.windowLabel', { value: session.windowId }) }}</p>
              </div>
              <div class="inventory-item__meta">
                <n-tag size="small" type="info">{{ t('ops.tabs', { value: session.tabCount }) }}</n-tag>
                <n-tag size="small" type="warning">{{ formatIdleTime(session.idleMsRemaining) }}</n-tag>
              </div>
            </div>
          </article>
        </div>
        <n-empty v-else :description="t('ops.noSessions')" />
      </n-card>
    </div>

    <n-card :title="t('ops.pluginInventory')" class="glass-card">
      <div class="card-actions card-actions--between">
        <div class="panel-note">
          {{
            unresolvedPluginCount
              ? t('ops.pluginUnresolved', { count: unresolvedPluginCount })
              : t('ops.pluginResolved')
          }}
        </div>
        <n-tag size="small" :type="unresolvedPluginCount ? 'warning' : 'success'">{{ t('ops.installedCount', { count: store.plugins.length }) }}</n-tag>
      </div>

      <div v-if="store.plugins.length" class="inventory-list">
        <article v-for="plugin in store.plugins" :key="plugin.name" class="inventory-item">
          <div class="card-actions">
            <n-button size="small" tertiary @click="openOpsRegistry(plugin.name, 'plugin')">{{ t('ops.openRegistrySlice') }}</n-button>
            <n-button
              v-if="pluginCommands(plugin).length"
              size="small"
              tertiary
              @click="openWorkbench(pluginCommands(plugin)[0].command)"
            >
              {{ pluginCommands(plugin)[0].command }}
            </n-button>
          </div>

          <div class="inventory-item__header">
            <div>
              <strong>{{ plugin.name }}</strong>
              <p>{{ plugin.description || t('common.noDescription') }}</p>
            </div>
            <div class="inventory-item__meta">
              <n-tag size="small" :type="pluginSourceType(plugin)">{{ pluginSourceKindLabel(plugin.sourceKind) }}</n-tag>
              <n-tag size="small" :type="pluginCoverageType(plugin)">
                {{ t('ops.registeredCoverage', { registered: plugin.registeredCommandCount, declared: plugin.declaredCommandCount }) }}
              </n-tag>
            </div>
          </div>

          <div class="chip-cloud">
            <span v-for="commandName in plugin.commands" :key="`${plugin.name}:${commandName}`" class="chip chip--small">
              {{ commandName }}
            </span>
            <span v-if="plugin.monorepoName" class="chip chip--small">{{ t('ops.monorepo', { value: plugin.monorepoName }) }}</span>
          </div>

          <div class="inventory-notes">
            <div class="inventory-note">
              <span>{{ t('ops.version') }}</span>
              <strong>{{ plugin.version || t('common.unknown') }}</strong>
            </div>
            <div class="inventory-note">
              <span>{{ t('ops.installed') }}</span>
              <strong>{{ formatDateTime(plugin.installedAt) }}</strong>
            </div>
            <div class="inventory-note inventory-note--wide">
              <span>{{ t('ops.source') }}</span>
              <strong>{{ plugin.source || t('common.unknown') }}</strong>
            </div>
            <div class="inventory-note inventory-note--wide">
              <span>{{ t('ops.path') }}</span>
              <strong>{{ plugin.path }}</strong>
            </div>
          </div>
        </article>
      </div>
      <n-empty v-else :description="t('ops.noPlugins')" />
    </n-card>

    <n-card :title="t('ops.externalInventory')" class="glass-card">
      <div class="card-actions card-actions--between">
        <div class="panel-note">
          {{
            missingExternalCount
              ? t('ops.missingExternal', { count: missingExternalCount })
              : t('ops.externalResolved')
          }}
        </div>
        <n-tag size="small" :type="missingExternalCount ? 'warning' : 'success'">
          {{ t('ops.registeredCount', { count: store.externalClis.length }) }}
        </n-tag>
      </div>

      <div v-if="store.externalClis.length" class="inventory-list">
        <article v-for="entry in store.externalClis" :key="entry.name" class="inventory-item">
          <div class="inventory-item__header">
            <div>
              <strong>{{ entry.name }}</strong>
              <p>{{ entry.description || t('common.noDescription') }}</p>
            </div>
            <div class="inventory-item__meta">
              <n-tag size="small" :type="externalInstallType(entry)">{{ entry.installed ? t('ops.installedState') : t('ops.missingState') }}</n-tag>
              <n-tag size="small" :type="entry.installAvailable ? 'info' : 'default'">
                {{ entry.installAvailable ? t('ops.autoInstallHint') : t('ops.manualInstall') }}
              </n-tag>
            </div>
          </div>

          <div class="chip-cloud">
            <span class="chip chip--small">{{ entry.binary }}</span>
            <span v-for="tag in entry.tags" :key="`${entry.name}:${tag}`" class="chip chip--small">{{ tag }}</span>
          </div>

          <div class="inventory-notes">
            <div class="inventory-note inventory-note--wide">
              <span>{{ t('ops.installGuidance') }}</span>
              <strong>{{ entry.installCommand || (entry.installAvailable ? t('ops.installMissingHint') : t('ops.installUnavailable')) }}</strong>
            </div>
            <div class="inventory-note inventory-note--wide">
              <span>{{ t('ops.homepage') }}</span>
              <strong v-if="entry.homepage">
                <a class="inventory-link" :href="entry.homepage" target="_blank" rel="noreferrer">{{ entry.homepage }}</a>
              </strong>
              <strong v-else>{{ t('ops.notProvided') }}</strong>
            </div>
          </div>

          <div class="card-actions">
            <n-button
              size="small"
              tertiary
              :disabled="!entry.installCommand"
              @click="entry.installCommand && copyInstallCommand(entry.installCommand)"
            >
              {{ t('ops.copyInstall') }}
            </n-button>
            <n-button
              v-if="entry.homepage"
              size="small"
              tertiary
              tag="a"
              :href="entry.homepage"
              target="_blank"
              rel="noreferrer"
            >
              {{ t('ops.openHomepage') }}
            </n-button>
          </div>
        </article>
      </div>
      <n-empty v-else :description="t('ops.noExternal')" />
    </n-card>
  </section>
</template>
