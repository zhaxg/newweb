import { getBody, ok, type RouteMap } from "../admin/core";
import ganttSample from "./data/gantt_data.json";

/** 占位：≤5 条随机演示行；写操作只回成功 —— 禁止实现业务 */
function demoRows<T>(n: number, make: (i: number) => T): T[] {
  const count = Math.min(5, Math.max(1, n));
  return Array.from({ length: count }, (_, i) => make(i));
}

/* ===== MS2000 甘特：生产环境导出真源 data/gantt_data.json（只读，勿编造字段）=====
 * meta.endpoints 覆盖：getGanttResourcesDatas / getStoveRouteDatas / getMSConfig。
 * tms2000 仅含 id/cPono/cStove/cSgCode/nSortJcActual/nJcActualBeg/nJcActualEnd；
 * tms2010 仅含 id/cPono/cGsId/cProc/cProcIndex/cPlanMachineCode/cPlanMachineStationCode/
 *         cStoveNo/nActualExist/dPlanBegtime/dPlanEndtime/dActualBegtime/dActualEndtime。
 * 导出未覆盖的端点（queryStovePlan 全列、getFactoryLineAreaMachine_LG 等）按已有字段投影，不补假值。
 *
 * 时间偏移：导出时刻 meta.fetchedAt = 2026-09-22 15:35:04。出 mock 时把 tms2010 全部
 * 时间戳平移到「当前时刻」，使 09-19~09-22 的生产快照在演示环境看起来仍是近期数据；
 * 每次请求按 now 重算偏移，刷新后仍对齐。不改 JSON 文件本身。 */
type GanttSample = typeof ganttSample;
const gantt = ganttSample as GanttSample;
const GANTT_EXPORT_AT = Date.parse("2026-09-22T15:35:04");

function shiftIso(s: string | null | undefined): string | null | undefined {
  if (!s) return s;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return s;
  const d = new Date(t + (Date.now() - GANTT_EXPORT_AT));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function ganttMachines() {
  return gantt.machines;
}
/** 出口统一应用时间偏移（不改模块内 JSON 引用） */
function ganttPoints() {
  return gantt.points.map((p) => ({
    ...p,
    tms2010: {
      ...p.tms2010,
      dPlanBegtime: shiftIso(p.tms2010.dPlanBegtime),
      dPlanEndtime: shiftIso(p.tms2010.dPlanEndtime),
      dActualBegtime: shiftIso(p.tms2010.dActualBegtime),
      dActualEndtime: shiftIso(p.tms2010.dActualEndtime),
    },
  }));
}
/** tms2000 按 id 去重 → 炉次计划表行（只保留导出真实字段；Selected 由 row-selection 呈现） */
function ganttStovePlans(): Record<string, unknown>[] {
  const seen = new Set<string>();
  const rows: Record<string, unknown>[] = [];
  for (const p of gantt.points) {
    const t0 = p.tms2000;
    if (!t0?.id || seen.has(t0.id)) continue;
    seen.add(t0.id);
    rows.push({ ...t0, selected: false });
  }
  return rows;
}

export const smsRoutes: RouteMap = {
  /* 炼钢作业迁移占位（2026-09-23）：按 sms.swagger 端点全量登记 */
  /* 导出未含本端点：从 machines 投影机台名/工序（拖到新机台回写用），不编造行 */
  ["post /dDH.Service.SMS.Services.PublicInterface/publicFactoryLineAreaMachine/getFactoryLineAreaMachine_LG"]: (config) =>
    ok(
      config,
      gantt.machines.map((m) => {
        const code = String(m.machineCode ?? "");
        const routeProcValue = code.includes("#BOF")
          ? "BOF"
          : code.includes("#LF")
            ? "LF"
            : code.includes("#RH")
              ? "RH"
              : String(m.cProc ?? "");
        return {
          machineCode: m.machineCode,
          machineName: m.machineDesc,
          machineStationCode: m.machineStationCode,
          machineStationName: m.machineStationDesc,
          routeProcValue,
          routeProcDesc: m.machineDesc,
          machineDesc: m.machineDesc,
          machineStationDesc: m.machineStationDesc,
        };
      }),
    ),

  ["post /dDH.Service.SMS.Services.PublicInterface/publicKV/getKvInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  /* 导出 config：Gantt_ResourceRowHeight 三键（HmxKv[] 形状） */
  ["post /dDH.Service.SMS.Services.PublicInterface/publicKV/getMSConfig"]: (config) =>
    ok(config, [
      { id: "GRRH", cCode: "Gantt_ResourceRowHeight", cName: "甘特资源行高", cValue: String(gantt.config.resourceRowHeight) },
      { id: "GRRHI", cCode: "Gantt_ResourceRowHeight_Inner", cName: "甘特资源行内条高", cValue: String(gantt.config.resourceRowHeightInner) },
      { id: "GRRHIP", cCode: "Gantt_ResourceRowHeight_Inner_Percentage", cName: "甘特行内条高占比", cValue: String(gantt.config.resourceRowHeightInnerPercentage) },
    ]),

  ["post /dDH.Service.SMS.Services.PublicInterface/publicKV/getMSLZLiu"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  /* 导出未覆盖：不编造演示行，回空（计划双击落点链路仅取 mapping[0]，空则跳过机台预取） */
  ["post /dDH.Service.SMS.Services.PublicInterface/publicKV/getMsProcMachineMapping"]: (config) => ok(config, []),

  ["post /dDH.Service.SMS.Services.PublicInterface/publicQMInfo/getGHGSQMInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services.PublicInterface/publicQMInfo/getSgCode"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/PublicInterface/publicQMInfo/getSgCodeAndStd"]: (config) =>
    ok(
      config,
      demoRows(4, (i) => ({
        cSgCode: ["Q235B", "Q345B", "SPHC", "45#"][i] || "Q235B",
        cSgStd: "GB/T 700-2006",
        nThick: 10 + i * 2,
        nWidth: 1500,
        nLen: 8000,
        operationButtonText: "选择",
      })),
    ),

  ["post /dDH.Service.SMS.Services.SMSControlServices/uCCustomPLCPointShowInfo/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services.SMSControlServices/uCCustomPLCPointShowInfo/save"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services.SMSControlServices/uCGYYD/getGYYDInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services.SMSControlServices/uCMSStoveInputInfo/getStoveInputInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services.SMSControlServices/uCMSStoveInputInfo/saveStoveInputInfo"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services.Tag/frmTag/enableData"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services.Tag/frmTag/getAllTableFieldList"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services.Tag/frmTag/getRdbUseTypeEnumOF"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services.Tag/frmTag/getRdbUseTypeEnumP"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services.Tag/frmTag/invalidData"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services.Tag/frmTag/queryTagInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services.Tag/frmTag/revemoData"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services.Tag/frmTagRecord/getTagRecordInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS1000/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS1000/save"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1001/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS1001/save"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1002/checkSave"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1002/createData"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1002/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS1002/save"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1021/checkSave"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1021/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS1021/save"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1030/checkRemoveData"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1030/checkUpdatePackState"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1030/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS1030/removeData"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1030/updatePackState"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1030/updatePackStateForBake"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1040/queryPLCPointInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS1050/addTms1050"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1050/deleteTms1050"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1050/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS1050/queryTms1050"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS1050/remove"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1050/save"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS1050/updateTms1050"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2000/checkAllowChangeStoveSgCode"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2000/checkPlanInvalid"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2000/checkStovePlanHaveProductionByIds"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2000/checkWhenAddGanttPoint"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2000/clearRoutePlanByIds"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2000/getGanttResourcesDatas"]: (config) =>
    ok(config, ganttMachines()),

  /* 导出未覆盖：回空，不造演示行 */
  ["post /dDH.Service.SMS.Services/frmMS2000/getProcMachineUseTime"]: (config) => ok(config, []),

  ["post /dDH.Service.SMS.Services/frmMS2000/getProcTransTime"]: (config) => ok(config, []),

  ["post /dDH.Service.SMS.Services/frmMS2000/getStovePlanInfoByGsIds"]: (config) => {
    const body = getBody<{ gsIds?: string[] }>(config) ?? {};
    const ids = new Set(body.gsIds ?? []);
    const byId = new Map(ganttStovePlans().map((r) => [r.id as string, r]));
    return ok(config, [...ids].map((id) => byId.get(id)).filter(Boolean));
  },

  ["post /dDH.Service.SMS.Services/frmMS2000/getStoveRouteDatas"]: (config) =>
    ok(config, ganttPoints()),

  ["post /dDH.Service.SMS.Services/frmMS2000/getStoveRouteHistoryDatas1"]: (config) =>
    ok(config, {
      ganttDataDto_StoveRoutePlans: ganttPoints(),
      stoveIsExist: true,
      stoveIsVirtual: false,
      tms2000Virtual: null,
    }),

  ["post /dDH.Service.SMS.Services/frmMS2000/planInvalid"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2000/planInvalidCancel"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2000/queryStovePlan"]: (config) =>
    ok(config, ganttStovePlans()),

  ["post /dDH.Service.SMS.Services/frmMS2000/saveGanttDatas"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2010/cehckSetTsToKRCancel"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2010/checkTSInStation"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2010/checkTSInStationByList"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2010/checkUpdateTSDatatState"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2010/getIntrusionDatas"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2010/getTsQMInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2010/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2010/query2"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2010/sendTSQM"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2010/setTsToKR"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2010/setTsToKRCancel"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2010/updateTBInOrOutStation"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2010/updateTSDatatState"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2020/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2020/saveData"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2020/sendTSQM"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2020/setKRBeg"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2020/setKRBegCancel"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2020/setKREnd"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2020/setKREndCancel"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2030/checkRemove"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2030/queryItem"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2030/queryMain"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2030/remove"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2030/save"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2100_X_Message/checkIsNeedShowDialog"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2100_X_ShiftInfo_Query/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2100_ZL/addTieShuiUsed"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2100_ZL/cancelCreateStoveNo"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2100_ZL/checkCancelCreateStoveNo"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2100_ZL/checkStoveOut"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2100_ZL/getTms2011BofData"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2100_ZL/queryRoutePlans"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2100_ZL/saveTms2011BofData"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2100_ZL/stoveOut"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2100_ZL_VirtualStoveNo/checkPreviewOrAddVirtualStoveNo"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2100_ZL_VirtualStoveNo/getVirtualStoveNoDatas"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2101/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2110_LF/cancelStoveArrived"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2110_LF/checkCancelStoveArrived"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2110_LF/checkStoveArrived"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2110_LF/checkStoveLeave"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2110_LF/getTms2012LFData"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2110_LF/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2110_LF/queryRoutePlans"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2110_LF/saveTms2012LFData"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2110_LF/stoveArrived"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2110_LF/stoveLeave"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2120_RH/cancelStoveArrived"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2120_RH/checkCancelStoveArrived"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2120_RH/checkStoveArrived"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2120_RH/checkStoveLeave"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2120_RH/getTms2013RHData"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2120_RH/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2120_RH/queryRoutePlans"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2120_RH/saveTms2013RHData"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2120_RH/stoveArrived"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2120_RH/stoveLeave"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/cancelStoveArrived"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/cancelStoveProBeg"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/cancelStoveProEnd"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/checkCancelStoveArrived"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/checkCancelStoveProBeg"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/checkCancelStoveProEnd"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/checkStoveArrived"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/checkStoveProBeg"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/checkStoveProEnd"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/getTms2014CCMData"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/queryRoutePlans"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/saveTms2014CCMData"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/setTextEditShow"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/stoveArrived"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/stoveProBeg"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2130_LZ/stoveProEnd"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2140/addPiece"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2140/checkUpdatePieceInfo"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2140/getOutInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2140/queryRoutePlans"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2140/removePiece"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2141/queryOrderInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2142/autoAddStoveOutInfo"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2142/checkUpdatePieceSizeInfo"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2142/getSgCodeSimpDatas"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS2142/updatePieceSizeInfo"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS2300Log/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS3000/cancelGSReback"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS3000/checkCancelGSReback"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS3000/checkGSReback"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS3000/gSReback"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS3000/queryStoveInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS3000/queryStoveInputInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS3000/queryStoveOutputInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS3000/queryStoveRoutePlanInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS3100/queryLineChartDatas"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS3100/queryTagInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS9000/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS9020/cancelCutStorage"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS9020/hotCutStorage"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/frmMS9020/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/frmMS9020/queryHotCutSJ"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/mS9200/get9200DayHzDtos"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/mS9200/get9200GroupHzDtos"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/mS9200/get9200SgCodeHzDtos"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/mS9200/get9200StoveHzDtos"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/mS9200/getMS9200sDto"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/mS9210/get9210Dtos"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/tms3000/cancelCutStorage"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/tms3000/cancelException"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/tms3000/delSjByPieceNo"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/tms3000/hotCutStorage"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/tms3000/importSlab"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/tms3000/queryHotCutSJ"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/tms3000/queryList"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/tms3000/setException"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/tms9001/cancelMathPlan"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/tms9001/cancelMathPlanAndZp"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/tms9001/getPlans"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `PL-${i + 1}`,
        planNo: `JH${i + 1}`,
        cSgCode: "Q235B",
        nPlanNum: 10 + i,
        nStorageNum: 4 + i,
      })),
    ),

  ["post /dDH.Service.SMS.Services/tms9001/getStorages"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `D${i + 1}`,
        cCode: `C0${i + 1}`,
        cName: `演示${i + 1}`,
        createTime: "2026-09-23 08:00:00",
        nStatus: 1,
      })),
    ),

  ["post /dDH.Service.SMS.Services/tms9001/mathPlan"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/tms9001/mathPlanAndZp"]: (config) => ok(config, null),

  ["post /dDH.Service.SMS.Services/tms9001/queryStorages"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({
        id: `ST-${i + 1}`,
        cPieceNo: `P00${i + 1}A`,
        cStove: `S26C0${i + 1}`,
        cSgCode: "Q235B",
        cSpec: "20*2200*C",
        nThick: 20,
        nWth: 2200,
        nLen: 8000,
        nNum: 2,
        nCalWgt: 2748.5,
        nStatus: 10,
        selected: false,
      })),
    ),

  /* C4 MS22xx 查询等补漏 */
  ["post /dDH.Service.SMS.Services/frmMS2200_ZL/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, cCode: `C0${i + 1}`, cName: `演示${i + 1}`, createTime: "2026-09-23 08:00:00", nStatus: 1 })),
    ),
  ["post /dDH.Service.SMS.Services/frmMS2210_LF/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, cCode: `C0${i + 1}`, cName: `演示${i + 1}`, createTime: "2026-09-23 08:00:00", nStatus: 1 })),
    ),
  ["post /dDH.Service.SMS.Services/frmMS2220_RH/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, cCode: `C0${i + 1}`, cName: `演示${i + 1}`, createTime: "2026-09-23 08:00:00", nStatus: 1 })),
    ),
  ["post /dDH.Service.SMS.Services/frmMS2230_LZ/query"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, cCode: `C0${i + 1}`, cName: `演示${i + 1}`, createTime: "2026-09-23 08:00:00", nStatus: 1 })),
    ),
  ["post /dDH.Service.SMS.Services/frmMS2100_X_ShiftInfo/getProcUserInfo"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, cCode: `C0${i + 1}`, cName: `演示${i + 1}`, createTime: "2026-09-23 08:00:00", nStatus: 1 })),
    ),
  ["post /hmx.Service.Widgets.Services/tPa1000/queryMachine"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, cCode: `C0${i + 1}`, cName: `演示${i + 1}`, createTime: "2026-09-23 08:00:00", nStatus: 1 })),
    ),
  ["post /hmx.Service.Widgets.Services/tPa1000/queryLines"]: (config) =>
    ok(
      config,
      demoRows(3, (i) => ({ id: `D${i + 1}`, cCode: `C0${i + 1}`, cName: `演示${i + 1}`, createTime: "2026-09-23 08:00:00", nStatus: 1 })),
    ),
};
