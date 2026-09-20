<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Check, Circle, Eye, EyeOff, LoaderCircle, Lock, LogIn, User } from "@lucide/vue";
import InputText from "primevue/inputtext";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputPassword from "primevue/inputpassword";
import Checkbox from "primevue/checkbox";
import Button from "primevue/button";
import Captcha from "@/components/common/Captcha.vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import hgA from "@/assets/login/HG-A.jpg";
import hgB from "@/assets/login/HG-B.jpg";
import hgC from "@/assets/login/HG-C.jpg";
import hgD from "@/assets/login/HG-D.jpg";
import hgE from "@/assets/login/HG-E.jpg";
import hgF from "@/assets/login/HG-F.jpg";

/* 淡色流光底 + 大卡片轮播图 + 右侧悬浮亚克力登录小卡 */

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const backgrounds = [hgA, hgB, hgC, hgD, hgE, hgF];
// 末尾克隆首图实现无缝循环：滑到克隆图后无动画跳回 0
const slides = [...backgrounds, backgrounds[0]];
const bgIndex = ref(0);
const slideAnimate = ref(true);
let bgTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  bgTimer = setInterval(() => {
    if (bgIndex.value < backgrounds.length) bgIndex.value++;
  }, 8000);
});
onBeforeUnmount(() => clearInterval(bgTimer));

function onSlideEnd(e: TransitionEvent) {
  if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
  if (bgIndex.value === backgrounds.length) {
    slideAnimate.value = false;
    bgIndex.value = 0;
    requestAnimationFrame(() => (slideAnimate.value = true));
  }
}

const userId = ref(auth.history.lastUserId ?? "");
// 启动回填已记住的密码（对应 LoadUserLoginHistory）
const saved0 = auth.rememberedPassword(userId.value);
const password = ref(saved0 ?? "");
const masked = ref(true);
const rememberMe = ref(!!saved0);
const captchaSignature = ref("");
const captchaChallenge = ref("");
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
  // 登录成功 → 回跳 redirect（仅接受站内绝对路径，防开放重定向）
  const redirect = route.query.redirect;
  const target =
    typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
  await router.replace(target);
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
        class="relative h-[min(40rem,88vh)] w-[min(66rem,94vw)] overflow-hidden rounded-2xl border border-white/60 shadow-[0_24px_64px_rgba(15,40,80,0.25)] dark:border-white/10 max-md:h-full max-md:w-full max-md:rounded-none max-md:border-0 max-md:shadow-none">
        <!-- 左右滑动轮播轨道（移动端隐藏，只留登录小卡） -->
        <div class="absolute inset-0 overflow-hidden max-md:hidden">
          <div class="flex h-full transition-transform duration-700 ease-out"
            :class="{ 'transition-none': !slideAnimate }"
            :style="{ width: `${slides.length * 100}%`, transform: `translateX(-${(bgIndex * 100) / slides.length}%)` }"
            @transitionend="onSlideEnd">
            <img v-for="(src, i) in slides" :key="i" :src="src" alt="" draggable="false"
              class="h-full flex-1 basis-0 object-cover" />
          </div>
        </div>
        <div class="absolute inset-0 bg-white/5 dark:bg-black/40 max-md:hidden"></div>

        <!-- 悬浮亚克力登录小卡：右缘 50px、上下 81px≈50×1.618，弹性空白吸收富余高度；
             移动端大卡退为透明铺满层，小卡居中占满宽度 -->
        <div class="absolute inset-0 flex items-stretch justify-end px-[50px] py-[81px] max-md:items-center max-md:justify-center max-md:p-4">
          <div
            class="flex max-h-full w-[36%] min-w-[19rem] max-w-[26rem] flex-col overflow-y-auto rounded-2xl border border-white/50 bg-white/55 p-5 shadow-[0_16px_48px_rgba(15,40,80,0.28)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/45 max-md:w-full max-md:min-w-0 max-md:max-w-[24rem]">
            <div class="text-2xl leading-none">👏</div>
            <div class="mt-2 text-base font-semibold text-foreground">HiMind工业互联网平台</div>
            <div class="mb-2 mt-1 text-xs text-muted-foreground">
              欢迎！即刻登录，体验数字化智慧制造的强大赋能感！
            </div>
            <div class="h-6 shrink-0"></div>

            <div class="login-form flex flex-1 flex-col space-y-2.5">
              <IconField>
                <InputIcon>
                  <User />
                </InputIcon>
                <InputText v-model="userId" placeholder="请输入用户名" autocomplete="off" autofocus spellcheck="false"
                  class="w-full" @keydown.enter="onLogin" />
              </IconField>

              <IconField>
                <InputIcon>
                  <Lock />
                </InputIcon>
                <InputPassword v-model="password" v-model:mask="masked" variant="filled" fluid placeholder="请输入密码"
                  autocomplete="off" autocapitalize="off" spellcheck="false" @keydown.enter="onLogin" />
                <InputIcon @click="masked = !masked">
                  <EyeOff v-if="masked" />
                  <Eye v-else />
                </InputIcon>
              </IconField>

              <Captcha v-model:signature="captchaSignature" v-model:challengeString="captchaChallenge"
                v-slot="{ caption, loading: capLoading, success: capSuccess, verify: capVerify }">
                <button type="button" class="captcha-btn" :class="{ 'is-success': capSuccess }" :disabled="capLoading"
                  @click="capVerify">
                  <LoaderCircle v-if="capLoading" class="captcha-icon animate-spin" />
                  <Check v-else-if="capSuccess" class="captcha-icon" />
                  <Circle v-else class="captcha-icon captcha-icon-muted" />
                  <span>{{ caption }}</span>
                </button>
              </Captcha>

              <div class="flex items-center gap-2">
                <Checkbox v-model="rememberMe" binary input-id="rememberMe" />
                <label for="rememberMe" class="text-sm text-muted-foreground">记住账号</label>
              </div>

              <div class="min-h-[24px] flex-1"></div>

              <Button label="登 录" raised rounded class="h-10 w-full shrink-0 text-base" :loading="loading" @click="onLogin">
                <template #icon>
                  <LogIn v-if="!loading" class="h-4 w-4" />
                </template>
              </Button>

              <div class="h-6 shrink-0"></div>
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
/* 登录卡内输入控件恢复 Aura 常规尺寸（全局 HmxCompact 预设为表格压到 ~28px 高）。
   在 .login-form 容器上重设 form-field 令牌，CSS 自定义属性向后代继承，
   InputText / InputPassword / Captcha 全部读同一组变量、尺寸同源。 */
.login-form {
  --p-form-field-padding-x: 0.75rem;
  --p-form-field-padding-y: 0.625rem;
  --p-form-field-font-size: 0.875rem;
  --p-inputtext-padding-x: 0.75rem;
  --p-inputtext-padding-y: 0.625rem;
  --p-inputtext-font-size: 0.875rem;
}

/* 无头 Captcha 的使用方样式：引用与输入框同源的 --p-inputtext-* 令牌，尺寸自动对齐。
   <button> 不继承 body 字体（UA 自带 font），故显式引用 */
.captcha-btn {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  padding: var(--p-inputtext-padding-y, 0.625rem) var(--p-inputtext-padding-x, 0.75rem);
  font-size: var(--p-inputtext-font-size, 0.875rem);
  color: var(--p-form-field-color);
  background: var(--p-form-field-background);
  border: 1px solid var(--p-form-field-border-color);
  border-radius: var(--p-inputtext-border-radius, 4px);
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.captcha-btn:not(:disabled):hover {
  border-color: var(--p-form-field-hover-border-color);
}

.captcha-btn:focus-visible {
  outline: 0;
  border-color: var(--p-form-field-focus-border-color);
  box-shadow: 0 0 0 1px var(--p-form-field-focus-border-color);
}

.captcha-btn:disabled {
  cursor: default;
  opacity: var(--p-disabled-opacity, 0.55);
}

.captcha-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.captcha-icon-muted {
  color: var(--p-form-field-placeholder-color);
}

.captcha-btn.is-success {
  color: var(--success);
  border-color: var(--success);
}

/* 主题用 top:50% + 固定 -6px（12px 图标高之半）居中，16px 图标会偏下 2px；
   translate 按自身实际高度回正，不依赖 --p-icon-size */
:deep(.p-inputicon) {
  margin-top: 0;
  translate: 0 -50%;
}

:deep(.p-inputicon svg),
:deep(.p-inputtext ~ .p-input-icon svg) {
  width: 1rem;
  height: 1rem;
}

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
