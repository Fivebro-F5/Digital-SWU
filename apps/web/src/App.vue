<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import type Phaser from 'phaser';
import type { HealthStatus } from '@digital-swu/contracts';
import type { CampusScene, DebugSnapshot, GameStatus, GameHooks, GridMode, ObjectDebugMode } from './game/CampusScene';
import CampusDialogue from './components/CampusDialogue.vue';
import CampusMinimap from './components/CampusMinimap.vue';
import CommunityPanel from './components/community/CommunityPanel.vue';
import PixelIcon from './components/community/PixelIcon.vue';
import type { MinimapSnapshot } from './game/minimap';
import type { Direction } from './game/campus';

const canvasHost = ref<HTMLDivElement | null>(null);
const overlayCanvas = ref<HTMLCanvasElement | null>(null);
const minimapCollapsed = ref(false);
const minimapSnapshot = shallowRef<MinimapSnapshot | null>(null);
const minimapOverview = shallowRef<HTMLCanvasElement | null>(null);
const apiStatus = ref('检查中');
const communityOpen = ref(false);
const communityEntry = ref<HTMLButtonElement | null>(null);
const nearby = ref<{ name: string; description: string } | null>(null);
const selected = ref<{ title: string; body: string } | null>(null);
const status = ref<GameStatus>({ scene: '含弘门', position: { x: 0, y: 0 }, facing: 'down', sprint: false });
const debug = ref<DebugSnapshot | null>(null);
const gridMode = ref<GridMode>('off');
const collisionMode = ref<'off' | 'on'>('off');
const objectDebugMode = ref<ObjectDebugMode>('off');
const resolution = ref<'auto' | '384x240' | '768x480' | '1152x720' | '1536x960' | '1920x1200' | '2560x1600'>('auto');
const zoomInput = ref('1');
const dragging = ref(false);
let lastMouse = { x: 0, y: 0 };
let panStart = { x: 0, y: 0 };
let panMoved = false;
let game: Phaser.Game | undefined;
let disposed = false;
let canvasObserver: ResizeObserver | undefined;
let debugTimer: number | undefined;
let overlayFrame: number | undefined;
let overlayPainted = false;

function activeScene(): CampusScene | undefined { return game?.scene.getScenes(true)[0] as CampusScene | undefined; }
function setDirection(direction: Direction, pressed: boolean): void { activeScene()?.setDirection(direction, pressed); }
function changeGridMode(): void { activeScene()?.setGridMode(gridMode.value); }
function viewSize(): { width: number; height: number } {
  if (resolution.value === 'auto') return {
    width: Math.max(1, canvasHost.value?.clientWidth ?? 768),
    height: Math.max(1, canvasHost.value?.clientHeight ?? 480),
  };
  const [width, height] = resolution.value.split('x').map(Number);
  return { width, height };
}
function syncViewport(): void {
  const { width, height } = viewSize();
  if (game && (game.scale.gameSize.width !== width || game.scale.gameSize.height !== height)) game.scale.resize(width, height);
  activeScene()?.setViewportSize(width, height, canvasHost.value?.getBoundingClientRect().width ?? width);
  game?.scale.refresh();
  refreshDebug();
}
function changeResolution(): void { syncViewport(); }
function onWheel(event: WheelEvent): void {
  const scene = activeScene();
  scene?.zoomBy(event.deltaY);
  if (scene) zoomInput.value = String(scene.getDebugSnapshot().cameraZoom);
  refreshDebug();
}
function changeZoom(event: Event): void {
  const scene = activeScene();
  const input = event.target as HTMLInputElement;
  const zoom = scene?.setZoom(Number(input.value)) ?? 1;
  zoomInput.value = input.value = String(zoom);
  refreshDebug();
}
function resetCamera(): void {
  activeScene()?.resetCamera();
  zoomInput.value = '1';
  refreshDebug();
}
function onMouseDown(event: MouseEvent): void {
  if (event.button !== 1) return;
  event.preventDefault();
  dragging.value = true;
  lastMouse = { x: event.clientX, y: event.clientY };
  panStart = { ...lastMouse };
  panMoved = false;
}
function onMouseMove(event: MouseEvent): void {
  if (!dragging.value) return;
  if (!(event.buttons & 4)) return;
  if (!panMoved) {
    if (Math.hypot(event.clientX - panStart.x, event.clientY - panStart.y) < 4) return;
    panMoved = true;
    activeScene()?.beginPan();
  }
  activeScene()?.panBy(event.clientX - lastMouse.x, event.clientY - lastMouse.y);
  lastMouse = { x: event.clientX, y: event.clientY };
}
function stopPan(event: MouseEvent): void {
  if (event.button === 1 && dragging.value && !panMoved) resetCamera();
  dragging.value = false;
  panMoved = false;
}
function directionLabel(direction: Direction): string { return { up: '北 ↑', down: '南 ↓', left: '西 ←', right: '东 →' }[direction]; }
function fixed(value: number | undefined, digits = 1): string { return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits); }
function refreshDebug(): void {
  const scene = activeScene();
  if (scene?.scene.isActive()) {
    if (!debug.value) scene.setGridMode(gridMode.value);
    debug.value = scene.getDebugSnapshot();
    if (!minimapCollapsed.value) {
      minimapOverview.value = scene.getMinimapOverview();
      minimapSnapshot.value = scene.getMinimapSnapshot();
    }
  }
}
function paintDebugOverlay(): void {
  const overlay = overlayCanvas.value;
  const host = canvasHost.value;
  if (overlay && host) {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    if (overlay.width !== width || overlay.height !== height) {
      overlay.width = width;
      overlay.height = height;
      overlayPainted = false;
    }
    const context = overlay.getContext('2d');
    const scene = activeScene();
    const active = (gridMode.value !== 'off' || collisionMode.value === 'on' || objectDebugMode.value !== 'off') && Boolean(scene?.scene.isActive());
    if (context && (active || overlayPainted)) context.clearRect(0, 0, width, height);
    if (context && active && scene) {
      if (gridMode.value !== 'off') scene.paintGrid(context, width, height);
      if (objectDebugMode.value !== 'off') scene.paintObjectDebugBoxes(context, width, height, objectDebugMode.value);
      if (collisionMode.value === 'on') scene.paintCollisionBoxes(context, width, height);
    }
    overlayPainted = Boolean(context && active);
  }
  overlayFrame = window.requestAnimationFrame(paintDebugOverlay);
}

// 社群面板快捷键：P 开关，Esc 关闭；输入框内打字时不触发，对话打开时 P 不生效。
function onGlobalKey(event: KeyboardEvent): void {
  if (event.code === 'Escape' && communityOpen.value) {
    communityOpen.value = false;
    return;
  }
  const target = event.target as HTMLElement | null;
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
  if (event.repeat) return;
  if (event.code === 'KeyP' && !selected.value) {
    communityOpen.value = !communityOpen.value;
    return;
  }
}

watch(communityOpen, async (value) => {
  if (!value) {
    await nextTick();
    communityEntry.value?.focus({ preventScroll: true });
  }
});

onMounted(async () => {
  window.addEventListener('mouseup', stopPan);
  window.addEventListener('keydown', onGlobalKey);
  try {
    const [{ default: PhaserRuntime }, { CampusScene: GateScene }] = await Promise.all([import('phaser'), import('./game/CampusScene')]);
    if (disposed || !canvasHost.value) return;
    const hooks: GameHooks = {
      onNearby: (name, description = '') => { nearby.value = name ? { name, description } : null; },
      onMessage: (title, body) => { selected.value = { title, body }; },
      onStatus: (next) => { status.value = next; },
      isOverlayOpen: () => selected.value !== null || communityOpen.value,
    };
    game = new PhaserRuntime.Game({ type: PhaserRuntime.AUTO, parent: canvasHost.value, width: viewSize().width, height: viewSize().height, backgroundColor: '#92bd70', pixelArt: true, roundPixels: true, scene: [new GateScene(hooks)], scale: { mode: PhaserRuntime.Scale.FIT, autoCenter: PhaserRuntime.Scale.CENTER_BOTH } });
    canvasObserver = new ResizeObserver(syncViewport);
    canvasObserver.observe(canvasHost.value);
    debugTimer = window.setInterval(refreshDebug, 50);
    overlayFrame = window.requestAnimationFrame(paintDebugOverlay);
  } catch (error) { apiStatus.value = '场景加载失败'; console.error(error); }
  try {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json() as HealthStatus;
    apiStatus.value = data.status === 'ok' ? '已连接' : '不可用';
  } catch { if (apiStatus.value !== '场景加载失败') apiStatus.value = '未连接'; }
});
onUnmounted(() => { disposed = true; window.removeEventListener('mouseup', stopPan); window.removeEventListener('keydown', onGlobalKey); if (debugTimer !== undefined) clearInterval(debugTimer); if (overlayFrame !== undefined) cancelAnimationFrame(overlayFrame); canvasObserver?.disconnect(); game?.destroy(true); });
</script>

<template>
  <main class="debug-page">
    <header class="debug-header">
      <div><p class="debug-kicker">DIGITAL SWU / RUNTIME TELEMETRY</p><h1>游戏调试台 <small>DEBUG CONSOLE</small></h1></div>
      <div class="header-status"><span class="status-light" :class="{ ready: debug }" />{{ debug ? 'SCENE ACTIVE' : 'LOADING' }}<span class="header-separator">|</span> API {{ apiStatus }}</div>
    </header>
    <div class="debug-layout">
      <section class="viewport-panel" aria-label="游戏画面">
        <div class="panel-heading"><span>01 / GAME VIEWPORT · {{ debug?.mapName ?? status.scene }} · {{ debug?.zoneId ?? '—' }}</span><div class="viewport-toolbar"><label for="resolution">Canvas 尺寸</label><select id="resolution" v-model="resolution" @change="changeResolution"><option value="auto">随父级（原画）</option><option value="384x240">384 × 240</option><option value="768x480">768 × 480</option><option value="1152x720">1152 × 720</option><option value="1536x960">1536 × 960</option><option value="1920x1200">1920 × 1200</option><option value="2560x1600">2560 × 1600</option></select><label for="zoom-input">ZOOM</label><input id="zoom-input" type="number" inputmode="decimal" step="any" aria-label="镜头缩放倍数" :value="zoomInput" @change="changeZoom" @keyup.enter="changeZoom" /><label for="grid-mode">Tile 轮廓</label><select id="grid-mode" v-model="gridMode" @change="changeGridMode"><option value="off">关闭</option><option value="category">按类别</option><option value="cell">逐格</option></select><label for="collision-mode">碰撞框</label><select id="collision-mode" v-model="collisionMode"><option value="off">关闭</option><option value="on">显示</option></select><label for="object-debug-mode">对象调试框</label><select id="object-debug-mode" v-model="objectDebugMode"><option value="off">关闭</option><option value="interaction">交互与传送</option><option value="entity">特殊实体</option><option value="all">全部</option></select><button type="button" @click="resetCamera">复位视角</button></div></div>
        <div class="game-screen">
          <div ref="canvasHost" tabindex="-1" class="canvas-host" :class="{ dragging }" aria-label="俯视角像素校园画布" @wheel.prevent="onWheel" @mousedown="onMouseDown" @mousemove="onMouseMove" @auxclick.prevent><canvas ref="overlayCanvas" class="debug-overlay" aria-hidden="true" /><CampusMinimap v-model:collapsed="minimapCollapsed" :snapshot="minimapSnapshot" :overview="minimapOverview" /></div>
          <button v-if="!communityOpen" ref="communityEntry" class="community-entry" type="button" aria-label="打开社群面板（快捷键 P）" title="社群（P）" @click="communityOpen = true"><PixelIcon name="chat" />社群<kbd>P</kbd></button>
          <CommunityPanel v-model:open="communityOpen" />
          <CampusDialogue v-if="selected" :title="selected.title" :body="selected.body" @close="selected = null; canvasHost?.focus({ preventScroll: true })" />
          <button v-else-if="nearby" class="nearby-prompt" type="button" @click="activeScene()?.interact()">
            <kbd>E</kbd> 查看 · {{ nearby.name }}
          </button>
        </div>
        <div class="viewport-stats"><span>CANVAS {{ debug?.viewportWidth ?? viewSize().width }} × {{ debug?.viewportHeight ?? viewSize().height }}</span><span>FPS {{ fixed(debug?.fps, 0) }}</span><span>{{ debug?.renderer ?? '—' }}</span><span>ZOOM {{ fixed(debug?.cameraZoom, 2) }}×</span><span v-if="collisionMode === 'on'">红框 TMX 碰撞区 · 青框 贴图范围 · 黄十字 脚底判定点</span><span v-if="objectDebugMode !== 'off'">黄框 交互 · 蓝框 传送 · 紫框 特殊实体/占位</span></div>
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
          <dt>传送区域</dt><dd>{{ debug?.portalAreas ?? '—' }}</dd>
          <dt>特殊实体/占位</dt><dd>{{ debug?.specialEntityAreas ?? '—' }}</dd>
          <dt>镜头滚动 X / Y</dt><dd>{{ fixed(debug?.cameraX) }} / {{ fixed(debug?.cameraY) }} px</dd>
          <dt>画面中心 X / Y</dt><dd>{{ fixed(debug?.cameraCenterX) }} / {{ fixed(debug?.cameraCenterY) }} px</dd>
          <dt>镜头模式</dt><dd>{{ debug?.cameraMode ?? '—' }}</dd>
          <dt>可见世界范围</dt><dd>{{ fixed(debug?.visibleWorldWidth, 0) }} × {{ fixed(debug?.visibleWorldHeight, 0) }} px</dd>
        </dl></section>
        <section class="debug-card"><h2><span>04</span> 运行资源 / RUNTIME</h2><dl class="telemetry">
          <dt>实时帧率</dt><dd>{{ fixed(debug?.fps, 0) }} FPS</dd>
          <dt>渲染后端</dt><dd>{{ debug?.renderer ?? '—' }}</dd>
          <dt>已加载纹理</dt><dd>{{ debug?.loadedTextures ?? '—' }}</dd>
          <dt>声明图片资源</dt><dd>{{ debug?.declaredImages ?? '—' }}</dd>
          <dt>场景对象</dt><dd>{{ debug?.sceneObjects ?? '—' }}</dd>
          <dt>API 健康状态</dt><dd>{{ apiStatus }}</dd>
        </dl></section>
        <section class="debug-card input-card"><h2><span>05</span> 输入测试 / INPUT</h2><p>组合 WASD / 方向键八向移动 · Shift 疾跑 · E / 空格交互 · P 社群</p><div class="controls" aria-label="屏幕方向键">
          <button class="up" type="button" aria-label="向上" @pointerdown="setDirection('up', true)" @pointerup="setDirection('up', false)" @pointerleave="setDirection('up', false)" @pointercancel="setDirection('up', false)">↑</button>
          <button class="left" type="button" aria-label="向左" @pointerdown="setDirection('left', true)" @pointerup="setDirection('left', false)" @pointerleave="setDirection('left', false)" @pointercancel="setDirection('left', false)">←</button>
          <button class="down" type="button" aria-label="向下" @pointerdown="setDirection('down', true)" @pointerup="setDirection('down', false)" @pointerleave="setDirection('down', false)" @pointercancel="setDirection('down', false)">↓</button>
          <button class="right" type="button" aria-label="向右" @pointerdown="setDirection('right', true)" @pointerup="setDirection('right', false)" @pointerleave="setDirection('right', false)" @pointercancel="setDirection('right', false)">→</button>
        </div></section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.game-screen { position: relative; }
.nearby-prompt {
  position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); z-index: 3;
  width: max-content; max-width: 95%; padding: 7px 12px; border: 2px solid #344c48;
  background: #fff3cf; color: #294440; box-shadow: 3px 3px #344c48; font-weight: bold;
}
.nearby-prompt kbd { padding: 0 3px; color: #fff3cf; background: #344c48; }
.community-entry {
  position: absolute; right: 0; top: 50%; transform: translateY(-50%); z-index: 4;
  display: flex; align-items: center; gap: 6px; padding: 16px 10px;
  writing-mode: vertical-rl;
  color: #f3f3d7; background: #2c463b; border: 2px solid #8fa98b; border-right: none;
  font-family: 'Fusion Pixel SWU', 'Microsoft YaHei', sans-serif; font-size: 14px;
  font-weight: 700; letter-spacing: 0.2em; cursor: pointer;
}
.community-entry:hover { background: #36594c; }
.community-entry kbd { writing-mode: horizontal-tb; padding: 0 3px; font-size: 10px; color: #2c463b; background: #f3f3d7; }
.community-entry .pixel-icon { width: 16px; height: 16px; }
</style>
