import type { IronLadle, TappingActual, TappingPlan } from "@/api/mes4tq/types";
import { UNITS, unitsOfProcess } from "./org";
import { DEMO_DATE, between, dayOffset, pick, stamp } from "./model";

/**
 * TM 铁水调度的种子（TM0001 出铁计划 / TM0002 铁水罐 / TM0003 过磅台账）。
 *
 * **铁水以「铁次」为基本单元**（规格书 B11 第 2 条：一个铁次 = 一次出铁，
 * 包含炉号/出铁时间/罐号/重量/质量/去向）。所以三张表全部挂在 `tapNo` 上：
 * 计划定 `tapNo`、罐装那个 `tapNo`、过磅记那个 `tapNo` 的实重——
 * 三者对不上，客户在大屏上看到的罐与台账里的罐就不是同一个。
 *
 * ⚠️ 状态机（B3 的 S4/S5）的词**必须与 `cells.ts` 的 `TAG_CLASS` 逐字一致**：
 * 铁水罐 空/重/烘烤/检修、出铁计划 计划/出铁中/已完成/已取消。
 *
 * ⚠️ 罐的 `lifetime`/`maxLifetime` 是**用了多少次**与**寿命上限**——
 * `lifeRatio` 由它现算（`model` 派生），超限的罐要能在页面上标出来：
 * 超寿命的罐还在装铁水，是现场真实的安全问题，演示里必须能看到。
 */

/* ══════════════════════════════════════════════════════════════════════════
   1. 铁水罐（TM0002，S4 状态机）
   ══════════════════════════════════════════════════════════════════════════ */

/** 罐的寿命上限：正常 800 次，检修后回 0。**超 90% 要标黄、满 100% 要标红** */
const LADLE_MAX_LIFETIME = 800;

/**
 * 30 个罐：多数「重」在途、少数「空」「烘烤」「检修」。
 *
 * 状态分布刻意给**检修 2~3 个**——一台钢厂的罐群里总有在修的，
 * 全是「空/重」反而不真实。而**至少一个罐的寿命用到 95%+**，
 * 那是页面上「罐龄条标红」的演示点（超寿命罐不能再装）。
 */
export const LADLES: IronLadle[] = Array.from({ length: 30 }, (_, i) => {
  const n = String(i + 1).padStart(3, "0");
  const seed = `ld|${n}`;
  const r = between(0, 1, `s|${seed}`, 4);
  const status = r < 0.62 ? "重" : r < 0.84 ? "空" : r < 0.94 ? "烘烤" : "检修";
  /* 第 7 号罐寿命逼近上限——**有意留一个危险样本**，全绿的罐龄条等于没做 */
  const lifetime =
    i === 6
      ? Math.round(between(LADLE_MAX_LIFETIME * 0.95, LADLE_MAX_LIFETIME, `lv|${seed}`, 0))
      : Math.round(between(60, 720, `lv|${seed}`, 0));
  const furnace = UNITS.filter((u) => u.type === "高炉")[i % 3];
  return {
    id: `LAD-${n}`,
    capacity: pick([120, 150, 180], `cap|${seed}`),
    status,
    /* 位置与状态联动：检修的罐一定在检修区、烘烤的一定在烘烤区——
       状态「检修」却显示「运输中」是自相矛盾的，客户一眼看穿 */
    location:
      status === "检修"
        ? "检修区"
        : status === "烘烤"
          ? "烘烤区"
          : status === "重"
            ? pick(["高炉", "运输中"], `loc|${seed}`)
            : "空罐区",
    furnaceId: status === "检修" ? undefined : furnace.id,
    tapNo: status === "重" ? (i % 8) + 1 : undefined,
    lastTappingTime: stamp(dayOffset(-(i % 4)), `${String(6 + (i % 16)).padStart(2, "0")}:40`),
    lifetime,
    maxLifetime: LADLE_MAX_LIFETIME,
    /* 寿命使用率 0-1（`cells.ts` 的 `ratioBarRenderer` 吃它；>0.9 红、>0.85 黄） */
    lifeRatio: Math.round((lifetime / LADLE_MAX_LIFETIME) * 1000) / 1000,
    remark: i === 6 ? "寿命已达 95% 以上，安排下炉次前必须评估" : status === "检修" ? "内衬更换中" : "",
  } satisfies IronLadle;
});

/* ══════════════════════════════════════════════════════════════════════════
   2. 出铁计划（TM0001，S5 状态机）
   ══════════════════════════════════════════════════════════════════════════ */

const DESTINATIONS = ["炼钢1#", "炼钢2#", "铸铁"];

/**
 * 近 7 天 × 3 座高炉 × 每天 8 个铁次 = 168 条计划。
 *
 * `destination` 里**铸铁只占少数**（B2 的 `N_DIRECTION 0=炼钢 1=铸铁`）：
 * 铁水的主去向是炼钢，铸铁是炼钢不接时的兜底。给铸铁 40% 会与现场对不上。
 *
 * 状态给全四档（计划/出铁中/已完成/已取消）——**今天之前的全「已完成」、
 * 当天的混着「出铁中」与「计划」、极少数「已取消」**，
 * 这样看板上四档都有内容，S5 状态机才有东西可演示。
 */
export const TAPPING_PLANS: TappingPlan[] = unitsOfProcess("blast").flatMap((unit) =>
  Array.from({ length: 7 * 8 }, (_, i) => {
    const day = -(6 - Math.floor(i / 8));
    const date = dayOffset(day);
    const seed = `tp|${unit.id}|${date}|${i}`;
    const dayIdx = i % 8;
    const hour = day === 0 ? 8 + dayIdx * 2 : 8 + dayIdx * 2;
    const status =
      day < 0
        ? "已完成"
        : dayIdx < 3
          ? "已完成"
          : dayIdx < 5
            ? "出铁中"
            : dayIdx === 7 && i % 3 === 0
              ? "已取消"
              : "计划";
    const isToday = date === DEMO_DATE;
    return {
      id: `TAP-${date.replace(/-/g, "")}-${unit.id}-${String(dayIdx + 1).padStart(2, "0")}`,
      furnaceId: unit.id,
      /* 铁次号按天从 1 起：**同一天同炉只有一个第 3 铁次**（跨天重号），
         这是现场的真实做法——铁次是「今天的第几次出铁」，不是全局流水 */
      tapNo: dayIdx + 1,
      tapTime: stamp(date, `${String(hour).padStart(2, "0")}:${i % 2 === 0 ? "10" : "40"}`),
      /* 出铁口只用 1#/2#（3 号通常是备用）——三个口同时出铁是违反工艺的 */
      tapHole: i % 3 === 0 ? "1#" : "2#",
      estimatedWeight: Math.round(between(260, 420, `ew|${seed}`, 0)),
      destination: i % 9 === 0 ? DESTINATIONS[2] : i % 2 === 0 ? DESTINATIONS[0] : DESTINATIONS[1],
      status,
      /* 完成的计划才回填罐号与实重；未完成的留空——计划里写着「已装 320t」
         就等于把结果写进了计划，客户会问「还没出铁怎么有实重」 */
      ladleId: status === "已完成" ? `LAD-${String(((i * 7) % 30) + 1).padStart(3, "0")}` : undefined,
      actualWeight: status === "已完成" ? Math.round(between(268, 431, `aw|${seed}`, 0)) : undefined,
      remark: isToday && status === "已取消" ? "高炉临时调整，取消本轮出铁" : "",
    } satisfies TappingPlan;
  }),
);

/* ══════════════════════════════════════════════════════════════════════════
   3. 铁水过磅台账（TM0003）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 台账只取**已完成**的计划——没出完铁水就没有磅重，台账里出现未完成的计划是矛盾的。
 *
 * **温降 `tempDrop` 是这一页最有说服力的数**：出铁到过磅中间要转运，
 * 温度会降 30~80℃。给一个恒定温降（或 0）会让客户觉得数据是编的；
 * 而温降随**罐号与距离**抖动，才像真的。
 */
export const TAPPING_ACTUALS: TappingActual[] = TAPPING_PLANS.filter((p) => p.status === "已完成").map((plan) => {
  const seed = `ta|${plan.id}`;
  const weight = plan.actualWeight ?? Math.round(between(268, 431, `w|${seed}`, 0));
  const tapTemp = Math.round(between(1420, 1520, `tt|${seed}`, 0));
  const drop = Math.round(between(28, 86, `d|${seed}`, 0));
  return {
    id: `TA-${plan.id}`,
    tappingPlanId: plan.id,
    furnaceId: plan.furnaceId,
    tapNo: plan.tapNo,
    tapHole: plan.tapHole,
    tapStartTime: plan.tapTime,
    tapEndTime: stamp(
      plan.tapTime.slice(0, 10),
      `${String(Number(plan.tapTime.slice(11, 13)) + 1).padStart(2, "0")}:25`,
    ),
    ladleId: plan.ladleId ?? "",
    weight,
    temperature: tapTemp - drop,
    destination: plan.destination,
    /* 成分回传：与 TQ0003 的铁水批次口径一致（Si/Mn/S/P），
         所以这四个数能在过磅台账与检验实绩之间对上 */
    si: Math.round(between(0.32, 0.62, `si|${seed}`, 3) * 1000) / 1000,
    mn: Math.round(between(0.22, 0.52, `mn|${seed}`, 3) * 1000) / 1000,
    s: Math.round(between(0.018, 0.034, `s|${seed}`, 4) * 10000) / 10000,
    p: Math.round(between(0.07, 0.115, `p|${seed}`, 3) * 1000) / 1000,
    tempDrop: drop,
    remark: drop > 70 ? "转运距离远，温降偏大" : "",
  } satisfies TappingActual;
});
