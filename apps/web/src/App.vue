<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type Phaser from 'phaser';
import type { HealthStatus } from '@digital-swu/contracts';
// 首页只挂载含弘门场景。
import type { CampusScene, GameStatus, GameHooks } from './game/CampusScene';
import type { Direction } from './game/campus';

const canvasHost = ref<HTMLDivElement | null>(null);
const apiStatus = ref('检查中');
const nearby = ref<{ name: string; description: string } | null>(null);
const selected = ref<{ title: string; body: string } | null>(null);
const status = ref<GameStatus>({ scene: '含弘门', position: { x: 0, y: 0 }, facing: 'down', sprint: false });
let game: Phaser.Game | undefined;
let disposed = false;
let canvasObserver: ResizeObserver | undefined;
function activeScene(): CampusScene | undefined { return game?.scene.getScenes(true)[0] as CampusScene | undefined; }
function setDirection(direction: Direction, pressed: boolean): void { activeScene()?.setDirection(direction, pressed); }
function directionLabel(direction: Direction): string {
  return { up: '上', down: '下', left: '左', right: '右', 'up-left': '左上', 'up-right': '右上', 'down-left': '左下', 'down-right': '右下' }[direction];
}
function fitCanvas(): void {
  const host = canvasHost.value;
  if (!host?.parentElement) return;
  const available = host.parentElement.clientWidth;
  const scale = Math.floor(available / 384);
  const width = scale >= 1 ? scale * 384 : available;
  if (host.style.width === `${width}px`) return;
  host.style.width = `${width}px`;
  if (game) requestAnimationFrame(() => { if (!disposed) game?.scale.refresh(); });
}

onMounted(async () => {
  fitCanvas();
  try {
    const [{ default: PhaserRuntime }, { CampusScene: GateScene }] = await Promise.all([import('phaser'), import('./game/CampusScene')]);
    if (disposed || !canvasHost.value) return;
    const hooks: GameHooks = {
      onNearby: (name, description = '') => { nearby.value = name ? { name, description } : null; },
      onMessage: (title, body) => { selected.value = { title, body }; },
      onStatus: (next) => { status.value = next; },
      isDialogOpen: () => selected.value !== null,
    };
    game = new PhaserRuntime.Game({ type: PhaserRuntime.AUTO, parent: canvasHost.value, width: 384, height: 240, backgroundColor: '#92bd70', pixelArt: true, roundPixels: true, scene: [new GateScene(hooks)], scale: { mode: PhaserRuntime.Scale.FIT, autoCenter: PhaserRuntime.Scale.CENTER_BOTH } });
    canvasObserver = new ResizeObserver(fitCanvas);
    canvasObserver.observe(canvasHost.value.parentElement!);
  } catch (error) { apiStatus.value = '场景加载失败'; console.error(error); }
  try {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json() as HealthStatus;
    apiStatus.value = data.status === 'ok' ? '已连接' : '不可用';
  } catch { if (apiStatus.value !== '场景加载失败') apiStatus.value = '未连接'; }
});
onUnmounted(() => { disposed = true; canvasObserver?.disconnect(); game?.destroy(true); });
</script>

<template>
  <main class="page">
    <header class="masthead"><div><p class="eyebrow">DIGITAL SWU / PIXEL CAMPUS</p><h1>数字西大 <span>口袋校园</span></h1><p class="subtitle">原创掌机风格 · 俯视角探索原型</p></div><span class="prototype-badge">2D GAME PROTOTYPE</span></header>
    <div class="layout">
      <section class="game-shell" aria-label="像素校园游戏">
        <!-- 操作提示与坐标按含弘门地图更新。 -->
        <div class="game-top"><span class="indicator" /><strong>校园探索</strong><span class="game-top-right">{{ status.scene }}</span></div>
        <div ref="canvasHost" class="canvas-host" aria-label="俯视角像素校园画布" />
        <div class="game-bottom"><span>方向键 / WASD 四向移动</span><span>Shift 疾跑</span><span>靠近地标 · E 互动</span></div>
        <div class="dialog-strip"><span class="dialog-arrow">▶</span><div><strong>{{ nearby?.name ?? '出发探索吧！' }}</strong><p>{{ nearby?.description ?? '从含弘门出发，沿道路探索雕像花园与景观台阶。' }}</p></div></div>
      </section>
      <aside class="side-panel">
        <!-- 显示 TMX 世界像素坐标。 -->
        <section class="info-card"><p class="eyebrow">PLAYER STATUS</p><h2>冒险手册</h2><dl class="stats"><dt>当前位置</dt><dd>{{ status.scene }}</dd><dt>脚底坐标（像素）</dt><dd>{{ status.position.x }}, {{ status.position.y }}</dd><dt>朝向</dt><dd>{{ directionLabel(status.facing) }}</dd><dt>移动</dt><dd>{{ status.sprint ? '疾跑' : '步行' }}</dd></dl><button class="action" type="button" @click="activeScene()?.interact()">互动 / E</button></section>
        <section class="control-card"><p class="eyebrow">D-PAD</p><h2>移动控制</h2><div class="controls" aria-label="屏幕方向键">
          <button class="up" type="button" aria-label="向上" @pointerdown="setDirection('up', true)" @pointerup="setDirection('up', false)" @pointerleave="setDirection('up', false)" @pointercancel="setDirection('up', false)">▲</button>
          <button class="left" type="button" aria-label="向左" @pointerdown="setDirection('left', true)" @pointerup="setDirection('left', false)" @pointerleave="setDirection('left', false)" @pointercancel="setDirection('left', false)">◀</button>
          <button class="down" type="button" aria-label="向下" @pointerdown="setDirection('down', true)" @pointerup="setDirection('down', false)" @pointerleave="setDirection('down', false)" @pointercancel="setDirection('down', false)">▼</button>
          <button class="right" type="button" aria-label="向右" @pointerdown="setDirection('right', true)" @pointerup="setDirection('right', false)" @pointerleave="setDirection('right', false)" @pointercancel="setDirection('right', false)">▶</button>
        </div><p class="small">API：{{ apiStatus }}。地图按实景参考绘制，布局与距离为示意。</p></section>
        <section class="quest-card"><p class="eyebrow">QUEST LOG</p><h2>探索提示</h2><ol><li>沿中间道路穿过含弘门。</li><li>沿两侧道路绕过雕像花园。</li><li>靠近地标时按 E 查看介绍。</li></ol></section>
      </aside>
    </div>
    <div v-if="selected" class="dialog-backdrop" @click.self="selected = null"><section class="modal-dialog" role="dialog" aria-modal="true" :aria-label="selected.title"><p class="eyebrow">MESSAGE</p><h2>{{ selected.title }}</h2><p>{{ selected.body }}</p><button class="action" type="button" @click="selected = null">继续探索 ▶</button></section></div>
  </main>
</template>
