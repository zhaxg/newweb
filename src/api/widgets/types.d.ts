import type {
  DataItemType,
  DataStatusEnum,
  EqualsFlag,
  FormulaStatusEnum,
  RbacRescType,
  ReportShiftType,
  ReportStyle,
  ReportTimeType,
  TransferStatus,
  UserType,
} from "./enums";

export interface DataItem {
  itemCode?: string | null;
  itemName?: string | null;
  description?: string | null;
  itemType?: string | null;
  unit?: string | null;
  itemCalType?: DataItemType;
  source?: string | null;
  sourceDescription?: string | null;
  tableCode?: string | null;
  id?: string | null;
}
export interface DataItemResult {
  dDate?: string;
  cDtTeam?: string | null;
  cDtShift?: string | null;
  nHours?: number | null;
  cItemCode?: string | null;
  nItemVal?: number | null;
}
export interface DataItemResultList {
  timeRange?: TimeRange;
  results?: DataItemResult[] | null;
}
export interface HmxRes {
  selected?: boolean;
  id?: string | null;
  cCode?: string | null;
  creator?: string | null;
  cEnable?: string | null;
  cIcon?: string | null;
  lastModifier?: string | null;
  cName?: string | null;
  cTitle?: string | null;
  cNsCode?: string | null;
  cOrder?: string | null;
  cPid?: string | null;
  cQueryString?: string | null;
  cResPath?: string | null;
  cResSubPath?: string | null;
  cResType?: RbacRescType;
  createTime?: string | null;
  lastModifyTime?: string | null;
  rowVersion?: number;
}
export interface HmxRole {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  cDescription?: string | null;
  lastModifier?: string | null;
  cRoleName?: string | null;
  cState?: string | null;
  createTime?: string | null;
  lastModifyTime?: string | null;
}
export interface HmxRolePermission {
  selected?: boolean;
  id?: string | null;
  cNsCode?: string | null;
  cRescId?: string | null;
  cRescType?: RbacRescType;
  cRoleId?: string | null;
}
export interface HmxUser {
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
export interface LockedItemDto {
  selected?: boolean;
  id?: string | null;
  cCode?: string | null;
  cDesc?: string | null;
  cEnable?: string | null;
  cGroup?: string | null;
  cName?: string | null;
  cOrder?: string | null;
  cPid?: string | null;
  cSw01?: string | null;
  cSw02?: string | null;
  cSw03?: string | null;
  cSw04?: string | null;
  cSw05?: string | null;
  cValue?: string | null;
  expired?: string;
}
export interface LoginDto {
  token?: string | null;
  user?: HmxUser | null;
}
export interface PrintReportServiceDTO {
  isPrint?: boolean;
  printerName?: string | null;
  templateID?: string | null;
  printDTOType?: string | null;
  templateData?: string | null;
  templateType?: number;
}
export interface ReportInput {
  reportCode?: string | null;
  date?: string;
}
export interface ReportResult {
  itemNo?: string | null;
  itemName?: string | null;
  items?: ReportResultItem[] | null;
}
export interface ReportResultItem {
  date?: string;
  dateType?: ReportTimeType;
  dateBeg?: string;
  dateEnd?: string;
  shiftType?: ReportShiftType;
  shift?: string | null;
  group?: string | null;
  value?: number | null;
}
export interface ResetButtonRoleDto {
  buttons?: HmxRes[] | null;
  roles?: HmxRole[] | null;
  permissions?: HmxRolePermission[] | null;
}
export interface TimeRange {
  min?: string | null;
  max?: string | null;
  timeSpan?: string;
  equalsMethod?: EqualsFlag;
}
export interface Tpa1000 {
  selected?: boolean;
  id?: string | null;
  cCode?: string | null;
  cName?: string | null;
  cSimpName?: string | null;
  cSimpCode?: string | null;
  cSimpNo?: string | null;
  cPid?: string | null;
  nLevel?: number;
  cOldCode?: string | null;
  cWorkCenter?: string | null;
  cProc?: string | null;
  cType?: string | null;
  nOrder?: number;
  cLineCode?: string | null;
  cMatType?: string | null;
  cGyydSta?: string | null;
}
export interface Tpf1010 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cFactoryId?: string | null;
  cWorkshopCode?: string | null;
  cItemType?: string | null;
  cItemCode?: string | null;
  cItemName?: string | null;
  cUnit?: string | null;
  cFormula?: string | null;
  cParentItemCode?: string | null;
  nRoundPoint?: number;
  cFormulaDesc?: string | null;
  formulaStatus?: FormulaStatusEnum;
  cRefrenceCodes?: string | null;
  cRefrenceFormula?: string | null;
  formulaErrorMsg?: string | null;
}
export interface Tpf1010Report {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cCode?: string | null;
  cName?: string | null;
  nTimeRange?: ReportTimeType;
  nShiftGroup?: ReportShiftType;
  nStyle?: ReportStyle;
  cDesc?: string | null;
}
export interface Tpf1010ReportItem {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cReportCode?: string | null;
  cItemCode?: string | null;
  nOrder?: number;
}
export interface TsAppVersion {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  nCode?: number;
  cName?: string | null;
  cNote?: string | null;
  nType?: number;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
}
export interface TsPrintTemplate {
  selected?: boolean;
  id?: string | null;
  cDataType?: string | null;
  createTime?: string | null;
  lastModifyTime?: string | null;
  cComments?: string | null;
  nTemplateType?: number;
  cTemplateData?: string | null;
  creator?: string | null;
  lastModifier?: string | null;
}
export interface TsTableConfig {
  selected?: boolean;
  id?: string | null;
  cTbName?: string | null;
  cTbCode?: string | null;
  cRemark?: string | null;
  createTime?: string | null;
  creator?: string | null;
  lastModifyTime?: string | null;
  lastModifier?: string | null;
  cLoaderFullName?: string | null;
  cValidFlag?: string | null;
}
export interface TsTableConfigDto {
  selected?: boolean;
  id?: string | null;
  cTbName?: string | null;
  cTbCode?: string | null;
  cRemark?: string | null;
  createTime?: string | null;
  creator?: string | null;
  lastModifyTime?: string | null;
  lastModifier?: string | null;
  cLoaderFullName?: string | null;
  cValidFlag?: string | null;
  dataStatus?: DataStatusEnum;
}
export interface TsTablePro {
  selected?: boolean;
  id?: string | null;
  cProName?: string | null;
  cProCode?: string | null;
  cTbCode?: string | null;
  cProType?: string | null;
  nSourceType?: number;
  cSourceCode?: string | null;
  cSourceQuerystring?: string | null;
  nSeq?: number | null;
  cRemark?: string | null;
  createTime?: string | null;
  creator?: string | null;
  lastModifyTime?: string | null;
  lastModifier?: string | null;
  cLoaderFullName?: string | null;
  cVisible?: string | null;
  valueColumn?: string | null;
  dataStatus?: DataStatusEnum;
}
export interface TsTableProVal {
  selected?: boolean;
  id?: string | null;
  cTbCode?: string | null;
  cValue0?: string | null;
  cValue1?: string | null;
  cValue2?: string | null;
  cValue3?: string | null;
  cValue4?: string | null;
  cValue5?: string | null;
  cValue6?: string | null;
  cValue7?: string | null;
  cValue8?: string | null;
  cValue9?: string | null;
  cValue10?: string | null;
  cValue11?: string | null;
  cValue12?: string | null;
  cValue13?: string | null;
  cValue14?: string | null;
  cValue15?: string | null;
  cValue16?: string | null;
  cValue17?: string | null;
  cValue18?: string | null;
  cValue19?: string | null;
  cValue20?: string | null;
  cValue21?: string | null;
  cValue22?: string | null;
  cValue23?: string | null;
  cValue24?: string | null;
  cValue25?: string | null;
  cValue26?: string | null;
  cValue27?: string | null;
  cValue28?: string | null;
  cValue29?: string | null;
  cValue30?: string | null;
  cValue31?: string | null;
  cValue32?: string | null;
  cValue33?: string | null;
  cValue34?: string | null;
  cValue35?: string | null;
  cValue36?: string | null;
  cValue37?: string | null;
  cValue38?: string | null;
  cValue39?: string | null;
  cValue40?: string | null;
  cValue41?: string | null;
  cValue42?: string | null;
  cValue43?: string | null;
  cValue44?: string | null;
  cValue45?: string | null;
  cValue46?: string | null;
  cValue47?: string | null;
  cValue48?: string | null;
  cValue49?: string | null;
  cValue50?: string | null;
  cValue51?: string | null;
  cValue52?: string | null;
  cValue53?: string | null;
  cValue54?: string | null;
  cValue55?: string | null;
  cValue56?: string | null;
  cValue57?: string | null;
  cValue58?: string | null;
  cValue59?: string | null;
  cValue60?: string | null;
  cValue61?: string | null;
  cValue62?: string | null;
  cValue63?: string | null;
  cValue64?: string | null;
  cValue65?: string | null;
  cValue66?: string | null;
  cValue67?: string | null;
  cValue68?: string | null;
  cValue69?: string | null;
  cValue70?: string | null;
  createTime?: string | null;
  creator?: string | null;
  lastModifyTime?: string | null;
  lastModifier?: string | null;
  cValue72?: string | null;
  cValue73?: string | null;
  cValue74?: string | null;
  cValue75?: string | null;
  cValue76?: string | null;
  cValue77?: string | null;
  cValue78?: string | null;
  cValue79?: string | null;
  cValue80?: string | null;
  cValue81?: string | null;
  cValue82?: string | null;
  cValue83?: string | null;
  cValue84?: string | null;
  cValue85?: string | null;
  cValue86?: string | null;
  cValue87?: string | null;
  cValue88?: string | null;
  cValue89?: string | null;
  cValue90?: string | null;
  cValue91?: string | null;
  cValue92?: string | null;
  cValue93?: string | null;
  cValue94?: string | null;
  cValue95?: string | null;
  cValue96?: string | null;
  cValue97?: string | null;
  cValue98?: string | null;
  cValue99?: string | null;
  cValue100?: string | null;
  cValue101?: string | null;
  cValue102?: string | null;
  cValue103?: string | null;
  cValue104?: string | null;
  cValue105?: string | null;
  cValue106?: string | null;
  cValue107?: string | null;
  cValue108?: string | null;
  cValue109?: string | null;
  cValue110?: string | null;
  cValue111?: string | null;
  cValue112?: string | null;
  cValue113?: string | null;
  cValue114?: string | null;
  cValue115?: string | null;
  cValue116?: string | null;
  cValue117?: string | null;
  cValue118?: string | null;
  cValue119?: string | null;
  cValue120?: string | null;
  cValue121?: string | null;
  cValue122?: string | null;
  cValue123?: string | null;
  cValue124?: string | null;
  cValue125?: string | null;
  cValue126?: string | null;
  cValue127?: string | null;
  cValue128?: string | null;
  cValue129?: string | null;
  cValue130?: string | null;
  cValue131?: string | null;
  cValue132?: string | null;
  cValue133?: string | null;
  cValue134?: string | null;
  cValue135?: string | null;
  cValue136?: string | null;
  cValue137?: string | null;
  cValue138?: string | null;
  cValue139?: string | null;
  cValue140?: string | null;
  cValue141?: string | null;
  cValue142?: string | null;
  cValue143?: string | null;
  cValue144?: string | null;
  cValue145?: string | null;
  cValue146?: string | null;
  cValue147?: string | null;
  cValue148?: string | null;
  cValue149?: string | null;
  cValue150?: string | null;
  cValue71?: string | null;
}
export interface TsTableProValDto {
  selected?: boolean;
  id?: string | null;
  cTbCode?: string | null;
  cValue0?: string | null;
  cValue1?: string | null;
  cValue2?: string | null;
  cValue3?: string | null;
  cValue4?: string | null;
  cValue5?: string | null;
  cValue6?: string | null;
  cValue7?: string | null;
  cValue8?: string | null;
  cValue9?: string | null;
  cValue10?: string | null;
  cValue11?: string | null;
  cValue12?: string | null;
  cValue13?: string | null;
  cValue14?: string | null;
  cValue15?: string | null;
  cValue16?: string | null;
  cValue17?: string | null;
  cValue18?: string | null;
  cValue19?: string | null;
  cValue20?: string | null;
  cValue21?: string | null;
  cValue22?: string | null;
  cValue23?: string | null;
  cValue24?: string | null;
  cValue25?: string | null;
  cValue26?: string | null;
  cValue27?: string | null;
  cValue28?: string | null;
  cValue29?: string | null;
  cValue30?: string | null;
  cValue31?: string | null;
  cValue32?: string | null;
  cValue33?: string | null;
  cValue34?: string | null;
  cValue35?: string | null;
  cValue36?: string | null;
  cValue37?: string | null;
  cValue38?: string | null;
  cValue39?: string | null;
  cValue40?: string | null;
  cValue41?: string | null;
  cValue42?: string | null;
  cValue43?: string | null;
  cValue44?: string | null;
  cValue45?: string | null;
  cValue46?: string | null;
  cValue47?: string | null;
  cValue48?: string | null;
  cValue49?: string | null;
  cValue50?: string | null;
  cValue51?: string | null;
  cValue52?: string | null;
  cValue53?: string | null;
  cValue54?: string | null;
  cValue55?: string | null;
  cValue56?: string | null;
  cValue57?: string | null;
  cValue58?: string | null;
  cValue59?: string | null;
  cValue60?: string | null;
  cValue61?: string | null;
  cValue62?: string | null;
  cValue63?: string | null;
  cValue64?: string | null;
  cValue65?: string | null;
  cValue66?: string | null;
  cValue67?: string | null;
  cValue68?: string | null;
  cValue69?: string | null;
  cValue70?: string | null;
  createTime?: string | null;
  creator?: string | null;
  lastModifyTime?: string | null;
  lastModifier?: string | null;
  cValue72?: string | null;
  cValue73?: string | null;
  cValue74?: string | null;
  cValue75?: string | null;
  cValue76?: string | null;
  cValue77?: string | null;
  cValue78?: string | null;
  cValue79?: string | null;
  cValue80?: string | null;
  cValue81?: string | null;
  cValue82?: string | null;
  cValue83?: string | null;
  cValue84?: string | null;
  cValue85?: string | null;
  cValue86?: string | null;
  cValue87?: string | null;
  cValue88?: string | null;
  cValue89?: string | null;
  cValue90?: string | null;
  cValue91?: string | null;
  cValue92?: string | null;
  cValue93?: string | null;
  cValue94?: string | null;
  cValue95?: string | null;
  cValue96?: string | null;
  cValue97?: string | null;
  cValue98?: string | null;
  cValue99?: string | null;
  cValue100?: string | null;
  cValue101?: string | null;
  cValue102?: string | null;
  cValue103?: string | null;
  cValue104?: string | null;
  cValue105?: string | null;
  cValue106?: string | null;
  cValue107?: string | null;
  cValue108?: string | null;
  cValue109?: string | null;
  cValue110?: string | null;
  cValue111?: string | null;
  cValue112?: string | null;
  cValue113?: string | null;
  cValue114?: string | null;
  cValue115?: string | null;
  cValue116?: string | null;
  cValue117?: string | null;
  cValue118?: string | null;
  cValue119?: string | null;
  cValue120?: string | null;
  cValue121?: string | null;
  cValue122?: string | null;
  cValue123?: string | null;
  cValue124?: string | null;
  cValue125?: string | null;
  cValue126?: string | null;
  cValue127?: string | null;
  cValue128?: string | null;
  cValue129?: string | null;
  cValue130?: string | null;
  cValue131?: string | null;
  cValue132?: string | null;
  cValue133?: string | null;
  cValue134?: string | null;
  cValue135?: string | null;
  cValue136?: string | null;
  cValue137?: string | null;
  cValue138?: string | null;
  cValue139?: string | null;
  cValue140?: string | null;
  cValue141?: string | null;
  cValue142?: string | null;
  cValue143?: string | null;
  cValue144?: string | null;
  cValue145?: string | null;
  cValue146?: string | null;
  cValue147?: string | null;
  cValue148?: string | null;
  cValue149?: string | null;
  cValue150?: string | null;
  cValue71?: string | null;
  dataStatus?: DataStatusEnum;
}
export interface TsTableSettingDto {
  tableSetting?: TsTableConfig | null;
  tableColumnSettings?: TsTablePro[] | null;
}
export interface TsiCallLog {
  selected?: boolean;
  id?: string | null;
  messageId?: string | null;
  interfaceName?: string | null;
  excuteTime?: string;
  sourceSystem?: string | null;
  targetSystem?: string | null;
  inputJson?: string | null;
  outputJson?: string | null;
  errorInfo?: string | null;
  excuteTypeName?: string | null;
  excuteMethodName?: string | null;
  nStatus?: TransferStatus;
}
export interface TsiConfig {
  selected?: boolean;
  id?: string | null;
  cWsdlUrl?: string | null;
  cEndpointUrl?: string | null;
  cSourceSystem?: string | null;
  cTargetSystem?: string | null;
  cUserName?: string | null;
  cPassword?: string | null;
  cEndpointCode?: string | null;
  cEndpointName?: string | null;
}
export interface ZgyCallLogViewDto {
  requestId?: string | null;
  messageId?: string | null;
  interfaceName?: string | null;
  excuteTime?: string;
  sourceSystem?: string | null;
  targetSystem?: string | null;
  status?: TransferStatus;
  inputJson?: string | null;
  outJson?: string | null;
  errorMsg?: string | null;
}
export interface ZgyInputDto {
  dtBeg?: string;
  dtEnd?: string;
  interfaceName?: string | null;
  keywords?: string | null;
}
