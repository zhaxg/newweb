import type { InspectionOrder, QualityBatch, QualityStandard, QualityResult } from "@/api/mes4tq/types";
import { MATERIALS, materialByName, unitsOfProcess } from "./org";
import { DEMO_DATE, SHIFT_CODES, between, dayOffset, pick, stamp } from "./model";
import { PEOPLE } from "./people";

/**
 * TQ 质量管理的种子（TQ0001 检验标准 / TQ0002 检验委托 / TQ0003 检验实绩）。
 *
 * 这三页是**同一条质检链的三段**：
 * ```
 * TQ0001 标准（判定口径）  →  TQ0002 委托（发起→取样→制样→检验→判定→报出）  →  TQ0003 实绩（结果）
 * ```
 * 规格书 A4 把这条链写得很明白：**「委托 MES 发起 → 检化验系统 → 结果回传」**。
 * 所以 `InspectionOrder.testNo`（委托单号）是整条链的**连接键**——
 * `QualityBatch` 的行能追回它对应的委托、委托又能追回它依据的标准。
 * 三张表各写各的单号，链就断了。
 *
 * ⚠️ 业务数字（产量、成本）不在这里；只铺**记录本身**：单号、时刻、人名、判定值。
 * 判定的阈值来自 `QualityStandard.max/min`（TQ0001 维护的那张表），
 * 所以「合不合格」必须由标准算，页面不许自己写一条 0.8%。
 */

/* ══════════════════════════════════════════════════════════════════════════
   1. 检验标准（TQ0001，真实表 TQA_2010）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 每个品名要验哪几项、上下限多少、怎么修约。
 *
 * **`roundRule`（修约规则）不是装饰**——它是标准的一部分：
 * 「二五成双」「四舍六入五成双」在化验上是有法律效力的口径，
 * 修约方式不同会让同一批样本判出不同的合格与否。B2 把 `C_ROUND_RULE`
 * 列进 TQA_2010 正是因为它必须随标准一起被维护。
 *
 * `section`（开闭区间）同理：`[min,max]` 与 `(min,max)` 在边界值上判定相反
 * ——TFe 恰好 55.00 时算不算合格，标准说了算。
 */
const STD_ROWS: Array<[string, string, string, number | undefined, number | undefined, number, string]> = [
  // [品名, 检验项, 单位, 下限, 上限, 小数位, 修约规则]
  ["烧结矿", "TFe", "%", 55.0, 59.0, 2, "二五成双"],
  ["烧结矿", "SiO2", "%", 4.5, 6.0, 2, "四舍六入五成双"],
  ["烧结矿", "CaO", "%", 9.0, 11.0, 2, "四舍六入五成双"],
  ["烧结矿", "FeO", "%", 7.0, 9.5, 2, "四舍"],
  ["烧结矿", "转鼓指数", "%", 76.0, undefined, 1, "四舍"],
  ["球团矿", "TFe", "%", 62.0, 65.0, 2, "二五成双"],
  ["球团矿", "SiO2", "%", 3.5, 5.0, 2, "四舍六入五成双"],
  ["球团矿", "抗压强度", "N/个", 2500, undefined, 0, "四舍"],
  ["铁水", "Si", "%", 0.3, 0.65, 3, "四舍六入五成双"],
  ["铁水", "Mn", "%", 0.2, 0.55, 3, "四舍六入五成双"],
  ["铁水", "S", "%", undefined, 0.035, 4, "四舍六入五成双"],
  ["铁水", "P", "%", undefined, 0.12, 3, "四舍六入五成双"],
  ["焦炭", "M40", "%", 80.0, undefined, 1, "四舍"],
  ["焦炭", "M10", "%", undefined, 7.5, 2, "四舍"],
  ["焦炭", "水分", "%", undefined, 7.0, 1, "四舍"],
  ["焦炭", "灰分 Ad", "%", undefined, 13.5, 2, "二五成双"],
  ["混匀矿", "TFe", "%", 56.0, 61.0, 2, "二五成双"],
  ["混匀矿", "水分", "%", 6.0, 9.5, 2, "四舍"],
  ["精粉", "TFe", "%", 65.0, 69.0, 2, "二五成双"],
  ["白灰块", "CaO", "%", 88.0, undefined, 2, "四舍"],
  ["白灰块", "活性度", "mL", 300, undefined, 0, "四舍"],
  ["澳粉", "TFe", "%", 58.0, 63.0, 2, "二五成双"],
  ["烧结矿", "水分", "%", undefined, 9.0, 2, "四舍"],
  ["球团矿", "FeO", "%", undefined, 1.2, 2, "四舍"],
];

export const QUALITY_STANDARDS: QualityStandard[] = STD_ROWS.map(([pro, item, unit, min, max, digits, rule], i) => ({
  id: `QS-${String(i + 1).padStart(3, "0")}`,
  proCode: `P-${String(MATERIALS.findIndex((m) => m.name === pro) + 101).padStart(4, "0")}`,
  proName: pro,
  stdCode: `STD-${pro}-01`,
  inspecCode: `INSP-${String(i + 1).padStart(3, "0")}`,
  inspecName: item,
  unit,
  nOrder: i + 1,
  max,
  min,
  decimalDigit: digits,
  roundRule: rule,
  integerDigit: max !== undefined && max >= 1000 ? 4 : 2,
  section: min !== undefined && max !== undefined ? "[min,max]" : max !== undefined ? "(min,max]" : "[min,max)",
  workshopCode: pro === "铁水" ? "CJ06" : pro === "焦炭" ? "CJ02" : "CJ03",
  remark: "",
}));

/** 品名 → 该品名的全部检验项（L3 主从双表的下表 / TQ0003 的明细下钻都用它） */
export function standardsOf(proName: string): QualityStandard[] {
  return QUALITY_STANDARDS.filter((s) => s.proName === proName);
}

/* ══════════════════════════════════════════════════════════════════════════
   2. 检验委托（TQ0002，真实表 TQL_1000）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * **S3 质量批次状态机**：已创建 → 已取样 → 已制样 → 检验中 → 已判定 → 已报出（可复检）。
 * `cells.ts` 的 `TAG_CLASS` 按这七档配色，所以状态词**必须逐字用这几个**。
 *
 * 委托的**发起方**是规格书 B11 第 7 条的关键：
 * 进厂原燃料由 MR 发起、产成品/副品/铁水由 MES 发起——
 * 所以 `source` 字段（`发起方`）要留着，客户问「这个委托谁起的」时能答。
 * 这里按品名给：原燃料（澳粉/精粉/石灰石）走 ERP-MR，其余走 MES。
 */
const FLOW = ["已创建", "已取样", "已制样", "检验中", "已判定", "已报出"] as const;

/** 铁水委托专属：`feBatchNo`（铁次号）只有铁水行有 */
const IS_IRON = (pro: string) => pro === "铁水";

export const INSPECTION_ORDERS: InspectionOrder[] = Array.from({ length: 96 }, (_, i) => {
  const day = -(6 - Math.floor(i / 16));
  const date = dayOffset(day);
  const pro = pick(["烧结矿", "球团矿", "铁水", "焦炭", "混匀矿", "精粉", "白灰块", "澳粉"], `pro|${date}|${i}`);
  const seed = `io|${pro}|${date}|${i}`;
  const status = FLOW[i % FLOW.length];
  const isIron = IS_IRON(pro);
  const factoryMat = materialByName(pro);
  const unit = pick(
    unitsOfProcess(isIron ? "blast" : pro === "焦炭" ? "coke" : pro === "球团矿" ? "pellet" : "sinter"),
    `u|${seed}`,
  );
  const smpUser = pick(PEOPLE, `su|${seed}`);
  const judgeUser = personByPost("质量主管") ?? pick(PEOPLE, `ju|${seed}`);
  const sampleAt = stamp(date, `${String(7 + (i % 14)).padStart(2, "0")}:${String((i * 11) % 60).padStart(2, "0")}`);
  const judged = status === "已判定" || status === "已报出";
  /* 判定结果：约 8% 不合格——全是合格的话「判定」这一环节就没有意义，
     而不合格又要走「复检」，那正是 S3 状态机末档存在的理由 */
  const passed = i % 13 !== 0;
  return {
    id: `IO-${String(i + 1).padStart(4, "0")}`,
    testNo: `TQL${date.replace(/-/g, "").slice(2)}${String(i + 1).padStart(3, "0")}`,
    status,
    prcsCode: unit ? unit.workshopId : "CJ03",
    prcsName: unit?.name ?? "",
    proCode: factoryMat?.id ?? "",
    proName: pro,
    mtalCode: factoryMat?.id ?? "",
    mtalName: factoryMat?.name ?? pro,
    smpaddrCode: `${unit?.id ?? "SITE"}-SP${(i % 5) + 1}`,
    smpaddrName: `${unit?.name ?? "取样点"} 取样点${(i % 5) + 1}`,
    smpTime: sampleAt,
    smpCnt: (i % 3) + 1,
    serialNum: i + 1,
    batchNo: `B${date.replace(/-/g, "").slice(2)}${String((i % 9) + 1).padStart(2, "0")}`,
    receiveUser: judged ? judgeUser.name : undefined,
    receiveTime: judged ? stamp(date, "10:30:00") : undefined,
    isReport: status === "已报出" ? "是" : "否",
    inspTypeCode: i % 5 === 0 ? "SPOT" : "ROUTINE",
    inspTypeName: i % 5 === 0 ? "抽检" : "常规",
    smpUser: smpUser.name,
    sendUser: pick(PEOPLE, `sd|${seed}`).name,
    sendTime: stamp(date, "09:10:00"),
    /* 铁水专属：铁次号（B2 的 `C_FE_BATCH_NO`）。别的行留空而不是编一个 */
    feBatchNo: isIron ? `T${date.replace(/-/g, "").slice(4)}-${((i % 8) + 1).toString().padStart(2, "0")}` : undefined,
    judgeUser: judged ? judgeUser.name : undefined,
    judgeTime: judged ? stamp(date, "14:05:00") : undefined,
    judgeResult: judged ? (passed ? "合格" : "不合格") : undefined,
    judgeRemark: judged && !passed ? "成分超内控，判退转复检" : undefined,
    bc: SHIFT_CODES[i % 3],
    bz: pick(["T-A", "T-B", "T-C", "T-D"], `bz|${seed}`),
    planId: undefined,
    /* 发起方（B11 第 7 条）：原燃料 ERP-MR 发起、其余 MES 发起 */
    remark: /^(澳粉|精粉|石灰石)$/.test(pro) ? "由 ERP-MR 发起（进厂原燃料）" : "由 MES 发起（产成品/铁水）",
  } satisfies InspectionOrder;
});

/** 质量主管（判定人固定一个人——B9 说周工是质量主管，全站同一个人） */
function personByPost(post: string) {
  return PEOPLE.find((p) => p.post === post);
}

/** 委托流转统计（L7 流程看板每列的头数）——`TQ0002` 的列头计数用它 */
export function inspectionFlow(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of [...FLOW, "复检"]) out[s] = 0;
  for (const o of INSPECTION_ORDERS) out[o.status ?? "已创建"] = (out[o.status ?? "已创建"] ?? 0) + 1;
  /* 不合格但已判定的，额外算进「复检」列——S3 末档是复检，
     列头若不显示它，客户会以为不合格的委托就此消失了 */
  out["复检"] = INSPECTION_ORDERS.filter((o) => o.judgeResult === "不合格").length;
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════
   3. 检验实绩（TQ0003，来自 TQL_1000 + 检化验系统）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 检验批次 + 结果项。
 *
 * **判定由 `QualityStandard` 算出来**，不是写死的：每个结果项拿去和
 * 该品名的 `min`/`max` 比，全部在范围内才合格。
 * 这样 TQ0001 改一个上下限、TQ0003 的判定就跟着变——**两页不可能给出不同结论**，
 * 那正是这条链的意义。也正因如此，本文件里没有任何一行写「合格」，
 * 只有 `pass` 这个由标准推出来的布尔。
 */
function judge(proName: string, items: QualityResult[]): boolean {
  for (const it of items) {
    const std = QUALITY_STANDARDS.find((s) => s.proName === proName && s.inspecName === it.itemName);
    if (!std) continue;
    if (std.min !== undefined && it.value < std.min) return false;
    if (std.max !== undefined && it.value > std.max) return false;
  }
  return true;
}

export const QUALITY_BATCHES: QualityBatch[] = INSPECTION_ORDERS.filter((o) => o.judgeResult !== undefined).map(
  (o, i) => {
    const proName = o.proName ?? "烧结矿";
    const date = String(o.smpTime ?? DEMO_DATE).slice(0, 10);
    const seed = `qb|${o.testNo}`;
    const stds = standardsOf(proName);
    const items: QualityResult[] = stds.map((std, k) => {
      /* 在上下限内取值：大部分合格，少数几项（约 1/8）故意压出界，由 `judge` 判出不合格 */
      const outOfBand = k === 0 && i % 16 === 0;
      const lo = std.min ?? (std.max ?? 100) * 0.7;
      const hi = std.max ?? lo * 1.4;
      const value = outOfBand
        ? Math.round(
            (std.max !== undefined ? std.max + (hi - lo) * 0.06 : Math.max(0, lo - (hi - lo) * 0.06)) *
              10 ** std.decimalDigit!,
          ) /
          10 ** std.decimalDigit!
        : Math.round(between(lo, hi, `v|${seed}|${k}`, std.decimalDigit ?? 2) * 10 ** (std.decimalDigit ?? 2)) /
          10 ** (std.decimalDigit ?? 2);
      return {
        itemId: std.inspecCode ?? std.id,
        itemName: std.inspecName,
        value,
        unit: std.unit ?? "",
        /* 方法：化验标准方法名——客户看的是「怎么做出来的」，不是「多少」 */
        method: /TFe|SiO2|CaO|FeO|Al2O3|MgO/.test(std.inspecName ?? "")
          ? "X 射线荧光光谱法"
          : /水分|Vdaf|Ad/.test(std.inspecName ?? "")
            ? "重量法"
            : "仪器法",
        operator: pick(PEOPLE, `op|${seed}|${k}`).name,
      } satisfies QualityResult;
    });
    const pass = judge(proName, items);
    return {
      id: `QB-${String(i + 1).padStart(4, "0")}`,
      materialId: o.mtalCode,
      productName: proName,
      /* 三个来源都要有（B2 的 `source` 字段）：铁水行一定是「铁水」，
       原燃料是「进厂」，烧结/球团产出是「工序产出」——少一个下拉就筛不出它 */
      source: proName === "铁水" ? "铁水" : ["澳粉", "精粉", "石灰石"].includes(proName) ? "进厂" : "工序产出",
      batchNo: o.batchNo ?? "",
      sampleTime: o.smpTime ?? stamp(date, "09:00:00"),
      items,
      overallGrade: pass ? "合格" : "不合格",
      status:
        o.status === "已报出" ? "已报出" : o.status === "已判定" ? "已判定" : o.status === "检验中" ? "检验中" : "待检",
      process:
        proName === "铁水"
          ? "blast"
          : proName === "焦炭"
            ? "coke"
            : ["球团矿", "精粉"].includes(proName)
              ? "pellet"
              : ["白灰块"].includes(proName)
                ? "lime"
                : "sinter",
      feBatchNo: o.feBatchNo,
      remark: pass ? "" : "成分超内控，已转复检",
    } satisfies QualityBatch;
  },
);
