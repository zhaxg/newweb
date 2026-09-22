#!/usr/bin/env node
/**
 * WinForms 窗体 → 迁移清单提取器（画面骨架 + 后端调用台账）
 *
 * 用法：
 *   node extract-screen.mjs <Frm*.Designer.cs> [选项]
 *
 * 选项：
 *   --entity-root <dir>   实体/Dto 源码根（如 rmes.service），用 [LDisplay]/[Description] 补中文列头
 *   --uc                  递归展开同目录下被引用的 UC*.Designer.cs（默认 3 层）
 *   --depth <n>           --uc 的递归层数，默认 3
 *   --root <dir>          UC/实体文件搜索根目录，默认 Designer 文件所在目录（--uc）与其上级（--entity-root）
 *   --svc-root <dir>      I*AppService 声明所在根，默认从 Designer 路径向上找 rmes.service
 *   --api-root <dir>      已生成的 swagger API 目录，默认 <仓库根>/src/api/mes4ddh
 *   --no-calls            跳过「后端调用」台账（不读同名 .cs）
 *   --quiet               只输出列与按钮，省略控件清单
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--") && !isVal(a));
if (!file) {
  console.log("用法: node extract-screen.mjs <Frm*.Designer.cs> [--entity-root <dir>] [--uc] [--depth n]");
  process.exit(1);
}
function isVal(a) {
  const i = argv.indexOf(a);
  return i > 0 && ["--entity-root", "--depth", "--root", "--svc-root", "--api-root"].includes(argv[i - 1]);
}
const opt = (name, dflt) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const FLAG = { uc: argv.includes("--uc"), quiet: argv.includes("--quiet"), noCalls: argv.includes("--no-calls") };
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
  input: (t) => /(Edit|RadioGroup|CheckedListBox|TrackBar)$/.test(t),
};
const short = (t) => t.replace(/^global::/, "").split(".").pop();

const seen = new Map();
const labels = ENTITY_ROOT ? loadLabels(ENTITY_ROOT) : { byEntity: new Map(), global: new Map() };

walk(file, 0);

function walk(path, depth) {
  path = resolveDesigner(path);
  if (!path || seen.has(path)) return;
  seen.set(path, depth);
  const src = strip(readFileSync(path, "utf8"));
  const parsed = parse(src);
  report(path, parsed);
  if (FLAG.uc && depth < DEPTH) {
    for (const [name, d] of parsed.decls) {
      if (!/^UC/.test(short(d.type))) continue;
      const hit = findSibling(dirname(path), short(d.type) + ".Designer.cs");
      if (hit) walk(hit, depth + 1);
    }
  }
}

/* ---------- 后端调用台账：读同名 Frm*.cs（不是 Designer） ---------- */

const SVC_ROOT = opt("svc-root", guessSvcRoot(resolve(file)));
const API_ROOT = opt("api-root", join(dirname(resolve(fileURLToPath(import.meta.url))), "..", "..", "..", "..", "src", "api", "mes4ddh"));
const nsCache = new Map();
let apiIndex = null;

const camel = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

function guessSvcRoot(start) {
  let d = dirname(start);
  for (let i = 0; i < 10; i++) {
    const cand = join(d, "rmes.service");
    if (existsSync(cand)) return cand;
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  return "";
}

/** 只按文件名找 I<X>AppService.cs，不读内容，遍历量封顶 */
function findServiceFile(root, name) {
  if (!root || !existsSync(root)) return "";
  const target = `I${name}AppService.cs`;
  const stack = [root];
  for (let n = 0; stack.length && n < 40000; n++) {
    const dir = stack.pop();
    let ent;
    try { ent = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of ent) {
      if (e.isDirectory()) {
        if (e.name === "bin" || e.name === "obj" || e.name === "node_modules") continue;
        stack.push(join(dir, e.name));
      } else if (e.name === target) {
        return join(dir, e.name);
      }
    }
  }
  return "";
}

function namespaceOf(svc) {
  if (nsCache.has(svc)) return nsCache.get(svc);
  const f = findServiceFile(SVC_ROOT, svc);
  const ns = f ? /^\s*namespace\s+([\w.]+)/m.exec(strip(readFileSync(f, "utf8")))?.[1] ?? "" : "";
  nsCache.set(svc, ns);
  return ns;
}

/** src/api/mes4ddh/*.swagger.ts 里已生成的 Api 对象与其方法名 */
function existingApis() {
  if (apiIndex) return apiIndex;
  apiIndex = new Map();
  let files;
  try { files = readdirSync(API_ROOT); } catch { return apiIndex; }
  for (const f of files) {
    if (!f.endsWith(".ts")) continue;
    let src;
    try { src = readFileSync(join(API_ROOT, f), "utf8"); } catch { continue; }
    for (const m of src.matchAll(/^export const (\w+Api)\s*=\s*\{([\s\S]*?)^\};/gm)) {
      const methods = new Set();
      for (const k of m[2].matchAll(/^ {2}(\w+)\s*\(/gm)) methods.add(k[1]);
      apiIndex.set(m[1], methods);
    }
  }
  return apiIndex;
}

function reportCalls(designerPath) {
  const codeName = basename(designerPath).replace(/\.Designer\.cs$/, ".cs");
  const codePath = join(dirname(designerPath), codeName);
  console.log(`\n----- 后端调用台账 ${codeName} -----`);
  if (!existsSync(codePath)) {
    console.log(`  找不到 ${codeName}：逻辑需人工回读（纯 UC 控件、或逻辑在父窗体里时属正常）`);
    return;
  }
  const lines = strip(readFileSync(codePath, "utf8")).split("\n");
  const calls = []; const tracks = []; const dialogs = [];
  let fn = "(字段/构造)";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const mFn = /^(?:private|public|protected|internal)\b[^=;{]*?\b(\w+)\s*\(/.exec(line);
    if (mFn && !line.includes(";")) fn = mFn[1];
    for (const m of line.matchAll(/Svc\s*<\s*(?:global::)?[\w.]*?I([A-Za-z0-9]+?)AppService\s*>\s*\.\s*Proxy\s*\.\s*([A-Za-z]\w*)/g)) {
      calls.push({ fn, svc: m[1], method: m[2] });
    }
    for (const m of line.matchAll(/(\w*[Bb]indingSource)?\s*\.?\s*GetTrackingList\s*<\s*([\w.]+)\s*>\s*\(\s*\)\s*\.\s*ToSaveChangesData/g)) {
      tracks.push({ fn, entity: m[2], src: m[1] ?? "" });
    }
    for (const m of line.matchAll(/new\s+(Frm[A-Z]\w*)\s*\(\s*\)|(\w*Frm[A-Z]\w*)\s*\.\s*ShowDialog/g)) {
      dialogs.push(m[1] ?? m[2]);
    }
  }

  if (!calls.length) console.log("  服务调用: 无（.cs 里没有 Svc<I*AppService>.Proxy 调用）");
  else {
    console.log(`  服务调用 ${calls.length} 处（前端映射规则见 references/backend-api.md §1）:`);
    const apis = existingApis();
    const done = new Set();
    for (const c of calls) {
      const key = `${c.svc}#${c.method}`;
      if (done.has(key)) continue;
      done.add(key);
      const api = camel(c.svc) + "Api";
      const ns = namespaceOf(c.svc);
      const state = !apis.has(api) ? "需补(整个 Api 对象)" : apis.get(api).has(camel(c.method)) ? "已生成" : "需补(缺该方法)";
      console.log(
        `    ${c.fn.padEnd(28)} ${api}.${camel(c.method)}`.padEnd(78) +
        `[${state}]  ${ns ? `/${camel(ns)}/${camel(c.svc)}/${camel(c.method)}` : `/<命名空间待查>/${camel(c.svc)}/${camel(c.method)}`}`,
      );
    }
  }
  const tuniq = [...new Map(tracks.map((t) => [`${t.entity}#${t.src}`, t])).values()];
  for (const t of tuniq) {
    console.log(`    ${(t.fn || "保存").padEnd(28)} ${t.src || "?"}.GetTrackingList<${t.entity}>().ToSaveChangesData()  [跟踪]`);
    console.log(`  ${" ".repeat(28)}→ new TrackableList<${t.entity}>(rows) + crudAppService.SaveList(list, "${t.entity}")`);
  }
  if (dialogs.length) console.log("  二级弹窗（默认只留占位，经确认再连带迁移）: " + [...new Set(dialogs)].join("  "));
}

function strip(s) {  return s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
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
  // 单数 Columns.Add(col)：语料里 28 个窗体这么写，不接住就整表退化成声明序
  for (const m of src.matchAll(/(?:this\.)?(\w+)\.Columns\.Add\((?:this\.)?(\w+)\)/g)) {
    adds.push({ owner: m[1], kind: "Columns", items: [m[2]] });
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
  return { decls, props, adds, typeofs, ...parseExtras(src) };
}

/** 绑定字段 / 下拉选项 / 输入掩码：都写在子属性或 Add 调用里，主属性正则吃不到，单独扫一遍。 */
function parseExtras(src) {
  const bindings = new Map();
  for (const m of src.matchAll(/(?:this\.)?(\w+)\.DataBindings\.Add\(\s*new (?:global::)?[\w.]*Binding\(\s*"(\w+)"\s*,\s*(?:this\.)?([\w.]+)\s*,\s*"([^"]*)"/g)) {
    if (!bindings.has(m[1])) bindings.set(m[1], []);
    bindings.get(m[1]).push({ prop: m[2], source: m[3], field: m[4] });
  }
  const items = new Map();
  for (const m of src.matchAll(/(?:this\.)?(\w+)\.Properties\.Items(?:\.AddRange)?\([^;]*?\{([^}]*)\}/g)) {
    const list = [...m[2].matchAll(/\(\s*"([^"]*)"\s*(?:,\s*([^,()]+?))?\s*[,)]/g)].map((x) => ({ text: x[1], value: (x[2] ?? "").trim() }));
    if (list.length) items.set(m[1], list);
  }
  const masks = new Map();
  for (const m of src.matchAll(/(?:this\.)?(\w+)\.Properties\.Mask\.(\w+)\s*=\s*([^;\n]+)/g)) {
    if (!masks.has(m[1])) masks.set(m[1], {});
    let v = m[3].trim().replace(/^"|"$/g, "");
    // MaskType 是全限定枚举，只留最后一段；EditMask 是格式串（"N0"/"yyyy-MM-dd"），不能切
    if (m[2] !== "EditMask") v = v.split(".").pop();
    masks.get(m[1])[m[2]] = v;
  }
  const columnEdit = new Map();
  for (const m of src.matchAll(/(?:this\.)?(\w+)\.ColumnEdit\s*=\s*(?:this\.)?(\w+)/g)) {
    columnEdit.set(m[1], m[2]);
  }
  return { bindings, items, masks, columnEdit };
}

function report(path, parsed) {
  const { decls, props, adds, typeofs, bindings, items, masks, columnEdit } = parsed;
  const P = (n, k) => props.get(n)?.[k];
  const byKind = (k) => adds.filter((a) => a.kind === k);
  const orderOf = (kind, owner) => byKind(kind).filter((a) => a.owner === owner).flatMap((a) => a.items);
  /** 掩码/下拉挂在列自身或它的 ColumnEdit 仓库项上，两处都要找 */
  const viaEdit = (map, col) => map.get(col) ?? map.get(columnEdit.get(col));
  const maskOf = (col) => {
    const m = viaEdit(masks, col);
    if (!m) return "";
    return [m.EditMask && `mask=${m.EditMask}`, m.MaskType && m.MaskType !== "None" && `maskType=${m.MaskType}`].filter(Boolean).join(" ");
  };
  const itemsOf = (col) => {
    const list = viaEdit(items, col);
    return list ? `下拉[${list.map((i) => (i.value ? `${i.text}=${i.value}` : i.text)).join(" | ")}]` : "";
  };
  const extrasOf = (n) => [maskOf(n), itemsOf(n)].filter(Boolean).join("  ");

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
    /** 只有排到 VisibleIndex>=0 才算确定可见；显式 Visible=true 却没排位的是「待确认」，别混进隐藏 */
    const idx = (v) => (v !== undefined && v !== "-1" && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);
    const vis = rows.filter((r) => r.vis !== "false" && idx(r.vi) !== null).sort((a, b) => idx(a.vi) - idx(b.vi));
    const amb = rows.filter((r) => r.vis === "true" && idx(r.vi) === null);
    const hid = rows.filter((r) => !vis.includes(r) && !amb.includes(r));
    console.log(`\n表格 ${vn}${grid ? ` (gridControl=${grid})` : ""}: 绑定实体 ${entity ?? "?"}  可见 ${vis.length} 列 / 待确认 ${amb.length} 列 / 其余 ${hid.length} 列（隐藏或未排入，仍需以 hide:true 迁入）`);
    for (const r of vis) console.log(`  ${String(r.vi).padStart(2)}  ${(r.f ?? "?").padEnd(24)} ${cn(r, entity)}  w=${r.w ?? "-"}${r.fmt ? `  fmt=${r.fmt}` : ""}${extrasOf(r.c) ? "  " + extrasOf(r.c) : ""}`);
    if (amb.length) console.log("  待确认(Visible=true 但未排 VisibleIndex，需回读 Designer 或看原画面): " + amb.map((r) => `${r.f ?? r.c}`).join("  "));
    if (hid.length) console.log("  hide: " + hid.map((r) => `${r.f ?? r.c}=${(labels.byEntity.get(entity)?.get(r.f) ?? labels.global.get(r.f)) ?? r.cap ?? "?"}${r.vis === "false" ? "(Visible=false)" : ""}`).join("  "));
  }

  if (!FLAG.quiet) {
    const containerOf = new Map();
    for (const a of adds) {
      if (a.kind !== "Controls" && !/^Panel\d$/.test(a.kind)) continue;
      for (const it of a.items) if (!containerOf.has(it)) containerOf.set(it, a.owner);
    }
    const capOf = (n) => P(n, "Text") ?? P(n, "Caption") ?? n;
    const isLabel = (n) => LABELS.label(short(decls.get(n)?.type ?? ""));
    /** LayoutControlItem 不用 Controls.Add 装控件，而是 .Control = xxx 指过去 */
    const labelByControl = new Map();
    for (const [n] of decls) {
      if (!isLabel(n)) continue;
      const c = P(n, "Control");
      if (c) labelByControl.set(c, n);
    }
    const inputs = [...decls].filter(([, d]) => LABELS.input(short(d.type)) && !/^RepositoryItem/.test(short(d.type))).map(([n]) => n);
    const groups = new Map();
    for (const n of inputs) {
      const host = labelByControl.get(n) ?? containerOf.get(n);
      const key = host && isLabel(host) ? host : "(未分组)";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(n);
    }
    const captioned = [...decls].filter(([n, d]) => isLabel(n) && P(n, "Text") && !groups.has(n)).map(([n]) => n);
    if (groups.size || captioned.length) {
      console.log(`\n输入控件（${inputs.length} 个；▸ = 标签/分组，bind = DataBindings 绑定字段即 web 侧 model 键名）:`);
      for (const [host, list] of groups) {
        console.log(`  ▸ ${host === "(未分组)" ? host : capOf(host)}`);
        for (const n of list) {
          const b = (bindings.get(n) ?? []).map((x) => `${x.prop}→${x.field}@${x.source}`).join(",");
          const ex = [b && `bind=${b}`, P(n, "EditName") && `editName=${P(n, "EditName")}`, extrasOf(n)].filter(Boolean).join("  ");
          console.log(`      ${n.padEnd(26)} ${short(decls.get(n).type).padEnd(18)}${ex ? "  " + ex : ""}`);
        }
      }
      for (const n of captioned) console.log(`  ▸ ${capOf(n)}  ${short(decls.get(n).type)}（无输入控件）`);
    }
    const rep = [...decls].filter(([, d]) => /^RepositoryItem/.test(short(d.type))).map(([n]) => n);
    const repUsed = rep.filter((n) => masks.has(n) || items.has(n));
    if (repUsed.length) {
      console.log(`\n仓库编辑器（列内编辑/渲染，靠 ColumnEdit 挂到列上）:`);
      for (const n of repUsed) console.log(`  ${n.padEnd(26)} ${short(decls.get(n).type).padEnd(24)} ${[maskOf(n), itemsOf(n)].filter(Boolean).join("  ")}`);
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

/** 必须排在顶层：reportCalls 读到的 SVC_ROOT / API_ROOT / apiIndex 要先初始化完 */
if (!FLAG.noCalls && !FLAG.quiet) for (const p of seen.keys()) reportCalls(p);
