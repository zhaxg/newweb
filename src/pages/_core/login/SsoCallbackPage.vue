<script setup lang="ts">
/**
 * SSO 回跳落地页：认证中心授权后 302 → /sso/callback?code&state。
 * 核对 state（sessionStorage 一次性消费，防 CSRF/重放）→ 后端 exchange 换本地 token
 * → authStore 落会话 → 回原访问页。任何失败都回落本地登录页（降级通道）：
 * 请求层错误已由传输层 toast，这里只补非请求层（state 校验）的原因。
 */
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { authApi } from "@/api/admin/request";
import { consumeSsoStart } from "@/lib/sso";
import { useAuthStore } from "@/stores/authStore";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

async function toLogin(redirect: string, ssoError?: string) {
  await router.replace({ name: "login", query: { redirect, ...(ssoError ? { ssoError } : {}) } });
}

onMounted(async () => {
  const code = typeof route.query.code === "string" ? route.query.code : "";
  const state = typeof route.query.state === "string" ? route.query.state : "";
  const saved = consumeSsoStart(); // 一次性消费：刷新/重放都拿不到第二次
  const redirect = saved.redirect;

  // 已有会话（回跳途中刷新等）直接回原页，不必再换票
  if (auth.session) {
    await router.replace(redirect);
    return;
  }

  if (!code || !state || !saved.state || state !== saved.state) {
    await toLogin(redirect, "单点登录校验失败，请重新登录");
    return;
  }

  try {
    const token = await authApi.ssoExchange(code);
    if (!token) throw new Error("未取回登录令牌");
    await auth.loginWithSso(token);
    await router.replace(redirect);
  } catch {
    // 换票/取用户信息失败：传输层已 toast 具体原因，这里带 redirect 落回本地登录
    await toLogin(redirect);
  }
});
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800"
  >
    <div class="flex flex-col items-center gap-4">
      <!-- 纯 CSS 旋转环（本页无 PrimeVue Toast 之外的组件依赖，保持零加载负担） -->
      <div
        class="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-300 border-t-primary dark:border-slate-600"
      ></div>
      <div class="text-sm text-slate-500 dark:text-slate-400">正在完成统一认证登录…</div>
    </div>
  </div>
</template>
