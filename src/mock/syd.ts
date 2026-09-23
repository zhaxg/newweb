import { ok, type RouteMap } from "./admin/core";

/** 占位：≤5 条随机演示行；写操作只回成功 —— 禁止实现业务 */
function demoRows<T>(n: number, make: (i: number) => T): T[] {
  const count = Math.min(5, Math.max(1, n));
  return Array.from({ length: count }, (_, i) => make(i));
}

const ROOM = "/dDH.Service.SYD.Services/tyd1000";
const STACK = "/dDH.Service.SYD.Services/tyd1100";
const PERSON = "/dDH.Service.SYD.Services/tyd1050";
const INV = "/dDH.Service.SYD.Services.Inven/inventory";
const STAT = "/dDH.Service.SYD.Services.InvStat/frmYD9200";

export const sydRoutes: RouteMap = {
  /* ---------- A2 基础数据 ---------- */
  // YD1000 库区 / YD1010 主表（QueryRoom）
  [`post ${ROOM}/queryRoom`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `ROOM-${i + 1}`,
        cStoreCode: `ZG0${i + 1}-01`,
        cStoreDes: `演示库区${i + 1}`,
        cStoreType: "A",
        nType: 0,
        cRemark: "",
        cValidFlag: 1,
        creator: "admin",
        createTime: "2026-09-23 08:00:00",
      })),
    ),
  // YD1010 垛位（QueryStacks）
  [`post ${ROOM}/queryStacks`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `STACK-${i + 1}`,
        cStoreCode: "ZG01-01",
        cStackNo: `D0${i + 1}`,
        cStackType: 0,
        cHallNo: "1",
        nRow: 1 + i,
        nCol: 1,
        cArer: "A",
        nMaxNum: 100,
        nMaxWgt: 500,
        cDefault: "0",
        cRemark: "",
        creator: "admin",
        createTime: "2026-09-23 08:00:00",
      })),
    ),
  // YD1010Map 库位图列表
  [`post ${ROOM}/queryMap`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `MAP-${i + 1}`,
        cName: `演示库位图${i + 1}`,
        cStoreCode: `ZG0${i + 1}-01`,
        creator: "admin",
        createTime: "2026-09-23 08:00:00",
      })),
    ),
  [`post ${ROOM}/delMap`]: (config) => ok(config, null),
  [`post ${ROOM}/addMap`]: (config) => ok(config, null),
  [`post ${ROOM}/saveMap`]: (config) => ok(config, null),

  // YD1100 车辆
  [`post ${STACK}/tyd1100Query`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `CAR-${i + 1}`,
        cStoreCode: "ZG01-01",
        cCarNo: `冀A0000${i + 1}`,
        creator: "admin",
        createTime: "2026-09-23 08:00:00",
      })),
    ),
  [`post ${STACK}/addTyd1100`]: (config) => ok(config, null),
  [`post ${STACK}/saveTyd1100`]: (config) => ok(config, null),
  [`post ${STACK}/delTyd1100`]: (config) => ok(config, null),

  // YD1050 库管科人员
  [`post ${PERSON}/getListAsync`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `EMP-${i + 1}`,
        cCode: `00${i + 1}`,
        cName: `演示人员${i + 1}`,
        cEmployeeId: `SYH${26090 + i}`,
        cTeam: ["A", "B", "C"][i % 3],
        creator: "admin",
        createTime: "2026-09-23 08:00:00",
      })),
    ),
  [`post ${PERSON}/deleteAsync`]: (config) => ok(config, null),
  [`post ${PERSON}/addAsync`]: (config) => ok(config, null),
  [`post ${PERSON}/updateAsync`]: (config) => ok(config, null),
  [`post ${PERSON}/existsAsync`]: (config) => ok(config, false),

  /* ---------- A2 库存盘点 ---------- */
  [`post ${INV}/queryInventoryPlan`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `INVPLAN-${i + 1}`,
        cLineCode: "ZG01",
        cInventoryPlanNo: `PD${260901 + i}`,
        dPlanStartTime: "2026-09-01 00:00:00",
        dPlanEndTime: "2026-09-30 23:59:59",
        cPlanStatus: [0, 10, 20][i % 3],
        cInventoryType: "全盘",
        cPlanDescription: "演示盘点计划",
        creator: "admin",
        createTime: "2026-09-01 08:00:00",
      })),
    ),
  [`post ${INV}/queryInventoryArea`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `INVAREA-${i + 1}`,
        cInventoryPlanNo: "PD260901",
        cStoreCode: `ZG0${i + 1}-01`,
        cStackNo: `D0${i + 1}`,
        creator: "admin",
        createTime: "2026-09-01 08:00:00",
      })),
    ),
  [`post ${INV}/queryInventoryResult`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `INVRES-${i + 1}`,
        cPdResult: 0,
        cStove: `L${1001 + i}`,
        cPieceNo: `C${2609100 + i}`,
        cStackNo: `D0${i + 1}`,
        cStackNum: "1",
        cOrderNo: `DD${2609 + i}`,
        cSgCode: "Q235B",
        cSgStd: "GB/T 700",
        nThick: 12,
        nWth: 1500,
        nLen: 8000,
        nCalWgt: 112.5,
        nWgt: 113.2,
        cInventoryPlanNo: "PD260901",
        cStoreCode: "ZG01-01",
        creator: "admin",
        createTime: "2026-09-23 08:00:00",
      })),
    ),
  [`post ${INV}/startInventoryPlan`]: (config) => ok(config, null),
  [`post ${INV}/editInventoryResults`]: (config) => ok(config, null),
  [`post ${INV}/delPlan`]: (config) => ok(config, null),
  [`post ${INV}/updateInventoryResults`]: (config) => ok(config, null),
  [`post ${INV}/addPlan`]: (config) => ok(config, null),

  /* ---------- A2 入库统计 ---------- */
  [`post ${STAT}/queryStoreList`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        cInboundNo: `RK${260901 + i}`,
        cPieceNo: `C${2609100 + i}`,
        cDestination: "天津港",
        cSgCode: "Q235B",
        nThick: 12,
        nWth: 1500,
        nLen: 8000,
        nCalWgt: 112.5,
        nWgt: 113.2,
        cCutFlag: "1",
        cWgtToler: "0",
        cComplexDecideCode: 2,
        cDetectResultCode: 0,
        cSurfaceResult: 0,
        cStoreCode: "ZG01-01",
        cStackNo: `D0${i + 1}`,
        cStackNum: "1",
        cSourceStoreCode: "LG01-01",
        cSourceStackNo: "S01",
        cSourceStackNum: "1",
        nNum: 1,
        cShiftNo: "甲班",
        cGroupNo: "G1",
        cInUser: "admin",
        dInTime: "2026-09-23 08:00:00",
      })),
    ),
  /* 炼钢 MS9020 火切查询占位 */
  ["post /dDH.Service.SYD.Services/tyd2000/queryStorage"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `ST-${i + 1}`,
        cPieceNo: `P00${i + 1}A`,
        cStove: `S26C0${i + 1}`,
        cSgCode: "Q235B",
        cSpec: "12*1500*C",
        nThick: 12,
        nWth: 1500,
        nLen: 8000,
        nNum: 2,
        nCalWgt: 25.5,
        nStatus: 10,
      })),
    ),
};
