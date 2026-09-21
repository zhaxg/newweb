import { requestClient } from "@/api/_core/request";

import type {
  CompositionEnum,
  ValidFlag,
} from "./enums";
import type {
  AddTestJobInput,
  ChemicalCompositionStdResult,
  ChemicalItem,
  ComplexDecideInput,
  DefectDescription,
  DefectType,
  DetectInput,
  InventoryDisposalInput,
  InventoryInfo,
  JggyEntities,
  MSCDto,
  MSCDtoPaginationResult,
  MSCQueryPara,
  MSCQueryParaPaginationQueryInput,
  PlateInspectionDto,
  QualityDesignInput,
  QualityDesignOutput,
  QueryCFStdInput,
  QueryCriteriaDTO,
  QueryInventoryInput,
  QueryJg01Input,
  QueryMscHistoryInput,
  QueryTqmjgRecordInput,
  QueryTqmtd10Input,
  QueryTqmtdRecordInput,
  QueryTqmts0xHistoryInput,
  QueryTqmylRecordInput,
  QueryYl01Input,
  SaveIdxDataDto,
  SelectedTableCondtionDto,
  SelectedTableDataDto,
  SteelPlateInspectionDto,
  SurfaceDetermineInput,
  TestItemDto,
  TestStandard,
  TestSubItem,
  Thr4000,
  Thr4000Details,
  Thr4000Zrpan,
  Thr4010,
  Tmp1210,
  Tms3000,
  Tms3000Details,
  Tms3010,
  Tqm1000,
  Tqmjg01,
  Tqmjg01Record,
  Tqmtd10,
  Tqmtd10Record,
  Tqmtd11,
  Tqmtd12,
  TqmtdEntities,
  Tqmtm01,
  Tqmtm01Record,
  Tqmtm08,
  Tqmtm09,
  Tqmtm104ConditionDto,
  Tqmtm104DetailDto,
  Tqmtm104Dto,
  Tqmtm104DtoSaveChangesData,
  Tqmtp01,
  Tqmtp01Dto,
  Tqmtp01QueryInput,
  Tqmtp03,
  Tqmtpa4,
  Tqmtpa4QueryInput,
  Tqmtpa4SaveChangesData,
  Tqmtpa5,
  Tqmtpa5QueryInput,
  Tqmtpa5SaveChangesData,
  Tqmtpa6,
  Tqmtpa6QueryInput,
  Tqmts0xDto,
  Tqmts0xQueryInput,
  Tqmts0xRecord,
  Tqmyl01,
  Tqmyl01Record,
  Tqmyl04,
  Tqmyl10Dto,
  TsTableProVal,
  YlgyEntities,
} from "./types";

export const formulaTempleteApi = {
  query(testItemType?: string) {
    return requestClient.request<string[]>(
      "/dDH.Service.SQM.Services/formulaTemplete/query",
      {
        method: "post",
        params: { testItemType },
      },
    );
  },
  queryTsys() {
    return requestClient.request<string[]>(
      "/dDH.Service.SQM.Services/formulaTemplete/queryTsys",
      {
        method: "post",
      },
    );
  },
};

export const inventoryJudgeApi = {
  queryInventory(data?: QueryInventoryInput) {
    return requestClient.request<InventoryInfo[]>(
      "/dDH.Service.SQM.Services.QualityDisposition/inventoryJudge/queryInventory",
      {
        method: "post",
        data,
      },
    );
  },
  complexDecide(data?: ComplexDecideInput) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.QualityDisposition/inventoryJudge/complexDecide",
      {
        method: "post",
        data,
      },
    );
  },
  productDisposal(data?: InventoryDisposalInput) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.QualityDisposition/inventoryJudge/productDisposal",
      {
        method: "post",
        data,
      },
    );
  },
  surfaceDetermine(data?: SurfaceDetermineInput) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.QualityDisposition/inventoryJudge/surfaceDetermine",
      {
        method: "post",
        data,
      },
    );
  },
  detect(data?: DetectInput) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.QualityDisposition/inventoryJudge/detect",
      {
        method: "post",
        data,
      },
    );
  },
};

export const mSCApi = {
  queryTm08s() {
    return requestClient.request<Tqmtm08[]>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryTm08s",
      {
        method: "post",
      },
    );
  },
  saveMsc(data?: MSCDto) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/saveMsc",
      {
        method: "post",
        data,
      },
    );
  },
  buildMSCNo(shape?: string, stlType?: string, stdType?: string, fac?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/buildMSCNo",
      {
        method: "post",
        params: { shape, stlType, stdType, fac },
      },
    );
  },
  queryMscId(factoryId?: string, mscNo?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryMscId",
      {
        method: "post",
        params: { factoryId, mscNo },
      },
    );
  },
  deleteMsc(mscId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/deleteMsc",
      {
        method: "post",
        params: { mscId },
      },
    );
  },
  effectMsc(mscId?: string, data?: ValidFlag) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/effectMsc",
      {
        method: "post",
        params: { mscId },
        data,
      },
    );
  },
  queryMSC(msc?: string) {
    return requestClient.request<MSCDto>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryMSC",
      {
        method: "post",
        params: { msc },
      },
    );
  },
  queryMSCs(data?: MSCQueryParaPaginationQueryInput) {
    return requestClient.request<MSCDtoPaginationResult>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryMSCs",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistory(data?: QueryMscHistoryInput) {
    return requestClient.request<Tqmtm01Record[]>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryHistory",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistoryDetail(id?: string) {
    return requestClient.request<MSCDto>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryHistoryDetail",
      {
        method: "post",
        params: { id },
      },
    );
  },
  queryTqmtm01s(data?: MSCQueryPara) {
    return requestClient.request<Tqmtm01[]>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryTqmtm01s",
      {
        method: "post",
        data,
      },
    );
  },
  queryMSCById(tm01Id?: string) {
    return requestClient.request<MSCDto>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryMSCById",
      {
        method: "post",
        params: { tm01Id },
      },
    );
  },
};

export const qualityDesignApi = {
  designZHB(data?: QualityDesignInput) {
    return requestClient.request<QualityDesignOutput>(
      "/dDH.Service.SQM.Services.QualityDesign/qualityDesign/designZHB",
      {
        method: "post",
        data,
      },
    );
  },
  matchZHBJrzzGy(orderNo?: string) {
    return requestClient.request<Tqmjg01[]>(
      "/dDH.Service.SQM.Services.QualityDesign/qualityDesign/matchZHBJrzzGy",
      {
        method: "post",
        params: { orderNo },
      },
    );
  },
  matchZHBJqGy(orderNo?: string) {
    return requestClient.request<Tqmjg01[]>(
      "/dDH.Service.SQM.Services.QualityDesign/qualityDesign/matchZHBJqGy",
      {
        method: "post",
        params: { orderNo },
      },
    );
  },
  assignZHBJrzzJqGy(orderNo?: string, jrzz?: string, jq?: string) {
    return requestClient.request<number>(
      "/dDH.Service.SQM.Services.QualityDesign/qualityDesign/assignZHBJrzzJqGy",
      {
        method: "post",
        params: { orderNo, jrzz, jq },
      },
    );
  },
  queryJggyDesignResult(orderNo?: string) {
    return requestClient.request<JggyEntities>(
      "/dDH.Service.SQM.Services.QualityDesign/qualityDesign/queryJggyDesignResult",
      {
        method: "post",
        params: { orderNo },
      },
    );
  },
};

export const testItemApi = {
  queryTestItems() {
    return requestClient.request<TestItemDto[]>(
      "/dDH.Service.SQM.Services/testItem/queryTestItems",
      {
        method: "post",
      },
    );
  },
  querySubItems() {
    return requestClient.request<TestSubItem[]>(
      "/dDH.Service.SQM.Services/testItem/querySubItems",
      {
        method: "post",
      },
    );
  },
  query(keyword?: string) {
    return requestClient.request<TestSubItem[]>(
      "/dDH.Service.SQM.Services/testItem/query",
      {
        method: "post",
        params: { keyword },
      },
    );
  },
  insertOrUpdate(data?: TestSubItem) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services/testItem/insertOrUpdate",
      {
        method: "post",
        data,
      },
    );
  },
  delete(data?: TestSubItem) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services/testItem/delete",
      {
        method: "post",
        data,
      },
    );
  },
  queryChemicalItems() {
    return requestClient.request<ChemicalItem[]>(
      "/dDH.Service.SQM.Services/testItem/queryChemicalItems",
      {
        method: "post",
      },
    );
  },
};

export const testStandardApi = {
  queryCfStds(data?: QueryCFStdInput[]) {
    return requestClient.request<ChemicalCompositionStdResult[]>(
      "/dDH.Service.SQM.Services/testStandard/queryCfStds",
      {
        method: "post",
        data,
      },
    );
  },
  queryCfStd(data?: QueryCFStdInput) {
    return requestClient.request<ChemicalCompositionStdResult>(
      "/dDH.Service.SQM.Services/testStandard/queryCfStd",
      {
        method: "post",
        data,
      },
    );
  },
  queryTestStd(data?: AddTestJobInput) {
    return requestClient.request<TestStandard[]>(
      "/dDH.Service.SQM.Services/testStandard/queryTestStd",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tmp1210Api = {
  addTmp1210(data?: Tmp1210) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tmp1210/addTmp1210",
      {
        method: "post",
        data,
      },
    );
  },
  getTmp1210List(steelType?: string, steelGrade?: string) {
    return requestClient.request<Tmp1210[]>(
      "/dDH.Service.SQM.Services.Tmptp/tmp1210/getTmp1210List",
      {
        method: "post",
        params: { steelType, steelGrade },
      },
    );
  },
  removeTmp1210(data?: Tmp1210) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tmp1210/removeTmp1210",
      {
        method: "post",
        data,
      },
    );
  },
  updateTmp1210(data?: Tmp1210) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tmp1210/updateTmp1210",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tql1015Api = {
  addThr4010(data?: Thr4010) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1015/addThr4010",
      {
        method: "post",
        data,
      },
    );
  },
  addThr4010Batch(data?: Thr4010[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1015/addThr4010Batch",
      {
        method: "post",
        data,
      },
    );
  },
  getThr4000List(data?: QueryCriteriaDTO) {
    return requestClient.request<Thr4000[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1015/getThr4000List",
      {
        method: "post",
        data,
      },
    );
  },
  getThr4010List() {
    return requestClient.request<Thr4010[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1015/getThr4010List",
      {
        method: "post",
      },
    );
  },
  savetql4010(result?: string, details?: Thr4010[], data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1015/savetql4010",
      {
        method: "post",
        params: { result, details },
        data,
      },
    );
  },
};

export const tql1016Api = {
  addTms3010(data?: Tms3010) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1016/addTms3010",
      {
        method: "post",
        data,
      },
    );
  },
  addTms3010Batch(data?: Tms3010[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1016/addTms3010Batch",
      {
        method: "post",
        data,
      },
    );
  },
  getTms3000List(data?: QueryCriteriaDTO) {
    return requestClient.request<Tms3000[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1016/getTms3000List",
      {
        method: "post",
        data,
      },
    );
  },
  getTms3010List() {
    return requestClient.request<Tms3010[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1016/getTms3010List",
      {
        method: "post",
      },
    );
  },
  saveTms3010(result?: string, details?: Tms3010[], data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1016/saveTms3010",
      {
        method: "post",
        params: { result, details },
        data,
      },
    );
  },
};

export const tql1120Api = {
  addTql1120(data?: DefectType) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/addTql1120",
      {
        method: "post",
        data,
      },
    );
  },
  addTql1121(data?: DefectDescription) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/addTql1121",
      {
        method: "post",
        data,
      },
    );
  },
  getTql1120List(keyword?: string) {
    return requestClient.request<DefectType[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/getTql1120List",
      {
        method: "post",
        params: { keyword },
      },
    );
  },
  queryDefectType() {
    return requestClient.request<DefectType[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/queryDefectType",
      {
        method: "post",
      },
    );
  },
  getTql1121List(keyword?: string) {
    return requestClient.request<DefectDescription[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/getTql1121List",
      {
        method: "post",
        params: { keyword },
      },
    );
  },
  queryDefectDescription() {
    return requestClient.request<DefectDescription[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/queryDefectDescription",
      {
        method: "post",
      },
    );
  },
  removeTql1120(data?: DefectType) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/removeTql1120",
      {
        method: "post",
        data,
      },
    );
  },
  removeTql1121(data?: DefectDescription) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/removeTql1121",
      {
        method: "post",
        data,
      },
    );
  },
  updateTql1120(data?: DefectType) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/updateTql1120",
      {
        method: "post",
        data,
      },
    );
  },
  updateTql1121(data?: DefectDescription) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/updateTql1121",
      {
        method: "post",
        data,
      },
    );
  },
  tql1120ByCode(code?: string, editId?: string) {
    return requestClient.request<boolean>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/tql1120ByCode",
      {
        method: "post",
        params: { code, editId },
      },
    );
  },
  tql1121ByCode(code?: string, editId?: string) {
    return requestClient.request<boolean>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/tql1121ByCode",
      {
        method: "post",
        params: { code, editId },
      },
    );
  },
};

export const tqm1000Api = {
  getTqm1000List() {
    return requestClient.request<Tqm1000[]>(
      "/dDH.Service.SQM.Services.Tmptp/tqm1000/getTqm1000List",
      {
        method: "post",
      },
    );
  },
  addTqm1000(data?: Tqm1000) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tqm1000/addTqm1000",
      {
        method: "post",
        data,
      },
    );
  },
  removeTqm1000(data?: Tqm1000) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tqm1000/removeTqm1000",
      {
        method: "post",
        data,
      },
    );
  },
  updateTqm1000(data?: Tqm1000) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tqm1000/updateTqm1000",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmjgApi = {
  query(data?: QueryJg01Input) {
    return requestClient.request<Tqmjg01[]>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/query",
      {
        method: "post",
        data,
      },
    );
  },
  queryById(id?: string) {
    return requestClient.request<JggyEntities>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/queryById",
      {
        method: "post",
        params: { id },
      },
    );
  },
  save(data?: JggyEntities) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/save",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistory(data?: QueryTqmjgRecordInput) {
    return requestClient.request<Tqmjg01Record[]>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/queryHistory",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistoryDetail(id?: string) {
    return requestClient.request<JggyEntities>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/queryHistoryDetail",
      {
        method: "post",
        params: { id },
      },
    );
  },
  delete(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/delete",
      {
        method: "post",
        params: { id },
      },
    );
  },
  updateValidFlag(id?: string, data?: ValidFlag) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/updateValidFlag",
      {
        method: "post",
        params: { id },
        data,
      },
    );
  },
};

export const tqmtdApi = {
  queryTqmtd10(data?: QueryTqmtd10Input) {
    return requestClient.request<Tqmtd10[]>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/queryTqmtd10",
      {
        method: "post",
        data,
      },
    );
  },
  queryTqmtd11By10Id(tqmtd10Id?: string) {
    return requestClient.request<Tqmtd11[]>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/queryTqmtd11By10Id",
      {
        method: "post",
        params: { tqmtd10Id },
      },
    );
  },
  queryTqmtd12By10Id(tqmtd10Id?: string) {
    return requestClient.request<Tqmtd12[]>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/queryTqmtd12By10Id",
      {
        method: "post",
        params: { tqmtd10Id },
      },
    );
  },
  queryById(id?: string) {
    return requestClient.request<TqmtdEntities>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/queryById",
      {
        method: "post",
        params: { id },
      },
    );
  },
  save(data?: TqmtdEntities) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/save",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistory(data?: QueryTqmtdRecordInput) {
    return requestClient.request<Tqmtd10Record[]>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/queryHistory",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistoryDetail(id?: string) {
    return requestClient.request<TqmtdEntities>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/queryHistoryDetail",
      {
        method: "post",
        params: { id },
      },
    );
  },
  updateStatus(tqmtd10Id?: string, data?: ValidFlag) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/updateStatus",
      {
        method: "post",
        params: { tqmtd10Id },
        data,
      },
    );
  },
  delete(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/delete",
      {
        method: "post",
        params: { id },
      },
    );
  },
};

export const tqmtm09Api = {
  saveTm09AndIdxTable(data?: SaveIdxDataDto) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm09/saveTm09AndIdxTable",
      {
        method: "post",
        data,
      },
    );
  },
  checkIdxNoExists(data?: Tqmtm09) {
    return requestClient.request<boolean>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm09/checkIdxNoExists",
      {
        method: "post",
        data,
      },
    );
  },
  queryTm09AndIdxData(data?: SelectedTableCondtionDto) {
    return requestClient.request<SelectedTableDataDto[]>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm09/queryTm09AndIdxData",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmtm104Api = {
  queryTreeSource() {
    return requestClient.request<Tqmtm104DetailDto[]>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/queryTreeSource",
      {
        method: "post",
      },
    );
  },
  queryGrp(data?: Tqmtm104ConditionDto) {
    return requestClient.request<Tqmtm104Dto[]>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/queryGrp",
      {
        method: "post",
        data,
      },
    );
  },
  addNew(data?: Tqmtm104Dto) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/addNew",
      {
        method: "post",
        data,
      },
    );
  },
  update(data?: Tqmtm104Dto) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/update",
      {
        method: "post",
        data,
      },
    );
  },
  delete(data?: Tqmtm104Dto) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/delete",
      {
        method: "post",
        data,
      },
    );
  },
  import(data?: Tqmtm08[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/import",
      {
        method: "post",
        data,
      },
    );
  },
  save(data?: Tqmtm104DtoSaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/save",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmtp01Api = {
  query(data?: Tqmtp01QueryInput) {
    return requestClient.request<Tqmtp01Dto[]>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/query",
      {
        method: "post",
        data,
      },
    );
  },
  queryForEdit(id?: string) {
    return requestClient.request<Tqmtp01>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/queryForEdit",
      {
        method: "post",
        params: { id },
      },
    );
  },
  save(data?: Tqmtp01) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/save",
      {
        method: "post",
        data,
      },
    );
  },
  delete(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/delete",
      {
        method: "post",
        params: { id },
      },
    );
  },
  addMsc(data?: Tqmtp03) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/addMsc",
      {
        method: "post",
        data,
      },
    );
  },
  deleteMsc(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/deleteMsc",
      {
        method: "post",
        params: { id },
      },
    );
  },
  setValidFlag(id?: string, data?: ValidFlag) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/setValidFlag",
      {
        method: "post",
        params: { id },
        data,
      },
    );
  },
};

export const tqmtpa4Api = {
  query(data?: Tqmtpa4QueryInput) {
    return requestClient.request<Tqmtpa4[]>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa4/query",
      {
        method: "post",
        data,
      },
    );
  },
  save(data?: Tqmtpa4SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa4/save",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmtpa5Api = {
  query(data?: Tqmtpa5QueryInput) {
    return requestClient.request<Tqmtpa5[]>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa5/query",
      {
        method: "post",
        data,
      },
    );
  },
  save(data?: Tqmtpa5SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa5/save",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmtpa6Api = {
  insertOrReplace(data?: Tqmtpa6) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa6/insertOrReplace",
      {
        method: "post",
        data,
      },
    );
  },
  delete(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa6/delete",
      {
        method: "post",
        data,
      },
    );
  },
  query(data?: Tqmtpa6QueryInput) {
    return requestClient.request<Tqmtpa6[]>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa6/query",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmts0xApi = {
  query(data?: Tqmts0xQueryInput) {
    return requestClient.request<Tqmts0xDto[]>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/query",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistory(data?: QueryTqmts0xHistoryInput) {
    return requestClient.request<Tqmts0xRecord[]>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/queryHistory",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistoryDetail(id?: string) {
    return requestClient.request<Tqmts0xDto>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/queryHistoryDetail",
      {
        method: "post",
        params: { id },
      },
    );
  },
  queryWithTs02(data?: Tqmts0xQueryInput) {
    return requestClient.request<Tqmts0xDto[]>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/queryWithTs02",
      {
        method: "post",
        data,
      },
    );
  },
  queryTqmts02s(idxNo?: string) {
    return requestClient.request<TsTableProVal[]>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/queryTqmts02s",
      {
        method: "post",
        params: { idxNo },
      },
    );
  },
  save(data?: Tqmts0xDto) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/save",
      {
        method: "post",
        data,
      },
    );
  },
  delete(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/delete",
      {
        method: "post",
        params: { id },
      },
    );
  },
  buildNewStNo(lm?: string, qma5?: string, qma6?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/buildNewStNo",
      {
        method: "post",
        params: { lm, qma5, qma6 },
      },
    );
  },
  buildNewJMStNo(head?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/buildNewJMStNo",
      {
        method: "post",
        params: { head },
      },
    );
  },
  getUsedMsc(stno?: string) {
    return requestClient.request<string[]>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/getUsedMsc",
      {
        method: "post",
        params: { stno },
      },
    );
  },
  editValidFlag(stNo?: string, data?: ValidFlag) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/editValidFlag",
      {
        method: "post",
        params: { stNo },
        data,
      },
    );
  },
};

export const tqmylApi = {
  queryYl01(data?: QueryYl01Input) {
    return requestClient.request<Tqmyl01[]>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/queryYl01",
      {
        method: "post",
        data,
      },
    );
  },
  queryById(id?: string) {
    return requestClient.request<YlgyEntities>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/queryById",
      {
        method: "post",
        params: { id },
      },
    );
  },
  save(data?: YlgyEntities) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/save",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistory(data?: QueryTqmylRecordInput) {
    return requestClient.request<Tqmyl01Record[]>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/queryHistory",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistoryDetail(id?: string) {
    return requestClient.request<YlgyEntities>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/queryHistoryDetail",
      {
        method: "post",
        params: { id },
      },
    );
  },
  delete(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/delete",
      {
        method: "post",
        params: { id },
      },
    );
  },
  updateValidFlag(id?: string, data?: ValidFlag) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/updateValidFlag",
      {
        method: "post",
        params: { id },
        data,
      },
    );
  },
  queryPublicIdxes() {
    return requestClient.request<Tqmyl04[]>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/queryPublicIdxes",
      {
        method: "post",
      },
    );
  },
  savePublicIdxes(data?: Tqmyl04[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/savePublicIdxes",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmyl10Api = {
  query() {
    return requestClient.request<Tqmyl10Dto[]>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl10/query",
      {
        method: "post",
      },
    );
  },
  save(proc?: string, data?: Tqmyl10Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl10/save",
      {
        method: "post",
        params: { proc },
        data,
      },
    );
  },
};

export const tyd2000DSApi = {
  getThr4000List(data?: QueryCriteriaDTO) {
    return requestClient.request<PlateInspectionDto[]>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/getThr4000List",
      {
        method: "post",
        data,
      },
    );
  },
  getTms3000List(data?: QueryCriteriaDTO) {
    return requestClient.request<SteelPlateInspectionDto[]>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/getTms3000List",
      {
        method: "post",
        data,
      },
    );
  },
  getThr4000DetailsList(data?: QueryCriteriaDTO) {
    return requestClient.request<Thr4000Details[]>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/getThr4000DetailsList",
      {
        method: "post",
        data,
      },
    );
  },
  getTms3000DetailsList(data?: QueryCriteriaDTO) {
    return requestClient.request<Tms3000Details[]>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/getTms3000DetailsList",
      {
        method: "post",
        data,
      },
    );
  },
  saveSurfaceResult(PieceNos?: string[], SurfaceResult?: string, DeterminationDesc?: string, DefectMinor?: string, DefectMajor?: string, ResponsibleDept?: string, DisposalOpinion?: string, DisposalOpinion2?: string, DefectDescrip?: string, CompResult?: CompositionEnum, CompRemark?: string, Len?: string, Wth?: string, Thk1?: string, Thk2?: string, Thk3?: string, CNdtResult?: string, CNdtResultDesc?: string, data?: PlateInspectionDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/saveSurfaceResult",
      {
        method: "post",
        params: { PieceNos, SurfaceResult, DeterminationDesc, DefectMinor, DefectMajor, ResponsibleDept, DisposalOpinion, DisposalOpinion2, DefectDescrip, CompResult, CompRemark, Len, Wth, Thk1, Thk2, Thk3, CNdtResult, CNdtResultDesc },
        data,
      },
    );
  },
  saveSurfaceResultS(PieceNos?: string[], SurfaceResult?: string, DeterminationDesc?: string, DefectMinor?: string, DefectMajor?: string, ResponsibleDept?: string, DisposalOpinion?: string, DisposalOpinion2?: string, DefectDescrip?: string, CompResult?: CompositionEnum, CompRemark?: string, Len?: string, Wth?: string, Thk1?: string, Thk2?: string, Thk3?: string, CNdtResult?: string, CNdtResultDesc?: string, data?: SteelPlateInspectionDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/saveSurfaceResultS",
      {
        method: "post",
        params: { PieceNos, SurfaceResult, DeterminationDesc, DefectMinor, DefectMajor, ResponsibleDept, DisposalOpinion, DisposalOpinion2, DefectDescrip, CompResult, CompRemark, Len, Wth, Thk1, Thk2, Thk3, CNdtResult, CNdtResultDesc },
        data,
      },
    );
  },
  saveThr4000Details(PieceNos?: string[], SurfaceResult?: string, DeterminationDesc?: string, DefectMinor?: string, DefectMajor?: string, ResponsibleDept?: string, DisposalOpinion?: string, DisposalOpinion2?: string, DefectDescrip?: string, CompResult?: CompositionEnum, CompRemark?: string, Len?: string, Wth?: string, Thk1?: string, Thk2?: string, Thk3?: string, CNdtResult?: string, CNdtResultDesc?: string, data?: Thr4000Details[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/saveThr4000Details",
      {
        method: "post",
        params: { PieceNos, SurfaceResult, DeterminationDesc, DefectMinor, DefectMajor, ResponsibleDept, DisposalOpinion, DisposalOpinion2, DefectDescrip, CompResult, CompRemark, Len, Wth, Thk1, Thk2, Thk3, CNdtResult, CNdtResultDesc },
        data,
      },
    );
  },
  saveTms3000Details(PieceNos?: string[], SurfaceResult?: string, DeterminationDesc?: string, DefectMinor?: string, DefectMajor?: string, ResponsibleDept?: string, DisposalOpinion?: string, DisposalOpinion2?: string, DefectDescrip?: string, CompResult?: CompositionEnum, CompRemark?: string, Len?: string, Wth?: string, Thk1?: string, Thk2?: string, Thk3?: string, CNdtResult?: string, CNdtResultDesc?: string, data?: Tms3000Details[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/saveTms3000Details",
      {
        method: "post",
        params: { PieceNos, SurfaceResult, DeterminationDesc, DefectMinor, DefectMajor, ResponsibleDept, DisposalOpinion, DisposalOpinion2, DefectDescrip, CompResult, CompRemark, Len, Wth, Thk1, Thk2, Thk3, CNdtResult, CNdtResultDesc },
        data,
      },
    );
  },
  revertThr4000Details(data?: Thr4000Details[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/revertThr4000Details",
      {
        method: "post",
        data,
      },
    );
  },
  revertTms3000Details(data?: Tms3000Details[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/revertTms3000Details",
      {
        method: "post",
        data,
      },
    );
  },
  getFrm03List(data?: QueryCriteriaDTO) {
    return requestClient.request<PlateInspectionDto[]>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/getFrm03List",
      {
        method: "post",
        data,
      },
    );
  },
  getTht4000ZrpanList(data?: QueryCriteriaDTO) {
    return requestClient.request<Thr4000Zrpan[]>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/getTht4000ZrpanList",
      {
        method: "post",
        data,
      },
    );
  },
  saveResponsibleDept(PieceNos?: string[], SurfaceResult?: string, DeterminationDesc?: string, DefectMinor?: string, DefectMajor?: string, ResponsibleDept?: string, DisposalOpinion?: string, DisposalOpinion2?: string, DefectDescrip?: string, CompResult?: CompositionEnum, CompRemark?: string, Len?: string, Wth?: string, Thk1?: string, Thk2?: string, Thk3?: string, CNdtResult?: string, CNdtResultDesc?: string, data?: PlateInspectionDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/saveResponsibleDept",
      {
        method: "post",
        params: { PieceNos, SurfaceResult, DeterminationDesc, DefectMinor, DefectMajor, ResponsibleDept, DisposalOpinion, DisposalOpinion2, DefectDescrip, CompResult, CompRemark, Len, Wth, Thk1, Thk2, Thk3, CNdtResult, CNdtResultDesc },
        data,
      },
    );
  },
  saveResponsibleDeptS(PieceNos?: string[], SurfaceResult?: string, DeterminationDesc?: string, DefectMinor?: string, DefectMajor?: string, ResponsibleDept?: string, DisposalOpinion?: string, DisposalOpinion2?: string, DefectDescrip?: string, CompResult?: CompositionEnum, CompRemark?: string, Len?: string, Wth?: string, Thk1?: string, Thk2?: string, Thk3?: string, CNdtResult?: string, CNdtResultDesc?: string, data?: Thr4000Zrpan[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/saveResponsibleDeptS",
      {
        method: "post",
        params: { PieceNos, SurfaceResult, DeterminationDesc, DefectMinor, DefectMajor, ResponsibleDept, DisposalOpinion, DisposalOpinion2, DefectDescrip, CompResult, CompRemark, Len, Wth, Thk1, Thk2, Thk3, CNdtResult, CNdtResultDesc },
        data,
      },
    );
  },
  revertThr4000Zrpan(data?: Thr4000Zrpan[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/revertThr4000Zrpan",
      {
        method: "post",
        data,
      },
    );
  },
};
