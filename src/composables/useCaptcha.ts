import { onMounted, ref } from "vue";
import { authApi } from "@/api/admin/request";
import { CaptchaType } from "@/api/admin/enums";
import type { CaptchaInfo } from "@/api/admin/types";
import { calculate } from "@/api/common/mathPowCaptcha";
import { USE_MOCK } from "@/api/request";

/**
 * 人机验证 composable（移植 hmx_web/hmx_tdweb 验证流）：
 * onMounted 调 auth/getCaptchaChallenge 拉取挑战串；verify 时前端解 SHA256 工作量证明，
 * 产出 captchaCode（挑战串#nonce）+ captchaSignature 供登录接口携带。
 * 演示模式（VITE_USE_MOCK=true）保留本地假挑战。
 *
 * @param signature - 后端签名，登录时作为 captchaSignature
 * @param captcha - 求解后的完整挑战串，登录时作为 captchaCode
 * @param captchaType - 挑战类型（登录时原样回传 FetchTokenInput.captchaType）
 */
export function useCaptcha(
  signature: { value: string },
  captcha: { value: string },
  captchaType?: { value: CaptchaType },
) {
  const captchaInfo = ref<CaptchaInfo>();
  const btnCaption = ref("点击开始人机验证");
  const loading = ref(false);
  const success = ref(false);

  async function verify() {
    if (loading.value || success.value) return;

    loading.value = true;
    btnCaption.value = "正在验证中...";

    try {
      const info = captchaInfo.value;
      if (!info?.challengeString) {
        btnCaption.value = "验证失败：挑战未加载，请刷新重试";
        return;
      }
      if (USE_MOCK || info.captchaType !== CaptchaType.MathPow) {
        // 演示模式 / 非 PoW 类型：直接消费挑战串本身
        captcha.value = info.challengeString;
      } else {
        captcha.value = await calculate(info.challengeString);
      }
      signature.value = info.signature ?? "";
      if (captchaType) captchaType.value = info.captchaType;
      btnCaption.value = "验证成功";
      success.value = true;
    } catch (err: any) {
      console.error("[Captcha] 验证失败:", err);
      btnCaption.value = `验证失败: ${err?.message || "请重试"}`;
    } finally {
      loading.value = false;
    }
  }

  onMounted(async () => {
    try {
      if (USE_MOCK) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const challenge = String(Math.floor(1000 + Math.random() * 9000));
        captchaInfo.value = {
          captchaType: CaptchaType.MathPow,
          challengeString: challenge,
          signature: btoa(`demo:${challenge}`),
        };
      } else {
        // 真实后端：主动拉取 MathPow 挑战（难度/前缀/时间戳 + XOR 签名）
        captchaInfo.value = await authApi.getCaptchaChallenge();
      }
    } catch (err: any) {
      console.error("[Captcha] 获取验证码失败:", err);
      btnCaption.value = `验证码加载失败: ${err?.message || err || "未知错误"}`;
    }
  });

  return { btnCaption, loading, success, verify };
}
