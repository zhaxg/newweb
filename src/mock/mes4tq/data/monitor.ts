import type { CokeQualityRecord, HotStoveRecord, PciRun, PushCokeRecord, WasteHeatRecord } from "@/api/mes4tq/types";
import { UNITS, unitsOfProcess } from "./org";
import { SHIFT_CODES, between, dayOffset, pick, stamp } from "./model";
import { PEOPLE } from "./people";

/**
 * TW 运行与作业类的**事件表**：推焦 / 余热 / 喷煤 / 热风炉。
 *
 * 与 `data/work.ts` 的分工：那边是**量的流水**（投料/收料/变料/停机，六道工序同构），
 * 这边是**单机的作业记录**——每个工序都有、但字段各不相同，
 * 所以按事件各开一张表，不硬塞进同一个形状。
 *
 * ⚠️ 业务数字（系数、指标、成本）不在这里；本文件只铺事件行：
 * 单号、时刻、班组、炉号这些不可再分的量。参数快照由 `model.paramSnapshot()` 现算。
 *
 * 确定性：随机走 `model.rng/between/pick`，seed 从业务键拼，刷新两次是同一批数。
 */

/* ══════════════════════════════════════════════════════════════════════════
   1. 推焦作业实绩（TW0203）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 推焦实绩：6 座焦炉 × 近 7 天 × 每炉每天 4 次出焦。
 *
 * 三个 K 系数是这一页的**全部内容**（规格书 A3 的 TWJ003 原文：「推焦电流/系数 K1K2K3」）：
 * - **K1 计划系数**：实出炉数 / 计划炉数，考核「该出的有没有都出」；
 * - **K2 执行系数**：实出炉数 / 实际作业时间能出的炉数，考核「作业效率」；
 * - **K3 操作系数**：正确炉数 / 实出炉数，考核「有没有推错炉、有没有错推」。
 *
 * K3 < 1 意味着**出过错**（比如提前接焦、错推相邻炉），这是要追责的事故，
 * 所以分布上给 95% 的记录 K3=1、5% 落在 0.92~0.99——全是 1 就看不出 K3 在管什么。
 */
export const PUSH_COKE: PushCokeRecord[] = UNITS.filter((u) => u.type === "焦炉").flatMap((unit) =>
  Array.from({ length: 7 * 4 }, (_, i) => {
    const day = -(6 - Math.floor(i / 4));
    const date = dayOffset(day);
    const shift = SHIFT_CODES[i % 3];
    const seed = `pc|${unit.id}|${date}|${i}`;
    const oven = unit.name.replace("#焦炉", "");
    const k3Bad = i % 19 === 0;
    const plan = 24;
    const done = Math.round(between(plan - 3, plan, `k1|${seed}`, 0));
    const eff = Math.round(between(plan - 4, plan, `k2|${seed}`, 0));
    return {
      id: `PC-${unit.id}-${String(i + 1).padStart(4, "0")}`,
      ovenNo: `${oven}#`,
      pushTime: stamp(date, `${String(6 + (i % 18)).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`),
      current: Math.round(between(180, 260, `c|${seed}`, 0)),
      planCokingTime: plan,
      actualCokingTime: Math.round(between(plan - 2, plan + 2, `ac|${seed}`, 0)),
      k1: Math.round((done / plan) * 1000) / 1000,
      k2: Math.round((eff / plan) * 1000) / 1000,
      k3: k3Bad ? Math.round(between(0.92, 0.99, `k3b|${seed}`, 3)) : 1,
      shift,
      team: pick(["T-A", "T-B", "T-C", "T-D"], `tm|${seed}`),
      process: "coke",
      remark: k3Bad ? "错推相邻炉，已按事故追查" : "",
    } satisfies PushCokeRecord;
  }),
);

/* ══════════════════════════════════════════════════════════════════════════
   2. 余热回收监控（TW0406）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 余热回收：2 台烧结机 × 近 7 天 × 每天 8 个采样点。
 *
 * 「除氧器压力」是**双端危险**的参数（低了氧除不尽会腐蚀，高了安全阀起跳），
 * 所以下限给正值、报警条要能两侧标红——页面读 `status` 而不是自己判。
 * `status` 在这里就算好而不是让页面算：页面各判一次就会有两页对同一条给出不同结论。
 */
export const WASTE_HEAT: WasteHeatRecord[] = unitsOfProcess("sinter").flatMap((unit) =>
  Array.from({ length: 7 * 8 }, (_, i) => {
    const day = -(6 - Math.floor(i / 8));
    const date = dayOffset(day);
    const seed = `wh|${unit.id}|${date}|${i}`;
    const drumPressure = between(3.6, 4.6, `dp|${seed}`, 2);
    const drumLevel = between(280, 620, `dl|${seed}`, 0);
    const deaPressure = between(0.02, 0.06, `dep|${seed}`, 3);
    const abnormal = i % 23 === 0;
    return {
      id: `WH-${unit.id}-${String(i + 1).padStart(4, "0")}`,
      unitId: unit.id,
      clock: stamp(date, `${String(6 + (i % 18)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`),
      steamOutput: Math.round(between(38, 72, `so|${seed}`, 1)),
      drumPressure: abnormal ? Math.round(drumPressure * 1.15 * 100) / 100 : drumPressure,
      drumLevel: abnormal ? Math.round(drumLevel * 0.6) : drumLevel,
      deaeratorPressure: abnormal ? 0.01 : deaPressure,
      deaeratorTemp: Math.round(between(102, 116, `dt|${seed}`, 0)),
      process: "sinter",
      /* 异常只在汽包/除氧器两处表现——蒸汽产量保持正常，异常才有「只坏了一处」的真实感 */
      status: abnormal ? "报警" : "正常",
    } satisfies WasteHeatRecord;
  }),
);

/* ══════════════════════════════════════════════════════════════════════════
   2.5 焦炭质量与产量（TW0205）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 焦炭质量日表：6 座焦炉 × 近 14 天。
 *
 * **M40 高于计划算好、M10 低于计划算好**——两个指标方向相反，
 * 所以 `m40Delta` 只对 M40 算，`m10` 页面上按「越低越好」标色，
 * 两个都按「越大越好」处理就会把 M10 变差看成变好。
 *
 * 日产量的量级对齐 B1：6 座焦炉合计约 130 万 t/年 → 单炉日均约 600t。
 */
export const COKE_QUALITY: CokeQualityRecord[] = UNITS.filter((u) => u.type === "焦炉").flatMap((unit) =>
  Array.from({ length: 14 }, (_, i) => {
    const date = dayOffset(-i);
    const seed = `cq|${unit.id}|${date}`;
    const output = Math.round(between(420, 640, `o|${seed}`, 0));
    const qualified = Math.round(output * between(0.965, 0.997, `q|${seed}`, 4));
    const m40 = Math.round(between(79.5, 84.6, `m40|${seed}`, 1));
    const m10 = Math.round(between(6.4, 7.9, `m10|${seed}`, 2));
    const planM40 = 82;
    return {
      id: `CQ-${unit.id}-${date.replace(/-/g, "")}`,
      date,
      ovenNo: unit.name.replace("#焦炉", "") + "#",
      output,
      qualified,
      h2o: Math.round(between(4.2, 7.8, `h|${seed}`, 1) * 10) / 10,
      vdaf: Math.round(between(0.9, 1.6, `v|${seed}`, 2) * 10) / 10,
      ad: Math.round(between(11.8, 14.4, `a|${seed}`, 1) * 10) / 10,
      m40,
      m10,
      s: Math.round(between(0.55, 0.82, `s|${seed}`, 3) * 1000) / 1000,
      m40Delta: Math.round((m40 - planM40) * 10) / 10,
      shift: SHIFT_CODES[i % 3],
      process: "coke",
      /* M40 掉到计划下方时给一句可查的原因，否则客户问「为什么差」页面答不上来 */
      remark: m40 < planM40 ? "配煤比调整后 M40 下移，已通知配料" : "",
    } satisfies CokeQualityRecord;
  }),
);

/* ══════════════════════════════════════════════════════════════════════════
   3. 喷煤制粉运行（TW0605）
   ══════════════════════════════════════════════════════════════════════════ */

/** 三座高炉各配一套喷煤：磨机产量、喷煤量、煤粉仓料位、高炉煤气耗量 */
export const PCI_RUNS: PciRun[] = unitsOfProcess("blast").flatMap((unit) =>
  Array.from({ length: 7 * 8 }, (_, i) => {
    const day = -(6 - Math.floor(i / 8));
    const date = dayOffset(day);
    const seed = `pci|${unit.id}|${date}|${i}`;
    return {
      id: `PCI-${unit.id}-${String(i + 1).padStart(4, "0")}`,
      unitId: unit.id,
      clock: stamp(date, `${String(6 + (i % 18)).padStart(2, "0")}:${String((i * 5) % 60).padStart(2, "0")}`),
      millOutput: Math.round(between(28, 42, `m|${seed}`, 1)),
      /* 喷煤量 = 与炉子负荷挂钩：刻意让 3# 高炉高一点（B9 的种子 3#高炉是主演） */
      coalInjection: Math.round(
        between(unit.id === "GL01-03" ? 18 : 14, unit.id === "GL01-03" ? 26 : 22, `ci|${seed}`, 1),
      ),
      bunkerLevel: Math.round(between(35, 92, `bl|${seed}`, 0)),
      bfgConsumption: Math.round(between(7600, 11800, `bfg|${seed}`, 0)),
      /* 1/17 的采样点处于待机（磨机检修或煤粉仓满），否则 24×7 全在运行不像生产现场 */
      status: i % 17 === 0 ? "待机" : "运行",
      process: "blast",
      remark: i % 17 === 0 ? "煤粉仓满，磨机待机" : "",
    } satisfies PciRun;
  }),
);

/* ══════════════════════════════════════════════════════════════════════════
   4. 热风炉运行（TW0607）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 热风炉：每座高炉 4 座热风炉**轮换送风**（同一时刻只有 2 座送风、2 座燃烧蓄热）。
 *
 * `mode` 必须按「这座高炉内 4 台不会全是送风也不会全是燃烧」来铺——
 * 客户看到 4 台全在送风，就知道这张表是随手生成的。
 * 所以 mode 按 `(炉号序 + 时段序) % 4 < 2` 分配，每个采样点都恰好两送两燃。
 */
export const HOT_STOVES: HotStoveRecord[] = unitsOfProcess("blast")
  .flatMap((unit) =>
    Array.from({ length: 7 * 6 }, (_, i) => {
      const day = -(6 - Math.floor(i / 6));
      const date = dayOffset(day);
      const hh = String(6 + (i % 18)).padStart(2, "0");
      const rows: HotStoveRecord[] = [];
      for (let k = 1; k <= 4; k += 1) {
        const seed = `hs|${unit.id}|${date}|${i}|${k}`;
        const on = (k + i) % 4 < 2;
        rows.push({
          id: `HS-${unit.id}-${String(i + 1).padStart(3, "0")}-${k}`,
          unitId: unit.id,
          clock: stamp(date, `${hh}:${String((i * 7) % 60).padStart(2, "0")}`),
          stoveNo: `${k}#`,
          mode: on ? "送风" : "燃烧",
          gasFlow: Math.round(between(on ? 9000 : 16000, on ? 13000 : 24000, `gf|${seed}`, 0)),
          blastTemp: on ? Math.round(between(1140, 1210, `bt|${seed}`, 0)) : undefined,
          domeTemp: on
            ? Math.round(between(980, 1080, `dt|${seed}`, 0))
            : Math.round(between(1180, 1280, `dt2|${seed}`, 0)),
          switchTime: stamp(date, `${String(2 + k).padStart(2, "0")}:00`),
          process: "blast",
          remark: k === 4 ? "第 4 座为备用，按需投入" : "",
        });
      }
      return rows;
    }),
  )
  .flat();

/* ══════════════════════════════════════════════════════════════════════════
   5. 操作人候选（推焦/换炉这类作业要留人名）
   ══════════════════════════════════════════════════════════════════════════ */

/** 焦化与高炉的作业人（`PEOPLE` 里按 dept 挑，保证人名与全站同一批） */
export const OPERATOR = (seed: string): string => pick(PEOPLE, seed).name;
