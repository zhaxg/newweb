/**
 * SMS 域后端接口（dDH.Service.SMS.Services）：类型 + 请求，单文件维护。
 * 仓储物流迁移首次引入（FrmYD2010 删除坯料 / 取消匹配订单）。
 * 炼钢作业迁移补齐（2026-09-23）：frmMS、uC、frmTag、mS92 系列等。
 */

import { requestClient } from "@/api/_core/request";
import type { Tyd2000Dto } from "./syd.swagger";

/* ---------- 类型 ---------- */

/** 取消匹配订单入参（原 Tms9000MatchDto） */
export interface Tms9000MatchDto {
  /** 材料号列表（原 PieceNos） */
  pieceNos?: string[] | null;
  /** 匹配日计划ID（原 MatchPlanId） */
  matchPlanId?: string | null;
  /** 是否强制匹配（原 IsAllow） */
  isAllow?: boolean | null;
  /** 取消匹配原因（原 Reason） */
  reason?: string | null;
  cOrderNo?: string | null;
  cPieceNo?: string | null;
  cBatchNo?: string | null;
  cStove?: string | null;
  nProType?: number | null;
}
/** 异常坯标记入参（原 MS3000ExceptionDto） */
export interface MS3000ExceptionDto {
  pieceNos?: string[] | null;
  exceptionType?: string | null;
}
/** 板坯导入行（原 SlabImportDto） */
export interface SlabImportDto {
  pieceNo?: string | null;
  cStove?: string | null;
  cSgCode?: string | null;
  nThick?: number | null;
  nWth?: number | null;
  nLen?: number | null;
  cRemark?: string | null;
}
/** 坯料补录入参（原 Tms9000StorageItemDto，FrmMS9003） */
export interface Tms9000StorageItemDto {
  cStove?: string | null;
  nThick?: number;
  nWth?: number;
  nLen?: number;
  cLineCode?: string | null;
  cMachine?: string | null;
}
/** 库存坯料查询入参（原 MS3000SjInputDto，MS9010） */
export interface MS3000SjInputDto {
  lineCode?: string | null;
  cStoreCode?: string | null;
  machine?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  thickRange?: DecimalRange | null;
  wthRange?: DecimalRange | null;
  lenRange?: DecimalRange | null;
  timeRange?: TimeRange | null;
}
/** 十进制区间（SMS 域本地副本） */
export interface DecimalRange {
  min?: number | null;
  max?: number | null;
}
/** 时间区间（SMS 域本地副本） */
export interface TimeRange {
  begin?: string | null;
  end?: string | null;
}
/** 炼钢配置 KV（原 HmxKv，MP2033 publicKV） */
export interface HmxKv {
  id?: string | null;
  cPid?: string | null;
  cCode?: string | null;
  cName?: string | null;
  cValue?: string | null;
  cDesc?: string | null;
  cEnable?: string | null;
  cOrder?: string | null;
  cGroup?: string | null;
  selected?: boolean;
}
/** 钢种执行标准（原 SgCodeAndStdDto，MP2033 publicQMInfo） */
export interface SgCodeAndStdDto {
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  operationButtonText?: string | null;
}
/** 成品库存行（原 Tyd2000Dto，MS9010 queryStorages 返回，重导出） */
export type { Tyd2000Dto };

/* ---------- Api ---------- */

export const tms3000Api = {
  /** 删除坯料（原 DelSjByPieceNo，FrmYD2010 btnDeleteSJ） */
  delSjByPieceNo(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMS.Services/tms3000/delSjByPieceNo",
      {
        method: "post",
        data,
      },
    );
  },
  /** 标记异常坯（原 SetException，FrmYD2010 btnSetException） */
  setException(data?: MS3000ExceptionDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMS.Services/tms3000/setException",
      {
        method: "post",
        data,
      },
    );
  },
  /** 取消标记异常（原 CancelException，FrmYD2010 btnSetCancelException） */
  cancelException(data?: MS3000ExceptionDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMS.Services/tms3000/cancelException",
      {
        method: "post",
        data,
      },
    );
  },
  /** 板坯导入入库（原 ImportSlab，FrmYD2010 simpleButton1） */
  importSlab(data?: SlabImportDto[], lineCode?: string, machineCode?: string, storeCode?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SMS.Services/tms3000/importSlab",
      {
        method: "post",
        data,
        params: { lineCode, machineCode, storeCode },
      },
    );
  },
  /** 查询炼钢产出实绩（原 QueryList，MS9000） */
  queryList(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/tms3000/queryList", {
      method: "post",
      data,
    });
  },
  /** 火切入库（原 HotCutStorage，MS9020） */
  hotCutStorage(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/tms3000/hotCutStorage", {
      method: "post",
      data,
    });
  },
  /** 取消火切（原 CancelCutStorage，MS9020） */
  cancelCutStorage(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/tms3000/cancelCutStorage", {
      method: "post",
      data,
    });
  },
  /** 火切实绩查询（原 QueryHotCutSJ，MS9020） */
  queryHotCutSJ(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/tms3000/queryHotCutSJ", {
      method: "post",
      data,
    });
  },
};

export const tms9001Api = {
  /** 取消匹配订单（原 CancelMathPlanAndZp，FrmYD2010 btnCancelOrder） */
  cancelMathPlanAndZp(data?: Tms9000MatchDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMS.Services/tms9001/cancelMathPlanAndZp",
      {
        method: "post",
        data,
      },
    );
  },
  /** 库存坯料查询（原 QueryStorages，MS9010 btnQueryStorage） */
  queryStorages(data?: MS3000SjInputDto) {
    return requestClient.request<Tyd2000Dto[]>(
      "/dDH.Service.SMS.Services/tms9001/queryStorages",
      { method: "post", data },
    );
  },
  /** 匹配计划（原 MathPlan，MS9010 btnMatch） */
  mathPlan(data?: Tms9000MatchDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMS.Services/tms9001/mathPlan",
      { method: "post", data },
    );
  },
  /** 取消匹配（原 CancelMathPlan，MS9010 btnCancelMatch） */
  cancelMathPlan(data?: Tms9000MatchDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMS.Services/tms9001/cancelMathPlan",
      { method: "post", data },
    );
  },
  /** 匹配计划+组批（原 MathPlanAndZp，MS9001/MS2141） */
  mathPlanAndZp(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/tms9001/mathPlanAndZp", {
      method: "post",
      data,
    });
  },
  /** 计划查询（原 GetPlans，MS9001） */
  getPlans(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/tms9001/getPlans", {
      method: "post",
      data,
    });
  },
  /** 库存查询（原 GetStorages，MS9001） */
  getStorages(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/tms9001/getStorages", {
      method: "post",
      data,
    });
  },
};

/** 炼钢公共配置（原 IPublicKVAppService，MP2033/炼钢） */
export const publicKVApi = {
  getMSConfig(code?: string, enable?: string) {
    return requestClient.request<HmxKv[]>(
      "/dDH.Service.SMS.Services.PublicInterface/publicKV/getMSConfig",
      { method: "post", params: { code, enable } },
    );
  },
  getKvInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.PublicInterface/publicKV/getKvInfo", {
      method: "post",
      data,
    });
  },
  getMsProcMachineMapping(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.PublicInterface/publicKV/getMsProcMachineMapping", {
      method: "post",
      data,
    });
  },
  getMSLZLiu(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.PublicInterface/publicKV/getMSLZLiu", {
      method: "post",
      data,
    });
  },
};

/** 炼钢公共质量信息（原 IPublicQMInfoAppService） */
export const publicQMInfoApi = {
  getSgCodeAndStd() {
    return requestClient.request<SgCodeAndStdDto[]>(
      "/dDH.Service.SMS.Services.PublicInterface/publicQMInfo/getSgCodeAndStd",
      { method: "post" },
    );
  },
  getSgCode(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.PublicInterface/publicQMInfo/getSgCode", {
      method: "post",
      data,
    });
  },
  getGHGSQMInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.PublicInterface/publicQMInfo/getGHGSQMInfo", {
      method: "post",
      data,
    });
  },
};

/* ---------- 炼钢作业迁移补齐（2026-09-23） ---------- */

export const frmMS1000Api = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1000/query", {
      method: "post",
      data,
    });
  },
  save(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1000/save", {
      method: "post",
      data,
    });
  },
};

export const frmMS1001Api = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1001/query", {
      method: "post",
      data,
    });
  },
  save(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1001/save", {
      method: "post",
      data,
    });
  },
};

export const frmMS1002Api = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1002/query", {
      method: "post",
      data,
    });
  },
  createData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1002/createData", {
      method: "post",
      data,
    });
  },
  checkSave(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1002/checkSave", {
      method: "post",
      data,
    });
  },
  save(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1002/save", {
      method: "post",
      data,
    });
  },
};

export const frmMS1021Api = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1021/query", {
      method: "post",
      data,
    });
  },
  checkSave(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1021/checkSave", {
      method: "post",
      data,
    });
  },
  save(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1021/save", {
      method: "post",
      data,
    });
  },
};

export const frmMS1030Api = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1030/query", {
      method: "post",
      data,
    });
  },
  checkRemoveData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1030/checkRemoveData", {
      method: "post",
      data,
    });
  },
  removeData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1030/removeData", {
      method: "post",
      data,
    });
  },
  updatePackStateForBake(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1030/updatePackStateForBake", {
      method: "post",
      data,
    });
  },
  checkUpdatePackState(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1030/checkUpdatePackState", {
      method: "post",
      data,
    });
  },
  updatePackState(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1030/updatePackState", {
      method: "post",
      data,
    });
  },
};

export const frmMS1040Api = {
  queryPLCPointInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1040/queryPLCPointInfo", {
      method: "post",
      data,
    });
  },
};

export const uCCustomPLCPointShowInfoApi = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.SMSControlServices/uCCustomPLCPointShowInfo/query", {
      method: "post",
      data,
    });
  },
  save(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.SMSControlServices/uCCustomPLCPointShowInfo/save", {
      method: "post",
      data,
    });
  },
};

export const frmMS2000Api = {
  saveGanttDatas(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/saveGanttDatas", {
      method: "post",
      data,
    });
  },
  checkWhenAddGanttPoint(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/checkWhenAddGanttPoint", {
      method: "post",
      data,
    });
  },
  getStoveRouteDatas(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/getStoveRouteDatas", {
      method: "post",
      data,
    });
  },
  checkAllowChangeStoveSgCode(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/checkAllowChangeStoveSgCode", {
      method: "post",
      data,
    });
  },
  getStovePlanInfoByGsIds(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/getStovePlanInfoByGsIds", {
      method: "post",
      data,
    });
  },
  getGanttResourcesDatas(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/getGanttResourcesDatas", {
      method: "post",
      data,
    });
  },
  getStoveRouteHistoryDatas1(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/getStoveRouteHistoryDatas1", {
      method: "post",
      data,
    });
  },
  getProcMachineUseTime(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/getProcMachineUseTime", {
      method: "post",
      data,
    });
  },
  getProcTransTime(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/getProcTransTime", {
      method: "post",
      data,
    });
  },
  queryStovePlan(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/queryStovePlan", {
      method: "post",
      data,
    });
  },
  clearRoutePlanByIds(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/clearRoutePlanByIds", {
      method: "post",
      data,
    });
  },
  checkPlanInvalid(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/checkPlanInvalid", {
      method: "post",
      data,
    });
  },
  planInvalid(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/planInvalid", {
      method: "post",
      data,
    });
  },
  planInvalidCancel(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/planInvalidCancel", {
      method: "post",
      data,
    });
  },
  checkStovePlanHaveProductionByIds(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2000/checkStovePlanHaveProductionByIds", {
      method: "post",
      data,
    });
  },
};

export const frmMS2010Api = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2010/query", {
      method: "post",
      data,
    });
  },
  checkTSInStation(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2010/checkTSInStation", {
      method: "post",
      data,
    });
  },
  updateTBInOrOutStation(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2010/updateTBInOrOutStation", {
      method: "post",
      data,
    });
  },
  setTsToKR(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2010/setTsToKR", {
      method: "post",
      data,
    });
  },
  cehckSetTsToKRCancel(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2010/cehckSetTsToKRCancel", {
      method: "post",
      data,
    });
  },
  setTsToKRCancel(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2010/setTsToKRCancel", {
      method: "post",
      data,
    });
  },
  checkTSInStationByList(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2010/checkTSInStationByList", {
      method: "post",
      data,
    });
  },
  sendTSQM(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2010/sendTSQM", {
      method: "post",
      data,
    });
  },
  getTsQMInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2010/getTsQMInfo", {
      method: "post",
      data,
    });
  },
  query2(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2010/query2", {
      method: "post",
      data,
    });
  },
  checkUpdateTSDatatState(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2010/checkUpdateTSDatatState", {
      method: "post",
      data,
    });
  },
  updateTSDatatState(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2010/updateTSDatatState", {
      method: "post",
      data,
    });
  },
  getIntrusionDatas(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2010/getIntrusionDatas", {
      method: "post",
      data,
    });
  },
};

export const frmMS2020Api = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2020/query", {
      method: "post",
      data,
    });
  },
  setKRBeg(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2020/setKRBeg", {
      method: "post",
      data,
    });
  },
  setKRBegCancel(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2020/setKRBegCancel", {
      method: "post",
      data,
    });
  },
  setKREnd(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2020/setKREnd", {
      method: "post",
      data,
    });
  },
  setKREndCancel(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2020/setKREndCancel", {
      method: "post",
      data,
    });
  },
  sendTSQM(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2020/sendTSQM", {
      method: "post",
      data,
    });
  },
  saveData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2020/saveData", {
      method: "post",
      data,
    });
  },
};

export const frmMS2030Api = {
  queryMain(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2030/queryMain", {
      method: "post",
      data,
    });
  },
  save(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2030/save", {
      method: "post",
      data,
    });
  },
  checkRemove(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2030/checkRemove", {
      method: "post",
      data,
    });
  },
  remove(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2030/remove", {
      method: "post",
      data,
    });
  },
  queryItem(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2030/queryItem", {
      method: "post",
      data,
    });
  },
};

export const uCMSStoveInputInfoApi = {
  getStoveInputInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.SMSControlServices/uCMSStoveInputInfo/getStoveInputInfo", {
      method: "post",
      data,
    });
  },
  saveStoveInputInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.SMSControlServices/uCMSStoveInputInfo/saveStoveInputInfo", {
      method: "post",
      data,
    });
  },
};

export const uCGYYDApi = {
  getGYYDInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.SMSControlServices/uCGYYD/getGYYDInfo", {
      method: "post",
      data,
    });
  },
};

export const frmMS2101Api = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2101/query", {
      method: "post",
      data,
    });
  },
};

export const frmMS2140Api = {
  queryRoutePlans(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2140/queryRoutePlans", {
      method: "post",
      data,
    });
  },
  getOutInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2140/getOutInfo", {
      method: "post",
      data,
    });
  },
  addPiece(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2140/addPiece", {
      method: "post",
      data,
    });
  },
  removePiece(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2140/removePiece", {
      method: "post",
      data,
    });
  },
  checkUpdatePieceInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2140/checkUpdatePieceInfo", {
      method: "post",
      data,
    });
  },
};

export const frmMS2141Api = {
  queryOrderInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2141/queryOrderInfo", {
      method: "post",
      data,
    });
  },
};

export const frmMS2142Api = {
  getSgCodeSimpDatas(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2142/getSgCodeSimpDatas", {
      method: "post",
      data,
    });
  },
  autoAddStoveOutInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2142/autoAddStoveOutInfo", {
      method: "post",
      data,
    });
  },
  checkUpdatePieceSizeInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2142/checkUpdatePieceSizeInfo", {
      method: "post",
      data,
    });
  },
  updatePieceSizeInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2142/updatePieceSizeInfo", {
      method: "post",
      data,
    });
  },
};

export const frmMS2300LogApi = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2300Log/query", {
      method: "post",
      data,
    });
  },
};

export const frmMS3000Api = {
  queryStoveInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS3000/queryStoveInfo", {
      method: "post",
      data,
    });
  },
  queryStoveRoutePlanInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS3000/queryStoveRoutePlanInfo", {
      method: "post",
      data,
    });
  },
  queryStoveInputInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS3000/queryStoveInputInfo", {
      method: "post",
      data,
    });
  },
  queryStoveOutputInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS3000/queryStoveOutputInfo", {
      method: "post",
      data,
    });
  },
  checkGSReback(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS3000/checkGSReback", {
      method: "post",
      data,
    });
  },
  gSReback(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS3000/gSReback", {
      method: "post",
      data,
    });
  },
  checkCancelGSReback(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS3000/checkCancelGSReback", {
      method: "post",
      data,
    });
  },
  cancelGSReback(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS3000/cancelGSReback", {
      method: "post",
      data,
    });
  },
};

export const frmMS3100Api = {
  queryTagInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS3100/queryTagInfo", {
      method: "post",
      data,
    });
  },
  queryLineChartDatas(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS3100/queryLineChartDatas", {
      method: "post",
      data,
    });
  },
};

export const frmTagApi = {
  getRdbUseTypeEnumOF(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.Tag/frmTag/getRdbUseTypeEnumOF", {
      method: "post",
      data,
    });
  },
  getRdbUseTypeEnumP(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.Tag/frmTag/getRdbUseTypeEnumP", {
      method: "post",
      data,
    });
  },
  getAllTableFieldList(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.Tag/frmTag/getAllTableFieldList", {
      method: "post",
      data,
    });
  },
  queryTagInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.Tag/frmTag/queryTagInfo", {
      method: "post",
      data,
    });
  },
  revemoData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.Tag/frmTag/revemoData", {
      method: "post",
      data,
    });
  },
  enableData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.Tag/frmTag/enableData", {
      method: "post",
      data,
    });
  },
  invalidData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.Tag/frmTag/invalidData", {
      method: "post",
      data,
    });
  },
};

export const frmTagRecordApi = {
  getTagRecordInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.Tag/frmTagRecord/getTagRecordInfo", {
      method: "post",
      data,
    });
  },
};

export const frmMS2100_ZLApi = {
  queryRoutePlans(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2100_ZL/queryRoutePlans", {
      method: "post",
      data,
    });
  },
  addTieShuiUsed(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2100_ZL/addTieShuiUsed", {
      method: "post",
      data,
    });
  },
  checkCancelCreateStoveNo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2100_ZL/checkCancelCreateStoveNo", {
      method: "post",
      data,
    });
  },
  cancelCreateStoveNo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2100_ZL/cancelCreateStoveNo", {
      method: "post",
      data,
    });
  },
  checkStoveOut(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2100_ZL/checkStoveOut", {
      method: "post",
      data,
    });
  },
  stoveOut(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2100_ZL/stoveOut", {
      method: "post",
      data,
    });
  },
  getTms2011BofData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2100_ZL/getTms2011BofData", {
      method: "post",
      data,
    });
  },
  saveTms2011BofData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2100_ZL/saveTms2011BofData", {
      method: "post",
      data,
    });
  },
};

export const frmMS2110_LFApi = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2110_LF/query", {
      method: "post",
      data,
    });
  },
};

export const frmMS2120RHApi = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2120_RH/query", {
      method: "post",
      data,
    });
  },
};

export const frmMS2130LZApi = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/query", {
      method: "post",
      data,
    });
  },
};

export const frmMS1050Api = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1050/query", {
      method: "post",
      data,
    });
  },
  save(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1050/save", {
      method: "post",
      data,
    });
  },
  remove(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1050/remove", {
      method: "post",
      data,
    });
  },
};

export const publicFactoryLineAreaMachineApi = {
  getFactoryLineAreaMachine_LG(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services.PublicInterface/publicFactoryLineAreaMachine/getFactoryLineAreaMachine_LG", {
      method: "post",
      data,
    });
  },
};

export const frmMS9020Api = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS9020/query", {
      method: "post",
      data,
    });
  },
  hotCutStorage(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS9020/hotCutStorage", {
      method: "post",
      data,
    });
  },
  cancelCutStorage(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS9020/cancelCutStorage", {
      method: "post",
      data,
    });
  },
  queryHotCutSJ(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS9020/queryHotCutSJ", {
      method: "post",
      data,
    });
  },
};

export const frmMS9000Api = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS9000/query", {
      method: "post",
      data,
    });
  },
};

export const frmMS2100XShiftInfoQueryApi = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2100_X_ShiftInfo_Query/query", {
      method: "post",
      data,
    });
  },

  getProcUserInfo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2100_X_ShiftInfo/getProcUserInfo", {
      method: "post",
      data,
    });
  },};

export const frmMS2100ZLVirtualStoveNoApi = {
  getVirtualStoveNoDatas(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2100_ZL_VirtualStoveNo/getVirtualStoveNoDatas", {
      method: "post",
      data,
    });
  },
  checkPreviewOrAddVirtualStoveNo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2100_ZL_VirtualStoveNo/checkPreviewOrAddVirtualStoveNo", {
      method: "post",
      data,
    });
  },
};

export const frmMS2100XMessageApi = {
  checkIsNeedShowDialog(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2100_X_Message/checkIsNeedShowDialog", {
      method: "post",
      data,
    });
  },
};

export const mS9200Api = {
  getMS9200sDto(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/mS9200/getMS9200sDto", {
      method: "post",
      data,
    });
  },
  get9200DayHzDtos(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/mS9200/get9200DayHzDtos", {
      method: "post",
      data,
    });
  },
  get9200GroupHzDtos(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/mS9200/get9200GroupHzDtos", {
      method: "post",
      data,
    });
  },
  get9200StoveHzDtos(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/mS9200/get9200StoveHzDtos", {
      method: "post",
      data,
    });
  },
  get9200SgCodeHzDtos(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/mS9200/get9200SgCodeHzDtos", {
      method: "post",
      data,
    });
  },
};

export const frmMS2110LFFullApi = {
  queryRoutePlans(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2110_LF/queryRoutePlans", {
      method: "post",
      data,
    });
  },
  checkStoveArrived(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2110_LF/checkStoveArrived", {
      method: "post",
      data,
    });
  },
  stoveArrived(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2110_LF/stoveArrived", {
      method: "post",
      data,
    });
  },
  checkCancelStoveArrived(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2110_LF/checkCancelStoveArrived", {
      method: "post",
      data,
    });
  },
  cancelStoveArrived(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2110_LF/cancelStoveArrived", {
      method: "post",
      data,
    });
  },
  checkStoveLeave(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2110_LF/checkStoveLeave", {
      method: "post",
      data,
    });
  },
  stoveLeave(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2110_LF/stoveLeave", {
      method: "post",
      data,
    });
  },
  getTms2012LFData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2110_LF/getTms2012LFData", {
      method: "post",
      data,
    });
  },
  saveTms2012LFData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2110_LF/saveTms2012LFData", {
      method: "post",
      data,
    });
  },
};

export const frmMS2120RHFullApi = {
  queryRoutePlans(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2120_RH/queryRoutePlans", { method: "post", data });
  },
  checkStoveArrived(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2120_RH/checkStoveArrived", { method: "post", data });
  },
  stoveArrived(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2120_RH/stoveArrived", { method: "post", data });
  },
  checkCancelStoveArrived(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2120_RH/checkCancelStoveArrived", { method: "post", data });
  },
  cancelStoveArrived(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2120_RH/cancelStoveArrived", { method: "post", data });
  },
  checkStoveLeave(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2120_RH/checkStoveLeave", { method: "post", data });
  },
  stoveLeave(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2120_RH/stoveLeave", { method: "post", data });
  },
  getTms2013RHData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2120_RH/getTms2013RHData", { method: "post", data });
  },
  saveTms2013RHData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2120_RH/saveTms2013RHData", { method: "post", data });
  },
};

export const frmMS2130LZFullApi = {
  queryRoutePlans(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/queryRoutePlans", { method: "post", data });
  },
  checkStoveArrived(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/checkStoveArrived", { method: "post", data });
  },
  stoveArrived(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/stoveArrived", { method: "post", data });
  },
  checkCancelStoveArrived(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/checkCancelStoveArrived", { method: "post", data });
  },
  cancelStoveArrived(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/cancelStoveArrived", { method: "post", data });
  },
  checkStoveProBeg(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/checkStoveProBeg", { method: "post", data });
  },
  stoveProBeg(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/stoveProBeg", { method: "post", data });
  },
  checkCancelStoveProBeg(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/checkCancelStoveProBeg", { method: "post", data });
  },
  cancelStoveProBeg(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/cancelStoveProBeg", { method: "post", data });
  },
  checkStoveProEnd(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/checkStoveProEnd", { method: "post", data });
  },
  stoveProEnd(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/stoveProEnd", { method: "post", data });
  },
  checkCancelStoveProEnd(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/checkCancelStoveProEnd", { method: "post", data });
  },
  cancelStoveProEnd(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/cancelStoveProEnd", { method: "post", data });
  },
  getTms2014CCMData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/getTms2014CCMData", { method: "post", data });
  },
  saveTms2014CCMData(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/saveTms2014CCMData", { method: "post", data });
  },
  setTextEditShow(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2130_LZ/setTextEditShow", { method: "post", data });
  },
};

export const frmMS1050FullApi = {
  queryTms1050(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1050/queryTms1050", { method: "post", data });
  },
  addTms1050(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1050/addTms1050", { method: "post", data });
  },
  updateTms1050(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1050/updateTms1050", { method: "post", data });
  },
  deleteTms1050(id?: string) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS1050/deleteTms1050", {
      method: "post",
      params: { id },
    });
  },
};

/** mS9210Api（炼钢作业迁移补齐） */
export const mS9210Api = {
  get9210Dtos(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/mS9210/get9210Dtos", {
      method: "post",
      data,
    });
  },
};

/** frmMS2200ZLApi（炼钢作业 C4 补齐） */
export const frmMS2200ZLApi = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2200_ZL/query", {
      method: "post",
      data,
    });
  },
};

/** frmMS2210LFApi（炼钢作业 C4 补齐） */
export const frmMS2210LFApi = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2210_LF/query", {
      method: "post",
      data,
    });
  },
};

/** frmMS2220RHApi（炼钢作业 C4 补齐） */
export const frmMS2220RHApi = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2220_RH/query", {
      method: "post",
      data,
    });
  },
};

/** frmMS2230LZApi（炼钢作业 C4 补齐） */
export const frmMS2230LZApi = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMS.Services/frmMS2230_LZ/query", {
      method: "post",
      data,
    });
  },
};

/** tPa1000Api（炼钢作业 C4 补齐） */
export const tPa1000Api = {
  queryMachine(data?: unknown) {
    return requestClient.request<any>("/hmx.Service.Widgets.Services/tPa1000/queryMachine", {
      method: "post",
      data,
    });
  },
  queryLines(data?: unknown) {
    return requestClient.request<any>("/hmx.Service.Widgets.Services/tPa1000/queryLines", {
      method: "post",
      data,
    });
  },
};
