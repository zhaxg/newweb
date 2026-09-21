import { requestClient } from "@/api/_core/request";

import type {
  BooleanStringValueTuple,
  ChyThickItemDto,
  ChyWidthItemDto,
  DtoAddPlans,
  DtoAddSj,
  DtoAddZp,
  DtoAutoZp,
  DtoEnsure,
  DtoFurWork,
  DtoInsertLog,
  DtoInsertLogs,
  DtoMoveThr3000,
  DtoP48J03,
  DtoQueryL2,
  DtoQueryLog,
  DtoQuerySlabs,
  DtoQueryTdm1000,
  DtoQueryTdm1020,
  DtoQueryTdm1030,
  DtoQueryThr2000,
  DtoQueryThr3000,
  DtoSaveZp,
  DtoTdaZb037Query,
  DtoTdm1020InstallRoller,
  DtoThr3010,
  DtoThr4000,
  DtoTi1000Query,
  DtoTi1010Query,
  DtoTi1020Query,
  DtoTi1030Query,
  DtoTi1040Query,
  DtoTi1050Query,
  DtoTi1060Query,
  DtoTi1070Query,
  DtoTi1080Query,
  DtoTi1210Query,
  DtoZgWork,
  FhwdItemDto,
  HlDto,
  ImportHR2000Dto,
  PlanCcDto,
  Query3030Dto,
  QueryPrintInputDto,
  QueryRollDetail,
  QueryThr1000Dto,
  SaveJqDto,
  TdaZb001,
  TdaZb037,
  TdaZb232,
  Tdm1000,
  Tdm1010,
  Tdm1020,
  Tdm1030,
  Tdm1030SaveChangesData,
  Tdm1040,
  Tdm1040SaveChangesData,
  Thr1000,
  Thr1000SaveChangesData,
  Thr2000,
  Thr2000Dto,
  Thr3000,
  Thr3000Dto,
  Thr3010,
  Thr3010Hl,
  Thr3020,
  Thr3030,
  Thr3040,
  Thr3040Dto,
  Thr4000,
  Thr4000Dto,
  Thr4000Edit,
  Thr4000SaveChangesData,
  ThrLog,
  Ti1000Dto,
  Ti1000_1Dto,
  Ti1010Dto,
  Ti1020Dto,
  Ti1020_1Dto,
  Ti1030Dto,
  Ti1040Dto,
  Ti1050Dto,
  Ti1060Dto,
  Ti1070Dto,
  Ti1080Dto,
  Ti1090_InStoveDto,
  Ti1090_OutStoveDto,
  Ti1200Dto,
  Ti1210Dto,
  Ti1211Dto,
  TiL2me01,
  TiL2me02,
  TiL2me021,
  TiL2me03,
  TiL2me04,
  TiL2me05,
  TiL2me06,
  TiL2me08,
  TiL2me09,
  TiL2me11,
  TiL2me12,
  TiL2me14,
  TiL2me15,
  TiL2me16,
  TiL2me17,
  TiL2me18,
  TiL2me19,
  TiP48j01,
  TiP48j02,
  TiP48j031,
  TiP48j04,
  TiP48j05,
  TiP48j06,
  TiP48j07,
  TiP48j09,
  TiRollgr,
  TimeRange,
  Tmp2016,
  Tmp2020,
  Tyd2000,
  ZzwdItemDto,
} from "./types";

export const bxApi = {
  addP48j03(data?: DtoP48J03[]) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bx/addP48j03",
      {
        method: "post",
        data,
      },
    );
  },
  test() {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bx/test",
      {
        method: "post",
      },
    );
  },
  getUnHandleHRLog() {
    return requestClient.request<ThrLog[]>(
      "/dDH.Service.Interface.Services.BX/bx/getUnHandleHRLog",
      {
        method: "post",
      },
    );
  },
  handleHRLog(data?: ThrLog) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bx/handleHRLog",
      {
        method: "post",
        data,
      },
    );
  },
  receiveL2ME02Mtrl(data?: TiL2me02) {
    return requestClient.request<BooleanStringValueTuple>(
      "/dDH.Service.Interface.Services.BX/bx/receiveL2ME02Mtrl",
      {
        method: "post",
        data,
      },
    );
  },
};

export const dM1000Api = {
  queryBear(data?: DtoQueryTdm1000) {
    return requestClient.request<Tdm1000[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/queryBear",
      {
        method: "post",
        data,
      },
    );
  },
  queryBearBox(data?: DtoQueryTdm1000) {
    return requestClient.request<Tdm1010[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/queryBearBox",
      {
        method: "post",
        data,
      },
    );
  },
  tmd1000Add(data?: Tdm1000) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tmd1000Add",
      {
        method: "post",
        data,
      },
    );
  },
  tmd1010Add(data?: Tdm1010) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tmd1010Add",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1000Del(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1000Del",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1010Del(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1010Del",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1000Repair(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1000Repair",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1010Repair(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1010Repair",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1000Finish(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1000Finish",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1010Finish(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1010Finish",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1000Scrap(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1000Scrap",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1010Scrap(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1010Scrap",
      {
        method: "post",
        data,
      },
    );
  },
  installBear(bearNo?: string, bearBoxNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/installBear",
      {
        method: "post",
        params: { bearNo, bearBoxNo },
      },
    );
  },
  outBear(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/outBear",
      {
        method: "post",
        data,
      },
    );
  },
};

export const dM1020Api = {
  queryTdm1020s(data?: DtoQueryTdm1020) {
    return requestClient.request<Tdm1020[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/queryTdm1020s",
      {
        method: "post",
        data,
      },
    );
  },
  addTdm1020(data?: Tdm1020) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/addTdm1020",
      {
        method: "post",
        data,
      },
    );
  },
  delTdm1020(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/delTdm1020",
      {
        method: "post",
        data,
      },
    );
  },
  resetTdm1020(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/resetTdm1020",
      {
        method: "post",
        data,
      },
    );
  },
  scrapTdm1020(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/scrapTdm1020",
      {
        method: "post",
        data,
      },
    );
  },
  installRoller(data?: DtoTdm1020InstallRoller) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/installRoller",
      {
        method: "post",
        data,
      },
    );
  },
  outBear(cId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/outBear",
      {
        method: "post",
        params: { cId },
      },
    );
  },
  queryBearBox(cId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/queryBearBox",
      {
        method: "post",
        params: { cId },
      },
    );
  },
  queryWorkBox(UpOrDown?: string) {
    return requestClient.request<Tdm1010[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/queryWorkBox",
      {
        method: "post",
        params: { UpOrDown },
      },
    );
  },
  queryTranBox(UpOrDown?: string) {
    return requestClient.request<Tdm1010[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/queryTranBox",
      {
        method: "post",
        params: { UpOrDown },
      },
    );
  },
  sendBx(cId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/sendBx",
      {
        method: "post",
        params: { cId },
      },
    );
  },
};

export const dM1030Api = {
  queryTdm1030(data?: DtoQueryTdm1030) {
    return requestClient.request<Tdm1030[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1030/queryTdm1030",
      {
        method: "post",
        data,
      },
    );
  },
  saveTdm1030Changes(data?: Tdm1030SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1030/saveTdm1030Changes",
      {
        method: "post",
        data,
      },
    );
  },
};

export const dM1040Api = {
  queryTdm1040s(data?: DtoQueryTdm1030) {
    return requestClient.request<Tdm1040[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1040/queryTdm1040s",
      {
        method: "post",
        data,
      },
    );
  },
  updateTdm1040(data?: Tdm1040SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1040/updateTdm1040",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR1000Api = {
  queryList(key?: string) {
    return requestClient.request<Thr1000[]>(
      "/dDH.Service.SHR.Services/hR1000/queryList",
      {
        method: "post",
        params: { key },
      },
    );
  },
  saveChange(data?: Thr1000SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR1000/saveChange",
      {
        method: "post",
        data,
      },
    );
  },
  getWgt(data?: QueryThr1000Dto) {
    return requestClient.request<number>(
      "/dDH.Service.SHR.Services/hR1000/getWgt",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR2000Api = {
  queryTmp2020s(data?: DtoQueryThr2000) {
    return requestClient.request<Tmp2020[]>(
      "/dDH.Service.SHR.Services/hR2000/queryTmp2020s",
      {
        method: "post",
        data,
      },
    );
  },
  queryThr2000s(data?: DtoQueryThr2000) {
    return requestClient.request<Thr2000[]>(
      "/dDH.Service.SHR.Services/hR2000/queryThr2000s",
      {
        method: "post",
        data,
      },
    );
  },
  closeThr2000s(cRemark?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR2000/closeThr2000s",
      {
        method: "post",
        params: { cRemark },
        data,
      },
    );
  },
  addPlans(cLineCode?: string, cRemark?: string, data?: DtoAddPlans[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR2000/addPlans",
      {
        method: "post",
        params: { cLineCode, cRemark },
        data,
      },
    );
  },
  generatePlanNo(cLineCode?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services/hR2000/generatePlanNo",
      {
        method: "post",
        params: { cLineCode },
      },
    );
  },
  queryThr2000Dtos(data?: DtoQueryThr2000) {
    return requestClient.request<Thr2000Dto[]>(
      "/dDH.Service.SHR.Services/hR2000/queryThr2000Dtos",
      {
        method: "post",
        data,
      },
    );
  },
  updateThr2000(cId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR2000/updateThr2000",
      {
        method: "post",
        params: { cId },
      },
    );
  },
  importHR2000(data?: ImportHR2000Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR2000/importHR2000",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR3000Api = {
  queryThr3000s(data?: DtoQueryThr3000) {
    return requestClient.request<Thr3000[]>(
      "/dDH.Service.SHR.Services/hR3000/queryThr3000s",
      {
        method: "post",
        data,
      },
    );
  },
  queryThr3010s(cZpId?: string) {
    return requestClient.request<Thr3010[]>(
      "/dDH.Service.SHR.Services/hR3000/queryThr3010s",
      {
        method: "post",
        params: { cZpId },
      },
    );
  },
  queryThr3020s(cZpId?: string) {
    return requestClient.request<Thr3020[]>(
      "/dDH.Service.SHR.Services/hR3000/queryThr3020s",
      {
        method: "post",
        params: { cZpId },
      },
    );
  },
  queryThr3030s(data?: Query3030Dto) {
    return requestClient.request<Thr3030[]>(
      "/dDH.Service.SHR.Services/hR3000/queryThr3030s",
      {
        method: "post",
        data,
      },
    );
  },
  getSlabs(data?: DtoQuerySlabs) {
    return requestClient.request<Tyd2000[]>(
      "/dDH.Service.SHR.Services/hR3000/getSlabs",
      {
        method: "post",
        data,
      },
    );
  },
  saveZp(data?: DtoSaveZp) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/saveZp",
      {
        method: "post",
        data,
      },
    );
  },
  addZp(data?: DtoAddZp) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/addZp",
      {
        method: "post",
        data,
      },
    );
  },
  cancelZp(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/cancelZp",
      {
        method: "post",
        data,
      },
    );
  },
  ensureZps(data?: DtoEnsure) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/ensureZps",
      {
        method: "post",
        data,
      },
    );
  },
  issueZps(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/issueZps",
      {
        method: "post",
        data,
      },
    );
  },
  generateBacthNo(cLineCode?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services/hR3000/generateBacthNo",
      {
        method: "post",
        params: { cLineCode },
      },
    );
  },
  autoSaveZp(data?: DtoAutoZp) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/autoSaveZp",
      {
        method: "post",
        data,
      },
    );
  },
  autoSaveZpNew(cOrderNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/autoSaveZpNew",
      {
        method: "post",
        params: { cOrderNo },
      },
    );
  },
  moveThr3000(data?: DtoMoveThr3000) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/moveThr3000",
      {
        method: "post",
        data,
      },
    );
  },
  updateThr2000(COrderId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/updateThr2000",
      {
        method: "post",
        params: { COrderId },
      },
    );
  },
  queryThr3000Dtos(data?: DtoQueryThr3000) {
    return requestClient.request<Thr3000Dto[]>(
      "/dDH.Service.SHR.Services/hR3000/queryThr3000Dtos",
      {
        method: "post",
        data,
      },
    );
  },
  changePlan(cOrderId?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/changePlan",
      {
        method: "post",
        params: { cOrderId },
        data,
      },
    );
  },
  changeJQPlan(cOrderId?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/changeJQPlan",
      {
        method: "post",
        params: { cOrderId },
        data,
      },
    );
  },
};

export const hR3010Api = {
  enterFur(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/enterFur",
      {
        method: "post",
        data,
      },
    );
  },
  cancelEnter(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/cancelEnter",
      {
        method: "post",
        data,
      },
    );
  },
  exitFur(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/exitFur",
      {
        method: "post",
        data,
      },
    );
  },
  elimFur(data?: DtoZgWork) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services/hR3010/elimFur",
      {
        method: "post",
        data,
      },
    );
  },
  cancelExit(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/cancelExit",
      {
        method: "post",
        data,
      },
    );
  },
  finishRoll(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/finishRoll",
      {
        method: "post",
        data,
      },
    );
  },
  waste(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/waste",
      {
        method: "post",
        data,
      },
    );
  },
  cancelFinish(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/cancelFinish",
      {
        method: "post",
        data,
      },
    );
  },
  querySlabs(data?: DtoQueryThr3000) {
    return requestClient.request<DtoThr3010[]>(
      "/dDH.Service.SHR.Services/hR3010/querySlabs",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me021s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me021[]>(
      "/dDH.Service.SHR.Services/hR3010/queryTiL2me021s",
      {
        method: "post",
        data,
      },
    );
  },
  enter(data?: DtoFurWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/enter",
      {
        method: "post",
        data,
      },
    );
  },
  exit(data?: DtoFurWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/exit",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR3400Api = {
  queryList(data?: DtoQueryThr3000) {
    return requestClient.request<Thr3040[]>(
      "/dDH.Service.SHR.Services/hR3400/queryList",
      {
        method: "post",
        data,
      },
    );
  },
  saveQt(data?: TiP48j01) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3400/saveQt",
      {
        method: "post",
        data,
      },
    );
  },
  saveQb(data?: TiP48j02) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3400/saveQb",
      {
        method: "post",
        data,
      },
    );
  },
  saveDc(data?: TiP48j031) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3400/saveDc",
      {
        method: "post",
        data,
      },
    );
  },
  saveJq(data?: SaveJqDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3400/saveJq",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR3600Api = {
  querySlabs(data?: DtoQuerySlabs) {
    return requestClient.request<Tyd2000[]>(
      "/dDH.Service.SHR.Services/hR3600/querySlabs",
      {
        method: "post",
        data,
      },
    );
  },
  queryHls(data?: DtoQuerySlabs) {
    return requestClient.request<Thr3010Hl[]>(
      "/dDH.Service.SHR.Services/hR3600/queryHls",
      {
        method: "post",
        data,
      },
    );
  },
  startHl(data?: HlDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3600/startHl",
      {
        method: "post",
        data,
      },
    );
  },
  endHl(data?: HlDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3600/endHl",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR3700Api = {
  queryJQPlans(cOrderNo?: string) {
    return requestClient.request<Tmp2016[]>(
      "/dDH.Service.SHR.Services/hR3700/queryJQPlans",
      {
        method: "post",
        params: { cOrderNo },
      },
    );
  },
  createSjByPlan(cSlabId?: string) {
    return requestClient.request<Thr4000[]>(
      "/dDH.Service.SHR.Services/hR3700/createSjByPlan",
      {
        method: "post",
        params: { cSlabId },
      },
    );
  },
};

export const hR4000Api = {
  queryThr4000s(data?: DtoQuerySlabs) {
    return requestClient.request<Thr4000[]>(
      "/dDH.Service.SHR.Services/hR4000/queryThr4000s",
      {
        method: "post",
        data,
      },
    );
  },
  queryPrintSjs(data?: DtoQuerySlabs) {
    return requestClient.request<Thr4000Dto[]>(
      "/dDH.Service.SHR.Services/hR4000/queryPrintSjs",
      {
        method: "post",
        data,
      },
    );
  },
  addSjs(data?: DtoP48J03[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/addSjs",
      {
        method: "post",
        data,
      },
    );
  },
  deleteSjs(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/deleteSjs",
      {
        method: "post",
        data,
      },
    );
  },
  queryPrints(cLineCode?: string, cSlCode?: string) {
    return requestClient.request<DtoThr4000[]>(
      "/dDH.Service.SHR.Services/hR4000/queryPrints",
      {
        method: "post",
        params: { cLineCode, cSlCode },
      },
    );
  },
  queryPrintsByInput(data?: QueryPrintInputDto) {
    return requestClient.request<DtoThr4000[]>(
      "/dDH.Service.SHR.Services/hR4000/queryPrintsByInput",
      {
        method: "post",
        data,
      },
    );
  },
  addSjsByPiece(data?: DtoAddSj) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/addSjsByPiece",
      {
        method: "post",
        data,
      },
    );
  },
  insertTyd2000s(data?: Thr4000[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/insertTyd2000s",
      {
        method: "post",
        data,
      },
    );
  },
  deleteTyd2000s(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/deleteTyd2000s",
      {
        method: "post",
        data,
      },
    );
  },
  getPieceNo(cBatchNo?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services/hR4000/getPieceNo",
      {
        method: "post",
        params: { cBatchNo },
      },
    );
  },
  deleteSjsByPiece(cPieceNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/deleteSjsByPiece",
      {
        method: "post",
        params: { cPieceNo },
      },
    );
  },
  saveChange(data?: Thr4000SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/saveChange",
      {
        method: "post",
        data,
      },
    );
  },
  addPrintLog(data?: DtoThr4000[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/addPrintLog",
      {
        method: "post",
        data,
      },
    );
  },
  cancelZc(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/cancelZc",
      {
        method: "post",
        data,
      },
    );
  },
  cptk(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/cptk",
      {
        method: "post",
        data,
      },
    );
  },
  editSj(data?: Thr4000Edit) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/editSj",
      {
        method: "post",
        data,
      },
    );
  },
  addSj(data?: TiP48j031) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/addSj",
      {
        method: "post",
        data,
      },
    );
  },
  addSjByPlan(cZpId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/addSjByPlan",
      {
        method: "post",
        params: { cZpId },
      },
    );
  },
};

export const hR4200Api = {
  queryTiL2me01s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me01[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me01s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me02s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me02[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me02s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me021s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me021[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me021s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me03s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me03[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me03s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me04s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me04[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me04s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me05s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me05[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me05s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me06s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me06[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me06s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me08s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me08[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me08s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me09s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me09[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me09s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me11s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me11[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me11s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me12s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me12[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me12s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me14s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me14[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me14s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me15s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me15[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me15s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me16s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me16[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me16s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me17s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me17[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me17s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me18s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me18[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me18s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me19s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me19[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me19s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j01s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j01[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j01s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j02s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j02[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j02s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j031s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j031[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j031s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j04s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j04[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j04s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j05s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j05[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j05s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j06s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j06[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j06s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j07s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j07[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j07s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j09s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j09[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j09s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiRollgrs(data?: DtoQueryL2) {
    return requestClient.request<TiRollgr[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiRollgrs",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR4300Api = {
  queryCc(data?: DtoQuerySlabs) {
    return requestClient.request<PlanCcDto[]>(
      "/dDH.Service.SHR.Services/hR4300/queryCc",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR4400Api = {
  queryZjps(data?: DtoQuerySlabs) {
    return requestClient.request<Thr3040Dto[]>(
      "/dDH.Service.SHR.Services/hR4400/queryZjps",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR9000Api = {
  queryThickHz(data?: DtoQueryL2) {
    return requestClient.request<ChyThickItemDto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryThickHz",
      {
        method: "post",
        data,
      },
    );
  },
  queryWidthHz(data?: DtoQueryL2) {
    return requestClient.request<ChyWidthItemDto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryWidthHz",
      {
        method: "post",
        data,
      },
    );
  },
  queryFhHz(data?: DtoQueryL2) {
    return requestClient.request<FhwdItemDto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryFhHz",
      {
        method: "post",
        data,
      },
    );
  },
  queryZzHz(data?: DtoQueryL2) {
    return requestClient.request<ZzwdItemDto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryZzHz",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me021s(data?: DtoQueryL2) {
    return requestClient.request<QueryRollDetail[]>(
      "/dDH.Service.SHR.Services/hR9000/queryTiL2me021s",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hRLogApi = {
  insertLog(data?: DtoInsertLog) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hRLog/insertLog",
      {
        method: "post",
        data,
      },
    );
  },
  insertLogs(data?: DtoInsertLogs) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hRLog/insertLogs",
      {
        method: "post",
        data,
      },
    );
  },
  updateThr3000(cZpId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hRLog/updateThr3000",
      {
        method: "post",
        params: { cZpId },
      },
    );
  },
  queryLogs(data?: DtoQueryLog) {
    return requestClient.request<ThrLog[]>(
      "/dDH.Service.SHR.Services/hRLog/queryLogs",
      {
        method: "post",
        data,
      },
    );
  },
};

export const influxdbReportApi = {
  exportZB037ToInfluxdb(startDate?: string, endDate?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/influxdbReport/exportZB037ToInfluxdb",
      {
        method: "post",
        params: { startDate, endDate },
      },
    );
  },
  exportZB232ToInfluxdb(startDate?: string, endDate?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/influxdbReport/exportZB232ToInfluxdb",
      {
        method: "post",
        params: { startDate, endDate },
      },
    );
  },
  exportZB001ToInfluxdb(startDate?: string, endDate?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/influxdbReport/exportZB001ToInfluxdb",
      {
        method: "post",
        params: { startDate, endDate },
      },
    );
  },
};

export const tI1000Api = {
  queryTiL2me01(data?: DtoTi1000Query) {
    return requestClient.request<Ti1000Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1000/queryTiL2me01",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2Me011s(CId?: string) {
    return requestClient.request<Ti1000_1Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1000/queryTiL2Me011s",
      {
        method: "post",
        params: { CId },
      },
    );
  },
};

export const tI1010Api = {
  queryTi1010(data?: DtoTi1010Query) {
    return requestClient.request<Ti1010Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1010/queryTi1010",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1010/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
};

export const tI1020Api = {
  ti1020Query(data?: DtoTi1020Query) {
    return requestClient.request<Ti1020Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1020/ti1020Query",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1020/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
  queryTi10201(CId?: string) {
    return requestClient.request<Ti1020_1Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1020/queryTi10201",
      {
        method: "post",
        params: { CId },
      },
    );
  },
};

export const tI1030Api = {
  ti1030Query(data?: DtoTi1030Query) {
    return requestClient.request<Ti1030Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1030/ti1030Query",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1030/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
};

export const tI1040Api = {
  queryTi1040(data?: DtoTi1040Query) {
    return requestClient.request<Ti1040Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1040/queryTi1040",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1040/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
};

export const tI1050Api = {
  queryTi1050(data?: DtoTi1050Query) {
    return requestClient.request<Ti1050Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1050/queryTi1050",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1050/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
};

export const tI1060Api = {
  queryTi1060(data?: DtoTi1060Query) {
    return requestClient.request<Ti1060Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1060/queryTi1060",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tI1070Api = {
  queryDS(data?: DtoTi1070Query) {
    return requestClient.request<Ti1070Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1070/queryDS",
      {
        method: "post",
        data,
      },
    );
  },
  queryDSS(data?: DtoTi1080Query) {
    return requestClient.request<Ti1080Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1070/queryDSS",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tI1090Api = {
  queryInStove(data?: TimeRange) {
    return requestClient.request<Ti1090_InStoveDto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1090/queryInStove",
      {
        method: "post",
        data,
      },
    );
  },
  queryOutStove(data?: TimeRange) {
    return requestClient.request<Ti1090_OutStoveDto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1090/queryOutStove",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1090/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
};

export const tI1200Api = {
  getL2me12s(data?: DtoTdaZb037Query) {
    return requestClient.request<Ti1200Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1200/getL2me12s",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1200/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
};

export const tI1210Api = {
  getTi1210Dtos(data?: DtoTi1210Query) {
    return requestClient.request<Ti1210Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1210/getTi1210Dtos",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1210/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
  getHitRate(thick?: number, thickSj?: number, thickMin?: number, thickMax?: number) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1210/getHitRate",
      {
        method: "post",
        params: { thick, thickSj, thickMin, thickMax },
      },
    );
  },
  getTi1211Dtos(data?: DtoTi1210Query) {
    return requestClient.request<Ti1211Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1210/getTi1211Dtos",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tdaZb001Api = {
  getTdaZb001s(data?: DtoTdaZb037Query) {
    return requestClient.request<TdaZb001[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tdaZb001/getTdaZb001s",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tdaZb037Api = {
  queryTdaZb037(data?: DtoTdaZb037Query) {
    return requestClient.request<TdaZb037[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tdaZb037/queryTdaZb037",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tdaZb232Api = {
  getTdaZb232s(data?: DtoTdaZb037Query) {
    return requestClient.request<TdaZb232[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tdaZb232/getTdaZb232s",
      {
        method: "post",
        data,
      },
    );
  },
};
