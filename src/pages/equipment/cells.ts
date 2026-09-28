import type { ICellRendererParams } from "ag-grid-community";

/**
 * 表格单元格的**语汇表**：状态色标与数值格式化。
 *
 * 为什么是一张**扁平的全域词表**而不是每列一张：本域的状态词跨页面复用
 * （「超期」同时出现在寿命台账、报警中心和驾驶舱待办；「已关闭」既是工单也是报警）。
 * 逐页各配一份 map 的结果是同一个词在两页里一个红一个灰——客户会当成系统两处数据不一致。
 * 一种状态一个颜色、全站一致，才是演示系统该有的样子。真要区分语义相近的词，
 * 在列上写 `cellRenderer: tagRenderer(自己的小 map, TAG_CLASS)` 局部覆盖即可（第一参数优先）。
 *
 * 颜色用 Tailwind 色板而不是设计 token：token 层只有 `--success` 一档绿，
 * 而这里需要绿/蓝/琥珀/红/灰五档状态色，凑一个语义色系反而是给 token 层硬造需求。
 * 深色档一起给，因为驾驶舱和列表页都会切深色主题。
 */

const OK = "text-emerald-600 bg-emerald-500/12 dark:text-emerald-400";
const INFO = "text-sky-600 bg-sky-500/12 dark:text-sky-400";
const WARN = "text-amber-600 bg-amber-500/14 dark:text-amber-400";
const BAD = "text-red-600 bg-red-500/12 dark:text-red-400";
const MUTE = "text-muted-foreground bg-muted";

export const TAG_CLASS: Record<string, string> = {
  /* 正向：设备在转、账实相符、流程走通 */
  运行: OK,
  正常: OK,
  合格: OK,
  成功: OK,
  达标: OK,
  在库: OK,
  在用: OK,
  已闭环: OK,
  已到货: OK,
  /* 进行中 */
  备用: INFO,
  在线: INFO,
  执行中: INFO,
  已派工: INFO,
  已确认: INFO,
  已请购: INFO,
  已签发: INFO,
  整改中: INFO,
  维修: INFO,
  借出: INFO,
  领用: INFO,
  在线监测: INFO,
  /* 等待处理 / 预警：都需要人去看一眼，但不算事故 */
  待派工: WARN,
  待检: WARN,
  待审核: WARN,
  待验收: WARN,
  待整改: WARN,
  临期: WARN,
  临检: WARN,
  预警: WARN,
  活动: WARN,
  超时: WARN,
  损坏: WARN,
  申请: WARN,
  班组审批: WARN,
  安全部门审批: WARN,
  厂级审批: WARN,
  作业中: WARN,
  较大: WARN,
  人工点检: WARN,
  /* 负向：停机、越线、法务红线 */
  故障停机: BAD,
  报废: BAD,
  超期: BAD,
  报警: BAD,
  紧急: BAD,
  重大: BAD,
  异常: BAD,
  失败: BAD,
  高: BAD,
  /* 中性 / 已终结 */
  已关闭: MUTE,
  已更换: MUTE,
  已折算: MUTE,
  出库: MUTE,
  归还: MUTE,
  调拨: MUTE,
  盘点: MUTE,
  人工: MUTE,
  未启用: MUTE,
  停用: MUTE,
  一般: MUTE,
  低: MUTE,
  入厂: MUTE,
  /* 分级不是好坏，给三种可辨的冷/暖色 */
  A: INFO,
  B: WARN,
  C: MUTE,
};

/** 标签底色 + 前缀点：不加边框，密集表格里边框会把行高撑开 */
const TAG_BASE =
  "inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap overflow-hidden";

/**
 * 状态列的 cellRenderer：把单元格文案画成色标。
 *
 * 用 DOM 构造而不是 Vue 组件（同 `rowActions.actionRenderer`，理由见那里）。
 * 取不到词表的值原样显示为中性色——**不隐藏、不变红**：新增一个状态词时
 * 页面照常出数据，只是暂时没配色，比漏渲染一行好排查。
 */
export function tagRenderer(local: Record<string, string> = {}, base: Record<string, string> = TAG_CLASS) {
  return (p: ICellRendererParams): HTMLElement => {
    const text = p.value === null || p.value === undefined || p.value === "" ? "—" : String(p.value);
    const wrap = document.createElement("span");
    wrap.className = `${TAG_BASE} ${local[text] ?? base[text] ?? MUTE}`;
    wrap.textContent = text;
    return wrap;
  };
}

/** 布尔列 → 是/否色标（`lifeManaged`、`enabled`、`mandatoryVerify`） */
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
 * 寿命/额度占用率条：`valueGetter` 给 0-1 的比值，颜色按占用度分档。
 *
 * 为什么要条而不是一个百分数：客户要的是「一眼看出哪几件快到期」。
 * 数字要逐行读，条不用——排行榜、寿命台账、健康度三处都是这个逻辑。
 * 阈值和 mock 的 `refreshLifeStatus` 对齐（≥90% 临期、≥100% 超期）。
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
 * 健康度条：单元格值 0-100，画成色块条 + 数字。
 *
 * 为什么不复用 `ratioBarRenderer`：那个是**占用率**（寿命、额度——越高越坏），
 * 健康度语义正好相反（越高越好）。两个语义凑一个渲染器，必然有一处的颜色是反的。
 * 阈值 <60 红 / <80 黄 与健康看板、H5 档案页同一口径（`store` 里 `bumpHealth` 也按这条线走）。
 */
export function healthBarRenderer() {
  return (p: ICellRendererParams): HTMLElement => {
    const v = Number(p.value) || 0;
    const color = v < 60 ? "bg-red-500" : v < 80 ? "bg-amber-500" : "bg-emerald-500";
    const wrap = document.createElement("div");
    wrap.className = "flex h-full min-w-24 items-center gap-2";
    const track = document.createElement("div");
    track.className = "h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-muted";
    const fill = document.createElement("div");
    fill.className = `h-full ${color}`;
    fill.style.width = `${Math.max(0, Math.min(100, v))}%`;
    track.appendChild(fill);
    const label = document.createElement("span");
    label.className = "w-8 shrink-0 text-right text-xs tabular-nums";
    label.textContent = String(v);
    wrap.appendChild(track);
    wrap.appendChild(label);
    return wrap;
  };
}

/* ── valueFormatter ───────────────────────────────────────────────────── */

/** 千分位；`digits` 默认 0（件/支/套这类计数不需要小数） */
export function numFmt(digits = 0) {
  return (p: { value: unknown }) =>
    p.value === null || p.value === undefined || p.value === ""
      ? "—"
      : Number(p.value).toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** 金额（元）：千分位 + 两位小数，结算与折算页要核对到分 */
export function moneyFmt(p: { value: unknown }) {
  const v = Number(p.value);
  if (!Number.isFinite(v)) return "—";
  // 负数（未达线处罚）标红交给色标列做，这里只管位数
  return v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 比值 → 百分比（0.42 → 42%） */
export function pctFmt(digits = 0) {
  return (p: { value: unknown }) => {
    const v = Number(p.value);
    return Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : "—";
  };
}

/** 带单位的数值（`8000 h`、`42 天`）；空值给破折号而不是 `undefined h` */
export function unitFmt(unit: string, digits = 0) {
  return (p: { value: unknown }) => {
    const v = Number(p.value);
    return Number.isFinite(v) ? `${v.toLocaleString("zh-CN", { maximumFractionDigits: digits })}${unit}` : "—";
  };
}

/** 空值兜底成破折号（时间戳、可选项文本这类没值比空着好读） */
export function dashFmt(p: { value: unknown }) {
  return p.value === null || p.value === undefined || p.value === "" ? "—" : String(p.value);
}

/** 日期串 `YYYY-MM-DD HH:mm:ss` → 只留日期（表格里日期列常够，省列宽） */
export function dayFmt(p: { value: unknown }) {
  return p.value ? String(p.value).slice(0, 10) : "—";
}
