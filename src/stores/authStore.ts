/**
 * 登录会话 + 登录历史（移植 HmxLoginForm.cs 的 UserLoginHistory / HmxUserSession）。
 * Pinia setup store + localStorage 持久化；两个键的值都经 @/lib/encryptedStorage 加密一层。
 */
import { ref, watch } from "vue";
import { defineStore } from "pinia";
import { authApi } from "@/api/admin/request";
import { CaptchaType } from "@/api/admin/enums";
import { readJson, writeJson } from "@/lib/encryptedStorage";

export interface AuthSession {
  userId: string;
  userName: string;
  token: string;
  /** 真实后端 HmxUserSession.userType（mock 模式无） */
  userType?: number;
}

interface LoginUserEntry {
  userId: string;
  /** 勾选"记住我"时明文保存（演示行为，同原程序） */
  password?: string;
}

interface LoginHistory {
  lastUserId: string;
  users: LoginUserEntry[];
}

const SESSION_KEY = "hmx.auth-session";
const HISTORY_KEY = "hmx.login-history";

function loadSession(): AuthSession | null {
  /* 登录态含 token，走加密封装（见 @/lib/encryptedStorage；未配密钥时等价于明文读写） */
  return readJson<AuthSession>(SESSION_KEY);
}

function loadHistory(): LoginHistory {
  /* 勾选"记住我"时这里存着明文密码，同样走加密封装 */
  const parsed = readJson<LoginHistory>(HISTORY_KEY);
  return parsed && Array.isArray(parsed.users) ? parsed : { lastUserId: "", users: [] };
}

export const useAuthStore = defineStore("auth", () => {
  const session = ref<AuthSession | null>(loadSession());
  const history = ref<LoginHistory>(loadHistory());

  watch(
    session,
    (value) => writeJson(SESSION_KEY, value ?? undefined),
  );

  watch(
    history,
    (value) => writeJson(HISTORY_KEY, value),
    { deep: true },
  );

  function findHistoryEntry(userId: string): LoginUserEntry | undefined {
    return history.value.users.find((u) => u.userId === userId);
  }

  /** 记住我回填：返回该用户已保存的密码（对应 UserIDValueChanged） */
  function rememberedPassword(userId: string): string {
    return findHistoryEntry(userId)?.password ?? "";
  }

  function removeLoginUser(userId: string) {
    const i = history.value.users.findIndex((u) => u.userId === userId);
    if (i >= 0) history.value.users.splice(i, 1);
    if (history.value.lastUserId === userId) history.value.lastUserId = "";
  }

  /** 记录历史/审计并落会话（真实与演示共用） */
  function applySession(next: AuthSession, userId: string, password: string, remember: boolean) {
    session.value = next;

    const existing = findHistoryEntry(userId);
    if (existing) {
      if (remember) existing.password = password;
      else delete existing.password;
    } else {
      history.value.users.unshift({ userId, password: remember ? password : undefined });
    }
    history.value.lastUserId = userId;
  }

  /** 后端登录：auth/token 换 token → auth/getUserInfo 构造会话（验证码由登录页求解后传入） */
  async function loginWithServer(
    userId: string,
    password: string,
    remember: boolean,
    captcha: { code: string; signature: string; type: CaptchaType },
  ) {
    const token = await authApi.token({
      userId,
      password,
      captchaType: captcha.type,
      captchaCode: captcha.code || undefined,
      captchaSignature: captcha.signature || undefined,
    });
    if (!token) throw new Error("登录失败：未取回 token");
    const info = await authApi.getUserInfo(token);
    if (!info?.userId || !info.isAuthenticated) throw new Error("无法正常获取用户信息");
    applySession(
      {
        userId: info.userId,
        userName: info.userName ?? info.userId,
        token: info.token ?? token,
        userType: info.userType,
      },
      userId,
      password,
      remember,
    );
  }

  function logout() {
    const s = session.value;
    /* 后端：显式带 token 注销（服务端将 HmxUserToken.CStatus 置 0 并清缓存）；
       不 await——本地先行登出，后端失败静默（token 过期本就该登出） */
    if (s?.token) void authApi.logout(s.token).catch(() => undefined);
    session.value = null;
  }

  return { session, history, rememberedPassword, removeLoginUser, loginWithServer, logout };
});
