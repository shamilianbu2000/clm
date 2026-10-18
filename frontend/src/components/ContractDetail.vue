<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { api, session } from '../api';
import type { Contract } from '../types';

const props = defineProps<{ id: string }>();
const emit = defineEmits<{ edit: [string]; back: [] }>();
const c = ref<Contract>();
const error = ref('');
const comment = ref('');
const signature = ref('');

const load = async () => { c.value = await api.get(props.id); };
onMounted(load);
watch(() => props.id, load);

const stepRole = computed(() => ({ DRAFT: 'Drafter', REVIEW: 'Reviewer', LEGAL: 'Legal', APPROVED: 'Signer' } as const)[c.value?.status as 'DRAFT'] );
const myTurn = computed(() => stepRole.value === session.role);
const nextSigner = computed(() => c.value?.signers.find((s) => !s.signedAt));
const steps = ['DRAFT', 'REVIEW', 'LEGAL', 'APPROVED', 'SIGNED'];

async function run(fn: () => Promise<Contract>) {
  error.value = '';
  try { c.value = await fn(); comment.value = ''; signature.value = ''; } catch (e) { error.value = (e as Error).message; }
}
</script>

<template>
  <div v-if="c">
    <div class="card">
      <div class="row-flex"><h2>{{ c.id }} &middot; {{ c.title }}</h2><button class="ghost" @click="emit('back')">Back</button></div>
      <p class="muted">Counterparty: {{ c.counterparty || '-' }}</p>
      <p>
        <template v-for="(s, i) in steps" :key="s"><span :class="['badge', s === c.status ? s : '']" :style="{ opacity: s === c.status ? 1 : .5 }">{{ s }}</span><span v-if="i < steps.length - 1"> &rarr; </span></template>
      </p>
      <div class="doc" v-html="c.content"></div>
    </div>

    <div class="card">
      <h3>Actions</h3>
      <div v-if="error" class="error">{{ error }}</div>
      <p v-if="c.status === 'SIGNED'">Fully executed. No further actions.</p>
      <p v-else-if="!myTurn" class="muted">Waiting on role <b>{{ stepRole }}</b>. You are acting as <b>{{ session.role }}</b>.</p>
      <template v-else-if="c.status === 'DRAFT'">
        <button @click="emit('edit', c.id)">Edit</button>
        <button @click="run(() => api.submit(c!.id))">Submit for review</button>
      </template>
      <template v-else-if="c.status === 'REVIEW' || c.status === 'LEGAL'">
        <input v-model="comment" placeholder="Comment (required to reject)" />
        <button @click="run(() => api.approve(c!.id, comment))">Approve</button>
        <button class="danger" @click="run(() => api.reject(c!.id, comment))">Reject to draft</button>
      </template>
      <template v-else-if="c.status === 'APPROVED'">
        <p>Next signer: <b>{{ nextSigner?.name }}</b></p>
        <input v-model="signature" :placeholder="`Type full name: ${nextSigner?.name}`" />
        <button @click="run(() => api.sign(c!.id, signature))">Sign</button>
      </template>
    </div>

    <div class="card">
      <h3>Signers</h3>
      <table><tbody>
        <tr v-for="(s, i) in c.signers" :key="s.name">
          <td>{{ i + 1 }}. {{ s.name }}</td>
          <td>{{ s.signedAt ? `Signed: ${s.signature} (${new Date(s.signedAt).toLocaleString()})` : 'Pending' }}</td>
        </tr>
      </tbody></table>
    </div>

    <div class="card">
      <h3>Audit trail</h3>
      <table>
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead>
        <tbody><tr v-for="(a, i) in c.audit" :key="i">
          <td>{{ new Date(a.at).toLocaleString() }}</td><td>{{ a.actor }} ({{ a.role }})</td><td>{{ a.action }}</td><td>{{ a.detail }}</td>
        </tr></tbody>
      </table>
    </div>
  </div>
</template>
