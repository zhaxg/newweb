import type { HmxRes } from "@/api/admin/types";
import { loadRescs } from "./admin/store";
import { seedRescsData as tqmesRescs } from "./mes4tq/data/rescs";
import { seedRescsData as carbonRescs } from "./carbon/data/rescs";
import { seedRescsData as equipmentRescs } from "./equipment/data/rescs";
import { energyRescs } from "./energy/data/rescs";

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
  /**
   * 设备管理（EAM/PHM）演示账号：`eam` + 任意密码。
   *
   * 显示名给「设备管理部」而不是「超级管理员」：设备域的页面到处要填经办人/验证人/库管员，
   * 顶栏身份与这些字段同属一个叙事口径，写「超级管理员」会让演示里的人称对不上。
   */
  eam: { userName: "设备管理部", rescs: () => equipmentRescs },
  /**
   * 能源管理（EMS）演示账号：`energy` + 任意密码，显示名「超级管理员」。
   *
   * 不学设备域那样给部门名：能源页面上的签发人、接收人、考核人一律取自 `model.PEOPLE`
   * 那批具名角色（张调/吴工/赵工…），登录人身份不参与业务字段，顶栏写什么都不影响叙事；
   * 那就用最省事的通用名，免得"部门"和页面里的八个厂/科室互相牵扯。
   */
  energy: { userName: "超级管理员", rescs: () => energyRescs },
};

/** userId → 租户；未登记返回 undefined，调用方回落旧逻辑 */
export function findTenant(userId: string): MockTenant | undefined {
  return MOCK_TENANTS[userId];
}
