<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api';
import RichEditor from './RichEditor.vue';

const props = defineProps<{ id?: string }>();
const emit = defineEmits<{ saved: [string]; cancel: [] }>();
const form = reactive({ title: '', counterparty: '', content: '<p></p>', signers: '' });
const error = ref('');

onMounted(async () => {
  if (!props.id) return;
  const c = await api.get(props.id);
  Object.assign(form, { title: c.title, counterparty: c.counterparty, content: c.content, signers: c.signers.map((s) => s.name).join(', ') });
});

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
    <label>Title</label><input v-model="form.title" required />
    <label>Counterparty</label><input v-model="form.counterparty" />
    <label>Signers, in signing order (comma separated)</label><input v-model="form.signers" placeholder="Alice Acme, Bob Provider" />
    <label>Contract text</label><RichEditor v-model="form.content" />
    <button type="submit">Save draft</button><button type="button" class="ghost" @click="emit('cancel')">Cancel</button>
  </form>
</template>
