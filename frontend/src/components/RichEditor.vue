<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();

const emitted = new Set<string>([props.modelValue]); // values we emitted ourselves (echoes can arrive late while typing fast)
const editor = useEditor({
  content: props.modelValue,
  extensions: [StarterKit],
  onUpdate: ({ editor }) => { const h = editor.getHTML(); emitted.add(h); if (emitted.size > 200) emitted.delete(emitted.values().next().value!); emit('update:modelValue', h); },
});
// Only apply external changes (template fill, load); ignore echoes of our own edits, which can lag behind fast typing.
watch(() => props.modelValue, (v) => {
  if (!editor.value || emitted.has(v) || v === editor.value.getHTML()) return;
  emitted.add(v);
  editor.value.commands.setContent(v, false);
});
onBeforeUnmount(() => editor.value?.destroy());
</script>

<template>
  <div class="editor" v-if="editor">
    <div class="toolbar">
      <button type="button" @mousedown.prevent :class="{ on: editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()"><b>B</b></button>
      <button type="button" @mousedown.prevent :class="{ on: editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()"><i>I</i></button>
      <button type="button" @mousedown.prevent :class="{ on: editor.isActive('heading', { level: 2 }) }" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
      <button type="button" @mousedown.prevent :class="{ on: editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">&bull; List</button>
    </div>
    <EditorContent :editor="editor" />
  </div>
</template>
