import { onMounted, ref } from "vue";

/** 对应原后端 auth/getCaptchaChallenge 返回的 CaptchaInfo */
export interface CaptchaInfo {
  captchaType?: string;
  challengeString?: string;
  signature?: string;
}

/**
 * 人机验证 composable（演示实现，移植自 hmx_web）：
 * 原版 onMounted 调 auth/getCaptchaChallenge 拉取挑战串，此处本地生成模拟往返。
 *
 * @param signature - 后端签名，登录时作为 captchaSignature
 * @param captcha - 后端挑战字符串，登录时作为 captchaCode
 */
export function useCaptcha(signature: { value: string }, captcha: { value: string }) {
  const captchaInfo = ref<CaptchaInfo>();
  const btnCaption = ref("点击开始人机验证");
  const loading = ref(false);
  const success = ref(false);

  async function verify() {
    if (loading.value || success.value) return;

    loading.value = true;
    btnCaption.value = "正在验证中...";

    try {
      // 演示期：模拟验证往返（原版直接消费已缓存的挑战串）
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (captchaInfo.value?.challengeString) {
        signature.value = captchaInfo.value.signature ?? "";
        captcha.value = captchaInfo.value.challengeString;
        btnCaption.value = "验证成功";
        success.value = true;
      } else {
        btnCaption.value = "验证失败：挑战未加载，请刷新重试";
      }
    } catch (err: any) {
      console.error("[Captcha] 验证失败:", err);
      btnCaption.value = `验证失败: ${err?.message || "请重试"}`;
    } finally {
      loading.value = false;
    }
  }

  onMounted(async () => {
    try {
      // 演示期：本地生成挑战串，替代原版 authApi.getCaptchaChallenge()
      await new Promise((resolve) => setTimeout(resolve, 200));
      const challenge = String(Math.floor(1000 + Math.random() * 9000));
      captchaInfo.value = {
        captchaType: "demo",
        challengeString: challenge,
        signature: btoa(`demo:${challenge}`),
      };
    } catch (err: any) {
      console.error("[Captcha] 获取验证码失败:", err);
      btnCaption.value = `验证码加载失败: ${err?.message || err || "未知错误"}`;
    }
  });

  return { btnCaption, loading, success, verify };
}
