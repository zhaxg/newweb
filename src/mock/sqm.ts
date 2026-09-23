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

  /* ---------- 销售/计划迁移占位（B1-B6） ---------- */
  ["post /dDH.Service.SQM.Services.QualityDesign/qualityDesign/design"]: (config) =>
    ok(config, { success: true, message: "演示质量设计", input: { orderNo: "DEMO" }, itemResult: [] }),
  ["post /dDH.Service.SQM.Services.QualityDesign/qualityDesign/queryTqmtdDesignResult"]: (config) =>
    ok(config, { id: "TQMTD-1", orderNo: "DEMO" }),
  ["post /dDH.Service.SQM.Services.QualityDesign/qualityDesign/updateZggy"]: (config) =>
    ok(config, { success: true, message: "演示更新轧钢工艺", input: { orderNo: "DEMO" }, itemResult: [] }),
  ["post /dDH.Service.SQM.Services.QualityDesign/qualityDesign/designZHB"]: (config) =>
    ok(config, { success: true, message: "演示中厚板质量设计", input: { orderNo: "DEMO" }, itemResult: [] }),
  ["post /dDH.Service.SQM.Services.QualityDesign/qualityDesign/queryJggyDesignResult"]: (config) =>
    ok(config, { id: "JGGY-1" }),
  ["post /dDH.Service.SQM.Services.Tqmjg/tqmjg/query"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `JG-${i + 1}`, cOrderNo: `SO${i + 1}` }))),
  ["post /dDH.Service.SQM.Services.Tmptp/tmp1210/getTmp1210List"]: (config) =>
    ok(config, demoRows(3, (i) => ({ id: `T1210-${i + 1}`, cSteelType: "Q235", cSteelGrade: "B", nWgt: 1000 + i }))),
  ["post /dDH.Service.SQM.Services.Tmptp/tmp1210/addTmp1210"]: (config) => ok(config, null),
  ["post /dDH.Service.SQM.Services.Tmptp/tmp1210/updateTmp1210"]: (config) => ok(config, null),
  ["post /dDH.Service.SQM.Services.Tmptp/tmp1210/removeTmp1210"]: (config) => ok(config, null),

  /* ---------- tqmtpa4（TP400 钢种维护 / FrmTqmtpa4） ---------- */
  ["post /dDH.Service.SQM.Services.Tqmtp/tqmtpa4/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `DEMO-TPA4-${i + 1}`,
        creator: "admin",
        createTime: day(i),
        lastModifier: "admin",
        lastModifyTime: day(i),
        cSgCode: `SG0${i + 1}`,
        cSgSign: `Q235${"BCD"[i]}`,
        cSgClassCode: "A001",
        cRemark: "演示行",
        cValidFlag: 1,
        nVersion: 1,
        cArchiveFlag: "N",
        cOldSgCode: null,
      })),
    ),
  ["post /dDH.Service.SQM.Services.Tqmtp/tqmtpa4/save"]: (config) => ok(config, null),

  /* ---------- tqmtpa5（TP500 标准维护 / FrmTqmtpa5） ---------- */
  ["post /dDH.Service.SQM.Services.Tqmtp/tqmtpa5/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `DEMO-TPA5-${i + 1}`,
        creator: "admin",
        createTime: day(i),
        lastModifier: "admin",
        lastModifyTime: day(i),
        cStdCode: `STD0${i + 1}`,
        cSgStd: "GB/T 709-2019",
        cRemark: "演示行",
        cValidFlag: 1,
        nVersion: 1,
        cArchiveFlag: "N",
        cStdCodeOld: null,
      })),
    ),
  ["post /dDH.Service.SQM.Services.Tqmtp/tqmtpa5/save"]: (config) => ok(config, null),

  /* ---------- tqmtpa6（QL6200 编辑弹窗标准/牌号候选） ---------- */
  ["post /dDH.Service.SQM.Services.Tqmtp/tqmtpa6/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `DEMO-TPA6-${i + 1}`,
        creator: "admin",
        createTime: day(i),
        cStdSgCode: `STDG0${i + 1}`,
        cStdCode: `STD0${i + 1}`,
        cSgStd: "GB/T 709-2019",
        cSgCode: `SG0${i + 1}`,
        cSgSign: `Q235${"BCD"[i]}`,
        cSgClassCode: "A001",
        cRemark: null,
        nVersion: 1,
        cArchiveFlag: "N",
      })),
    ),

  /* ---------- testItem（QM100 试验子项目维护 / FrmTestSubitem） ---------- */
  ["post /dDH.Service.SQM.Services/testItem/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `DEMO-SUB-${i + 1}`,
        testItemType: "P",
        testItemTypeDesc: "拉伸",
        testItemCode: "T001",
        testItemName: "拉伸",
        testSubItemCode: `P10${i + 1}`,
        testSubItemName: ["上屈服强度", "下屈服强度", "抗拉强度"][i],
        dlDxFlag: "1",
        unit: "MPa",
        other1: "演示行",
        other2: null,
        other3: null,
        other4: null,
        other5: 2,
        other6: null,
        other7: null,
        other8: null,
        seq: i + 1,
        tableCode: "TestSubItem",
      })),
    ),
  ["post /dDH.Service.SQM.Services/testItem/insertOrUpdate"]: (config) => ok(config, null),
  ["post /dDH.Service.SQM.Services/testItem/delete"]: (config) => ok(config, null),

  /* ---------- tqmtm104（QM800 基表挂靠标准配置 / FrmTqmtm08） ---------- */
  ["post /dDH.Service.SQM.Services.Tqmtm/tqmtm104/queryGrp"]: (config) =>
    ok(
      config,
      demoRows(2, (i) => ({
        cFacCode: "F01",
        cProdClassCode: "01",
        cProdCode: "A001",
        cBasicTableTypeCode: 1,
        cWorkTypeCode: `W0${i + 1}`,
        cItemMustFlag: "N",
        nSeq1: i + 1,
        cSearchIdx: `IDX${i + 1}`,
        details: [],
        isChanged: false,
        detailSnapshotStr: "",
        sourceId: `DEMO-GRP-${i + 1}`,
      })),
    ),
  ["post /dDH.Service.SQM.Services.Tqmtm/tqmtm104/queryTreeSource"]: (config) =>
    ok(
      config,
      demoRows(4, (i) => ({
        id: i === 0 ? null : `DEMO-ND-${i}`,
        parentID: i === 0 ? null : "DEMO-ND-0",
        cBasicTableCode: `BT0${i + 1}`,
        cBasicTableCName: i === 0 ? "基表根节点" : `基表子项${i}`,
        cBasicTableEName: i === 0 ? "ROOT" : `NODE${i}`,
        validateFlag: i < 2,
        selected: false,
        sourceId: null,
      })),
    ),
  ["post /dDH.Service.SQM.Services.Tqmtm/tqmtm104/save"]: (config) => ok(config, null),

  /* ---------- tiGzmfile（QL6200 标准/工艺文件管理、QL6210 操作履历） ---------- */
  ["post /dDH.Service.SQM.Services.Tmptq/tiGzmfile/getGzmfiles"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `DEMO-GZM-${i + 1}`,
        creator: "admin",
        createTime: day(i),
        lastModifier: "admin",
        lastModifyTime: day(i),
        serialNo: `MES${i + 1}`,
        regulateNo: `GYGC0${i + 1}`,
        regulateName: `工艺规程示例${i + 1}`,
        regulateNameReplace: `FILE000${i + 1}.pdf`,
        cLocalName: `FILE000${i + 1}.pdf`,
        sgStd: "GB/T 709-2019",
        sgSign: "Q235B",
        versionNo: 1,
        useUnit: null,
        matKind: null,
        matKindName: null,
        controlState: 10,
        variety: "0",
        cIsEnable: i === 2 ? "N" : "Y",
        dutyMan: "admin",
        publishDate: day(i),
        remark: "演示行",
        cUptUser: "admin",
        dUptDate: day(i),
        cScrapUser: i === 2 ? "admin" : null,
        dScrapDate: i === 2 ? day(i) : null,
        type: "pdf",
      })),
    ),
  ["post /dDH.Service.SQM.Services.Tmptq/tiGzmfile/getGzmFilesRecord"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `DEMO-GZMR-${i + 1}`,
        serialNo: `FILE000${i + 1}.pdf`,
        fileId: `FID-${i + 1}`,
        operater: "admin",
        operateDate: day(i),
        operateType: ["上传", "修改", "作废"][i],
        cRemark: "演示行",
        regulateNo: `GYGC0${i + 1}`,
      })),
    ),
  ["post /dDH.Service.SQM.Services.Tmptq/tiGzmfile/addEditGzmfiles"]: (config) => ok(config, null),
  ["post /dDH.Service.SQM.Services.Tmptq/tiGzmfile/zFGzmfiles"]: (config) => ok(config, null),
  ["post /dDH.Service.SQM.Services.Tmptq/tiGzmfile/canleZFGzmfiles"]: (config) => ok(config, null),
  ["post /dDH.Service.SQM.Services.Tmptq/tiGzmfile/delGzmfiles"]: (config) => ok(config, null),

  /* ---------- tqmyl（QM2100 炼钢工艺要点 / FrmYl01） ---------- */
  ["post /dDH.Service.SQM.Services.Tqmyl/tqmyl/queryYl01"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `DEMO-YL01-${i + 1}`,
        creator: "admin",
        createTime: day(i),
        lastModifier: "admin",
        lastModifyTime: day(i),
        cCode: `YL${1000 + i}`,
        cName: `炼钢工艺要点示例${i + 1}`,
        cPlanRouteCode: "BOF-LF",
        nValidFlag: i === 0 ? 1 : 0,
        cStNo: null,
        cLineCode: "LG01",
        cPlanRouteDesc: "转炉→LF",
        cPreRemark: null,
        cRemark: "演示行",
        sgSignDesc: "Q235B GB/T 709-2019",
      })),
    ),
  ["post /dDH.Service.SQM.Services.Tqmyl/tqmyl/queryById"]: (config) =>
    ok(config, {
      tqmyl01: {
        selected: false,
        id: "DEMO-YL01-1",
        creator: "admin",
        createTime: day(0),
        cCode: "YL1000",
        cName: "炼钢工艺要点示例1",
        cPlanRouteCode: "BOF",
        nValidFlag: 1,
        cLineCode: "LG01",
        cPlanRouteDesc: "转炉",
        cRemark: "演示行",
        sgSignDesc: "Q235B GB/T 709-2019",
      },
      tqmyl02s: [
        {
          selected: false,
          id: "DEMO-YL02-1",
          cTqmyl01Id: "DEMO-YL01-1",
          cGyCode: "YL1000",
          cSgSign: "Q235B",
          cSgStd: "GB/T 709-2019",
        },
      ],
      tqmyl03s: [
        {
          selected: false,
          id: "DEMO-YL03-1",
          cGyCode: "YL1000",
          cProc: "BOF",
          cProcName: "转炉",
          nSeq: 1,
          cTqmyl01Id: "DEMO-YL01-1",
        },
      ],
      tqmyl04s: [
        // 产前准备（cClass = CQZB）
        {
          selected: false,
          id: "DEMO-YL04-CQZB",
          cTqmyl01Id: "DEMO-YL01-1",
          cTqmyl01Code: "YL1000",
          cClass: "CQZB",
          cClassDesc: "产前准备",
          cCode: "P001",
          cName: "大包到站温度",
          cProc: null,
          nSeq: 1,
          cUnit: "℃",
        },
        // 转炉 · 工艺参数组（YLGY.PROC.INDEX.GRP: cCode=BOF cName=A cDesc=工艺参数）
        {
          selected: false,
          id: "DEMO-YL04-A1",
          cTqmyl01Id: "DEMO-YL01-1",
          cTqmyl01Code: "YL1000",
          cTqmyl03Id: "DEMO-YL03-1",
          cProc: "BOF",
          nProcSeq: 1,
          cClass: "A",
          cClassDesc: "工艺参数",
          cCode: "A104",
          cName: "到站温度",
          nSeq: 1,
          cUnit: "℃",
          nTargetValue: 1650,
          nMinValue: 1630,
          nMaxValue: 1670,
          nInterval: 1,
          nAccuracy: 0,
        },
      ],
    }),
  ["post /dDH.Service.SQM.Services.Tqmyl/tqmyl/save"]: (config) => ok(config, null),
  ["post /dDH.Service.SQM.Services.Tqmyl/tqmyl/updateValidFlag"]: (config) => ok(config, null),
  // C# 返回 List<(sgSign, sgStd)>；System.Text.Json + CamelCase 下为 item1/item2，这里同时给 sgSign/sgStd 形状
  ["post /dDH.Service.SQM.Services.Tqmyl/tqmyl/queryAllSGSign"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        sgSign: `Q235${"BCD"[i]}`,
        sgStd: "GB/T 709-2019",
        item1: `Q235${"BCD"[i]}`,
        item2: "GB/T 709-2019",
      })),
    ),

  /* ---------- tqm1000（UCSelectNKGZ 内控钢种，用于三路合成钢种标准候选） ---------- */
  ["post /dDH.Service.SQM.Services.Tmptp/tqm1000/getTqm1000List"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `DEMO-NKGZ-${i + 1}`,
        cSgCode: `Q235${"BCD"[i]}`,
        cSgCodeNk: `NKGZ${i + 1}`,
        nThickMin: null,
        nThickMax: null,
      })),
    ),

  /* Tql6100 中厚板质量异常汇总 */
  ["post /dDH.Service.SQM.Services.Tmptq/tql6100/getTql6100Dtos"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        selected: false,
        id: `Q6100-${i + 1}`,
        dTime: "2026-09-20",
        hasFile: i === 0 ? "是" : "否",
        cStoveNo: `S26C0${i + 1}`,
        cSgCode: "Q235B",
        cPieceNoSlab: `SLAB${i + 1}`,
        cPieceNo: `P00${i + 1}`,
        cDefectType: "D01",
        cResult: 10,
        cRemark: "演示行",
      })),
    ),

  /* QZ6000 补漏 */
  ["post /dDH.Service.SQM.Services.QualityDisposition/inventoryJudge/queryInventory"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, selected: false, cPieceNo: `P00${i + 1}`, cStove: `S26C0${i + 1}`, nStatus: 1 })),
    ),
  ["post /dDH.Service.SQM.Services.QualityDisposition/inventoryJudge/complexDecide"]: (config) => ok(config, null),
};
