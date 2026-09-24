import { ok, type RouteMap } from "../admin/core";

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

  /* ---------- 仓储物流 · 发货管理（FH1000/1010/2000/3010/4000）占位 ---------- */
  // FH1000 主表：码单（Fh1000）
  [`post ${BASE}/getFh1000Lst`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `FH1000-${i + 1}`,
        cMatchId: `WL${260910 + i}`,
        cBillOfLadingNo: `TH${260910 + i}`,
        cTaskId: `TK${100 + i}`,
        cOrderCustCname: "演示客户",
        cVehicleNo: `冀A0000${i + 1}`,
        nPlanNum: 5 + i,
        nPiece: 3 + i,
        nActWgt: 40.5 + i,
        nGrossWgt: 42.1 + i,
        dWeighTime: "2026-09-23 08:10:00",
        nStatus: 3,
        cOutStockCode: "ZG01-04",
        dDelivyTime: "2026-09-23 10:00:00",
        cPort: "",
        cShipName: "",
        cKhzd: "PC",
        creator: "admin",
        createTime: "2026-09-23 07:30:00",
      })),
    ),
  // FH1000 子表：码单材料（Fh1002）
  [`post ${BASE}/getFh1002Lst`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `FH1002-${i + 1}`,
        cMatchId: `WL${260910 + i}`,
        cMatNo: `C${2609100 + i}`,
        cSgCode: "Q235B",
        cSgStd: "GB/T 700",
        cSpec: `12*1500*8000`,
        cTrimFlag: "1",
        nMatCount: 1 + i,
        nMatActWgt: 12.5 + i,
        nMatThick: 12,
        nMatWidth: 1500,
        nMatLen: 8000,
        cMatName: "热轧卷板",
        cStove: `L${1001 + i}`,
        cBatchNo: `P${26090 + i}`,
        cStockCode: "ZG01-04",
        cStockRoomNo: `A0${i + 1}`,
        cLayerno: "1",
        cComplexDecideCode: 2,
        cDetectResultCode: 0,
        cInboundNo: `RK${i + 1}`,
        cOrderNo: `DD${2609 + i}`,
        nSelectMode: 2,
        cTaskId: `TK${100 + i}`,
        cBillOfLadingNo: `TH${260910 + i}`,
        cMatCode: "100001",
        creator: "admin",
        createTime: "2026-09-23 07:30:00",
      })),
    ),
  // FH1010 主表：制卡发货明细（QueryFhJl2000Dto）
  [`post ${BASE}/getFhJl2000Lst`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        cTaskId: `TK${200 + i}`,
        cBillOfLadingNo: `TH${260920 + i}`,
        cMatchId: `WL${260920 + i}`,
        cVehicleNo: `冀B0000${i + 1}`,
        nZcStatus: 1,
        cOrderCustCname: "演示客户",
        cMatName: "热轧卷板",
        nNum: 10 + i,
        nWgt: 100.5 + i,
        nZcNum: 4 + i,
        nZcWgt: 40.5 + i,
        nSyNum: 6 + i,
        nSyWgt: 60 + i,
        cSgCode: "Q235B",
        cSpec: "12*1500*8000",
        nLenMin: "6000",
        nLenMax: "12000",
        cPlanId: `JH${i + 1}`,
        createTime: "2026-09-23 07:00:00",
      })),
    ),
  // FH1010 成品库存（QueryFhTyd2000Dto）
  [`post ${BASE}/getFhTyd2000`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        cOrderNo: `DD${2609 + i}`,
        cPieceNo: `C${2609100 + i}`,
        cStove: `L${1001 + i}`,
        cBatchNo: `P${26090 + i}`,
        cSgCode: "Q235B",
        cSgStd: "GB/T 700",
        nThick: 12,
        nWth: 1500,
        nLen: 8000,
        cSpec: "12*1500*8000",
        nNum: 2 + i,
        nCalWgt: 25.5 + i,
        nWgt: 26.1 + i,
        cStoreCode: "ZG01-04",
        cStackNo: `D0${i + 1}`,
        cStackNum: "1",
        cCustName: "演示客户",
        cProdCode: "100001",
        cSpecialMarkGy: "正常",
        cWgtToler: "0",
        cCutFlag: "1",
        cDelivyStatusCode: "YS",
        nQmLevel: 1,
        cDelivyAddress: "天津港",
        cDetectDefectLevel: "I",
        cDetectResultCode: 0,
        cSurfaceResult: 0,
        cComplexDecideCode: 2,
        nQmStatus: 1,
        nLockReason: "0",
        cInboundNo: `RK${i + 1}`,
      })),
    ),
  // 写操作 → 只回成功
  [`post ${BASE}/sendJL`]: (config) => ok(config, null),
  [`post ${BASE}/sendJLCancel`]: (config) => ok(config, null),
  [`post ${BASE}/sendJL2`]: (config) => ok(config, 3),
  [`post ${BASE}/addFhMat`]: (config) => ok(config, null),
  [`post ${BASE}/delMat`]: (config) => ok(config, null),
  // FH3010 装车异常日志（Tsd1000Log）
  [`post ${BASE}/getTsd1000Log`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `LOG-${i + 1}`,
        creator: "admin",
        createTime: "2026-09-23 08:00:00",
        cMatchId: `WL${260920 + i}`,
        cVehicleNo: `冀B0000${i + 1}`,
        cMatNo: `C${2609100 + i}`,
        cRemark: "装车异常日志演示行",
        nStatus: 1,
        nZcStatus: 1,
        nSwlx: 80,
        nWgt: 25.5,
        nNum: 2,
      })),
    ),
  // FH4000 退货（QueryTsd3000Dto）
  [`post ${BASE}/getTsd3000Lst`]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        cCustName: "演示退货单位",
        cMatNo: `C${2609100 + i}`,
        cStove: `L${1001 + i}`,
        nMatWgt: 12.5 + i,
        nMatNum: 1,
        nMatThick: 12,
        nMatWidth: 1500,
        nMatLen: 8000,
        cSgCode: "Q235B",
        cSgStd: "GB/T 700",
        cOrderNo: `DD${2609 + i}`,
        cMatName: "热轧卷板",
        cMatchId: `WL${260920 + i}`,
        cBillOfLadingNo: `TH${260920 + i}`,
        cTaskId: `TK${200 + i}`,
      })),
    ),
  [`post ${BASE}/insertTsd3000`]: (config) => ok(config, 3),

  /* FH3000 派车计划查询（ApiBillDetail，XS 接口） */
  ["post /dDH.Service.Interface.Services.XS/xS/getBillDetailList"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        orderNo: `TH${260930 + i}`,
        dealersName: "演示提货单位",
        carNo: `冀C0000${i + 1}`,
        shipNo: "",
        bcArea: "华北",
        wharfName: "天津港码头",
        orderRemark: "",
        firstAuTime: `2026-09-23 0${i}:00:00`,
        stateName: "已审核",
        goodsName: "热轧卷板",
        count: 3 + i,
        weight: 12.5,
        amtWeight: 38.5 + i,
        gyQb: "切边",
        gC: "0",
        zcNum: 1 + i,
        zcWgt: 13 + i,
      })),
    ),

  /* ---------- 销售/计划迁移占位（B1-B6，2026-09-23）：查询≤5演示行 / 写成功 ---------- */
  ["post /dDH.Service.SMP.Services/tsCustomer/getTsCustomerList"]: (config) =>
    ok(config, demoRows(3, (i) => ({
      id: `CUST-${i + 1}`, cCustCode: `C00${i + 1}`, cCustName: `演示客户${i + 1}`,
      cStatus: "1", cCustClass: "B", creator: "admin", createTime: "2026-09-01 08:00:00",
      lastModifier: "", lastModifyTime: "",
    }))),
  ["post /dDH.Service.SMP.Services/tsCustomer/removeTsCustomer"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tsCustomer/syncCust"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tsCustomer/addTsCustomer"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tsCustomer/updateTsCustomer"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tsCust001/custQuery"]: (config) =>
    ok(config, demoRows(3, (i) => ({ cCustNo: `K${i + 1}`, cCustName: `流向客户${i + 1}` }))),
  ["post /dDH.Service.SMP.Services/tsCust001/deleteCust"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tsMatrl/queryMatrl"]: (config) =>
    ok(config, demoRows(3, (i) => ({
      id: `M-${i + 1}`, cMatCode: `M00${i + 1}`, cMatName: `物料${i + 1}`, nStatus: 1,
    }))),
  ["post /dDH.Service.SMP.Services/tsMatrl/syncMatrl"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/getTyd2000AllocationLogsAsync"]: (config) =>
    ok(config, demoRows(3, (i) => ({
      id: `LOG-${i + 1}`, cPieceNo: `P00${i + 1}`, cOrderNo: `SO26090${i + 1}`,
      cSettleCust: "结算单位A", cInboundNo: `RK${i + 1}`, cCustName: `客户${i + 1}`,
      nNum: 2 + i, creator: "admin", createTime: "2026-09-20 10:00:00",
    }))),
  ["post /dDH.Service.SMP.Services/tmp2000/getCustomer"]: (config) =>
    ok(config, demoRows(3, (i) => ({ cOrderCustNo: `CU${i + 1}`, cOrderCustCname: `客户${i + 1}` }))),
  ["post /dDH.Service.SMP.Services/tmp2000/getStockList"]: (config) =>
    ok(config, demoRows(3, (i) => ({
      selected: false, cPieceNo: `P00${i + 1}`, cStove: `S26C0${i + 1}`, cBatchNo: `B${i + 1}`,
      cSgCode: "Q235B", cSgStd: "GB/T 700", cProdCode: "HC", cSpec: "12*1500*C",
      nNum: 2, nCalWgt: 10.5, nWgt: 11.2, nThick: 12, nWth: 1500, nLen: 8000,
      cOrderNo: `SO26090${i + 1}`, cSettleCust: "结算A", cStoreCode: "ZG01-01",
      cStackNo: `A0${i + 1}`, cStackNum: String(i + 1), nStatus: 10, nQmStatus: 0,
      cInboundNo: `RK${i + 1}`, cDelivyStatusCode: "YS", dProTime: "2026-09-20 08:00:00",
    }))),
  ["post /dDH.Service.SMP.Services/tmp2000/updateStockAllocation"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/cancelMatchOrder"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/generateOrderTemplate"]: (config) =>
    ok(config, demoRows(2, (i) => ({
      cProdName: "热轧卷板", cMateriel: "HC", nThick: 12, nWth: 1500,
      nMinLen: 7900, nMaxLen: 8100, cCutFlag: "1", nQty: 10 + i,
    }))),
  ["post /dDH.Service.SMP.Services/tmp2000/getSylOrderLst"]: (config) =>
    ok(config, demoRows(3, (i) => ({ selected: false, cOrderNo: `SYL${i + 1}`, nStatus: 1, cSgCode: "Q235B" }))),
  ["post /dDH.Service.SMP.Services/tmp2000/delGPOrder"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/backOrderPlan"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/pushSlabOrderPlan"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/backSaleOrder"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/backSaleOrder2"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/finishOrder"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/getTmp2010"]: (config) =>
    ok(config, demoRows(3, (i) => ({
      selected: false, cOrderNo: `YL${i + 1}`, cSgCode: "Q235B", cSteelType: "HC",
      nThick: 12, nWidth: 1500, nLenMin: 8000, nLenMax: 12000, nNum: 10 + i,
      cTrimFlag: "1", cDelivyStatusDesc: "正常",
    }))),
  ["post /dDH.Service.SMP.Services/tmp2000/getTmp2010Len"]: (config) =>
    ok(config, demoRows(3, (i) => ({ selected: false, cOrderNo: `LEN${i + 1}`, nLenMin: 8000, nLenMax: 12000 }))),
  ["post /dDH.Service.SMP.Services/tmp2000/getTmp2010ApplyLen"]: (config) =>
    ok(config, demoRows(3, (i) => ({ selected: false, cOrderNo: `APL${i + 1}`, nLenMin: 8000 }))),
  ["post /dDH.Service.SMP.Services/tmp2000/insertOrderLenPlan"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/checkTmp2010ApplyLen"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/getOrderCF"]: (config) =>
    ok(config, demoRows(3, (i) => ({ selected: false, cOrderNo: `CF${i + 1}`, nStatus: 1 }))),
  ["post /dDH.Service.SMP.Services/tmp2000/checkOrderCFApply"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/getTmp2005"]: (config) =>
    ok(config, demoRows(3, (i) => ({ cOrderNo: `PL${i + 1}`, cSgCode: "Q235B", nThick: 12 }))),
  ["post /dDH.Service.SMP.Services/tmp2000/getTmp2005Storages"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `ST-${i + 1}`, cPieceNo: `P00${i + 1}`, cStove: `S26C0${i + 1}` }))),
  ["post /dDH.Service.SMP.Services/tmp2000/getCptJc"]: (config) =>
    ok(config, demoRows(3, (i) => ({
      dProTime: "2026-09-20 08:00:00", cPlanNo: `JC${i + 1}`, cOrderNo: `SO${i + 1}`,
      cStove: `S26C0${i + 1}`, cPieceNo: `P00${i + 1}`, cSgCode: "Q235B",
      nThick: 12, nNum: 2, nCalWgt: 10.5, nStatus: 10,
    }))),
  ["post /dDH.Service.SMP.Services/tmp2000/batchUpdateOrder"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/matchNkSgCode"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/getOrderLst2"]: (config) =>
    ok(config, demoRows(3, (i) => ({ selected: false, cOrderNo: `O2${i + 1}`, nStatus: 1, cSgCode: "Q235B" }))),
  ["post /dDH.Service.SMP.Services/tmp2000/getOrderLst"]: (config) =>
    ok(config, demoRows(3, (i) => ({
      selected: false, cOrderNo: `SO26090${i + 1}`, nStatus: 1, nOrderProcFlag: 0,
      cSgCode: "Q235B", cSgStd: "GB/T 700", cSteelType: "HC", cSpec: "12*1500*C",
      cOrderCustNo: `CU${i + 1}`, cOrderCustCname: `客户${i + 1}`, nNum: 10 + i, nWgt: 25.5 + i,
      nThick: 12, nWidth: 1500, cLineCode: "ZG01", cTrimFlag: "1", cInboundNo: `RK${i + 1}`,
    }))),
  ["post /dDH.Service.SMP.Services/tmp2000/downOrderPlan"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/delOrder"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/pushOrderPlan"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/getTmp2000Log"]: (config) =>
    ok(config, demoRows(2, (i) => ({
      id: `LG-${i + 1}`, cOrderNo: "SO260901", cSwlx: "changeLen",
      cRemark: `演示日志${i + 1}`, creator: "admin", createTime: "2026-09-22 10:00:00",
    }))),
  ["post /dDH.Service.SMP.Services/tmp2000/queryOrdersForDesign"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `QD-${i + 1}`, cOrderNo: `SO26090${i + 1}`, nOrderProcFlag: 0 }))),
  ["post /dDH.Service.SMP.Services/tmp2000/importByBx"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tmp2000/delYLOrderPlan"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tmp2000/addYLOrder"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tmp2000/importTmp2000"]: (config) => ok(config, 1),
  /* MP2020/MP2021 轧钢计划 */
  ["post /dDH.Service.SMP.Services/tmp2020/queryOrder"]: (config) =>
    ok(config, demoRows(3, (i) => ({
      selected: false, cOrderNo: `SO26090${i + 1}`, cLineCode: "ZG01", nOrder: i + 1,
      cPlanTime: "2026-09-23", cSgCode: "Q235B", cSpec: "12*1500*C", nPlanedWgt: 25 + i,
      nThick: 12, nWidth: 1500, nLen: 8000, cOrderCustCname: `客户${i + 1}`,
    }))),
  ["post /dDH.Service.SMP.Services/tmp2020/queryPlans"]: (config) =>
    ok(config, demoRows(3, (i) => ({
      selected: false, cOrderNo: `PL${i + 1}`, cLineCode: "ZG01", nOrder: i + 1,
      cPlanTime: "2026-09-24", cSgCode: "Q235B", nPlanedWgt: 20 + i,
    }))),
  ["post /dDH.Service.SMP.Services/tmp2020/addTmp2020s"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tmp2020/deleteTmp2020s"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tmp2020/downTmp2020s"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tmp2020/closeTmp2020s"]: (config) => ok(config, null),
  /* MP2010 计划评审 */
  ["post /dDH.Service.SMP.Services/tmp2010/queryOrder"]: (config) =>
    ok(config, demoRows(3, (i) => ({
      selected: false, id: `T10-${i + 1}`, cOrderNo: `SO26090${i + 1}`,
      cSgCode: "Q235B", cSteelType: "HC", nNum: 10 + i, nReviewStatus: 0,
    }))),
  ["post /dDH.Service.SMP.Services/tmp2010/reviewOrder"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tmp2010/cancleReviewOrder"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tmp2010/setStaCode"]: (config) => ok(config, null),
  /* 炼钢 castStove */
  ["post /dDH.Service.SMP.Services/castStove/getSlabOrderList"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `SL-${i + 1}`, cOrderNo: `SO${i + 1}`, nNum: 2, nWgt: 25 + i }))),
  ["post /dDH.Service.SMP.Services/castStove/getLcList"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `LC-${i + 1}`, cLcNo: `L26090${i + 1}`, nLs: 30 + i }))),
  ["post /dDH.Service.SMP.Services/castStove/deleteLc"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/castStove/addLc"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/castStove/getLcOrderList"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `LCO-${i + 1}`, cOrderNo: `SO${i + 1}` }))),
  ["post /dDH.Service.SMP.Services/castStove/getJcList"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `JC-${i + 1}`, cJcNo: `J26090${i + 1}`, nSort: i + 1 }))),
  ["post /dDH.Service.SMP.Services/castStove/creatJc"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/castStove/getLcListByJc"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `LCJ-${i + 1}`, cLcNo: `L26090${i + 1}` }))),
  ["post /dDH.Service.SMP.Services/castStove/deleteJc"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/castStove/downJc"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/castStove/updateSort"]: (config) => ok(config, null),
  /* 提料 TL */
  ["post /dDH.Service.SMP.Services/tL/checkedTlNew"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tL/cancleCheckedTlNew"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tL/delTl"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tL/importTmp2005"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tmp2010/updateSpec"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tmp2010/changePlanDate"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tmp2020/closeDownPlan"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tL/getOrderLst2"]: (config) =>
    ok(config, demoRows(3, (i) => ({ selected: false, cOrderNo: `TL2${i + 1}`, nStatus: 1 }))),
  ["post /dDH.Service.SMP.Services/tL/queryOrderNew"]: (config) =>
    ok(config, demoRows(3, (i) => ({ selected: false, cOrderNo: `QN${i + 1}`, cSgCode: "Q235B", nTlStatus: 1, cLineCode: "ZG01", nThick: 12, nWidth: 1500, cPlanTime: "2026-09-23" }))),
  ["post /dDH.Service.SMP.Services/tL/tlProdClose"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tLZG02/getSlabCodeList"]: (config) =>
    ok(config, demoRows(3, (i) => ({ cCode: `SL${i + 1}`, cName: `坯型${i + 1}`, nSlabThick: 200 + i * 10 }))),
  ["post /dDH.Service.SMP.Services/tLZG02/insertTLZG02"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tLZG02/checkedTlNew"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tLZG02/cancleCheckedTlNew"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/tLZG02/delTl"]: (config) => ok(config, 1),
  ["post /dDH.Service.SMP.Services/castStove/checkJCInvalid"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/castStove/jCInvalid"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/tmp3000/queryTmp2010Dtos"]: (config) =>
    ok(config, demoRows(3, (i) => ({ cOrderNo: `OUT${i + 1}`, cSgCode: "Q235B", nNum: 2 }))),
  ["post /dDH.Service.SMP.Services/tmp3000/queryThr4000s"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `TH-${i + 1}`, cPieceNo: `P00${i + 1}` }))),
  ["post /dDH.Service.SMP.Services/tmp1220/queryTmp1220"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `T1220-${i + 1}`, cName: `板头板边${i + 1}`, nStatus: 1 }))),
  ["post /dDH.Service.SMP.Services/tmp1220/changeTmp1220"]: (config) => ok(config, null),
  ["post /dDH.Service.Interface.Services.BX/bxcomTest/validL2Message"]: (config) =>
    ok(config, { id: "DEMO-L2", content: "演示二级消息", success: true }),
  /* MP2033 frmMP2033 */
  ["post /dDH.Service.SMP.Services/frmMP2033/getSlabOrderList"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `P${i + 1}`, cOrderNo: `SO${i + 1}`, nNum: 2 }))),
  ["post /dDH.Service.SMP.Services/frmMP2033/getGPWidthInfo"]: (config) => ok(config, [1500, 1800, 2000]),
  ["post /dDH.Service.SMP.Services/frmMP2033/checkCreateStoveCunInfo"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/frmMP2033/createStoveCunInfo"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/frmMP2033/checkRemoveStoveCunInfo"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/frmMP2033/removeStoveCunInfo"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/frmMP2033/queryStoveCutInfo"]: (config) =>
    ok(config, { dataSourceLeft: [], dataSourceRight: [] }),
  ["post /dDH.Service.SMP.Services/frmMP2033/calcuateNewData"]: (config) =>
    ok(config, { dataSourceLeft: [], dataSourceRight: [] }),
  ["post /dDH.Service.SMP.Services/frmMP2033/createStoveCutData"]: (config) =>
    ok(config, { id: "CUT-1", index: 1, cPieceNo: "P001" }),
  ["post /dDH.Service.SMP.Services/frmMP2033/updateStoveSgCodeInfo"]: (config) => ok(config, null),
  ["post /dDH.Service.SMP.Services/frmMP2033/saveDatas"]: (config) => ok(config, null),

  /* 炼钢作业 MP3200 占位 */
  ["post /dDH.Service.SMP.Services/frmMP3200/query"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `D${i + 1}`, cCode: `C0${i + 1}`, cName: `演示${i + 1}`, createTime: "2026-09-23 08:00:00", nStatus: 1 }))),
  ["post /dDH.Service.SMP.Services/tmp2000/getCptSlabNo"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `D${i + 1}`, cCode: `C0${i + 1}`, cName: `演示${i + 1}`, createTime: "2026-09-23 08:00:00", nStatus: 1 }))),
};
