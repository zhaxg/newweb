/**
 * 单据打印（AS0004 结算单 / AS0005 交接折算单 / AC0001 作业票共用）。
 *
 * 附录 B5 把「按纸质单据排版、可打印」列为 Demo 加分点——客户拿这些单子是要签字归档的，
 * 屏幕上再漂亮也不替代一张能签字的纸。
 *
 * **为什么新开窗口打印，而不是给页面套一套 `@media print` 样式**：
 * 本系统的壳层是「侧栏 + 页签 + 滚动容器 + `overflow:hidden`」，
 * visibility 那套经典写法在绝对定位碰上祖先 `overflow:hidden` 时会把单据裁掉半张，
 * 而 `.eam-print { position: fixed }` 又会超出一页被截断。为了让 30 行的结算单也能连续打印，
 * 这里把单据**独立渲染到一个新窗口**：纸张、分页、页边距全部自己控制，
 * 与壳层样式零耦合，浏览器打印预览看到的就是最终效果。
 *
 * `printDocument` 只在**用户点了打印按钮**时调用（浏览器不允许程序自动打印），
 * 弹窗被拦截时回 `false`，由页面提示用户放行——不能静默失败。
 */

/** 单头的一项（label: value 两列） */
export interface PrintHeadItem {
  label: string;
  value: string;
}

export interface PrintColumn {
  title: string;
  /** 列宽（mm）；不给则均分 */
  width?: number;
  /** 数字列右对齐 */
  align?: "left" | "right" | "center";
}

export interface PrintDoc {
  /** 厂名（抬头第一行） */
  org: string;
  /** 单据名称（抬头第二行，如「备件寿命考核结算单」） */
  title: string;
  /** 单号，排在标题右侧 */
  docNo: string;
  /** 制单日期 */
  date: string;
  head: PrintHeadItem[];
  columns: PrintColumn[];
  rows: string[][];
  /** 表尾合计行（与 columns 同列数，空串占位） */
  foot?: string[];
  /** 口径/公式脚注，逐行显示 */
  notes?: string[];
  /** 签字栏：三条横线 */
  signatures?: string[];
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 对齐类名单一来源：表头与单元格必须按同一列同一条规则，否则数字列会错行 */
function alignClass(align: PrintColumn["align"], extra = ""): string {
  return [align === "right" ? "num" : align === "center" ? "ctr" : "", extra].filter(Boolean).join(" ");
}

/** 把单据渲染成一页 A4 的完整 HTML（自包含样式，不引用应用的 css）。
 *  所有动态值都过 `esc()`——拼的是 markup，逃一个 `<` 就是一段可执行脚本。 */
export function printDocHtml(d: PrintDoc): string {
  const colgroup = d.columns.map((c) => `<col${c.width ? ` style="width:${c.width}mm"` : ""}>`).join("");
  const thead = d.columns.map((c) => `<th class="${alignClass(c.align)}">${esc(c.title)}</th>`).join("");
  const tbody = d.rows
    .map(
      (r) =>
        `<tr>${r.map((cell, i) => `<td class="${alignClass(d.columns[i]?.align)}">${esc(cell)}</td>`).join("")}</tr>`,
    )
    .join("");
  const tfoot = d.foot
    ? `<tfoot><tr>${d.foot
        .map((cell, i) => `<td class="${alignClass(d.columns[i]?.align, "strong")}">${esc(cell)}</td>`)
        .join("")}</tr></tfoot>`
    : "";
  const head = d.head.map((h) => `<div class="hi"><span>${esc(h.label)}</span><b>${esc(h.value)}</b></div>`).join("");
  const notes = (d.notes ?? []).map((n) => `<p class="note">${esc(n)}</p>`).join("");
  const sig = (d.signatures ?? []).map((s) => `<div class="sig"><i></i><span>${esc(s)}</span></div>`).join("");

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(d.title)} ${esc(d.docNo)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; color: #111; margin: 0; }
  h1 { font-size: 18pt; text-align: center; margin: 0 0 2mm; letter-spacing: 1mm; }
  h2 { font-size: 12pt; text-align: center; margin: 0 0 4mm; font-weight: 600; }
  .bar { display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 2mm; }
  .head { display: flex; flex-wrap: wrap; font-size: 9pt; border: 0.4pt solid #111; border-width: 0.4pt 0; padding: 2mm 0; margin-bottom: 3mm; }
  .hi { width: 33.33%; padding: 0.6mm 0; }
  .hi span { color: #555; margin-right: 1.5mm; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th, td { border: 0.4pt solid #111; padding: 1.6mm 2mm; text-align: left; }
  th { background: #eee; font-weight: 600; text-align: left; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .ctr { text-align: center; }
  .strong { font-weight: 700; }
  tfoot td { background: #f7f7f7; }
  .notes { margin-top: 3mm; font-size: 8pt; color: #444; }
  .note { margin: 0 0 1mm; }
  .sigs { display: flex; gap: 12mm; margin-top: 12mm; font-size: 9pt; }
  .sig { display: flex; align-items: flex-end; gap: 2mm; }
  .sig i { display: inline-block; width: 34mm; border-bottom: 0.4pt solid #111; }
  tr { page-break-inside: avoid; }
</style></head>
<body>
  <h1>${esc(d.org)}</h1>
  <h2>${esc(d.title)}</h2>
  <div class="bar"><span>单号：${esc(d.docNo)}</span><span>制单日期：${esc(d.date)}</span></div>
  <div class="head">${head}</div>
  <table><colgroup>${colgroup}</colgroup><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody>${tfoot}</table>
  <div class="notes">${notes}</div>
  <div class="sigs">${sig}</div>
</body></html>`;
}

/**
 * 打开打印窗口。
 *
 * @returns 是否成功唤起（`false` = 浏览器拦截了新窗口，页面要提示用户放行）
 */
export function printDocument(doc: PrintDoc): boolean {
  const win = window.open("", "_blank", "width=1024,height=768");
  if (!win) return false;
  win.document.open();
  win.document.write(printDocHtml(doc));
  win.document.close();
  // 等内容布局完成再打印：否则会打出无样式的一张白纸（新窗口的样式表是同步解析但渲染在下一帧）
  win.requestAnimationFrame(() => {
    win.focus();
    win.print();
  });
  return true;
}
