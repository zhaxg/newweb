import type { RouteMap } from "../admin/core";
import {
  checkTicket,
  commBreak,
  commFlap,
  commRestore,
  ems,
  fillTicket,
  genQualityIssues,
  liveReadings,
  moveUnit,
  pointHistory,
  removeChannel,
  removeMedium,
  removeMeterPoint,
  removeRow,
  saveAlarmRule,
  saveChannel,
  saveInstrument,
  saveMedium,
  saveMeterPoint,
  savePriceTemplate,
  saveUnit,
  scanVerifyDeadlines,
  toggleIn,
  toggleInstrumentFault,
  togglePriceTemplate,
  tickRealtime,
  verifyInstrument,
  voidTicket,
} from "./store";
import { postHandler } from "./query";
import type { ActionResult, PointHistoryResult, PointReading } from "@/api/energy/types";

/**
 * 能源域的写端点。
 *
 * 两条贯穿全文件的约定：
 * 1. **业务拒绝不走 HTTP 错误**：删除有定额的介质、结算已定稿后重算实绩，回的都是
 *    `HTTP 200 + {ok:false, msg}`。真实后端就是这么发的（`src/api/_core/request.ts` 的
 *    拦截层只处理传输与认证错误），mock 若图省事发 4xx，页面就会在演示环境正常、
 *    接真后端时把拒绝当成异常弹红色堆栈——本仓已因这类"mock 太像真"踩过一次（AGENTS §6）。
 * 2. **成功回 `data: 受影响的行`**，页面拿到就能就地更新那一行，不必重查整页。
 *    配置页的编辑弹窗全靠这个把改动立刻显示出来。
 *
 * `removeRow` 这类通用助手不在这儿做二次校验：校验住在 store（它才知道有没有定额挂在身上）。
 */
export const energyActionRoutes: RouteMap = {
  /* ── 介质 ─────────────────────────────────────────────────────────── */
  "post /ems/medium/save": postHandler((b) => saveMedium(b)),
  "post /ems/medium/remove": postHandler((b) => removeMedium(String(b.id))),

  /* ── 用能单元 ─────────────────────────────────────────────────────── */
  "post /ems/unit/save": postHandler((b) => saveUnit(b)),
  "post /ems/unit/move": postHandler((b) => moveUnit(String(b.id), (b.dir ?? "up") as "up" | "down" | "in" | "out")),

  /* ── 报警规则 ─────────────────────────────────────────────────────── */
  "post /ems/alarmRule/save": postHandler((b) => saveAlarmRule(b)),
  "post /ems/alarmRule/toggle": postHandler((b) => toggleIn(ems.alarmRules, String(b.id))),
  "post /ems/alarmRule/remove": postHandler((b) => {
    const hit = ems.alarmRules.find((r) => r.id === b.id);
    return removeRow(ems.alarmRules, String(b.id))
      ? { ok: true, msg: `${hit?.name ?? b.id} 已删除` }
      : { ok: false, msg: "规则不存在" };
  }),

  /* ── 电价模板 ─────────────────────────────────────────────────────── */
  "post /ems/priceTemplate/save": postHandler((b) => savePriceTemplate(b)),
  "post /ems/priceTemplate/toggle": postHandler((b) => togglePriceTemplate(String(b.id))),

  /* ── EC0001 计量点 ────────────────────────────────────────────────── */
  "post /ems/meterPoint/save": postHandler((b) => saveMeterPoint(b)),
  "post /ems/meterPoint/remove": postHandler((b) => removeMeterPoint(String(b.id))),

  /* ── EC0002 采集通道 ──────────────────────────────────────────────── */
  "post /ems/channel/save": postHandler((b) => saveChannel(b)),
  "post /ems/channel/remove": postHandler((b) => removeChannel(String(b.id))),
  /**
   * 三个"后果"按钮。`break` 是全链路的引信：置离线 → 挂点读数变空 →
   * 该元组的实绩置缺失 → 发级别3「通讯中断」报警 → 待补传条数随 tick 累积。
   * `restore` 是把这条链整个倒着走一遍（回填缺失实绩 + 关报警），
   * 所以**必须**成对出现：只给中断不给复归，页面上就留下一个演示无法收拾的残局。
   */
  "post /ems/channel/break": postHandler((b) => commBreak(String(b.id))),
  "post /ems/channel/flap": postHandler((b) => commFlap(String(b.id))),
  "post /ems/channel/restore": postHandler(() => commRestore()),

  /* ── EC0004 仪表台账 ──────────────────────────────────────────────── */
  "post /ems/instrument/save": postHandler((b) => saveInstrument(b)),
  /** 下次检定日可省——省略即按台账的强检周期推算（周期口径只允许住在 EC0004 一处） */
  "post /ems/instrument/verify": postHandler((b) =>
    verifyInstrument(String(b.id), b.nextVerifyAt ? String(b.nextVerifyAt) : undefined),
  ),
  "post /ems/instrument/fault": postHandler((b) => toggleInstrumentFault(String(b.id))),
  /**
   * 重扫检定有效期。装配时已经扫过一轮（`index.ts`），这里的价值是**演示节奏**：
   * 讲完台账当场点一下，回 EM0005 就能看到那条级别 4 的超期报警。
   * 幂等由 `scanVerifyDeadlines` 自己兜——同点同级的未关闭报警不重复发。
   */
  "post /ems/instrument/scan": postHandler(() => scanVerifyDeadlines()),

  /* ── EC0003 数据质量工单 ──────────────────────────────────────────── */
  "post /ems/quality/gen": postHandler((b) => genQualityIssues(b.date ? String(b.date) : undefined)),
  /** 补录值空串 = 用建议值（页面把 `suggestValue` 直接填进表单，改不改都由这里兜住） */
  "post /ems/quality/fill": postHandler((b) =>
    fillTicket(String(b.id), b.value === undefined || b.value === "" ? undefined : Number(b.value)),
  ),
  "post /ems/quality/check": postHandler((b) => checkTicket(String(b.id))),
  "post /ems/quality/void": postHandler((b) => voidTicket(String(b.id), b.reason ? String(b.reason) : "")),

  /* ── EC0005 实时读数与历史曲线 ────────────────────────────────────── */
  /**
   * 三个端点分两种角色：`tick` 是**唯一有副作用**的（推柜位均值回归、走负荷、跑剧本、越红线发报警），
   * `realtime`/`history` 只读、**零落库**——读数按当小时负荷系数推，历史按 `M.daySplit` 摊。
   * 一旦把读数存成字段，tick 与人工校正就会各写一份，曲线和 EP0002 立刻分家。
   *
   * 为什么不把 tick 合进 realtime：合了就是任何"只想看一眼"的调用都在偷偷推全站时钟，
   * EP0002 的"当日"会在客户眼皮底下变成第二天。**月账层本来就不受 tick 影响**，这里只动实时层。
   *
   * `pointIds` 为空 = 全量读数（EC0005 的表格模式要「一眼看全厂哪些点断了」）。
   * 读取两个端点返回**数据本身**而不是 `ActionResult`：这不是动作，没有 ok/msg 可说。
   */
  "post /ems/point/tick": postHandler(() => tickRealtime()),
  "post /ems/point/realtime": postHandler((b): PointReading[] => liveReadings((b.pointIds ?? []) as string[])),
  "post /ems/point/history": postHandler((b): PointHistoryResult =>
    pointHistory((b.pointIds ?? []) as string[], Number(b.days) || undefined),
  ),

  /* ── 导出（模拟）─────────────────────────────────────────────────── */
  /**
   * 只回一个**文件名**，不落盘、不生成内容。
   *
   * 为什么不回 `null`：toast 念出「能耗实绩_2026-09.csv 已提交导出队列」才像一件真发生过的操作，
   * 「操作成功」四个字客户一眼就划过去了。文件名里的中文表头与页面标题同一批措辞（见下）。
   *
   * 真接后端时这个端点换成回下载链接，页面零改动——所以它现在**必须**留着，
   * 而不是在页面上直接 `new Blob()` 拼 CSV（那会把导出这件事做进前端，接口形状就丢了）。
   *
   * 表名与页面标题措辞一致是刻意的（toast 里念出来的名字和客户刚看到的表头对不上，
   * 就是本域唯一红线意义上的"页间矛盾"），但这里**不 import 页面**：mock 在平台层，
   * 反向依赖 `src/pages` 会让 mock 跟着页面一起进业务 chunk。
   */
  "post /ems/export": postHandler((b): ActionResult => {
    const name = EXPORT_NAMES[String(b.entity ?? "")] ?? String(b.entity ?? "数据");
    const month = b.month ? `_${b.month}` : b.date ? `_${b.date}` : "";
    return { ok: true, msg: `${name}${month}.csv 已提交导出队列` };
  }),
};

/**
 * 导出实体 → 文件名。
 *
 * 键就是页面送出的 `entity`：**一页一表**时是页面代号（`spec.code`），
 * 一页两表的 EG0003 由右表用 `spec.exportEntity` 给出自己的表名。
 * 加新页面时往这里补一行——漏了不会坏，文件名会退化成 `EP0002_2026-09.csv`（能读，就是不中文）。
 */
const EXPORT_NAMES: Record<string, string> = {
  EG0001: "能源介质配置",
  EG0002: "用能单元",
  EG0003: "报警规则",
  priceTemplate: "分时电价模板",
  EC0001: "计量网络",
  EC0002: "采集通道",
  EC0003: "数据质量工单",
  EC0004: "计量仪表台账",
  EC0005: "计量点历史数据",
};
