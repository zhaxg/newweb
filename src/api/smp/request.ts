import { requestClient } from "@/api/_core/request";

import type {
  LengthTypeEnum,
  OrderFlagEnum,
  OrderReviewEnum,
  OrderStatusEnum,
} from "./enums";
import type {
  ApiCarMessage,
  ApiCardDto,
  ApiCardInput,
  ApiCustDto,
  ApiJL2000Dto,
  ApiJL2001Dto,
  ApiVehicleResultDto,
  ApiXSMatrlDto,
  BxOrder,
  DtoQuerySlabs,
  Fh1000,
  Fh1002,
  HmxDept,
  ImportTL2000Dto,
  ImportTmp2000FlagDto,
  InputFh1000Dto,
  InputFh2000Dto,
  InputPlanDto,
  InputTmp2000Dto,
  InputTmp2010Dto,
  InputTmp2020Dto,
  InsertPlanDto,
  LSendcarItemTDto,
  QueryCarDto,
  QueryCptTmp2010Dto,
  QueryCustDto,
  QueryFhJl2000Dto,
  QueryFhTyd2000Dto,
  QueryOrderTqmtd10Dto,
  QueryOrdersForDesignInputParameter,
  QueryTmp2000Dto,
  QueryTmp2016Dto,
  SlabPcDto,
  TLDto,
  Thr4000,
  Tmp1220,
  Tmp1220SaveChangesData,
  Tmp2000,
  Tmp2000Log,
  Tmp2005Dto,
  Tmp2010,
  Tmp2010Dto,
  Tmp2016,
  Tmp2016Dto,
  Tmp2021,
  Tmp2030Dto,
  Tmp2040Dto,
  Tmp2042,
  Tms3000,
  TsAppVersion,
  TsCust001,
  TsCustFl,
  TsCustomer,
  TsMatrl,
  ZgPlanDto,
} from "./types";

export const castStoveApi = {
  getUnitWgt(data?: SlabPcDto) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/castStove/getUnitWgt",
      {
        method: "post",
        data,
      },
    );
  },
  getSlabOrderList(data?: InputTmp2010Dto) {
    return requestClient.request<SlabPcDto[]>(
      "/dDH.Service.SMP.Services/castStove/getSlabOrderList",
      {
        method: "post",
        data,
      },
    );
  },
  getLcList(data?: InputPlanDto) {
    return requestClient.request<Tmp2040Dto[]>(
      "/dDH.Service.SMP.Services/castStove/getLcList",
      {
        method: "post",
        data,
      },
    );
  },
  getLcOrderList(lcId?: string) {
    return requestClient.request<Tmp2042[]>(
      "/dDH.Service.SMP.Services/castStove/getLcOrderList",
      {
        method: "post",
        params: { lcId },
      },
    );
  },
  deleteLc(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/deleteLc",
      {
        method: "post",
        data,
      },
    );
  },
  addLc(ccmCode?: string, numLs?: number, wgtLc?: number, numZs?: number, data?: SlabPcDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/addLc",
      {
        method: "post",
        params: { ccmCode, numLs, wgtLc, numZs },
        data,
      },
    );
  },
  addLcNew(ccmCode?: string, numLs?: number, data?: SlabPcDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/addLcNew",
      {
        method: "post",
        params: { ccmCode, numLs },
        data,
      },
    );
  },
  creatJc(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/creatJc",
      {
        method: "post",
        data,
      },
    );
  },
  getJcList(data?: InputPlanDto) {
    return requestClient.request<Tmp2030Dto[]>(
      "/dDH.Service.SMP.Services/castStove/getJcList",
      {
        method: "post",
        data,
      },
    );
  },
  getLcListByJc(jcNo?: string) {
    return requestClient.request<Tmp2040Dto[]>(
      "/dDH.Service.SMP.Services/castStove/getLcListByJc",
      {
        method: "post",
        params: { jcNo },
      },
    );
  },
  deleteJc(jcId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/deleteJc",
      {
        method: "post",
        params: { jcId },
      },
    );
  },
  downJc(jcId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/downJc",
      {
        method: "post",
        params: { jcId },
      },
    );
  },
  updateSort(data?: Tmp2030Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/updateSort",
      {
        method: "post",
        data,
      },
    );
  },
  generateJcNo(staCode?: string, num?: number) {
    return requestClient.request<string[]>(
      "/dDH.Service.SMP.Services/castStove/generateJcNo",
      {
        method: "post",
        params: { staCode, num },
      },
    );
  },
  getSelectSlabOrderList(data?: InputTmp2010Dto) {
    return requestClient.request<SlabPcDto[]>(
      "/dDH.Service.SMP.Services/castStove/getSelectSlabOrderList",
      {
        method: "post",
        data,
      },
    );
  },
};

export const fh2000Api = {
  getCarLst(data?: InputFh2000Dto) {
    return requestClient.request<QueryCarDto[]>(
      "/dDH.Service.SMP.Services/fh2000/getCarLst",
      {
        method: "post",
        data,
      },
    );
  },
  getFhJl2000Lst(data?: InputFh2000Dto) {
    return requestClient.request<QueryFhJl2000Dto[]>(
      "/dDH.Service.SMP.Services/fh2000/getFhJl2000Lst",
      {
        method: "post",
        data,
      },
    );
  },
  getFhTyd2000(data?: InputFh2000Dto) {
    return requestClient.request<QueryFhTyd2000Dto[]>(
      "/dDH.Service.SMP.Services/fh2000/getFhTyd2000",
      {
        method: "post",
        data,
      },
    );
  },
  getFh1000Lst(data?: InputFh2000Dto) {
    return requestClient.request<Fh1000[]>(
      "/dDH.Service.SMP.Services/fh2000/getFh1000Lst",
      {
        method: "post",
        data,
      },
    );
  },
  getFh1002Lst(data?: InputFh2000Dto) {
    return requestClient.request<Fh1002[]>(
      "/dDH.Service.SMP.Services/fh2000/getFh1002Lst",
      {
        method: "post",
        data,
      },
    );
  },
  addFhMat(data?: InputFh1000Dto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/fh2000/addFhMat",
      {
        method: "post",
        data,
      },
    );
  },
  delMat(data?: Fh1002[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/fh2000/delMat",
      {
        method: "post",
        data,
      },
    );
  },
  getJLSeqID() {
    return requestClient.request<string>(
      "/dDH.Service.SMP.Services/fh2000/getJLSeqID",
      {
        method: "post",
      },
    );
  },
  sendJL(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/fh2000/sendJL",
      {
        method: "post",
        data,
      },
    );
  },
  sendJLCancel(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/fh2000/sendJLCancel",
      {
        method: "post",
        data,
      },
    );
  },
  sendJLSync() {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/fh2000/sendJLSync",
      {
        method: "post",
      },
    );
  },
};

export const jLApi = {
  deliveryItem(data?: ApiJL2000Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.JL/jL/deliveryItem",
      {
        method: "post",
        data,
      },
    );
  },
  vehicleResult(data?: ApiJL2001Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.JL/jL/vehicleResult",
      {
        method: "post",
        data,
      },
    );
  },
  getCard(data?: ApiCardDto) {
    return requestClient.request<ApiCarMessage>(
      "/dDH.Service.Interface.Services.JL/jL/getCard",
      {
        method: "post",
        data,
      },
    );
  },
  checkCardID(data?: ApiCardDto) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.JL/jL/checkCardID",
      {
        method: "post",
        data,
      },
    );
  },
  setCard(data?: ApiCardDto) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.JL/jL/setCard",
      {
        method: "post",
        data,
      },
    );
  },
  getSendCarItem(data?: ApiCardDto) {
    return requestClient.request<LSendcarItemTDto[]>(
      "/dDH.Service.Interface.Services.JL/jL/getSendCarItem",
      {
        method: "post",
        data,
      },
    );
  },
  getJLSeqID() {
    return requestClient.request<string>(
      "/dDH.Service.Interface.Services.JL/jL/getJLSeqID",
      {
        method: "post",
      },
    );
  },
  setTaskCard(data?: ApiCardInput) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.JL/jL/setTaskCard",
      {
        method: "post",
        data,
      },
    );
  },
  getMatchId(operatype?: string) {
    return requestClient.request<string>(
      "/dDH.Service.Interface.Services.JL/jL/getMatchId",
      {
        method: "post",
        params: { operatype },
      },
    );
  },
};

export const tLApi = {
  generateTlOrderNo(matType?: string, num?: number) {
    return requestClient.request<string[]>(
      "/dDH.Service.SMP.Services/tL/generateTlOrderNo",
      {
        method: "post",
        params: { matType, num },
      },
    );
  },
  queryOrder(data?: InputTmp2010Dto) {
    return requestClient.request<Tmp2010Dto[]>(
      "/dDH.Service.SMP.Services/tL/queryOrder",
      {
        method: "post",
        data,
      },
    );
  },
  queryOrderNew(data?: InputTmp2010Dto) {
    return requestClient.request<Tmp2005Dto[]>(
      "/dDH.Service.SMP.Services/tL/queryOrderNew",
      {
        method: "post",
        data,
      },
    );
  },
  updateTl(Id?: string, NThickPlan?: number, NWidthPlan?: number, NPlanBoarLen?: number, CSgCode?: string, CSgStd?: string, NSlabThick?: number, NSlabWidth?: number, NSlabLenMin?: number, NSlabLenMax?: number, NWgtUnit?: number, NSlabQua?: number, NSlabWgt?: number, CSlabSource?: string, CSlabRemark?: string, CTlName?: string, DTlTime?: string, NWgtMeter?: number, tLType?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/updateTl",
      {
        method: "post",
        params: { Id, NThickPlan, NWidthPlan, NPlanBoarLen, CSgCode, CSgStd, NSlabThick, NSlabWidth, NSlabLenMin, NSlabLenMax, NWgtUnit, NSlabQua, NSlabWgt, CSlabSource, CSlabRemark, CTlName, DTlTime, NWgtMeter, tLType },
        data,
      },
    );
  },
  checkedTl(lineCode?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/checkedTl",
      {
        method: "post",
        params: { lineCode },
        data,
      },
    );
  },
  checkedTlNew(lineCode?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/checkedTlNew",
      {
        method: "post",
        params: { lineCode },
        data,
      },
    );
  },
  cancleCheckedTl(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/cancleCheckedTl",
      {
        method: "post",
        data,
      },
    );
  },
  cancleCheckedTlNew(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/cancleCheckedTlNew",
      {
        method: "post",
        data,
      },
    );
  },
  delTl(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/delTl",
      {
        method: "post",
        data,
      },
    );
  },
  cancleCheckedTlOld(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/cancleCheckedTl_old",
      {
        method: "post",
        data,
      },
    );
  },
  cancleTl(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/cancleTl",
      {
        method: "post",
        data,
      },
    );
  },
  setLength(data?: Tmp2010Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/setLength",
      {
        method: "post",
        data,
      },
    );
  },
  orderCF(cOrderNo?: string, data?: Tmp2010Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/orderCF",
      {
        method: "post",
        params: { cOrderNo },
        data,
      },
    );
  },
  importTl2000(data?: ImportTL2000Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/importTl2000",
      {
        method: "post",
        data,
      },
    );
  },
  hbTl(data?: TLDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/hbTl",
      {
        method: "post",
        data,
      },
    );
  },
  setSlabSize(Id?: string, CCode?: string, CDesc?: string, CEnable?: string, CGroup?: string, CName?: string, COrder?: string, CPid?: string, CSw01?: string, CSw02?: string, CSw03?: string, CSw04?: string, CSw05?: string, CValue?: string, Selected?: boolean, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/setSlabSize",
      {
        method: "post",
        params: { Id, CCode, CDesc, CEnable, CGroup, CName, COrder, CPid, CSw01, CSw02, CSw03, CSw04, CSw05, CValue, Selected },
        data,
      },
    );
  },
  autoMatched(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/autoMatched",
      {
        method: "post",
        data,
      },
    );
  },
  existOrderNoS(data?: ImportTL2000Dto[]) {
    return requestClient.request<string[]>(
      "/dDH.Service.SMP.Services/tL/existOrderNoS",
      {
        method: "post",
        data,
      },
    );
  },
  importTl2000New(data?: ImportTL2000Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/importTl2000New",
      {
        method: "post",
        data,
      },
    );
  },
  importTmp2005(data?: ImportTL2000Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/importTmp2005",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tmp1220Api = {
  queryTmp1220() {
    return requestClient.request<Tmp1220[]>(
      "/dDH.Service.SMP.Services/tmp1220/queryTmp1220",
      {
        method: "post",
      },
    );
  },
  changeTmp1220(data?: Tmp1220SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp1220/changeTmp1220",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tmp2000Api = {
  getOrderTqmtd10Lst(cLineCode?: string) {
    return requestClient.request<QueryOrderTqmtd10Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getOrderTqmtd10Lst",
      {
        method: "post",
        params: { cLineCode },
      },
    );
  },
  getSaleDept() {
    return requestClient.request<HmxDept[]>(
      "/dDH.Service.SMP.Services/tmp2000/getSaleDept",
      {
        method: "post",
      },
    );
  },
  getCustomer() {
    return requestClient.request<QueryCustDto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getCustomer",
      {
        method: "post",
      },
    );
  },
  getOrderLst(data?: InputTmp2000Dto) {
    return requestClient.request<QueryTmp2000Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getOrderLst",
      {
        method: "post",
        data,
      },
    );
  },
  getOrderLst2(data?: InputTmp2000Dto) {
    return requestClient.request<QueryTmp2000Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getOrderLst2",
      {
        method: "post",
        data,
      },
    );
  },
  saveOrder(flag?: string, data?: QueryTmp2000Dto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2000/saveOrder",
      {
        method: "post",
        params: { flag },
        data,
      },
    );
  },
  delOrder(data?: QueryTmp2000Dto[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/delOrder",
      {
        method: "post",
        data,
      },
    );
  },
  importTmp2000(data?: ImportTmp2000FlagDto) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/importTmp2000",
      {
        method: "post",
        data,
      },
    );
  },
  importByBx(data?: BxOrder[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2000/importByBx",
      {
        method: "post",
        data,
      },
    );
  },
  getConNo(line?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SMP.Services/tmp2000/getConNo",
      {
        method: "post",
        params: { line },
      },
    );
  },
  fillVacancy2(serNum?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SMP.Services/tmp2000/fillVacancy2",
      {
        method: "post",
        params: { serNum },
      },
    );
  },
  fillVacancy3(serNum?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SMP.Services/tmp2000/fillVacancy3",
      {
        method: "post",
        params: { serNum },
      },
    );
  },
  downOrderPlan(data?: QueryTmp2000Dto[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/downOrderPlan",
      {
        method: "post",
        data,
      },
    );
  },
  pushOrderPlan(data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/pushOrderPlan",
      {
        method: "post",
        data,
      },
    );
  },
  addYLOrder(Selected?: boolean, Id?: string, COrderNo?: string, NStatus?: OrderStatusEnum, COrderCustNo?: string, COrderCustCname?: string, CSteelType?: string, CSgCode?: string, NThick?: number, NThickMin?: number, NThickMax?: number, NWidth?: number, NWidthMin?: number, NWidthMax?: number, NWidthWgt?: number, CLengthType?: LengthTypeEnum, NLenMin?: number, NLenMax?: number, CDelivyStatusCode?: string, CDelivyStatusDesc?: string, NNum?: number, NWgt?: number, CTrimFlag?: string, COverstepBl?: string, CDelivyQtyFlag?: string, CTol?: string, CFlawDesc?: string, CConNo?: string, CSgStd?: string, DJhqTime?: string, CDelivyAddress?: string, CSpecialMarkGy?: string, NWtMax?: number, NWtMin?: number, CSpec?: string, CConRemark?: string, CInboundNo?: string, NThickTolMin?: number, NThickTolMax?: number, NWidthTolMin?: number, NWidthTolMax?: number, NLenTolMin?: number, NLenTolMax?: number, DTimeShipment?: string, CSgCodeNk?: string, CJrzzgyCode?: string, CJqgyCode?: string, CExitem1?: string, Creator?: string, CreateTime?: string, LastModifier?: string, LastModifyTime?: string, CLineCode?: string, CDeptCode?: string, COrderProcFlag?: number, COrderProcUserId?: string, DOrderProcTime?: string, CZgGyCode?: string, CSendUserId?: string, DSendTime?: string, CPushUserId?: string, DPushTime?: string, NSfpj?: OrderReviewEnum, CPjName?: string, NFlag?: OrderFlagEnum, data?: ImportTmp2000FlagDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2000/addYLOrder",
      {
        method: "post",
        params: { Selected, Id, COrderNo, NStatus, COrderCustNo, COrderCustCname, CSteelType, CSgCode, NThick, NThickMin, NThickMax, NWidth, NWidthMin, NWidthMax, NWidthWgt, CLengthType, NLenMin, NLenMax, CDelivyStatusCode, CDelivyStatusDesc, NNum, NWgt, CTrimFlag, COverstepBl, CDelivyQtyFlag, CTol, CFlawDesc, CConNo, CSgStd, DJhqTime, CDelivyAddress, CSpecialMarkGy, NWtMax, NWtMin, CSpec, CConRemark, CInboundNo, NThickTolMin, NThickTolMax, NWidthTolMin, NWidthTolMax, NLenTolMin, NLenTolMax, DTimeShipment, CSgCodeNk, CJrzzgyCode, CJqgyCode, CExitem1, Creator, CreateTime, LastModifier, LastModifyTime, CLineCode, CDeptCode, COrderProcFlag, COrderProcUserId, DOrderProcTime, CZgGyCode, CSendUserId, DSendTime, CPushUserId, DPushTime, NSfpj, CPjName, NFlag },
        data,
      },
    );
  },
  delYLOrderPlan(data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/delYLOrderPlan",
      {
        method: "post",
        data,
      },
    );
  },
  getTmp2000Log(data?: Tmp2000Log) {
    return requestClient.request<Tmp2000Log[]>(
      "/dDH.Service.SMP.Services/tmp2000/getTmp2000Log",
      {
        method: "post",
        data,
      },
    );
  },
  queryOrdersForDesign(data?: QueryOrdersForDesignInputParameter) {
    return requestClient.request<Tmp2000[]>(
      "/dDH.Service.SMP.Services/tmp2000/queryOrdersForDesign",
      {
        method: "post",
        data,
      },
    );
  },
  getTmp2010(data?: InputTmp2000Dto) {
    return requestClient.request<QueryCptTmp2010Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getTmp2010",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tmp2010Api = {
  queryOrder(data?: InputTmp2010Dto) {
    return requestClient.request<Tmp2010Dto[]>(
      "/dDH.Service.SMP.Services/tmp2010/queryOrder",
      {
        method: "post",
        data,
      },
    );
  },
  reviewOrder(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2010/reviewOrder",
      {
        method: "post",
        data,
      },
    );
  },
  cancleReviewOrder(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2010/cancleReviewOrder",
      {
        method: "post",
        data,
      },
    );
  },
  setStaCode(code?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2010/setStaCode",
      {
        method: "post",
        params: { code },
        data,
      },
    );
  },
};

export const tmp2016Api = {
  queryTmp2016(data?: QueryTmp2016Dto) {
    return requestClient.request<Tmp2016Dto[]>(
      "/dDH.Service.SMP.Services/tmp2016/queryTmp2016",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tmp2020Api = {
  queryOrder(data?: InputTmp2010Dto) {
    return requestClient.request<ZgPlanDto[]>(
      "/dDH.Service.SMP.Services/tmp2020/queryOrder",
      {
        method: "post",
        data,
      },
    );
  },
  queryPlanOrder(cOrderNo?: string) {
    return requestClient.request<Tmp2016[]>(
      "/dDH.Service.SMP.Services/tmp2020/queryPlanOrder",
      {
        method: "post",
        params: { cOrderNo },
      },
    );
  },
  queryPlanJQ(cOrderNo?: string) {
    return requestClient.request<Tmp2021[]>(
      "/dDH.Service.SMP.Services/tmp2020/queryPlanJQ",
      {
        method: "post",
        params: { cOrderNo },
      },
    );
  },
  queryPlans(data?: InputTmp2020Dto) {
    return requestClient.request<ZgPlanDto[]>(
      "/dDH.Service.SMP.Services/tmp2020/queryPlans",
      {
        method: "post",
        data,
      },
    );
  },
  addTmp2020s(data?: InsertPlanDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2020/addTmp2020s",
      {
        method: "post",
        data,
      },
    );
  },
  deleteTmp2020s(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2020/deleteTmp2020s",
      {
        method: "post",
        data,
      },
    );
  },
  downTmp2020s(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2020/downTmp2020s",
      {
        method: "post",
        data,
      },
    );
  },
  closeTmp2020s(reason?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2020/closeTmp2020s",
      {
        method: "post",
        params: { reason },
        data,
      },
    );
  },
  updateTmp2010s(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2020/updateTmp2010s",
      {
        method: "post",
        data,
      },
    );
  },
  checkJQ(ListOrder?: Tmp2021[], data?: Tmp2010) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2020/checkJQ",
      {
        method: "post",
        params: { ListOrder },
        data,
      },
    );
  },
};

export const tmp3000Api = {
  queryTmp2010Dtos(data?: InputTmp2010Dto) {
    return requestClient.request<Tmp2010Dto[]>(
      "/dDH.Service.SMP.Services/tmp3000/queryTmp2010Dtos",
      {
        method: "post",
        data,
      },
    );
  },
  queryTms3000s(CLineCode?: string, COrderNo?: string) {
    return requestClient.request<Tms3000[]>(
      "/dDH.Service.SMP.Services/tmp3000/queryTms3000s",
      {
        method: "post",
        params: { CLineCode, COrderNo },
      },
    );
  },
  queryThr4000s(data?: DtoQuerySlabs) {
    return requestClient.request<Thr4000[]>(
      "/dDH.Service.SMP.Services/tmp3000/queryThr4000s",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tsAVersionApi = {
  queryByVersion(creator?: string) {
    return requestClient.request<TsAppVersion[]>(
      "/dDH.Service.Widgets.Services/tsAVersion/queryByVersion",
      {
        method: "post",
        params: { creator },
      },
    );
  },
  insert(data?: TsAppVersion) {
    return requestClient.request<any>(
      "/dDH.Service.Widgets.Services/tsAVersion/insert",
      {
        method: "post",
        data,
      },
    );
  },
  update(data?: TsAppVersion) {
    return requestClient.request<any>(
      "/dDH.Service.Widgets.Services/tsAVersion/update",
      {
        method: "post",
        data,
      },
    );
  },
  delete(Id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.Widgets.Services/tsAVersion/delete",
      {
        method: "post",
        params: { Id },
      },
    );
  },
  getMaxNCode() {
    return requestClient.request<number>(
      "/dDH.Service.Widgets.Services/tsAVersion/getMaxNCode",
      {
        method: "post",
      },
    );
  },
  getMaxNCodeByNType(ntype?: number) {
    return requestClient.request<number>(
      "/dDH.Service.Widgets.Services/tsAVersion/getMaxNCodeByNType",
      {
        method: "post",
        params: { ntype },
      },
    );
  },
  existsByNTypeAndNCode(ntype?: number, ncode?: number) {
    return requestClient.request<boolean>(
      "/dDH.Service.Widgets.Services/tsAVersion/existsByNTypeAndNCode",
      {
        method: "post",
        params: { ntype, ncode },
      },
    );
  },
};

export const tsCust001Api = {
  custQuery(CustNo?: string, CustName?: string) {
    return requestClient.request<TsCust001[]>(
      "/dDH.Service.SMP.Services/tsCust001/custQuery",
      {
        method: "post",
        params: { CustNo, CustName },
      },
    );
  },
  deleteCust(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCust001/deleteCust",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tsCustomerApi = {
  syncCust(data?: TsCustomer) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tsCustomer/syncCust",
      {
        method: "post",
        data,
      },
    );
  },
  addTsCustomer(data?: TsCustomer) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCustomer/addTsCustomer",
      {
        method: "post",
        data,
      },
    );
  },
  addTsCustFl(data?: TsCustFl) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCustomer/addTsCustFl",
      {
        method: "post",
        data,
      },
    );
  },
  updateTsCustomer(data?: TsCustomer) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCustomer/updateTsCustomer",
      {
        method: "post",
        data,
      },
    );
  },
  updateTsCustFl(data?: TsCustFl) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCustomer/updateTsCustFl",
      {
        method: "post",
        data,
      },
    );
  },
  getTsCustomerList(data?: TsCustomer) {
    return requestClient.request<TsCustomer[]>(
      "/dDH.Service.SMP.Services/tsCustomer/getTsCustomerList",
      {
        method: "post",
        data,
      },
    );
  },
  getTsCustFlList(code?: string, keywords?: string) {
    return requestClient.request<TsCustFl[]>(
      "/dDH.Service.SMP.Services/tsCustomer/getTsCustFlList",
      {
        method: "post",
        params: { code, keywords },
      },
    );
  },
  removeTsCustomer(data?: TsCustomer) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCustomer/removeTsCustomer",
      {
        method: "post",
        data,
      },
    );
  },
  removeTsCustFl(data?: TsCustFl) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCustomer/removeTsCustFl",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tsMatrlApi = {
  queryMatrl(data?: TsMatrl) {
    return requestClient.request<TsMatrl[]>(
      "/dDH.Service.SMP.Services/tsMatrl/queryMatrl",
      {
        method: "post",
        data,
      },
    );
  },
  syncMatrl() {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsMatrl/syncMatrl",
      {
        method: "post",
      },
    );
  },
};

export const xSApi = {
  getMatrl(data?: ApiXSMatrlDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.XS/xS/getMatrl",
      {
        method: "post",
        data,
      },
    );
  },
  getTruckLoading(billofLadingNo?: string) {
    return requestClient.request<ApiVehicleResultDto>(
      "/dDH.Service.Interface.Services.XS/xS/getTruckLoading",
      {
        method: "post",
        params: { billofLadingNo },
      },
    );
  },
  getCust(data?: ApiCustDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.XS/xS/getCust",
      {
        method: "post",
        data,
      },
    );
  },
};
