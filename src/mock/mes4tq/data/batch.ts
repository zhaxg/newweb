import type { BatchingItem, BatchingPlan } from "@/api/mes4tq/types";
import { MATERIAL_BY_ID, materialByName, unitsOfProcess } from "./org";
import { DEMO_PERIOD, between } from "./model";

/**
 * TB 配料管理的种子（TB0001 混匀 / TB0002 烧结 / TB0003 球团 / TB0004 高炉）。
 *
 * 四页共用**同一张表 `TPM_2010`**，靠 `process` 分流——这与 TW 六工序的处理同源：
 * 配料计划的字段结构（工位/机组/批次/配比/目标质量/预测成本）在四道工序里完全一致，
 * 差别只是配什么料、配比是多少。拆成四张表会让「改一个计划状态的色」改四处。
 *
 * ── 配比必须归一到 100% ─────────────────────────────────────────────────
 * 这是配料计划**最容易被客户当场抓到的破绽**：配比之和不到 100%，或者 101.3%，
 * 看起来像随手编的。所以 `normalizeRatio()` 生成后强制归一并**把尾差落在最后一项**，
 * 保证 ΣratioPct === 100.0（`selfCheck` 之外的页面自验，见下）。
 *
 * ── 预测成本怎么来 ─────────────────────────────────────────────────────
 * `predictedCost = Σ(配比 × 料号单价) / 100`。单价取 `MATERIALS.costPrice`
 * （TG0002 是全站唯一的成本口径），所以客户拿计算器按一遍能对上，
 * 而且 TG0002 改一次价、这四页的预测成本同步变——这正是 `MATERIALS.costPrice`
 * 是「唯一真源」的证据。
 *
 * 状态机用 S2（草稿→已审核→执行中→已完成，执行中可调整生成新版本）。
 */

/** 每道工序的配比方案：`[料名, 目标配比 %]`，`targetQuality` 是该工序的指标目标 */
interface Recipe {
  process: string;
  mixCenter: string;
  label: string;
  items: Array<[string, number]>;
  quality: Record<string, number>;
  days: number;
}

const RECIPES: Recipe[] = [
  {
    /* TB0001 混匀配料计划：单品种矿配比 / 质量加权 / 成本预测（A3 原文） */
    process: "raw",
    mixCenter: "1#混匀配料工位",
    label: "混匀配料",
    items: [
      ["澳粉", 32],
      ["巴西粉", 24],
      ["精粉", 26],
      ["返矿", 18],
    ],
    quality: { TFe: 57.8, SiO2: 4.6, Al2O3: 1.75, H2O: 7.4 },
    days: 7,
  },
  {
    /* TB0002 烧结配料计划：混匀料+熔剂+燃料+返矿（A3 原文） */
    process: "sinter",
    mixCenter: "1#烧结配料工位",
    label: "烧结配料",
    items: [
      ["混匀矿", 68],
      ["石灰石", 11],
      ["焦粉", 4.5],
      ["返矿", 16.5],
    ],
    quality: { TFe: 57.2, SiO2: 5.3, CaO: 9.8, MgO: 1.9, FeO: 8.1 },
    days: 5,
  },
  {
    /* TB0003 球团配料计划：精粉+膨润土+返矿（A3 原文） */
    process: "pellet",
    mixCenter: "1#球团配料工位",
    label: "球团配料",
    items: [
      ["精粉", 86],
      ["膨润土", 4],
      ["返矿", 10],
    ],
    quality: { TFe: 63.5, SiO2: 4.2, FeO: 0.9, 抗压强度: 2850 },
    days: 6,
  },
  {
    /* TB0004 高炉配料计划：矿焦比/喷煤/燃料消耗（A3 原文） */
    process: "blast",
    mixCenter: "1#高炉装料工位",
    label: "高炉配料",
    items: [
      ["烧结矿", 58],
      ["球团矿", 18],
      ["块矿", 8],
      ["焦炭", 16],
    ],
    quality: { 矿焦比: 5.6, 煤比: 165, 焦比: 380, 低于合格率: 99.5 },
    days: 3,
  },
];

/**
 * 配比归一到 100%：**尾差落在配比最大的那一项上**。
 *
 * 为什么是最大的那项而不是最后一项：把 0.3% 的尾差加在「焦粉 4.5%」上，
 * 那一项立刻从 4.5 变 4.8，客户对着计划核配比时会发现燃料比例变了；
 * 加在占大头的那项上，它的百分比本来就占主导，0.3 的调整在读数上几乎不可见，
 * 而**总量精确回到 100.0**。
 */
function normalizeRatio(raw: Array<[string, number]>, seed: string): BatchingItem[] {
  const jittered = raw.map(
    ([name, pct]) => [name, Math.round(pct * between(0.985, 1.015, `${seed}|${name}`, 1))] as [string, number],
  );
  const sum = jittered.reduce((s, [, p]) => s + p, 0);
  const biggest = jittered.reduce((bi, cur, i) => (cur[1] > jittered[bi][1] ? i : bi), 0);
  jittered[biggest][1] = Math.round((jittered[biggest][1] + (100 - sum)) * 10) / 10;
  return jittered.map(([name, pct]) => {
    const mat = materialByName(name);
    return {
      materialId: mat?.id ?? "",
      materialName: name,
      ratioPct: pct,
      targetWeight: Math.round(pct * 100) / 100,
      actualWeight: undefined,
      deviation: undefined,
      siloId: "",
    } satisfies BatchingItem;
  });
}

/** 预测成本（元/t 产品）：Σ(配比 × 单价) / 100，单价的唯一真源是 `MATERIALS.costPrice` */
function predictedCost(items: BatchingItem[]): number {
  const sum = items.reduce((s, it) => s + (it.ratioPct * (MATERIAL_BY_ID[it.materialId]?.costPrice ?? 0)) / 100, 0);
  return Math.round(sum * 100) / 100;
}

/** 计划状态用 S2（`cells.ts` 的 `TAG_CLASS` 按这五档配色） */
const BATCH_STATUS = ["草稿", "已审核", "执行中", "已完成", "调整"] as const;

export const BATCHING_PLANS: BatchingPlan[] = RECIPES.flatMap((rec) => {
  const units = unitsOfProcess(rec.process);
  const months = Array.from({ length: 3 }, (_, i) => 2 - i);
  return months.flatMap((back) => {
    const y = Number(DEMO_PERIOD.slice(0, 4));
    const m = Number(DEMO_PERIOD.slice(4, 6)) - back;
    const month = m <= 0 ? 12 + m : m;
    const year = m <= 0 ? y - 1 : y;
    const period = `${year}${String(month).padStart(2, "0")}`;
    return units.slice(0, 2).map((u, ui) => {
      const seed = `bp|${rec.process}|${period}|${u.id}`;
      const ratio = normalizeRatio(rec.items, seed);
      const output = Math.round(between(12000, 46000, `o|${seed}`, 0));
      return {
        id: `BP-${rec.process.toUpperCase()}-${period}-${u.id}`,
        planDesc: `${rec.label}计划 · ${period} · ${u.name}`,
        planType: rec.label,
        planTime: `${period}-01 08:30:00`,
        mixCenter: rec.mixCenter,
        /* 最后执行时间只在已执行/已完成的计划上给；草稿给空——
           一个「草稿」计划带着执行时间是自相矛盾的 */
        executeTime: ["执行中", "已完成"].includes(BATCH_STATUS[(back + ui) % 5]) ? `${period}-06 14:20:00` : undefined,
        days: rec.days,
        plannedOutput: output,
        batchNo: `${rec.process.toUpperCase().slice(0, 2)}${period}`,
        status: BATCH_STATUS[(back + ui) % 5],
        /* `nStatus` 是真实表的数字状态（0草稿/1已审核/2执行中/3已完成），与中文 `status` 同源——
           两列并存是因为真实表就是两列，且中文列要显示、数字列要对后端 */
        nStatus: Math.min(3, (back + ui) % 5),
        ratio,
        targetQuality: rec.quality,
        predictedCost: predictedCost(ratio),
        process: rec.process,
        unitId: u.id,
        /* 混匀工序特有的三个计算字段（B2 的 `totalWgt`/`usedWgt`/`surWgt`）：
           平铺总量 → 烧结接收量 → 剩余量，三者等式成立客户能验 */
        totalWgt: rec.process === "raw" ? output : undefined,
        usedWgt: rec.process === "raw" ? Math.round(output * between(0.55, 0.82, `u|${seed}`, 1)) : undefined,
        surWgt: rec.process === "raw" ? Math.round(output - output * between(0.55, 0.82, `u|${seed}`, 1)) : undefined,
        remark: (back + ui) % 5 === 4 ? "执行中调整，生成新版本" : "",
      } satisfies BatchingPlan;
    });
  });
});

/**
 * 配比合计自检：`ΣratioPct` 必须精确等于 100.0。
 *
 * 放在这里而不是 `model.selfCheck()`：`selfCheck` 检的是**派生数字**的守恒，
 * 而配比归一是**种子生成时**的约束，两者的失效时点不同——
 * 生成时就错，`selfCheck` 跑得太晚。dev 装配期直接抛，
 * 演示才不会带着「配比 100.3%」的计划表进场。
 */
if (import.meta.env?.DEV) {
  const bad = BATCHING_PLANS.filter((p) => Math.abs(p.ratio.reduce((s, r) => s + r.ratioPct, 0) - 100) > 0.05);
  if (bad.length) {
    throw new Error(
      `[tqmes] 配料配比未归一到 100%：\n  ${bad
        .map((p) => `${p.id} 合计 ${p.ratio.reduce((s, r) => s + r.ratioPct, 0).toFixed(2)}%`)
        .join("\n  ")}`,
    );
  }
}
