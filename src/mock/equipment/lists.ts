import type { RouteMap } from "../admin/core";
import { deadlineOf, eam } from "./store";
import { allOf, dateRange, dayRange, eq, like, listAll, listHandler } from "./query";

/**
 * 设备域列表端点（`POST /eam/<实体>/listPage` → `{total, rows}`）。
 *
 * 三个约定：
 * 1. 过滤谓词只认**行里真有的字段**——枚举走精确匹配 `eq`、文本走 `like`、时间走区间；
 *    参数名就是页面 spec 里的查询条件 `key`，两端由同一份 spec 约束，不另立翻译表。
 * 2. 数据源是 getter（`() => eam.xxx`），所以任何一次写操作之后重查都能看到新状态
 *    （carbon 那边是静态快照，见 `./query.ts` 文件头）。
 * 3. 到期扫描类报警由 `./index.ts` 在建表时触发一次，这里不再逐端点兜底。
 */

export const equipmentListRoutes: RouteMap = {
  /* ── 设备台账（AE）────────────────────────────────────────────────── */
  "post /eam/equipment/listPage": listHandler(
    () => eam.equipments,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "name"],
          ["keyword", "model"],
          ["keyword", "position"],
        ]),
        eq(q, [
          ["lineId", "lineId"],
          ["level", "level"],
          ["status", "status"],
        ]),
        dayRange(q, "commissionedAt"),
      ),
  ),
  "get /eam/equipment/list": listAll(() => eam.equipments),

  "post /eam/lifecycle/listPage": listHandler(
    () => eam.lifecycleEvents,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "note"],
          ["keyword", "refDocNo"],
        ]),
        eq(q, [
          ["eqId", "eqId"],
          ["type", "type"],
        ]),
      ),
  ),

  "post /eam/doc/listPage": listHandler(
    () => eam.docs,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "name"],
          ["keyword", "author"],
        ]),
        eq(q, [
          ["type", "type"],
          ["eqId", "eqId"],
        ]),
      ),
  ),

  /* ── 状态监测（AM）────────────────────────────────────────────────── */
  "post /eam/point/listPage": listHandler(
    () => eam.points,
    (q) =>
      allOf(
        /* 关键字只按位号 TagID 匹配：这页的行是取值服务直接读的，现场找点就是照着位号捞 */
        like(q, [["keyword", "id"]]),
        eq(q, [
          ["eqId", "eqId"],
          ["commState", "commState"],
        ]),
      ),
  ),

  "post /eam/alarmRule/listPage": listHandler(
    () => eam.alarmRules,
    (q) => allOf(like(q, [["keyword", "pointId"]]), eq(q, [["enabled", "enabled"]])),
  ),

  "post /eam/alarm/listPage": listHandler(
    () => eam.alarms,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "msg"],
          ["keyword", "id"],
        ]),
        eq(q, [
          ["level", "level"],
          ["status", "status"],
          ["source", "source"],
          ["eqId", "eqId"],
        ]),
        dateRange(q, "occurredAt"),
      ),
  ),

  "post /eam/inspection/listPage": listHandler(
    () => eam.inspections,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "name"],
          ["keyword", "route"],
          ["keyword", "person"],
        ]),
        eq(q, [
          ["result", "result"],
          ["eqId", "eqId"],
          // 左栏按巡检线筛（现场是按线走的），没有这个键点线就没反应
          ["route", "route"],
        ]),
        dayRange(q, "planDate"),
      ),
  ),

  /* ── 维修工单（AW）────────────────────────────────────────────────── */
  "post /eam/workOrder/listPage": listHandler(
    () => eam.workOrders,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "title"],
          ["keyword", "faultDesc"],
        ]),
        eq(q, [
          ["status", "status"],
          ["source", "source"],
          ["priority", "priority"],
          ["assignee", "assignee"],
          ["eqId", "eqId"],
        ]),
        dateRange(q, "createdAt"),
      ),
  ),

  "post /eam/pmPlan/listPage": listHandler(
    () => eam.pmPlans,
    (q) =>
      allOf(
        like(q, [["keyword", "name"]]),
        eq(q, [
          ["eqId", "eqId"],
          ["cycleType", "cycleType"],
          ["enabled", "enabled"],
        ]),
      ),
  ),

  /* ── 备品备件（AS）────────────────────────────────────────────────── */
  "post /eam/sparePart/listPage": listHandler(
    () => eam.spareParts,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "name"],
          ["keyword", "spec"],
          ["keyword", "loc"],
        ]),
        eq(q, [
          ["category", "category"],
          ["lifeManaged", "lifeManaged"],
        ]),
      ),
  ),
  "get /eam/sparePart/list": listAll(() => eam.spareParts),

  "post /eam/stockTxn/listPage": listHandler(
    () => eam.stockTxns,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "spId"],
          ["keyword", "person"],
          ["keyword", "woId"],
        ]),
        eq(q, [["type", "type"]]),
        dateRange(q, "at"),
      ),
  ),

  "post /eam/lifeRecord/listPage": listHandler(
    () => eam.lifeRecords,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "serial"],
          ["keyword", "holder"],
        ]),
        eq(q, [
          ["status", "status"],
          ["spId", "spId"],
          ["holder", "holder"],
          ["mountedEqId", "mountedEqId"],
        ]),
      ),
  ),

  "post /eam/purchaseRequest/listPage": listHandler(
    () => eam.purchaseRequests,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "spId"],
          ["keyword", "reason"],
        ]),
        eq(q, [["status", "status"]]),
      ),
  ),

  "post /eam/assessment/listPage": listHandler(
    () => eam.assessments,
    (q) => eq(q, [["month", "month"]]),
  ),
  "post /eam/handover/listPage": listHandler(
    () => eam.handovers,
    (q) => eq(q, [["person", "person"]]),
  ),

  /* ── 安全合规（AC）────────────────────────────────────────────────── */
  "post /eam/special/listPage": listHandler(
    () => eam.specialEquipments.map(deadlineOf),
    (q) =>
      allOf(
        like(q, [
          ["keyword", "name"],
          ["keyword", "regNo"],
        ]),
        eq(q, [
          ["type", "type"],
          ["status", "status"],
        ]),
      ),
  ),

  "post /eam/metering/listPage": listHandler(
    () => eam.meteringDevices.map(deadlineOf),
    (q) =>
      allOf(
        like(q, [
          ["keyword", "name"],
          ["keyword", "certNo"],
        ]),
        eq(q, [
          ["status", "status"],
          ["mandatoryVerify", "mandatoryVerify"],
        ]),
      ),
  ),

  "post /eam/workPermit/listPage": listHandler(
    () => eam.workPermits,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "workContent"],
          ["keyword", "area"],
        ]),
        eq(q, [
          ["type", "type"],
          ["grade", "grade"],
          ["status", "status"],
          ["applicant", "applicant"],
        ]),
      ),
  ),

  "post /eam/hazard/listPage": listHandler(
    () => eam.hazards,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "title"],
        ]),
        eq(q, [
          ["level", "level"],
          ["status", "status"],
        ]),
      ),
  ),

  /* ── 集成（AG）────────────────────────────────────────────────────── */
  "post /eam/integration/listPage": listHandler(
    () => eam.integrations,
    (q) =>
      allOf(
        like(q, [["keyword", "name"]]),
        eq(q, [
          ["target", "target"],
          ["protocol", "protocol"],
          ["lastStatus", "lastStatus"],
        ]),
      ),
  ),
};
