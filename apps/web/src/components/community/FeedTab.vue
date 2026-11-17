<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { addComment, deletePost, posts, publishPost, toggleLike } from './store';
import PixelIcon from './PixelIcon.vue';

const draft = ref('');
const query = ref('');
const expanded = ref<number | null>(null);
const commentDraft = ref('');
const toast = ref('');
let toastTimer: number | undefined;
const MAX_LENGTH = 500;

const visiblePosts = computed(() => {
  const keyword = query.value.trim();
  if (!keyword) return posts;
  return posts.filter((post) => (post.author + post.body).toLowerCase().includes(keyword.toLowerCase()));
});

function showToast(message: string): void {
  toast.value = message;
  if (toastTimer !== undefined) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.value = ''; }, 1800);
}

function publish(): void {
  const body = draft.value.trim();
  if (!body) return;
  publishPost(body);
  draft.value = '';
  showToast('已发布（本地演示）');
}

function toggleComments(id: number): void {
  expanded.value = expanded.value === id ? null : id;
}

function submitComment(postId: number): void {
  const body = commentDraft.value.trim();
  if (!body) return;
  const post = posts.find((item) => item.id === postId);
  if (post) addComment(post, body);
  commentDraft.value = '';
}

function removePost(id: number): void {
  if (!window.confirm('删除这条动态？（本地演示）')) return;
  deletePost(id);
  showToast('已删除（本地演示）');
}

onUnmounted(() => { if (toastTimer !== undefined) clearTimeout(toastTimer); });
</script>

<template>
  <div class="feed">
    <p class="demo-note">动态广场 <span>和校园里的大家分享近况</span></p>
    <section class="composer" aria-label="发布动态">
      <div class="composer-head">
        <span class="avatar">我</span>
        <div><strong>发条动态</strong><small>说说校园里正在发生的事</small></div>
      </div>
      <textarea v-model="draft" rows="3" maxlength="500" placeholder="分享此刻的想法…"></textarea>
      <div class="composer-foot">
        <span class="counter">{{ draft.length }} / {{ MAX_LENGTH }}</span>
        <button class="pixel-btn ghost" type="button" disabled title="图片上传暂未接入（依赖 MinIO，见待决策 D-11）"><PixelIcon name="image" />上传暂不可用</button>
        <button class="pixel-btn primary" type="button" :disabled="!draft.trim()" @click="publish"><PixelIcon name="send" />发布</button>
      </div>
    </section>

    <p v-if="toast" class="toast" role="status"><PixelIcon name="check" />{{ toast }}</p>
    <label class="search-field"><PixelIcon name="search" /><input v-model="query" class="feed-search" type="search" placeholder="搜索作者或内容" aria-label="搜索动态" /></label>

    <p v-if="!visiblePosts.length" class="feed-empty">没有匹配的动态。</p>

    <article v-for="post in visiblePosts" :key="post.id" class="feed-post">
      <header class="post-head">
        <span class="avatar">{{ post.author.slice(0, 1) }}</span>
        <div class="post-meta"><strong>{{ post.author }}</strong><small>{{ post.role }} · {{ post.time }}</small></div>
        <button v-if="post.self" type="button" class="post-delete icon-button" aria-label="删除这条动态" title="删除（本地演示）" @click="removePost(post.id)"><PixelIcon name="trash" /></button>
      </header>
      <p class="post-body">{{ post.body }}</p>
      <img v-if="post.image" class="post-image" :src="post.image.src" :alt="post.image.alt" width="612" height="392" loading="lazy" decoding="async" />
      <footer class="post-actions">
        <button type="button" class="action" :class="{ liked: post.liked }" :aria-pressed="post.liked" :aria-label="`${post.liked ? '取消点赞' : '点赞'}，当前 ${post.likes} 个赞`" @click="toggleLike(post)"><PixelIcon name="heart" />{{ post.likes }} 赞</button>
        <button type="button" class="action" :aria-expanded="expanded === post.id" @click="toggleComments(post.id)"><PixelIcon name="comment" />{{ post.comments.length }} 评论</button>
      </footer>
      <div v-if="expanded === post.id" class="comments">
        <p v-for="comment in post.comments" :key="comment.author + comment.body" class="comment"><strong>{{ comment.author }}</strong>{{ comment.body }}</p>
        <p v-if="!post.comments.length" class="comment empty">还没有评论，来抢沙发。</p>
        <div class="comment-box">
          <input v-model="commentDraft" type="text" maxlength="120" placeholder="写评论…" @keydown.enter.prevent="submitComment(post.id)" />
          <button class="pixel-btn primary small" type="button" :disabled="!commentDraft.trim()" @click="submitComment(post.id)"><PixelIcon name="send" />发送</button>
        </div>
      </div>
    </article>
  </div>
</template>

