<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { acceptRequest, addFriend, befriendNpc, conversations, createGroup, friendRequests, openConversation, openNpcConversation, rejectRequest, sendMessage } from './store';
import type { NpcChatTarget } from './demoData';
import PixelIcon from './PixelIcon.vue';

const props = defineProps<{ chatRequest: NpcChatTarget | null }>();
const activeId = ref<string | null>(conversations[0]?.id ?? null);
const draft = ref('');
const addingFriend = ref(false);
const newFriendName = ref('');
const mobileView = ref<'list' | 'conversation'>('list');

const friends = computed(() => conversations.filter((conversation) => conversation.kind === 'friend'));
const groups = computed(() => conversations.filter((conversation) => conversation.kind === 'group'));
const temporary = computed(() => conversations.filter((conversation) => conversation.kind === 'temporary'));
const active = computed(() => conversations.find((conversation) => conversation.id === activeId.value) ?? null);

function select(id: string): void {
  activeId.value = id;
  mobileView.value = 'conversation';
  const conversation = conversations.find((item) => item.id === id);
  if (conversation) openConversation(conversation);
}

function send(): void {
  const body = draft.value.trim();
  const conversation = active.value;
  if (!body || !conversation) return;
  sendMessage(conversation, body);
  draft.value = '';
}

function create(): void {
  const conversation = createGroup();
  activeId.value = conversation.id;
  mobileView.value = 'conversation';
}

function submitAddFriend(): void {
  const name = newFriendName.value.trim();
  if (!name) return;
  const conversation = addFriend(name);
  activeId.value = conversation.id;
  mobileView.value = 'conversation';
  newFriendName.value = '';
  addingFriend.value = false;
}

watch(() => props.chatRequest, (target) => {
  if (!target) return;
  const conversation = openNpcConversation(target);
  select(conversation.id);
}, { immediate: true });
</script>

<template>
  <div class="chat">
    <p class="demo-note">消息与群聊 <span>选择会话后即可继续交流</span></p>
    <div class="chat-layout" :class="{ 'show-conversation': mobileView === 'conversation' }">
      <nav class="conv-list" aria-label="会话列表">
        <section v-if="friendRequests.length">
          <h3>好友请求</h3>
          <div v-for="request in friendRequests" :key="request.id" class="request">
            <span class="avatar">{{ request.name.slice(0, 1) }}</span>
            <span class="request-meta"><strong>{{ request.name }}</strong><small>{{ request.message }}</small></span>
            <span class="request-actions">
              <button type="button" class="mini accept" :aria-label="`接受 ${request.name} 的好友请求`" @click="acceptRequest(request.id)">接受</button>
              <button type="button" class="mini" :aria-label="`拒绝 ${request.name} 的好友请求`" @click="rejectRequest(request.id)">拒绝</button>
            </span>
          </div>
        </section>
        <section>
          <h3>好友 <button type="button" class="new-group" :aria-expanded="addingFriend" @click="addingFriend = !addingFriend"><PixelIcon name="plus" />添加</button></h3>
          <div v-if="addingFriend" class="add-friend">
            <input v-model="newFriendName" type="text" maxlength="20" placeholder="好友昵称（演示）" @keydown.enter.prevent="submitAddFriend" />
            <button class="pixel-btn primary small" type="button" :disabled="!newFriendName.trim()" @click="submitAddFriend">确定</button>
          </div>
          <button v-for="conversation in friends" :key="conversation.id" type="button" class="conv" :class="{ active: conversation.id === activeId }" @click="select(conversation.id)">
            <span class="avatar">{{ conversation.name.slice(0, 1) }}</span>
            <span class="conv-meta"><strong>{{ conversation.name }}</strong><small>{{ conversation.messages.at(-1)?.body ?? '暂无消息' }}</small></span>
            <span v-if="conversation.unread" class="badge">{{ conversation.unread }}</span>
            <span v-else class="conv-time">{{ conversation.lastTime }}</span>
          </button>
        </section>
        <section>
          <h3>群组 <button type="button" class="new-group" @click="create"><PixelIcon name="plus" />新建群聊</button></h3>
          <button v-for="conversation in groups" :key="conversation.id" type="button" class="conv" :class="{ active: conversation.id === activeId }" @click="select(conversation.id)">
            <span class="avatar group">{{ conversation.name.slice(0, 1) }}</span>
            <span class="conv-meta"><strong>{{ conversation.name }}</strong><small>{{ conversation.messages.at(-1)?.body ?? '暂无消息' }}</small></span>
            <span v-if="conversation.unread" class="badge">{{ conversation.unread }}</span>
            <span v-else class="conv-time">{{ conversation.lastTime }}</span>
          </button>
        </section>
        <section v-if="temporary.length">
          <h3>临时对话</h3>
          <button v-for="conversation in temporary" :key="conversation.id" type="button" class="conv" :class="{ active: conversation.id === activeId }" @click="select(conversation.id)">
            <span class="avatar">{{ conversation.name.slice(0, 1) }}</span>
            <span class="conv-meta"><strong>{{ conversation.name }}</strong><small>{{ conversation.messages.at(-1)?.body ?? '路上遇见的同学' }}</small></span>
            <span class="conv-time">{{ conversation.lastTime }}</span>
          </button>
        </section>
      </nav>
      <section v-if="active" class="chat-window" :aria-label="`与 ${active.name} 的会话`">
        <header class="chat-head">
          <button type="button" class="chat-back icon-button" aria-label="返回会话列表" @click="mobileView = 'list'"><PixelIcon name="back" /></button>
          <span class="avatar small" :class="{ group: active.kind === 'group' }">{{ active.name.slice(0, 1) }}</span>
          <div class="chat-identity"><strong>{{ active.name }}</strong><small>{{ active.kind === 'group' ? '群聊' : active.kind === 'temporary' ? '临时对话' : '好友' }} · 本地演示</small></div>
          <button v-if="active.kind === 'temporary'" type="button" class="pixel-btn ghost small chat-add-friend" @click="befriendNpc(active)"><PixelIcon name="plus" />添加好友</button>
        </header>
        <div class="messages">
          <p v-if="!active.messages.length" class="messages-empty">{{ active.kind === 'temporary' ? '这是临时对话。添加好友后会保留在好友列表。' : '暂无消息，说点什么吧。' }}</p>
          <div v-for="message in active.messages" :key="message.id" class="message" :class="{ self: message.self }">
            <span v-if="!message.self" class="message-sender">{{ message.sender }}</span>
            <span class="bubble">{{ message.body }}</span>
            <span class="message-time">{{ message.time }}</span>
          </div>
        </div>
        <div class="message-box">
          <input v-model="draft" type="text" maxlength="200" placeholder="输入消息，按回车发送…" @keydown.enter.prevent="send" />
          <button class="pixel-btn primary small" type="button" :disabled="!draft.trim()" @click="send"><PixelIcon name="send" />发送</button>
        </div>
      </section>
      <section v-else class="chat-window empty"><p>选择一个会话开始聊天。</p></section>
    </div>
  </div>
</template>

