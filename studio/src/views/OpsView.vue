<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCard, NCollapse, NCollapseItem, NEmpty, NSwitch, NTag, useMessage } from 'naive-ui';
import { installExternalCli as requestInstallExternalCli } from '../lib/api';
import { useStudioI18n } from '../lib/i18n';
import { buildDoctorStatusRowsWithLabel, type OpsTone } from '../lib/ops';
import { buildSiteAccessSummary, type CommandReadinessAction } from '../lib/readiness';
import { buildStatusAriaLabel, buildStatusTone, type StatusToneState } from '../lib/status-tone';
import { useStudioStore } from '../stores/studio';
import type { StudioCommandItem, StudioExternalCliEntry, StudioPluginEntry } from '../types';

const store = useStudioStore();
const router = useRouter();
const message = useMessage();
const { locale, t } = useStudioI18n();

const liveMode = ref(true);
const includeSessions = ref(true);
const installingExternalName = ref<string | null>(null);

const doctorRows = computed(() => buildDoctorStatusRowsWithLabel(store.doctor, t));
const sessions = computed(() => store.doctor?.sessions ?? []);
const unresolvedPluginCount = computed(() =>
  store.plugins.filter((plugin) => plugin.registeredCommandCount < plugin.declaredCommandCount).length,
);
const missingExternalCount = computed(() =>
  store.externalClis.filter((entry) => !entry.installed).length,
);
const browserSites = computed(() =>
  store.siteGroups
    .filter((group) => group.commands.some((command) => command.meta.mode === 'browser'))
    .slice(0, 12),
);
type StartStatusCard = {
  key: string;
  label: string;
  value: string;
  tone: OpsTone;
};
const siteStatusCards = computed(() =>
  browserSites.value.map((group) => ({
    site: group.site,
    displayName: store.getSiteDisplayName(group.site, locale.value),
    summary: buildSiteAccessSummary({
      siteAccess: store.getSiteAccess(group.site),
      siteLabel: store.getSiteDisplayName(group.site, locale.value),
      t,
    }),
    firstCommand: group.commands[0]?.command ?? '',
  })),
);
const missingExternals = computed(() =>
  store.externalClis.filter((entry) => !entry.installed),
);
const startStatusCards = computed<StartStatusCard[]>(() => [
  {
    key: 'doctor',
    label: t('ops.startStatusReady'),
    value: store.doctor
      ? (store.doctor.issues?.length ? t('ops.startStatusIssues', { count: store.doctor.issues.length }) : t('ops.startStatusHealthy'))
      : t('ops.startStatusPending'),
    tone: store.doctor ? (store.doctor.issues?.length ? 'warning' : 'success') : 'info',
  },
  {
    key: 'browser',
    label: t('ops.startStatusBrowser'),
    value: t('ops.startStatusBrowserValue', { count: store.env?.browserCommandCount ?? 0 }),
    tone: 'info' as const,
  },
  {
    key: 'signin',
    label: t('ops.startStatusSignIn'),
    value: t('ops.startStatusSignInValue', {
      count: siteStatusCards.value.filter((item) => item.summary?.tone === 'warning' || item.summary?.tone === 'error').length,
    }),
    tone: siteStatusCards.value.some((item) => item.summary?.tone === 'warning' || item.summary?.tone === 'error') ? 'warning' : 'success',
  },
  {
    key: 'external',
    label: t('ops.startStatusExternal'),
    value: missingExternalCount.value
      ? t('ops.startStatusExternalMissing', { count: missingExternalCount.value })
      : t('ops.startStatusExternalReady'),
    tone: missingExternalCount.value ? 'warning' : 'success',
  },
]);

watch(browserSites, (groups) => {
  void store.ensureSiteAccess(groups.map((group) => group.site));
}, { immediate: true });

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

function statusSurfaceClasses(status: StatusToneState | null, input?: { prominent?: boolean }): string[] {
  if (!status) return [];
  return [
    'status-surface',
    `status-surface--${status.tone}`,
    ...(input?.prominent ? ['status-surface--prominent'] : []),
  ];
}

function toneStatus(tone: OpsTone, label: string, detail: string | null = null): StatusToneState {
  return {
    tone: tone === 'default' ? 'info' : tone,
    label,
    detail,
    blocking: tone === 'error',
  };
}

function statusAriaLabel(status: StatusToneState, subject: string): string {
  return buildStatusAriaLabel(status, subject);
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

function findCommand(commandName: string): StudioCommandItem | null {
  return store.registry.commands.find((item) => item.command === commandName) ?? null;
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

function openWorkbench(command: string, args: Record<string, unknown> = {}): void {
  store.setSelectedCommand(command);
  store.stageWorkbenchArgs(args);
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
    await store.ensureSiteAccess(browserSites.value.map((group) => group.site), true);
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
    await store.ensureSiteAccess(browserSites.value.map((group) => group.site), true);
    message.success(t('ops.doctorCompleted'));
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function refreshSiteAccess(site: string): Promise<void> {
  try {
    await store.ensureSiteAccess([site], true);
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function handleReadinessAction(action: CommandReadinessAction, site?: string): Promise<void> {
  try {
    if (action.type === 'run-doctor') {
      await runDoctor();
      return;
    }

    if (action.type === 'open-ops') {
      return;
    }

    if (action.type === 'open-command' && action.command) {
      openWorkbench(action.command, action.args ?? {});
      return;
    }

    if (action.type === 'run-command' && action.command) {
      await store.runCommand(action.command, action.args ?? {});
      await store.refreshHistory();
      const nextCommand = findCommand(action.command);
      await store.ensureSiteAccess([site || nextCommand?.site || ''].filter(Boolean), true);
      message.success(t('readiness.actionCompleted'));
      return;
    }

    if (action.type === 'install-external' && action.externalName) {
      await requestInstallExternalCli(action.externalName);
      await store.refreshOpsInventory();
      message.success(t('readiness.installSuccess', { value: action.externalName }));
      return;
    }

    if (action.type === 'open-url' && action.url) {
      window.open(action.url, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function installExternal(entry: StudioExternalCliEntry): Promise<void> {
  if (entry.installed) return;
  if (!entry.installAvailable) {
    if (entry.homepage) {
      window.open(entry.homepage, '_blank', 'noopener,noreferrer');
      return;
    }
    message.error(t('ops.installUnavailable'));
    return;
  }

  installingExternalName.value = entry.name;
  try {
    await requestInstallExternalCli(entry.name);
    await store.refreshOpsInventory();
    message.success(t('ops.installSuccess', { value: entry.name }));
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    installingExternalName.value = null;
  }
}
</script>

<template>
  <section class="page-grid">
    <div class="page-inline-header page-inline-header--compact">
      <h1 class="gradient-title">{{ t('routes.ops.title') }}</h1>
    </div>

    <n-card class="glass-card ops-toolbar-card">
      <div class="ops-toolbar">
        <div class="panel-note ops-toolbar__hint">{{ t('ops.summary') }}</div>
        <div class="card-actions ops-toolbar__actions">
          <label class="switch-inline ops-toolbar__switch">
            <span>{{ t('ops.liveProbe') }}</span>
            <n-switch v-model:value="liveMode" />
          </label>
          <label class="switch-inline ops-toolbar__switch">
            <span>{{ t('ops.includeSessions') }}</span>
            <n-switch v-model:value="includeSessions" />
          </label>
          <n-button tertiary :loading="store.initializing" @click="refreshInventory()">{{ t('ops.refreshInventory') }}</n-button>
          <n-button type="primary" :loading="store.runningDoctor" @click="runDoctor()">{{ t('ops.runDoctor') }}</n-button>
        </div>
      </div>
    </n-card>

    <div class="split-grid checks-grid">
      <n-card :title="t('ops.startStatusTitle')" class="glass-card">
        <div class="panel-note">{{ t('ops.startStatusDescription') }}</div>
        <div class="checks-start-grid">
          <div
            v-for="item in startStatusCards"
            :key="item.key"
            class="metric-tile checks-start-tile"
            :class="statusSurfaceClasses(toneStatus(item.tone, item.value))"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <n-tag size="small" :type="toneToTagType(item.tone)">{{ toneLabel(item.tone) }}</n-tag>
          </div>
        </div>
      </n-card>

      <n-card :title="t('ops.bridgeHealth')" class="glass-card">
        <div class="panel-note">{{ t('ops.bridgeSummary') }}</div>
        <div v-if="store.doctor" class="ops-status-grid">
          <div v-for="row in doctorRows" :key="row.label" class="kv-item">
            <span>{{ row.label }}</span>
            <strong>{{ row.value }}</strong>
            <n-tag size="small" :type="toneToTagType(row.tone)">{{ toneLabel(row.tone) }}</n-tag>
          </div>
        </div>
        <n-empty v-else :description="t('ops.doctorEmpty')" />

        <div v-if="store.env" class="inventory-notes checks-meta-notes">
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
      </n-card>
    </div>

    <div class="split-grid checks-grid">
      <n-card :title="t('ops.siteMatrixTitle')" class="glass-card">
        <div class="card-actions card-actions--between">
          <div class="panel-note">{{ t('ops.signInMatrixSummary') }}</div>
          <n-button size="small" tertiary @click="store.ensureSiteAccess(browserSites.map((group) => group.site), true)">
            {{ t('ops.refreshSiteMatrix') }}
          </n-button>
        </div>

        <div v-if="siteStatusCards.length" class="checks-site-grid">
          <article
            v-for="item in siteStatusCards"
            :key="item.site"
            class="inventory-item checks-site-card"
            :class="statusSurfaceClasses(buildStatusTone({ availability: item.summary, risk: 'safe', t }), { prominent: true })"
            :aria-label="statusAriaLabel(buildStatusTone({ availability: item.summary, risk: 'safe', t }), item.displayName)"
          >
            <div class="inventory-item__header">
              <div class="checks-site-card__headline">
                <div>
                  <strong>{{ item.displayName }}</strong>
                  <p>
                    {{
                      store.isSiteAccessLoading(item.site)
                        ? t('ops.sitePending')
                        : item.summary?.label || t('ops.sitePending')
                    }}
                  </p>
                </div>
              </div>
              <n-tag
                size="small"
                :type="toneToTagType((item.summary?.tone || 'info') as OpsTone)"
              >
                {{ toneLabel(item.summary?.tone || 'info') }}
              </n-tag>
            </div>

            <p class="checks-site-card__detail">
              {{
                store.isSiteAccessLoading(item.site)
                  ? t('ops.sitePending')
                  : item.summary?.detail || t('ops.sitePending')
              }}
            </p>

            <div class="card-actions">
              <n-button
                v-if="item.summary?.action"
                size="small"
                type="primary"
                @click="handleReadinessAction(item.summary.action, item.site)"
              >
                {{ item.summary.action.label }}
              </n-button>
              <n-button size="small" tertiary @click="refreshSiteAccess(item.site)">{{ t('ops.refreshSite') }}</n-button>
              <n-button size="small" tertiary @click="openOpsRegistry(item.site)">{{ t('ops.openRegistrySlice') }}</n-button>
            </div>
          </article>
        </div>
        <n-empty v-else :description="t('ops.signInMatrixEmpty')" />
      </n-card>

      <n-card :title="t('ops.dependencyFixTitle')" class="glass-card">
        <div class="card-actions card-actions--between">
          <div class="panel-note">
            {{
              missingExternalCount
                ? t('ops.missingExternal', { count: missingExternalCount })
                : t('ops.noMissingDependencies')
            }}
          </div>
          <n-tag size="small" :type="missingExternalCount ? 'warning' : 'success'">
            {{ t('ops.registeredCount', { count: store.externalClis.length }) }}
          </n-tag>
        </div>

        <div v-if="missingExternals.length" class="inventory-list">
          <article v-for="entry in missingExternals" :key="entry.name" class="inventory-item">
            <div class="inventory-item__header">
              <div>
                <strong>{{ entry.name }}</strong>
                <p>{{ entry.description || t('common.noDescription') }}</p>
              </div>
              <div class="inventory-item__meta">
                <n-tag size="small" :type="externalInstallType(entry)">{{ t('ops.missingState') }}</n-tag>
                <n-tag size="small" :type="entry.installAvailable ? 'info' : 'default'">
                  {{ entry.installAvailable ? t('ops.autoInstallHint') : t('ops.manualInstall') }}
                </n-tag>
              </div>
            </div>

            <div class="inventory-notes">
              <div class="inventory-note inventory-note--wide">
                <span>{{ t('ops.installGuidance') }}</span>
                <strong>{{ entry.installCommand || (entry.installAvailable ? t('ops.installMissingHint') : t('ops.installUnavailable')) }}</strong>
              </div>
              <div class="inventory-note">
                <span>{{ t('ops.homepage') }}</span>
                <strong v-if="entry.homepage">
                  <a class="inventory-link" :href="entry.homepage" target="_blank" rel="noreferrer">{{ entry.homepage }}</a>
                </strong>
                <strong v-else>{{ t('ops.notProvided') }}</strong>
              </div>
              <div class="inventory-note">
                <span>{{ t('ops.path') }}</span>
                <strong>{{ entry.binary }}</strong>
              </div>
            </div>

            <div class="card-actions">
              <n-button
                size="small"
                type="primary"
                :disabled="!entry.installAvailable && !entry.homepage"
                :loading="installingExternalName === entry.name"
                @click="installExternal(entry)"
              >
                {{ entry.installAvailable ? t('ops.installNow') : t('ops.openHomepage') }}
              </n-button>
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
        <n-empty v-else :description="t('ops.noMissingDependencies')" />
      </n-card>
    </div>

    <n-card :title="t('ops.advancedDiagnostics')" class="glass-card">
      <n-collapse>
        <n-collapse-item :title="t('ops.rawDoctor')" name="doctor">
          <pre v-if="store.doctor" class="json-block">{{ JSON.stringify(store.doctor, null, 2) }}</pre>
          <n-empty v-else :description="t('ops.doctorEmpty')" />
        </n-collapse-item>

        <n-collapse-item :title="t('ops.activeSessions')" name="sessions">
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
        </n-collapse-item>

        <n-collapse-item :title="t('ops.pluginInventory')" name="plugins">
          <div class="card-actions card-actions--between">
            <div class="panel-note">
              {{
                unresolvedPluginCount
                  ? t('ops.pluginUnresolved', { count: unresolvedPluginCount })
                  : t('ops.pluginResolved')
              }}
            </div>
            <n-tag size="small" :type="unresolvedPluginCount ? 'warning' : 'success'">
              {{ t('ops.installedCount', { count: store.plugins.length }) }}
            </n-tag>
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
                  {{ t('ops.openFirstCommand') }}
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
        </n-collapse-item>

        <n-collapse-item :title="t('ops.externalInventory')" name="external">
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
            </article>
          </div>
          <n-empty v-else :description="t('ops.noExternal')" />
        </n-collapse-item>
      </n-collapse>
    </n-card>
  </section>
</template>
