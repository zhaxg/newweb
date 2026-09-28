import type { DemandPlan, MonthlyPlan, PurchasePlan, TechIndicatorPlan } from "@/api/mes4tq/types";
import { MATERIALS, UNITS, materialByName, unitsOfProcess } from "./org";
import { DEMO_PERIOD, between, dayOffset, pick } from "./model";
import { indicatorPlanValue, TECH_INDICATORS } from "./basic";

/**
 * TP 计划管理的种子（TP0001-TP0004 四页）。
 *
 * 这四页是**一条倒推链**，不是四张互不相干的表：
 * ```
 * TP0001 技经指标（目标口径）
 * TP0002 月生产计划  铁水 → 烧结 → 球团 → 原料 逐级倒推
 * TP0003 需求计划    产量计划 × 单耗 → 原料需求量
 * TP0004 采购计划    需求 - 可用库存 - 在途 = 采购建议
 * ```
 * A2 那行「铁水→烧结→球团→原料 倒推」就是 `MonthlyPlan.level` 的含义：
 * level 1 是铁水（炼铁），2 是烧结/球团，3 是原料——**上游派生下游**，
 * 所以四页的数必须能串起来，不能各编各的。
 *
 * ⚠️ 派生的产量（`unitDailyOutput`、`utilization`）不在这儿，本文件只铺**计划的行本身**：
 * 期间、机组、状态、目标值这些不可再分的量。
 */

/* ══════════════════════════════════════════════════════════════════════════
   1. TP0001 技经指标月计划（TMP_2000）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 技经指标月计划：`TG0005` 定义的指标 × 近 6 个月 × 相关机组。
 *
 * `value` 在真实表里是**字符串**（`C_VALUE`），这里照抄这个字段类型——
 * 真实系统的原样与前端的 `parseFloat` 分开处理，才有「与线上字段逐字对齐」可言。
 * `actualValue` 是 NotColumn（由实际产量算），`rate` 由它与计划值现算。
 */
export const TECH_PLANS: TechIndicatorPlan[] = TECH_INDICATORS.filter((i) => i.enabled !== false).flatMap((def) => {
  const months = Array.from({ length: 6 }, (_, i) => 5 - i);
  return months.map((back) => {
    const y = Number(DEMO_PERIOD.slice(0, 4));
    const m = Number(DEMO_PERIOD.slice(4, 6)) - back;
    const month = m <= 0 ? 12 + m : m;
    const year = m <= 0 ? y - 1 : y;
    const period = `${year}${String(month).padStart(2, "0")}`;
    /* 指标与工序绑定：高炉类指标只给高炉机组，其余给烧结机组（TG0005 的 `process` 字段同源） */
    const pool = def.process === "高炉工序" ? unitsOfProcess("blast") : unitsOfProcess("sinter");
    const unit = pool[0];
    const seed = `tp|${def.indicatorName}|${period}|${unit.id}`;
    const plan = indicatorPlanValue(def.indicatorName, period);
    /* 实际值围绕计划抖 ±4%，所以完成率在 96~104% 之间——全是 100% 就看不出「有偏差」 */
    const actual = Math.round(plan * between(0.96, 1.04, `a|${seed}`, 2) * 100) / 100;
    return {
      id: `TP-${def.id}-${period}`,
      year,
      month,
      workshop: def.process === "高炉工序" ? "CJ06" : "CJ03",
      workstation: unit.id,
      planItem: def.indicatorName,
      unit: def.unit,
      planType: def.process === "高炉工序" ? "高炉技经" : "烧结技经",
      value: plan.toFixed(2),
      actualValue: actual,
      /* 完成率按指标方向算：焦比/煤比/单耗类是**越低越好**，完成率要反过来读 */
      rate: Math.round((actual / plan) * 10000) / 100,
      /* 达标口径由指标名判定（指标的性质，不随行变）——见 `TechIndicatorPlan.direction` */
      direction: /焦比|煤比|单耗|成本|返矿率|消耗/.test(def.indicatorName) ? "lower" : "higher",
      remark: "",
    } satisfies TechIndicatorPlan;
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. TP0002 月生产计划（逐级倒推）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 月生产计划：`level` 承载**倒推链的层级**（1 铁水 → 2 烧结/球团 → 3 原料）。
 *
 * `parentId` 把链接上——TP0002 的左树按 level 分组、点上级能看它的下游，
 * 这正是 A2「铁水→烧结→球团→原料 倒推」那句话在数据里的样子。
 *
 * 状态给全五档（草稿/已审核/已下达/执行中/已完成）：`cells.ts` 的 `TAG_CLASS`
 * 为这五档配了色，只给一档等于没演示状态机。
 */
export const MONTHLY_PLANS: MonthlyPlan[] = [
  { level: 1, process: "blast", productType: "铁水", workshop: "CJ06" },
  { level: 2, process: "sinter", productType: "烧结矿", workshop: "CJ03" },
  { level: 2, process: "pellet", productType: "球团矿", workshop: "CJ04" },
  { level: 3, process: "raw", productType: "混匀料", workshop: "CJ01" },
].flatMap((spec, si) => {
  const units = spec.process ? unitsOfProcess(spec.process) : UNITS;
  const months = Array.from({ length: 6 }, (_, i) => 5 - i);
  return months.flatMap((back) => {
    const y = Number(DEMO_PERIOD.slice(0, 4));
    const m = Number(DEMO_PERIOD.slice(4, 6)) - back;
    const month = m <= 0 ? 12 + m : m;
    const year = m <= 0 ? y - 1 : y;
    const period = `${year}${String(month).padStart(2, "0")}`;
    return units.slice(0, 2).map((u, ui) => {
      const seed = `mp|${spec.process}|${period}|${u.id}`;
      const status = ["草稿", "已审核", "已下达", "执行中", "已完成"][(back + ui + si) % 5];
      return {
        id: `MP-${period}-${u.id}`,
        period,
        unitId: u.id,
        productType: spec.productType,
        targetOutput: Math.round(between(4200, 68000, `t|${seed}`, 0)),
        targetQuality: {
          TFe: Math.round(between(55.5, 58.8, `q1|${seed}`, 1) * 10) / 10,
          SiO2: Math.round(between(4.8, 5.9, `q2|${seed}`, 1) * 10) / 10,
          CaO: Math.round(between(9.2, 10.6, `q3|${seed}`, 1) * 10) / 10,
        },
        targetCost: Math.round(between(980, 1320, `c|${seed}`, 2)),
        fuelPlan: {
          焦炭: Math.round(between(360, 400, `f1|${seed}`, 0)),
          喷吹煤: Math.round(between(145, 180, `f2|${seed}`, 0)),
        },
        status,
        level: spec.level,
        /* 上游计划：level 2 的上游是该期的高炉计划，level 3 的上游是烧结计划——
           `parentId` 空着就等于断链，页面上的倒推树会退化成平铺 */
        parentId:
          spec.level === 2
            ? `MP-${period}-${unitsOfProcess("blast")[ui]?.id ?? ""}`
            : spec.level === 3
              ? `MP-${period}-${unitsOfProcess("sinter")[ui]?.id ?? ""}`
              : "",
        remark: back === 0 && status !== "已完成" ? "本月计划待完成" : "",
      } satisfies MonthlyPlan;
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. TP0003 需求计划（产量 × 单耗 → 需求量）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 需求计划：`netDemand = requiredQty - availableStock - inTransit`。
 *
 * 这条等式列上算得出来（三个数都在表里），所以**客户拿计算器就能验**。
 * `availableStock` 刻意留约 15% 的行是**负净需求**（库存够、还多），
 * 那种行的 `netDemand` 是负数——页面要能显示成「建议不动」而不是把负号藏起来。
 *
 * 三档状态：草稿 / 已提交 / 已确认（B2 的 `DemandPlan.status`）。
 */
export const DEMAND_PLANS: DemandPlan[] = MONTHLY_PLANS.filter((p) => p.level === 1).flatMap((mp) => {
  /* 铁水计划倒推出的原料需求：高炉要烧结矿+球团矿+焦炭，这是真实配比方向 */
  const needs = ["烧结矿", "球团矿", "焦炭", "焦煤", "石灰石"];
  return needs.map((name, ni) => {
    const mat = materialByName(name);
    const seed = `dp|${mp.id}|${name}`;
    const required = Math.round(between(18000, 96000, `r|${seed}`, 0));
    const available = Math.round(between(0, required * 0.5, `a|${seed}`, 0));
    const inTransit = Math.round(between(0, required * 0.35, `i|${seed}`, 0));
    const net = required - available - inTransit;
    return {
      id: `DP-${mp.id}-${ni}`,
      monthlyPlanId: mp.id,
      materialId: mat?.id ?? "",
      requiredQty: required,
      availableStock: available,
      inTransit,
      netDemand: net,
      status: ["草稿", "已提交", "已确认"][(ni + Number(mp.period.slice(4))) % 3],
      period: mp.period,
      remark: net < 0 ? "库存充裕，本期不需采购" : "",
    } satisfies DemandPlan;
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. TP0004 采购计划（需求 + 库存 + 在途 → 采购建议）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 采购计划：只取**净需求 > 0** 的需求行——负净需求不该生成采购建议，
 * 生成了就是「系统让我买一个库里已经够的东西」，客户看到会当场笑出来。
 */
export const PURCHASE_PLANS: PurchasePlan[] = DEMAND_PLANS.filter((d) => d.netDemand > 0).map((d, i) => {
  const mat = MATERIALS.find((m) => m.id === d.materialId);
  const seed = `pp|${d.id}`;
  /* 供应商随物料走（不同料的合格供方不同），采购量 = 净需求的 90%~110%
     （不整包照搬净需求——现实里会按运量整数取整，留一点上下浮动更真） */
  const qty = Math.round(d.netDemand * between(0.9, 1.1, `q|${seed}`, 0));
  const price = Math.round((mat?.costPrice ?? 800) * between(0.98, 1.03, `p|${seed}`, 2));
  return {
    id: `PP-${d.id}`,
    materialId: d.materialId,
    demandPlanId: d.id,
    suggestQty: qty,
    expectDate: dayOffset(3 + (i % 14)),
    suppId: `SUP-${String((i % 7) + 1).padStart(3, "0")}`,
    suppName: pick(["北方矿产", "远洋贸易", "本地焦化", "熔剂建材", "球团原料", "进口代理", "钢厂联营"], `sn|${seed}`),
    price,
    amount: Math.round(qty * price),
    status: ["草稿", "已提交", "已确认"][(i + 1) % 3],
    remark: "",
  } satisfies PurchasePlan;
});
