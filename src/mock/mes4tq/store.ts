import { reactive } from "vue";

import { FACTORIES, MATERIALS, SILO_BINS, UNITS, WORKSHOPS, silosOfUnit, unitsOfProcess } from "./data/org";
import { PEOPLE, SHIFTS, TEAMS } from "./data/people";
import { DEMO_DATE, DEMO_PERIOD, DEMO_T0, siloState } from "./data/model";

/**
 * 铁区MES mock 的**共享核心状态**。
 *
 * ── 与能源域 store.ts（2160 行）的关系：同名不同命，别照着那边找 ──────────
 * 能源域那份之所以厚，是因为它有**可变状态**：柜位每 3s 抖、报警走状态机、
 * 月账按需重算。本域的范围是「只查桩」——**没有任何写端点**，
 * 所以没有状态机、没有 tick、没有月账重算，这份文件就只剩「把主数据聚成一处」。
 *
 * 这不是"还没写完"，是**范围的直接结果**：一个没有写操作的域不需要 store。
 * 留着这个文件而不是让各路由直接 import `data/*`，是为了两件事：
 * 1. 与 carbon/equipment/energy 三个域**同形**（换一个域看还是同一套结构）；
 * 2. 派生量有地方挂——`unitOutputOf()` 这类"跨模块都要用、但又不属于某一模块"的
 *    取数口，放这里比放某个模块的 data 文件里更像回事。
 *
 * ── 各模块自己的数据不住这里 ──────────────────────────────────────────
 * TG/TP/TB/TS/TQ/TW/TM/TC/TR/TD/TI 十一组种子各在自己的 `data/<模块>.ts`，
 * 由 `routes/<模块>.ts` 直接 import。**刻意不在这里汇总**：
 * 十一个模块的种子汇到一个文件里，改焦化的一条煤种就要动这个全站文件，
 * 而并行开发时它会是所有人的冲突点。
 *
 * ⚠️ 本文件**不写业务数字**（产量、定额、系数、阈值全在 `data/model.ts`），
 * 也不写可变状态（本域没有）。它只做聚合与转发。
 */

/** 共享核心：组织骨架 + 主数据 + 人员班组。全部只读，页面通过路由端点取，不直接 import */
export const tq = reactive({
  factories: FACTORIES,
  workshops: WORKSHOPS,
  units: UNITS,
  silos: SILO_BINS,
  materials: MATERIALS,
  people: PEOPLE,
  teams: TEAMS,
  shifts: SHIFTS,
});

/** 演示时刻（大屏与监控盘显示"数据截止"用；页面不许自己 `new Date()`） */
export const DEMO_CLOCK = { t0: DEMO_T0, date: DEMO_DATE, period: DEMO_PERIOD };

/* ── 跨模块取数口（不属于任何单一模块、但多个模块都要的）────────────────── */

/** 某工序的机组（TW 各页、TR 汇总、TD 大屏都要按工序列机组） */
export { unitsOfProcess };

/** 某机组的料仓 + 当前状态（TG0003 卡片墙、TW 各工序料仓变料页共用） */
export function silosWithState(unitId: string) {
  return silosOfUnit(unitId).map((bin) => {
    const st = siloState(bin.binCode);
    return {
      ...bin,
      /* 当前料种：初始料种（`matrlId`）由 org 给，变料记录会覆盖它——覆盖逻辑在
         `routes/work.ts` 的 `/binChange/current` 里做，因为只有那里知道变料历史 */
      levelPct: st.levelPct,
      stock: st.stock,
      hiLimit: st.hiLimit,
      loLimit: st.loLimit,
      capacity: bin.capacity,
    };
  });
}

/**
 * 装配钩子。
 *
 * 本域**没有需要预热的月账**（无写操作 = 没有"第一个页面打开是空表"的问题），
 * 所以这里是空的。留着它是为了与能源域的 `bootstrap()` 同形——
 * 哪天补了写操作，月账预热该挂在这儿，而不是散进某个页面的 `onMounted`。
 */
export function bootstrap(): void {
  /* 本域只查桩，无预热数据 */
}
