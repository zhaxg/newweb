import { ok, type RouteMap } from "./admin/core";

/** 占位：≤5 条随机演示行；写操作只回成功 —— 禁止实现业务 */
function demoRows<T>(n: number, make: (i: number) => T): T[] {
  const count = Math.min(5, Math.max(1, n));
  return Array.from({ length: count }, (_, i) => make(i));
}

const BASE = "/dDH.Service.SMP.Services/fh2000";

export const smpRoutes: RouteMap = {
  /* FH3031 质保书打印 */
  [`post ${BASE}/getZcDetailLst`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `DEMO-MAT-${i + 1}`,
        cMatchId: `WL${260901 + i}`,
        cOrderCustCname: "演示客户",
        cVehicleNo: `冀A0000${i + 1}`,
        nStatus: 3,
        cMatNo: `C${2609010 + i}`,
        nMatCount: 2 + i,
        cSgCode: "Q235B",
        cSgStd: "GB/T 700",
        nMatActWgt: 25.5 + i,
        nMatThick: 12,
        nMatWidth: 1500,
        nMatLen: 8000,
        cTrimFlag: "1",
        cWgtToler: "0",
        cDelivyStatusCode: "YS",
        cComplexDecideCode: 2,
        cDetectResultCode: 0,
        cInboundNo: `RK${i + 1}`,
        cShiftNo: "甲班",
        cGroupNo: "G1",
        creator: "admin",
        createTime: "2026-09-23 08:00:00",
        cShipName: "",
        cPort: "",
        nSelectMode: 2,
        cBillOfLadingNo: `TH${260901 + i}`,
        cTaskId: `TK${i + 1}`,
        cMatCode: "100001",
        cMatName: "热轧卷板",
        cRemark: "",
        cStockRoomNo: `A0${i + 1}`,
        cArer: "A区",
        cReserveField1: "薄板",
        cStove: `L${1001 + i}`,
        cGcStd: "GB/T 709",
        cTsStd: "GB/T 2975",
        cZStd: "",
      })),
    ),
  [`post ${BASE}/getZbsDetailLst`]: (config) =>
    ok(
      config,
      demoRows(2, (i) => ({
        cPieceNo: "C2609010",
        cZbsCode: `ZBS${260901 + i}`,
        creator: "admin",
        createTime: "2026-09-23 09:00:00",
      })),
    ),
};
