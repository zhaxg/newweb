/**
 * 碳账户域的接口类型（JNPF 碳资产线上契约的抄录，字段名与线上返回逐一对齐）。
 *
 * 两条与线上不同、且**必须**不同的地方：
 * 1. 线上列表端点返回 `{total, rows, code, msg}`、详情端点返回 `{success, code, msg, data}`，两套信封并存；
 *    本仓库 mock 一律经 `mock/admin/core.ts` 的 `ok()` 发平台信封，`api/_core/request.ts` 解包后
 *    api 层拿到的就是 data 本身——所以这里只声明 data 的形状，不再叠一层信封。
 * 2. **id 一律 string**：线上 id 是 `2095064746036154369` 这类超 2^53 的 JSON 数字，
 *    `JSON.parse` 会取整成 `...400`（JS 双精度只到 9007199254740992），拿取整后的值回查详情接口
 *    会 404「系统异常」（实测）。抓取时从原始响应文本里正则提 id 存字符串，查详情也用同一个字符串。
 */

/** 线上列表端点的 data 形状 */
export interface PageResult<T> {
  total: number;
  rows: T[];
}

/** 三条账户表共有的审计字段（线上都有 creatorUserName / lastModifyUserName） */
interface AccountAudit {
  tenantId: string;
  creatorTime: string;
  creatorUserId: string;
  creatorUserName: string;
  lastModifyTime: string;
  lastModifyUserId: string;
  lastModifyUserName: string;
  deleteMark: number;
}

/** 主账户（/business/carbonAccount/list）→ 主账户/碳排账户/减排账户 三个金额 */
export interface MainAccountRow extends AccountAudit {
  id: string;
  enterId: string;
  enterName: string;
  mainAccountNo: string;
  mainSum: number;
  emissionSum: number;
  reductionSum: number;
  accountStatus: number;
}

/** 碳排账户（/business/carbonAccount/emissionList） */
export interface EmissionAccountRow extends AccountAudit {
  id: string;
  enterId: string;
  enterName: string;
  emissionAccountNo: string;
  emissionSum: number;
  accountStatus: number;
}

/** 减排账户（/business/carbonAccount/reductionList） */
export interface ReductionAccountRow extends AccountAudit {
  id: string;
  enterId: string;
  enterName: string;
  reductionAccountNo: string;
  reductionSum: number;
  accountStatus: number;
}

/**
 * 配额账户 / 交易账户（/business/accountQuotaTrade/{quota,trade}List）——同一张表，靠 accountType 区分（2=配额 1=交易）。
 * 两页列不同但字段同源，列映射（实测页面取值反推，已逐列核对）：
 *   配额页 配额量=buySum / 履约量=sellSum / 核查量=inspectSum / 划出量=markOffSum / 划入量=cutInSum / 余量=tradeSurplusSum
 *   交易页 购入量=buySum / 卖出量=sellSum / 划出量=markOffSum / 划入量=cutInSum / 余量=tradeSurplusSum
 * 恒等式（两行数据都对得上）：tradeSurplusSum = buySum − sellSum − markOffSum + cutInSum
 */
export interface QuotaTradeRow extends AccountAudit {
  id: string;
  enterId: string;
  enterName: string;
  tradeAccountNo: string;
  tradeSurplusSum: number;
  buySum: number;
  sellSum: number;
  markOffSum: number;
  cutInSum: number;
  inspectSum: number;
  accountStatus: number;
  accountType: number;
}

/** 碳排/减排账户的记录子表（/business/accountRecord/{emission,reduction}List）——字段完全同构 */
export interface AccountRecordRow {
  creatorTime: string;
  creatorUserId: string;
  lastModifyTime: string;
  lastModifyUserId: string;
  deleteMark: number;
  id: string;
  serviceId: number;
  accountId: number;
  recordNo: string;
  accountType: string;
  enterId: string;
  enterName: string;
  recordTime: string;
  sourceName: string;
  dataSource: string;
  serviceName: string;
  dataVal: number;
  balanceVal: number;
  serviceType: number;
}

/** 配额/交易账户的记录子表（/business/accountRecord/{quotaAcc,tradeAcc}List）——字段完全同构 */
export interface QuotaTradeRecordRow {
  creatorTime: string;
  creatorUserId: string;
  lastModifyTime: string;
  lastModifyUserId: string;
  deleteMark: number;
  id: string;
  enterName: string;
  recordTime: string;
  /** 变动类型：新增 / 减少 / ... */
  changeFlagName: string;
  dataVal: number;
  balanceVal: number;
  sourceType: number;
  /** 业务来源：资产划拨 / ... */
  sourceTypeName: string;
}

/** 碳排账户记录详情（/business/accountRecord/getEmissionInfo/:id）——详情额外带业务流水号与业务时间 */
export interface EmissionRecordDetail {
  tenantId: string;
  creatorTime: string;
  creatorUserId: string;
  creatorUserName: string;
  lastModifyTime: string;
  lastModifyUserId: string;
  lastModifyUserName: string;
  deleteMark: number;
  enterName: string;
  accountType: string;
  emissionAccountNo: string;
  serviceType: number;
  serviceName: string;
  dataVal: number;
  balanceVal: number;
  recordTime: string;
  recordNo: string;
  /** 业务流水号 */
  serialnumber: string;
  /** 业务时间（业务所属期间，与记账时间 recordTime 不同） */
  dataTime: string;
  serviceFlag: number;
  dataSource: string;
  dataType: string;
  changeDateVal: number;
  id: string;
}

/** 减排账户记录详情（/business/accountRecord/getReductionInfo/:id）：比碳排多 projectName，无 changeDateVal */
export interface ReductionRecordDetail extends Omit<EmissionRecordDetail, "changeDateVal"> {
  projectName: string;
}

/**
 * 配额/交易账户记录详情（/business/accountRecord/getTradeAccInfo/:id）。
 * **同一个端点**按 accountType 返回不同额外字段，故 yearStr（配额）/ tradeTypeName（交易）都写成可选。
 */
export interface TradeAccDetail {
  creatorTime: string;
  creatorUserId: string;
  creatorUserName: string;
  lastModifyTime: string;
  lastModifyUserName: string;
  deleteMark: number;
  enterName: string;
  tradeAccountNo: string;
  changeFlag: number;
  changeName: string;
  dataVal: number;
  sourceTypeName: string;
  sourceType: number;
  balanceVal: number;
  recordTime: string;
  accountTypeName: string;
  transferTypeName: string;
  tradeVal: number;
  tradeTime: string;
  id: string;
  /** 配额账户详情才带 */
  yearStr?: string;
  /** 交易账户详情才带 */
  tradeTypeName?: string;
}

/** 资产划拨提交入参（POST /business/accountQuotaTrade/{quota,trade}Transfer——只插桩，未实现） */
export interface AssetTransferInput {
  enterId: string;
  /** 划出账户号 */
  fromAccountNo: string;
  /** 划入账户号 */
  toAccountNo: string;
  /** 划出量 */
  transferVal: number;
}
