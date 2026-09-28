import type { Alarm, SensorPoint } from "@/api/equipment/types";

/**
 * 演示用「数据模拟后台」的**参数表**（附录 B4 的取巧点）。
 *
 * equipment.md 明确：样板系统不真去对接 MES/PLC，客户要看的是**效果**——
 * 曲线会动、阈值会报、工单会生成、钱会自动算。所以「怎么造数据」这件事
 * 必须有一处集中登记，而不是散在各页的定时器里：
 *   - `SIM_PARAM`：每个测点围绕什么值抖动、抖动多宽（工程上的正常波动带宽，不是随机噪声强度）；
 *     没登记的测点取种子里的当前值 ±2%。
 *   - `SIM_STEP_MS`：实时监控页的喂数节拍。
 *
 * 另有一份**故障剧本**（`SIM_SCRIPT_F4`）：主线第 3 幕要在 20 秒里把
 * F4 主传动电机轴承温度从 61℃ 拉到 85℃ 触发「报警级」，
 * 这是整场演示的起点，所以它的曲线形状单独定义、写死在这里。
 */

/** 测点抖动参数：[基线, 半幅]；温度/振动给小数 */
const SIM_PARAM: Record<string, [number, number]> = {
  "PT-SJFJ01-01": [3.4, 0.5],
  "PT-SJFJ01-02": [46.0, 1.2],
  "PT-SJFJ02-01": [58.4, 1.5],
  "PT-SJFJ02-02": [780, 18],
  "PT-SJHL01-01": [4.1, 0.6],
  "PT-SJYH01-01": [214, 8],
  "PT-SJDC01-01": [2.4, 0.4],
  "PT-LTNP01-01": [96, 5],
  "PT-LTTR01-01": [6.6, 0.5],
  "PT-LTTR01-02": [11230, 60],
  "PT-LTTR01-03": [71.2, 1.6],
  "PT-LTYA01-01": [62.0, 1.8],
  "PT-LTYA01-02": [158, 7],
  "PT-LTRF01-01": [1180, 14],
  "PT-LTJL01-01": [68, 4],
  "PT-LGYQ01-01": [64.5, 1.6],
  "PT-LGYQ01-02": [242, 10],
  "PT-LGJJ01-01": [5.3, 0.5],
  "PT-LGDZ01-01": [4.8, 0.5],
  "PT-LGDZ01-02": [312, 12],
  "PT-LGLZ01-01": [55.0, 1.4],
  "PT-BXCZ01-01": [3.8, 0.5],
  "PT-BXCZ01-02": [690, 20],
  "PT-BXZZ01-01": [4.5, 0.6],
  "PT-BXJZ01-01": [6.9, 0.6],
  "PT-BXJZ01-02": [1850, 25],
  "PT-BXTS01-01": [82.6, 1.4],
  "PT-BXTS01-02": [7.4, 0.8],
  "PT-BXGL01-01": [88, 4],
  "PT-BXKS01-01": [2.1, 0.3],
  "PT-BRTG01-01": [132, 6],
  "PT-BRR101-01": [5.1, 0.5],
  "PT-BRR101-02": [66.3, 1.5],
  "PT-BRF401-01": [6.2, 0.6],
  "PT-BRF401-02": [49.5, 1.3],
  "PT-BRF402-01": [74.8, 1.5],
  "PT-BRF402-02": [1486, 26],
  "PT-BRF403-01": [61.2, 0.8],
  "PT-BRF403-02": [5.9, 0.5],
  "PT-BRQQ01-01": [4.3, 0.5],
  "PT-BRAG01-01": [44.0, 1.2],
  "PT-GGJR01-01": [1240, 12],
  "PT-GGCK01-01": [21.4, 0.5],
  "PT-GGPQ01-01": [168, 3],
};

export function simParam(point: SensorPoint): [number, number] {
  return SIM_PARAM[point.id] ?? [point.value, Math.max(Math.abs(point.value) * 0.02, 0.3)];
}

/** 喂数节拍：20 秒走完剧本第 3 幕，太慢销售讲不完、太快客户看不清 */
export const SIM_STEP_MS = 500;

/**
 * 主线剧本温度爬升：把 F4 电机轴承（PT-BRF403-01）从 61℃ 线性推到 88℃。
 *
 * 为什么是「剧本」而不是随机游走：演示必须**可重复**——讲到这一幕点一下按钮，
 * 曲线就一定在 20 秒内越过 70（预警）、80（报警）两道线，最后停在 85~88 触发「报警级」。
 * 随机数据会把这一幕变成抽奖。
 *
 * **这里只登记曲线形状，不产报警**：报警一律由 `store.pushSample()` 按测点规则生成，
 * 否则同一套产警/去重逻辑会在这里和 store 里各写一份，两边口径迟早分叉。
 */
export const SIM_SCRIPT_F4 = {
  pointId: "PT-BRF403-01",
  eqId: "EQ-BR-F4-03",
  from: 61.2,
  to: 88.4,
  /** 步数 = 20s / SIM_STEP_MS */
  steps: 40,
};

/** 报警编号：按日切 `ALM-yyyyMMdd-nn`，与种子里的编号同构，现场生成的和预置的分不出来。 */
export function nextAlarmId(alarms: Alarm[], at: string): string {
  const day = at.slice(0, 10).replace(/-/g, "");
  let max = 0;
  for (const a of alarms) {
    if (!a.id.startsWith(`ALM-${day}-`)) continue;
    const n = Number(a.id.slice(11));
    if (n > max) max = n;
  }
  return `ALM-${day}-${String(max + 1).padStart(2, "0")}`;
}

/** 工单编号同上一条规则 */
export function nextWorkOrderId(orders: Array<{ id: string }>, at: string): string {
  const day = at.slice(0, 10).replace(/-/g, "");
  let max = 0;
  for (const w of orders) {
    if (!w.id.startsWith(`WO-${day}-`)) continue;
    const n = Number(w.id.slice(12));
    if (n > max) max = n;
  }
  return `WO-${day}-${String(max + 1).padStart(2, "0")}`;
}

/** 请购单编号（全表递增即可，PR 不按日切） */
export function nextPurchaseId(rows: Array<{ id: string }>): string {
  let max = 0;
  for (const r of rows) {
    const n = Number(r.id.replace(/^PR-?/, ""));
    if (n > max) max = n;
  }
  return `PR-${String(max + 1).padStart(3, "0")}`;
}
