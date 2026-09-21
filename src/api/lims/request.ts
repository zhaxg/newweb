import { requestClient } from "@/api/_core/request";

import type {
  TestJobCheckStatus,
  TestJobJudgeResult,
} from "./enums";
import type {
  AddStoveChemSampleInput,
  AddStoveChemTestInput,
  AddTestJobInput,
  ChangeTestJobBatchNoInput,
  ChemItemInfo,
  CompleteItemInput,
  QueryCFStdInput,
  QueryStoveChemInfoInput,
  QueryStoveChemicalCompositionInput,
  QueryTestJobInput,
  QueryTqlCFCollectDto,
  QueryTqlLXCollectDto,
  SampleRequires,
  StoveChemInfo,
  StoveChemicalCompositionResult,
  StoveInfo,
  StoveSampleTestItem,
  StoveTestSample,
  TestJob,
  TestSample,
  Tql2000,
  Tql2001,
  Tql3200,
  Tql4100History,
  TqlCfCollect,
  TqlImpactCollect,
  TqlLxCollect,
} from "./types";

export const qL3000Api = {
  queryTestJob(data?: QueryTestJobInput) {
    return requestClient.request<TestJob[]>(
      "/dDH.Service.LIMS.Services/qL3000/queryTestJob",
      {
        method: "post",
        data,
      },
    );
  },
};

export const qL3100Api = {
  queryTestJob(data?: QueryTestJobInput) {
    return requestClient.request<TestJob[]>(
      "/dDH.Service.LIMS.Services/qL3100/queryTestJob",
      {
        method: "post",
        data,
      },
    );
  },
  complete(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/qL3100/complete",
      {
        method: "post",
        data,
      },
    );
  },
};

export const qL3200Api = {
  queryTestSamplesBySampleRequires(data?: SampleRequires) {
    return requestClient.request<TestSample[]>(
      "/dDH.Service.LIMS.Services/qL3200/queryTestSamplesBySampleRequires",
      {
        method: "post",
        data,
      },
    );
  },
  check(status?: TestJobCheckStatus, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/qL3200/check",
      {
        method: "post",
        params: { status },
        data,
      },
    );
  },
  passMulti(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/qL3200/passMulti",
      {
        method: "post",
        data,
      },
    );
  },
  revertCheck(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/qL3200/revertCheck",
      {
        method: "post",
        data,
      },
    );
  },
};

export const stoveChemicalCompositionTestApi = {
  addStoveChemicalCompositionTestJob(data?: AddStoveChemTestInput) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/addStoveChemicalCompositionTestJob",
      {
        method: "post",
        data,
      },
    );
  },
  deleteStoveChemicalCompositionTestJob(stoveNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/deleteStoveChemicalCompositionTestJob",
      {
        method: "post",
        params: { stoveNo },
      },
    );
  },
  addStoveChemicalCompositionSample(data?: AddStoveChemSampleInput) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/addStoveChemicalCompositionSample",
      {
        method: "post",
        data,
      },
    );
  },
  saveStoveChemicalCompositionTestResult(data?: StoveChemicalCompositionResult[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/saveStoveChemicalCompositionTestResult",
      {
        method: "post",
        data,
      },
    );
  },
  addONHSample(stove?: string, data?: ChemItemInfo[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/addONHSample",
      {
        method: "post",
        params: { stove },
        data,
      },
    );
  },
  setFinalSample(sampleId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/setFinalSample",
      {
        method: "post",
        params: { sampleId },
      },
    );
  },
  queryStoveSamples(data?: QueryStoveChemicalCompositionInput) {
    return requestClient.request<StoveInfo[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryStoveSamples",
      {
        method: "post",
        data,
      },
    );
  },
  getSamplesItems(sampleId?: string) {
    return requestClient.request<StoveSampleTestItem[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/getSamplesItems",
      {
        method: "post",
        params: { sampleId },
      },
    );
  },
  getStoveTestStds(stove?: string, data?: QueryCFStdInput) {
    return requestClient.request<StoveSampleTestItem[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/getStoveTestStds",
      {
        method: "post",
        params: { stove },
        data,
      },
    );
  },
  addSample(data?: StoveTestSample) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/addSample",
      {
        method: "post",
        data,
      },
    );
  },
  deleteSample(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/deleteSample",
      {
        method: "post",
        params: { id },
      },
    );
  },
  saveItemResult(data?: StoveTestSample) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/saveItemResult",
      {
        method: "post",
        data,
      },
    );
  },
  stoveConfirm(data?: StoveInfo) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/stoveConfirm",
      {
        method: "post",
        data,
      },
    );
  },
  stoveAutoJudge(stoveNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/stoveAutoJudge",
      {
        method: "post",
        params: { stoveNo },
      },
    );
  },
  unqualified(stoveNo?: string, remark?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/unqualified",
      {
        method: "post",
        params: { stoveNo, remark },
      },
    );
  },
  release(data?: Tql2000) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/release",
      {
        method: "post",
        data,
      },
    );
  },
  waste(data?: StoveInfo) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/waste",
      {
        method: "post",
        data,
      },
    );
  },
  queryFinalOrDisableSamples(stove?: string, data?: QueryCFStdInput) {
    return requestClient.request<StoveTestSample[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryFinalOrDisableSamples",
      {
        method: "post",
        params: { stove },
        data,
      },
    );
  },
  queryFinalSample(stove?: string, data?: QueryCFStdInput) {
    return requestClient.request<StoveTestSample>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryFinalSample",
      {
        method: "post",
        params: { stove },
        data,
      },
    );
  },
  queryOrignStoveChem(stove?: string) {
    return requestClient.request<StoveInfo>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryOrignStoveChem",
      {
        method: "post",
        params: { stove },
      },
    );
  },
  queryStoveChemInfo(data?: QueryStoveChemInfoInput) {
    return requestClient.request<StoveChemInfo[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryStoveChemInfo",
      {
        method: "post",
        data,
      },
    );
  },
  recheck(data?: StoveTestSample) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/recheck",
      {
        method: "post",
        data,
      },
    );
  },
  queryAllSamples(stove?: string, data?: QueryCFStdInput) {
    return requestClient.request<StoveTestSample[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryAllSamples",
      {
        method: "post",
        params: { stove },
        data,
      },
    );
  },
  getStoveTestSample(stoveNo?: string) {
    return requestClient.request<StoveTestSample[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/getStoveTestSample",
      {
        method: "post",
        params: { stoveNo },
      },
    );
  },
  syncStoveCf(data?: AddStoveChemTestInput) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/syncStoveCf",
      {
        method: "post",
        data,
      },
    );
  },
};

export const testJobApi = {
  addTestJob(data?: AddTestJobInput) {
    return requestClient.request<string>(
      "/dDH.Service.LIMS.Services/testJob/addTestJob",
      {
        method: "post",
        data,
      },
    );
  },
  changeBatchNo(data?: ChangeTestJobBatchNoInput) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/changeBatchNo",
      {
        method: "post",
        data,
      },
    );
  },
  deleteTestJob(testNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/deleteTestJob",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  remark(remark?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/remark",
      {
        method: "post",
        params: { remark },
        data,
      },
    );
  },
  querySampleRequires(tql3100Id?: string, needSendLab?: boolean) {
    return requestClient.request<SampleRequires[]>(
      "/dDH.Service.LIMS.Services/testJob/querySampleRequires",
      {
        method: "post",
        params: { tql3100Id, needSendLab },
      },
    );
  },
  query3200s(testNo?: string) {
    return requestClient.request<Tql3200[]>(
      "/dDH.Service.LIMS.Services/testJob/query3200s",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  jiaJi(tql3100Id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/jiaJi",
      {
        method: "post",
        params: { tql3100Id },
      },
    );
  },
  saveSampleRequires(data?: SampleRequires[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/saveSampleRequires",
      {
        method: "post",
        data,
      },
    );
  },
  addSampleRequires(data?: SampleRequires) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/addSampleRequires",
      {
        method: "post",
        data,
      },
    );
  },
  deleteSampleRequires(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/deleteSampleRequires",
      {
        method: "post",
        params: { id },
      },
    );
  },
  sendTestJob(id?: string, data?: SampleRequires[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/sendTestJob",
      {
        method: "post",
        params: { id },
        data,
      },
    );
  },
  sendTestJobJiaJi(id?: string, data?: SampleRequires[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/sendTestJobJiaJi",
      {
        method: "post",
        params: { id },
        data,
      },
    );
  },
  cancelSendTestJob(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/cancelSendTestJob",
      {
        method: "post",
        params: { id },
      },
    );
  },
  receive(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/receive",
      {
        method: "post",
        data,
      },
    );
  },
  print(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/print",
      {
        method: "post",
        data,
      },
    );
  },
  reversePrint(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/reversePrint",
      {
        method: "post",
        params: { id },
      },
    );
  },
  cancelReceive(tql3100Id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/cancelReceive",
      {
        method: "post",
        params: { tql3100Id },
      },
    );
  },
  queryTestJob(data?: QueryTestJobInput) {
    return requestClient.request<TestJob[]>(
      "/dDH.Service.LIMS.Services/testJob/queryTestJob",
      {
        method: "post",
        data,
      },
    );
  },
  queryTestSample(tql3100Id?: string, testItemType?: string, data?: string[]) {
    return requestClient.request<TestSample[]>(
      "/dDH.Service.LIMS.Services/testJob/queryTestSample",
      {
        method: "post",
        params: { tql3100Id, testItemType },
        data,
      },
    );
  },
  queryTestStds(testNo?: string) {
    return requestClient.request<Tql3200[]>(
      "/dDH.Service.LIMS.Services/testJob/queryTestStds",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  saveSample(data?: TestSample) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/saveSample",
      {
        method: "post",
        data,
      },
    );
  },
  saveSamples(data?: TestSample[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/saveSamples",
      {
        method: "post",
        data,
      },
    );
  },
  completeItem(data?: CompleteItemInput) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/completeItem",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistory(testNo?: string) {
    return requestClient.request<Tql4100History[]>(
      "/dDH.Service.LIMS.Services/testJob/queryHistory",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  hasTestNo(data?: string[]) {
    return requestClient.request<boolean>(
      "/dDH.Service.LIMS.Services/testJob/hasTestNo",
      {
        method: "post",
        data,
      },
    );
  },
  queryAllSamples(testNo?: string) {
    return requestClient.request<TestSample[]>(
      "/dDH.Service.LIMS.Services/testJob/queryAllSamples",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  querySamplesByTestNo(testNo?: string) {
    return requestClient.request<TestSample[]>(
      "/dDH.Service.LIMS.Services/testJob/querySamplesByTestNo",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  queryTestJobMainForJudge(data?: QueryTestJobInput) {
    return requestClient.request<TestJob[]>(
      "/dDH.Service.LIMS.Services/testJob/queryTestJobMainForJudge",
      {
        method: "post",
        data,
      },
    );
  },
  checkComplexDecide(testNo?: string) {
    return requestClient.request<boolean>(
      "/dDH.Service.LIMS.Services/testJob/checkComplexDecide",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  changeJudgeResult(tql3000Id?: string, remark?: string, data?: TestJobJudgeResult) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/changeJudgeResult",
      {
        method: "post",
        params: { tql3000Id, remark },
        data,
      },
    );
  },
  queryRecheckSampleRequires(testNo?: string) {
    return requestClient.request<SampleRequires[]>(
      "/dDH.Service.LIMS.Services/testJob/queryRecheckSampleRequires",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  labRecheck(testNo?: string, data?: SampleRequires[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/labRecheck",
      {
        method: "post",
        params: { testNo },
        data,
      },
    );
  },
  qMRecheck(data?: TestSample[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/qMRecheck",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tql2001Api = {
  queryStoveInfo(data?: QueryStoveChemicalCompositionInput) {
    return requestClient.request<Tql2000[]>(
      "/dDH.Service.LIMS.Services/tql2001/queryStoveInfo",
      {
        method: "post",
        data,
      },
    );
  },
  queryStoveData(stove?: string) {
    return requestClient.request<Tql2001[]>(
      "/dDH.Service.LIMS.Services/tql2001/queryStoveData",
      {
        method: "post",
        params: { stove },
      },
    );
  },
  aPPQueryStoveData(stove?: string) {
    return requestClient.request<Tql2001[]>(
      "/dDH.Service.LIMS.Services/tql2001/aPPQueryStoveData",
      {
        method: "post",
        params: { stove },
      },
    );
  },
  queryLastSampleId(stove?: string) {
    return requestClient.request<StoveSampleTestItem[]>(
      "/dDH.Service.LIMS.Services/tql2001/queryLastSampleId",
      {
        method: "post",
        params: { stove },
      },
    );
  },
};

export const tqlCFCollectApi = {
  consumeMsg(jsonMsg?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlCFCollect/consumeMsg",
      {
        method: "post",
        params: { jsonMsg },
      },
    );
  },
  tqlCfCollectHandle(data?: TqlCfCollect) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlCFCollect/tqlCfCollectHandle",
      {
        method: "post",
        data,
      },
    );
  },
  getUnHandleCfqlCollect() {
    return requestClient.request<TqlCfCollect[]>(
      "/dDH.Service.LIMS.Services/tqlCFCollect/getUnHandleCfqlCollect",
      {
        method: "post",
      },
    );
  },
  queryTqlCfCollects(data?: QueryTqlCFCollectDto) {
    return requestClient.request<TqlCfCollect[]>(
      "/dDH.Service.LIMS.Services/tqlCFCollect/queryTqlCfCollects",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqlLXCollectApi = {
  consumeMsg(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/consumeMsg",
      {
        method: "post",
        data,
      },
    );
  },
  tqlLxCollectHandle(data?: TqlLxCollect) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/tqlLxCollectHandle",
      {
        method: "post",
        data,
      },
    );
  },
  getUnHandleLxTqlCollect() {
    return requestClient.request<TqlLxCollect[]>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/getUnHandleLxTqlCollect",
      {
        method: "post",
      },
    );
  },
  queryTqlLxCollects(data?: QueryTqlLXCollectDto) {
    return requestClient.request<TqlLxCollect[]>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/queryTqlLxCollects",
      {
        method: "post",
        data,
      },
    );
  },
  saveLxMsg(josnMsg?: string, msgId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/saveLxMsg",
      {
        method: "post",
        params: { josnMsg, msgId },
      },
    );
  },
  saveImpactMsg(josnMsg?: string, msgId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/saveImpactMsg",
      {
        method: "post",
        params: { josnMsg, msgId },
      },
    );
  },
  saveUnresolvedMsg(josnMsg?: string, msgId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/saveUnresolvedMsg",
      {
        method: "post",
        params: { josnMsg, msgId },
      },
    );
  },
  queryTqlImpactCollects(data?: QueryTqlLXCollectDto) {
    return requestClient.request<TqlImpactCollect[]>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/queryTqlImpactCollects",
      {
        method: "post",
        data,
      },
    );
  },
  tqlImpactCollectHandle(data?: TqlImpactCollect) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/tqlImpactCollectHandle",
      {
        method: "post",
        data,
      },
    );
  },
  getUnHandleImpactTqlCollect() {
    return requestClient.request<TqlImpactCollect[]>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/getUnHandleImpactTqlCollect",
      {
        method: "post",
      },
    );
  },
};
