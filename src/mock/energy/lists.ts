import type { RouteMap } from "../admin/core";
import { ems } from "./store";
import { allOf, eq, hasOne, like, listHandler } from "./query";

/**
 * 能源域列表端点（`POST /ems/<实体>/listPage` → `{total, rows}`）。
 *
 * 四条约定：
 * 1. 数据源一律是 **getter**（`() => ems.xxx`）。本域柜位、报警、实绩每 3s 抖一次、
 *    每次写操作都会重建月账，handler 必须在被调用时才读当前态；
 *    传数组进去等于在模块求值时拍了张快照，页面刷新看到的还是装配那一刻的账。
 * 2. 参数名 = 页面 spec 里查询条件的 `key`，两端由同一份 spec 约束，不另立翻译表。
 * 3. 枚举（`level`/`status`/`kind`/布尔列）走 `eq` 精确匹配，只有 `keyword` 走 `like`。
 *    状态类字段用模糊会把「已生成」的行留在「已」这个半截输入下，看着像筛选坏了。
 * 4. 数组列（`mediaCodes`）走 `hasOne`，既不吃 `["ELEC"]` 的方括号噪声，也不要求整串相等。
 *
 * 本文件只覆盖 **P1 的 EG 三页**。后续阶段加页面时往这里补端点，
 * 但**不预先铺空路由**：没人调用的端点等于没人验证过的代码，本域没有类型门槛兜它。
 */
export const energyListRoutes: RouteMap = {
  /* ── EG0001 介质配置 ──────────────────────────────────────────────── */
  "post /ems/medium/listPage": listHandler(
    () => ems.mediums,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "code"],
          ["keyword", "name"],
          ["keyword", "unit"],
        ]),
        eq(q, [["balanceParticipate", "balanceParticipate"]]),
      ),
  ),

  /* ── EG0002 用能单元（左树右表，右侧列表按层级/介质/关键字筛）─────── */
  "post /ems/unit/listPage": listHandler(
    () => ems.units,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "name"],
          ["keyword", "note"],
        ]),
        eq(q, [
          ["level", "level"],
          ["parentId", "parentId"],
          ["isCostCenter", "isCostCenter"],
        ]),
        hasOne(q, "mediaCode", "mediaCodes"),
      ),
  ),

  /* ── EG0003 报警规则（左）与电价模板（右）────────────────────────── */
  "post /ems/alarmRule/listPage": listHandler(
    () => ems.alarmRules,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "name"],
          ["keyword", "pointId"],
        ]),
        eq(q, [
          ["mediaCode", "mediaCode"],
          ["kind", "kind"],
          ["level", "level"],
          ["enabled", "enabled"],
        ]),
      ),
  ),

  "post /ems/priceTemplate/listPage": listHandler(
    () => ems.priceTemplates,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "name"],
          ["keyword", "effectiveMonth"],
        ]),
        eq(q, [["enabled", "enabled"]]),
      ),
  ),
};
