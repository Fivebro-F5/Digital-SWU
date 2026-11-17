<script setup lang="ts">
import { computed } from 'vue';
import { conversations, deletePost, posts, profile } from './store';
import PixelIcon from './PixelIcon.vue';

const emit = defineEmits<{ 'edit-profile': [] }>();

const myPosts = computed(() => posts.filter((post) => post.self));
const stats = computed(() => ({
  posts: myPosts.value.length,
  friends: conversations.filter((conversation) => conversation.kind === 'friend').length,
  likes: myPosts.value.reduce((sum, post) => sum + post.likes, 0),
}));

function removePost(id: number): void {
  if (!window.confirm('删除这条动态？（本地演示）')) return;
  deletePost(id);
}
</script>

<template>
  <div class="profile">
    <p class="demo-note">我的主页 <span>展示给社群成员看的资料</span></p>
    <section class="profile-card">
      <div class="cover" aria-hidden="true"></div>
      <div class="profile-body">
        <span class="avatar big" aria-hidden="true">我</span>
        <div class="identity">
          <strong>{{ profile.name }}</strong>
          <small>{{ profile.role }}</small>
          <p class="bio">{{ profile.bio }}</p>
          <p class="meta"><PixelIcon name="pin" />{{ profile.location }}</p>
          <p class="meta">加入于 {{ profile.joinDate }}</p>
        </div>
        <button type="button" class="pixel-btn ghost" @click="emit('edit-profile')">编辑资料</button>
      </div>
      <dl class="stats">
        <div><dt>动态</dt><dd>{{ stats.posts }}</dd></div>
        <div><dt>好友</dt><dd>{{ stats.friends }}</dd></div>
        <div><dt>获赞</dt><dd>{{ stats.likes }}</dd></div>
      </dl>
    </section>

    <section class="my-posts">
      <h3>我的动态</h3>
      <p v-if="!myPosts.length" class="empty">还没有发过动态，去动态页发一条吧。</p>
      <article v-for="post in myPosts" :key="post.id" class="feed-post">
        <header class="post-head">
          <span class="avatar">{{ post.author.slice(0, 1) }}</span>
          <div class="post-meta"><strong>{{ post.author }}</strong><small>{{ post.role }} · {{ post.time }}</small></div>
          <button type="button" class="post-delete icon-button" aria-label="删除这条动态" title="删除（本地演示）" @click="removePost(post.id)"><PixelIcon name="trash" /></button>
        </header>
        <p class="post-body">{{ post.body }}</p>
        <img v-if="post.image" class="post-image" :src="post.image.src" :alt="post.image.alt" width="612" height="392" loading="lazy" decoding="async" />
        <footer class="post-actions"><span class="action"><PixelIcon name="heart" />{{ post.likes }} 赞</span><span class="action"><PixelIcon name="comment" />{{ post.comments.length }} 评论</span></footer>
      </article>
    </section>
  </div>
</template>

