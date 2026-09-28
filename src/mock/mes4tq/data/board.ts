import type { BoardData, BoardKpi, BoardSeries } from "@/api/mes4tq/types";
import { PROCESS_NAME, unitsOfProcess } from "./org";
import {
  DEMO_DATE,
  between,
  cokeRatio,
  coalRatio,
  paramSnapshot,
  passRate,
  utilization,
  unitDailyOutput,
} from "./model";
import { TAPPING_ACTUALS, TAPPING_PLANS } from "./iron";
import { DAILY_STATS } from "./report";

/**
 * TD 大屏看板的数据构造（3 张屏共用一个构造器）。
 *
 * **屏上没有一处手写数字**：KPI 与曲线的每个值都来自 `model.ts` 的派生函数
 * （`unitDailyOutput` / `utilization` / `cokeRatio` / `coalRatio` /
 * `passRate` / `paramSnapshot`）或既有的事件表（出铁计划、过磅台账、日报）。
 * 这不是洁癖——客户会**拿大屏与报表页交叉核**，
 * 两处必须相等，否则露出「两套数据」的马脚，而这种露馅在演示里最难圆场。
 *
 * 三张屏**版式完全一致**（B8 给的工艺区域色 + KPI 墙 + 曲线 + 报警条），
 * 差别只在数据与那块工艺色的 `areaKey`——所以页面也只有一份 `ScreenBoard.vue`。
 *
 * ⚠️ 曲线是**近 12 小时**的确定性抖动（围绕当前值），不是真实时序库：
 * 演示要看的是「曲线长什么样」，不是精确回放。抖动 seed 含机组与小时，
 * 所以同一次会话内重绘不会变，来回切换屏幕数字是稳的。
 */

/** 屏的外观壳（不含数据，给 `/tqmes/board/shell` 用） */
export interface BoardShell {
  kind: BoardKind;
  title: string;
  /** `tqTheme.TQ_AREA` 的键——**颜色不进 mock**，屏的配色归 `pages/mes4tq/tqTheme.ts` 管 */
  areaKey: string;
  /** 屏底部的口径说明（客户扫一眼就知道这屏在说什么） */
  footer: string;
}

export type BoardKind = "sinter" | "blast" | "iron";

/* ── 曲线工具 ──────────────────────────────────────────── */

/** 近 `n` 个时间点的标签（小时），升序 */
function hours(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `${String((24 - n + i) % 24).padStart(2, "0")}:00`);
}

/** 围绕 `base` 的确定性抖动序列；`seed` 含业务键，同键同线 */
function wobble(base: number, n: number, seed: string, jitter = 0.04, digits = 1): number[] {
  return Array.from({ length: n }, (_, i) => {
    const v = base * (1 + between(-jitter, jitter, `${seed}|${i}`, 4));
    return Math.round(v * 10 ** digits) / 10 ** digits;
  });
}

/** 用三档状态词给 KPI 上色（正常/预警/报警）——判定在 model，这里只按阈值贴标签 */
function statusOf(v: number, lo: number, hi: number): string {
  if (v < lo || v > hi) return "报警";
  if (v < lo * 1.03 || v > hi * 0.97) return "预警";
  return "正常";
}

/* ══════════════════════════════════════════════════════════════════════════
   三张屏的壳
   ══════════════════════════════════════════════════════════════════════════ */

export const BOARD_SHELL: Record<BoardKind, BoardShell> = {
  sinter: {
    kind: "sinter",
    title: "烧结生产大屏",
    areaKey: "sinter",
    footer: "2×360m² 烧结机 · 年产能 700 万 t · 指标口径见 TR0001 生产日报",
  },
  blast: {
    kind: "blast",
    title: "高炉运行大屏",
    areaKey: "blast",
    footer: "3×1800m³ 高炉 · 铁水 500 万 t/年 · 利用系数按天算（t/m³·d）",
  },
  iron: {
    kind: "iron",
    title: "铁水运行信息汇总",
    areaKey: "ladle",
    footer: "铁水以铁次为基本单元（B11 第 2 条）· 台账数据与 TM0003 同源",
  },
};

/* ══════════════════════════════════════════════════════════════════════════
   各屏的数据
   ══════════════════════════════════════════════════════════════════════════ */

/** TD0001 烧结生产大屏 */
function buildSinter(): BoardData {
  const units = unitsOfProcess("sinter");
  const u = units[0];
  const date = DEMO_DATE;
  const today = units.reduce((s, x) => s + unitDailyOutput(x.id, date), 0);
  const target = units.reduce((s, x) => s + Math.round(((x.capacity ?? 0) * 10000) / 365), 0);
  /* 主抽负压是**负值**（-14500 Pa 量级），所以状态判定要按绝对值的两端算 */
  const snap = paramSnapshot(u.id, "sinter", `${date} 08:00`);
  const neg = snap.params.negativePressure ?? -14500;
  const alarmKeys = new Set(snap.alarms);

  const kpis: BoardKpi[] = [
    {
      key: "today",
      label: "今日产量",
      value: today,
      unit: "t",
      target,
      status: statusOf(today, target * 0.9, target * 1.15),
    },
    { key: "util", label: "利用系数", value: utilization(u.id, date), unit: "t/(m²·h)", target: 1.15, status: "正常" },
    {
      key: "return",
      label: "返矿率",
      value: snap.params.returnOreRate ?? 18.5,
      unit: "%",
      target: 18,
      status: statusOf(snap.params.returnOreRate ?? 18.5, 12, 24),
    },
    {
      key: "speed",
      label: "机速",
      value: snap.params.machineSpeed ?? 1.85,
      unit: "m/min",
      target: 1.85,
      status: alarmKeys.has("machineSpeed") ? "报警" : "正常",
    },
    {
      key: "neg",
      label: "主抽负压",
      value: neg,
      unit: "Pa",
      target: -14500,
      status: alarmKeys.has("negativePressure") ? "报警" : "正常",
    },
    {
      key: "pass",
      label: "合格品率",
      value: passRate(u.id, date),
      unit: "%",
      target: 99,
      status: statusOf(passRate(u.id, date), 97, 100),
    },
  ];

  const times = hours(12);
  const series: BoardSeries[] = [
    { name: "产量 t/h", unit: "t/h", data: wobble(today / 24, 12, `sinter|out|${u.id}`, 0.06, 0) },
    {
      name: "机速 m/min",
      unit: "m/min",
      data: wobble(snap.params.machineSpeed ?? 1.85, 12, `sinter|sp|${u.id}`, 0.05, 2),
    },
    { name: "主抽负压 Pa", unit: "Pa", data: wobble(neg, 12, `sinter|neg|${u.id}`, 0.04, 0) },
  ];

  /* 报警条取自日报与参数快照——**屏上的报警与报表页必须同源** */
  const alarms = [
    ...Object.keys(snap.alarms).map((k) => ({
      clock: stampNow(),
      level: "一般",
      text: `${u.name} ${k} 超出正常区间（判定在 model.paramSnapshot）`,
    })),
    ...DAILY_STATS.filter((r) => r.indicator === "产量" && r.planValue != null && r.value < r.planValue)
      .slice(-2)
      .map((r) => ({ clock: r.period, level: "提示", text: `${r.target} 当日产量未达计划` })),
  ];

  return { title: BOARD_SHELL.sinter.title, clock: stampNow(), kpis, times, series, alarms };
}

/** TD0002 高炉运行大屏 */
function buildBlast(): BoardData {
  const units = unitsOfProcess("blast");
  const u = units[0]; // 主演是 3#（B9 种子数写的就是它），曲线取第一台做代表
  const hero = units.find((x) => x.id === "GL01-03") ?? u;
  const date = DEMO_DATE;
  const today = units.reduce((s, x) => s + unitDailyOutput(x.id, date), 0);
  const target = units.reduce((s, x) => s + Math.round(((x.capacity ?? 0) * 10000) / 365), 0);
  const snap = paramSnapshot(hero.id, "blast", `${date} 08:00`);

  const kpis: BoardKpi[] = [
    {
      key: "today",
      label: "今日铁水",
      value: today,
      unit: "t",
      target,
      status: statusOf(today, target * 0.9, target * 1.15),
    },
    {
      key: "util",
      label: "利用系数",
      value: utilization(hero.id, date),
      unit: "t/(m³·d)",
      target: 2.1,
      status: "正常",
    },
    {
      key: "coke",
      label: "焦比",
      value: cokeRatio(hero.id, date),
      unit: "kg/t",
      target: 380,
      status: statusOf(cokeRatio(hero.id, date), 340, 400),
    },
    { key: "coal", label: "煤比", value: coalRatio(hero.id, date), unit: "kg/t", target: 165, status: "正常" },
    {
      key: "hot",
      label: "热风温度",
      value: snap.params.hotBlastTemp ?? 1180,
      unit: "℃",
      target: 1180,
      status: paramStatus(snap.alarms, "hotBlastTemp"),
    },
    {
      key: "perm",
      label: "透气性指数",
      value: snap.params.permeability ?? 2.86,
      unit: "—",
      target: 2.9,
      status: paramStatus(snap.alarms, "permeability"),
    },
  ];

  const times = hours(12);
  const series: BoardSeries[] = [
    {
      name: "热风温度 ℃",
      unit: "℃",
      data: wobble(snap.params.hotBlastTemp ?? 1180, 12, `blast|hot|${hero.id}`, 0.03, 0),
    },
    {
      name: "透气性指数",
      unit: "—",
      data: wobble(snap.params.permeability ?? 2.86, 12, `blast|perm|${hero.id}`, 0.07, 2),
    },
    {
      name: "炉顶压力 kPa",
      unit: "kPa",
      data: wobble(snap.params.topPressure ?? 220, 12, `blast|top|${hero.id}`, 0.04, 0),
    },
  ];

  const alarms = [
    ...Object.keys(snap.alarms).map((k) => ({
      clock: stampNow(),
      level: "重大",
      text: `${hero.name} ${k} 超出正常区间（B7「模拟高炉波动」的落点）`,
    })),
    ...TAPPING_PLANS.filter((p) => p.status === "已取消")
      .slice(-1)
      .map((p) => ({
        clock: p.tapTime,
        level: "提示",
        text: `${p.furnaceId} 第 ${p.tapNo} 铁次已取消：${p.remark || "高炉临时调整"}`,
      })),
  ];

  return { title: BOARD_SHELL.blast.title, clock: stampNow(), kpis, times, series, alarms };
}

/** TD0003 铁水运行信息汇总 */
function buildIron(): BoardData {
  const date = DEMO_DATE;
  const today = TAPPING_PLANS.filter((p) => p.tapTime.startsWith(date));
  const done = today.filter((p) => p.status === "已完成");
  const inTransit = TAPPING_PLANS.filter((p) => p.status === "出铁中");
  const actuals = TAPPING_ACTUALS.filter((a) => a.tapStartTime.startsWith(date));
  const avgTemp = actuals.length ? Math.round(actuals.reduce((s, a) => s + a.temperature, 0) / actuals.length) : 0;
  const avgDrop = actuals.length ? Math.round(actuals.reduce((s, a) => s + a.tempDrop, 0) / actuals.length) : 0;
  const cast = done.filter((p) => p.destination === "铸铁").length;

  const kpis: BoardKpi[] = [
    { key: "todayTap", label: "今日铁次", value: today.length, unit: "次", target: 72, status: "正常" },
    { key: "done", label: "已完成", value: done.length, unit: "次", status: "正常" },
    {
      key: "transit",
      label: "在途",
      value: inTransit.length,
      unit: "次",
      status: inTransit.length > 6 ? "预警" : "正常",
    },
    {
      key: "temp",
      label: "平均过磅温度",
      value: avgTemp,
      unit: "℃",
      target: 1420,
      status: statusOf(avgTemp, 1380, 1500),
    },
    { key: "drop", label: "平均温降", value: avgDrop, unit: "℃", target: 60, status: statusOf(avgDrop, 25, 75) },
    { key: "cast", label: "走铸铁", value: cast, unit: "次", status: "正常" },
  ];

  const times = hours(12);
  /* 温度曲线围绕今日均温抖动；若今日还没有过磅行，给一个可读的兜底值
     （**不能给 0**——0℃ 的铁水会让整屏看起来是坏的） */
  const baseTemp = avgTemp || 1460;
  const series: BoardSeries[] = [
    { name: "过磅温度 ℃", unit: "℃", data: wobble(baseTemp, 12, `iron|t|${date}`, 0.02, 0) },
    { name: "温降 ℃", unit: "℃", data: wobble(avgDrop || 55, 12, `iron|d|${date}`, 0.18, 0) },
    { name: "罐数（在途）", unit: "个", data: wobble(inTransit.length || 4, 12, `iron|n|${date}`, 0.3, 0) },
  ];

  const alarms = [
    ...actuals
      .filter((a) => a.tempDrop >= 70)
      .slice(-2)
      .map((a) => ({
        clock: a.tapStartTime,
        level: "提示",
        text: `${a.ladleId} 温降 ${a.tempDrop}℃（≥70 要看转运距离）`,
      })),
    ...TAPPING_PLANS.filter((p) => p.status === "已取消")
      .slice(-1)
      .map((p) => ({ clock: p.tapTime, level: "一般", text: `${p.furnaceId} 第 ${p.tapNo} 铁次取消：${p.remark}` })),
  ];

  return { title: BOARD_SHELL.iron.title, clock: stampNow(), kpis, times, series, alarms };
}

/** 报警条的时间戳用演示日而不是真实时钟——**屏上不该出现与演示日不同的日期** */
function stampNow(): string {
  return `${DEMO_DATE} 08:00:00`;
}

/**
 * 某个参数是否超限：只查 `model.paramSnapshot()` 给出的 `alarms`，
 * **页面与本文件都不重算**——两处判定必然会出现两处不同结论
 * （这正是 `RunningBoard` 文件头反复强调的那一条）。
 */
function paramStatus(alarms: string[], key: string): string {
  return alarms.includes(key) ? "报警" : "正常";
}

/**
 * 三张屏的构造器。
 *
 * 用**函数**而不是常量对象：数据要每 5s 重取一次（屏是轮询的），
 * 常量会在装配那一刻固化，轮询拿回同一个对象、数字永远不跳。
 */
export const BOARD_BY_KIND: Record<BoardKind, () => BoardData> = {
  sinter: buildSinter,
  blast: buildBlast,
  iron: buildIron,
};

/** 工序名的再导出（屏的副标题用） */
export { PROCESS_NAME };
