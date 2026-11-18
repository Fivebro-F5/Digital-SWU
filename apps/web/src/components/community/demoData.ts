// 社群 UI 原型的演示数据：仅存在于浏览器内存，刷新页面即清空。
// 这些名字与内容均为虚构演示文案，不代表真实用户、真实聊天记录，
// 也不代表已接入任何服务端、认证、审核或上传能力。
// 界面使用统一的校园像素风；演示数据与视觉样式相互独立。
import hanhongNorthSeam from './assets/hanhong-north-seam.png';

export interface CommunityPost {
  id: number;
  author: string;
  role: string;
  time: string;
  body: string;
  image?: { src: string; alt: string };
  likes: number;
  liked: boolean;
  self?: boolean;
  comments: { author: string; body: string }[];
}

export interface ChatMessage {
  id: number;
  sender: string;
  body: string;
  time: string;
  self?: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  kind: 'friend' | 'group' | 'temporary';
  npcId?: string;
  avatarColor: string;
  lastTime: string;
  unread?: number;
  messages: ChatMessage[];
}

export interface NpcChatTarget { id: string; name: string }

export interface FriendRequest {
  id: number;
  name: string;
  message: string;
}

export interface NotificationItem {
  id: number;
  text: string;
  time: string;
  read: boolean;
}

export interface DemoProfile {
  name: string;
  role: string;
  bio: string;
  location: string;
  email: string;
  phone: string;
  joinDate: string;
}

export const demoProfile: DemoProfile = {
  name: '我（本地演示）',
  role: '像素西大 · 演示账号',
  bio: '在像素校园里散步的演示用户，负责帮大家试路。',
  location: '西南大学 · 像素校区',
  email: 'demo@local.example',
  phone: '未填写',
  joinDate: '2026-11-17',
};

export const demoPosts: CommunityPost[] = [
  {
    id: 1,
    author: '像素小鸟',
    role: '原型测试员',
    time: '10 分钟前',
    body: '含弘门往北的六区接缝已经可以连续走了，有人试过斜向穿缝吗？',
    image: {
      src: hanhongNorthSeam,
      alt: '像素校园道路上的小鸟角色，旁边有路灯、长椅和花坛',
    },
    likes: 12,
    liked: false,
    comments: [{ author: '导览手册君', body: '试过，接缝两端都通。' }],
  },
  {
    id: 2,
    author: '导览手册君',
    role: '校园导览',
    time: '32 分钟前',
    body: '右上角小地图已同步最终六区布局，区域标注有误的话欢迎留言。',
    likes: 8,
    liked: true,
    comments: [],
  },
  {
    id: 3,
    author: '南区樟林小组',
    role: '群组',
    time: '1 小时前',
    body: '本周地图校对：五区 Collisions 已补齐，00 区合并冲突也已修复。',
    likes: 21,
    liked: false,
    comments: [
      { author: '像素小鸟', body: '辛苦了！' },
      { author: '导览手册君', body: '00 区记得再浏览器实测一遍。' },
    ],
  },
];

export const demoConversations: Conversation[] = [
  {
    id: 'friend-1',
    name: '导览手册君',
    kind: 'friend',
    avatarColor: '#94b38b',
    lastTime: '19:02',
    messages: [
      { id: 1, sender: '导览手册君', body: '你在含弘门附近吗？', time: '18:58' },
      { id: 2, sender: '我', body: '在，刚从雕像花园下来。', time: '18:59', self: true },
      { id: 3, sender: '导览手册君', body: '帮我看下东南区入口的草地块是不是显示了贴图。', time: '19:00' },
      { id: 4, sender: '我', body: '看到了，是 tiny_wild_grass 那一批。', time: '19:02', self: true },
    ],
  },
  {
    id: 'friend-2',
    name: '行署路同学',
    kind: 'friend',
    avatarColor: '#94b38b',
    lastTime: '17:45',
    unread: 2,
    messages: [
      { id: 1, sender: '行署路同学', body: '行署路往南的通道走通了吗？', time: '17:40' },
      { id: 2, sender: '我', body: '走通了，雕像花园北口连着的。', time: '17:45', self: true },
      { id: 3, sender: '行署路同学', body: '好，我下午也去走一遍。', time: '17:46' },
      { id: 4, sender: '行署路同学', body: '对了，社群面板右上角有通知，记得看。', time: '17:47' },
    ],
  },
  {
    id: 'group-1',
    name: '南区樟林小组',
    kind: 'group',
    avatarColor: '#d4bc81',
    lastTime: '16:30',
    unread: 1,
    messages: [
      { id: 1, sender: '导览手册君', body: '今天校对 00 区的 Collisions。', time: '16:02' },
      { id: 2, sender: '像素小鸟', body: '收到，我负责 06 区。', time: '16:10' },
      { id: 3, sender: '导览手册君', body: '好，完成后在群里同步。', time: '16:30' },
    ],
  },
  {
    id: 'group-2',
    name: '像素西大测试群',
    kind: 'group',
    avatarColor: '#d4bc81',
    lastTime: '昨天',
    messages: [
      { id: 1, sender: '像素小鸟', body: '新版小地图底图换成 600×444 了。', time: '昨天 20:15' },
      { id: 2, sender: '导览手册君', body: '看到了，折叠状态也正常。', time: '昨天 20:30' },
    ],
  },
];

export const demoFriendRequests: FriendRequest[] = [
  { id: 1, name: '小地图巡查员', message: '你好，一起测六区接缝吗？' },
  { id: 2, name: '樟林小分队', message: '想邀请你加入群聊。' },
];

export const demoNotifications: NotificationItem[] = [
  { id: 1, text: '南区樟林小组 提到了你', time: '1 小时前', read: false },
  { id: 2, text: '导览手册君 点赞了你的动态', time: '3 小时前', read: false },
  { id: 3, text: '像素西大测试群 有 2 条新消息', time: '昨天', read: true },
];

export const groupAvatarPalette = ['#d4bc81', '#b8c992', '#e1a782', '#a9c6bb'];
