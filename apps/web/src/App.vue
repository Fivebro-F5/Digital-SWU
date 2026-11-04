<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type Phaser from 'phaser';
import type { HealthStatus } from '@digital-swu/contracts';
import type { Place } from './game/campus';
import type { CampusScene } from './game/CampusScene';

type Direction = 'up' | 'down' | 'left' | 'right';
const canvasHost = ref<HTMLDivElement | null>(null);
const apiStatus = ref('检查中');
const nearby = ref<Place | null>(null);
const selected = ref<Place | null>(null);
let game: Phaser.Game | undefined;
let scene: CampusScene | undefined;
let disposed = false;

function setDirection(direction: Direction, pressed: boolean): void {
  scene?.setDirection(direction, pressed);
}

onMounted(async () => {
  try {
    const [{ default: PhaserRuntime }, { CampusScene: SceneClass }] = await Promise.all([import('phaser'), import('./game/CampusScene')]);
    if (disposed || !canvasHost.value) return;
    scene = new SceneClass((place) => { nearby.value = place; }, (place) => { selected.value = place; });
    game = new PhaserRuntime.Game({
      type: PhaserRuntime.AUTO,
      parent: canvasHost.value,
      width: 960,
      height: 550,
      backgroundColor: '#d9e7dd',
      scene: [scene],
      scale: { mode: PhaserRuntime.Scale.FIT, autoCenter: PhaserRuntime.Scale.CENTER_BOTH },
    });
  } catch {
    apiStatus.value = '场景加载失败';
  }
  try {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error(String(response.status));
    const data = (await response.json()) as HealthStatus;
    apiStatus.value = data.status === 'ok' ? '已连接' : '不可用';
  } catch {
    if (apiStatus.value !== '场景加载失败') apiStatus.value = '未连接（单人原型仍可玩）';
  }
});

onUnmounted(() => { disposed = true; game?.destroy(true); });
</script>

<template>
  <main class="page">
    <header class="header">
      <div><p class="eyebrow">DIGITAL SWU · PROGRAM PROTOTYPE</p><h1>数字西大</h1><p class="subtitle">走进一座正在搭建的校园</p></div>
      <span class="prototype-badge">局部场景 · 原型示意</span>
    </header>
    <div class="layout">
      <section class="stage-panel" aria-label="校园游戏场景">
        <div class="stage-top"><span class="live-dot" /> 校园探索 <span class="stage-state">API：{{ apiStatus }}</span></div>
        <div ref="canvasHost" class="canvas-host" aria-label="等距校园游戏画布" />
        <div class="stage-footer">WASD / 方向键移动 <span>靠近黄色标记按 E 互动</span></div>
      </section>
      <aside class="side-panel">
        <section class="info-card">
          <span class="card-kicker">当前位置</span><h2>{{ nearby?.name ?? '校园道路' }}</h2>
          <p>{{ nearby ? '已到达互动范围。按 E 或点击按钮了解地点。' : '沿着道路探索，靠近建筑旁的黄色标记。' }}</p>
          <button class="action" type="button" :disabled="!nearby" @click="scene?.interact()">查看地点</button>
        </section>
        <section class="control-card">
          <span class="card-kicker">移动控制</span>
          <div class="controls" aria-label="屏幕方向键">
            <button class="up" type="button" aria-label="向上" @pointerdown="setDirection('up', true)" @pointerup="setDirection('up', false)" @pointerleave="setDirection('up', false)" @pointercancel="setDirection('up', false)">↑</button>
            <button class="left" type="button" aria-label="向左" @pointerdown="setDirection('left', true)" @pointerup="setDirection('left', false)" @pointerleave="setDirection('left', false)" @pointercancel="setDirection('left', false)">←</button>
            <button class="down" type="button" aria-label="向下" @pointerdown="setDirection('down', true)" @pointerup="setDirection('down', false)" @pointerleave="setDirection('down', false)" @pointercancel="setDirection('down', false)">↓</button>
            <button class="right" type="button" aria-label="向右" @pointerdown="setDirection('right', true)" @pointerup="setDirection('right', false)" @pointerleave="setDirection('right', false)" @pointercancel="setDirection('right', false)">→</button>
          </div>
          <p>建筑和位置均为虚构示意，尚未使用真实校园地理数据。</p>
        </section>
      </aside>
    </div>
    <div v-if="selected" class="dialog-backdrop" @click.self="selected = null">
      <section class="dialog" role="dialog" aria-modal="true" :aria-label="selected.name">
        <span class="card-kicker">地点交互 · 原型</span><h2>{{ selected.name }}</h2><p>{{ selected.description }}</p>
        <button class="action" type="button" @click="selected = null">继续探索</button>
      </section>
    </div>
  </main>
</template>
