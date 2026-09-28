import type { ICellRendererParams } from "ag-grid-community";

/**
 * 表格单元格的**语汇表**：状态色标与数值格式化（铁区MES 域自带一份，不跨域 import）。
 *
 * 为什么是一张**扁平的全域词表**而不是每页一张：本域的状态词跨工序复用——
 * 「执行中」既是配料计划也是月计划，「已完成」在推焦、出铁、月结里是同一件事，
 * 「合格」在烧结矿、球团矿、铁水里判定口径一致。逐页各配一份 map 的结果是
 * 同一个词在烧结页和高炉页一个绿一个灰，客户会当成系统两处数据不一致。
 * 一种状态一个颜色、全站一致，才是演示系统该有的样子。真要区分语义相近的词，
 * 在列上写 `cellRenderer: tagRenderer(自己的小 map, TAG_CLASS)` 局部覆盖即可（第一参数优先）。
 *
 * 颜色用 Tailwind 色板而不是设计 token：token 层只有一档语义绿，
 * 而这里需要绿/蓝/琥珀/红/灰五档状态色，凑一个语义色系反而是给 token 层硬造需求。
 * 深色档一起给——本域列表页在浅色外壳里，运行参数页与三张大屏又整片固定深色
 * （见 `tqTheme.ts`），两边都要成立。
 *
 * ⚠️ **工序区域色与料种色不走这张表**：前者是外壳色，住在 `tqTheme.ts`；
 * 后者是数据，唯一真源是 mock `data/model.ts`，页面直接读行里的值上色。
 * 往这里抄一份就是两处在管同一件事。
 *
 * ⚠️ 表里的词**必须与 `src/mock/mes4tq/store.ts` 各状态机实际写出的字面量逐字相同**。
 * 这份 mock 不做类型检查（`vue-tsc` 已退役、`oxlint` 不看类型），状态词写错不会报错，
 * 只会静默落进 `MUTE` 兜底——新增状态时两处一起改。
 */

const OK = "text-emerald-600 bg-emerald-500/12 dark:text-emerald-400";
const INFO = "text-sky-600 bg-sky-500/12 dark:text-sky-400";
const WARN = "text-amber-600 bg-amber-500/14 dark:text-amber-400";
const BAD = "text-red-600 bg-red-500/12 dark:text-red-400";
const MUTE = "text-muted-foreground bg-muted";

export const TAG_CLASS: Record<string, string> = {
  /* ── S1 计划状态机（TP0002 月生产计划）─────────────────────────────────
     草稿→已审核→已下达→执行中→已完成，执行异常可驳回。
     「已审核」等的是下达，仍是中间态给 INFO；「已下达」才进执行链 */
  草稿: MUTE,
  已审核: INFO,
  已下达: INFO,
  执行中: INFO,
  已完成: OK,
  驳回: BAD,

  /* ── S2 配料计划状态机（TB0001-TB0004）─────────────────────────────────
     与 S1 同形但多一个「调整」：执行中改配比会生成新版本 */
  调整: WARN,

  /* ── S3 质量批次状态机（TQ0002/TQ0003）─────────────────────────────────
     已创建→已取样→已制样→检验中→已判定→已报出，不合格可发起复检。
     「检验中」是等结果的中间态给 INFO；「已判定」才出结论 */
  已创建: MUTE,
  已取样: INFO,
  已制样: INFO,
  检验中: INFO,
  已判定: OK,
  已报出: OK,
  复检: WARN,

  /* ── S4 铁水罐状态机（TM0002）─────────────────────────────────────────
   **「重」不是坏、是满罐在途**，所以给 INFO 不给红；检修才是 BAD */
  空: MUTE,
  重: INFO,
  烘烤: WARN,
  检修: BAD,

  /* ── S5 出铁计划状态机（TM0001）─────────────────────────────────────── */
  计划: MUTE,
  出铁中: INFO,
  已取消: MUTE,

  /* ── S6 成本月结状态机（TC0002/TC0003）─────────────────────────────────
     数据收集中→计算中→已计算→已审核→已锁定，月末可调差。
     「已计算」还没人核过，给 WARN 而不是绿——和能源域结算三态同一条理由 */
  数据收集中: MUTE,
  计算中: INFO,
  已计算: WARN,
  已锁定: OK,
  已调差: WARN,

  /* ── 采集与接口（TI0001-TI0004）─────────────────────────────────────── */
  在线: OK,
  通讯异常: WARN,
  离线: BAD,
  成功: OK,
  失败: BAD,
  处理中: INFO,
  正常: OK,
  可疑: WARN,
  异常: BAD,
  超时: WARN,
  中断: BAD,

  /* ── 停机记录（TPP_1050，TW 各工序开停机页共用）─────────────────────────
     类型与原因是两张独立的字典（`C_TYPE` / `C_REASON`），颜色按「是不是计划内」分：
     计划停机是可预期的、异常停机是要追的 */
  计划停机: INFO,
  异常停机: BAD,
  其他: MUTE,
  内部原因: WARN,
  外部原因: INFO,
  有效: OK,
  作废: MUTE,

  /* ── 质量判定 ──────────────────────────────────────────────────────── */
  合格: OK,
  不合格: BAD,
  待判定: WARN,
  抽检: INFO,
  常规: MUTE,

  /* ── 物料与计量字典 ─────────────────────────────────────────────────── */
  原料: INFO,
  辅料: MUTE,
  燃料: WARN,
  产品: OK,
  副产品: MUTE,
  回收品: INFO,
  矿石: INFO,
  煤炭: MUTE,
  焦炭: WARN,
  熔剂: MUTE,
  实重: OK,
  理重: WARN,
  人工: WARN,
  采集: OK,
  调账: BAD,
  未记账: WARN,
  已记账: OK,

  /* ── 六道工序（TW 各页的工序列、TR 汇总、大屏图例共用）──────────────────
     颜色**只为辨识不为好坏**，所以六道工序各给一色，不与上面的语义色抢含义 */
  原料工序: INFO,
  焦化工序: WARN,
  球团工序: "text-violet-600 bg-violet-500/12 dark:text-violet-400",
  烧结工序: INFO,
  石灰工序: MUTE,
  高炉工序: "text-pink-600 bg-pink-500/12 dark:text-pink-400",

  /* ── 报警等级（TI0002 报警记录、TD 大屏报警条）────────────────────────
     与能源域同一批词同一批色：两个域的大屏并排挂在调度中心，报警色必须一致 */
  事故: BAD,
  重大: BAD,
  一般: WARN,
  提示: INFO,
  告知: MUTE,

  /* ── 通用兜底词 ────────────────────────────────────────────────────── */
  启用: OK,
  停用: MUTE,
  生效: OK,
  未启用: MUTE,
  超限: WARN,
  报警: BAD,
  预警: WARN,
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
    wrap.className = `${TAG_BASE} ${local[text] ?? base[text] ?? MUTE}`;
    wrap.textContent = text;
    return wrap;
  };
}

/** 布尔列 → 是/否色标（`enabled`、`flagDel`、`isVirtual`、`bizState`） */
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
 * 占用率/负荷率条：`value` 给 0-1 的比值，颜色按占用度分档（越高越坏）。
 *
 * 为什么要条而不是一个百分数：客户要的是「一眼看出哪几项快顶到线」。
 * 数字要逐行读，条不用——设备负荷率、皮带运力占用、风箱负压占用都是这个逻辑。
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
 * 料仓料位条（TG0003 料仓管理、TW 各工序料仓变料页）：单元格值 0-100 的料位百分比。
 *
 * 为什么不复用 `ratioBarRenderer`：那个的语义是「越满越坏」，料仓是**双端危险**——
 * 满仓要溢料（≥90 红、接近高线 85 起 amber），但**空仓同样是事故**（断料停线，≤低限直接红），
 * 中间才是绿。单端分档的渲染器表达不了这条。高低红线位置从**行数据**
 * `hiLimit`/`loLimit` 读（料仓契约里就有），读不到回 90/15——
 * 红线画出来，客户不用 hover 也知道「离溢料还有多远」。
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

/**
 * 配料偏差条（TB 配料计划、TW 投料实绩）：值是**偏差率百分比**（可正可负），
 * 以 0 为中心向两侧画，颜色按 `|偏差|` 分档。
 *
 * 为什么单独一个：偏差率有方向（配比偏高/偏低），用单端条会把 -8% 画成「很短、绿的」，
 * 而现场真正在意的是「偏了多少」——所以画绝对值长度，符号靠标签带出来。
 * 阈值 2%/5% 取自规格书 B4 的「配料偏差率」口径（±2% 内算稳、±5% 外要追）。
 */
export function deviationBarRenderer() {
  return (p: ICellRendererParams): HTMLElement => {
    const v = Number(p.value) || 0;
    const abs = Math.abs(v);
    const pct = Math.min(100, Math.round(abs * 10)); // ±10% 占满
    const color = abs > 5 ? "bg-red-500" : abs > 2 ? "bg-amber-500" : "bg-emerald-500";
    const wrap = document.createElement("div");
    wrap.className = "flex h-full min-w-24 items-center gap-2";
    const track = document.createElement("div");
    track.className = "h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-muted";
    const fill = document.createElement("div");
    fill.className = `h-full ${color}`;
    fill.style.width = `${pct}%`;
    track.appendChild(fill);
    const label = document.createElement("span");
    label.className = "w-14 shrink-0 text-right text-xs tabular-nums";
    label.textContent = `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
    wrap.appendChild(track);
    wrap.appendChild(label);
    return wrap;
  };
}

/* ── valueFormatter ───────────────────────────────────────────────────── */

/** 千分位；`digits` 默认 0（料批数、罐数、点位数这类计数不需要小数） */
export function numFmt(digits = 0) {
  return (p: { value: unknown }) =>
    p.value === null || p.value === undefined || p.value === ""
      ? "—"
      : Number(p.value).toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * 实物量（吨/千克/立方米）：按量级自适应位数——≥1 万折成「万」保留两位，其余千分位最多两位。
 *
 * 为什么自适应而不是固定位数：铁水日产量是四位数、单罐重量是三位数、
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

/** 金额（元）：千分位 + 两位小数，成本页要核对到分 */
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

/** 带单位的数值（`1180 ℃`、`4263 点`）；空值给破折号而不是 `undefined ℃` */
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

/** 日期串 `YYYY-MM-DD HH:mm:ss` → 只留日期（生产日期、检验日期列常够，省列宽） */
export function dayFmt(p: { value: unknown }) {
  return p.value ? String(p.value).slice(0, 10) : "—";
}

/**
 * 时刻串 `YYYY-MM-DD HH:mm:ss` → 只留 `HH:mm`（开停机、推焦、出铁这类
 * **同一天内多点发生**的记录：日期已在筛选条件里，列上再占 10 个字符是浪费）。
 */
export function clockFmt(p: { value: unknown }) {
  const s = p.value ? String(p.value) : "";
  return s.length >= 16 ? s.slice(11, 16) : s || "—";
}

/** 层级：`3` → 「3 级」，配 1/2/3 这种小整数列（直接显示光秃秃的数字读不出语义） */
export function levelFmt(p: { value: unknown }) {
  const v = Number(p.value);
  return Number.isFinite(v) && v > 0 ? `${v} 级` : "—";
}

/**
 * 编码数组 → 中文名（`["M001","M002"]` → 「混匀矿、石灰石」）。
 *
 * 名称从 `nameMaps` 的模块级缓存来（那是一次 `GET /tqmes/material/list`），
 * 所以 AG Grid 的 valueFormatter **要在名称到货后重查一次列表**才会翻成中文——
 * `ListPage` 暴露了 `reload()`，页面在 `useNameMaps().ready` 上挂一次即可，
 * 没挂会退化成显示编码（可读、但客户要看的是名字）。
 */
export function codeListFmt(names: Record<string, string>) {
  return (p: { value: unknown }) => {
    const v = p.value;
    if (!Array.isArray(v) || !v.length) return "—";
    return v.map((c) => names[String(c)] ?? String(c)).join("、");
  };
}

/**
 * 单编码 → 中文名（`unitId: "GL01-01"` → 「1#高炉」）。
 * 取不到就原样回编码：**不隐藏**——漏配名称时看到 `GL01-01` 能立刻定位，
 * 显示成「—」会让人以为这行本来就没值。
 */
export function codeFmt(names: Record<string, string>) {
  return (p: { value: unknown }) => {
    if (p.value === null || p.value === undefined || p.value === "") return "—";
    const s = String(p.value);
    return names[s] ?? s;
  };
}
