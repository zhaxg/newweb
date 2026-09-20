/**
 * 登录会话 + 登录历史（移植 HmxLoginForm.cs 的 UserLoginHistory / HmxUserSession）。
 * Pinia setup store + localStorage 持久化。
 */
import { ref, watch } from "vue";
import { defineStore } from "pinia";
import { loadUsers } from "@/data/users";
import { appendAuditAuth } from "@/data/auditLogs";

export interface AuthSession {
  userId: string;
  userName: string;
  token: string;
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

  /** 建立会话（演示模式：不做密码/用户校验，点登录即进） */
  function login(userId: string, password: string, remember: boolean) {
    const user = loadUsers().find((u) => u.id === userId);
    const name = user?.cUserName ?? userId;
    session.value = { userId, userName: name, token: crypto.randomUUID() };

    const existing = findHistoryEntry(userId);
    if (existing) {
      if (remember) existing.password = password;
      else delete existing.password;
    } else {
      history.value.users.unshift({ userId, password: remember ? password : undefined });
    }
    history.value.lastUserId = userId;
    appendAuditAuth("登录", userId, name);
  }

  function logout() {
    const s = session.value;
    if (s) appendAuditAuth("登出", s.userId, s.userName);
    session.value = null;
  }

  return { session, history, rememberedPassword, removeLoginUser, login, logout };
});
