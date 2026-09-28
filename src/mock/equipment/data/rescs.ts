import type { HmxRes } from "@/api/admin/types";

/**
 * 设备全生命周期管理（EAM/PHM）演示系统 → 资源种子表（形状与 `src/mock/carbon/data/rescs.ts` 一致）。
 *
 * 路径约定：路由 = `/equipment/<模块>/<页面>`，页面目录 = `src/pages/equipment/<模块>/<页面>/index.vue`，
 * 页面段不含 "equipment"。pageId 由祖先 `cResPath` 链拼出（如 `equipment/spare/lifetime`），全局唯一。
 *
 * cCode **只编码叶子**：**A + 模块助记字母 + 4 位序号**（A=Asset 域前缀，避开碳资产 C、能源 E；
 * 模块字母取英文首字母，撞车时换同义词——spare 占 S，安全合规取 Compliance 的 C，
 * 基础配置取 General 的 G）。编码一次性颁发、永不复用变更，菜单排序与编码解耦（靠 cOrder）。
 * label 规则（`menuRescTree.ts`）= `cCode ? cCode-cTitle : cTitle`，故侧栏只有叶子显示「AS0003-备件寿命台账」，
 * 分组层级保持纯名称。
 *
 * 其余转换规则（与 carbon 同）：
 * - **cResPath 必须单段**（`fromMenu.segmentOf` 对叶子只取 pageId 末段当路由路径）。
 * - **文件夹「有子无组件」**（cResSubPath 留空）；cResType 全为 2（Menu）。
 * - **领导驾驶舱 cQueryString="blank"**：整屏页 + 菜单点击新开标签（`fromMenu` 给 `meta.layout="blank"`）。
 * - **首页 id=2000 留在 equipment-root 外面**：`dynamicRoutes.withHomeOwnership` 认一级叶子 pageId "home"。
 * - cIcon 用 Tabler 白名单名，新增要同步 `src/lib/tablerIcons.ts`，否则兜底动态 import 全量注册表。
 *
 * 与 carbon 的一点写法差异：这里用 `root/folder/leaf` 三个小工厂生成行。
 * 理由：本表 40 行里 `selected/cNsCode/cEnable/cResType/creator/rowVersion/时间戳` 全部同值，
 * 逐行手抄 40 遍只是把同一份默认值抄 40 次，改一处要改 40 处；carbon 是**抓包产物**（每行都得原样保留），
 * 本表是**我们自己编的**，没有保真负担。语义（谁是谁的父、编码、路径）仍然逐行显式，可读性没损失。
 */

const STAMP = "2026-09-27 09:00:00";

let seq = 0;

function row(part: Partial<HmxRes>): HmxRes {
  seq += 1;
  return {
    selected: false,
    id: part.id ?? `eam-${seq}`,
    cPid: "",
    cCode: "",
    cName: "",
    cTitle: "",
    cNsCode: "TDWEB",
    rowVersion: 0,
    cOrder: "999",
    cResPath: "",
    cResSubPath: "",
    cQueryString: "",
    cEnable: "1",
    cResType: 2,
    cIcon: "",
    creator: "system",
    createTime: STAMP,
    lastModifier: "system",
    lastModifyTime: STAMP,
    ...part,
  };
}

function folder(id: string, pid: string, order: string, name: string, path: string, icon: string): HmxRes {
  return row({ id, cPid: pid, cOrder: order, cName: name, cTitle: name, cResPath: path, cIcon: icon });
}

/** 叶子：path = cResPath（单段），sub = 相对 src/pages 的 vue 路径 */
function leaf(
  id: string,
  pid: string,
  order: string,
  code: string,
  name: string,
  path: string,
  sub: string,
  icon: string,
  query = "",
): HmxRes {
  return row({
    id,
    cPid: pid,
    cOrder: order,
    cCode: code,
    cName: name,
    cTitle: name,
    cResPath: path,
    cResSubPath: sub,
    cIcon: icon,
    cQueryString: query,
  });
}

export const seedRescsData: HmxRes[] = [
  /* 首页（一级叶子，pageId 必须是 home 才能顶掉内置兜底页） */
  leaf("2000", "", "000", "", "首页", "home", "/equipment/home/index.vue", "Home"),

  /* ── 域根 ─────────────────────────────────────────────────────────── */
  folder("equipment-root", "", "001", "设备管理", "equipment", "BuildingFactory"),

  /* ── 模块一 总览 AO ───────────────────────────────────────────────── */
  folder("eam-m-overview", "equipment-root", "001", "总览", "overview", "LayoutDashboard"),
  leaf(
    "eam-ao-1",
    "eam-m-overview",
    "001",
    "AO0001",
    "领导驾驶舱",
    "dashboard",
    "/equipment/overview/dashboard/index.vue",
    "DeviceTv",
    "blank",
  ),
  leaf(
    "eam-ao-2",
    "eam-m-overview",
    "002",
    "AO0002",
    "设备健康看板",
    "health",
    "/equipment/overview/health/index.vue",
    "Activity",
  ),
  leaf(
    "eam-ao-3",
    "eam-m-overview",
    "003",
    "AO0003",
    "报警中心",
    "alarm",
    "/equipment/overview/alarm/index.vue",
    "Bell",
  ),

  /* ── 模块二 设备台账 AE ───────────────────────────────────────────── */
  folder("eam-m-asset", "equipment-root", "002", "设备台账", "asset", "BuildingEstate"),
  leaf("eam-ae-1", "eam-m-asset", "001", "AE0001", "设备主数据", "device", "/equipment/asset/device/index.vue", "Tool"),
  leaf("eam-ae-2", "eam-m-asset", "002", "AE0002", "设备结构树", "bom", "/equipment/asset/bom/index.vue", "Stack2"),
  leaf(
    "eam-ae-3",
    "eam-m-asset",
    "003",
    "AE0003",
    "生命周期档案",
    "lifecycle",
    "/equipment/asset/lifecycle/index.vue",
    "History",
  ),
  leaf("eam-ae-4", "eam-m-asset", "004", "AE0004", "文档知识库", "docs", "/equipment/asset/docs/index.vue", "Books"),
  leaf("eam-ae-5", "eam-m-asset", "005", "AE0005", "扫码查询", "qrcode", "/equipment/asset/qrcode/index.vue", "Scan"),

  /* ── 模块三 状态监测 AM ───────────────────────────────────────────── */
  folder("eam-m-monitor", "equipment-root", "003", "状态监测", "monitor", "ChartLine"),
  leaf(
    "eam-am-1",
    "eam-m-monitor",
    "001",
    "AM0001",
    "采集点位配置",
    "point",
    "/equipment/monitor/point/index.vue",
    "Router",
  ),
  leaf(
    "eam-am-2",
    "eam-m-monitor",
    "002",
    "AM0002",
    "实时监控",
    "realtime",
    "/equipment/monitor/realtime/index.vue",
    "ChartDots",
  ),
  leaf(
    "eam-am-3",
    "eam-m-monitor",
    "003",
    "AM0003",
    "报警规则",
    "alarmRule",
    "/equipment/monitor/alarmRule/index.vue",
    "AlertTriangle",
  ),
  leaf("eam-am-4", "eam-m-monitor", "004", "AM0004", "PHM诊断", "phm", "/equipment/monitor/phm/index.vue", "Brain"),
  leaf(
    "eam-am-5",
    "eam-m-monitor",
    "005",
    "AM0005",
    "点巡检",
    "inspection",
    "/equipment/monitor/inspection/index.vue",
    "ClipboardCheck",
  ),

  /* ── 模块四 维修工单 AW ───────────────────────────────────────────── */
  folder("eam-m-workorder", "equipment-root", "004", "维修工单", "workorder", "Hammer"),
  leaf(
    "eam-aw-1",
    "eam-m-workorder",
    "001",
    "AW0001",
    "预防性维护计划",
    "pmPlan",
    "/equipment/workorder/pmPlan/index.vue",
    "CalendarMonth",
  ),
  leaf(
    "eam-aw-2",
    "eam-m-workorder",
    "002",
    "AW0002",
    "故障报修",
    "fault",
    "/equipment/workorder/fault/index.vue",
    "ReportAnalytics",
  ),
  leaf(
    "eam-aw-3",
    "eam-m-workorder",
    "003",
    "AW0003",
    "工单管理",
    "list",
    "/equipment/workorder/list/index.vue",
    "ClipboardList",
  ),
  leaf(
    "eam-aw-4",
    "eam-m-workorder",
    "004",
    "AW0004",
    "工单执行(移动端)",
    "mobile",
    "/equipment/workorder/mobile/index.vue",
    "DeviceMobile",
  ),
  leaf(
    "eam-aw-5",
    "eam-m-workorder",
    "005",
    "AW0005",
    "计划排程",
    "schedule",
    "/equipment/workorder/schedule/index.vue",
    "CalendarStats",
  ),

  /* ── 模块五 备品备件 AS（客户核心加分项）──────────────────────────── */
  folder("eam-m-spare", "equipment-root", "005", "备品备件", "spare", "Package"),
  leaf("eam-as-1", "eam-m-spare", "001", "AS0001", "备件主数据", "part", "/equipment/spare/part/index.vue", "Box"),
  leaf("eam-as-2", "eam-m-spare", "002", "AS0002", "库存流转", "stock", "/equipment/spare/stock/index.vue", "Exchange"),
  leaf(
    "eam-as-3",
    "eam-m-spare",
    "003",
    "AS0003",
    "备件寿命台账",
    "lifetime",
    "/equipment/spare/lifetime/index.vue",
    "ClockHour4",
  ),
  leaf(
    "eam-as-4",
    "eam-m-spare",
    "004",
    "AS0004",
    "寿命考核结算单",
    "assessment",
    "/equipment/spare/assessment/index.vue",
    "Receipt",
  ),
  leaf(
    "eam-as-5",
    "eam-m-spare",
    "005",
    "AS0005",
    "离职交接折算",
    "handover",
    "/equipment/spare/handover/index.vue",
    "Users",
  ),
  leaf(
    "eam-as-6",
    "eam-m-spare",
    "006",
    "AS0006",
    "请购管理",
    "purchase",
    "/equipment/spare/purchase/index.vue",
    "Basket",
  ),

  /* ── 模块六 安全与合规 AC ─────────────────────────────────────────── */
  folder("eam-m-safety", "equipment-root", "006", "安全合规", "safety", "ShieldCheck"),
  leaf(
    "eam-ac-1",
    "eam-m-safety",
    "001",
    "AC0001",
    "作业票审批",
    "workPermit",
    "/equipment/safety/workPermit/index.vue",
    "FileDescription",
  ),
  leaf(
    "eam-ac-2",
    "eam-m-safety",
    "002",
    "AC0002",
    "隐患闭环",
    "hazard",
    "/equipment/safety/hazard/index.vue",
    "AlertCircle",
  ),
  leaf(
    "eam-ac-3",
    "eam-m-safety",
    "003",
    "AC0003",
    "特种设备管理",
    "special",
    "/equipment/safety/special/index.vue",
    "ShieldLock",
  ),
  leaf(
    "eam-ac-4",
    "eam-m-safety",
    "004",
    "AC0004",
    "计量器具管理",
    "metering",
    "/equipment/safety/metering/index.vue",
    "Ruler",
  ),

  /* ── 模块七 分析报表 AR ───────────────────────────────────────────── */
  folder("eam-m-analysis", "equipment-root", "007", "分析报表", "analysis", "ChartBar"),
  leaf("eam-ar-1", "eam-m-analysis", "001", "AR0001", "KPI指标", "kpi", "/equipment/analysis/kpi/index.vue", "Target"),
  leaf(
    "eam-ar-2",
    "eam-m-analysis",
    "002",
    "AR0002",
    "报表中心",
    "report",
    "/equipment/analysis/report/index.vue",
    "FileText",
  ),

  /* ── 模块八 基础配置 AG ───────────────────────────────────────────── */
  folder("eam-m-config", "equipment-root", "008", "基础配置", "config", "Settings"),
  leaf(
    "eam-ag-1",
    "eam-m-config",
    "001",
    "AG0001",
    "集成接口管理",
    "integration",
    "/equipment/config/integration/index.vue",
    "Api",
  ),
];
