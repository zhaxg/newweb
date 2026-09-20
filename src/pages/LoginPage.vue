<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Eye, EyeOff, Lock, LogIn, User } from "@lucide/vue";
import InputText from "primevue/inputtext";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import Password from "primevue/password";
import Checkbox from "primevue/checkbox";
import Button from "primevue/button";
import { useAuthStore } from "@/stores/authStore";
import hgA from "@/assets/login/HG-A.jpg";
import hgB from "@/assets/login/HG-B.jpg";
import hgC from "@/assets/login/HG-C.jpg";
import hgD from "@/assets/login/HG-D.jpg";
import hgE from "@/assets/login/HG-E.jpg";
import hgF from "@/assets/login/HG-F.jpg";

/* 淡色流光底 + 大卡片轮播图 + 右侧悬浮亚克力登录小卡 */

const auth = useAuthStore();

const backgrounds = [hgA, hgB, hgC, hgD, hgE, hgF];
const bgIndex = ref(0);
let bgTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  bgTimer = setInterval(() => (bgIndex.value = (bgIndex.value + 1) % backgrounds.length), 8000);
});
onBeforeUnmount(() => clearInterval(bgTimer));

const userId = ref(auth.history.lastUserId ?? "");
// 启动回填已记住的密码（对应 LoadUserLoginHistory）
const saved0 = auth.rememberedPassword(userId.value);
const password = ref(saved0 ?? "");
const rememberMe = ref(!!saved0);
const captchaInput = ref("");
const loading = ref(false);

// 输入命中已记住的账号 → 回填密码（对应 UserIDValueChanged）
watch(userId, (id) => {
  const saved = auth.rememberedPassword(id.trim());
  if (saved) {
    password.value = saved;
    rememberMe.value = true;
  }
});

async function onLogin() {
  if (loading.value) return;
  loading.value = true;
  // 演示模式：不做任何校验，点登录即进（模拟 DataPortal TokenAsync 往返）
  await new Promise((resolve) => setTimeout(resolve, 600));
  auth.login(userId.value.trim() || "admin", password.value, rememberMe.value);
  loading.value = false;
}
</script>

<template>
  <!-- 淡色流光桌面底 -->
  <div class="login-bg fixed inset-0 overflow-hidden">
    <div class="blob blob-a" aria-hidden="true"></div>
    <div class="blob blob-b" aria-hidden="true"></div>
    <div class="blob blob-c" aria-hidden="true"></div>

    <!-- 居中大卡片：轮播图背景 -->
    <div class="absolute inset-0 flex items-center justify-center p-4">
      <div
        class="relative h-[min(40rem,88vh)] w-[min(66rem,94vw)] overflow-hidden rounded-2xl border border-white/60 shadow-[0_24px_64px_rgba(15,40,80,0.25)] dark:border-white/10">
        <img v-for="(src, i) in backgrounds" :key="src" :src="src" alt="" draggable="false"
          class="absolute inset-0 h-full w-full object-cover transition-all duration-[1800ms] ease-out"
          :class="i === bgIndex ? 'scale-105 opacity-100' : 'scale-100 opacity-0'" />
        <div class="absolute inset-0 bg-white/5 dark:bg-black/40"></div>

        <!-- 悬浮亚克力登录小卡：右缘 50px、上下 81px≈50×1.618，弹性空白吸收富余高度 -->
        <div class="absolute inset-0 flex items-stretch justify-end px-[50px] py-[81px]">
          <div
            class="flex max-h-full w-[35%] min-w-[19rem] max-w-[26rem] flex-col overflow-y-auto rounded-2xl border border-white/50 bg-white/55 p-5 shadow-[0_16px_48px_rgba(15,40,80,0.28)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/45">
            <div class="text-2xl leading-none">👏</div>
            <div class="mt-2 text-base font-semibold text-foreground">HiMind工业互联网平台</div>
            <div class="mb-2 mt-1 text-xs text-muted-foreground">
              欢迎！即刻登录，体验数字化智慧制造的强大赋能感！
            </div>
            <div class="min-h-[30px] flex-1"></div>

            <div class="space-y-2.5">
              <IconField>
                <InputIcon>
                  <User class="h-4 w-4" />
                </InputIcon>
                <InputText v-model="userId" placeholder="请输入用户名" autocomplete="off" autofocus spellcheck="false"
                  class="w-full" @keydown.enter="onLogin" />
              </IconField>

              <IconField>
                <InputIcon>
                  <Lock class="h-4 w-4" />
                </InputIcon>
                <Password v-model="password" :feedback="false" toggle-mask fluid placeholder="请输入密码" autocomplete="off"
                  autocapitalize="off" spellcheck="false" class="w-full" @keydown.enter="onLogin">
                  <template #maskicon="{ toggleCallback }">
                    <EyeOff class="p-password-toggle-mask-icon h-4 w-4 cursor-pointer" @click="toggleCallback" />
                  </template>
                  <template #unmaskicon="{ toggleCallback }">
                    <Eye class="p-password-toggle-mask-icon h-4 w-4 cursor-pointer" @click="toggleCallback" />
                  </template>
                </Password>
              </IconField>

              <InputText v-model="captchaInput" placeholder="请输入验证码" inputmode="numeric" autocomplete="off"
                class="w-full" @keydown.enter="onLogin" />

              <div class="flex items-center gap-2">
                <Checkbox v-model="rememberMe" binary input-id="rememberMe" size="small" />
                <label for="rememberMe" class="text-sm text-muted-foreground">记住账号</label>
              </div>

              <div class="min-h-[30px] flex-1"></div>

              <Button label="登 录" raised rounded class="h-10 w-full text-base" :loading="loading" @click="onLogin">
                <template #icon>
                  <LogIn v-if="!loading" class="h-4 w-4" />
                </template>
              </Button>

              <div class="min-h-[30px] flex-1"></div>
            </div>

            <div class="pt-1 text-center text-[11px] text-muted-foreground">
              版权所有 @ 2021-2025 北京红谷软件技术有限公司
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 淡色底 + 柔和渐变；暗色皮肤下整体压暗 */
.login-bg {
  background: linear-gradient(140deg, #eaf1fb 0%, #dde9f9 45%, #e9f0fd 100%);
}

.dark .login-bg {
  background: linear-gradient(140deg, #0c1a30 0%, #101c33 45%, #0a1830 100%);
}

/* 缓慢漂移的流光光斑（CSS 特效） */
.blob {
  position: absolute;
  width: 44vmax;
  height: 44vmax;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.75;
  animation: blob-drift 26s ease-in-out infinite;
}

.dark .blob {
  opacity: 0.3;
}

.blob-a {
  left: -12vmax;
  top: -14vmax;
  background: radial-gradient(circle, rgba(147, 197, 253, 0.9), transparent 65%);
}

.blob-b {
  right: -14vmax;
  top: 8vmax;
  background: radial-gradient(circle, rgba(196, 181, 253, 0.8), transparent 65%);
  animation-delay: -9s;
}

.blob-c {
  left: 22vmax;
  bottom: -18vmax;
  background: radial-gradient(circle, rgba(165, 243, 252, 0.75), transparent 65%);
  animation-delay: -17s;
}

@keyframes blob-drift {
  0% {
    transform: translate(0, 0) scale(1);
  }

  33% {
    transform: translate(5%, -4%) scale(1.12);
  }

  66% {
    transform: translate(-4%, 5%) scale(0.94);
  }

  100% {
    transform: translate(0, 0) scale(1);
  }
}
</style>
