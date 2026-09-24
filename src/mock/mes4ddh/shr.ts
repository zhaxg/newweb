import { ok, type RouteMap } from "../admin/core";

/** 占位：≤5 条随机演示行；写操作只回成功 —— 禁止实现业务 */
function demoRows<T>(n: number, make: (i: number) => T): T[] {
  const count = Math.min(5, Math.max(1, n));
  return Array.from({ length: count }, (_, i) => make(i));
}
const day = (i: number) => `2026-09-0${(i % 9) + 1} 08:00:00`;

const S = "/dDH.Service.SHR.Services";
const q4 = (base: string, make: (i: number) => Record<string, unknown>): RouteMap =>
  Object.fromEntries(
    ["queryTiL2me01s", "queryTiL2me02s", "queryTiL2me04s", "queryTiL2me05s", "queryTiL2me06s",
      "queryTiL2me08s", "queryTiL2me09s", "queryTiL2me11s", "queryTiL2me12s", "queryTiL2me14s",
      "queryTiL2me15s", "queryTiL2me16s", "queryTiL2me17s", "queryTiL2me18s", "queryTiL2me19s",
      "queryTiP48j01s", "queryTiP48j02s", "queryTiP48j031s", "queryTiP48j04s", "queryTiP48j05s",
      "queryTiP48j06s", "queryTiP48j07s", "queryTiP48j09s"].map((m) => [
      `post ${base}/${m}`,
      (config: Parameters<typeof ok>[0]) => ok(config, demoRows(3, make)),
    ]),
  );

const row = (i: number) => ({
  id: `DEMO-${i + 1}`,
  cPieceNo: `DEMO-SLAB-${i + 1}`,
  cBatchNo: `B2609${i + 1}`,
  cOrderNo: `ORD2609${i + 1}`,
  createTime: day(i),
  nThick: 12 + i,
  nWidth: 2200,
  nLen: 8000,
  nWgt: 1000 + i * 10,
});

export const shrRoutes: RouteMap = {
  /* ---------- hR4200（HR4200 计划执行 + HR9xxx 实绩页签） ---------- */
  ...q4(`${S}/hR4200`, row),

  /* ---------- hR3000（HR4200 上半部） ---------- */
  [`post ${S}/hR3000/queryThr3000s`]: (config) =>
    ok(config, demoRows(3, (i) => ({ ...row(i), cLineCode: "ZG01", cStove: "S260901" }))),
  [`post ${S}/hR3000/queryThr3010s`]: (config) =>
    ok(config, demoRows(3, (i) => ({ ...row(i), cPlateNo: `P${i + 1}`, cPrintCode: `PR${i + 1}` }))),

  /* ---------- hR9000（HR9xxx 实绩/台账/报表） ---------- */
  [`post ${S}/hR9000/querySlabs`]: (config) => ok(config, demoRows(3, (i) => ({ ...row(i), cStove: "S260901" }))),
  [`post ${S}/hR9000/queryZpSlabs`]: (config) => ok(config, demoRows(3, row)),
  [`post ${S}/hR9000/query9071s`]: (config) => ok(config, demoRows(3, row)),
  [`post ${S}/hR9000/query9072s`]: (config) => ok(config, demoRows(3, row)),
  [`post ${S}/hR9000/queryTiL2me11s`]: (config) => ok(config, demoRows(3, row)),
  [`post ${S}/hR9000/queryTiL2me14s`]: (config) => ok(config, demoRows(3, row)),
  [`post ${S}/hR9000/queryTiL2me08s`]: (config) => ok(config, demoRows(3, row)),
  [`post ${S}/hR9000/queryTiL2me09s`]: (config) => ok(config, demoRows(3, row)),
  [`post ${S}/hR9000/queryTiL2me01s`]: (config) =>
    ok(config, demoRows(3, (i) => ({ ...row(i), zone: "FUR", reason: 1 }))),
  [`post ${S}/hR9000/queryTiL2me14sGroupHz`]: (config) =>
    ok(config, demoRows(3, (i) => ({ cShiftGroup: `G${i + 1}`, nQua: 10 + i, nKLQua: 5, nKLRate: 50, nSLQua: 3, nSLRate: 30, nDQQua: 2, nDQRate: 20 }))),
  [`post ${S}/hR9000/queryTiL2me14sAuthorHz`]: (config) =>
    ok(config, demoRows(3, (i) => ({ author: `U00${i + 1}`, nQua: 9 + i, nKLQua: 4, nKLRate: 40, nSLQua: 3, nSLRate: 30, nDQQua: 2, nDQRate: 30 }))),

  /* ---------- hR4000（剪切实绩/遗留台账/同步） ---------- */
  [`post ${S}/hR4000/queryPrintSjs`]: (config) =>
    ok(config, demoRows(3, (i) => ({ ...row(i), cSlCode: "CS1", cPrint: "1", cStoreCode: "ZG01-01" }))),
  [`post ${S}/hR4000/querySg`]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `SG${i + 1}`, cSgSign: `Q235B${i}` }))),
  [`post ${S}/hR4000/queryYl`]: (config) =>
    ok(config, {
      groupHzs: demoRows(3, (i) => ({ cDate: `2026-09-0${i + 1}`, cGroup: `G${i + 1}`, nQuaNotIn: 5, nQuaJz: 3 })),
      thr4000Dtos: demoRows(3, (i) => ({ ...row(i), cReason: "规格异常" })),
    }),
  [`post ${S}/hR4000/saveYc`]: (config) => ok(config, null),
  [`post ${S}/hR4000/editSj`]: (config) => ok(config, null),
  [`post ${S}/hR4000/sdsl`]: (config) => ok(config, null),
  [`post ${S}/hR4000/addSj`]: (config) => ok(config, null),

  /* ---------- hR4300（计划产出查询） ---------- */
  [`post ${S}/hR4300/queryCc`]: (config) =>
    ok(config, demoRows(3, (i) => ({ ...row(i), cSlCode: "CS1", cTrimFlag: "01" }))),

  /* ---------- hR4500（日产量） ---------- */
  [`post ${S}/hR4500/queryDayCl`]: (config) =>
    ok(config, demoRows(3, (i) => ({ cDate: `2026-09-0${i + 1}`, nQuaCp: 100 + i, nQuaFc: 8, nQuaHq: 40, nQuaJq: 30, nQuaRoll: 30, nQuaCl: 50, nWgtCl: 500, nWgtHq: 200, nWgtJq: 150, nWgtRoll: 150 }))),
  [`post ${S}/hR4500/queryDayHz`]: (config) =>
    ok(config, demoRows(3, (i) => ({ cDate: `2026-09-0${i + 1}`, cShiftGroup: `G${i + 1}`, nAllDlQua: 60, nAllDlWgt: 600, nDlFinishQua: 55, nDlFinishWgt: 550, nDlNotQua: 5, nDlNotWgt: 50, nQuaHq1: 30, nWgtHq1: 300, nQuaDrk: 25, nWgtDrk: 250 }))),

  /* ---------- hR4600（热送/热装统计） ---------- */
  [`post ${S}/hR4600/queryRsl`]: (config) =>
    ok(config, demoRows(3, (i) => ({ date: `2026-09-0${i + 1}`, nQuaTotal: 120, nQua: 100, nRsl: 83.33 }))),
  [`post ${S}/hR4600/queryRzl`]: (config) =>
    ok(config, demoRows(3, (i) => ({ date: `2026-09-0${i + 1}`, group: `G${i + 1}`, nQuaTotal: 120, nQua500: 60, nQua600: 60 }))),

  [`post ${S}/hR4600/queryStoveRslDtos`]: (config) =>
    ok(config, demoRows(3, (i) => ({ cStove: `S26090${i + 1}`, nQua1: 30, nWgt: 3000, nHotQua: 25, nHotWgt: 2500, nDownQua: 5, nDownWgt: 500 }))),

  /* ---------- hR4700（厚/长/宽不合台账） ---------- */
  [`post ${S}/hR4700/queryThickHz`]: (config) =>
    ok(config, demoRows(3, (i) => ({ ...row(i), cSlabNo: `DEMO-SLAB-${i + 1}` }))),
  [`post ${S}/hR4700/queryLenHz`]: (config) => ok(config, demoRows(3, row)),
  [`post ${S}/hR4700/queryWidthHz`]: (config) => ok(config, demoRows(3, row)),

  /* ---------- hR4800/hR4810/hR4830/hR4900（成材率/防瓢曲） ---------- */
  [`post ${S}/hR4800/queryLlCcl`]: (config) =>
    ok(config, demoRows(3, (i) => ({ date: `2026-09-0${i + 1}`, group: `G${i + 1}`, nWgt: 1000, nWgtCp: 950, nRate: 95, nWgt4: 500, nWgtCp4: 475, nRate4: 95, nWgt2: 300, nWgtCp2: 285, nRate2: 95, nWgt0: 200, nWgtCp0: 190, nRate0: 95 }))),
  [`post ${S}/hR4810/get4810Dtos`]: (config) =>
    ok(config, demoRows(3, (i) => ({ ...row(i), cPieceSlabNo: `DEMO-SLAB-${i + 1}`, nWgtCp: 950, nWgtFur: 1000, nWgtLl: 980, nWgtZjb: 960 }))),
  [`post ${S}/hR4810/get4810CclHzDtos`]: (config) => ok(config, demoRows(3, (i) => ({ cDate: `2026-09-0${i + 1}`, nQua: 20, nWgt: 2000, nRate: 95 }))),
  [`post ${S}/hR4810/get4810CclSgCodeHzDtos`]: (config) => ok(config, demoRows(3, (i) => ({ cSgCode: `Q235${i}`, nQua: 20, nWgt: 2000, nRate: 95 }))),
  [`post ${S}/hR4810/get4810CclThickHzDtos`]: (config) => ok(config, demoRows(3, (i) => ({ nThick: 10 + i, nQua: 20, nWgt: 2000, nRate: 95 }))),
  [`post ${S}/hR4810/get4810CclGroupHzDtos`]: (config) => ok(config, demoRows(3, (i) => ({ group: `G${i + 1}`, nQua: 20, nWgt: 2000, nRate: 95 }))),
  [`post ${S}/hR4810/get4810CclDayHzDtos`]: (config) => ok(config, demoRows(3, (i) => ({ cDate: `2026-09-0${i + 1}`, nQua: 20, nWgt: 2000, nRate: 95 }))),
  [`post ${S}/hR4830/queryHR4830Dtos`]: (config) =>
    ok(config, demoRows(3, (i) => ({ cDateTime: `2026-09-0${i + 1}`, cJc: `JC${i + 1}`, nQuaAll: 60, cSgCode: "Q345B", nbc: "2" }))),
  [`post ${S}/hR4900/get4900Dtos`]: (config) => ok(config, demoRows(3, (i) => ({ ...row(i) }))),

  /* ---------- hR9300（工艺判定报表：主查询 + 汇总） ---------- */
  [`post ${S}/hR9300/query9300`]: (config) =>
    ok(config, demoRows(3, (i) => ({ ...row(i), cSgCode: "Q345B", cSpecialMarkGy: "保性能", cPieceNoSlab: `DEMO-SLAB-${i + 1}` }))),
  ...Object.fromEntries(
    ["get9300HzRm", "get9300HzFmStart", "get9300HzFmEnd", "get9300HzRmGroupHz", "get9300HzFmStGroupHz",
      "get9300HzFmEndGroupHz", "get9300HzInFurTimeGroupHz", "get9300HzFinishTempGroupHz",
      "get9300HzFinishTempAuthorHz", "get9300HzEntryTempGroupHz", "get9300HzEntryTempAuthorHz",
      "get9300HzFmTempAuthorHz", "get9300HzFmTempGroupHz", "get9300HzRollTempHz",
      "get9300HzACCTempGroupHz", "get9300HzACCTempAuthorHz"].map((m) => [
      `post ${S}/hR9300/${m}`,
      (config: Parameters<typeof ok>[0]) =>
        ok(config, demoRows(3, (i) => ({ cShiftGroup: `G${i + 1}`, author: `U00${i + 1}`, nQua: 8 + i, nPass: 5, nFail: 1 }))),
    ]),
  ),

  /* ---------- hR9320 / hR9400 / hR9420 / hR9500（台账/跟踪） ---------- */
  [`post ${S}/hR9320/get9320Dtos`]: (config) =>
    ok(config, demoRows(3, (i) => ({ ...row(i), cTestNo: `T26090${i + 1}` }))),
  [`post ${S}/hR9400/getHR9400Dtos`]: (config) =>
    ok(config, demoRows(3, (i) => ({ ...row(i), cBatchOrder: `B26090${i + 1}-1` }))),
  [`post ${S}/hR9400/getHR9410Dtos`]: (config) => ok(config, demoRows(3, (i) => ({ ...row(i) }))),
  [`post ${S}/hR9420/get9420Dtos`]: (config) =>
    ok(config, demoRows(3, (i) => ({ date: `2026-09-0${i + 1}`, group: `G${i + 1}`, nQuaAll: 40, nQuaGroup: 20, nQuaGroupRK: 18, nQuaDayRK: 36 }))),
  [`post ${S}/hR9500/queryOrderGz`]: (config) =>
    ok(config, demoRows(3, (i) => ({ ...row(i) }))),
  [`post ${S}/hR9500/queryOrderKc`]: (config) =>
    ok(config, demoRows(3, (i) => ({ ...row(i), nProType: i === 0 ? 0 : i === 1 ? 10 : 20, cStoreCode: i === 1 ? "ZG01-04" : "ZG01-01", nStatus: i === 2 ? 99 : 1 }))),

  /* ---------- 销售/计划迁移占位（TI1010 / MP3000 queryLines） ---------- */
  ["post /dDH.Service.SHR.Services.InterInfoQuery/tI1010/queryTi1010"]: (config) =>
    ok(config, demoRows(3, (i) => ({ ...row(i), dHeatTime: "2026-09-20 06:00:00", nTempIn: 1180 + i }))),
  ["post /dDH.Service.SHR.Services.InterInfoQuery/tI1010/getDate"]: (config) =>
    ok(config, { begin: "2026-09-20 00:00:00", end: "2026-09-21 00:00:00" }),
  ["post /hmx.Service.Widgets.Services/tPa1000/queryLines"]: (config) =>
    ok(config, [
      { cLineCode: "ZG01", cLineName: "中厚板产线" },
      { cLineCode: "ZG02", cLineName: "卷板产线" },
      { cLineCode: "ZG03", cLineName: "棒材产线" },
      { cLineCode: "ZG04", cLineName: "线材产线" },
      { cLineCode: "LG01", cLineName: "一炼钢" },
    ]),
};
