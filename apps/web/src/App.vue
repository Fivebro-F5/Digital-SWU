<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type Phaser from 'phaser';
import type { HealthStatus } from '@digital-swu/contracts';
import type { CampusScene, InteriorScene, GameStatus, GameHooks } from './game/CampusScene';
import type { Direction } from './game/campus';

const canvasHost = ref<HTMLDivElement | null>(null);
const apiStatus = ref('检查中');
const nearby = ref<{ name: string; description: string } | null>(null);
const selected = ref<{ title: string; body: string } | null>(null);
const status = ref<GameStatus>({ scene: '校园', floor: 1, position: { x: 15, y: 12 }, facing: 'down', sprint: false, hasCard: false });
let game: Phaser.Game | undefined;
let disposed = false;
let canvasObserver: ResizeObserver | undefined;
function activeScene(): CampusScene | InteriorScene | undefined { return game?.scene.getScenes(true)[0] as CampusScene | InteriorScene | undefined; }
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
  if (canvasHost.value) {
    const [{ default: PhaserRuntime }, { CampusScene }] = await Promise.all([
      import('phaser'),
      import('./game/CampusScene'),
    ]);
    if (!canvasHost.value) return;
    game = new PhaserRuntime.Game({
      type: PhaserRuntime.AUTO,
      parent: canvasHost.value,
      width: 640,
      height: 360,
      backgroundColor: '#174275',
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 } },
      },
      scale: { mode: PhaserRuntime.Scale.RESIZE },
      scene: CampusScene,
    });
  }
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
  <main class="campus">
    <div ref="canvasHost" class="canvas-host" aria-label="校园角色移动画布" />
    <header class="campus-hud">
      <h1>数字西大</h1>
      <p>WASD 或 ↑ ↓ ← → 移动</p>
    </header>
  </main>
</template>
