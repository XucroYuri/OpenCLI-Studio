<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NEmpty, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, NTag, useMessage } from 'naive-ui';
import PresetShelf from '../components/PresetShelf.vue';
import ResultPanel from '../components/ResultPanel.vue';
import SavePresetButton from '../components/SavePresetButton.vue';
import { buildResultComparison } from '../lib/compare';
import { useStudioI18n } from '../lib/i18n';
import { buildWorkbenchPresetState, readWorkbenchPresetState } from '../lib/preset-state';
import { buildCommandReadiness } from '../lib/readiness';
import { pickDefaultWorkbenchCommand } from '../lib/registry';
import { buildWorkbenchQuery, parseWorkbenchQuery } from '../lib/routes';
import { useStudioStore } from '../stores/studio';
import type { StudioCommandArg, StudioHistoryEntry, StudioPresetEntry } from '../types';

const store = useStudioStore();
const route = useRoute();
const router = useRouter();
const message = useMessage();
const { t } = useStudioI18n();

const formModel = reactive<Record<string, any>>({});
const pendingFormArgs = ref<Record<string, unknown> | null>(store.consumeWorkbenchArgs());
const leftRunId = ref<number | null>(null);
const rightRunId = ref<number | null>(null);

const initialWorkbenchState = parseWorkbenchQuery(route.query);
if (Object.prototype.hasOwnProperty.call(route.query, 'advanced')) {
  store.setAdvancedMode(initialWorkbenchState.advancedMode);
}

const commandOptions = computed(() =>
  store.availableWorkbenchCommands.map((command) => ({
    label: command.command,
    value: command.command,
  })),
);

const selectedCommandName = computed({
  get: () => {
    const routeState = parseWorkbenchQuery(route.query);
    const preferredCommand = routeState.command || store.selectedCommand;
    return pickDefaultWorkbenchCommand(store.registry.commands, preferredCommand, store.advancedMode);
  },
  set: (value: string) => {
    store.setSelectedCommand(value);
    void router.replace({
      query: buildWorkbenchQuery({
        command: value,
        advancedMode: store.advancedMode,
      }),
    });
  },
});

const command = computed(() =>
  store.registry.commands.find((item) => item.command === selectedCommandName.value) ?? null,
);

const recentRuns = computed(() =>
  store.history.filter((entry) => entry.command === selectedCommandName.value).slice(0, 5),
);
const runOptions = computed(() =>
  recentRuns.value.map((entry) => ({
    label: `${new Date(entry.startedAt).toLocaleString()} · ${entry.status}`,
    value: entry.id,
  })),
);
const isFavoriteCommand = computed(() =>
  command.value ? store.favoriteCommandIds.has(command.value.command) : false,
);
const comparedLeftRun = computed(() =>
  recentRuns.value.find((entry) => entry.id === leftRunId.value) ?? null,
);
const comparedRightRun = computed(() =>
  recentRuns.value.find((entry) => entry.id === rightRunId.value) ?? null,
);
const runComparisonResult = computed(() => {
  if (!comparedLeftRun.value || !comparedRightRun.value) return undefined;
  return buildResultComparison(comparedLeftRun.value.result, comparedRightRun.value.result);
});
const commandSnapshots = computed(() =>
  command.value ? store.snapshotsBySource[`command:${command.value.command}`] ?? [] : [],
);
const commandReadiness = computed(() =>
  buildCommandReadiness({
    command: command.value,
    doctor: store.doctor,
    plugins: store.plugins,
  }),
);

function inferFieldKind(arg: StudioCommandArg): 'select' | 'number' | 'boolean' | 'text' {
  if (arg.choices?.length) return 'select';

  const normalizedType = String(arg.type ?? '').toLowerCase();
  if (normalizedType.includes('bool') || typeof arg.default === 'boolean') return 'boolean';
  if (normalizedType.includes('int') || normalizedType.includes('number') || normalizedType.includes('float') || typeof arg.default === 'number') {
    return 'number';
  }

  return 'text';
}

function normalizeInputValue(value: unknown): string | number | boolean {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return JSON.stringify(value);
}

function resetForm(commandName: string | null): void {
  for (const key of Object.keys(formModel)) {
    delete formModel[key];
  }

  const commandItem = store.registry.commands.find((item) => item.command === commandName);
  if (!commandItem) return;

  for (const arg of commandItem.args) {
    if (arg.default !== undefined) {
      formModel[arg.name] = normalizeInputValue(arg.default);
      continue;
    }

    const fieldKind = inferFieldKind(arg);
    formModel[arg.name] = fieldKind === 'boolean' ? false : '';
  }
}

function applyArgsToForm(args: Record<string, unknown>): void {
  if (!command.value) return;

  for (const arg of command.value.args) {
    if (Object.prototype.hasOwnProperty.call(args, arg.name)) {
      formModel[arg.name] = normalizeInputValue(args[arg.name]);
    }
  }
}

function queueArgs(args: Record<string, unknown>): void {
  pendingFormArgs.value = { ...args };
}

watch(command, (nextCommand) => {
  if (nextCommand) {
    void store.refreshSnapshots('command', nextCommand.command);
  }
  resetForm(nextCommand?.command ?? null);
  if (pendingFormArgs.value) {
    applyArgsToForm(pendingFormArgs.value);
    pendingFormArgs.value = null;
  }
}, { immediate: true });

watch(recentRuns, (runs) => {
  if (!runs.length) {
    leftRunId.value = null;
    rightRunId.value = null;
    return;
  }

  if (!runs.some((entry) => entry.id === leftRunId.value)) {
    leftRunId.value = runs[0]?.id ?? null;
  }

  if (!runs.some((entry) => entry.id === rightRunId.value)) {
    rightRunId.value = runs[1]?.id ?? runs[0]?.id ?? null;
  }
}, { immediate: true });

watch(() => route.query, (query) => {
  const nextState = parseWorkbenchQuery(query);
  if (Object.prototype.hasOwnProperty.call(query, 'advanced')) {
    store.setAdvancedMode(nextState.advancedMode);
  }

  const nextCommand = pickDefaultWorkbenchCommand(
    store.registry.commands,
    nextState.command || store.selectedCommand,
    store.advancedMode,
  );

  if (nextCommand && nextCommand !== store.selectedCommand) {
    store.setSelectedCommand(nextCommand);
  }

  const stagedArgs = store.consumeWorkbenchArgs();
  if (stagedArgs) {
    queueArgs(stagedArgs);
  }
});

watch(() => store.advancedMode, (advancedMode) => {
  const nextCommand = pickDefaultWorkbenchCommand(
    store.registry.commands,
    selectedCommandName.value,
    advancedMode,
  );

  const nextQuery = buildWorkbenchQuery({
    command: nextCommand,
    advancedMode,
  });

  if (JSON.stringify(route.query) !== JSON.stringify(nextQuery)) {
    void router.replace({ query: nextQuery });
  }
});

const cliPreview = computed(() => {
  if (!command.value) return 'opencli';

  const pieces = [`opencli ${command.value.command}`];
  for (const arg of command.value.args) {
    const value = formModel[arg.name];
    if (value === '' || value === null || value === undefined) continue;
    if (typeof value === 'boolean') {
      if (value) pieces.push(`--${arg.name}`);
      continue;
    }
    pieces.push(`--${arg.name} ${JSON.stringify(value)}`);
  }
  return pieces.join(' ');
});

const currentResult = computed(() =>
  store.lastExecution && store.lastExecution.command === command.value?.command
    ? store.lastExecution.result
    : undefined,
);

function collectArgs(): Record<string, unknown> {
  if (!command.value) return {};

  const args: Record<string, unknown> = {};
  for (const arg of command.value.args) {
    const value = formModel[arg.name];
    if (value === '' || value === null || value === undefined) continue;
    if (typeof value === 'boolean' && value === false) continue;
    args[arg.name] = value;
  }
  return args;
}

async function toggleCommandFavorite(): Promise<void> {
  if (!command.value) return;

  const nextFavorite = !isFavoriteCommand.value;
  await store.toggleFavorite('command', command.value.command, nextFavorite);
  message.success(nextFavorite ? t('workbench.favoriteSuccess', { value: command.value.command }) : t('workbench.unfavoriteSuccess', { value: command.value.command }));
}

async function saveWorkbenchPreset(input: { name: string; description: string }): Promise<void> {
  if (!command.value) return;

  await store.savePreset({
    kind: 'workbench',
    name: input.name,
    description: input.description || null,
    state: buildWorkbenchPresetState({
      command: command.value.command,
      args: collectArgs(),
      advancedMode: store.advancedMode,
    }),
  });
  message.success(t('workbench.savePresetSuccess', { value: input.name }));
}

async function handleRun(): Promise<void> {
  if (!command.value) return;

  if (command.value.meta.risk !== 'safe') {
    const proceed = window.confirm(t('workbench.riskyConfirm', { value: command.value.command, risk: command.value.meta.risk }));
    if (!proceed) return;
  }

  await store.runCommand(command.value.command, collectArgs());
}

async function captureCommandSnapshot(): Promise<void> {
  if (!command.value) return;
  await store.captureSourceSnapshot({
    sourceKind: 'command',
    sourceId: command.value.command,
    command: command.value.command,
    args: collectArgs(),
  });
  message.success(t('workbench.captureSuccess', { value: command.value.command }));
}

function selectCommand(commandName: string): void {
  selectedCommandName.value = commandName;
}

function readinessAlertType(tone: 'success' | 'info' | 'warning' | 'error'): 'success' | 'info' | 'warning' | 'error' {
  return tone;
}

function openOps(): void {
  void router.push({ name: 'ops' });
}

function reuseHistoryEntry(entry: StudioHistoryEntry): void {
  queueArgs(entry.args);
  if (selectedCommandName.value !== entry.command) {
    selectedCommandName.value = entry.command;
    return;
  }
  applyArgsToForm(entry.args);
  pendingFormArgs.value = null;
}

function applyWorkbenchPreset(preset: StudioPresetEntry): void {
  const state = readWorkbenchPresetState(preset.state);
  store.setAdvancedMode(state.advancedMode);
  queueArgs(state.args);
  if (selectedCommandName.value !== state.command) {
    selectedCommandName.value = state.command;
  } else {
    applyArgsToForm(state.args);
    pendingFormArgs.value = null;
  }
  message.success(t('workbench.applyPresetSuccess', { value: preset.name }));
}

async function removeWorkbenchPreset(preset: StudioPresetEntry): Promise<void> {
  const proceed = window.confirm(t('workbench.deletePresetConfirm', { value: preset.name }));
  if (!proceed) return;
  await store.deletePreset(preset.id);
  message.success(t('workbench.deletePresetSuccess', { value: preset.name }));
}
</script>

<template>
  <section class="page-grid workbench-layout">
    <div class="workbench-column">
      <n-card :title="t('workbench.selection')" class="glass-card">
        <n-select v-model:value="selectedCommandName" :options="commandOptions" filterable />
        <div v-if="!store.advancedMode" class="panel-note">{{ t('workbench.advancedHidden') }}</div>
        <n-alert
          v-if="commandReadiness"
          :type="readinessAlertType(commandReadiness.tone)"
          class="page-alert"
        >
          <div class="readiness-block">
            <strong>{{ commandReadiness.title }}</strong>
            <div v-for="bullet in commandReadiness.bullets" :key="bullet" class="panel-note">{{ bullet }}</div>
            <div v-if="commandReadiness.needsOps" class="card-actions">
                <n-button size="small" tertiary @click="openOps()">{{ t('workbench.openOps') }}</n-button>
            </div>
          </div>
        </n-alert>
        <div v-if="command" class="command-inspector">
          <div class="chip-cloud">
            <n-tag size="small" type="default">{{ command.meta.surface }}</n-tag>
            <n-tag size="small" type="info">{{ command.meta.mode }}</n-tag>
            <n-tag size="small" type="success">{{ command.meta.capability }}</n-tag>
            <n-tag size="small" :type="command.meta.risk === 'safe' ? 'success' : command.meta.risk === 'confirm' ? 'warning' : 'error'">
              {{ command.meta.risk }}
            </n-tag>
          </div>
          <p>{{ command.description || t('common.noDescription') }}</p>
          <pre class="json-block cli-block">{{ cliPreview }}</pre>
          <div class="card-actions">
            <n-button quaternary @click="toggleCommandFavorite()">
              {{ isFavoriteCommand ? t('registry.favorited') : t('workbench.favoriteCommand') }}
            </n-button>
            <save-preset-button
              :button-label="t('workbench.savePreset')"
              :title="t('workbench.savePresetTitle')"
              :description="t('workbench.savePresetDescription')"
              :default-name="command.command"
              :default-description="command.description || ''"
              :save="saveWorkbenchPreset"
            />
          </div>
        </div>
      </n-card>

      <n-card :title="t('workbench.recentRuns')" class="glass-card">
        <div v-if="recentRuns.length" class="stack-list">
          <div v-for="entry in recentRuns" :key="entry.id" class="stack-row">
            <button class="stack-row__primary" @click="selectCommand(entry.command)">
              <strong>{{ entry.command }}</strong>
              <span>{{ entry.startedAt }}</span>
            </button>
            <div class="stack-row__meta">
              <n-button size="small" quaternary @click.stop="reuseHistoryEntry(entry)">{{ t('workbench.reuseArgs') }}</n-button>
              <n-tag :type="entry.status === 'success' ? 'success' : 'error'" size="small">{{ entry.status }}</n-tag>
              <span>{{ entry.durationMs }} ms</span>
            </div>
          </div>
        </div>
        <div v-else class="panel-note">{{ t('workbench.noHistory') }}</div>
      </n-card>

      <n-card :title="t('workbench.savedPresets')" class="glass-card">
        <preset-shelf
          :presets="store.workbenchPresets"
          :empty-description="t('workbench.savedPresetsEmpty')"
          @apply="applyWorkbenchPreset"
          @remove="removeWorkbenchPreset"
        />
      </n-card>

      <n-card :title="t('workbench.snapshots')" class="glass-card">
        <div v-if="commandSnapshots.length" class="stack-list">
          <div v-for="snapshot in commandSnapshots.slice(0, 5)" :key="snapshot.id" class="stack-row">
            <div>
              <strong>{{ new Date(snapshot.capturedAt).toLocaleString() }}</strong>
              <span>{{ snapshot.command }}</span>
            </div>
            <div class="stack-row__meta">
              <n-tag :type="snapshot.status === 'success' ? 'success' : 'error'" size="small">{{ snapshot.status }}</n-tag>
              <span>{{ snapshot.durationMs }} ms</span>
            </div>
          </div>
        </div>
        <div v-else class="panel-note">{{ t('workbench.noSnapshots') }}</div>
      </n-card>
    </div>

    <div class="workbench-column workbench-column--wide">
      <n-card :title="t('workbench.arguments')" class="glass-card">
        <n-alert v-if="store.executionError" type="error" class="page-alert">
          {{ store.executionError }}
        </n-alert>

        <n-form v-if="command" label-placement="top">
          <n-form-item
            v-for="arg in command.args"
            :key="arg.name"
            :label="arg.name"
            :feedback="arg.help || (arg.required ? t('workbench.requiredArgument') : '')"
          >
            <n-select
              v-if="inferFieldKind(arg) === 'select'"
              v-model:value="formModel[arg.name]"
              :options="(arg.choices ?? []).map((choice) => ({ label: choice, value: choice }))"
            />
            <n-input-number
              v-else-if="inferFieldKind(arg) === 'number'"
              v-model:value="formModel[arg.name]"
              class="field-fill"
            />
            <div v-else-if="inferFieldKind(arg) === 'boolean'" class="switch-inline switch-inline--wide">
              <span>{{ arg.help || t('workbench.toggleFlag') }}</span>
              <n-switch v-model:value="formModel[arg.name]" />
            </div>
            <n-input
              v-else
              v-model:value="formModel[arg.name]"
              :placeholder="arg.default !== undefined ? t('workbench.defaultValue', { value: String(arg.default) }) : t('workbench.enterValue')"
            />
          </n-form-item>
        </n-form>

        <div class="card-actions">
          <n-button type="primary" :loading="store.runningCommand" @click="handleRun()">{{ t('workbench.runCommand') }}</n-button>
          <n-button tertiary :loading="store.runningSnapshot" @click="captureCommandSnapshot()">{{ t('workbench.captureSnapshot') }}</n-button>
          <n-button tertiary @click="resetForm(command?.command ?? null)">{{ t('workbench.resetArgs') }}</n-button>
          <save-preset-button
            :button-label="t('workbench.savePreset')"
            :title="t('workbench.savePresetTitle')"
            :description="t('workbench.savePresetDescription')"
            :default-name="command ? `${command.command} preset` : 'Workbench Preset'"
            :default-description="command?.description || ''"
            :disabled="!command"
            :save="saveWorkbenchPreset"
          />
        </div>
      </n-card>

      <n-card :title="t('workbench.compareRuns')" class="glass-card">
        <template v-if="recentRuns.length">
          <div class="compare-grid">
            <n-select v-model:value="leftRunId" :options="runOptions" :placeholder="t('workbench.baseRun')" />
            <n-select v-model:value="rightRunId" :options="runOptions" :placeholder="t('workbench.targetRun')" />
          </div>
          <result-panel
            :title="command ? t('workbench.runDiff', { value: command.command }) : t('workbench.compareRuns')"
            :result="runComparisonResult"
          />
        </template>
        <n-empty v-else :description="t('workbench.compareEmpty')" />
      </n-card>

      <result-panel
        :title="command ? t('workbench.output', { value: command.command }) : t('workbench.defaultOutput')"
        :result="currentResult"
      />
    </div>
  </section>
</template>
