<script setup lang="ts">
/** 悬浮亚克力登录小卡：表单状态、验证码、登录与回跳全部自包含，LoginPage 只负责背景与轮播。 */
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from "vue";
import {
  IconEye,
  IconEyeOff,
  IconLoader,
  IconLock,
  IconLogin2,
  IconSquareRounded,
  IconSquareRoundedCheck,
  IconUser,
} from "@tabler/icons-vue";
import InputText from "primevue/inputtext";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import Checkbox from "primevue/checkbox";
import Button from "primevue/button";
import Captcha from "@/components/common/Captcha.vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/composables/useToast";
import { CaptchaType } from "@/api/admin/enums";

const auth = useAuthStore();
const { toast } = useToast();
const route = useRoute();
const router = useRouter();

const userId = ref(auth.history.lastUserId ?? "");
// 启动回填已记住的密码（对应 LoadUserLoginHistory）
const saved0 = auth.rememberedPassword(userId.value);
const password = ref(saved0 ?? "");
const masked = ref(true);
const rememberMe = ref(!!saved0);
const captchaSignature = ref("");
const captchaChallenge = ref("");
const captchaType = ref<CaptchaType>(CaptchaType.MathPow);
const captchaPassed = ref(false);
const loading = ref(false);

// 输入命中已记住的账号 → 回填密码（对应 UserIDValueChanged）
watch(userId, (id) => {
  const saved = auth.rememberedPassword(id.trim());
  if (saved) {
    password.value = saved;
    rememberMe.value = true;
  }
});

/* 勾上「记住账号」= 把密码一并留存本机浏览器（encryptedStorage 只是混淆不是保护），
   风险知情走 toast 一行带过——登录卡片高度钉死，不留内联提示位。
   输入账号命中记住态触发的自动勾选也弹：那是在给新账号存密码，同样该知情 */
watch(rememberMe, (v, old) => {
  if (v && !old) toast("账号密码将保存在本机浏览器 公用电脑请勿勾选", 2600, "warn", "记住密码");
});

/* ── 掩码输入层（方案三）──
   masked 时输入框是 type=text，显示串 = 每个真实字符一个 #（1:1 长度映射，
   光标/选区下标可直接换算回明文）。所有编辑在 beforeinput 里拦截并改写明文，
   IME 组合文本由 compositionend 收编；代价是不再拥有 type=password 语义
   （本站 autocomplete=off + 自有记住密码，不依赖浏览器密码管理器），
   原生 Ctrl+Z（historyUndo）走兜底分支一并拦截，避免明文与显示串脱同步。 */
const pwRef = ref<ComponentPublicInstance | null>(null);
const pwDisplay = computed(() => (masked.value ? "#".repeat(Array.from(password.value).length) : password.value));

function pwInputEl(): HTMLInputElement | null {
  const el = pwRef.value?.$el as HTMLElement | HTMLInputElement | undefined;
  if (!el) return null;
  return el instanceof HTMLInputElement ? el : el.querySelector("input");
}

/** 明文 [start,end) 区间替换为 text，并把光标落到插入末尾 */
function pwEdit(start: number, end: number, text: string) {
  const chars = Array.from(password.value);
  const ins = Array.from(text);
  password.value = [...chars.slice(0, start), ...ins, ...chars.slice(end)].join("");
  const caret = start + ins.length;
  const el = pwInputEl();
  if (el) nextTick(() => el.setSelectionRange(caret, caret));
}

function onPwBeforeInput(e: Event) {
  if (!masked.value) return;
  const ev = e as InputEvent;
  const input = ev.target as HTMLInputElement;
  const len = Array.from(password.value).length;
  const start = input.selectionStart ?? len;
  const end = input.selectionEnd ?? len;
  const type = ev.inputType;
  if (type === "insertText") {
    ev.preventDefault();
    pwEdit(start, end, ev.data ?? "");
  } else if (type === "insertFromPaste" || type === "insertFromDrop") {
    ev.preventDefault();
    const dt = (ev as unknown as { dataTransfer?: DataTransfer | null }).dataTransfer;
    pwEdit(start, end, dt?.getData("text/plain") || ev.data || "");
  } else if (type === "deleteContentBackward") {
    ev.preventDefault();
    pwEdit(start === end ? Math.max(0, start - 1) : start, end, "");
  } else if (type === "deleteContentForward") {
    ev.preventDefault();
    pwEdit(start, start === end ? Math.min(len, end + 1) : end, "");
  } else if (type.startsWith("delete")) {
    // deleteByCut / deleteByDrag：区间清空（无选区时等价空操作）
    ev.preventDefault();
    pwEdit(start, end, "");
  } else {
    // 其余（组合输入由 compositionend 收编、撤销/重做、整词替换等）：阻止，不碰明文
    ev.preventDefault();
  }
}

function onPwCompositionEnd(e: Event) {
  if (!masked.value) return;
  const ev = e as CompositionEvent;
  const input = ev.target as HTMLInputElement;
  const len = Array.from(password.value).length;
  const start = Math.min(input.selectionStart ?? len, len);
  const end = Math.min(Math.max(input.selectionEnd ?? start, start), len);
  pwEdit(start, end, ev.data ?? "");
}

function onPwModelUpdate(v: unknown) {
  // 正常路径下掩码态的 DOM 值不会原生变化；此处兜住浏览器自动填充等直改 value 的场景
  password.value = v == null ? "" : String(v);
}

async function onLogin() {
  if (loading.value) return;
  /* 前置校验：用户名/密码必填、验证码须先通过挑战 */
  if (!userId.value.trim()) {
    toast("请输入用户名", 2000, "warn");
    return;
  }
  if (!password.value) {
    toast("请输入密码", 2000, "warn");
    return;
  }
  if (!captchaPassed.value) {
    toast("请先点击完成人机验证", 2000, "warn");
    return;
  }
  loading.value = true;
  try {
    await auth.loginWithServer(userId.value.trim(), password.value, rememberMe.value, {
      code: captchaChallenge.value,
      signature: captchaSignature.value,
      type: captchaType.value,
    });
    toast("登录成功", 1500, "success");
    // 登录成功 → 回跳 redirect（仅接受站内绝对路径，防开放重定向）
    const redirect = route.query.redirect;
    const target =
      typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
    await router.replace(target);
  } catch {
    /* 失败提示由请求层统一 toast（error），这里只需恢复按钮；token 无效等错误已回登录页 */
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <!-- 右缘 50px、上下 80px（≈50×1.618 取整到刻度 20），弹性空白吸收富余高度；
       移动端大卡退为透明铺满层，小卡居中占满宽度 -->
  <div
    class="absolute inset-0 flex items-stretch justify-end px-12.5 py-20 max-md:items-center max-md:justify-center max-md:p-4"
  >
    <div
      class="login-acrylic flex max-h-full w-[36%] min-w-76 max-w-104 flex-col overflow-y-auto rounded-2xl border border-white/50 bg-white/55 p-5 shadow-[0_16px_48px_rgba(15,40,80,0.28)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/45 max-md:w-full max-md:min-w-0 max-md:max-w-96"
    >
      <div class="text-2xl leading-none">👏</div>
      <div class="mt-2 text-base font-semibold text-foreground">HiMind工业互联网平台</div>
      <div class="mb-2 mt-1 text-xs text-muted-foreground">欢迎！即刻登录，体验数字化智慧制造的强大赋能感！</div>
      <div class="h-6 shrink-0"></div>

      <div class="login-form flex flex-1 flex-col space-y-2.5">
        <IconField>
          <InputIcon>
            <IconUser />
          </InputIcon>
          <InputText
            v-model="userId"
            placeholder="请输入用户名"
            autocomplete="off"
            autofocus
            spellcheck="false"
            class="w-full"
            @keydown.enter="onLogin"
          />
        </IconField>

        <IconField>
          <InputIcon>
            <IconLock />
          </InputIcon>
          <InputText
            ref="pwRef"
            :model-value="pwDisplay"
            variant="filled"
            fluid
            placeholder="请输入密码"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            @update:model-value="onPwModelUpdate"
            @beforeinput="onPwBeforeInput"
            @compositionend="onPwCompositionEnd"
            @keydown.enter="onLogin"
          />
          <InputIcon @click="masked = !masked">
            <IconEyeOff v-if="masked" />
            <IconEye v-else />
          </InputIcon>
        </IconField>

        <Captcha
          v-model:signature="captchaSignature"
          v-model:challengeString="captchaChallenge"
          v-model:captchaType="captchaType"
          v-model:success="captchaPassed"
          v-slot="{ caption, loading: capLoading, success: capSuccess, verify: capVerify }"
        >
          <button
            type="button"
            class="captcha-btn"
            :class="{ 'is-success': capSuccess }"
            :disabled="capLoading"
            @click="capVerify"
          >
            <IconLoader v-if="capLoading" class="captcha-icon animate-spin" />
            <IconSquareRoundedCheck v-else-if="capSuccess" class="captcha-icon" />
            <IconSquareRounded v-else class="captcha-icon captcha-icon-muted" />
            <span>{{ caption }}</span>
          </button>
        </Captcha>

        <div class="flex items-center gap-2">
          <Checkbox v-model="rememberMe" binary input-id="rememberMe" />
          <label for="rememberMe" class="text-sm text-muted-foreground">记住账号</label>
        </div>

        <div class="min-h-6 flex-1"></div>

        <Button raised rounded class="h-10 w-full shrink-0 text-base" :loading="loading" @click="onLogin">
          <component :is="loading ? IconLoader : IconLogin2" :class="['h-4 w-4', loading && 'animate-spin']" />
          登 录
        </Button>

        <div class="h-6 shrink-0"></div>
      </div>

      <div class="pt-1 text-center text-[11px] text-muted-foreground">
        版权所有 @ 2021-2025 北京红谷软件技术有限公司
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 登录卡内输入控件恢复 Aura 常规尺寸（全局 HmxCompact 预设为表格压到 ~28px 高）。
   在 .login-form 容器上重设 form-field 令牌，CSS 自定义属性向后代继承，
   InputText / 密码框 / Captcha 全部读同一组变量、尺寸同源。 */
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

/* 特效降级（软件渲染环境 lib/effectsPerf.ts 在 <html> 打 hmx-effects-off 类）：
   backdrop-blur 每帧对身后内容重采样，CPU 渲染下是本页最贵开销——关掉并把
   55% 透明底换成高不透明度实色（无模糊时半透底压在照片上可读性差）。
   （hmx 特效关闭时背景光斑也已静止 + 轮播照旧，实色底观感损失很小） */
.hmx-effects-off .login-acrylic {
  backdrop-filter: none;
  background: rgb(255 255 255 / 0.92);
}

.hmx-effects-off.dark .login-acrylic {
  background: rgb(15 23 42 / 0.92);
}
</style>
