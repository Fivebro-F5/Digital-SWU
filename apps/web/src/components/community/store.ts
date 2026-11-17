// 社群 UI 原型的共享内存状态层：所有“操作”只修改这里的响应式数据，
// 刷新页面即清空。后续接入服务端时，把这里的动作替换为经过身份校验的
// HTTP / Socket.IO 调用即可，组件无需改交互结构。
import { reactive } from 'vue';
import {
  demoConversations, demoFriendRequests, demoNotifications, demoPosts, demoProfile,
  groupAvatarPalette,
  type CommunityPost, type Conversation, type DemoProfile,
} from './demoData';

export const profile = reactive<DemoProfile>({ ...demoProfile });
export const posts = reactive<CommunityPost[]>(demoPosts.map((post) => ({ ...post, comments: [...post.comments] })));
export const conversations = reactive<Conversation[]>(demoConversations.map((conversation) => ({ ...conversation, messages: [...conversation.messages] })));
export const friendRequests = reactive(demoFriendRequests.map((request) => ({ ...request })));
export const notifications = reactive(demoNotifications.map((item) => ({ ...item })));

export const unreadNotificationCount = () => notifications.filter((item) => !item.read).length;

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

export function publishPost(body: string): void {
  posts.unshift({
    id: Date.now(), author: profile.name, role: '动态', time: '刚刚',
    body, likes: 0, liked: false, self: true, comments: [],
  });
}

export function toggleLike(post: CommunityPost): void {
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
}

export function addComment(post: CommunityPost, body: string): void {
  post.comments.push({ author: profile.name, body });
}

export function deletePost(id: number): void {
  const index = posts.findIndex((post) => post.id === id);
  if (index >= 0) posts.splice(index, 1);
}

export function sendMessage(conversation: Conversation, body: string): void {
  conversation.messages.push({ id: Date.now(), sender: profile.name, body, time: nowTime(), self: true });
  conversation.lastTime = nowTime();
}

export function openConversation(conversation: Conversation): void {
  conversation.unread = 0;
}

export function createGroup(): Conversation {
  const conversation: Conversation = {
    id: `group-demo-${Date.now()}`,
    name: `新群组 ${conversations.filter((item) => item.kind === 'group').length + 1}`,
    kind: 'group',
    avatarColor: groupAvatarPalette[conversations.length % groupAvatarPalette.length],
    lastTime: '现在',
    messages: [],
  };
  conversations.push(conversation);
  return conversation;
}

export function addFriend(name: string): Conversation {
  const conversation: Conversation = {
    id: `friend-demo-${Date.now()}`,
    name,
    kind: 'friend',
    avatarColor: groupAvatarPalette[conversations.length % groupAvatarPalette.length],
    lastTime: '现在',
    messages: [],
  };
  conversations.push(conversation);
  return conversation;
}

export function acceptRequest(id: number): void {
  const index = friendRequests.findIndex((request) => request.id === id);
  if (index < 0) return;
  const [request] = friendRequests.splice(index, 1);
  conversations.push({
    id: `friend-demo-${Date.now()}`,
    name: request.name,
    kind: 'friend',
    avatarColor: groupAvatarPalette[conversations.length % groupAvatarPalette.length],
    lastTime: '现在',
    messages: [],
  });
}

export function rejectRequest(id: number): void {
  const index = friendRequests.findIndex((request) => request.id === id);
  if (index >= 0) friendRequests.splice(index, 1);
}

export function markNotificationsRead(): void {
  for (const item of notifications) item.read = true;
}
