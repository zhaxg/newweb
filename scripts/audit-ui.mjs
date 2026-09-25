/**
 * audit:ui —— 全站密度纪律审计（零依赖，node scripts/audit-ui.mjs）
 *
 * 规则见 globals.css「HMX 字阶」注释块。违反即非零退出，可挂 CI / pre-commit。
 *   R1  arbitrary 字号：class 里的 text-[...]（含 rem/px 任意值）
 *   R2  PrimeVue 组件 size="small"（HmxCompact 默认档即紧凑，禁止双重压缩；
 *       确需例外在同一行加注释 `audit-allow`）
 *   R3  越档字号类：text-lg / text-xl / text-2xN...（四档字阶之外）
 *   R4  裸 <label>：标签必须显式声明 text-xs（字段标签 = 辅助档），
 *       否则掉进 body 兜底（正文档）与控件族不齐；见 README「字号与密度纪律」
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/pages", "src/layouts", "src/components"];
const PRIMEVUE_TAGS =
  "Button|Select|SelectButton|MultiSelect|TreeSelect|AutoComplete|InputText|InputMask|InputNumber|Textarea|Password|ToggleSwitch|Checkbox|RadioButton|DatePicker|Calendar|Chips|SplitButton|SpeedDial";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(?:vue|tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

/** 文件内容 → 违规列表（含行号与原文片段） */
function auditFile(path, text) {
  const findings = [];
  const lines = text.split("\n");
  const report = (idx, rule, _snippet) => {
    const line = lines[idx];
    if (line.includes("audit-allow")) return;
    findings.push(`${relative(process.cwd(), path)}:${idx + 1}  [${rule}]  ${line.trim().slice(0, 120)}`);
  };

  // 逐条规则整文扫描，按匹配位置的换行数还原行号
  const scan = (re, rule) => {
    let m;
    while ((m = re.exec(text))) {
      report(text.slice(0, m.index).split("\n").length - 1, rule, m[0]);
    }
  };
  scan(/class="[^"]*\btext-\[[^\]]+\]/g, "R1 arbitrary字号");
  scan(new RegExp(`<(?:${PRIMEVUE_TAGS})\\b[^>]*\\bsize="small"`, "gs"), "R2 size=small");
  scan(/\btext-(?:lg|xl|[2-9]xl)\b/g, "R3 越档字号");
  // R4：裸 label（开标签内未声明 text-xs）。豁免：行内 audit-allow 或 class 绑定后续行含 text-xs
  for (const m of text.matchAll(/<label\b[^>]*>/gs)) {
    if (!m[0].includes("text-xs")) report(text.slice(0, m.index).split("\n").length - 1, "R4 label未声明辅助档", m[0]);
  }
  return findings;
}

let all = [];
for (const root of ROOTS) {
  for (const f of walk(root)) {
    if (f.includes("node_modules")) continue;
    all.push(...auditFile(f, readFileSync(f, "utf8")));
  }
}

all.sort();
if (all.length) {
  console.log(`audit:ui —— ${all.length} 处违反字阶/密度纪律：\n`);
  console.log(all.join("\n"));
  process.exit(1);
}
console.log("audit:ui —— 通过，无违规。");
