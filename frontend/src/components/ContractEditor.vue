<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api';
import type { Template } from '../types';
import RichEditor from './RichEditor.vue';

const props = defineProps<{ id?: string }>();
const emit = defineEmits<{ saved: [string]; cancel: [] }>();
const form = reactive({ title: '', counterparty: '', content: '<p></p>', signers: '', endDate: '' });
const error = ref('');
const templates = ref<Template[]>([]);
const tplId = ref('');
const values = reactive<Record<string, string>>({});
const tpl = () => templates.value.find((t) => t.id === tplId.value);

onMounted(async () => {
  if (!props.id) { try { templates.value = await api.templates(); } catch (e) { error.value = (e as Error).message; } return; }
  const c = await api.get(props.id);
  Object.assign(form, { title: c.title, counterparty: c.counterparty, content: c.content, signers: c.signers.map((s) => s.name).join(', '), endDate: c.endDate ?? '' });
});

function pickTemplate() {
  Object.keys(values).forEach((k) => delete values[k]);
  tpl()?.fields.forEach((f) => (values[f] = f === 'date' ? new Date().toISOString().slice(0, 10) : ''));
}

async function applyTemplate() {
  error.value = '';
  try {
    const r = await api.fillTemplate(tplId.value, { ...values });
    form.title = r.title;
    form.content = r.content;
    if (values.party && !form.counterparty) form.counterparty = values.party;
  } catch (e) { error.value = (e as Error).message; }
}

async function save() {
  error.value = '';
  const body = { ...form, signers: form.signers.split(',').map((s) => s.trim()).filter(Boolean) };
  try {
    const c = props.id ? await api.update(props.id, body) : await api.create(body);
    emit('saved', c.id);
  } catch (e) { error.value = (e as Error).message; }
}
</script>

<template>
  <form class="card" @submit.prevent="save">
    <h2>{{ id ? `Edit ${id}` : 'New contract draft' }}</h2>
    <div v-if="error" class="error">{{ error }}</div>
    <fieldset v-if="!id && templates.length">
      <legend>New from template</legend>
      <select v-model="tplId" aria-label="Template" @change="pickTemplate">
        <option value="">Blank contract</option>
        <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <template v-if="tpl()">
        <p class="muted">{{ tpl()!.description }}</p>
        <div v-for="f in tpl()!.fields" :key="f"><label>{{ f }}</label><input v-model="values[f]" :placeholder="`{{${f}}}`" /></div>
        <button type="button" class="ghost" @click="applyTemplate">Fill template</button>
      </template>
    </fieldset>
    <label>Title</label><input v-model="form.title" required />
    <label>Counterparty</label><input v-model="form.counterparty" />
    <label>End date (for expiry / renewal reminders)</label><input v-model="form.endDate" type="date" />
    <label>Signers, in signing order (comma separated)</label><input v-model="form.signers" placeholder="Alice Acme, Bob Provider" />
    <label>Contract text</label><RichEditor v-model="form.content" />
    <button type="submit">Save draft</button><button type="button" class="ghost" @click="emit('cancel')">Cancel</button>
  </form>
</template>
