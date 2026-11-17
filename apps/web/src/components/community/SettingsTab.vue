<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue';
import { profile } from './store';

// 设置表单：保存只更新本地演示状态，刷新即还原；不校验、不存储、不发送。
const draft = reactive({ ...profile });
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const showLocation = ref(true);
const saved = ref(false);
let savedTimer: number | undefined;

function save(): void {
  Object.assign(profile, draft);
  saved.value = true;
  if (savedTimer !== undefined) clearTimeout(savedTimer);
  savedTimer = window.setTimeout(() => { saved.value = false; }, 2000);
}

onUnmounted(() => { if (savedTimer !== undefined) clearTimeout(savedTimer); });
</script>

<template>
  <div class="settings">
    <p class="demo-note">资料设置 <span>保存后仅在当前页面生效</span></p>

    <section class="settings-card">
      <h3>基本资料</h3>
      <label>姓名<input v-model="draft.name" type="text" maxlength="30" placeholder="姓名" /></label>
      <label>邮箱<input v-model="draft.email" type="email" placeholder="邮箱" /></label>
      <label>电话<input v-model="draft.phone" type="text" maxlength="30" placeholder="电话" /></label>
      <label>简介<textarea v-model="draft.bio" rows="3" maxlength="200" placeholder="一句话介绍自己"></textarea></label>
    </section>

    <section class="settings-card">
      <h3>位置</h3>
      <label>所在地<input v-model="draft.location" type="text" maxlength="60" placeholder="所在地" /></label>
      <label class="inline"><input v-model="showLocation" type="checkbox" /> 在我的主页公开位置（演示开关）</label>
      <p class="hint">位置为演示文本，与游戏内地理坐标无关。</p>
    </section>

    <section class="settings-card">
      <h3>修改密码</h3>
      <label>当前密码<input v-model="currentPassword" type="password" placeholder="当前密码" autocomplete="off" /></label>
      <label>新密码<input v-model="newPassword" type="password" placeholder="新密码" autocomplete="off" /></label>
      <label>确认新密码<input v-model="confirmPassword" type="password" placeholder="再次输入新密码" autocomplete="off" /></label>
      <p class="hint">演示表单：不校验、不存储、不发送。认证与密码策略见待决策 D-09。</p>
    </section>

    <div class="settings-foot">
      <button class="pixel-btn primary" type="button" @click="save">保存资料</button>
      <transition name="toast">
        <span v-if="saved" class="saved" role="status">已保存（本地演示）</span>
      </transition>
    </div>
  </div>
</template>

