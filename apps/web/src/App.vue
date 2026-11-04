<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type Phaser from 'phaser';
import type { HealthStatus } from '@digital-swu/contracts';

const canvasHost = ref<HTMLDivElement | null>(null);
const apiStatus = ref('检查中');
let game: Phaser.Game | undefined;

onMounted(async () => {
  if (canvasHost.value) {
    const { default: PhaserRuntime } = await import('phaser');
    game = new PhaserRuntime.Game({
      type: PhaserRuntime.AUTO,
      parent: canvasHost.value,
      width: 640,
      height: 360,
      backgroundColor: '#dcece3',
      scene: {
        create(this: Phaser.Scene) {
          this.add.text(24, 24, '校园场景待制作', { color: '#173b35', fontSize: '26px' });
          this.add.text(24, 70, '当前仅验证 Phaser 渲染入口', { color: '#365b52', fontSize: '16px' });
        },
      },
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
  <main>
    <h1>数字西大</h1>
    <p>项目技术栈初始化</p>
    <p>API：{{ apiStatus }}</p>
    <div ref="canvasHost" class="canvas-host" aria-label="校园场景占位画布" />
    <p class="note">地图、登录、多人同步与校园数据尚未实现。</p>
  </main>
</template>
