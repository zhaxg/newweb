/**
 * 登录会话 + 登录历史（移植 HmxLoginForm.cs 的 UserLoginHistory / HmxUserSession）。
 * settingsStore 同款 reactive 单例 + localStorage 持久化。
 */
import { reactive, watch } from "vue";
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

const SESSION_KEY = "erp.auth-session";
const HISTORY_KEY = "erp.login-history";


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

const state = reactive<{ session: AuthSession | null; history: LoginHistory }>({
  session: loadSession(),
  history: loadHistory(),
});

watch(
  () => state.session,
  (value) => {
    if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else localStorage.removeItem(SESSION_KEY);
  },
);

watch(
  () => state.history,
  (value) => localStorage.setItem(HISTORY_KEY, JSON.stringify(value)),
  { deep: true },
);

function findHistoryEntry(userId: string): LoginUserEntry | undefined {
  return state.history.users.find((u) => u.userId === userId);
}

let instance: ReturnType<typeof build> | null = null;

function build() {
  return {
    get session() {
      return state.session;
    },
    get history() {
      return state.history;
    },
    /** 记住我回填：返回该用户已保存的密码（对应 UserIDValueChanged） */
    rememberedPassword(userId: string): string {
      return findHistoryEntry(userId)?.password ?? "";
    },
    removeLoginUser(userId: string) {
      const i = state.history.users.findIndex((u) => u.userId === userId);
      if (i >= 0) state.history.users.splice(i, 1);
      if (state.history.lastUserId === userId) state.history.lastUserId = "";
    },
    /** 建立会话（演示模式：不做密码/用户校验，点登录即进） */
    login(userId: string, password: string, remember: boolean) {
      const user = loadUsers().find((u) => u.id === userId);
      const name = user?.cUserName ?? userId;
      state.session = { userId, userName: name, token: crypto.randomUUID() };

      const existing = findHistoryEntry(userId);
      if (existing) {
        if (remember) existing.password = password;
        else delete existing.password;
      } else {
        state.history.users.unshift({ userId, password: remember ? password : undefined });
      }
      state.history.lastUserId = userId;
      appendAuditAuth("登录", userId, name);
    },
    logout() {
      const s = state.session;
      if (s) appendAuditAuth("登出", s.userId, s.userName);
      state.session = null;
    },
  };
}

export function useAuthStore() {
  if (!instance) instance = build();
  return instance;
}
