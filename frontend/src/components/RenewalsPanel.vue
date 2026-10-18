<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { api, settings } from '../api';
import type { Renewals } from '../types';

const emit = defineEmits<{ open: [string] }>();
const data = ref<Renewals>();
const error = ref('');
const days = ref(settings.renewalDays);
const load = async () => {
  error.value = '';
  const n = Math.floor(Number(days.value));
  if (!Number.isFinite(n) || n < 0 || n > 3650) { error.value = 'Days must be between 0 and 3650'; return; }
  settings.renewalDays = n;
  try { data.value = await api.renewals(n); } catch (e) { error.value = (e as Error).message; }
};
onMounted(load);
watch(days, load);
</script>

<template>
  <div class="card">
    <div class="row-flex"><h3>Renewals</h3>
      <span class="muted">Expiring within <input v-model.number="days" type="number" min="0" max="3650" style="width:70px;margin:0" aria-label="Renewal window in days" /> days</span></div>
    <div v-if="error" class="error">{{ error }}</div>
    <p v-else-if="data && !data.items.length" class="muted">Nothing expiring in the next {{ data.days }} days.</p>
    <table v-else-if="data">
      <tbody>
        <tr v-for="c in data.items" :key="c.id" class="row" @click="emit('open', c.id)">
          <td>{{ c.id }}</td><td>{{ c.title }}</td><td>{{ c.counterparty }}</td><td>{{ c.endDate }}</td>
          <td><span :class="['badge', c.state]">{{ c.state === 'EXPIRED' ? `Expired ${-c.daysLeft!}d ago` : `${c.daysLeft}d left` }}</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
