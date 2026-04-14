<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCard, NEmpty, NSwitch, NTag, useMessage } from 'naive-ui';
import { buildDoctorStatusRows, buildOpsMetrics, type OpsTone } from '../lib/ops';
import { useStudioStore } from '../stores/studio';
import type { StudioExternalCliEntry, StudioPluginEntry } from '../types';

const store = useStudioStore();
const router = useRouter();
const message = useMessage();

const liveMode = ref(true);
const includeSessions = ref(true);

const metrics = computed(() =>
  buildOpsMetrics({
    env: store.env,
    plugins: store.plugins,
    externalClis: store.externalClis,
    doctor: store.doctor,
  }),
);

const doctorRows = computed(() => buildDoctorStatusRows(store.doctor));
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
  return value ? new Date(value).toLocaleString() : 'Unknown';
}

function formatIdleTime(ms: number): string {
  if (ms <= 0) return 'expiring now';
  const minutes = Math.round(ms / 60000);
  if (minutes <= 1) return 'about 1 minute';
  return `about ${minutes} minutes`;
}

function pluginCommands(plugin: StudioPluginEntry) {
  return store.registry.commands.filter((command) => command.site === plugin.name);
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
    message.success('Install command copied');
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function refreshInventory(): Promise<void> {
  try {
    await store.refreshOpsInventory();
    message.success('Ops inventory refreshed');
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
    message.success('Doctor run completed');
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}
</script>

<template>
  <section class="page-grid">
    <n-card class="hero-card glass-card">
      <div class="hero-card__copy">
        <div class="eyebrow">Ops console</div>
        <h3>Inspect the local bridge, classify extension-backed surfaces, and audit plugin or external dependencies.</h3>
        <p>
          This page stays contributor-focused: it does not replace the CLI lifecycle, but it makes local availability,
          browser connectivity, and extension-dependent command families visible before a run fails.
        </p>
      </div>
      <div class="card-actions">
        <label class="switch-inline topbar__switch">
          <span>Live probe</span>
          <n-switch v-model:value="liveMode" />
        </label>
        <label class="switch-inline topbar__switch">
          <span>Include sessions</span>
          <n-switch v-model:value="includeSessions" />
        </label>
        <n-button tertiary :loading="store.initializing" @click="refreshInventory()">Refresh Inventory</n-button>
        <n-button type="primary" :loading="store.runningDoctor" @click="runDoctor()">Run Doctor</n-button>
      </div>
      <div class="metrics-grid">
        <div v-for="metric in metrics" :key="metric.label" class="metric-tile">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <n-tag size="small" :type="toneToTagType(metric.tone)">{{ metric.tone }}</n-tag>
        </div>
      </div>
    </n-card>

    <div class="split-grid">
      <n-card title="Bridge Health" class="glass-card">
        <div class="panel-note">
          Run the browser doctor with optional live probing and session discovery to check whether browser-backed
          commands can execute from Studio.
        </div>

        <div class="ops-status-grid">
          <div v-for="row in doctorRows" :key="row.label" class="kv-item">
            <span>{{ row.label }}</span>
            <strong>{{ row.value }}</strong>
            <n-tag size="small" :type="toneToTagType(row.tone)">{{ row.tone }}</n-tag>
          </div>
        </div>

        <div v-if="store.env" class="inventory-notes">
          <div class="inventory-note">
            <span>Platform</span>
            <strong>{{ store.env.platform }}</strong>
          </div>
          <div class="inventory-note">
            <span>Node</span>
            <strong>{{ store.env.nodeVersion }}</strong>
          </div>
          <div class="inventory-note inventory-note--wide">
            <span>Storage</span>
            <strong>{{ store.env.storageDir }}</strong>
          </div>
        </div>

        <div v-if="store.doctor?.issues?.length" class="issue-list">
          <div v-for="issue in store.doctor.issues" :key="issue" class="issue-item">
            <strong>Issue</strong>
            <span>{{ issue }}</span>
          </div>
        </div>

        <pre v-if="store.doctor" class="json-block">{{ JSON.stringify(store.doctor, null, 2) }}</pre>
        <n-empty v-else description="Doctor has not been run in this session." />
      </n-card>

      <n-card title="Active Sessions" class="glass-card">
        <div class="panel-note">
          These sessions come from the local extension bridge. They indicate which browser contexts Studio can likely reach.
        </div>

        <div v-if="sessions.length" class="inventory-list">
          <article v-for="session in sessions" :key="`${session.workspace}:${session.windowId}`" class="inventory-item">
            <div class="inventory-item__header">
              <div>
                <strong>{{ session.workspace }}</strong>
                <p>Window {{ session.windowId }}</p>
              </div>
              <div class="inventory-item__meta">
                <n-tag size="small" type="info">{{ session.tabCount }} tabs</n-tag>
                <n-tag size="small" type="warning">{{ formatIdleTime(session.idleMsRemaining) }}</n-tag>
              </div>
            </div>
          </article>
        </div>
        <n-empty v-else description="No sessions were returned. Enable session discovery and run doctor again." />
      </n-card>
    </div>

    <n-card title="Plugin Inventory" class="glass-card">
      <div class="card-actions card-actions--between">
        <div class="panel-note">
          {{
            unresolvedPluginCount
              ? `${unresolvedPluginCount} plugin(s) declare more commands than the registry currently exposes.`
              : 'Installed plugins are represented in the registry inventory.'
          }}
        </div>
        <n-tag size="small" :type="unresolvedPluginCount ? 'warning' : 'success'">{{ store.plugins.length }} installed</n-tag>
      </div>

      <div v-if="store.plugins.length" class="inventory-list">
        <article v-for="plugin in store.plugins" :key="plugin.name" class="inventory-item">
          <div class="card-actions">
            <n-button size="small" tertiary @click="openOpsRegistry(plugin.name, 'plugin')">Open Registry Slice</n-button>
            <n-button
              size="small"
              tertiary
              :disabled="pluginCommands(plugin)[0] == null"
              @click="pluginCommands(plugin)[0] && openWorkbench(pluginCommands(plugin)[0].command)"
            >
              Open First Command
            </n-button>
          </div>

          <div class="inventory-item__header">
            <div>
              <strong>{{ plugin.name }}</strong>
              <p>{{ plugin.description || 'No plugin description available.' }}</p>
            </div>
            <div class="inventory-item__meta">
              <n-tag size="small" :type="pluginSourceType(plugin)">{{ plugin.sourceKind }}</n-tag>
              <n-tag size="small" :type="pluginCoverageType(plugin)">
                {{ plugin.registeredCommandCount }} / {{ plugin.declaredCommandCount }} registered
              </n-tag>
            </div>
          </div>

          <div class="chip-cloud">
            <span v-for="commandName in plugin.commands" :key="`${plugin.name}:${commandName}`" class="chip chip--small">
              {{ commandName }}
            </span>
            <span v-if="plugin.monorepoName" class="chip chip--small">monorepo {{ plugin.monorepoName }}</span>
          </div>

          <div class="inventory-notes">
            <div class="inventory-note">
              <span>Version</span>
              <strong>{{ plugin.version || 'Unknown' }}</strong>
            </div>
            <div class="inventory-note">
              <span>Installed</span>
              <strong>{{ formatDateTime(plugin.installedAt) }}</strong>
            </div>
            <div class="inventory-note inventory-note--wide">
              <span>Source</span>
              <strong>{{ plugin.source || 'Unknown' }}</strong>
            </div>
            <div class="inventory-note inventory-note--wide">
              <span>Path</span>
              <strong>{{ plugin.path }}</strong>
            </div>
          </div>
        </article>
      </div>
      <n-empty v-else description="No installed plugins were detected." />
    </n-card>

    <n-card title="External CLI Inventory" class="glass-card">
      <div class="card-actions card-actions--between">
        <div class="panel-note">
          {{
            missingExternalCount
              ? `${missingExternalCount} external CLI dependency or helper tool is not installed in this environment.`
              : 'All registered external CLIs are installed in this environment.'
          }}
        </div>
        <n-tag size="small" :type="missingExternalCount ? 'warning' : 'success'">
          {{ store.externalClis.length }} registered
        </n-tag>
      </div>

      <div v-if="store.externalClis.length" class="inventory-list">
        <article v-for="entry in store.externalClis" :key="entry.name" class="inventory-item">
          <div class="inventory-item__header">
            <div>
              <strong>{{ entry.name }}</strong>
              <p>{{ entry.description || 'No external CLI description available.' }}</p>
            </div>
            <div class="inventory-item__meta">
              <n-tag size="small" :type="externalInstallType(entry)">{{ entry.installed ? 'installed' : 'missing' }}</n-tag>
              <n-tag size="small" :type="entry.installAvailable ? 'info' : 'default'">
                {{ entry.installAvailable ? 'auto-install hint' : 'manual install' }}
              </n-tag>
            </div>
          </div>

          <div class="chip-cloud">
            <span class="chip chip--small">{{ entry.binary }}</span>
            <span v-for="tag in entry.tags" :key="`${entry.name}:${tag}`" class="chip chip--small">{{ tag }}</span>
          </div>

          <div class="inventory-notes">
            <div class="inventory-note inventory-note--wide">
              <span>Install guidance</span>
              <strong>{{ entry.installCommand || (entry.installAvailable ? 'Install command not resolved for this platform.' : 'No automatic install command is registered.') }}</strong>
            </div>
            <div class="inventory-note inventory-note--wide">
              <span>Homepage</span>
              <strong v-if="entry.homepage">
                <a class="inventory-link" :href="entry.homepage" target="_blank" rel="noreferrer">{{ entry.homepage }}</a>
              </strong>
              <strong v-else>Not provided</strong>
            </div>
          </div>

          <div class="card-actions">
            <n-button
              size="small"
              tertiary
              :disabled="!entry.installCommand"
              @click="entry.installCommand && copyInstallCommand(entry.installCommand)"
            >
              Copy Install Command
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
              Open Homepage
            </n-button>
          </div>
        </article>
      </div>
      <n-empty v-else description="No external CLI entries are registered." />
    </n-card>
  </section>
</template>
