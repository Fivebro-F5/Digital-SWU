<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { worldBounds, worldRegions, type CampusZone } from '../game/campus';
import { minimapTransform, type MinimapSnapshot } from '../game/minimap';

const props = defineProps<{
  snapshot: MinimapSnapshot | null;
  overview: HTMLCanvasElement | null;
}>();
const collapsed = defineModel<boolean>('collapsed', { required: true });
const canvas = ref<HTMLCanvasElement | null>(null);
const names: Record<CampusZone, string> = {
  '00': '含弘门', '01': '门外衔接', '02': '东侧樟林',
  '03': '西侧樟林', '04': '雕像花园', '05': '行署路',
};
let observer: ResizeObserver | undefined;

function paint(): void {
  if (collapsed.value || !canvas.value) return;
  const target = canvas.value;
  const size = target.clientWidth;
  if (!size) return;
  const ratio = window.devicePixelRatio || 1;
  const pixels = Math.round(size * ratio);
  if (target.width !== pixels || target.height !== pixels) target.width = target.height = pixels;
  const context = target.getContext('2d');
  if (!context) return;
  context.setTransform(pixels / size, 0, 0, pixels / size, 0, 0);
  context.clearRect(0, 0, size, size);
  context.imageSmoothingEnabled = false;
  const transform = minimapTransform(worldBounds, size, size);
  const bounds = transform.rect(worldBounds);
  if (props.overview) context.drawImage(props.overview, bounds.x, bounds.y, bounds.width, bounds.height);
  for (const region of worldRegions) {
    const area = transform.rect(region);
    const active = region.id === props.snapshot?.zone;
    context.fillStyle = active ? '#f9d36a33' : '#152d2633';
    context.fillRect(area.x, area.y, area.width, area.height);
    context.strokeStyle = active ? '#f9d36a' : '#b6c9a27a';
    context.lineWidth = active ? 1.5 : 0.5;
    context.strokeRect(area.x, area.y, area.width, area.height);
    context.font = '9px "Microsoft YaHei", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    const label = names[region.id];
    const width = context.measureText(label).width;
    const center = area.x + area.width / 2;
    context.fillStyle = '#12251fe6';
    context.fillRect(center - width / 2 - 2, area.y + 2, width + 4, 12);
    context.fillStyle = active ? '#ffe39a' : '#f3f3d7';
    context.fillText(label, center, area.y + 3);
  }
  const snapshot = props.snapshot;
  if (!snapshot) return;
  // 极小倍率下视口可能大于世界：裁剪范围框，避免盖住标题和图例。
  context.save();
  context.beginPath();
  context.rect(bounds.x, bounds.y, bounds.width, bounds.height);
  context.clip();
  const view = transform.rect(snapshot.viewport);
  context.strokeStyle = '#e8faff';
  context.fillStyle = '#d9f5ff14';
  context.lineWidth = 1;
  context.fillRect(view.x, view.y, view.width, view.height);
  context.strokeRect(view.x, view.y, view.width, view.height);
  const player = transform.point(snapshot.position);
  context.translate(player.x, player.y);
  context.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[snapshot.facing]);
  context.fillStyle = '#ffdd70';
  context.strokeStyle = '#172d25';
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(0, -7); context.lineTo(3, -2); context.lineTo(-3, -2); context.closePath();
  context.fill(); context.stroke();
  context.beginPath(); context.arc(0, 0, 3, 0, Math.PI * 2);
  context.fill(); context.stroke();
  context.restore();
}

watch(() => [props.snapshot, props.overview, collapsed.value], paint, { flush: 'post' });
onMounted(() => {
  observer = new ResizeObserver(paint);
  if (canvas.value) observer.observe(canvas.value);
  paint();
});
onUnmounted(() => observer?.disconnect());
</script>

<template>
  <aside class="campus-minimap" :class="{ collapsed }" aria-label="校园小地图"
    @mousedown.stop @mousemove.stop @pointerdown.stop @click.stop @auxclick.stop.prevent
    @wheel.stop.prevent @keydown.stop @keyup.stop>
    <div class="minimap-heading">
      <span>校园总览 <small>北 ↑</small></span>
      <button type="button" :aria-expanded="!collapsed" aria-controls="campus-minimap-content"
        :aria-label="collapsed ? '展开小地图' : '折叠小地图'" @click="collapsed = !collapsed">
        {{ collapsed ? '展开' : '收起' }}
      </button>
    </div>
    <div v-show="!collapsed" id="campus-minimap-content">
      <canvas ref="canvas" role="img" :aria-label="snapshot ? `六区总览，当前位置：${names[snapshot.zone]}，黄色标记为玩家，白框为镜头范围` : '小地图加载中'" />
      <p class="minimap-legend"><span>● 玩家</span><span>□ 镜头范围</span></p>
    </div>
  </aside>
</template>

<style scoped>
.campus-minimap{position:absolute;top:10px;right:10px;z-index:2;width:200px;max-width:calc(100% - 20px);color:#f3f3d7;background:#152a25eb;border:1px solid #b6c9a2a6;box-shadow:0 3px 12px #14251f40;cursor:default;user-select:none}
.campus-minimap.collapsed{width:auto}
.minimap-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 8px;font-size:11px;border-bottom:1px solid #b6c9a244}
.minimap-heading small{font-size:9px;color:#c0cead;margin-left:5px}
.minimap-heading button{font-size:10px;color:#f3f3d7;background:#2c463b;border:1px solid #8fa98b;padding:3px 5px;min-height:24px}
.minimap-heading button:focus-visible{outline:2px solid #ffdd70;outline-offset:2px}
.campus-minimap canvas{width:100%;aspect-ratio:1;display:block}
.minimap-legend{display:flex;justify-content:space-between;gap:4px;margin:0;padding:0 8px 7px;font-size:9px;color:#d8e7d9}
.minimap-legend span:first-child{color:#ffdd70}
@media(max-width:630px){.campus-minimap{width:140px;top:6px;right:6px}.minimap-heading{padding:4px 5px;gap:4px;font-size:10px}.minimap-heading small{margin-left:2px}.minimap-legend{padding:0 5px 5px;font-size:8px}}
</style>
