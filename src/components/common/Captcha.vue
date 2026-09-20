<script setup lang="ts">
import { ref } from "vue";
import { useCaptcha } from "@/composables/useCaptcha";
import { CaptchaType } from "@/api/admin/enums";

/* 人机验证「无头」组件（移植自 hmx_web Captcha.vue 的验证流）：
   只承载状态与 verify 逻辑，不输出任何标记/样式；
   使用方通过默认插槽拿 caption/loading/success/verify 自行决定呈现。 */

const emit = defineEmits<{
  "update:signature": [value: string];
  "update:challengeString": [value: string];
  "update:captchaType": [value: CaptchaType];
  "update:success": [value: boolean];
}>();

const signature = ref("");
const captcha = ref("");
const type = ref<CaptchaType>(CaptchaType.MathPow);

const { btnCaption, loading, success, verify: doVerify } = useCaptcha(signature, captcha, type);

async function verify() {
  await doVerify();
  emit("update:success", success.value);
  if (success.value) {
    emit("update:signature", signature.value);
    emit("update:challengeString", captcha.value);
    emit("update:captchaType", type.value);
  }
}
</script>

<template>
  <slot :caption="btnCaption" :loading="loading" :success="success" :verify="verify" />
</template>
