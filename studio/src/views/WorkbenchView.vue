<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, NTag } from 'naive-ui';
import ResultPanel from '../components/ResultPanel.vue';
import { pickDefaultWorkbenchCommand } from '../lib/registry';
import { useStudioStore } from '../stores/studio';
import type { StudioCommandArg } from '../types';

const store = useStudioStore();
const route = useRoute();
const router = useRouter();

const formModel = reactive<Record<string, any>>({});

const commandOptions = computed(() =>
  store.registry.commands.map((command) => ({
    label: command.command,
    value: command.command,
  })),
);

const selectedCommandName = computed({
  get: () => {
    if (typeof route.query.command === 'string' && route.query.command) {
      return route.query.command;
    }
    return store.selectedCommand || pickDefaultWorkbenchCommand(store.registry.commands);
  },
  set: (value: string) => {
    store.setSelectedCommand(value);
    void router.replace({
      query: {
        ...route.query,
        command: value,
      },
    });
  },
});

const command = computed(() =>
  store.registry.commands.find((item) => item.command === selectedCommandName.value) ?? null,
);

const recentRuns = computed(() =>
  store.history.filter((entry) => entry.command === selectedCommandName.value).slice(0, 5),
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

watch(command, (nextCommand) => {
  resetForm(nextCommand?.command ?? null);
}, { immediate: true });

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

async function handleRun(): Promise<void> {
  if (!command.value) return;

  if (command.value.meta.risk !== 'safe') {
    const proceed = window.confirm(`"${command.value.command}" is marked as ${command.value.meta.risk}. Continue?`);
    if (!proceed) return;
  }

  await store.runCommand(command.value.command, collectArgs());
}

function selectCommand(commandName: string): void {
  selectedCommandName.value = commandName;
}
</script>

<template>
  <section class="page-grid workbench-layout">
    <div class="workbench-column">
      <n-card title="Command Selection" class="glass-card">
        <n-select v-model:value="selectedCommandName" :options="commandOptions" filterable />
        <div v-if="command" class="command-inspector">
          <div class="chip-cloud">
            <n-tag size="small" type="info">{{ command.meta.mode }}</n-tag>
            <n-tag size="small" type="success">{{ command.meta.capability }}</n-tag>
            <n-tag size="small" :type="command.meta.risk === 'safe' ? 'success' : command.meta.risk === 'confirm' ? 'warning' : 'error'">
              {{ command.meta.risk }}
            </n-tag>
          </div>
          <p>{{ command.description || 'No description available.' }}</p>
          <pre class="json-block cli-block">{{ cliPreview }}</pre>
        </div>
      </n-card>

      <n-card title="Recent Runs" class="glass-card">
        <div v-if="recentRuns.length" class="stack-list">
          <button v-for="entry in recentRuns" :key="entry.id" class="stack-row" @click="selectCommand(entry.command)">
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
        <div v-else class="panel-note">No stored history for this command yet.</div>
      </n-card>
    </div>

    <div class="workbench-column workbench-column--wide">
      <n-card title="Arguments" class="glass-card">
        <n-alert v-if="store.executionError" type="error" class="page-alert">
          {{ store.executionError }}
        </n-alert>

        <n-form v-if="command" label-placement="top">
          <n-form-item
            v-for="arg in command.args"
            :key="arg.name"
            :label="arg.name"
            :feedback="arg.help || (arg.required ? 'Required argument' : '')"
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
              <span>{{ arg.help || 'Toggle this flag' }}</span>
              <n-switch v-model:value="formModel[arg.name]" />
            </div>
            <n-input
              v-else
              v-model:value="formModel[arg.name]"
              :placeholder="arg.default !== undefined ? `Default: ${arg.default}` : 'Enter a value'"
            />
          </n-form-item>
        </n-form>

        <div class="card-actions">
          <n-button type="primary" :loading="store.runningCommand" @click="handleRun()">Run Command</n-button>
          <n-button tertiary @click="resetForm(command?.command ?? null)">Reset Args</n-button>
        </div>
      </n-card>

      <result-panel
        :title="command ? `${command.command} output` : 'Result'"
        :result="currentResult"
      />
    </div>
  </section>
</template>
