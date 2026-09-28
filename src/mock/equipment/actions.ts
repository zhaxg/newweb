import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

import type { Hazard, InspectionTask, SensorPoint, WorkOrder, WorkPermit } from "@/api/equipment/types";
import type { Handler, RouteMap } from "../admin/core";
import { ok } from "../admin/core";
import { expandPoint } from "./data/monitor";
import { SIM_SCRIPT_F4, simParam } from "./data/sim";
import { SIM_STEP_MS } from "./data/sim";
import {
  DEMO_MONTH,
  DEMO_TODAY,
  acceptHazard,
  acceptWorkOrder,
  ackAlarm,
  alarmToWorkOrder,
  approvePermit,
  approvePurchase,
  assignWorkOrder,
  closeAlarm,
  closePermit,
  closeWorkOrder,
  createWorkOrder,
  eam,
  firePm,
  getWorkOrder,
  handover,
  inspectSpecial,
  issueMaterial,
  nextEquipmentId,
  nextPointId,
  nextRuleId,
  nextSeqId,
  nowStamp,
  pushSample,
  realtimeView,
  receivePurchase,
  rectifyHazard,
  removeRow,
  runAssessment,
  startPermit,
  stockIn,
  submitInspection,
  submitWorkOrder,
  syncIntegration,
  tickRunHours,
  togglePmPlan,
  upsertRow,
  verifyMetering,
  verifyWorkOrder,
} from "./store";

/**
 * 设备域写操作端点。
 *
 * 与 carbon 的 `writes.ts` 最大的区别：**这里的写真的落库**（写进 `eam` 内存态），
 * 因为整场演示靠的就是「一处操作、多处跟着变」。每个端点同一条形状：
 *   1. 校验入参 → 不合法回 `ActionResult{ok:false, msg}`。**业务拒绝不走 HTTP 错误**：
 *      真实后端对「库存不足」这类结果也是回 200 + 信封成功 + data.ok=false，
 *      拦截层只弹传输/权限错误，业务原因得由页面自己 toast 出来（见 `carbon` 域没有这一步的原因）；
 *   2. 调 store 的联动方法——跨模块副作用全在 `store.ts`，路由层不自己改状态；
 *   3. 回 `{ok:true, msg, data}`，`msg` 就是 toast 文案。
 *      「库存 6 → 5，已自动生成请购单 PR-004」这种具体结果，比一句「操作成功」有说服力得多。
 */

/** 统一的成功/业务拒绝信封 */
function done<T>(config: InternalAxiosRequestConfig, okFlag: boolean, msg: string, data?: T): AxiosResponse {
  return ok(config, { ok: okFlag, msg, data });
}

/** store 动作方法回 undefined = 记录不存在或当前状态不允许 */
function byId(config: InternalAxiosRequestConfig, hit: unknown, msg: string): AxiosResponse {
  return hit ? done(config, true, msg, hit) : done(config, false, `${msg}：记录不存在或当前状态不允许该操作`);
}

function body(config: InternalAxiosRequestConfig): Record<string, any> {
  return (config.data ? JSON.parse(String(config.data)) : {}) as Record<string, any>;
}

/** 「按 id 调一个 store 动作方法」的通用形状，省掉十几段一模一样的取参与判空 */
function idAction(fn: (id: string, by?: string) => unknown, msg: string): Handler {
  return (config) => {
    const b = body(config);
    return byId(config, fn(String(b.id), b.by ? String(b.by) : undefined), msg);
  };
}

/**
 * 主数据保存：有 id 改、没 id 增。
 *
 * `nextId` 是函数不是前缀字符串——种子的编号规则并不统一（`SP-0001` 四位、`PM-001` 三位、
 * `PT-<设备短码>-<nn>` 带语义段），一个 `prefix` 参数表达不了，硬套就会新增出 `PT-NEW-01-0001`
 * 这种和其余 40 行明显不是一套的编号。
 */
function saveRow<T extends { id: string }>(
  rows: () => T[],
  nextId: (draft: Partial<T>) => string,
  msg: string,
  after?: (row: T) => void,
): Handler {
  return (config) => {
    const b = body(config) as Partial<T> & { id?: string };
    if (!b.id) b.id = nextId(b);
    const row = upsertRow(rows(), b);
    after?.(row);
    return done(config, true, msg, row);
  };
}

function removeById(rows: () => Array<{ id: string }>, msg: string): Handler {
  return (config) => {
    const b = body(config);
    return removeRow(rows(), String(b.id)) ? done(config, true, msg) : done(config, false, "记录不存在，可能已被删除");
  };
}

export const equipmentActionRoutes: RouteMap = {
  /* ── 报警（AO0003）─────────────────────────────────────────────────── */
  "post /eam/alarm/ack": idAction(ackAlarm, "报警已确认"),
  "post /eam/alarm/close": idAction(closeAlarm, "报警已关闭"),
  "post /eam/alarm/toWorkOrder": (config) => {
    const b = body(config);
    const wo = alarmToWorkOrder(String(b.id), b.assignee ? String(b.assignee) : "");
    return wo
      ? done(config, true, `已转为工单 ${wo.id}，可在工单管理继续派工`, wo)
      : done(config, false, "该报警已转过工单，或报警已关闭");
  },

  /* ── 工单状态机（AW0003 派工/验证、AW0004 移动端接单/完工）─────────── */
  "post /eam/workOrder/create": (config) => {
    const b = body(config);
    if (!b.eqId) return done(config, false, "请先选择报修设备");
    const wo = createWorkOrder({
      eqId: String(b.eqId),
      title: String(b.title ?? "现场故障报修"),
      faultDesc: String(b.faultDesc ?? ""),
      priority: (b.priority ?? "中") as WorkOrder["priority"],
      source: (b.source ?? "故障报修") as WorkOrder["source"],
      assignee: b.assignee ? String(b.assignee) : "",
      by: String(b.by ?? "调度"),
      planHours: Number(b.planHours) || 8,
    });
    return done(config, true, `工单 ${wo.id} 已下达${wo.assignee ? `并派给 ${wo.assignee}` : "，等待派工"}`, wo);
  },
  "post /eam/workOrder/assign": (config) => {
    const b = body(config);
    if (!b.assignee) return done(config, false, "请选择维修负责人");
    return byId(config, assignWorkOrder(String(b.id), String(b.assignee)), "派工完成");
  },
  "post /eam/workOrder/accept": idAction(acceptWorkOrder, "已接单，工单进入执行中"),
  "post /eam/workOrder/submit": (config) => {
    const b = body(config);
    const wo = submitWorkOrder(String(b.id), {
      actualHours: b.actualHours == null ? undefined : Number(b.actualHours),
      photos: Array.isArray(b.photos) ? b.photos.map(String) : undefined,
      note: b.note ? String(b.note) : undefined,
    });
    return byId(config, wo, "完工提交成功，等待主管验证");
  },
  "post /eam/workOrder/verify": (config) => {
    const b = body(config);
    const pass = b.pass !== false;
    return byId(
      config,
      verifyWorkOrder(String(b.id), pass),
      pass ? "验证通过，工单已关闭并回写设备履历" : "已退回现场继续处理",
    );
  },
  "post /eam/workOrder/close": idAction(closeWorkOrder, "工单已关闭"),
  "post /eam/workOrder/issue": (config) => {
    const b = body(config);
    const r = issueMaterial(
      String(b.woId),
      String(b.spId),
      Number(b.qty) || 0,
      b.lifeSerial ? String(b.lifeSerial) : undefined,
    );
    if (!r.ok) return done(config, false, r.msg);
    const wo = getWorkOrder(String(b.woId));
    return done(config, true, r.prId ? `${r.msg}；低于安全库存，已自动请购 ${r.prId}` : r.msg, wo);
  },
  "get /eam/workOrder/detail": (config) => {
    const wo = getWorkOrder(String(config.params?.id ?? ""));
    return wo ? ok(config, wo) : done(config, false, "工单不存在");
  },

  /* ── 预防性维护计划（AW0001）───────────────────────────────────────── */
  "post /eam/pmPlan/toggle": (config) => {
    const b = body(config);
    return byId(config, togglePmPlan(String(b.id), b.enabled !== false), "计划启用状态已更新");
  },
  "post /eam/pmPlan/fire": (config) => {
    const b = body(config);
    const wo = firePm(String(b.id));
    return wo ? done(config, true, `已按周期生成预防性维护工单 ${wo.id}`, wo) : done(config, false, "计划不存在");
  },
  "post /eam/pmPlan/save": saveRow(
    () => eam.pmPlans,
    () => nextSeqId("PM", eam.pmPlans, 3),
    "维护计划已保存",
  ),

  /* ── 备件 / 库存 / 寿命 / 结算（AS）────────────────────────────────── */
  "post /eam/sparePart/save": saveRow(
    () => eam.spareParts,
    () => nextSeqId("SP", eam.spareParts, 4),
    "备件主数据已保存",
    (row) => {
      /* 关掉寿命考核开关就没有限期可言，留着会让台账页拿 undefined 去除 */
      if (!row.lifeManaged) delete row.lifeLimitHours;
    },
  ),
  "post /eam/sparePart/remove": removeById(() => eam.spareParts, "备件已删除"),
  "post /eam/sparePart/stockIn": (config) => {
    const b = body(config);
    const qty = Number(b.qty) || 0;
    if (qty <= 0) return done(config, false, "入库数量必须大于 0");
    if (!b.spId) return done(config, false, "请选择备件");
    const part = stockIn(String(b.spId), qty, String(b.person ?? ""), String(b.note ?? ""));
    return part
      ? done(config, true, `${part.name} 入库 ${qty}${part.unit}，现库存 ${part.qty}${part.unit}`, part)
      : done(config, false, "备件不存在");
  },
  /** 结算单按月现算并落一张单据；同月重复执行即重算（改了奖罚系数要能当场看到） */
  "post /eam/assessment/run": (config) => {
    const b = body(config);
    const a = runAssessment(String(b.month ?? DEMO_MONTH));
    return done(config, true, `${a.month} 结算单已生成：奖励 ${a.rewardTotal} 元、处罚 ${a.punishTotal} 元`, a);
  },
  "post /eam/handover/run": (config) => {
    const b = body(config);
    const rec = handover(String(b.person ?? ""));
    return rec
      ? done(config, true, `${rec.person} 名下 ${rec.rows.length} 件已折算回库，合计 ${rec.total} 元`, rec)
      : done(config, false, "该人名下没有在册寿命件");
  },
  "post /eam/purchaseRequest/approve": idAction(approvePurchase, "请购单已提交采购"),
  "post /eam/purchaseRequest/receive": (config) => {
    const b = body(config);
    const r = receivePurchase(String(b.id));
    return r.pr ? done(config, true, r.msg, r.pr) : done(config, false, r.msg);
  },

  /* ── 采集点位与报警规则（AM0001 / AM0003）──────────────────────────── */
  /**
   * 保存采集点位：**这一行是取值服务直接读的**，所以位号 TagID 是主键、三级 tagId 不能撞。
   *
   * 与通用 `saveRow` 的三点差别：
   * 1. 新增时位号可以由配置人员手填（现场本来就按位号管台账），填了已存在的号就直接拒绝——
   *    静默覆盖等于把别人那条序列的取值配置改走了，这比报个错严重得多；
   * 2. 编辑不改位号（`id` 由列表行注入，表单里那个 `tagId` 只在新增时参与）；
   * 3. 人只填得了「二级位号/指标编码/指标名称/频率/类型/单位」这几栏，`measurement`、三级 tagId、
   *    `retention`、指标类别这些**约定**由 `expandPoint` 补齐——种子展开走同一个函数，
   *    新增的点才不会一到实时页就成了半个点。
   */
  "post /eam/point/save": (config) => {
    const b = body(config);
    const { tagId, ...draft } = b as Partial<SensorPoint> & { tagId?: string };
    const eqId = String(draft.eqId ?? "").trim();
    const metricCode = String(draft.metricCode ?? "").trim();
    const name = String(draft.name ?? "").trim();
    if (!eqId) return done(config, false, "请先选择归属设备");
    if (!metricCode) return done(config, false, "指标编码是三级 tagId 的最后一段，空着库里就取不到值");
    if (!name) return done(config, false, "指标名称就是这个点的名字（列表、曲线、报警文案全读它），不能空着");
    if (/[.\s]/.test(metricCode))
      return done(
        config,
        false,
        `指标编码「${metricCode}」不能含点号或空格——点号是 tagId 的分层符，占用了就拆不出层级`,
      );
    /* 二级位号填了全路径就得属于这台设备（只填部件短码由 `expandPoint` 补全，不在此列）：
       前缀写错设备的点，在设备台账与监测页上都找不到，等于凭空造一个孤儿。 */
    const tag2 = String(draft.tag2Id ?? "").trim();
    if (tag2.includes(".") && !tag2.startsWith(`${eqId}.`))
      return done(config, false, `二级采集位号要以归属设备编码 ${eqId} 开头（现在填的是 ${tag2}）`);

    const id = String(draft.id ?? "").trim();
    if (id) {
      /* 指标类别是从指标名称认出来的（表单里已经没有「监测指标」这一栏）。改了名才重推，没改名就沿用
         已登记的口径——种子里那些类别是现场约定，不能被关键词猜歪。`upsertRow` 就地改对象，
         所以旧名称要在合并前记下来。 */
      const old = eam.points.find((p) => p.id === id);
      const renamed = !old || old.name !== name;
      const row = upsertRow(eam.points, { ...draft, id });
      if (renamed) row.metric = "";
      Object.assign(row, expandPoint(row));
      return done(config, true, "采集配置已保存", row);
    }
    const tag = String(tagId ?? "").trim() || nextPointId(eqId);
    if (eam.points.some((p) => p.id === tag))
      return done(config, false, `位号 ${tag} 已存在，取值服务会读到两条同键配置`);
    /* 网关跟着设备走：一台设备的点必在同一台边缘网关下，所以新增先复用该设备已有行的网关，
       这台设备第一次配点才新分配一台（否则同设备两个点挂在两台网关上，现场不可能）。 */
    const drafted = expandPoint({
      gwId: eam.points.find((p) => p.eqId === eqId)?.gwId,
      ...draft,
      id: tag,
    });
    /* tagId 现在是「二级位号 + 指标编码」拼出来的，同键两条就等于两个位号抢同一份时序数据——
       报警会串到别人的点上去，所以这里先撞一遍再入库。 */
    const dup = eam.points.find((p) => p.tag3Id === drafted.tag3Id);
    if (dup)
      return done(config, false, `${drafted.tag3Id} 已挂在位号 ${dup.id} 下，同一个二级位号里不能有两个相同指标编码`);
    const row = upsertRow(eam.points, drafted);
    return done(config, true, `位号 ${tag} 已保存，未配阈值前不产报警`, row);
  },
  "post /eam/point/remove": removeById(() => eam.points, "点位已删除"),
  "post /eam/alarmRule/save": saveRow(
    () => eam.alarmRules,
    (d) => nextRuleId(d.pointId ?? ""),
    "报警规则已保存",
    (row) => {
      /* 三级阈值必须递增，否则分级判定倒挂（85℃ 判成「预警」、95℃ 判成「报警」）。
       倒挂的规则直接停用并回明原因，比静默收下更像一个负责的系统。 */
      if (!(row.warn < row.alarm && row.alarm < row.trip)) row.enabled = false;
    },
  ),
  "post /eam/alarmRule/remove": removeById(() => eam.alarmRules, "规则已删除"),
  "post /eam/inspection/submit": (config) => {
    const b = body(config);
    const verdict: InspectionTask["result"] = b.result === "异常" ? "异常" : "正常";
    const t = submitInspection(String(b.id), verdict, String(b.note ?? ""), String(b.by ?? "李强"));
    return byId(config, t, verdict === "异常" ? "点检异常已上报并生成报警" : "点检结果已录入");
  },

  /* ── 设备台账与技术文档（AE）───────────────────────────────────────── */
  "post /eam/equipment/save": saveRow(
    () => eam.equipments,
    (d) => nextEquipmentId(d.lineId ?? ""),
    "设备主数据已保存",
  ),
  "post /eam/doc/save": saveRow(
    () => eam.docs,
    () => nextSeqId("DOC", eam.docs, 3),
    "文档已登记",
  ),
  "post /eam/doc/remove": removeById(() => eam.docs, "文档已删除"),

  /* ── 安全合规（AC）─────────────────────────────────────────────────── */
  "post /eam/workPermit/create": (config) => {
    const b = body(config);
    if (!b.eqId || !b.workContent) return done(config, false, "设备与作业内容不能为空");
    const p = upsertRow(eam.workPermits, {
      ...b,
      id: nextSeqId("WP", eam.workPermits, 3),
      status: "申请" satisfies WorkPermit["status"],
      approvedBy: [{ node: "申请", by: String(b.applicant ?? "张伟"), at: nowStamp() }],
    } as Partial<WorkPermit>);
    return done(config, true, `作业票 ${p.id} 已提交，等待班组审批`, p);
  },
  "post /eam/workPermit/approve": (config) => {
    const b = body(config);
    const pass = b.pass !== false;
    return byId(
      config,
      approvePermit(String(b.id), pass, String(b.by ?? "安环部 何敏")),
      pass ? "审批通过" : "作业票已驳回",
    );
  },
  "post /eam/workPermit/start": idAction(startPermit, "作业已开始"),
  "post /eam/workPermit/close": idAction(closePermit, "作业已关闭、票面归档"),
  "post /eam/hazard/create": (config) => {
    const b = body(config);
    if (!b.title) return done(config, false, "隐患描述不能为空");
    const h = upsertRow(eam.hazards, {
      ...b,
      id: nextSeqId("HZ", eam.hazards, 3),
      status: "待整改" satisfies Hazard["status"],
      reportedAt: DEMO_TODAY,
    } as Partial<Hazard>);
    return done(config, true, `隐患 ${h.id} 已上报，责任人 ${h.owner || "待指派"}`, h);
  },
  "post /eam/hazard/rectify": (config) => {
    const b = body(config);
    return byId(
      config,
      rectifyHazard(String(b.id), String(b.measure ?? ""), b.by ? String(b.by) : undefined),
      "整改措施已提交，等待验收",
    );
  },
  "post /eam/hazard/accept": idAction(acceptHazard, "隐患已验收闭环"),
  "post /eam/special/save": saveRow(
    () => eam.specialEquipments,
    () => nextSeqId("SE", eam.specialEquipments, 3),
    "特种设备已登记",
  ),
  "post /eam/special/inspect": (config) => {
    const b = body(config);
    return byId(
      config,
      inspectSpecial(String(b.id), String(b.nextInspectAt ?? "")),
      "检验已登记，下次到期日与预警随之更新",
    );
  },
  "post /eam/metering/verify": (config) => {
    const b = body(config);
    return byId(
      config,
      verifyMetering(String(b.id), String(b.nextVerifyAt ?? ""), b.certNo ? String(b.certNo) : undefined),
      "检定完成，证书与下次检定日已更新",
    );
  },

  /* ── 集成（AG0001）─────────────────────────────────────────────────── */
  "post /eam/integration/sync": idAction(syncIntegration, "同步任务已执行"),

  /* ── 演示数据推进：把「设备在转、寿命在耗」这件事做成可点的按钮 ─────── */
  "post /eam/monitor/runHours": (config) => {
    const b = body(config);
    const r = tickRunHours(String(b.eqId), Number(b.hours) || 0);
    return done(
      config,
      true,
      r.alarmed.length
        ? `运行小时已推进，触发 ${r.alarmed.length} 条寿命到期提醒（${r.alarmed.join("、")}）`
        : "运行小时已推进，寿命台账与 PM 计数器同步更新",
      r,
    );
  },
  /**
   * 实时监控「推进一拍」：按 `SIM_PARAM` 给该设备的每个测点写一个新值，
   * 越阈就顺路产警（产警/去重逻辑只有 `pushSample` 一处）。
   *
   * **回的是这一拍之后的完整视图**，不是 `null`：页面的定时器每 500ms 一拍，
   * 如果这里只回成功、页面还得再 GET 一次 `/monitor/realtime` 才看到曲线，
   * 一拍就是两个请求。曲线要动的页面，请求数直接决定它卡不卡。
   */
  "post /eam/monitor/tick": (config) => {
    const b = body(config);
    const eqId = String(b.eqId);
    for (const p of eam.points) {
      if (p.eqId !== eqId) continue;
      /* 通讯状态不是「在线」就不喂数：采集服务读不到值自然不写库，实时页那条曲线会自己停住。
         给一个「显示离线、曲线照跳」的点，等于把这一列变成装饰。 */
      if (p.commState !== "在线") continue;
      const [center, half] = simParam(p);
      pushSample(p.id, Number((center + (Math.random() * 2 - 1) * half).toFixed(Math.abs(center) < 10 ? 1 : 0)));
    }
    return ok(config, realtimeView(eqId));
  },
  /**
   * 主线剧本第 3 幕：把 F4 电机轴承温度从 61℃ 推到 88℃。
   *
   * 步进游标放在模块级、**不放页面**：销售现场点一下按钮就跑完整段爬升，
   * 页面刷新/换人接手都不该让曲线从中间开始跳。跑到 `to` 之后自动归零，可反复演示。
   */
  "post /eam/monitor/script": (config) => {
    scriptStep += 1;
    const { from, to, steps, pointId } = SIM_SCRIPT_F4;
    const k = Math.min(scriptStep, steps);
    const value = Number((from + ((to - from) * k) / steps).toFixed(1));
    const alarm = pushSample(pointId, value);
    if (scriptStep >= steps) scriptStep = 0;
    return ok(config, { done: k >= steps, step: k, value, alarm });
  },

  /* ── 通用导出：链路照走、不落文件（演示不真生成电子表格）───────────── */
  "post /eam/export": (config) => {
    const b = body(config);
    return done(config, true, "导出任务已提交", `${String(b.entity ?? "export")}-${DEMO_TODAY.replace(/-/g, "")}.xlsx`);
  },
};

/** 剧本爬升的当前步（见上面 `monitor/script` 的注释） */
let scriptStep = 0;

/** 节拍回给页面用：实时监控页的定时器读它，避免 500ms 这个数字散在各页 */
export const EAM_SIM_STEP_MS = SIM_STEP_MS;
