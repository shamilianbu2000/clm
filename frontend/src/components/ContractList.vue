<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { api, session, settings } from '../api';
import type { ContractSummary, Status } from '../types';
import RenewalsPanel from './RenewalsPanel.vue';

const emit = defineEmits<{ open: [string]; create: [] }>();
const items = ref<ContractSummary[]>([]);
const error = ref('');
const q = ref('');
const status = ref<Status | ''>('');
const expiring = ref(false);
const STATUSES: Status[] = ['DRAFT', 'REVIEW', 'LEGAL', 'APPROVED', 'SIGNED'];
const load = async () => {
  try {
    error.value = '';
    items.value = await api.list({ q: q.value.trim(), status: status.value, expiringWithin: expiring.value ? settings.renewalDays : undefined });
  } catch (e) { error.value = (e as Error).message; }
};
onMounted(load);
watch([q, status, expiring, () => settings.renewalDays], load);
defineExpose({ load });
</script>

<template>
  <RenewalsPanel @open="(id) => emit('open', id)" />
  <div class="card">
    <div class="row-flex"><h2>Contracts</h2>
      <button :disabled="session.role !== 'Drafter'" @click="emit('create')">+ New draft</button></div>
    <div class="filters">
      <input v-model="q" type="search" placeholder="Search title, counterparty, text..." aria-label="Search" />
      <select v-model="status" aria-label="Status filter">
        <option value="">All statuses</option>
        <option v-for="s in STATUSES" :key="s">{{ s }}</option>
      </select>
      <label><input v-model="expiring" type="checkbox" />Expiring soon (&le; {{ settings.renewalDays }}d)</label>
    </div>
    <div v-if="error" class="error">{{ error }}</div>
    <table>
      <thead><tr><th>ID</th><th>Title</th><th>Counterparty</th><th>Status</th><th>Ends</th><th>Signed</th></tr></thead>
      <tbody>
        <tr v-for="c in items" :key="c.id" class="row" @click="emit('open', c.id)">
          <td>{{ c.id }}</td><td>{{ c.title }}</td><td>{{ c.counterparty }}</td>
          <td><span :class="['badge', c.status]">{{ c.status }}</span></td>
          <td>{{ c.endDate ?? '-' }} <span v-if="c.daysLeft !== null && c.daysLeft < 0" class="badge EXPIRED">Expired</span></td>
          <td>{{ c.signers.filter((s) => s.signedAt).length }}/{{ c.signers.length }}</td>
        </tr>
        <tr v-if="!items.length"><td colspan="6" class="muted">No contracts match.</td></tr>
      </tbody>
    </table>
  </div>
</template>
