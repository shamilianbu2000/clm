<script setup lang="ts">
import { reactive, ref } from 'vue';
import { session } from './api';
import { ROLES } from './types';
import ContractList from './components/ContractList.vue';
import ContractDetail from './components/ContractDetail.vue';
import ContractEditor from './components/ContractEditor.vue';

const state = reactive(session);
const view = ref<'list' | 'detail' | 'edit'>('list');
const currentId = ref<string>();
const go = (v: 'list' | 'detail' | 'edit', id?: string) => { view.value = v; currentId.value = id; };
</script>

<template>
  <header>
    <h1 @click="go('list')">CLM &middot; Contract Lifecycle</h1>
    <div>
      Role:
      <select v-model="state.role">
        <option v-for="r in ROLES" :key="r">{{ r }}</option>
      </select>
      <input v-model="state.user" aria-label="User name" />
    </div>
  </header>
  <main>
    <ContractList v-if="view === 'list'" :key="state.role" @open="(id) => go('detail', id)" @create="go('edit')" />
    <ContractDetail v-else-if="view === 'detail'" :id="currentId!" :key="state.role" @edit="(id) => go('edit', id)" @back="go('list')" />
    <ContractEditor v-else :id="currentId" @saved="(id) => go('detail', id)" @cancel="go('list')" />
  </main>
</template>
