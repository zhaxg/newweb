import AES from "crypto-js/aes";
import Utf8 from "crypto-js/enc-utf8";

/**
 * 敏感 localStorage 的加解密封装（crypto-js AES：同步、纯 JS，不依赖 HTTPS/安全上下文）。
 *
 * 只在真正敏感的存储点**主动调用**（目前 = authStore 的登录态与登录历史），不做任何全局拦截：
 * 其它键（编辑器设置、mock 表、Univer）的值形态与今天完全一致。
 *
 * 开关：VITE_APP_STORE_SECURE_KEY 非空即加密；留空则读写都是明文透传，行为与今天逐字相同。
 * 兼容：读到不以 "U2FsdGVkX1" 开头的值按历史明文直接解析，下次写入自动变成密文（无需迁移代码）。
 * 失败：换密钥 / 脏数据一律 console.warn + 返回 null，让调用方回落默认值，绝不抛进启动链。
 *
 * 定位：VITE_ 变量会内联进 bundle，密钥是公开的。本层属「本地留存混淆」——防的是从设备或备份里
 * 直接翻出明文（登录历史勾「记住我」时存的是明文密码），不是访问控制。
 */
const SECRET = String(import.meta.env.VITE_APP_STORE_SECURE_KEY ?? "").trim();

/** crypto-js 的 OpenSSL 兼容密文（base64 "Salted__ "）固定头，用它区分密文与历史明文 */
const CIPHER_HEAD = "U2FsdGVkX1";

function decrypt(cipher: string): string | null {
  if (!SECRET) return null; // 没配密钥却存着密文：解不了，按不存在处理
  try {
    /* 密钥不匹配时 crypto-js 会抛 Malformed UTF-8 data，也可能返回空串，两种都算失败 */
    return AES.decrypt(cipher, SECRET).toString(Utf8) || null;
  } catch {
    return null;
  }
}

/** 读一个 JSON 存储项；解不开/格式坏一律返回 null，由调用方回落默认值。 */
export function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const text = raw.startsWith(CIPHER_HEAD) ? decrypt(raw) : raw;
  if (text === null) {
    console.warn(`[encryptedStorage] ${key} 无法解密（密钥已更换？），视为不存在`);
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    console.warn(`[encryptedStorage] ${key} 内容不是合法 JSON，视为不存在`);
    return null;
  }
}

/** 写一个 JSON 存储项（同步落盘，没有异步写回窗口）。传 undefined 等同删除。 */
export function writeJson(key: string, value: unknown): void {
  if (value === undefined) {
    localStorage.removeItem(key);
    return;
  }
  const text = JSON.stringify(value);
  localStorage.setItem(key, SECRET ? AES.encrypt(text, SECRET).toString() : text);
}
