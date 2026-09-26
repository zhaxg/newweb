/**
 * DDH 域后端接口（dDH.Service.*）：枚举 + 类型 + 请求，单文件维护。
 * 原 src/api/ddh 的 enums.ts / types.d.ts / request.ts 合并。
 */

import { requestClient } from "@/api/_core/request";

/* ---------- 枚举 ---------- */

export enum EqualsFlag {
  Default = 1,
  LeftOpen = 2,
  RightOpen = 4,
  Open = 6,
}
export enum Thr3000FurTypeEnum {
  Cold = 0,
  Hot = 1,
  Warm = 2,
}
export enum Thr3000StatusEnum {
  Batch = 0,
  Ensure = 10,
  Issue = 20,
  Begin = 30,
  Finish = 40,
  Close = 70,
}
export enum Thr3010FurStatusEnum {
  Batch = 0,
  Wait = 10,
  RefuseBefore = 30,
  EnterFur = 40,
  Eliminate = 50,
  ExitFur = 60,
  RefuseAfter = 70,
}
export enum Thr3010JqStatusEnum {
  Batch = 0,
  Wait = 10,
  Finish = 20,
}
export enum Thr3010RollStatusEnum {
  Batch = 0,
  Wait = 10,
  FinishRoll = 30,
  Cut = 40,
  Waste = 90,
}
export enum Thr3010StatusEnum {
  ZZ_UNDO = 0,
  ZZ_SENDED_ERROR = 5,
  ZZ_SENDED = 10,
  ZZ_RESERVED_ERROR = 15,
  ZZ_RESERVED_SUCCESS = 20,
  JQ_SENDED = 100,
  JQ_SENDED_ERROR = 115,
  L2_DOWN = 200,
  L2_UP = 210,
  L2_DELETE = 999,
}
export enum TransferStatus {
  Pending = 0,
  TransSuccess = 1,
  TransFailed = 2,
  CommitDone = 3,
}
export enum YesNo {
  N = 0,
  Y = 1,
}

/* ---------- 类型 ---------- */

export interface BxcomEntity {
  name?: string | null;
  typeName?: string | null;
  content?: string | null;
}
export interface DtoThr3010 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cOrderId?: string | null;
  cZpId?: string | null;
  cSlabId?: string | null;
  nL2Status?: Thr3010StatusEnum;
  cPos?: string | null;
  cLineCode?: string | null;
  nOrder?: number | null;
  nFurStatus?: Thr3010FurStatusEnum;
  cFurCode?: string | null;
  cRowNo?: string | null;
  nRollStatus?: Thr3010RollStatusEnum;
  cRollCode?: string | null;
  cFinishEmp?: string | null;
  dRoll?: string | null;
  cRollShift?: string | null;
  cRollGroup?: string | null;
  nJqStatus?: Thr3010JqStatusEnum;
  cJqCode?: string | null;
  nStatus?: Thr3000StatusEnum;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cStove?: string | null;
  cPlateNo?: string | null;
  cPieceNo?: string | null;
  cPrintCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  nQua?: number | null;
  nWgt?: number | null;
  cSgCodePlan?: string | null;
  cSgStdPlan?: string | null;
  cSpecPlan?: string | null;
  nThickPlan?: number | null;
  nWidthPlan?: number | null;
  nLenPlan?: number | null;
  nQuaPlan?: number;
  nWgtPlan?: number;
  nWgtOrder?: number;
  nRateLl?: number;
  nRateSj?: number;
  nFurType?: Thr3000FurTypeEnum;
  nWidthWgt?: number | null;
  cTrimFlag?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cTol?: string | null;
  cOverstepBl?: string | null;
  cInboundNo?: string | null;
  cShape?: string | null;
}
export interface L2ME01 {
  plateNo?: string | null;
  slabNo?: string | null;
  zone?: string | null;
  reason?: string | null;
  actPassNo?: number;
  actThick?: number;
  actWidth?: number;
  actLength?: number;
  passInfos?: L2ME01RollingPassInfo[] | null;
  shiftNo?: string | null;
  shiftGroup?: string | null;
  productTime?: string | null;
  discAuthor?: string | null;
  rmAuthorA?: string | null;
  rmAuthorB?: string | null;
  fmAuthorA?: string | null;
  fmAuthorB?: string | null;
  slabWeight?: number;
  spareC?: L2ME01SpareC[] | null;
  spareN?: L2ME01SpareN[] | null;
}
export interface L2ME01RollingPassInfo {
  passNo?: number;
  temp?: number;
  tempCal?: number;
  thickCal?: number;
  spray?: number;
  turnFlag?: string | null;
  forceCal?: number;
  forceAct?: number;
  torqueCal?: number;
  torqueAct?: number;
  bendForceCal?: number;
  bendForceAct?: number;
  threadSpeed?: number;
  runSpeed?: number;
  entryTemp?: number;
  outSpeed?: number;
  tempCalEn?: number;
  widthEn?: number;
  widthEx?: number;
  lengthEx?: number;
  rollTimestart?: string | null;
  rollTimeStop?: string | null;
  falgN?: number;
  falgC?: string | null;
}
export interface L2ME01SpareC {
  spareC?: string | null;
}
export interface L2ME01SpareN {
  spareN?: number;
}
export interface L2ME02 {
  plateNo?: string | null;
  slabNo?: string | null;
  planNo?: string | null;
  slabStatus?: string | null;
  standNo?: string | null;
  steelGrade?: string | null;
  productCode?: string | null;
  dischargeTime?: string | null;
  rollingTimeStart?: string | null;
  rollingTimeEnd?: string | null;
  crCode?: number;
  totalRollingTime?: number;
  rmPass?: number;
  fmPass?: number;
  rollingStatus?: string | null;
  exitThick?: number;
  exitWidth?: number;
  exitLength?: number;
  operateUserCode?: string | null;
  crownMark?: string | null;
  meaThickWS?: number;
  meaThickDS?: number;
  hsbExitTempAvg?: number;
  hsbExitTempMax?: number;
  rmEntTempCal?: number;
  rmEntTempAvg?: number;
  rmEntTempMin?: number;
  rmEntTempMax?: number;
  rmEntTempDev?: number;
  rmExitTempCal?: number;
  rmExitTempAvg?: number;
  rmExitTempMin?: number;
  rmExitTempMax?: number;
  rmExitTempDev?: number;
  rmEntThick?: number;
  fmEntTempCal?: number;
  fmEntTempAvg?: number;
  fmEntTempMin?: number;
  fmEntTempMax?: number;
  fmEntTempDev?: number;
  fmExitTempCal?: number;
  fmExitTempAvg?: number;
  fmExitTempMin?: number;
  fmExitTempMax?: number;
  fmExitTempDev?: number;
  fmEntThick?: number;
  firstConThick?: number;
  secondConThick?: number;
  firstContTemp?: number;
  secondConTemp?: number;
  passInfos?: L2ME02RollingPassInfo[] | null;
  thickHP?: number;
  broadbef?: number;
  broadaft?: number;
  shiftNo?: string | null;
  shiftGroup?: string | null;
  productTime?: string | null;
  discAuthor?: string | null;
  rmAuthorA?: string | null;
  rmAuthorB?: string | null;
  fmAuthorA?: string | null;
  fmAuthorB?: string | null;
  slabWeight?: number;
  spareC?: L2ME02SpareC[] | null;
  spareN?: L2ME02SpareN[] | null;
}
export interface L2ME02RollingPassInfo {
  passNo?: number;
  temp?: number;
  tempCal?: number;
  thickCal?: number;
  spray?: number;
  turnFlag?: string | null;
  forceCal?: number;
  forceAct?: number;
  torqueCal?: number;
  torqueAct?: number;
  bendForceCal?: number;
  bendForceAct?: number;
  threadSpeed?: number;
  runSpeed?: number;
  entryTemp?: number;
  outSpeed?: number;
  tempCalEn?: number;
  widthEn?: number;
  widthEx?: number;
  lengthEx?: number;
  rollTimestart?: string | null;
  rollTimeStop?: string | null;
  falgN?: number;
  falgC?: string | null;
}
export interface L2ME02SpareC {
  spareC?: string | null;
}
export interface L2ME02SpareN {
  spareN?: number;
}
export interface L2ME05 {
  slabNo?: string | null;
  spare1?: string | null;
  spare2?: number;
}
export interface L2MsgViewDto {
  meL202?: string | null;
  meL8JP401?: string | null;
  meL8JP402?: string[] | null;
}
export interface MEL202 {
  plateNo?: string | null;
  slabNo?: string | null;
  planNo?: string | null;
  slabStatus?: string | null;
  materialStatus?: string | null;
  slabThick?: number;
  slabWidth?: number;
  slabLength?: number;
  slabWeight?: number;
  steelGrade?: string | null;
  productCode?: string | null;
  orderSteelGrade?: string | null;
  furnaceType?: string | null;
  chamferFlag?: string | null;
  dischargeTemp?: number;
  chargeTemp?: number;
  standUseFlag?: number;
  sizingMas?: string | null;
  broadMas?: string | null;
  descalingFlag?: string | null;
  coefficNo?: number;
  targetThick?: number;
  targetWidth?: number;
  targetLength?: number;
  crownFlag?: string | null;
  targetCrown?: number;
  crCode?: number;
  turnMode?: number;
  startRollTemp?: number;
  targetTemp?: number;
  levelFlag?: string | null;
  destinationCode?: string | null;
  cutFlag?: string | null;
  thickControlMode?: string | null;
  carbon?: number;
  silicon?: number;
  manganese?: number;
  phosphorus?: number;
  sulphur?: number;
  oxygenA?: number;
  oxygen?: number;
  aluminiumS?: number;
  aluminium?: number;
  hydrogen?: number;
  chromium?: number;
  niobium?: number;
  vanadium?: number;
  titanium?: number;
  molybdenum?: number;
  nickel?: number;
  tungsten?: number;
  zirconium?: number;
  cobalt?: number;
  rhenium?: number;
  copper?: number;
  boron?: number;
  arsenic?: number;
  bismuth?: number;
  calcium?: number;
  lead?: number;
  magnesium?: number;
  selenium?: number;
  tellurium?: number;
  tin?: number;
  antimony?: number;
  nitrogen?: number;
  lanthanum?: number;
  sodium?: number;
  zinc?: number;
  isWidthTop?: number;
  isLenTop?: number;
  isWidthBot?: number;
  isLenBot?: number;
  isHeight?: number;
  dischgTempPlus?: number;
  dischgTempMinus?: number;
  dischgAvgHot?: number;
  dischgAvgHotUp?: number;
  chgTempUp?: number;
  heatModeCode?: string | null;
  heatTimeMax?: number;
  heatTimeMin?: number;
  soakTimeMax?: number;
  soakTimeMin?: number;
  edgeUse?: string | null;
  edgeUseBroad?: string | null;
  edgeRedBroad?: number;
  edgeUseVertical?: string | null;
  edgeRedVertical?: number;
  targetThickPlus?: number;
  targetThickMinus?: number;
  targetWidthPlus?: number;
  targetWidthMinus?: number;
  mpCode?: string | null;
  coolPattern?: string | null;
  coolRateMax?: number;
  minDraftBefPhase1?: number;
  minDraftBefPhase2?: number;
  minDraftLastPass?: number;
  thickPhase1?: number;
  thickPhase2?: number;
  rollTempPhase1?: number;
  rollTempPhase1Minus?: number;
  rollTempPhase1Plus?: number;
  rollTempPhase2?: number;
  rollTempPhase2Minus?: number;
  rollTempPhase2Plus?: number;
  targetTempMinus?: number;
  targetTempPlus?: number;
  adControlCmd?: string | null;
  accStartWaitTimeLow?: number;
  accStartWaitTimeUp?: number;
  rapidCoolStartTemp?: number;
  rapidCoolStartTempMinus?: number;
  rapidCoolStartTempPlus?: number;
  rapidCoolRate?: number;
  rapidCoolRateMinus?: number;
  rapidCoolRatePlus?: number;
  rapidCoolStopTemp?: number;
  rapidCoolStopTempMinus?: number;
  rapidCoolStopTempPlus?: number;
  slowCool1StartTemp?: number;
  slowCool1StartTempMinus?: number;
  slowCool1StartTempPlus?: number;
  slowCool1Rate?: number;
  slowCool1RateMinus?: number;
  slowCool1RatePlus?: number;
  slowCool1StopTemp?: number;
  slowCool1StopTempMinus?: number;
  slowCool1StopTempPlus?: number;
  slowCool2StartTemp?: number;
  slowCool2StartTempMinus?: number;
  slowCool2StartTempPlus?: number;
  slowCool2Rate?: number;
  slowCool2RateMinus?: number;
  slowCool2RatePlus?: number;
  slowCool2StopTemp?: number;
  slowCool2StopTempMinus?: number;
  slowCool2StopTempPlus?: number;
  childPlateNo?: MessageMEL202ChildPlateNo[] | null;
  childPlateLength?: MessageMEL202ChildPlateLength[] | null;
  spare1?: MessageMEL202Spare[] | null;
  spare2?: MessageMEL202Spare2[] | null;
}
export interface MEL203 {
  rollNo?: string | null;
  standNo?: string | null;
  rollType?: string | null;
  rollPos?: string | null;
  rollClass?: string | null;
  quality?: string | null;
  rollAssemblyNo?: string | null;
  rollDiameter?: number;
  rollClassNo?: string | null;
  shapeCoeff1?: number;
  shapeCoeff2?: number;
  shapeCoeff3?: number;
  shapeCoeff4?: number;
  shapeCoeff5?: number;
  shapeCoeff6?: number;
  shapeCoeff7?: number;
  shapeCoeff8?: number;
  shapeCoeff9?: number;
  shapeIndex1?: number;
  shapeIndex2?: number;
  shapeIndex3?: number;
  shapeIndex4?: number;
  shapeIndex5?: number;
  shapeIndex6?: number;
  shapeIndex7?: number;
  shapeIndex8?: number;
  shapeIndex9?: number;
  underlay?: number;
  themCoeff?: number;
  yongModCore?: number;
  yongModShell?: number;
  rollTemp?: number;
  neckDiameter?: number;
  neckLength?: number;
  rollLength?: number;
  coreDiameter?: number;
  hardness?: number;
  crown?: number;
  crownMin?: number;
  crownMax?: number;
}
export interface MEL204 {
  slabNo?: string | null;
  type?: string | null;
  spare1?: string | null;
  spare2?: string | null;
}
export interface MEL206 {
  slabNo?: string | null;
  reason?: number;
}
export interface MEL8JP401 {
  slabNo?: string | null;
  plateNo?: string | null;
  plateNoL3?: string | null;
  sendType?: string | null;
  loadPos?: string | null;
  plateThk?: number;
  plateWth?: number;
  plateLth?: number;
  plateWgt?: number;
  slabStlGrd?: string | null;
  slabSpeciWgt?: number;
  c?: number;
  si?: number;
  mn?: number;
  p?: number;
  s?: number;
  cu?: number;
  ni?: number;
  cr?: number;
  mo?: number;
  v?: number;
  nb?: number;
  alSol?: number;
  ti?: number;
  bTotal?: number;
  ca?: number;
  o?: number;
  n?: number;
  h?: number;
  co?: number;
  sn?: number;
  zr?: number;
  mg?: number;
  rollThk?: number;
  rollWth?: number;
  rollLth?: number;
  rollWgt?: number;
  fmRollEndTemp?: number;
  lpCd?: string | null;
  tensileStrengthMax?: number;
  tensileStrengthMin?: number;
  cutHeadLthMin?: number;
  cutTailLthMin?: number;
  ordNum?: number;
  asg?: string | null;
  productNum?: number;
  subPlates?: SubPlateInfo[] | null;
  mplateNum?: number;
  roughCutPositions?: RoughCutInfo[] | null;
  surplusPlateSubIdOs?: string | null;
  surplusPlateSubIdDs?: string | null;
  shearInstrCs?: string | null;
  shearInstrDss?: string | null;
  shearInstrDs?: string | null;
  sampleHave?: string | null;
  sampleDiv?: string | null;
  sampleCode?: string | null;
  sampleStamp?: string | null;
  samplePos?: string | null;
  sampleLenHead?: number;
  sampleLenTail?: number;
  sampleLenHeadB?: number;
  sampleLenTailB?: number;
  coolFlag?: string | null;
  utFlag?: string | null;
  heatFlag?: string | null;
  uoFl?: string | null;
  spare1?: string | null;
  spare2?: string | null;
}
export interface MEL8JP402 {
  slabNo?: string | null;
  plateNo?: string | null;
  orderPlateId?: string | null;
  productIdxCode?: number;
  orderNo?: string | null;
  customerCd?: string | null;
  productTypeCd?: string | null;
  stlGrdCd?: string | null;
  stlGrd?: string | null;
  cutEdgeFl?: string | null;
  productThk?: number;
  productAimWth?: number;
  productOrdWth?: number;
  productAimLth?: number;
  productOrdLth?: number;
  thkTolerMin?: number;
  thkTolerMax?: number;
  thkAdd?: number;
  wthTolerMin?: number;
  wthTolerMax?: number;
  lthTolerMin?: number;
  lthTolerMax?: number;
  randWthType?: string | null;
  randWthMin?: number;
  randWthMax?: number;
  randLthType?: string | null;
  randLthMin?: number;
  randLthMax?: number;
  productWeight?: number;
  wgtLoterMin?: number;
  wgtLoterMax?: number;
  planSclPrcCd?: string | null;
  ustInspectionCode?: string | null;
  printFl?: string | null;
  printRotationT?: string | null;
  printRotationB?: string | null;
  printPosWth?: number;
  printPosLth?: number;
  printSpaceLth?: number;
  basicPrintContent1?: string | null;
  basicPrintContent2?: string | null;
  basicPrintContent3?: string | null;
  basicPrintContent4?: string | null;
  basicPrintContent5?: string | null;
  basicPrintContent6?: string | null;
  basicPrintContent7?: string | null;
  basicPrintContent8?: string | null;
  basicPrintPlateNoPos?: string | null;
  basicPrintWgtPos?: string | null;
  basicPrintWthPos?: string | null;
  basicPrintLthPos?: string | null;
  punchFl?: string | null;
  punchPos?: string | null;
  punchPosWth?: number;
  punchPosLth?: number;
  punchContent1?: string | null;
  punchContent2?: string | null;
  punchContent3?: string | null;
  punchPlateNoPos?: string | null;
  punchWthPos?: string | null;
  punchLthPos?: string | null;
  edgePrintPos?: string | null;
  edgePrintMode?: string | null;
  edgePrintContent1?: string | null;
  edgePrintContent2?: string | null;
  edgePrintPlateNoPos?: string | null;
  edgePrintWthPos?: string | null;
  edgePrintLthPos?: string | null;
  condModeCd?: string | null;
  deliveryDate?: string | null;
  bestSideIn?: string | null;
  normalizedYieldStress?: number;
  cplFl?: string | null;
  wplFl?: string | null;
  wplTempMax?: number;
  wplTempMin?: number;
  spare1?: string | null;
  spare2?: string | null;
}
export interface MEL8JP403 {
  plateNo?: string | null;
  uploadDiv?: string | null;
  posCode?: string | null;
}
export interface MessageCutHeart {
  length?: number;
  messageID?: string | null;
  sendDate?: string | null;
  sendTime?: string | null;
  senderCode?: string | null;
  receiverCode?: string | null;
  functionCode?: string | null;
}
export interface MessageMEL202ChildPlateLength {
  childPlateLength?: number;
}
export interface MessageMEL202ChildPlateNo {
  childPlateNo?: string | null;
}
export interface MessageMEL202Spare {
  spare1?: string | null;
}
export interface MessageMEL202Spare2 {
  spare2?: number;
}
export interface MessageRollHeart {
  length?: number;
  messageID?: string | null;
  sendDate?: string | null;
  sendTime?: string | null;
  senderCode?: string | null;
  receiverCode?: string | null;
  functionCode?: string | null;
}
export interface RoughCutInfo {
  posOs?: number;
  posDs?: number;
}
export interface SubPlateInfo {
  subId?: string | null;
  productIdxCode?: number;
  assortPos?: number;
  subIdL3?: string | null;
}
export interface Thr3010 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cOrderId?: string | null;
  cZpId?: string | null;
  cSlabId?: string | null;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cPlateNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nThick?: number;
  nWidth?: number | null;
  nLen?: number | null;
  nNum?: number | null;
  nWgt?: number | null;
  nOrder?: number | null;
  nFurStatus?: Thr3010FurStatusEnum;
  cFurCode?: string | null;
  nRollStatus?: Thr3010RollStatusEnum;
  cRollCode?: string | null;
  cFinishEmp?: string | null;
  dRoll?: string | null;
  cRollShift?: string | null;
  cRollGroup?: string | null;
  nJqStatus?: Thr3010JqStatusEnum;
  cJqCode?: string | null;
  nStatus?: Thr3010StatusEnum;
  cRemark?: string | null;
  cRowNo?: string | null;
  cPrintCode?: string | null;
  cPos?: string | null;
  nWdRl?: number | null;
  cShiftRl?: string | null;
  cGroupRl?: string | null;
  dRl?: string | null;
  nWdCl?: number | null;
  cShiftCl?: string | null;
  cGroupCl?: string | null;
  dCl?: string | null;
  zh?: Thr3010Zh | null;
  sgd?: Thr3010Sgd | null;
  fur?: Thr3010Fur | null;
  roll?: Thr3010Roll | null;
  yc?: Thr3010Yc | null;
  yjz?: Thr3010Yjz | null;
  rjz?: Thr3010Yjz | null;
  ckl?: Thr3010Ckl | null;
}
export interface Thr3010Ckl {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  slabNo?: string | null;
  steelGrade?: string | null;
  thick?: number | null;
  width?: number | null;
  length?: number | null;
  coolMode?: number | null;
  startCoolTime?: string | null;
  finishCoolTime?: string | null;
  rollAveTemp?: number | null;
  rollMaxTemp?: number | null;
  rollMinTemp?: number | null;
  entryAveTemp?: number | null;
  entryMaxTemp?: number | null;
  entryMinTemp?: number | null;
  targetFinishTemp?: number | null;
  finishAveTemp?: number | null;
  finishMaxTemp?: number | null;
  finishMinTemp?: number | null;
  scanAveTemp?: number | null;
  scanMaxTemp?: number | null;
  scanMinTemp?: number | null;
  coolingRate?: number | null;
  fluxA?: number | null;
  fluxB?: number | null;
  actFluxA?: number | null;
  actFluxB?: number | null;
  ratioA?: number | null;
  ratioB?: number | null;
  actRatioA?: number | null;
  actRatioB?: number | null;
  speed?: number | null;
  actSpeed?: number | null;
  aspd?: number | null;
  actAspd?: number | null;
  num?: number | null;
  uppipeFlow1?: number | null;
  uppipeFlow2?: number | null;
  uppipeFlow3?: number | null;
  uppipeFlow4?: number | null;
  uppipeFlow5?: number | null;
  uppipeFlow6?: number | null;
  uppipeFlow7?: number | null;
  uppipeFlow8?: number | null;
  uppipeFlow9?: number | null;
  uppipeFlow10?: number | null;
  uppipeFlow11?: number | null;
  uppipeFlow12?: number | null;
  uppipeFlow13?: number | null;
  uppipeFlow14?: number | null;
  uppipeFlow15?: number | null;
  uppipeFlow16?: number | null;
  uppipeFlow17?: number | null;
  uppipeFlow18?: number | null;
  uppipeFlow19?: number | null;
  uppipeFlow20?: number | null;
  uppipeFlow21?: number | null;
  uppipeFlow22?: number | null;
  uppipeFlow23?: number | null;
  uppipeFlow24?: number | null;
  uppipeFlow25?: number | null;
  uppipeFlow26?: number | null;
  uppipeFlow27?: number | null;
  uppipeFlow28?: number | null;
  botpipeFlow1?: number | null;
  botpipeFlow2?: number | null;
  botpipeFlow3?: number | null;
  botpipeFlow4?: number | null;
  botpipeFlow5?: number | null;
  botpipeFlow6?: number | null;
  botpipeFlow7?: number | null;
  botpipeFlow8?: number | null;
  botpipeFlow9?: number | null;
  botpipeFlow10?: number | null;
  botpipeFlow11?: number | null;
  botpipeFlow12?: number | null;
  botpipeFlow13?: number | null;
  botpipeFlow14?: number | null;
  botpipeFlow15?: number | null;
  botpipeFlow16?: number | null;
  botpipeFlow17?: number | null;
  botpipeFlow18?: number | null;
  botpipeFlow19?: number | null;
  botpipeFlow20?: number | null;
  botpipeFlow21?: number | null;
  botpipeFlow22?: number | null;
  botpipeFlow23?: number | null;
  botpipeFlow24?: number | null;
  botpipeFlow25?: number | null;
  botpipeFlow26?: number | null;
  botpipeFlow27?: number | null;
  botpipeFlow28?: number | null;
  sideCavityFlow1?: number | null;
  sideCavityFlow2?: number | null;
  sideCavityFlow3?: number | null;
  sideCavityFlow4?: number | null;
  sideCavityFlow5?: number | null;
  sideCavityFlow6?: number | null;
  sideCavityFlow7?: number | null;
  sideCavityFlow8?: number | null;
  sideCavityFlow9?: number | null;
  sideCavityFlow10?: number | null;
  sideSpary?: string | null;
  midSpary?: string | null;
  htsis?: number | null;
  headUpLength?: number | null;
  headBotLength?: number | null;
  headUpCoef?: number | null;
  headBotCoef?: number | null;
  tailUpLength?: number | null;
  tailBotLength?: number | null;
  tailUpCoef?: number | null;
  tailBotCoef?: number | null;
  prh1?: number | null;
  prh2?: number | null;
  prh3?: number | null;
  prh4?: number | null;
  prh5?: number | null;
  prh6?: number | null;
  prh7?: number | null;
  prh8?: number | null;
  prh9?: number | null;
  prh10?: number | null;
  elpBcd1?: number | null;
  elpBcd2?: number | null;
  elpBcd3?: number | null;
  tempWater?: number | null;
  pressWater?: number | null;
  main?: Thr3010 | null;
}
export interface Thr3010Fur {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  nRowNo?: number | null;
  nLenZh?: number | null;
  nWgtZh?: number | null;
  slabFurTime?: string | null;
  slabFurBefTemp?: number | null;
  furNo?: string | null;
  furType?: string | null;
  inFurnaceShiftNo?: string | null;
  inFurnaceShiftGroup?: string | null;
  outFurnaceShiftNo?: string | null;
  outFurnaceShiftGroup?: string | null;
  tapSlabTempAve?: number | null;
  tapSlabTempSrfc?: number | null;
  tapSlabTempCt?: number | null;
  outTime?: string | null;
  outTempAvg?: number | null;
  inFurnaceTime?: number | null;
  preHtTempAve?: number | null;
  preHtHotAve?: number | null;
  preHtTempSrf?: number | null;
  preHtTempCt?: number | null;
  preHtAveTemp?: number | null;
  preHtFurPerd?: number | null;
  ht1SlabTempAve?: number | null;
  ht1SlabHotAve?: number | null;
  ht1SlabTempSrfc?: number | null;
  ht1SlabTempCt?: number | null;
  ht1AveTemp?: number | null;
  ht1InFurPerd?: number | null;
  ht2SlabTempAve?: number | null;
  ht2SlabHotAve?: number | null;
  ht2SlabTempSrfc?: number | null;
  ht2SlabTempCt?: number | null;
  ht2AveTemp?: number | null;
  ht2InFurPerd?: number | null;
  eqSlabTempAve?: number | null;
  eqSlabHotAve?: number | null;
  eqSlabTempSrfc?: number | null;
  eqSlabTempCt?: number | null;
  eqAveTemp?: number | null;
  eqInFurPerd?: number | null;
  main?: Thr3010 | null;
}
export interface Thr3010Roll {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  slabStatus?: string | null;
  standNo?: string | null;
  steelGrade?: string | null;
  productCode?: string | null;
  dischargeTime?: string | null;
  rollingTimeStart?: string | null;
  rollingTimeEnd?: string | null;
  crCode?: number | null;
  totalRollingTime?: number | null;
  rmPass?: number | null;
  fmPass?: number | null;
  rollingStatus?: string | null;
  exitThick?: number | null;
  exitWidth?: number | null;
  exitLength?: number | null;
  operateUserCode?: string | null;
  crownMark?: string | null;
  meaThickWs?: number | null;
  meaThickDs?: number | null;
  hsbExitTempAvg?: number | null;
  hsbExitTempMax?: number | null;
  rmEntTempCal?: number | null;
  rmEntTempAvg?: number | null;
  rmEntTempMin?: number | null;
  rmEntTempMax?: number | null;
  rmEntTempDev?: number | null;
  rmExitTempCal?: number | null;
  rmExitTempAvg?: number | null;
  rmExitTempMin?: number | null;
  rmExitTempMax?: number | null;
  rmExitTempDev?: number | null;
  rmEntThick?: number | null;
  fmEntTempCal?: number | null;
  fmEntTempAvg?: number | null;
  fmEntTempMin?: number | null;
  fmEntTempMax?: number | null;
  fmEntTempDev?: number | null;
  fmExitTempCal?: number | null;
  fmExitTempAvg?: number | null;
  fmExitTempMin?: number | null;
  fmExitTempMax?: number | null;
  fmExitTempDev?: number | null;
  fmEntThick?: number | null;
  firstConThick?: number | null;
  secondConThick?: number | null;
  firstContTemp?: number | null;
  secondConTemp?: number | null;
  thickHp?: number | null;
  broadbef?: number | null;
  broadaft?: number | null;
  shiftNo?: string | null;
  shiftGroup?: string | null;
  productTime?: string | null;
  author?: string | null;
  slabWeight?: number | null;
  main?: Thr3010 | null;
  details?: Thr3010RollDetail[] | null;
}
export interface Thr3010RollDetail {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  cRollId?: string | null;
  passNo?: number | null;
  temp?: number | null;
  tempCal?: number | null;
  thickCal?: number | null;
  spray?: number | null;
  turnFlag?: string | null;
  forceCal?: number | null;
  forceAct?: number | null;
  torqueCal?: number | null;
  torqueAct?: number | null;
  bendForceCal?: number | null;
  bendForceAct?: number | null;
  threadSpeed?: number | null;
  runSpeed?: number | null;
  entryTemp?: number | null;
  outSpeed?: number | null;
  tempCalEn?: number | null;
  widthEn?: number | null;
  widthEx?: number | null;
  lengthEx?: number | null;
  rollTimeStart?: string | null;
  rollTimeStop?: string | null;
  falgN?: number | null;
  falgC?: string | null;
  main?: Thr3010Roll | null;
}
export interface Thr3010Sgd {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  plateNo?: string | null;
  slabNo?: string | null;
  tableNo?: string | null;
  main?: Thr3010 | null;
}
export interface Thr3010Yc {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  plateNo?: string | null;
  slabNo?: string | null;
  zone?: string | null;
  reason?: string | null;
  actPassNo?: number | null;
  actThick?: number | null;
  actWidth?: number | null;
  actLength?: number | null;
  shiftNo?: string | null;
  shiftGroup?: string | null;
  productTime?: string | null;
  author?: string | null;
  slabWeight?: number | null;
  main?: Thr3010 | null;
}
export interface Thr3010Yjz {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  slabNo?: string | null;
  totalPass?: number | null;
  currPass?: number | null;
  entryTime?: string | null;
  endTime?: string | null;
  entryTemp?: number | null;
  levelerSpeed?: number | null;
  bitSpeed?: number | null;
  entryGap?: number | null;
  exitGap?: number | null;
  entrySideRollGap?: number | null;
  exitSideRollGap?: number | null;
  tilt1?: number | null;
  tilt2?: number | null;
  l2Force?: number | null;
  bendPosition?: number | null;
  torqueMotor?: number | null;
  emptyFlag?: number | null;
  spare?: number | null;
  main?: Thr3010 | null;
}
export interface Thr3010Zh {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  slabNo?: string | null;
  spare1?: string | null;
  spare2?: number | null;
  main?: Thr3010 | null;
}
export interface TiBxcomMessage {
  selected?: boolean;
  id?: string | null;
  cMessageId?: string | null;
  cContent?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cBusNo?: string | null;
  nStatus?: TransferStatus;
  cMsg?: string | null;
  cSourceSystem?: string | null;
  cTargetSystem?: string | null;
  cReadFlag?: YesNo;
  cReadMsg?: string | null;
}
export interface TimeRange {
  min?: string | null;
  max?: string | null;
  timeSpan?: string;
  equalsMethod?: EqualsFlag;
}
export interface TqmGCLen {
  type?: string | null;
  thicklow?: number;
  thickup?: number;
  lenlow?: number;
  lenhup?: number;
  divlow?: number;
  divup?: number;
  moddescr?: string | null;
  tableCode?: string | null;
  id?: string | null;
}
export interface TqmGCThick {
  type?: string | null;
  thicklow?: number;
  thickup?: number;
  widtlow?: number;
  widthup?: number;
  divlow?: number;
  divup?: number;
  moddescr?: string | null;
  tableCode?: string | null;
  id?: string | null;
}
export interface TqmGCWth {
  type?: string | null;
  thicklow?: number;
  thickup?: number;
  widtlow?: number;
  widthup?: number;
  divlow?: number;
  divup?: number;
  moddescr?: string | null;
  tableCode?: string | null;
  id?: string | null;
}
export interface Xcom8JP403Input {
  pieceNo?: string | null;
  upOrDown?: string | null;
  position?: string | null;
}

/* ---------- 请求 ---------- */

export const bxcomMessageApi = {
  consumeMsg(data?: string[]) {
    return requestClient.request<any>("/dDH.Service.Interface.Services.BX/bxcomMessage/consumeMsg", {
      method: "post",
      data,
    });
  },
  saveMsg(data?: TiBxcomMessage) {
    return requestClient.request<any>("/dDH.Service.Interface.Services.BX/bxcomMessage/saveMsg", {
      method: "post",
      data,
    });
  },
  sendMEL02(slabNo?: string) {
    return requestClient.request<any>("/dDH.Service.Interface.Services.BX/bxcomMessage/sendMEL02", {
      method: "post",
      params: { slabNo },
    });
  },
  sendMEL204(slabNo?: string) {
    return requestClient.request<any>("/dDH.Service.Interface.Services.BX/bxcomMessage/sendMEL204", {
      method: "post",
      params: { slabNo },
    });
  },
  send8JP401_2(slabNo?: string) {
    return requestClient.request<any>("/dDH.Service.Interface.Services.BX/bxcomMessage/send8JP401_2", {
      method: "post",
      params: { slabNo },
    });
  },
  send8JP403(data?: Xcom8JP403Input) {
    return requestClient.request<any>("/dDH.Service.Interface.Services.BX/bxcomMessage/send8JP403", {
      method: "post",
      data,
    });
  },
};

export const bxcomTestApi = {
  getAllMessages(msgType?: string, data?: TimeRange) {
    return requestClient.request<TiBxcomMessage[]>("/dDH.Service.Interface.Services.BX/bxcomTest/getAllMessages", {
      method: "post",
      params: { msgType },
      data,
    });
  },
  getMessageById(id?: string) {
    return requestClient.request<TiBxcomMessage>("/dDH.Service.Interface.Services.BX/bxcomTest/getMessageById", {
      method: "post",
      params: { id },
    });
  },
  validL2Message(tmp2020Id?: string) {
    return requestClient.request<L2MsgViewDto>("/dDH.Service.Interface.Services.BX/bxcomTest/validL2Message", {
      method: "post",
      params: { tmp2020Id },
    });
  },
  getInterface() {
    return requestClient.request<BxcomEntity[]>("/dDH.Service.Interface.Services.BX/bxcomTest/getInterface", {
      method: "post",
    });
  },
  getRollHeart() {
    return requestClient.request<MessageRollHeart>("/dDH.Service.Interface.Services.BX/bxcomTest/getRollHeart", {
      method: "post",
    });
  },
  getCutHeart() {
    return requestClient.request<MessageCutHeart>("/dDH.Service.Interface.Services.BX/bxcomTest/getCutHeart", {
      method: "post",
    });
  },
  sendToBxcom(data?: BxcomEntity) {
    return requestClient.request<any>("/dDH.Service.Interface.Services.BX/bxcomTest/sendToBxcom", {
      method: "post",
      data,
    });
  },
  receivedByBxcom(data?: BxcomEntity) {
    return requestClient.request<any>("/dDH.Service.Interface.Services.BX/bxcomTest/receivedByBxcom", {
      method: "post",
      data,
    });
  },
  demo_ReceivedByBxcom(data?: DtoThr3010) {
    return requestClient.request<any>("/dDH.Service.Interface.Services.BX/bxcomTest/demo_ReceivedByBxcom", {
      method: "post",
      data,
    });
  },
  getMEL202() {
    return requestClient.request<MEL202>("/dDH.Service.Interface.Services.BX/bxcomTest/getMEL202", {
      method: "post",
    });
  },
  getMEL203() {
    return requestClient.request<MEL203>("/dDH.Service.Interface.Services.BX/bxcomTest/getMEL203", {
      method: "post",
    });
  },
  getMEL204() {
    return requestClient.request<MEL204>("/dDH.Service.Interface.Services.BX/bxcomTest/getMEL204", {
      method: "post",
    });
  },
  getMEL206() {
    return requestClient.request<MEL206>("/dDH.Service.Interface.Services.BX/bxcomTest/getMEL206", {
      method: "post",
    });
  },
  getMEL8JP401() {
    return requestClient.request<MEL8JP401>("/dDH.Service.Interface.Services.BX/bxcomTest/getMEL8JP401", {
      method: "post",
    });
  },
  getMEL8JP402() {
    return requestClient.request<MEL8JP402>("/dDH.Service.Interface.Services.BX/bxcomTest/getMEL8JP402", {
      method: "post",
    });
  },
  getMEL8JP403() {
    return requestClient.request<MEL8JP403>("/dDH.Service.Interface.Services.BX/bxcomTest/getMEL8JP403", {
      method: "post",
    });
  },
  getL2ME01() {
    return requestClient.request<L2ME01>("/dDH.Service.Interface.Services.BX/bxcomTest/getL2ME01", {
      method: "post",
    });
  },
  getL2ME02() {
    return requestClient.request<L2ME02>("/dDH.Service.Interface.Services.BX/bxcomTest/getL2ME02", {
      method: "post",
    });
  },
  getL2ME05() {
    return requestClient.request<L2ME05>("/dDH.Service.Interface.Services.BX/bxcomTest/getL2ME05", {
      method: "post",
    });
  },
};

export const gCApi = {
  getThick(type?: string, thick?: number, width?: number) {
    return requestClient.request<TqmGCThick>("/dDH.Service.Interface.Services.BX/gC/getThick", {
      method: "post",
      params: { type, thick, width },
    });
  },
  getWth(type?: string, thick?: number, width?: number) {
    return requestClient.request<TqmGCWth>("/dDH.Service.Interface.Services.BX/gC/getWth", {
      method: "post",
      params: { type, thick, width },
    });
  },
  getLen(type?: string, thick?: number, len?: number) {
    return requestClient.request<TqmGCLen>("/dDH.Service.Interface.Services.BX/gC/getLen", {
      method: "post",
      params: { type, thick, len },
    });
  },
};

export const quYangApi = {
  needQY(data?: Thr3010) {
    return requestClient.request<boolean>("/dDH.Service.Impl.XCom/quYang/needQY", {
      method: "post",
      data,
    });
  },
};

/* ---------- 表配置（Hmx 表格配置服务，FrmBxGYImport/基表视图共用） ---------- */
import type { TsTableProVal, DataStatusEnum } from "./sqm.swagger";

export interface TsTableConfig {
  id?: string | null;
  cTbName?: string | null;
  cTbCode?: string | null;
  cRemark?: string | null;
  createTime?: string | null;
  creator?: string | null;
  lastModifyTime?: string | null;
  lastModifier?: string | null;
  cLoaderFullName?: string | null;
  cValidFlag?: number | null;
}
export interface TsTablePro {
  id?: string | null;
  cProName?: string | null;
  cProCode?: string | null;
  cTbCode?: string | null;
  cProType?: string | null;
  nSourceType?: number | null;
  cSourceCode?: string | null;
  cSourceQuerystring?: string | null;
  nSeq?: number | null;
  cRemark?: string | null;
  cLoaderFullName?: string | null;
  cVisible?: string | null;
  createTime?: string | null;
  creator?: string | null;
  lastModifyTime?: string | null;
  lastModifier?: string | null;
}
export interface TsTableSettingDto {
  tableSetting?: TsTableConfig | null;
  tableColumnSettings?: TsTablePro[] | null;
}
export interface TsTableProValDto extends TsTableProVal {
  dataStatus?: DataStatusEnum;
}

export const tableConfigApi = {
  queryTableConfig(tableCode?: string) {
    return requestClient.request<TsTableSettingDto>("/hmx.Service.Widgets.Services/tableConfig/queryTableConfig", {
      method: "post",
      params: { tableCode },
    });
  },
  queryData(tableCode?: string, arrIdxNo?: string[]) {
    return requestClient.request<TsTableProValDto[]>("/hmx.Service.Widgets.Services/tableConfig/queryData", {
      method: "post",
      params: { tableCode },
      data: arrIdxNo,
    });
  },
  save(data?: TsTableProValDto[]) {
    return requestClient.request<any>("/hmx.Service.Widgets.Services/tableConfig/save", {
      method: "post",
      data,
    });
  },
  removeAllAndSave(data?: TsTableProVal[]) {
    return requestClient.request<any>("/hmx.Service.Widgets.Services/tableConfig/removeAllAndSave", {
      method: "post",
      data,
    });
  },
};
