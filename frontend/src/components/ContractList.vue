<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, session } from '../api';
import type { ContractSummary } from '../types';

const emit = defineEmits<{ open: [string]; create: [] }>();
const items = ref<ContractSummary[]>([]);
const error = ref('');
const load = async () => { try { items.value = await api.list(); } catch (e) { error.value = (e as Error).message; } };
onMounted(load);
defineExpose({ load });
</script>

<template>
  <div class="card">
    <div class="row-flex"><h2>Contracts</h2>
      <button :disabled="session.role !== 'Drafter'" @click="emit('create')">+ New draft</button></div>
    <div v-if="error" class="error">{{ error }}</div>
    <table>
      <thead><tr><th>ID</th><th>Title</th><th>Counterparty</th><th>Status</th><th>Signed</th></tr></thead>
      <tbody>
        <tr v-for="c in items" :key="c.id" class="row" @click="emit('open', c.id)">
          <td>{{ c.id }}</td><td>{{ c.title }}</td><td>{{ c.counterparty }}</td>
          <td><span :class="['badge', c.status]">{{ c.status }}</span></td>
          <td>{{ c.signers.filter((s) => s.signedAt).length }}/{{ c.signers.length }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
