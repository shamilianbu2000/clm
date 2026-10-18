<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { session } from './api';
import { ROLES } from './types';
import ContractList from './components/ContractList.vue';
import ContractDetail from './components/ContractDetail.vue';
import ContractEditor from './components/ContractEditor.vue';

const state = reactive(session);
const DEFAULT_USERS: Record<string, string> = { Drafter: 'Dana Drafter', Reviewer: 'Rita Reviewer', Legal: 'Leo Legal', Signer: 'Sam Signer' };
watch(() => state.role, (r) => { state.user = DEFAULT_USERS[r]; });
const view = ref<'list' | 'detail' | 'edit'>('list');
const currentId = ref<string>();
const go = (v: 'list' | 'detail' | 'edit', id?: string) => { view.value = v; currentId.value = id; };
</script>

<template>
  <header>
    <h1 @click="go('list')">CLM &middot; Contract Lifecycle</h1>
    <div class="who">
      <label for="role">Acting as</label>
      <select id="role" v-model="state.role">
        <option v-for="r in ROLES" :key="r">{{ r }}</option>
      </select>
      <input v-model="state.user" aria-label="User name" />
    </div>
  </header>
  <main>
    <p class="hint">
      Demo with mocked login: use <b>Acting as</b> in the header to switch between Drafter, Reviewer, Legal and Signer.
      Each role can only act on its own step: Drafter creates/submits, Reviewer then Legal approve or reject, Signers sign in order.
      Open a contract to see what the current role can do.
    </p>
    <ContractList v-if="view === 'list'" :key="state.role" @open="(id) => go('detail', id)" @create="go('edit')" />
    <ContractDetail v-else-if="view === 'detail'" :id="currentId!" :key="state.role" @edit="(id) => go('edit', id)" @back="go('list')" />
    <ContractEditor v-else :id="currentId" @saved="(id) => go('detail', id)" @cancel="go('list')" />
  </main>
</template>
