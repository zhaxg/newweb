/**
 * 登录会话 + 登录历史（移植 HmxLoginForm.cs 的 UserLoginHistory / HmxUserSession）。
 * Pinia setup store + localStorage 持久化。
 */
import { ref, watch } from "vue";
import { defineStore } from "pinia";
import { appendAuditAuth } from "@/data/auditLogs";
import { authApi } from "@/api/admin/request";
import { CaptchaType } from "@/api/admin/enums";

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
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as AuthSession;
  } catch {
    /* 数据损坏时视为未登录 */
  }
  return null;
}

function loadHistory(): LoginHistory {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LoginHistory;
      if (Array.isArray(parsed.users)) return parsed;
    }
  } catch {
    /* 数据损坏时回退空 */
  }
  return { lastUserId: "", users: [] };
}

export const useAuthStore = defineStore("auth", () => {
  const session = ref<AuthSession | null>(loadSession());
  const history = ref<LoginHistory>(loadHistory());

  watch(
    session,
    (value) => {
      if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
      else localStorage.removeItem(SESSION_KEY);
    },
  );

  watch(
    history,
    (value) => localStorage.setItem(HISTORY_KEY, JSON.stringify(value)),
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
    appendAuditAuth("登录", userId, next.userName);
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
    if (s) appendAuditAuth("登出", s.userId, s.userName);
    /* 后端：显式带 token 注销（服务端将 HmxUserToken.CStatus 置 0 并清缓存）；
       不 await——本地先行登出，后端失败静默（token 过期本就该登出） */
    if (s?.token) void authApi.logout(s.token).catch(() => undefined);
    session.value = null;
  }

  return { session, history, rememberedPassword, removeLoginUser, loginWithServer, logout };
});
