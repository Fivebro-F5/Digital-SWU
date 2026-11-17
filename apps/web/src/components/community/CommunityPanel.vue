<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import ChatTab from './ChatTab.vue';
import FeedTab from './FeedTab.vue';
import ProfileTab from './ProfileTab.vue';
import SettingsTab from './SettingsTab.vue';
import PixelIcon from './PixelIcon.vue';
import './community.css';
import { markNotificationsRead, notifications } from './store';

type TabKey = 'feed' | 'chat' | 'profile' | 'settings';

const open = defineModel<boolean>('open', { required: true });
const tab = ref<TabKey>('feed');
const bellOpen = ref(false);
const panel = ref<HTMLElement | null>(null);
const tabs = [
  { key: 'feed', label: '动态', icon: 'feed' },
  { key: 'chat', label: '消息', icon: 'chat' },
  { key: 'profile', label: '主页', icon: 'user' },
  { key: 'settings', label: '设置', icon: 'settings' },
] as const;

const unreadCount = computed(() => notifications.filter((item) => !item.read).length);

function switchTab(next: TabKey): void {
  tab.value = next;
  bellOpen.value = false;
}

function readAll(): void {
  markNotificationsRead();
  bellOpen.value = false;
}

function onPanelKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    open.value = false;
    return;
  }
  if (event.key !== 'Tab' || !panel.value) return;
  const focusable = [...panel.value.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled])')]
    .filter((element) => element.getClientRects().length > 0);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

watch(open, async (value) => {
  bellOpen.value = false;
  if (value) {
    await nextTick();
    panel.value?.focus({ preventScroll: true });
  }
});
</script>

<template>
  <aside
    v-show="open"
    ref="panel"
    class="community-panel"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-label="社群面板：动态、消息、主页与设置"
    @pointerdown.stop @mousedown.stop @click.stop @auxclick.stop.prevent @wheel.stop @keydown="onPanelKeydown"
  >
    <header class="community-header">
      <div class="community-title">
        <span class="community-mark" aria-hidden="true">西</span>
        <div>
          <strong>像素西大 · 社群</strong>
          <small>校园里的分享与交流</small>
        </div>
      </div>
      <div class="header-actions">
        <button type="button" class="bell icon-button" :aria-label="`通知（${unreadCount} 条未读）`" :aria-expanded="bellOpen" aria-controls="community-notices" title="通知" @click="bellOpen = !bellOpen">
          <PixelIcon name="bell" /><span v-if="unreadCount" class="bell-badge">{{ unreadCount }}</span>
        </button>
        <button type="button" class="community-close icon-button" aria-label="关闭社群面板（Esc）" title="关闭（Esc）" @click="open = false"><PixelIcon name="close" /></button>
      </div>
    </header>
    <section v-show="bellOpen" id="community-notices" class="bell-dropdown" aria-label="通知列表">
      <div class="bell-head"><strong>通知</strong><button type="button" :disabled="!unreadCount" @click="readAll"><PixelIcon name="check" />全部已读</button></div>
      <p v-if="!notifications.length" class="bell-empty">暂无通知。</p>
      <div v-for="item in notifications" :key="item.id" class="bell-item" :class="{ unread: !item.read }">
        <span>{{ item.text }}</span><small>{{ item.time }}</small>
      </div>
      <p class="bell-note">演示通知 · 刷新后还原</p>
    </section>
    <div class="community-tabs" role="tablist" aria-label="社群分区">
      <button v-for="item in tabs" :id="`community-tab-button-${item.key}`" :key="item.key" type="button" role="tab" :aria-selected="tab === item.key" :aria-controls="`community-tab-${item.key}`" :class="{ active: tab === item.key }" @click="switchTab(item.key)"><PixelIcon :name="item.icon" />{{ item.label }}</button>
    </div>
    <div class="community-body">
      <div v-show="tab === 'feed'" id="community-tab-feed" role="tabpanel" aria-labelledby="community-tab-button-feed" class="community-tab-panel"><FeedTab /></div>
      <div v-show="tab === 'chat'" id="community-tab-chat" role="tabpanel" aria-labelledby="community-tab-button-chat" class="community-tab-panel"><ChatTab /></div>
      <div v-show="tab === 'profile'" id="community-tab-profile" role="tabpanel" aria-labelledby="community-tab-button-profile" class="community-tab-panel"><ProfileTab @edit-profile="switchTab('settings')" /></div>
      <div v-show="tab === 'settings'" id="community-tab-settings" role="tabpanel" aria-labelledby="community-tab-button-settings" class="community-tab-panel"><SettingsTab /></div>
    </div>
    <footer class="community-footer"><span class="status-chip">本地演示</span><span>内容仅存当前页面，刷新后还原</span></footer>
  </aside>
</template>

