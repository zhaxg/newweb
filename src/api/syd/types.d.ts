import type {
  CPStorageInWayEnum,
  CastDivEnum,
  ComplexDecideResult,
  EqualsFlag,
  InventoryPlanStatusEnum,
  InventoryStatusEnum,
  NProTypeEnum,
  PdResultEnum,
  QMCZ,
  QMLevelEnum,
  QMStatuEnum,
  RoomTypeEnum,
  StorageInOutTypeEnum,
  SurFaceResultEnum,
  Tyd2010TypeEnum,
  Tyd2011StatusEnum,
  UserType,
  YesNo,
  YesNoDefault,
} from "./enums";

export interface AppQueryStorageDto {
  dProTime?: TimeRange;
  nStatus?: InventoryStatusEnum | null;
  cLineCode?: string | null;
  cStoreCode?: string | null;
  cBatchNo?: string | null;
  cStackNo?: string | null;
  cStove?: string | null;
  cPieceNoSlab?: string | null;
  cPieceNo?: string | null;
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: DecimalRange;
  nWth?: DecimalRange;
  nLen?: DecimalRange;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  customerName?: string | null;
  cInboundNo?: string | null;
}
export interface CPStoragePosition {
  cStore?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cPieceNo?: string | null;
  inWay?: CPStorageInWayEnum;
}
export interface ConsumeStorageDto {
  beforeStatus?: InventoryStatusEnum | null;
  afterStatus?: InventoryStatusEnum | null;
  planNo?: string | null;
  pieceNos?: string[] | null;
}
export interface DBDto {
  nBusinsType?: Tyd2010TypeEnum;
  target?: StoragePosition | null;
  pieceNos?: string[] | null;
  remark?: string | null;
  carNo?: string | null;
}
export interface DBRKDto {
  yd2020Id?: string | null;
  target?: StoragePosition | null;
  isAutoStackNum?: boolean;
}
export interface DDDto {
  cStore?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cSgCode?: string | null;
  cCutFlag?: string | null;
  cInboundNo?: string | null;
  cPieceNo?: string | null;
  isAuto?: boolean;
}
export interface DecimalRange {
  min?: number | null;
  max?: number | null;
  equalsMethod?: EqualsFlag;
}
export interface EntruckingStorageDto {
  cStoreCode?: string | null;
  pieceNos?: string[] | null;
}
export interface InventoryPlanQueryDto {
  inventoryPlanNo?: string | null;
  lineCode?: string | null;
  startDate?: string | null;
  endDate?: string;
  pieceNo?: string | null;
  stackNum?: string | null;
  storeCode?: string | null;
  stackNo?: string | null;
}
export interface InventoryResult {
  selected?: boolean;
  id?: string | null;
  cLineCode?: string | null;
  cInventoryPlanNo?: string | null;
  dPlanStartTime?: string | null;
  dPlanEndTime?: string | null;
  cPlanStatus?: InventoryPlanStatusEnum;
  cInventoryType?: string | null;
  cPlanDescription?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackType?: number | null;
  cRemark?: string | null;
  nMaxNum?: number | null;
  nMaxWgt?: number | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cHallNo?: string | null;
  nRow?: number | null;
  nColv?: number | null;
  cArer?: string | null;
  cDefault?: string | null;
  cStoreDes?: string | null;
  nType?: number | null;
  cStoreType?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cProc?: string | null;
  cMachine?: string | null;
  cPlanNo?: string | null;
  cConNo?: string | null;
  cOrderNo?: string | null;
  cMatCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number | null;
  nWth?: number | null;
  nLen?: number | null;
  cSpec?: string | null;
  nNum?: number | null;
  nCalWgt?: number | null;
  nWgt?: number | null;
  dProTime?: string;
  cProUser?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  dInTime?: string | null;
  cInUser?: string | null;
  cStackNum?: string | null;
  cSourceStoreCode?: string | null;
  cSourceStackNo?: string | null;
  cSourceStackNum?: string | null;
  nStatus?: InventoryStatusEnum | null;
  cIsHot?: string | null;
  cProRemark?: string | null;
  nCastDivCode?: number | null;
  cLockedLine?: string | null;
  cLockedPlan?: string | null;
  cMatType?: string | null;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cBatchNo?: string | null;
  cOrderNoLast?: string | null;
  cDestination?: string | null;
  cHotNo?: string | null;
  cSlabType?: string | null;
  cPieceNoSlab?: string | null;
  cPrintCode?: string | null;
  cProdCode?: string | null;
}
export interface MatchPlanStorageDto {
  beforeStatus?: InventoryStatusEnum | null;
  afterStatus?: InventoryStatusEnum | null;
  cLineCode?: string | null;
  planNo?: string | null;
  pieceNos?: string[] | null;
}
export interface QueryDBDto {
  cStore?: string | null;
  cTarStore?: string | null;
  timeRange?: TimeRange;
  dbStatus?: number | null;
  cStatus?: string | null;
  cBusinsNo?: string | null;
  cCarNo?: string | null;
  cPieceNo?: string | null;
}
export interface QueryInOrOutInputDto {
  cStoreCode?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: DecimalRange;
  nWth?: DecimalRange;
  nLen?: DecimalRange;
  dTime?: TimeRange;
}
export interface QueryNotInStorageDto {
  dProTime?: TimeRange;
  cLineCode?: string | null;
  cStoreCode?: string | null;
  cBatchNo?: string | null;
  cStackNo?: string | null;
  cStove?: string | null;
  cPieceNoSlab?: string | null;
  cPieceNo?: string | null;
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: DecimalRange;
  nWth?: DecimalRange;
  nLen?: DecimalRange;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  customerName?: string | null;
  cInboundNo?: string | null;
  nProType?: number | null;
  nStatus?: number | null;
}
export interface RKDBDto {
  cStore?: string | null;
  carNo?: string | null;
  pieceNos?: string[] | null;
}
export interface SlSjInfoDto {
  productUser?: string | null;
  productTime?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  records?: Tyd2000Dto[] | null;
}
export interface StorageDDDto {
  operateUser?: string | null;
  operateTime?: string;
  ddType?: string | null;
  cPieceNo?: string | null;
  cStore?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
}
export interface StorageGPDto {
  operateUser?: string | null;
  operateTime?: string;
  cPieceNo?: string | null;
  cStore?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
}
export interface StorageInOutDto {
  beforeStatus?: InventoryStatusEnum | null;
  afterStatus?: InventoryStatusEnum | null;
  inOutUser?: string | null;
  inOutTime?: string;
  inOutType?: string | null;
  busNo?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  inOutTypeEnum?: StorageInOutTypeEnum;
  pieceNos?: string[] | null;
}
export interface StorageInputDto {
  storeCodeRange?: string[] | null;
  cStoreCode?: string | null;
  cBatchNo?: string | null;
  cStackNo?: string | null;
  cStove?: string | null;
  cPieceNoSlab?: string | null;
  cPieceNo?: string | null;
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: DecimalRange;
  nWth?: DecimalRange;
  nLen?: DecimalRange;
  dProTime?: TimeRange;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  customerName?: string | null;
  cInboundNo?: string | null;
  dInTime?: TimeRange;
  cInUser?: string | null;
}
export interface StoragePosition {
  cStore?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cSgCode?: string | null;
  cCutFlag?: string | null;
  cInboundNo?: string | null;
}
export interface StorageRecordDto {
  operateUser?: string | null;
  operateTime?: string;
  remark?: string | null;
  pieceNos?: string[] | null;
}
export interface StorageSearchInput {
  cStove?: string | null;
  cBatchNo?: string | null;
  cPieceNo?: string | null;
}
export interface StoreMapInputDto {
  roomId?: string | null;
  stackNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cCon?: string | null;
  cOrderNo?: string | null;
  customerName?: string | null;
  thick?: DecimalRange;
  width?: DecimalRange;
  len?: DecimalRange;
}
export interface StoreMapItemDto {
  mapId?: string | null;
  mapName?: string | null;
  templateByte?: string | null;
  tyd1003s?: Tyd1003[] | null;
}
export interface TestUser {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  cDepartment?: string | null;
  cEducation?: string | null;
  cEmail?: string | null;
  cIdCardNo?: string | null;
  lastModifier?: string | null;
  cMaster?: string | null;
  cNation?: string | null;
  cNativePlace?: string | null;
  cPassword?: string | null;
  cPhone?: string | null;
  cPoliticsStatus?: string | null;
  cPosition?: string | null;
  cPost?: string | null;
  cSbcard?: string | null;
  cSex?: string | null;
  cStatus?: string | null;
  cTimestamp?: string;
  cUserName?: string | null;
  cUserType?: UserType;
  createTime?: string | null;
  lastModifyTime?: string | null;
}
export interface TimeRange {
  min?: string | null;
  max?: string | null;
  timeSpan?: string;
  equalsMethod?: EqualsFlag;
}
export interface Tyd1000 {
  selected?: boolean;
  id?: string | null;
  cStoreCode?: string | null;
  cStoreDes?: string | null;
  cStoreType?: string | null;
  cRemark?: string | null;
  cValidFlag?: number;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  nType?: RoomTypeEnum;
}
export interface Tyd1002 {
  selected?: boolean;
  id?: string | null;
  cStoreCode?: string | null;
  listStoreCode?: string[] | null;
  cTemplateData?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cName?: string | null;
}
export interface Tyd1003 {
  selected?: boolean;
  id?: string | null;
  cpId?: string | null;
  cStoreCode?: string | null;
  cArer?: string | null;
  nRow?: number | null;
  nCol?: number | null;
  cRange?: string | null;
  cName?: string | null;
}
export interface Tyd1010 {
  selected?: boolean;
  id?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackType?: number;
  cRemark?: string | null;
  nMaxNum?: number;
  nMaxWgt?: number;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cHallNo?: string | null;
  nRow?: number;
  nCol?: number;
  cArer?: string | null;
  cDefault?: string | null;
}
export interface Tyd1010Dto {
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackType?: number;
  cHallNo?: string | null;
  cArer?: string | null;
  cStackNum?: string | null;
  cSgCode?: string | null;
  cCutFlag?: string | null;
  cInboundNo?: string | null;
  cSpec?: string | null;
}
export interface Tyd1100 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cStoreCode?: string | null;
  cCarNo?: string | null;
}
export interface Tyd2000 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  nProType?: NProTypeEnum;
  cPrintCode?: string | null;
  cLineCode?: string | null;
  cProc?: string | null;
  cMachine?: string | null;
  cPlanNo?: string | null;
  cConNo?: string | null;
  cOrderNo?: string | null;
  cMatCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number;
  nWth?: number | null;
  nLen?: number | null;
  cSpec?: string | null;
  nNum?: number;
  nCalWgt?: number;
  nWgt?: number;
  dProTime?: string;
  cProUser?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  dInTime?: string | null;
  cInUser?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cSourceStoreCode?: string | null;
  cSourceStackNo?: string | null;
  cSourceStackNum?: string | null;
  nStatus?: InventoryStatusEnum;
  nBeforeStatus?: InventoryStatusEnum;
  cIsHot?: YesNo;
  cProRemark?: string | null;
  nCastDivCode?: CastDivEnum;
  cLockedLine?: string | null;
  cLockedPlan?: string | null;
  cMatType?: string | null;
  cProdCode?: string | null;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cBatchNo?: string | null;
  cOrderNoLast?: string | null;
  cDestination?: string | null;
  cHotNo?: string | null;
  cSlabType?: string | null;
  cPieceNoSlab?: string | null;
  qm?: Tyd2000Qm | null;
  info?: Tyd2000Info | null;
  appendices?: Tyd2000Appendices[] | null;
}
export interface Tyd2000Appendices {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cPieceNo?: string | null;
  cFieldCode?: string | null;
  cFiledValue?: string | null;
  main?: Tyd2000 | null;
}
export interface Tyd2000Dto {
  selected?: boolean;
  id?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  nProType?: NProTypeEnum;
  cPrintCode?: string | null;
  cLineCode?: string | null;
  cProc?: string | null;
  cMachine?: string | null;
  cStrandNo?: string | null;
  cPlanId?: string | null;
  cConNo?: string | null;
  cOrderNo?: string | null;
  cMatCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number;
  nWth?: number | null;
  nLen?: number | null;
  cSpec?: string | null;
  nNum?: number;
  nCalWgt?: number;
  nWgt?: number;
  dProTime?: string;
  cProUser?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  dInTime?: string | null;
  cInUser?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cSourceStoreCode?: string | null;
  cSourceStackNo?: string | null;
  cSourceStackNum?: string | null;
  nStatus?: InventoryStatusEnum;
  cIsHot?: YesNoDefault;
  cProRemark?: string | null;
  nCastDivCode?: CastDivEnum;
  cLockedLine?: string | null;
  cLockedPlan?: string | null;
  cMatType?: string | null;
  cProdCode?: string | null;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cBatchNo?: string | null;
  cOrderNoLast?: string | null;
  cDestination?: string | null;
  cHotNo?: string | null;
  cSlabType?: string | null;
  cPieceNoSlab?: string | null;
  nQmStatus?: QMStatuEnum;
  nLockReason?: string | null;
  nQmLevel?: QMLevelEnum;
  cIsSurface?: YesNoDefault;
  cSurfaceResult?: SurFaceResultEnum;
  cSurfaceDefectCode?: string | null;
  cSurfaceDesc?: string | null;
  cSurfaceUser?: string | null;
  dSurfaceTime?: string | null;
  cDetectResultCode?: SurFaceResultEnum;
  cDetectDefectLevel?: string | null;
  cDefectDefectCode?: string | null;
  cDefectDefectMark?: string | null;
  cDefectUser?: string | null;
  dDefectTime?: string | null;
  cComplexDecideCode?: ComplexDecideResult;
  cComplexDesc?: string | null;
  cComplexUser?: string | null;
  dComplexTime?: string | null;
  cQmHandleCode?: QMCZ | null;
  cQmHandleDesc?: string | null;
  cQmHandleUser?: string | null;
  dQmHandleTime?: string | null;
  cSampleLotNo?: string | null;
  cSampleLotNoPre?: string | null;
  cCutFlag?: string | null;
  cInboundNo?: string | null;
  cDelivyAddress?: string | null;
  cWgtToler?: string | null;
  cBilletTypeCode?: string | null;
  cCusName?: string | null;
}
export interface Tyd2000InOutRecord {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cLineCode?: string | null;
  cMatCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number;
  nWth?: number | null;
  nLen?: number | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  cSpec?: string | null;
  nNum?: number;
  nWgt?: number;
  cOrderNo?: string | null;
  nBusinsType?: StorageInOutTypeEnum;
  dTime?: string;
  cUser?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cSourceStoreCode?: string | null;
  cSourceStackNo?: string | null;
  cSourceStackNum?: string | null;
  cType?: string | null;
  cBusNo?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  cIsDisable?: YesNo;
  nProType?: NProTypeEnum;
}
export interface Tyd2000Info {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cPieceNo?: string | null;
  cCutFlag?: string | null;
  cInboundNo?: string | null;
  cDelivyAddress?: string | null;
  cWgtToler?: string | null;
  cBilletTypeCode?: string | null;
  cCusName?: string | null;
  main?: Tyd2000 | null;
}
export interface Tyd2000PdPlan {
  selected?: boolean;
  id?: string | null;
  cLineCode?: string | null;
  cInventoryPlanNo?: string | null;
  dPlanStartTime?: string | null;
  dPlanEndTime?: string | null;
  cPlanStatus?: InventoryPlanStatusEnum;
  cInventoryType?: string | null;
  cPlanDescription?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  inventoryAreas?: Tyd2000PdPlanArea[] | null;
}
export interface Tyd2000PdPlanArea {
  selected?: boolean;
  id?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cInventoryPlanNo?: string | null;
}
export interface Tyd2000PdResult {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cPrintCode?: string | null;
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number | null;
  nWth?: number | null;
  nLen?: number | null;
  nCalWgt?: number | null;
  nWgt?: number | null;
  cInventoryPlanNo?: string | null;
  cPdResult?: PdResultEnum;
}
export interface Tyd2000Qm {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cPieceNo?: string | null;
  nQmStatus?: QMStatuEnum;
  nLockReason?: string | null;
  nQmLevel?: QMLevelEnum;
  cIsSurface?: YesNo;
  cSurfaceResult?: SurFaceResultEnum;
  cSurfaceDefectCode?: string | null;
  cSurfaceDesc?: string | null;
  cSurfaceUser?: string | null;
  dSurfaceTime?: string | null;
  cDetectResultCode?: SurFaceResultEnum;
  cDetectDefectLevel?: string | null;
  cDefectDefectCode?: string | null;
  cDefectDefectMark?: string | null;
  cDefectUser?: string | null;
  dDefectTime?: string | null;
  cComplexDecideCode?: ComplexDecideResult;
  cComplexDesc?: string | null;
  cComplexUser?: string | null;
  dComplexTime?: string | null;
  cQmHandleCode?: QMCZ | null;
  cQmHandleDesc?: string | null;
  cQmHandleUser?: string | null;
  dQmHandleTime?: string | null;
  cSampleLotNo?: string | null;
  cSampleLotNoPre?: string | null;
  cQxDl?: string | null;
  cQxXl?: string | null;
  nSurfaceThick1?: number | null;
  nSurfaceThick2?: number | null;
  nSurfaceThick3?: number | null;
  nSurfaceLen?: number | null;
  cSurfaceDefectPosition?: string | null;
  nSurfaceWidth?: number | null;
  main?: Tyd2000 | null;
}
export interface Tyd2000Record {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cRecordRemark?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cLineCode?: string | null;
  cProc?: string | null;
  cMachine?: string | null;
  cPlanNo?: string | null;
  cConNo?: string | null;
  cOrderNo?: string | null;
  cMatCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number;
  nWth?: number | null;
  nLen?: number | null;
  cSpec?: string | null;
  nNum?: number;
  nCalWgt?: number;
  nWgt?: number;
  dProTime?: string;
  cProUser?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  dInTime?: string | null;
  cInUser?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cSourceStoreCode?: string | null;
  cSourceStackNo?: string | null;
  cSourceStackNum?: string | null;
  nStatus?: InventoryStatusEnum;
  cIsHot?: string | null;
  cProRemark?: string | null;
  nCastDivCode?: CastDivEnum;
  cLockedLine?: string | null;
  cLockedPlan?: string | null;
  cMatType?: string | null;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cBatchNo?: string | null;
  cOrderNoLast?: string | null;
  cDestination?: string | null;
  cHotNo?: string | null;
  cSlabType?: string | null;
  cPieceNoSlab?: string | null;
  cPrintCode?: string | null;
  cProdCode?: string | null;
  nQmStatus?: QMStatuEnum;
  nLockReason?: string | null;
  nQmLevel?: QMLevelEnum;
  cIsSurface?: YesNo;
  cSurfaceResult?: SurFaceResultEnum;
  cSurfaceDefectCode?: string | null;
  cSurfaceDesc?: string | null;
  cSurfaceUser?: string | null;
  dSurfaceTime?: string | null;
  cDetectResultCode?: SurFaceResultEnum;
  cDefectDefectCode?: string | null;
  cDefectDefectMark?: string | null;
  cDefectUser?: string | null;
  dDefectTime?: string | null;
  cComplexDecideCode?: ComplexDecideResult;
  cComplexDesc?: string | null;
  cComplexUser?: string | null;
  dComplexTime?: string | null;
  cQmHandleCode?: QMCZ | null;
  cQmHandleDesc?: string | null;
  cQmHandleUser?: string | null;
  dQmHandleTime?: string | null;
  cSampleLotNo?: string | null;
  cSampleLotNoPre?: string | null;
  cDetectDefectLevel?: string | null;
  cCutFlag?: string | null;
  cInboundNo?: string | null;
  cDelivyAddress?: string | null;
  cWgtToler?: string | null;
  dTimestamp?: string;
  cBilletTypeCode?: string | null;
  cCusName?: string | null;
  nSurfaceThick1?: number | null;
  nSurfaceThick2?: number | null;
  nSurfaceThick3?: number | null;
  nSurfaceLen?: number | null;
  cSurfaceDefectPosition?: string | null;
  nSurfaceWidth?: number | null;
}
export interface Tyd2020 {
  selected?: boolean;
  id?: string | null;
  cBusinsNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cBatchNo?: string | null;
  cMachine?: string | null;
  cOrderNo?: string | null;
  cMatCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number;
  nWth?: number | null;
  nLen?: number | null;
  cSpec?: string | null;
  nNum?: number;
  nCalWgt?: number;
  nWgt?: number;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  dProTime?: string;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTarStoreCode?: string | null;
  cTarStackNo?: string | null;
  cTarStackNum?: string | null;
  nStatus?: Tyd2011StatusEnum;
  cIngotCode?: string | null;
  cReason?: string | null;
  cReqUser?: string | null;
  dReqTime?: string;
  cOutUser?: string | null;
  dOutTime?: string | null;
  cFinishUser?: string | null;
  dFinishTime?: string | null;
  nBusinsType?: Tyd2010TypeEnum;
  cUnacceptBusinsNo?: string | null;
  nUnacceptBusinsType?: number;
  nProType?: number;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  nWgtP?: number;
  nWgtD?: number;
  cpStove?: string | null;
  cSteelType?: string | null;
  nCastDivCode?: number;
  cCarNo?: string | null;
  cInboundNo?: string | null;
  cCutFlag?: string | null;
}
export interface Tyd2020Dto {
  cBusinsNo?: string | null;
  nStatus?: string | null;
  cStoreCode?: string | null;
  dReqTime?: string;
  cReqUser?: string | null;
  nBusinsType?: Tyd2010TypeEnum;
  totalNum?: number;
  totalNWgt?: number;
  totalAccept?: number;
  totalAcceptWgt?: number;
  totalFinishNum?: number;
  totalFinishNWgt?: number;
  cTarStoreCode?: string | null;
  cTarStackNo?: string | null;
  cTarStackNum?: string | null;
  details?: Tyd2020[] | null;
  cCarNo?: string | null;
}
