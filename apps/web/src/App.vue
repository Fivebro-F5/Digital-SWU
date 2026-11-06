<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type Phaser from 'phaser';
import type { HealthStatus } from '@digital-swu/contracts';
import type { CampusScene, DebugSnapshot, GameStatus, GameHooks } from './game/CampusScene';
import type { Direction } from './game/campus';

const canvasHost = ref<HTMLDivElement | null>(null);
const apiStatus = ref('检查中');
const nearby = ref<{ name: string; description: string } | null>(null);
const selected = ref<{ title: string; body: string } | null>(null);
const status = ref<GameStatus>({ scene: '含弘门', position: { x: 0, y: 0 }, facing: 'down', sprint: false });
const debug = ref<DebugSnapshot | null>(null);
let game: Phaser.Game | undefined;
let disposed = false;
let canvasObserver: ResizeObserver | undefined;
let debugTimer: number | undefined;

function activeScene(): CampusScene | undefined { return game?.scene.getScenes(true)[0] as CampusScene | undefined; }
function setDirection(direction: Direction, pressed: boolean): void { activeScene()?.setDirection(direction, pressed); }
function directionLabel(direction: Direction): string { return { up: '北 ↑', down: '南 ↓', left: '西 ←', right: '东 →' }[direction]; }
function fixed(value: number | undefined, digits = 1): string { return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits); }
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
function refreshDebug(): void {
  const scene = activeScene();
  if (scene?.scene.isActive()) debug.value = scene.getDebugSnapshot();
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
    debugTimer = window.setInterval(refreshDebug, 50);
  } catch (error) { apiStatus.value = '场景加载失败'; console.error(error); }
  try {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json() as HealthStatus;
    apiStatus.value = data.status === 'ok' ? '已连接' : '不可用';
  } catch { if (apiStatus.value !== '场景加载失败') apiStatus.value = '未连接'; }
});
onUnmounted(() => { disposed = true; if (debugTimer !== undefined) clearInterval(debugTimer); canvasObserver?.disconnect(); game?.destroy(true); });
</script>

<template>
  <main class="debug-page">
    <header class="debug-header">
      <div><p class="debug-kicker">DIGITAL SWU / RUNTIME TELEMETRY</p><h1>游戏调试台 <small>DEBUG CONSOLE</small></h1></div>
      <div class="header-status"><span class="status-light" :class="{ ready: debug }" />{{ debug ? 'SCENE ACTIVE' : 'LOADING' }}<span class="header-separator">|</span> API {{ apiStatus }}</div>
    </header>
    <div class="debug-layout">
      <section class="viewport-panel" aria-label="游戏画面">
        <div class="panel-heading"><span>01 / GAME VIEWPORT</span><span>{{ debug?.mapName ?? status.scene }} · {{ debug?.zoneId ?? '—' }}</span></div>
        <div ref="canvasHost" class="canvas-host" aria-label="俯视角像素校园画布" />
        <div class="viewport-stats"><span>LOGICAL {{ debug?.viewportWidth ?? 384 }} × {{ debug?.viewportHeight ?? 240 }}</span><span>FPS {{ fixed(debug?.fps, 0) }}</span><span>{{ debug?.renderer ?? '—' }}</span><span>ZOOM {{ fixed(debug?.cameraZoom, 2) }}×</span></div>
        <div class="event-panel"><span class="panel-label">NEARBY / EVENT</span><strong>{{ nearby?.name ?? '无活动交互区域' }}</strong><p>{{ nearby?.description ?? '面向区域按 E 查看；方向键或 WASD 移动，Shift 疾跑。' }}</p><button type="button" @click="activeScene()?.interact()">触发交互 E</button></div>
      </section>
      <aside class="debug-sidebar">
        <section class="debug-card"><h2><span>02</span> 玩家状态 / PLAYER</h2><dl class="telemetry">
          <dt>身处维度</dt><dd>{{ debug?.dimension ?? '—' }}</dd>
          <dt>区域 ID</dt><dd>{{ debug?.zoneId ?? '—' }}</dd>
          <dt>区域名称</dt><dd>{{ debug?.mapName ?? status.scene }}</dd>
          <dt>脚底坐标 X / Y</dt><dd>{{ debug?.logicalPosition.x ?? status.position.x }} / {{ debug?.logicalPosition.y ?? status.position.y }} px</dd>
          <dt>渲染坐标 X / Y</dt><dd>{{ fixed(debug?.renderPosition.x) }} / {{ fixed(debug?.renderPosition.y) }} px</dd>
          <dt>瓦片坐标 X / Y</dt><dd>{{ debug ? Math.floor(debug.logicalPosition.x / debug.tileSize) : '—' }} / {{ debug ? Math.floor(debug.logicalPosition.y / debug.tileSize) : '—' }}</dd>
          <dt>朝向</dt><dd>{{ directionLabel(debug?.facing ?? status.facing) }}</dd>
          <dt>运动状态</dt><dd>{{ debug?.moving ? (debug.sprint ? '疾跑' : '步行') : '静止' }}</dd>
          <dt>速度</dt><dd>{{ fixed(debug?.speed) }} px/s</dd>
          <dt>速度向量 X / Y</dt><dd>{{ fixed(debug?.velocity.x) }} / {{ fixed(debug?.velocity.y) }} px/s</dd>
        </dl></section>
        <section class="debug-card"><h2><span>03</span> 地图信息 / MAP</h2><dl class="telemetry">
          <dt>地图尺寸</dt><dd>{{ debug?.mapWidth ?? '—' }} × {{ debug?.mapHeight ?? '—' }} px</dd>
          <dt>瓦片尺寸</dt><dd>{{ debug?.tileSize ?? '—' }} px</dd>
          <dt>当前分区 / 总数</dt><dd>{{ debug?.zoneId ?? '—' }} / {{ debug?.zoneCount ?? '—' }}</dd>
          <dt>地形图层</dt><dd>{{ debug?.tileLayers ?? '—' }}</dd>
          <dt>地图贴图对象</dt><dd>{{ debug?.mapSprites ?? '—' }}</dd>
          <dt>碰撞区域</dt><dd>{{ debug?.collisionAreas ?? '—' }}</dd>
          <dt>交互区域</dt><dd>{{ debug?.interactionAreas ?? '—' }}</dd>
          <dt>镜头滚动 X / Y</dt><dd>{{ fixed(debug?.cameraX) }} / {{ fixed(debug?.cameraY) }} px</dd>
        </dl></section>
        <section class="debug-card"><h2><span>04</span> 运行资源 / RUNTIME</h2><dl class="telemetry">
          <dt>实时帧率</dt><dd>{{ fixed(debug?.fps, 0) }} FPS</dd>
          <dt>渲染后端</dt><dd>{{ debug?.renderer ?? '—' }}</dd>
          <dt>已加载纹理</dt><dd>{{ debug?.loadedTextures ?? '—' }}</dd>
          <dt>声明图片资源</dt><dd>{{ debug?.declaredImages ?? '—' }}</dd>
          <dt>场景对象</dt><dd>{{ debug?.sceneObjects ?? '—' }}</dd>
          <dt>API 健康状态</dt><dd>{{ apiStatus }}</dd>
        </dl></section>
        <section class="debug-card input-card"><h2><span>05</span> 输入测试 / INPUT</h2><p>WASD / 方向键移动 · Shift 疾跑 · E / 空格交互</p><div class="controls" aria-label="屏幕方向键">
          <button class="up" type="button" aria-label="向上" @pointerdown="setDirection('up', true)" @pointerup="setDirection('up', false)" @pointerleave="setDirection('up', false)" @pointercancel="setDirection('up', false)">↑</button>
          <button class="left" type="button" aria-label="向左" @pointerdown="setDirection('left', true)" @pointerup="setDirection('left', false)" @pointerleave="setDirection('left', false)" @pointercancel="setDirection('left', false)">←</button>
          <button class="down" type="button" aria-label="向下" @pointerdown="setDirection('down', true)" @pointerup="setDirection('down', false)" @pointerleave="setDirection('down', false)" @pointercancel="setDirection('down', false)">↓</button>
          <button class="right" type="button" aria-label="向右" @pointerdown="setDirection('right', true)" @pointerup="setDirection('right', false)" @pointerleave="setDirection('right', false)" @pointercancel="setDirection('right', false)">→</button>
        </div></section>
      </aside>
    </div>
    <div v-if="selected" class="dialog-backdrop" @click.self="selected = null"><section class="modal-dialog" role="dialog" aria-modal="true" :aria-label="selected.title"><p class="panel-label">INTERACTION EVENT</p><h2>{{ selected.title }}</h2><p>{{ selected.body }}</p><button type="button" @click="selected = null">关闭 / RETURN</button></section></div>
  </main>
</template>
