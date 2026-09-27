import type { ICellRendererParams } from "ag-grid-community";

/**
 * 表格单元格的**语汇表**：状态色标与数值格式化（能源域自带一份，不跨域 import）。
 *
 * 为什么是一张**扁平的全域词表**而不是每页一张：本域的状态词跨页面复用
 * （「执行中」既是调度令也是计划；「活动」在报警中心、大屏、驾驶舱待办里是同一件事）。
 * 逐页各配一份 map 的结果是同一个词在两页里一个红一个灰——客户会当成系统两处数据不一致。
 * 一种状态一个颜色、全站一致，才是演示系统该有的样子。真要区分语义相近的词，
 * 在列上写 `cellRenderer: tagRenderer(自己的小 map, TAG_CLASS)` 局部覆盖即可（第一参数优先）。
 *
 * 颜色用 Tailwind 色板而不是设计 token：token 层只有一档语义绿，
 * 而这里需要绿/蓝/琥珀/红/灰五档状态色，凑一个语义色系反而是给 token 层硬造需求。
 * 深色档一起给——本域列表页在浅色外壳里，监控页又整片固定深色（见 `emsTheme.ts`），两边都要成立。
 *
 * ⚠️ **介质专色不走这张表**：介质色是数据，唯一真源是 mock `data/model.ts` 的
 * `MEDIUMS[code].color`，页面直接读行里的值上色。往这里抄一份就是两处在管同一件事。
 */

const OK = "text-emerald-600 bg-emerald-500/12 dark:text-emerald-400";
const INFO = "text-sky-600 bg-sky-500/12 dark:text-sky-400";
const WARN = "text-amber-600 bg-amber-500/14 dark:text-amber-400";
const BAD = "text-red-600 bg-red-500/12 dark:text-red-400";
const MUTE = "text-muted-foreground bg-muted";

export const TAG_CLASS: Record<string, string> = {
  /* 报警四态（energy.md B2.1）：活动要人处理、确认/转令是走通、关闭是终结 */
  活动: WARN,
  已确认: INFO,
  已转调度令: INFO,
  已关闭: MUTE,
  /* 调度令五态（B2.2）：草拟未生效、下达/执行中在途、完成是结果、回执归档 */
  草拟: MUTE,
  已下达: INFO,
  执行中: INFO,
  已完成: OK,
  已回执: MUTE,
  /* 计划五态（B2.3）：已提交等的是批（和「待补录」同理给 warn），批准即生效 */
  编制中: INFO,
  已提交: WARN,
  已批准: OK,
  已归档: MUTE,
  /* 质量工单四态（B2.4） */
  待补录: WARN,
  已补录: INFO,
  已校核: OK,
  作废: MUTE,
  /* 结算三态（B2.5）：核对后还没定稿，仍是「要人再看一眼」的中间态，所以给 amber 而不是绿 */
  已生成: INFO,
  已核对: WARN,
  已定稿: OK,
  /* 采集通道三态 */
  在线: OK,
  通讯异常: WARN,
  离线: BAD,
  /* 仪表四态与报警类型（EM0005 的类型列也吃这张表；「数据异常」与状态词「异常」同色是应该的） */
  正常: OK,
  临期: WARN,
  超期: BAD,
  故障: BAD,
  越限: WARN,
  柜位高危: BAD,
  允许放散: BAD,
  需量超限: WARN,
  通讯中断: BAD,
  数据异常: BAD,
  质量超标: WARN,
  /* 电价分时段：尖峰最贵所以最刺眼，谷最优 */
  尖峰: BAD,
  峰: WARN,
  平: INFO,
  谷: OK,
  /* 能效等级（EP0006）：等级不是好坏，但 1级/落后 确实有方向 */
  "1级": OK,
  "2级": INFO,
  "3级": WARN,
  落后: BAD,
  /* 报表模板 */
  已发布: OK,
  草稿: MUTE,
  /* 流向七向：颜色只为**辨识**不为好坏——平衡表的方向列五个同色就没法读，
     买入蓝/自产绿/消耗琥珀/回收灰/外供红，成对出现的词（消耗 vs 外供）颜色必须拉开。
     「转换」（混合煤气掺混）与「损失」（管损放散）是平衡表专用向，见 `api/energy/types.ts` 的 `FlowDirection`：
     转换是**工艺行为**、损失是**要去治的问题**，所以一个紫一个橙，都不与已有的五档撞色 */
  购入: INFO,
  自产: OK,
  转换: "text-violet-600 bg-violet-500/12 dark:text-violet-400",
  消耗: WARN,
  回收: MUTE,
  损失: "text-orange-600 bg-orange-500/14 dark:text-orange-400",
  外供: BAD,
  /* 柜位状态（B3 防爆散双条款）：**高与低都是红色**——空柜和低柜同样是事故，
     参照物里「低」是中性灰，那是「低优先级」的语义；本域的「低」是柜位过低，语义不同、色也必须不同 */
  高: BAD,
  低: BAD,
  /* 报警五级（`AlarmLevel` 注释的那批词：1事故 2重大 3一般 4提示 5告知）。
     列表与大屏把 level 数字翻成中文词后都走这里——**一页一个颜色**就是这么来的 */
  事故: BAD,
  重大: BAD,
  一般: WARN,
  提示: INFO,
  告知: MUTE,
  /* 通用兜底词 */
  启用: OK,
  停用: MUTE,
  生效: OK,
  异常: BAD,
};

/**
 * 报警五级中文措辞（`AlarmLevel` 注释的那批词）。
 *
 * 措辞住在**展示层**、和上面那五个色标键挨在一起，是因为这两半必须同步：
 * 加一个级别而忘了配色，那一级的行就会静默变灰（查不到词表回中性），
 * 五级失去意义这种错在页面上看起来像「数据本来就这样」。
 * 真源在此，EG0003 / EM0005 / 大屏都从这里取，不再各写一份 `LEVEL_TEXT`。
 */
export const ALARM_LEVEL_NAME: Record<string, string> = { 1: "事故", 2: "重大", 3: "一般", 4: "提示", 5: "告知" };

/** 标签底色 + 前缀点：不加边框，密集表格里边框会把行高撑开 */
const TAG_BASE =
  "inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap overflow-hidden";

/**
 * 状态词 → 色标 class。AG Grid 的 `tagRenderer` 与**手绘表格**（EC0005 的实时读数表就不是
 * AG Grid，它是一张要跟着 3s 心跳重画的表）都调这一个函数：色标的圆角、内距、字号只在这里
 * 定义一次，两处画出来的才是同一个标签。查不到词表回中性——**不隐藏、不变红**，
 * 新增状态词时页面照常出数据，只是暂时没配色，比漏渲染一行好排查。
 */
export function tagClass(word: string, local: Record<string, string> = {}, base: Record<string, string> = TAG_CLASS) {
  return `${TAG_BASE} ${local[word] ?? base[word] ?? MUTE}`;
}

/**
 * 状态列的 cellRenderer：把单元格文案画成色标。
 *
 * 用 DOM 构造而不是 Vue 组件（同 `rowActions.actionRenderer`，理由见那里）。
 *
 * 上色读的是 `valueFormatted`（列上同时给了 `valueFormatter` 时）而不是原始值：
 * 报警 `level` 行里存的是数字 1~5，先由 formatter 翻成「事故/重大/…」再查色，
 * 只读 `value` 的话翻译表翻好了、色标还在按数字查词（查不到 → 全灰，五级失去意义）。
 */
export function tagRenderer(local: Record<string, string> = {}, base: Record<string, string> = TAG_CLASS) {
  return (p: ICellRendererParams): HTMLElement => {
    const v = p.valueFormatted ?? p.value;
    const text = v === null || v === undefined || v === "" ? "—" : String(v);
    const wrap = document.createElement("span");
    wrap.className = tagClass(text, local, base);
    wrap.textContent = text;
    return wrap;
  };
}

/** 布尔列 → 是/否色标（`isSettlement`、`forcedVerify`、`enabled`、`powerFactorAdj`） */
export function boolRenderer(on = "是", off = "否") {
  return (p: ICellRendererParams): HTMLElement => {
    const truthy = p.value === true || p.value === "true" || p.value === 1;
    const wrap = document.createElement("span");
    wrap.className = `${TAG_BASE} ${truthy ? OK : MUTE}`;
    wrap.textContent = truthy ? on : off;
    return wrap;
  };
}

/**
 * 占用率/负荷率条：`valueGetter` 给 0-1 的比值，颜色按占用度分档（越高越坏）。
 *
 * 为什么要条而不是一个百分数：客户要的是「一眼看出哪几项快顶到线」。
 * 数字要逐行读，条不用——变压器负载率、管网压力占用都是这个逻辑。
 */
export function ratioBarRenderer() {
  return (p: ICellRendererParams): HTMLElement => {
    const ratio = Number(p.value) || 0;
    const pct = Math.min(100, Math.round(ratio * 100));
    const color = ratio >= 1 ? "bg-red-500" : ratio >= 0.9 ? "bg-amber-500" : "bg-emerald-500";
    const wrap = document.createElement("div");
    wrap.className = "flex h-full min-w-24 items-center gap-2";
    const track = document.createElement("div");
    track.className = "h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-muted";
    const fill = document.createElement("div");
    fill.className = `h-full ${color}`;
    fill.style.width = `${pct}%`;
    track.appendChild(fill);
    const label = document.createElement("span");
    label.className = "w-10 shrink-0 text-right text-xs tabular-nums";
    label.textContent = `${pct}%`;
    wrap.appendChild(track);
    wrap.appendChild(label);
    return wrap;
  };
}

/**
 * 煤气柜位条（EM0002/EM0007 柜列表）：单元格值 0-100 的柜位百分比。
 *
 * 为什么不复用 `ratioBarRenderer`：那个的语义是「越满越坏」，柜位是**双端危险**——
 * 规格书 B3 的防爆散双条款：高位触顶要放散（≥90 红、接近高线 85 起 amber），
 * 但空柜同样是事故（≤低限直接红），中间才是绿。单端分档的渲染器表达不了这条。
 * 高低红线位置从**行数据** `hiLimit`/`loLimit` 读（`GasHolder` 契约里就有），
 * 读不到回 90/15——红线画出来，客户不用 hover 也知道「离放散还有多远」。
 */
export function levelBarRenderer() {
  return (p: ICellRendererParams): HTMLElement => {
    const v = Number(p.value) || 0;
    const hi = Number(p.data?.hiLimit ?? 90);
    const lo = Number(p.data?.loLimit ?? 15);
    const color = v >= hi || v <= lo ? "bg-red-500" : v >= hi - 5 ? "bg-amber-500" : "bg-emerald-500";
    const wrap = document.createElement("div");
    wrap.className = "flex h-full min-w-28 items-center gap-2";
    const track = document.createElement("div");
    track.className = "relative h-1.5 min-w-14 flex-1 overflow-hidden rounded-full bg-muted";
    const fill = document.createElement("div");
    fill.className = `h-full ${color}`;
    fill.style.width = `${Math.max(0, Math.min(100, v))}%`;
    track.appendChild(fill);
    for (const limit of [lo, hi]) {
      const mark = document.createElement("div");
      mark.className = "absolute top-0 h-full w-px bg-red-500/70";
      mark.style.left = `${Math.max(0, Math.min(100, limit))}%`;
      track.appendChild(mark);
    }
    const label = document.createElement("span");
    label.className = "w-10 shrink-0 text-right text-xs tabular-nums";
    label.textContent = `${v}%`;
    wrap.appendChild(track);
    wrap.appendChild(label);
    return wrap;
  };
}

/* ── valueFormatter ───────────────────────────────────────────────────── */

/** 千分位；`digits` 默认 0（块/点/条这类计数不需要小数） */
export function numFmt(digits = 0) {
  return (p: { value: unknown }) =>
    p.value === null || p.value === undefined || p.value === ""
      ? "—"
      : Number(p.value).toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * 折标煤：两位小数千分位。kgce/tce 两档单位列共用——
 * 定额与系数量纲都只给到两位小数，多打位数是假精度，少打位数额对不上时说不清。
 */
export function stdCoalFmt(p: { value: unknown }) {
  const v = Number(p.value);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 实物量：按量级自适应位数——≥1 万折成「万」保留两位，其余千分位最多两位。
 *
 * 为什么自适应而不是固定位数：煤气瞬时量是几万方/h、水表累计是几百，
 * 同一张表固定位数要么大数挤成逗号墙、要么小数全是无意义的 .00。
 * 「万」的换算只动展示、不动行里的数值，导出走原始值。
 */
export function qtyFmt(p: { value: unknown }) {
  const v = Number(p.value);
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 10000) {
    return `${(v / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}万`;
  }
  return v.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

/** 金额（元）：千分位 + 两位小数，结算单要核对到分 */
export function moneyFmt(p: { value: unknown }) {
  const v = Number(p.value);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 比值 → 百分比（0.42 → 42%） */
export function pctFmt(digits = 0) {
  return (p: { value: unknown }) => {
    const v = Number(p.value);
    return Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : "—";
  };
}

/** 带单位的数值（`4000 m³/h`、`30 天`）；空值给破折号而不是 `undefined m³` */
export function unitFmt(unit: string, digits = 0) {
  return (p: { value: unknown }) => {
    const v = Number(p.value);
    return Number.isFinite(v) ? `${v.toLocaleString("zh-CN", { maximumFractionDigits: digits })}${unit}` : "—";
  };
}

/**
 * 编码 → 名称的格式化器（`nameMaps` 的 `unitMap`/`mediumMap` 这类 id→名 表）。
 *
 * 为什么需要它：列表端点回的是**外键本身**（`Quota.unitId`、`MediaCode`），
 * 客户读的是「7#高炉 / 高炉煤气」。翻译在展示层做一次（不进 mock 字段冗余，
 * 否则 mock 变成按页面长相定制的假数据）。
 *
 * **取不到回编码本身、不回破折号**：漏配名称时看到 `EU-0301` 能立刻定位，
 * 显示成「—」会让人以为这行本来就没值——两者排查成本差一个量级。
 */
export function codeFmt(map: Record<string, string>) {
  return (p: { value: unknown }) => {
    if (p.value === null || p.value === undefined || p.value === "") return "—";
    const s = String(p.value);
    return map[s] ?? s;
  };
}

/** 空值兜底成破折号（时间戳、可选项文本这类没值比空着好读） */
export function dashFmt(p: { value: unknown }) {
  return p.value === null || p.value === undefined || p.value === "" ? "—" : String(p.value);
}

/** 日期串 `YYYY-MM-DD HH:mm:ss` → 只留日期（实绩日期列常够，省列宽） */
export function dayFmt(p: { value: unknown }) {
  return p.value ? String(p.value).slice(0, 10) : "—";
}

/** 用能单元层级：`3` → 「3 级」，配 1/2/3/4 这种小整数列（直接显示光秃秃的数字读不出语义） */
export function levelFmt(p: { value: unknown }) {
  const v = Number(p.value);
  return Number.isFinite(v) && v > 0 ? `${v} 级` : "—";
}

/**
 * 介质编码数组 → 中文介质名（`["BFG","O2"]` → 「高炉煤气、氧气」）。
 *
 * 名称从 `nameMaps` 的模块级缓存来（那是一次 `GET /ems/medium/list`），
 * 所以 AG Grid 的 valueFormatter **要在名称到货后重查一次列表**才会翻成中文——
 * `ListPage` 暴露了 `reload()`，页面在 `useNameMaps().ready` 上挂一次即可，
 * 没挂会退化成显示编码（可读、但客户要看的是名字）。
 */
export function mediaCodesFmt(names: Record<string, string>) {
  return (p: { value: unknown }) => {
    const v = p.value;
    if (!Array.isArray(v) || !v.length) return "—";
    return v.map((c) => names[String(c)] ?? String(c)).join("、");
  };
}
