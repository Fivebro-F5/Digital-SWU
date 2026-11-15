<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{ title: string; body: string }>();
const emit = defineEmits<{ close: [] }>();
const page = ref(0);
const panel = ref<HTMLElement | null>(null);
const pages = computed(() => props.body.trim().split(/\r?\n+/).flatMap(paragraph =>
  paragraph.match(/[\s\S]{1,64}/gu) ?? ['']
));
const last = computed(() => page.value + 1 >= pages.value.length);

function advance() {
  if (last.value) emit('close');
  else page.value++;
}

function onKey(event: KeyboardEvent) {
  if (event.code !== 'Space' && event.key !== 'Escape') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.repeat) return;
  if (event.key === 'Escape') emit('close');
  else advance();
}

onMounted(() => {
  panel.value?.focus({ preventScroll: true });
  window.addEventListener('keydown', onKey, true);
});
onUnmounted(() => window.removeEventListener('keydown', onKey, true));
</script>

<template>
  <section ref="panel" class="dialogue" tabindex="-1" role="dialog" aria-labelledby="dialogue-title">
    <header>
      <strong id="dialogue-title">{{ title }}</strong>
      <button type="button" aria-label="关闭对话（Esc）" @click="emit('close')">关闭</button>
    </header>
    <p aria-live="polite">{{ pages[page] }}</p>
    <footer>
      <span>{{ page + 1 }} / {{ pages.length }}</span>
      <button type="button" @click="advance">{{ last ? '读完' : '下一页' }} ▸</button>
    </footer>
  </section>
</template>

<style scoped>
.dialogue {
  position: absolute; z-index: 4; bottom: 8px; left: 50%; transform: translateX(-50%);
  width: min(540px, calc(100% - 20px)); max-height: calc(100% - 16px); overflow-y: auto;
  color: #294440; background: #fff4d5; border: 3px solid #344c48;
  box-shadow: inset 0 0 0 2px #b5bd93, 3px 3px #344c48; padding: 9px 14px;
}
header, footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
strong { color: #fff4d5; background: #36594c; padding: 3px 8px; font-size: 14px; }
p { margin: 7px 0; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; }
footer span { font-size: 12px; font-variant-numeric: tabular-nums; }
button { color: #294440; background: #d4dfb2; border: 2px solid #344c48; padding: 3px 8px; font-size: 12px; }
button:is(:hover, :focus-visible) { background: #f5d78e; }
</style>
