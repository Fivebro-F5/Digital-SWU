<script setup lang="ts">
type IconName = 'bell' | 'close' | 'feed' | 'chat' | 'user' | 'settings' | 'image' | 'heart' | 'comment' | 'plus' | 'trash' | 'pin' | 'back' | 'search' | 'send' | 'check';

defineProps<{ name: IconName }>();

// 所有符号共用 16 × 16 整数网格，避免不同平台的 emoji 字形破坏像素风格。
const paths: Record<IconName, string> = {
  bell: 'M6 1h4v2H6z M4 3h8v2H4z M3 5h10v7H3z M1 12h14v2H1z M6 14h4v2H6z',
  close: 'M2 2h2v2H2z M4 4h2v2H4z M6 6h4v4H6z M10 4h2v2h-2z M12 2h2v2h-2z M4 10h2v2H4z M2 12h2v2H2z M10 10h2v2h-2z M12 12h2v2h-2z',
  feed: 'M2 2h12v2H2z M2 6h12v2H2z M2 10h8v2H2z M2 14h6v2H2z',
  chat: 'M2 2h12v2H2z M1 4h2v8H1z M13 4h2v8h-2z M3 12h10v2H8v2H5v-2H3z M4 6h8v2H4z',
  user: 'M5 1h6v2H5z M3 3h2v6H3z M11 3h2v6h-2z M5 9h6v2H5z M3 11h10v2H3z M1 13h14v3H1z',
  settings: 'M6 1h4v2H6z M3 3h10v2H3z M1 5h4v6H1z M11 5h4v6h-4z M5 5h6v2H5z M5 9h6v2H5z M3 11h10v2H3z M6 13h4v2H6z',
  image: 'M1 2h14v12H1z M3 4v8h10V4z M4 5h3v3H4z M5 11l3-3 2 2 1-1 2 2z',
  heart: 'M2 3h4v2H2z M10 3h4v2h-4z M1 5h6v3H1z M9 5h6v3H9z M2 8h12v2H2z M4 10h8v2H4z M6 12h4v2H6z',
  comment: 'M2 2h12v2H2z M1 4h2v8H1z M13 4h2v8h-2z M3 12h10v2H8v2H5v-2H3z',
  plus: 'M6 1h4v5h5v4h-5v5H6v-5H1V6h5z',
  trash: 'M5 1h6v2H5z M2 3h12v2H2z M3 5h10v10H3z M5 7v6h2V7z M9 7v6h2V7z',
  pin: 'M5 1h6v2H5z M3 3h2v7H3z M11 3h2v7h-2z M5 10h6v2H9v2H7v-2H5z M7 14h2v2H7z',
  back: 'M6 2h3v2H6z M4 4h2v2H4z M2 6h2v4H2z M4 10h2v2H4z M6 12h3v2H6z M4 7h11v2H4z',
  search: 'M4 1h6v2H4z M2 3h2v2H2z M10 3h2v2h-2z M1 5h2v5H1z M11 5h2v5h-2z M3 10h2v2H3z M9 10h2v2H9z M5 12h4v2H5z M11 11h2v2h-2z M13 13h2v2h-2z',
  send: 'M1 1l14 7-14 7V9l8-1-8-1z',
  check: 'M1 8h3v3H1z M4 11h3v3H4z M7 8h3v3H7z M10 5h3v3h-3z M13 2h2v3h-2z',
};
</script>

<template>
  <svg class="pixel-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><path :d="paths[name]" /></svg>
</template>
