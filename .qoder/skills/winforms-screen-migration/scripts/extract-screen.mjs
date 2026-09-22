#!/usr/bin/env node
/**
 * WinForms Designer.cs → 画面骨架摘要提取器（迁移第一阶段专用）
 *
 * 用法：
 *   node extract-screen.mjs <Frm*.Designer.cs> [选项]
 *
 * 选项：
 *   --entity-root <dir>   实体/Dto 源码根（如 rmes.service），用 [LDisplay]/[Description] 补中文列头
 *   --uc                  递归展开同目录下被引用的 UC*.Designer.cs（默认 3 层）
 *   --depth <n>           --uc 的递归层数，默认 3
 *   --root <dir>          UC/实体文件搜索根目录，默认 Designer 文件所在目录（--uc）与其上级（--entity-root）
 *   --quiet               只输出列与按钮，省略控件清单
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--") && !isVal(a));
if (!file) {
  console.log("用法: node extract-screen.mjs <Frm*.Designer.cs> [--entity-root <dir>] [--uc] [--depth n]");
  process.exit(1);
}
function isVal(a) {
  const i = argv.indexOf(a);
  return i > 0 && ["--entity-root", "--depth", "--root"].includes(argv[i - 1]);
}
const opt = (name, dflt) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const FLAG = { uc: argv.includes("--uc"), quiet: argv.includes("--quiet") };
const DEPTH = Number(opt("depth", 3));
const ENTITY_ROOT = opt("entity-root", "");

const LABELS = {
  gridColumn: (t) => /GridColumn$/.test(t),
  button: (t) => /(SimpleButton|BarButtonItem|CheckButton|RadioButton|BarSubItem|BarCheckItem|BarSplitButton)$/.test(t),
  grid: (t) => /GridControl$/.test(t),
  view: (t) => /(GridView|ColumnView|TableView|TreeList)$/.test(t),
  tab: (t) => /XtraTabControl$/.test(t),
  tabPage: (t) => /XtraTabPage$/.test(t),
  split: (t) => /SplitContainerControl$/.test(t),
  label: (t) => /(LabelControl|SimpleLabel|Label|LayoutControlItem|GroupControl|XtraUserControl)$/.test(t),
  input: (t) => /(TextEdit|MemoEdit|DateEdit|SpinEdit|RepositoryItemTextEdit|LookUpEdit|CheckEdit|RadioGroup|CheckedComboBoxEdit|TimeEdit|ButtonEdit|RepositoryItemCheckEdit|RepositoryItemDateEdit|RepositoryItemLookUpEdit|RepositoryItemComboBox)$/.test(t),
};
const short = (t) => t.replace(/^global::/, "").split(".").pop();

const seen = new Set();
const labels = ENTITY_ROOT ? loadLabels(ENTITY_ROOT) : { byEntity: new Map(), global: new Map() };

walk(file, 0);

function walk(path, depth) {
  path = resolveDesigner(path);
  if (!path || seen.has(path)) return;
  seen.add(path);
  const src = strip(readFileSync(path, "utf8"));
  const { decls, props, adds, typeofs } = parse(src);
  report(path, decls, props, adds, typeofs);
  if (FLAG.uc && depth < DEPTH) {
    for (const [name, d] of decls) {
      if (!/^UC/.test(short(d.type))) continue;
      const hit = findSibling(dirname(path), short(d.type) + ".Designer.cs");
      if (hit) walk(hit, depth + 1);
    }
  }
}

function strip(s) {
  return s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function parse(src) {
  const decls = new Map();
  let order = 0;
  for (const m of src.matchAll(/\b(?:private|internal|protected|public)\s+(?:global::)?([\w.:]+(?:<[^>]+>)?)\s+(\w+)\s*;/g)) {
    decls.set(m[2], { type: m[1], order: order++ });
  }
  const props = new Map();
  for (const m of src.matchAll(/(?:this\.)?(\w+)\.(\w+)\s*=\s*([^;\n]+);/g)) {
    if (!decls.has(m[1])) continue;
    if (!props.has(m[1])) props.set(m[1], {});
    props.get(m[1])[m[2]] = m[3].trim().replace(/^this\./, "").replace(/^"|"$/g, "");
  }
  const adds = [];
  const bare = (s) => s.trim().replace(/^this\./, "");
  for (const m of src.matchAll(/(?:this\.)?(\w+)\.(Columns|TabPages|ItemLinks|Views|Panels)\.AddRange\([^)]*\{([^}]*)\}\s*\)/g)) {
    adds.push({ owner: m[1], kind: m[2], items: m[3].split(",").map(bare).filter(Boolean) });
  }
  for (const m of src.matchAll(/(?:this\.)?(\w+)\.Controls\.Add\((?:this\.)?(\w+)\)/g)) {
    adds.push({ owner: m[1], kind: "Controls", items: [m[2]] });
  }
  for (const m of src.matchAll(/(?:this\.)?(\w+)\.Panel(\d)\.Controls\.Add\((?:this\.)?(\w+)\)/g)) {
    adds.push({ owner: m[1], kind: "Panel" + m[2], items: [m[3]] });
  }
  const typeofs = new Map();
  for (const m of src.matchAll(/(?:this\.)?(\w+)\.DataSource\s*=\s*typeof\(([\w.]+)\)/g)) {
    typeofs.set(m[1], short(m[2]));
  }
  return { decls, props, adds, typeofs };
}

function report(path, decls, props, adds, typeofs) {
  const P = (n, k) => props.get(n)?.[k];
  const byKind = (k) => adds.filter((a) => a.kind === k);
  const orderOf = (kind, owner) => byKind(kind).find((a) => a.owner === owner)?.items ?? [];

  console.log(`\n===== ${basename(path)} =====`);

  if (!FLAG.quiet) {
    const inv = new Map();
    for (const [, d] of decls) inv.set(short(d.type), (inv.get(short(d.type)) ?? 0) + 1);
    console.log("控件: " + [...inv].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}×${n}`).join("  "));
  }

  for (const tab of decls) {
    if (!LABELS.tab(short(tab[1].type))) continue;
    const pages = orderOf("TabPages", tab[0]);
    console.log(`\n页签 ${tab[0]} (HeaderLocation=${P(tab[0], "HeaderLocation") ?? "-"}):`);
    pages.forEach((pg, i) => {
      const kids = byKind("Controls").filter((a) => a.owner === pg).map((a) => a.items[0]);
      console.log(`  ${i}  ${P(pg, "Text") ?? pg}  → ${kids.join(", ") || "(空)"}`);
    });
  }

  for (const sp of decls) {
    if (!LABELS.split(short(sp[1].type))) continue;
    const horiz = P(sp[0], "Horizontal");
    console.log(
      `\n分栏 ${sp[0]}: ${horiz === "false" ? "上下" : "左右"}  SplitterPosition=${P(sp[0], "SplitterPosition") ?? "-"}  ` +
        `Panel1=${byKind("Panel1").filter((a) => a.owner === sp[0]).map((a) => a.items[0]).join("/")}  ` +
        `Panel2=${byKind("Panel2").filter((a) => a.owner === sp[0]).map((a) => a.items[0]).join("/")}`
    );
  }

  const btnOrder = byKind("ItemLinks").flatMap((a) => a.items);
  const addIdx = new Map();
  const addOwner = new Map();
  let seq = 0;
  for (const a of adds.filter((x) => x.kind === "Controls")) {
    for (const it of a.items) {
      if (addIdx.has(it)) continue;
      addIdx.set(it, seq++);
      addOwner.set(it, a.owner);
    }
  }
  const btns = [...decls].filter(([, d]) => LABELS.button(short(d.type)));
  btns.sort((a, b) => {
    const ia = btnOrder.indexOf(a[0]), ib = btnOrder.indexOf(b[0]);
    if (ia >= 0 || ib >= 0) return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
    const ca = addIdx.get(a[0]), cb = addIdx.get(b[0]);
    if (ca !== undefined || cb !== undefined) return (ca ?? Infinity) - (cb ?? Infinity);
    return a[1].order - b[1].order;
  });
  const shown = btns.filter(([n]) => P(n, "Text") || P(n, "Caption") || P(n, "Visible") !== "false");
  if (shown.length) {
    console.log(`\n按钮（容器内 Controls.Add 顺序 = 画面原序，共 ${shown.length} 个）:`);
    shown.forEach(([n], i) => console.log(`  ${i}  ${(P(n, "Text") ?? P(n, "Caption") ?? "?").padEnd(12)} [${n}]  容器=${addOwner.get(n) ?? "-"}  Visible=${P(n, "Visible") ?? "true"}`));
  }

  const views = [...decls].filter(([, d]) => LABELS.view(short(d.type)));
  for (const [vn] of views) {
    const grid = P(vn, "GridControl");
    const entity = (grid && (typeofs.get(P(grid, "DataSource")) ?? typeofs.get(grid))) ?? null;
    const declared = orderOf("Columns", vn);
    const cols = declared.length ? declared : [...decls].filter(([, d]) => LABELS.gridColumn(short(d.type))).map(([n]) => n);
    const rows = cols
      .map((c) => ({
        c,
        f: P(c, "FieldName"),
        cap: P(c, "Caption"),
        vi: P(c, "VisibleIndex"),
        vis: P(c, "Visible"),
        w: P(c, "Width"),
        fmt: P(c, "DisplayFormat.Format"),
      }))
      .filter((r) => r.f || r.cap);
    const vis = rows.filter((r) => r.vis !== "false" && r.vi !== undefined && r.vi !== "-1").sort((a, b) => Number(a.vi) - Number(b.vi));
    const hid = rows.filter((r) => !vis.includes(r));
    console.log(`\n表格 ${vn}${grid ? ` (gridControl=${grid})` : ""}: 绑定实体 ${entity ?? "?"}  可见 ${vis.length} 列 / 其余 ${hid.length} 列（隐藏或未排入，仍需以 hide:true 迁入）`);
    for (const r of vis) console.log(`  ${String(r.vi).padStart(2)}  ${(r.f ?? "?").padEnd(24)} ${cn(r, entity)}  w=${r.w ?? "-"}${r.fmt ? `  fmt=${r.fmt}` : ""}`);
    if (hid.length) console.log("  hide: " + hid.map((r) => `${r.f ?? r.c}=${(labels.byEntity.get(entity)?.get(r.f) ?? labels.global.get(r.f)) ?? r.cap ?? "?"}${r.vis === "false" ? "(Visible=false)" : ""}`).join("  "));
  }

  if (!FLAG.quiet) {
    const caps = [...decls].filter(([, d]) => LABELS.label(short(d.type)) || LABELS.input(short(d.type)));
    const named = caps.filter(([n]) => P(n, "Text") || P(n, "EditName") || P(n, "Name2"));
    if (named.length) {
      console.log("\n字段/标签:");
      named.forEach(([n]) => console.log(`  ${n.padEnd(22)} ${short(decls.get(n).type).padEnd(16)} text=${P(n, "Text") ?? "-"}  editName=${P(n, "EditName") ?? "-"}  prop=${P(n, "PropertyName") ?? "-"}`));
    }
  }
}

function cn(r, entity) {
  if (r.cap) return `"${r.cap}"`;
  const l = labels.byEntity.get(entity)?.get(r.f) ?? labels.global.get(r.f);
  return l ? `"${l}"  ←LDisplay:${entity ?? "全局"}` : `"${r.f}?"  ←需查实体`;
}

function loadLabels(root) {
  const files = [];
  (function scan(d, n) {
    if (n > 6 || !existsSync(d)) return;
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) scan(p, n + 1);
      else if (e.endsWith(".cs") && !e.endsWith(".Designer.cs")) files.push(p);
    }
  })(root, 0);
  const byEntity = new Map();
  const global = new Map();
  for (const f of files) {
    let s;
    try { s = readFileSync(f, "utf8"); } catch { continue; }
    const ent = basename(f).replace(/\.cs$/, "");
    const one = byEntity.get(ent) ?? new Map();
    byEntity.set(ent, one);
    for (const m of s.matchAll(/\[(?:LDisplay|Description|DisplayName)\("([^"]+)"\)\][\s\S]{0,240}?public\s+[\w<>[\],.?\s]+?\s+(\w+)\s*(?:\{|=>)/g)) {
      if (!one.has(m[2])) one.set(m[2], m[1]);
      if (!global.has(m[2])) global.set(m[2], m[1]);
    }
  }
  console.log(`LDisplay 字典: ${global.size} 条 / ${byEntity.size} 个实体文件（根=${root}）`);
  return { byEntity, global };
}

function resolveDesigner(p) {
  if (existsSync(p) && statSync(p).isFile()) return p;
  const withSuffix = p.replace(/\.cs$/, ".Designer.cs").replace(/Designer\.Designer\.cs$/, ".Designer.cs");
  return existsSync(withSuffix) ? withSuffix : null;
}

function findSibling(dir, name) {
  let d = dir;
  for (let i = 0; i < 6; i++) {
    const hit = search(d, name, 0);
    if (hit) return hit;
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  return null;
}
function search(dir, name, depth) {
  if (depth > 4 || !existsSync(dir)) return null;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { const r = search(p, name, depth + 1); if (r) return r; }
    else if (e === name) return p;
  }
  return null;
}
