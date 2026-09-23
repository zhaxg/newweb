import { ok, type RouteMap } from "./admin/core";

/** 占位：≤5 条随机演示行；写操作只回成功 —— 禁止实现业务 */
function demoRows<T>(n: number, make: (i: number) => T): T[] {
  const count = Math.min(5, Math.max(1, n));
  return Array.from({ length: count }, (_, i) => make(i));
}
const day = (i: number) => `2026-09-0${(i % 9) + 1} 08:00:00`;

const BASE = "/dDH.Service.LIMS.Services/tql1050";

export const sqmRoutes: RouteMap = {
  /* ---------- tql1050（QL1049 一炼钢表面判定 / FrmTql1050） ---------- */
  [`post ${BASE}/queryStorage`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `DEMO-S-${i + 1}`,
        cStove: `S26C0${i + 1}`,
        cPieceNo: `P00${i + 1}A`,
        nProType: 0,
        cLineCode: "LG01",
        cSgCode: "Q235B",
        cSgStd: "GB/T 709-2019",
        cSpec: "20*2200*C",
        nThick: 20,
        nWth: 2200,
        nLen: 8000 + i * 100,
        nNum: 2,
        nCalWgt: 2748.5,
        nWgt: 2800 + i * 10,
        nStatus: 10,
        nQmStatus: 0,
        cStackNo: `A0${i + 1}`,
        nStackNum: i + 1,
        cPrintCode: `H26C0${i + 1}`,
        cCutFlag: "1",
        dProTime: day(i),
        dInTime: day(i),
        pLAN_CSpec: "20*2200*C",
        pLAN_NThickPlan: 20,
        pLAN_NWidthPlan: 2200,
        pLAN_NLlCleanLen: 8000,
        selected: false,
      })),
    ),
  [`post ${BASE}/queryRecord`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `DEMO-R-${i + 1}`,
        cStove: `S26C0${i + 1}`,
        cPieceNo: `P00${i + 1}A`,
        cSlabPieceNo: `SLAB00${i + 1}`,
        cIsDisable: "N",
        cLineCode: "LG01",
        nProType: 0,
        cSgCode: "Q235B",
        cSgStd: "GB/T 709-2019",
        cSpec: "20*2200*C",
        nNum: 2,
        nCalWgt: 2748.5,
        nWgt: 2800 + i * 10,
        cSurfaceResult: 10,
        cSurfaceCategory: "10",
        cSurfaceDefectCode: `D0${i + 1}`,
        cSurfaceDesc: "演示行，无缺陷",
        cSurfaceUser: "admin",
        dSurfaceTime: day(i),
        cShiftNo: "早",
        cGroupNo: "甲班",
        nThick: 20,
        nWth: 2200,
        nLen: 8000 + i * 100,
        nLenMin: 7900,
        nLenMax: 8100,
        selected: false,
        creator: "admin",
        createTime: day(i),
      })),
    ),
  [`post ${BASE}/setDisable`]: (config) => ok(config, null),

  /* ---------- testItem（QL8100 动态列字典：试验项目 / 子项名称） ---------- */
  ["post /dDH.Service.SQM.Services/testItem/queryTestItems"]: (config) =>
    ok(config, [
      { testItemType: "P", testItemCode: "T001", testItemName: "拉伸" },
      { testItemType: "I", testItemCode: "T002", testItemName: "冲击" },
      { testItemType: "B", testItemCode: "T003", testItemName: "弯曲" },
    ]),
  ["post /dDH.Service.SQM.Services/testItem/querySubItems"]: (config) =>
    ok(config, [
      { testItemCode: "T001", testSubItemCode: "P101", testSubItemName: "上屈服强度" },
      { testItemCode: "T001", testSubItemCode: "P106", testSubItemName: "下屈服强度" },
      { testItemCode: "T002", testSubItemCode: "P201", testSubItemName: "抗拉强度" },
    ]),
};
