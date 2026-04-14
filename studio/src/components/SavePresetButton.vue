<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { NButton, NForm, NFormItem, NInput, NModal } from 'naive-ui';

const props = withDefaults(defineProps<{
  buttonLabel?: string;
  title: string;
  description?: string;
  defaultName: string;
  defaultDescription?: string;
  disabled?: boolean;
  save: (input: { name: string; description: string }) => Promise<void> | void;
}>(), {
  buttonLabel: 'Save Preset',
  description: '',
  defaultDescription: '',
  disabled: false,
});

const showModal = ref(false);
const saving = ref(false);
const form = reactive({
  name: '',
  description: '',
});

watch(showModal, (open) => {
  if (!open) return;
  form.name = props.defaultName;
  form.description = props.defaultDescription;
});

async function handleSave(): Promise<void> {
  if (!form.name.trim()) return;

  saving.value = true;
  try {
    await props.save({
      name: form.name.trim(),
      description: form.description.trim(),
    });
    showModal.value = false;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <n-button quaternary :disabled="disabled" @click="showModal = true">{{ buttonLabel }}</n-button>

  <n-modal v-model:show="showModal" preset="card" class="preset-modal" :title="title" :bordered="false">
    <p v-if="description" class="panel-note">{{ description }}</p>
    <n-form label-placement="top">
      <n-form-item label="Preset name">
        <n-input v-model:value="form.name" placeholder="Give this preset a memorable name" />
      </n-form-item>
      <n-form-item label="Description">
        <n-input
          v-model:value="form.description"
          type="textarea"
          placeholder="Optional context for when to use this preset"
          :autosize="{ minRows: 3, maxRows: 5 }"
        />
      </n-form-item>
    </n-form>
    <div class="card-actions">
      <n-button type="primary" :loading="saving" :disabled="!form.name.trim()" @click="handleSave()">Save Preset</n-button>
      <n-button tertiary @click="showModal = false">Cancel</n-button>
    </div>
  </n-modal>
</template>
