import type { HmxRes } from "@/api/admin/types";
import { loadRescs } from "./admin/store";
import { seedRescsData as tqmesRescs } from "./mes4tq/data/rescs";
import { seedRescsData as carbonRescs } from "./carbon/data/rescs";

/**
 * mock 内置用户 → 资源表的「租户」注册表（跨业务域的胶水，和 mockAdapter 同级）。
 *
 * 真实后端的 getUserRescList 是「你是谁 → 下发什么资源」；mock 此前只按请求 groupId
 * 过滤、与登录身份无关。本表把两者接起来：auth/token 把 userId 编进
 * `mock-token.<userId>.…`，getUserRescList 从 Authorization 头还原 userId 后查这张表。
 *
 * **扩展方法**：新增用户时在此加一行 + 在对应 `src/mock/<域>/data/rescs.ts` 放资源表即可，
 * auth 域代码零改动。未登记的账号（admin 等）回落旧行为（按 groupId 过滤 admin 资源表）。
 */

export interface MockTenant {
  /** 会话显示名（对应 getUserInfo 的 userName） */
  userName: string;
  /** 该用户登录后拿到的全量资源表（mock 后端按身份选表，不看请求体的 groupId） */
  rescs: () => HmxRes[];
}

export const MOCK_TENANTS: Record<string, MockTenant> = {
  /** 中厚板 MES：admin 域资源表（localStorage 可编辑的 loadRescs） */
  gzmes: { userName: "超级管理员", rescs: loadRescs },
  /** 特钢 MES */
  tqmes: { userName: "超级管理员", rescs: () => tqmesRescs },
  /** 碳资产 */
  carbon: { userName: "超级管理员", rescs: () => carbonRescs },
};

/** userId → 租户；未登记返回 undefined，调用方回落旧逻辑 */
export function findTenant(userId: string): MockTenant | undefined {
  return MOCK_TENANTS[userId];
}
