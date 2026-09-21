import { requestClient } from "@/api/_core/request";

import type {
  Tyd2010TypeEnum,
} from "./enums";
import type {
  AppQueryStorageDto,
  CPStoragePosition,
  ConsumeStorageDto,
  DBDto,
  DBRKDto,
  DDDto,
  EntruckingStorageDto,
  InventoryPlanQueryDto,
  InventoryResult,
  MatchPlanStorageDto,
  QueryDBDto,
  QueryInOrOutInputDto,
  QueryNotInStorageDto,
  RKDBDto,
  SlSjInfoDto,
  StorageDDDto,
  StorageGPDto,
  StorageInOutDto,
  StorageInputDto,
  StoragePosition,
  StorageRecordDto,
  StorageSearchInput,
  StoreMapInputDto,
  StoreMapItemDto,
  TestUser,
  Tyd1000,
  Tyd1002,
  Tyd1010,
  Tyd1010Dto,
  Tyd1100,
  Tyd2000,
  Tyd2000Dto,
  Tyd2000InOutRecord,
  Tyd2000PdPlan,
  Tyd2000PdPlanArea,
  Tyd2000PdResult,
  Tyd2000Record,
  Tyd2020,
  Tyd2020Dto,
} from "./types";

export const cPStorageApi = {
  cPInStorage(data?: CPStoragePosition[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/cPStorage/cPInStorage",
      {
        method: "post",
        data,
      },
    );
  },
  cPOutStorage(data?: CPStoragePosition[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/cPStorage/cPOutStorage",
      {
        method: "post",
        data,
      },
    );
  },
  queryStack(data?: StoragePosition) {
    return requestClient.request<Tyd1010Dto[]>(
      "/dDH.Service.SYD.Services/cPStorage/queryStack",
      {
        method: "post",
        data,
      },
    );
  },
  xnfh(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/cPStorage/xnfh",
      {
        method: "post",
        data,
      },
    );
  },
};

export const inventoryApi = {
  addInventoryArea(data?: Tyd2000PdPlanArea[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/addInventoryArea",
      {
        method: "post",
        data,
      },
    );
  },
  addInventoryList(data?: Tyd2000PdResult[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/addInventoryList",
      {
        method: "post",
        data,
      },
    );
  },
  addPlan(data?: Tyd2000PdPlan) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/addPlan",
      {
        method: "post",
        data,
      },
    );
  },
  delPlan(planId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/delPlan",
      {
        method: "post",
        params: { planId },
      },
    );
  },
  addInventoryResult(data?: InventoryResult[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/addInventoryResult",
      {
        method: "post",
        data,
      },
    );
  },
  queryInventoryArea(invList?: string) {
    return requestClient.request<Tyd2000PdPlanArea[]>(
      "/dDH.Service.SYD.Services.Inven/inventory/queryInventoryArea",
      {
        method: "post",
        params: { invList },
      },
    );
  },
  queryInventoryList(invPlan?: string) {
    return requestClient.request<Tyd2000PdResult[]>(
      "/dDH.Service.SYD.Services.Inven/inventory/queryInventoryList",
      {
        method: "post",
        params: { invPlan },
      },
    );
  },
  queryInventoryPlan(data?: InventoryPlanQueryDto) {
    return requestClient.request<Tyd2000PdPlan[]>(
      "/dDH.Service.SYD.Services.Inven/inventory/queryInventoryPlan",
      {
        method: "post",
        data,
      },
    );
  },
  queryInventoryResult(invResult?: string) {
    return requestClient.request<Tyd2000PdResult[]>(
      "/dDH.Service.SYD.Services.Inven/inventory/queryInventoryResult",
      {
        method: "post",
        params: { invResult },
      },
    );
  },
  startInventoryPlan(inventoryPlanNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/startInventoryPlan",
      {
        method: "post",
        params: { inventoryPlanNo },
      },
    );
  },
  updateInventoryResults(data?: InventoryPlanQueryDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/updateInventoryResults",
      {
        method: "post",
        data,
      },
    );
  },
  editInventoryResults(inventoryPlanNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/editInventoryResults",
      {
        method: "post",
        params: { inventoryPlanNo },
      },
    );
  },
};

export const storageApi = {
  insertReceivingActual(data?: SlSjInfoDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/insertReceivingActual",
      {
        method: "post",
        data,
      },
    );
  },
  deleteReceivingActual(data?: StorageRecordDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/deleteReceivingActual",
      {
        method: "post",
        data,
      },
    );
  },
  inStorage(data?: StorageInOutDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/inStorage",
      {
        method: "post",
        data,
      },
    );
  },
  outStorage(data?: StorageInOutDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/outStorage",
      {
        method: "post",
        data,
      },
    );
  },
  matchPlan(data?: MatchPlanStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/matchPlan",
      {
        method: "post",
        data,
      },
    );
  },
  cancelMatchPlan(data?: MatchPlanStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/cancelMatchPlan",
      {
        method: "post",
        data,
      },
    );
  },
  consumeLocked(data?: ConsumeStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/consumeLocked",
      {
        method: "post",
        data,
      },
    );
  },
  cancelConsumeLocked(data?: ConsumeStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/cancelConsumeLocked",
      {
        method: "post",
        data,
      },
    );
  },
  consumeFinish(data?: ConsumeStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/consumeFinish",
      {
        method: "post",
        data,
      },
    );
  },
  cancelConsumeFinish(data?: ConsumeStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/cancelConsumeFinish",
      {
        method: "post",
        data,
      },
    );
  },
  entrucking(data?: EntruckingStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/entrucking",
      {
        method: "post",
        data,
      },
    );
  },
  cancelEntrucking(data?: EntruckingStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/cancelEntrucking",
      {
        method: "post",
        data,
      },
    );
  },
  writeRecord(data?: StorageRecordDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/writeRecord",
      {
        method: "post",
        data,
      },
    );
  },
  dDStorage(data?: StorageDDDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/dDStorage",
      {
        method: "post",
        data,
      },
    );
  },
  gPStorage(data?: StorageGPDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/gPStorage",
      {
        method: "post",
        data,
      },
    );
  },
};

export const storageRecordApi = {
  queryPLineCPReocrds(data?: QueryInOrOutInputDto) {
    return requestClient.request<Tyd2000InOutRecord[]>(
      "/dDH.Service.SYD.Services/storageRecord/queryPLineCPReocrds",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tyd1000Api = {
  queryRoom(keyword?: string) {
    return requestClient.request<Tyd1000[]>(
      "/dDH.Service.SYD.Services/tyd1000/queryRoom",
      {
        method: "post",
        params: { keyword },
      },
    );
  },
  queryStacks(room?: string) {
    return requestClient.request<Tyd1010[]>(
      "/dDH.Service.SYD.Services/tyd1000/queryStacks",
      {
        method: "post",
        params: { room },
      },
    );
  },
  queryManyStacks(data?: string[]) {
    return requestClient.request<Tyd1010[]>(
      "/dDH.Service.SYD.Services/tyd1000/queryManyStacks",
      {
        method: "post",
        data,
      },
    );
  },
  queryMap() {
    return requestClient.request<Tyd1002[]>(
      "/dDH.Service.SYD.Services/tyd1000/queryMap",
      {
        method: "post",
      },
    );
  },
  addMap(data?: Tyd1002) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd1000/addMap",
      {
        method: "post",
        data,
      },
    );
  },
  queryMapData(tyd1002Id?: string) {
    return requestClient.request<StoreMapItemDto>(
      "/dDH.Service.SYD.Services/tyd1000/queryMapData",
      {
        method: "post",
        params: { tyd1002Id },
      },
    );
  },
  saveMap(data?: StoreMapItemDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd1000/saveMap",
      {
        method: "post",
        data,
      },
    );
  },
  delMap(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd1000/delMap",
      {
        method: "post",
        params: { id },
      },
    );
  },
};

export const tyd1100Api = {
  tyd1100Query(CarNo?: string, CStoreCode?: string) {
    return requestClient.request<Tyd1100[]>(
      "/dDH.Service.SYD.Services/tyd1100/tyd1100Query",
      {
        method: "post",
        params: { CarNo, CStoreCode },
      },
    );
  },
  delTyd1100(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd1100/delTyd1100",
      {
        method: "post",
        data,
      },
    );
  },
  addTyd1100(data?: Tyd1100) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd1100/addTyd1100",
      {
        method: "post",
        data,
      },
    );
  },
  saveTyd1100(data?: Tyd1100) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd1100/saveTyd1100",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tyd2000Api = {
  queryStorage(data?: StorageInputDto) {
    return requestClient.request<Tyd2000Dto[]>(
      "/dDH.Service.SYD.Services/tyd2000/queryStorage",
      {
        method: "post",
        data,
      },
    );
  },
  queryStorageByMap(data?: StoreMapInputDto) {
    return requestClient.request<Tyd2000Dto[]>(
      "/dDH.Service.SYD.Services/tyd2000/queryStorageByMap",
      {
        method: "post",
        data,
      },
    );
  },
  storageDD(data?: DDDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2000/storageDD",
      {
        method: "post",
        data,
      },
    );
  },
  setStackNum(data?: StoragePosition[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2000/setStackNum",
      {
        method: "post",
        data,
      },
    );
  },
  addProRemark(data?: Tyd2000[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2000/addProRemark",
      {
        method: "post",
        data,
      },
    );
  },
  queryRecords(pieceNo?: string) {
    return requestClient.request<Tyd2000Record[]>(
      "/dDH.Service.SYD.Services/tyd2000/queryRecords",
      {
        method: "post",
        params: { pieceNo },
      },
    );
  },
  queryStorageRecord(data?: StorageSearchInput) {
    return requestClient.request<Tyd2000Dto[]>(
      "/dDH.Service.SYD.Services/tyd2000/queryStorageRecord",
      {
        method: "post",
        data,
      },
    );
  },
  queryNotInStorage(data?: QueryNotInStorageDto) {
    return requestClient.request<Tyd2000Dto[]>(
      "/dDH.Service.SYD.Services/tyd2000/queryNotInStorage",
      {
        method: "post",
        data,
      },
    );
  },
  appQueryStorage(data?: AppQueryStorageDto) {
    return requestClient.request<Tyd2000Dto[]>(
      "/dDH.Service.SYD.Services/tyd2000/appQueryStorage",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tyd2020Api = {
  generateNo(data?: Tyd2010TypeEnum) {
    return requestClient.request<string>(
      "/dDH.Service.SYD.Services/tyd2020/generateNo",
      {
        method: "post",
        data,
      },
    );
  },
  createDB(data?: DBDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/createDB",
      {
        method: "post",
        data,
      },
    );
  },
  queryDB(data?: QueryDBDto) {
    return requestClient.request<Tyd2020Dto[]>(
      "/dDH.Service.SYD.Services/tyd2020/queryDB",
      {
        method: "post",
        data,
      },
    );
  },
  cancelDB(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/cancelDB",
      {
        method: "post",
        data,
      },
    );
  },
  dBCK(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/dBCK",
      {
        method: "post",
        data,
      },
    );
  },
  dBRK(data?: DBRKDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/dBRK",
      {
        method: "post",
        data,
      },
    );
  },
  createCPRKDB(data?: RKDBDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/createCPRKDB",
      {
        method: "post",
        data,
      },
    );
  },
  rk(data?: CPStoragePosition[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/rk",
      {
        method: "post",
        data,
      },
    );
  },
  cPDBRK(data?: DBRKDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/cPDBRK",
      {
        method: "post",
        data,
      },
    );
  },
  cancelCPDBRK(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/cancelCPDBRK",
      {
        method: "post",
        data,
      },
    );
  },
  queryDBDetail(data?: QueryDBDto) {
    return requestClient.request<Tyd2020[]>(
      "/dDH.Service.SYD.Services/tyd2020/queryDBDetail",
      {
        method: "post",
        data,
      },
    );
  },
};

export const userApi = {
  queryUser() {
    return requestClient.request<TestUser[]>(
      "/dDH.Service.SYD.Services/user/queryUser",
      {
        method: "post",
      },
    );
  },
};
