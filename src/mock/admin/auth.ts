import type { InternalAxiosRequestConfig } from "axios";

import type { RouteMap } from "./core";
import { API_BASE, getBody, getParams, ok } from "./core";
import { CaptchaType, UserType } from "@/api/admin/enums";
import type {
  CaptchaInfo,
  FetchTokenInput,
  HmxUserSession,
} from "@/api/admin/types";
import { loadRescs, loadUsers } from "./store";

/**
 * mock「后端」auth 域：以最小实现模拟真实后端 auth 接口（登录/会话/资源/验证码），
 * 让 mock 与真实模式共用同一条前端链路（loginWithServer + getUserRescList → 动态菜单）。
 * 不做业务校验：token 永远发、验证码永远对、getUserRescList 永远返回全部资源。
 */

const TOKEN_PREFIX = "mock-token.";

/** MathPow 挑战串真实格式「难度#28位随机前缀#时间戳」，难度取小值保证前端 PoW 秒解 */
function makeChallenge(): CaptchaInfo {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let prefix = "";
  for (let i = 0; i < 28; i++) {
    prefix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const challengeString = `10#${prefix}#${Date.now()}`;
  return {
    captchaType: CaptchaType.MathPow,
    challengeString,
    signature: btoa(`mock:${challengeString}`),
  };
}

/** 兼容非安全上下文（http://IP）下 crypto.randomUUID 不可用 */
function fallbackUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function safeRandomUUID(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return fallbackUuid();
  }
}

/** 从 token 还原 userId；非本 mock 发的 token（旧会话/真机串）统一回落 admin */
function userIdFromToken(token?: string): string {
  if (token?.startsWith(TOKEN_PREFIX)) {
    const seg = token.slice(TOKEN_PREFIX.length).split(".")[0];
    try {
      return decodeURIComponent(seg) || "admin";
    } catch {
      return "admin";
    }
  }
  return "admin";
}

/** 菜单资源来自种子表 data/rescs.ts（HM_X_RES 真实导出），按命名空间过滤 */

export const authRoutes: RouteMap = {
  [`post ${API_BASE}/auth/getCaptchaImage`]: (config) =>
    ok(config, makeChallenge()),
  [`post ${API_BASE}/auth/getCaptchaChallenge`]: (config) =>
    ok(config, makeChallenge()),
  [`post ${API_BASE}/auth/token`]: (config: InternalAxiosRequestConfig) => {
    const input = getBody<FetchTokenInput>(config);
    const userId = (input.userId ?? "").trim() || "admin";
    const token = `${TOKEN_PREFIX}${encodeURIComponent(userId)}.${safeRandomUUID()}`;
    return ok(config, token);
  },
  [`post ${API_BASE}/auth/getUserInfo`]: (config) => {
    const token = getParams(config).token as string | undefined;
    const userId = userIdFromToken(token);
    const user = loadUsers().find((u) => u.id === userId);
    const session: HmxUserSession = {
      userId,
      userName: user?.cUserName ?? userId,
      token,
      isAuthenticated: true,
      userType: user?.cMaster === "1" ? UserType.Root : UserType.Admin,
      roles: [],
    };
    return ok(config, session);
  },
  [`post ${API_BASE}/auth/getUserRescList`]: (config) => {
    const { groupId } = getBody<{ groupId?: string; rescType?: number[] }>(config);
    const ns = groupId || "TDWEB";
    return ok(config, loadRescs().filter((r) => r.cNsCode === ns));
  },
  [`post ${API_BASE}/auth/hasPermission`]: (config) => ok(config, true),
  [`post ${API_BASE}/auth/logout`]: (config) => ok(config, null),
};
