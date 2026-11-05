<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type Phaser from 'phaser';
import type { HealthStatus } from '@digital-swu/contracts';

const canvasHost = ref<HTMLDivElement | null>(null);
const apiStatus = ref('检查中');
let game: Phaser.Game | undefined;

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
    const data = (await response.json()) as HealthStatus;
    apiStatus.value = data.status === 'ok' ? '已连接' : '不可用';
  } catch {
    apiStatus.value = '未连接（可单独启动前端）';
  }
});

onUnmounted(() => game?.destroy(true));
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
