import Hex from "crypto-js/enc-hex";
import SHA256 from "crypto-js/sha256";

/**
 * 人机验证「数学幂等运算」（MathPow，实为 SHA256 工作量证明）客户端求解器，
 * 对应后端 Hmx.Http.Core/Auth/Captcha/MathPowCaptcha.cs（算法对齐参考实现 hmx_tdweb）。
 * 挑战串格式 `难度#28位随机前缀#时间戳`，解出 nonce 后 captchaCode = 挑战串#nonce。
 */

function computeSha256(input: string): string {
  return String(SHA256(input).toString(Hex));
}

function hasLeadingZeros(hexHash: string, requiredZeros: number): boolean {
  let binaryString = "";
  for (const hexDigit of hexHash) {
    binaryString += Number.parseInt(hexDigit, 16).toString(2).padStart(4, "0");
  }
  let count = 0;
  for (const bit of binaryString) {
    if (bit === "0") {
      count++;
      if (count >= requiredZeros) return true;
    } else {
      break;
    }
  }
  return count >= requiredZeros;
}

/** 求解挑战串，返回 `挑战串#nonce`（即 FetchTokenInput.captchaCode）；10s 超时抛错 */
export async function calculate(challengeString: string): Promise<string> {
  const infos = challengeString.split("#").filter(Boolean);
  if (infos.length !== 3) throw new Error("Invalid challenge string format.");

  const prefix = infos[1] ?? "";
  const difficulty = Number.parseInt(infos[0] ?? "-1", 10);
  if (Number.isNaN(difficulty) || difficulty < 0) throw new Error("Invalid difficulty value");

  const deadline = Date.now() + 10_000;
  const batchSize = 2000;
  let nonce = 0;

  while (Date.now() < deadline) {
    for (let i = 0; i < batchSize; i++) {
      if (hasLeadingZeros(computeSha256(prefix + (nonce + i)), difficulty)) {
        return `${challengeString}#${nonce + i}`;
      }
    }
    nonce += batchSize;
    // 分块让出主线程，避免 UI 冻结
    await new Promise((resolve) => setTimeout(resolve));
  }
  throw new Error("Calculation timed out");
}
