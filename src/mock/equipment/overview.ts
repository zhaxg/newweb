import type { RouteMap } from "../admin/core";
import { getParams, ok } from "../admin/core";
import { REPORT_DEFS, activeAssignees, seedPeople } from "./data/org";
import {
  dashboard,
  eam,
  equipmentDetail,
  equipmentTree,
  handoverCandidates,
  handoverPreview,
  healthBoard,
  kpiSet,
  monthlyReport,
  phmToWorkOrder,
  phmView,
  realtimeView,
  scanQr,
} from "./store";

/**
 * 设备域**读取聚合**端点：无分页、无过滤，一次把整屏要的东西拿全。
 *
 * 为什么不塞进 `lists.ts`：那一层的每个键都是「数组 + 条件过滤 + 分页」同一形状，
 * 这里九个端点每个返回的都是**现算的统计对象**（产线健康度均值、寿命排行、五维雷达…）。
 * 混在一张表里会让 lists.ts 既看不懂也没法复用它的 `listHandler`，
 * 分开之后「哪份数据是查出来的、哪份是算出来的」在文件名上就分清了。
 *
 * 也为什么不缓存：演示时钟固定（`DEMO_T0`）、数据全在内存，现算的成本是三十台设备量级；
 * 而剧本每走一步都要让驾驶舱的数字当场变——缓存放在这里就是让大屏变成死图。
 */
export const equipmentOverviewRoutes: RouteMap = {
  /* 下拉候选：产线 / 人员（人员必须在岗过滤，见 org.ts 的 activeAssignees 注释） */
  "get /eam/line/list": (config) => ok(config, eam.lines),
  "get /eam/org/assignees": (config) => ok(config, activeAssignees()),
  "get /eam/org/people": (config) =>
    ok(
      config,
      seedPeople.map((p) => ({ name: p.name, role: p.role, dept: p.dept, active: p.active })),
    ),

  /* 设备结构 / 档案 / 扫码 */
  "get /eam/equipment/tree": (config) => ok(config, equipmentTree()),
  "get /eam/equipment/detail": (config) => ok(config, equipmentDetail(String(getParams(config).id ?? ""))),
  "get /eam/equipment/scan": (config) => ok(config, scanQr(String(getParams(config).code ?? ""))),

  /* 状态监测：实时曲线窗 + PHM 诊断视图 */
  "get /eam/monitor/realtime": (config) => ok(config, realtimeView(String(getParams(config).eqId ?? ""))),
  "get /eam/monitor/phm": (config) => ok(config, phmView(String(getParams(config).eqId ?? ""))),
  "post /eam/monitor/phmToWorkOrder": (config) => {
    const b = (config.data ? JSON.parse(String(config.data)) : {}) as Record<string, any>;
    const wo = phmToWorkOrder(String(b.eqId ?? ""), b.assignee ? String(b.assignee) : "");
    return ok(config, {
      ok: Boolean(wo),
      msg: wo
        ? `已生成诊断工单 ${wo.id}（${wo.priority}）${wo.assignee ? `，派给 ${wo.assignee}` : "，待派工"}`
        : "设备不存在",
      data: wo,
    });
  },

  /* 总览与分析 */
  "get /eam/overview/dashboard": (config) => ok(config, dashboard()),
  "get /eam/overview/health": (config) => ok(config, healthBoard()),
  "get /eam/analysis/kpi": (config) => ok(config, kpiSet()),
  "get /eam/analysis/report": (config) => ok(config, monthlyReport(String(getParams(config).month ?? ""))),
  "get /eam/analysis/reportDefs": (config) => ok(config, REPORT_DEFS),
  "get /eam/analysis/params": (config) => ok(config, eam.params),

  /* 离职折算的可选人员（带名下寿命件数与预估金额，选人时就能看出折多少） */
  "get /eam/handover/candidates": (config) => ok(config, handoverCandidates()),
  /* 折算前的逐件明细：与 handover() 同一个行工厂，预览金额 = 成单金额 */
  "get /eam/handover/preview": (config) => ok(config, handoverPreview(String(getParams(config).person ?? ""))),
};
