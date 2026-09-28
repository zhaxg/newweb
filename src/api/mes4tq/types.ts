/**
 * 铁区MES（tqmes）演示域的数据契约。规格书：`temp/tqmes.md` 附录 B2「核心实体接口」。
 *
 * **契约来源**：附录 B2 的接口逐字来自客户真实系统的表结构（注释里保留了 `C_XXX`/`N_XXX`
 * 原始列名）。这里**照抄字段名、不照抄前缀**——`C_MTRL_ID` → `materialId`，因为前端页面
 * 读的是语义名，而原始列名保留在注释里给接真实后端时对字段用。**这是本域最重要的一条**：
 * 接后端时能一眼看出「这个字段对应哪一列」，比字段名漂亮重要。
 *
 * 三处对规格书 B2 的**有意偏离**，都在下面就地写明理由：
 * 1. `Silo` 在 B2 里定义了两次、形状完全不同（工厂基础版 vs 料仓管理版），同名不同形会让
 *    两份数据在类型上互相污染。拆成 `ProdUnitSilo`（挂在机组下的料仓）与 `SiloBin`（料仓台账）。
 * 2. B2 的 `ProductionOutput` 写的是「继承投料字段+产出特有」，TypeScript 里用 `extends` 表达
 *    （照抄一份字段会在两个类型间产生漂移）。
 * 3. `TechIndicator`（TP0001 技经指标）与 `TechIndicatorPlan`（TMP_2000 技经指标月计划）
 *    在 B2 里是两个东西，名字太像，前者改名 `TechIndicatorDef`（指标定义）以示区分。
 *
 * ⚠️ **本域只做查询**，所以这里没有任何 `SaveXxxDto` / `XxxForm` 之类的写入载荷类型。
 * 补写操作时照能源域的 `src/api/energy/types.ts` 加。
 */

/* ══════════════════════════════════════════════════════════════════════════
   0. 通用信封
   ══════════════════════════════════════════════════════════════════════════ */

/** 列表端点统一回 `{total, rows}`（`POST /tqmes/<实体>/listPage`） */
export interface PageResult<T> {
  total: number;
  rows: T[];
}

/**
 * 动作端点的返回。
 *
 * **业务拒绝不走 HTTP 错误**：mock 与真实后端对「该批次已封堆」这类结果回的是
 * `HTTP 200 + 信封成功 + data:{ok:false,msg}`，拦截层不会弹它，必须由页面弹。
 * 本域目前只有「导出」用得上它，形状照平台其他域。
 */
export interface ActionResult<T = unknown> {
  ok: boolean;
  msg?: string;
  data?: T;
}

/** 人名候选（取样人、判定人、操作人、签发人共用同一批人——见 seed 的 `PEOPLE`） */
export interface Person {
  id: string;
  name: string;
  /** 岗位，如「高炉工长」「质量主管」 */
  post: string;
  /** 所属工序/部门 */
  dept: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   1. 工厂基础（TG0001 产线维护 / TG0003 料仓管理）
   ══════════════════════════════════════════════════════════════════════════ */

/** 工厂：FG01 烧结厂 / FG02 球团厂 / FG03 炼铁厂 */
export interface Factory {
  id: string;
  name: string;
  /** 该厂下的车间，树的一级 */
  workshopCount: number;
}

/** 车间：CJ01 烧结车间 / CJ02 球团车间 / CJ03 高炉车间… */
export interface Workshop {
  id: string;
  name: string;
  factoryId: string;
}

/** 产线/机组：SJ01-01（1#烧结机）、GL01-01（1#高炉）、QT01-01（1#竖炉）… */
export interface ProductionUnit {
  id: string;
  name: string;
  workshopId: string;
  /** B2 的 `type` 字段：烧结机/高炉/竖炉/混匀线/配煤仓 */
  type: string;
  /** 设计产能，单位随 `type`（万 t/年） */
  capacity?: number;
  /** 关键规格（`360m²`、`1800m³`）——大屏与利用系数计算要它 */
  spec?: string;
  /** 投产日期 */
  onlineDate?: string;
  enabled?: boolean;
  remark?: string;
}

/**
 * 挂在机组下的料仓（B2 的第一个 `Silo`）。
 *
 * **与 `SiloBin` 的区别**：这个是「机组视角的料仓当前状态」——带 `currentMaterial`/`currentStock`，
 * 用于 TG0001 产线树的展开、TG0003 的料仓卡片墙、TW 各工序的料仓变料页。
 * `SiloBin` 是「料仓台账主数据」——带工厂/车间/库房/库位编码，用于 TG0003 的列表。
 * 两者是同一批料仓的两种投影，mock 侧由同一份种子派生（见 `data/model.ts` 的 `silosOf`）。
 */
export interface ProdUnitSilo {
  id: string;
  name: string;
  unitId: string;
  /** 当前料种（品名） */
  currentMaterial?: string;
  /** 当前存量 kg */
  currentStock?: number;
  /** 料位百分比 0-100，配 `hiLimit`/`loLimit` 画双端条 */
  levelPct?: number;
  hiLimit?: number;
  loLimit?: number;
  /** 最大容量 kg */
  capacity?: number;
}

/**
 * 料仓台账（B2 的第二个 `Silo`，真实表 TPA_1040）。
 * 字段名照 `C_XXX` 逐条映射，见文件头说明。
 */
export interface SiloBin {
  id: string;
  /** C_FACTORY_CODE 工厂代码 */
  factoryCode?: string;
  /** C_WORKSHOP_CODE 车间代码 */
  workshopCode?: string;
  /** C_WORKSTATION_CODE 机组代码 */
  workstationCode?: string;
  /** C_BIN_CODE 料仓号 */
  binCode: string;
  /** C_BIN_NAME 料仓名称 */
  binName?: string;
  /** N_CAPACITY 最大容量 */
  capacity?: number;
  /** D_FEED_TIME 最近一次变料时间 */
  feedTime?: string;
  /** C_STOREROOM_CODE 库房代码 */
  storeroomCode?: string;
  /** C_STOREPOSITION_CODE 库位编码 */
  storepositionCode?: string;
  /** N_MTRL_CONSUME_TYPE 物料指定规则（1=指定物料 2=指定品种 3=自由） */
  mtrlConsumeType?: number;
  /** C_PRODUCT 品种 */
  product?: string;
  /** C_MATRL_ID 物料编码 */
  matrlId?: string;
  /** C_BATCH_NO 批次号 */
  batchNo?: string;
  /** C_SUPP_ID 供应商 */
  suppId?: string;
}

/** 料仓变料实绩（TPA_1041）——TW 各工序「料仓变料」页与 TW0701 共用同一张表 */
export interface BinChangeRecord {
  id: string;
  /** C_BIN_CODE 料仓号 */
  binCode: string;
  /** D_FEED_TIME 变料时间 */
  feedTime: string;
  storeroomCode?: string;
  storepositionCode?: string;
  mtrlConsumeType?: number;
  product?: string;
  matrlId?: string;
  batchNo?: string;
  suppId?: string;
  /** NotColumn 混料配比 % */
  nPercent?: number;
  /** 所属工序（raw/coke/pellet/sinter/lime/blast）——B2 没有这一列，是本域为「按工序筛」加的 */
  process?: string;
  operator?: string;
  remark?: string;
}

/** 烧结料仓槽存管理（TPA_1043） */
export interface TankStock {
  id: string;
  /** D_DTATE_TIME 日期 */
  date?: string;
  workshopId?: string;
  workstationId?: string;
  storepositionCode?: string;
  /** C_DT_SHIFT 生产班次 A/B/C */
  shift?: string;
  product?: string;
  matrlId?: string;
  suppId?: string;
  batchNo?: string;
  /** N_TANK_STOCK 槽存量(吨) */
  tankStock?: number;
}

/* ══════════════════════════════════════════════════════════════════════════
   2. 物料与库存（TG0002 物料管理 / TS0001-TS0004）
   ══════════════════════════════════════════════════════════════════════════ */

/** 物料主数据：料号与 ERP-MR 一致 */
export interface Material {
  id: string;
  /** 料号（与 id 同值，给「按料号筛」的输入框一个显式字段） */
  code?: string;
  /** 品名 */
  name: string;
  /** 物料组：矿石/煤炭/焦炭/辅料/熔剂/燃料 */
  group: string;
  /** 原料/辅料/燃料/产品/副产品/回收品 */
  type: string;
  /** 计量单位 t/kg */
  unit: string;
  /** 成本单价 元/t */
  costPrice: number;
  /** 是否参与配料计算 */
  enabled?: boolean;
  remark?: string;
}

/** 库房（TS0001 左树的上一级） */
export interface StoreRoom {
  id: string;
  name: string;
  /** 所属车间/区域 */
  workshopId?: string;
  remark?: string;
}

/** 库位（TS0001 左树叶子） */
export interface StoreLocation {
  id: string;
  name: string;
  storeRoomCode: string;
  /** 最大堆存量 t */
  capacity?: number;
  /** 当前堆存量 t */
  stock?: number;
  remark?: string;
}

/** 库存记录（真实表 TMW_1000） */
export interface StockRecord {
  id: string;
  /** C_MTRL_NO 物料编码 */
  materialId: string;
  /** C_BATCH_NO 批次号 */
  batchNo: string;
  /** C_SPEC 规格描述 */
  spec?: string;
  /** C_SUPPLIER_DESC 供应商 */
  supplierDesc?: string;
  /** C_CARGO_NAME 货名 */
  cargoName?: string;
  /** C_UNIT 重量单位 */
  unit: string;
  /** N_WGT 干基重量 kg */
  dryWeight: number;
  /** N_H2O_WGT 湿基重量 kg */
  wetWeight: number;
  /** N_H2O 水分 % */
  h2o?: number;
  /** C_STORE_ROOM_CODE 库房代码 */
  storeRoomCode: string;
  /** C_STORE_POSITION_CODE 库位代码 */
  storePositionCode: string;
  /** D_TIME_STAMP 时间戳（乐观锁） */
  timeStamp?: string;
  creator: string;
  createTime: string;
  lastModifier?: string;
  lastModifyTime?: string;
}

/** 收发存汇总（TS0002 的「实物库存」视图，按料号+库位聚合） */
export interface StockBalance {
  id: string;
  materialId: string;
  storeRoomCode: string;
  storePositionCode: string;
  dryWeight: number;
  wetWeight: number;
  /** 期初/入库/出库三项，收发存表用 */
  beginWeight?: number;
  inWeight?: number;
  outWeight?: number;
}

/** 出入库流水（TS0003） */
export interface StockTxn {
  id: string;
  materialId: string;
  batchNo?: string;
  /** 入库/出库/移库/盘盈亏 */
  direction: string;
  /** 移动类型（对应 `C_MOVE_TYPE`） */
  moveType?: string;
  dryWeight: number;
  wetWeight?: number;
  h2o?: number;
  storeRoomCode: string;
  storePositionCode?: string;
  /** 关联单据号 */
  docNo?: string;
  txnTime: string;
  operator?: string;
  remark?: string;
}

/** 料场料条/堆（TS0004 料场可视化） */
export interface YardPile {
  id: string;
  /** 料条号 */
  stripNo: string;
  /** 堆号 */
  pileNo: string;
  materialId: string;
  /** 堆存量 t */
  qty: number;
  /** 堆料起点/终点（料条上的位置，用于画条带） */
  beginPos?: number;
  endPos?: number;
  /** 堆料时间 */
  buildTime?: string;
  /** 状态：堆料中/静置/取料中/已取空 */
  status: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   3. 计划（TP0001-TP0004）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 技经指标**定义**（TP0001 维护的那张表）。
 * 名字与 `TechIndicatorPlan` 刻意拉开：这个回答「有哪些指标、口径是什么」，
 * 那个回答「某年某月某机组的指标值是多少」。
 */
export interface TechIndicatorDef {
  id: string;
  /** 指标名：利用系数/焦比/煤比/作业率/合格品率… */
  indicatorName: string;
  unit: string;
  /** 计算公式（展示用，如 `产量(t)/烧结面积(m²)/日历时间(h)`） */
  formula?: string;
  /** 统计粒度：班/日/月 */
  granularity: string;
  /** 适用工序 */
  process?: string;
  enabled?: boolean;
  remark?: string;
}

/** 技经指标月计划（真实表 TMP_2000） */
export interface TechIndicatorPlan {
  id: string;
  /** N_YEAR 年 */
  year: number;
  /** N_MONTH 月 */
  month: number;
  /** C_WORKSHOP 车间 */
  workshop?: string;
  /** C_WORKSTATION 机组 */
  workstation?: string;
  /** C_PLAN_ITEM 计划项 */
  planItem?: string;
  /** C_UNIT 单位 */
  unit?: string;
  /** C_PLAN_TYPE 计划类型 */
  planType?: string;
  /** C_VALUE 计划量（字符串，可转 decimal——照真实表，前端展示层再转数） */
  value?: string;
  /** 实际值（NotColumn，由 `data/model.ts` 派生） */
  actualValue?: number;
  /** 完成率 % */
  rate?: number;
  /**
   * 达标口径：`higher` 越大越好 / `lower` 越小越好。
   *
   * **这一列是本页最容易做错的地方**：利用系数是越大越好（105% 超产），
   * 焦比煤比单耗是越小越好（92% 省了）。一律按「≥100% 达标」
   * 会把省下来的煤标成红的。它由**指标名**决定（是指标的性质，不随行变），
   * 所以住在数据层而不是每页各算一次。
   */
  direction?: "higher" | "lower";
}

/** 月生产计划（TP0002）。铁水→烧结→球团→原料 倒推的产物 */
export interface MonthlyPlan {
  id: string;
  /** YYYYMM */
  period: string;
  unitId: string;
  /** 铁水/烧结矿/球团矿/混匀料 */
  productType: string;
  /** 目标产量 t */
  targetOutput: number;
  /** 目标质量 TFe/SiO2/CaO… */
  targetQuality?: Record<string, number>;
  /** 目标成本 元/t */
  targetCost?: number;
  /** 燃料消耗计划 */
  fuelPlan?: Record<string, number>;
  /** 草稿/已审核/已下达/执行中/已完成 */
  status: string;
  /** 倒推层级：1 铁水 2 烧结/球团 3 原料（TP0002 的倒推顺序） */
  level?: number;
  /** 上游计划 id（倒推链上的父节点） */
  parentId?: string;
  remark?: string;
}

/** 需求计划（TP0003）：由产量计划倒推原料需求量 */
export interface DemandPlan {
  id: string;
  monthlyPlanId?: string;
  materialId: string;
  requiredQty: number;
  availableStock: number;
  inTransit: number;
  /** 净需求 = 需求量 - 可用库存 - 在途 */
  netDemand: number;
  /** 草稿/已提交/已确认 */
  status: string;
  period?: string;
  remark?: string;
}

/** 采购计划（TP0004）：需求 + 库存 + 在途 → 采购建议 */
export interface PurchasePlan {
  id: string;
  materialId: string;
  demandPlanId?: string;
  suggestQty: number;
  /** 建议到货日期 */
  expectDate?: string;
  /** 供应商建议 */
  suppId?: string;
  suppName?: string;
  /** 单价 元/t */
  price?: number;
  amount?: number;
  status: string;
  remark?: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   4. 配料（TB0001-TB0004，真实表 TPM_2010）
   ══════════════════════════════════════════════════════════════════════════ */

/** 配料计划主表（TPM_2010） */
export interface BatchingPlan {
  id: string;
  /** C_PLAN_DESC 版本描述 */
  planDesc?: string;
  /** C_PLAN_TYPE 配料类型 */
  planType?: string;
  /** C_PLAN_TIME 编制时间 */
  planTime?: string;
  /** C_MIX_CENETER 配料工位（注入参数决定工序：混匀/烧结/球团/高炉） */
  mixCenter: string;
  /** D_EXCUTE_TIME 最后执行时间 */
  executeTime?: string;
  /** N_DAY 预计生产天数 */
  days?: number;
  /** N_PO_WGT 预计生产量 */
  plannedOutput?: number;
  /** C_BATCH_NO 批次号 */
  batchNo?: string;
  /** C_STATUS 数据状态 */
  status?: string;
  /** C_WORK_STATION_CODE 机组编码 */
  unitId: string;
  /** N_STATUS 计划状态（0草稿/1已审核/2执行中/3已完成） */
  nStatus?: number;
  /** 配比明细 */
  ratio: BatchingItem[];
  /** 目标质量 */
  targetQuality?: Record<string, number>;
  /** 预测成本 元/t */
  predictedCost?: number;
  /** 所属工序（raw/sinter/pellet/blast）——决定它出现在 TB 的哪一页 */
  process?: string;
  /** — NotColumn 计算字段 — */
  /** 混匀平铺总量 */
  totalWgt?: number;
  /** 烧结接收量 */
  usedWgt?: number;
  /** 剩余量 = totalWgt - usedWgt */
  surWgt?: number;
  remark?: string;
}

/** 配比明细行 */
export interface BatchingItem {
  id?: string;
  materialId: string;
  materialName: string;
  /** 配比 % */
  ratioPct: number;
  /** 目标重量 t */
  targetWeight: number;
  /** 实际重量 t（执行后回填） */
  actualWeight?: number;
  /** 偏差 %（NotColumn，由 model 派生） */
  deviation?: number;
  /** 料仓 */
  siloId?: string;
}

/** 配料执行实绩 */
export interface BatchingActual {
  id: string;
  batchingPlanId: string;
  unitId: string;
  /** A/B/C */
  shiftCode: string;
  startTime: string;
  endTime: string;
  process?: string;
  items: BatchingActualItem[];
  qualityResult?: Record<string, number>;
}

export interface BatchingActualItem {
  materialId: string;
  planWeight: number;
  actualWeight: number;
  /** 偏差 = actual - plan */
  deviation: number;
  siloId: string;
}

/** 混匀料堆实绩（TPP_1010） */
export interface BlendPile {
  id: string;
  /** D_BEG_TIME 开铺时间 */
  begTime: string;
  /** D_END_TIME 封堆时间（未封堆 = 空） */
  endTime?: string;
  /** C_WORKSTATION_ID 机组 */
  unitId: string;
  /** C_PILE_NO 料堆号 */
  pileNo: string;
  /** C_STORE_POSITION_ID 库位 */
  storePositionId: string;
  /** C_PLAN_ID 配料计划 */
  planId?: string;
  /** N_IS_VIRTUAL 是否直供烧结虚拟堆 */
  isVirtual: boolean;
  /** D_D202_BEG_TIME D202 皮带开始时间 */
  d202BegTime?: string;
  /** D_D202_END_TIME D202 皮带结束时间 */
  d202EndTime?: string;
  /** C_YH_PLJH 预混小料配料计划 */
  yhPljh?: string;
  /** N_FLAG_DEL 作废标记 */
  flagDel?: boolean;
  /** 堆存量 t（NotColumn，由 model 按投料累计派生） */
  qty?: number;
  /** 状态：堆料中/静置/取料中/已取空（由 beg/endTime 与取料实绩派生） */
  status?: string;
  remark?: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   5. 质量（TQ0001-TQ0003）
   ══════════════════════════════════════════════════════════════════════════ */

/** 物料检验标准（TQA_2010） */
export interface QualityStandard {
  id: string;
  /** C_PRO_CODE 品名代码 */
  proCode?: string;
  /** C_STD_CODE 标准代码 */
  stdCode?: string;
  /** C_INSPEC_CODE 检验项目编码 */
  inspecCode?: string;
  /** C_INSPEC_NAME 检验项目名称 */
  inspecName?: string;
  unit?: string;
  /** N_ORDER 排序 */
  nOrder?: number;
  /** N_MAX 上限 */
  max?: number;
  /** N_MIN 下限 */
  min?: number;
  /** N_DECIMAL_DIGIT 小数位数 */
  decimalDigit?: number;
  /** C_ROUND_RULE 修约规则 */
  roundRule?: string;
  /** N_INTEGER_DIGIT 整数位数 */
  integerDigit?: number;
  /** C_SECTION 开闭区间 */
  section?: string;
  /** C_WORKSHOP_CODE 车间代码 */
  workshopCode?: string;
  /** 品名（NotColumn，展示用） */
  proName?: string;
}

/** 检验结果明细项 */
export interface QualityResult {
  itemId: string;
  /** 检验项目名 */
  itemName?: string;
  value: number;
  unit: string;
  method: string;
  operator: string;
}

/** 检验批次（TQ0003 查询层，来自 TQL_1000 + 检化验系统） */
export interface QualityBatch {
  id: string;
  materialId?: string;
  productName?: string;
  /** 进厂/工序产出/铁水 */
  source: string;
  batchNo: string;
  sampleTime: string;
  items: QualityResult[];
  /** 综合判定：合格/不合格/待判定 */
  overallGrade: string;
  /** 待检/检验中/已判定/已报出 */
  status: string;
  /** 工序 */
  process?: string;
  /** 铁次号（铁水专属） */
  feBatchNo?: string;
}

/** 检验委托（TQL_1000） */
export interface InspectionOrder {
  id: string;
  /** C_ETST_NO 委托单号 */
  testNo: string;
  /** C_ETST_STATUS 委托状态 */
  status?: string;
  prcsCode?: string;
  prcsName?: string;
  proCode?: string;
  proName?: string;
  mtalCode?: string;
  mtalName?: string;
  smpaddrCode?: string;
  smpaddrName?: string;
  /** D_SMP_TIME 取样时间 */
  smpTime?: string;
  /** N_SMP_CNT 样本数量 */
  smpCnt?: number;
  /** N_SERIAL_NUM 流水号 */
  serialNum?: number;
  batchNo?: string;
  receiveUser?: string;
  receiveTime?: string;
  /** C_IS_REPORT 是否报出 */
  isReport?: string;
  inspTypeCode?: string;
  /** 检验类别：抽检/常规 */
  inspTypeName?: string;
  mtalGroupCode?: string;
  smpUser?: string;
  sendUser?: string;
  sendTime?: string;
  /** C_FE_BATCH_NO 铁次号（铁水专属） */
  feBatchNo?: string;
  judgeUser?: string;
  judgeTime?: string;
  /** C_JUDGE_RESULT 最终判定结果 */
  judgeResult?: string;
  judgeRemark?: string;
  /** C_BC 班次 */
  bc?: string;
  /** C_BZ 班组 */
  bz?: string;
  planId?: string;
}

/** 铁水自动报出设置（TQL_4000） */
export interface IronAutoReport {
  id: string;
  inspecCode?: string;
  inspecName: string;
  /** C_INSPEC_CHE 化学名称 */
  inspecChe?: string;
  /** C_EX_MAX 自动报出最大值 */
  exMax?: number;
  /** C_EX_MIN 自动报出最小值 */
  exMin?: number;
  enable?: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   6. 工序实绩（TW 全组，TPP_2100/2200/1050/3000/2900/2201）
   ══════════════════════════════════════════════════════════════════════════ */

/** 投料实绩（TPP_2100） */
export interface ProductionInput {
  id: string;
  workshopId: string;
  unitId: string;
  storepositionCode?: string;
  materialId: string;
  /** C_LB_ID 料仓/皮带/罐 */
  lbId?: string;
  moveType?: string;
  batchNo?: string;
  stoveNo?: string;
  /** N_DATA_TYPE 0=人工 1=采集 2=调账 */
  dataType: number;
  /** N_DATA_STATUS 0=正常 1=作废 2=已上传 */
  dataStatus: number;
  /** N_BIZ_STATE 0=未记账 1=已记账 */
  bizState?: number;
  /** N_WGT_WET 湿重 kg */
  wetWeight: number;
  /** N_WGT 干重 kg */
  dryWeight: number;
  /** N_H2O 水份 % */
  h2o: number;
  /** N_ROW_TYPE 1=实重 2=理重 */
  weighMode?: number;
  /** D_DT_ROW 投料时间 */
  inputTime: string;
  /** D_DT_DATE 生产日期 */
  prodDate: string;
  /** C_DT_TEAM 生产班组 */
  team: string;
  /** C_DT_SHIFT 生产班次 */
  shift: string;
  docNo?: string;
  docType?: string;
  costCenterId?: string;
  productId?: string;
  /** N_GL_BATCH 高炉料批数 */
  glBatch?: number;
  pljhId?: string;
  suppId?: string;
  /** 所属工序（raw/coke/pellet/sinter/lime/blast）——本域为「按工序筛」加 */
  process?: string;
  remark?: string;
}

/**
 * 产出实绩（TPP_2200）。
 *
 * B2 写的是「继承投料字段 + 产出特有」，这里用 `extends` 表达——照抄一份字段
 * 会在两个类型间产生漂移（改一处忘另一处），而这两张表在后端确实是同族。
 * 只有三处不同：`stoveNo` 变必填、时间字段改名 `outputTime`、多出铁水专属字段。
 */
export interface ProductionOutput extends Omit<ProductionInput, "inputTime" | "stoveNo"> {
  /** C_STOVE_NO 炉号（产出必填） */
  stoveNo: string;
  /** D_DT_ROW 收料时间 */
  outputTime: string;
  /** C_CTK 出铁口（高炉专属） */
  ctk?: string;
  /** N_DIRECTION 铁水去向 0=炼钢 1=铸铁 */
  direction?: number;
  /** C_TEST_NO 检验委托单号 */
  testNo?: string;
  /** N_WGT_SPLIT 拆分重量（跨班拆产） */
  splitWeight?: number;
  splitDate?: string;
  splitTeam?: string;
  splitShift?: string;
}

/** 机组停机记录（TPP_1050）——TW 各工序开停机页共用 */
export interface DowntimeRecord {
  id: string;
  /** D_BEG_TIME */
  startTime: string;
  /** D_END_TIME */
  endTime: string;
  /** C_WORKSTATION_ID 机组 */
  unitId: string;
  /** C_TYPE A=计划停机 B=异常停机 C=其他 */
  type: string;
  /** C_REASON A=内部原因 B=外部原因 C=其他 */
  reason: string;
  /** 停机时长（分钟，NotColumn 由 model 派生） */
  minutes?: number;
  process?: string;
  remark?: string;
  /** C_STATUS Y=有效 N=作废 */
  status: string;
}

/** 供料作业记录（TW0105：向烧结/球团/高炉供料的品种/数量/时间） */
export interface SupplyRecord {
  id: string;
  /** 供出方工序（原料） */
  process?: string;
  /** 供料日期 */
  date: string;
  /** A/B/C */
  shift: string;
  /** 供出机组（HY01-01/02） */
  fromUnit: string;
  /**
   * 接收对象：机组名（`1#烧结机` / `3#高炉`）——**存名不存 id**。
   * A3 把这一页描述成「向烧结/球团/高炉供料」，客户读的是厂里人说的话；
   * 存 `GL01-01` 让页面再去查一次，等于把一个该省的翻译摊在两处。
   */
  toUnit: string;
  materialId: string;
  materialName: string;
  qty: number;
  unit: string;
  beginTime: string;
  endTime: string;
  operator?: string;
  /** 完成/中断 */
  status?: string;
  remark?: string;
}

/** 工艺采集数据实绩（TPP_3000）——TW 投料/收料实绩的采集侧来源 */
export interface ProcessCollectData {
  id: string;
  /** C_LB_ID 料仓/皮带/罐 */
  lbId?: string;
  /** C_WORKSTATION_ID 作业站点 */
  workstationId?: string;
  storeRoomCode?: string;
  storePositionCode?: string;
  matrlId?: string;
  batchNo?: string;
  /** N_H2O 水份 */
  h2o: number;
  unit?: string;
  /** D_BEGIN_DATE 开始时间 */
  beginDate: string;
  /** D_END_DATE 结束时间 */
  endDate: string;
  /** N_WGT 累计量 kg */
  wgt: number;
  /** N_TSL_SIGN 投收料类型（0=投料 1=收料） */
  tslSign: number;
  /** N_STATUS 0=未使用 1=已使用 2=不参与计算 */
  status?: number;
  mtrlConsumeType?: number;
  product?: string;
  /** C_HY_BATCH 混匀堆号 */
  hyBatch?: string;
  suppId?: string;
  process?: string;
}

/** 投收料质量明细（TPP_2900） */
export interface InputOutputQuality {
  id: string;
  /** C_BUSINESS_ID 业务ID（关联 TPP_2100/2200） */
  businessId: string;
  /** C_TEST_ITEM 检验项目 */
  testItem: string;
  /** C_VALUE 检验结果（字符串，可转 decimal——照真实表） */
  value?: string;
  /** 关联的投/收料时间（NotColumn） */
  time?: string;
}

/**
 * 工序运行参数（TW 各工序「运行参数」页 / L5 实时监控盘）。
 *
 * B2 里**没有**这个实体——它是本域为 L5 版式新造的，因为规格书 A3 列了
 * 六个「运行参数」页（烧结/球团/石灰/焦化/高炉/喷煤），却没有给统一的数据形状。
 * 造一个通用的「参数快照」实体，各工序用它承载自己的参数集（`params` 是自由字典，
 * 键名与阈值住在 `data/model.ts` 的 `PROCESS_PARAMS`，那里才是唯一真源）。
 */
export interface ProcessParam {
  id: string;
  unitId: string;
  /** 机组名（冗余，监控盘一屏一个机组，省一次翻译） */
  unitName?: string;
  process: string;
  /** 采集时刻 */
  clock: string;
  /** 参数键 → 值。键的中文名、单位、上下限在 `model.PROCESS_PARAMS` */
  params: Record<string, number>;
  /** 当前报警的参数键（由 model 按上下限判定，页面只读不算） */
  alarms?: string[];
  /** 运行/停机/检修 */
  status?: string;
}

/** 推焦作业实绩（TW0203）——B2 无此实体，字段取自规格书 A3 的 TWJ003 描述 */
export interface PushCokeRecord {
  id: string;
  /** 炉号 */
  ovenNo: string;
  /** 推焦时间 */
  pushTime: string;
  /** 推焦电流 A */
  current: number;
  /** 计划结焦时间 h */
  planCokingTime?: number;
  /** 实际结焦时间 h */
  actualCokingTime?: number;
  /** 系数 K1（推焦计划系数）/K2（推焦执行系数）/K3（推焦操作系数） */
  k1?: number;
  k2?: number;
  k3?: number;
  shift?: string;
  team?: string;
  process?: string;
  remark?: string;
}

/**
 * 焦炭质量与产量（TW0205）。
 *
 * A3 原文「水分/Vdaf/Ad/M40/M10+批次产量」——五个指标**逐字照抄**，
 * 它们是焦炭质量的行业通用口径，客户会照着这几列去核对：
 * - **M40** 摩氏强度（>40mm 粒级的百分比）——越大越好；
 * - **M10** 磨损强度（<10mm 粒级的百分比）——越小越好；
 * - **Vdaf** 干基挥发分 / **Ad** 干基灰分——越低说明焦得越透；
 * - **水分 H2O** 影响入炉干焦量。
 *
 * 单独开一张表而不是并进 `QualityBatch`：那张是「检验批次」的通用形状，
 * 而这一页是**按天汇总的日均值 + 当日产量**，两者粒度就不同
 * （一批焦炭一个值 vs 一天一个均值），硬合会让两边的口径都说不清。
 */
export interface CokeQualityRecord {
  id: string;
  /** 日期 */
  date: string;
  /** 焦炉号 */
  ovenNo: string;
  /** 当日产量 t */
  output: number;
  /** 合格品产量 t（`output` 的子集，合格品率 = 合格/总） */
  qualified: number;
  /** 水分 % */
  h2o: number;
  /** 干基挥发分 % */
  vdaf: number;
  /** 干基灰分 % */
  ad: number;
  /** 摩氏强度 %（越大越好） */
  m40: number;
  /** 磨损强度 %（越小越好） */
  m10: number;
  /** 硫分 % */
  s: number;
  /** 与计划比的偏差（M40 高于计划为正，M10 反之） */
  m40Delta?: number;
  shift?: string;
  process?: string;
  remark?: string;
}

/** 余热回收监控（TW0406） */
export interface WasteHeatRecord {
  id: string;
  unitId: string;
  clock: string;
  /** 蒸汽产量 t/h */
  steamOutput?: number;
  /** 汽包压力 MPa */
  drumPressure?: number;
  /** 汽包液位 mm */
  drumLevel?: number;
  /** 除氧器压力 MPa */
  deaeratorPressure?: number;
  /** 除氧器温度 ℃ */
  deaeratorTemp?: number;
  process?: string;
  status?: string;
}

/** 喷煤制粉运行（TW0605）——磨机产量/喷煤量/煤粉仓/高炉煤气耗量 */
export interface PciRun {
  id: string;
  unitId: string;
  clock: string;
  /** 磨机产量 t/h */
  millOutput?: number;
  /** 喷煤量 t/h */
  coalInjection?: number;
  /** 煤粉仓料位 % */
  bunkerLevel?: number;
  /** 高炉煤气耗量 m³/h */
  bfgConsumption?: number;
  /** 磨机运行状态：运行/待机/检修 */
  status?: string;
  process?: string;
  remark?: string;
}

/** 热风炉运行（TW0607）：煤气流量/风温/拱顶温度/换炉记录 */
export interface HotStoveRecord {
  id: string;
  unitId: string;
  clock: string;
  /** 热风炉号 1/2/3/4（一座高炉配 3~4 座热风炉轮换送风） */
  stoveNo: string;
  /** 送风/燃烧/换炉中 */
  mode: string;
  /** 煤气流量 m³/h */
  gasFlow?: number;
  /** 送风温度 ℃ */
  blastTemp?: number;
  /** 拱顶温度 ℃ */
  domeTemp?: number;
  /** 换炉时刻 */
  switchTime?: string;
  process?: string;
  remark?: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   7. 铁水调度（TM0001-TM0003）
   ══════════════════════════════════════════════════════════════════════════ */

/** 出铁计划（TM0001）——一个铁次 = 一次出铁 */
export interface TappingPlan {
  id: string;
  /** 炉号 */
  furnaceId: string;
  /** 铁次 */
  tapNo: number;
  /** 预计出铁时间 */
  tapTime: string;
  /** 出铁口 */
  tapHole: string;
  /** 预计出铁量 t */
  estimatedWeight: number;
  /** 去向：炼钢1#/炼钢2#/铸铁 */
  destination: string;
  /** 计划/出铁中/已完成/已取消 */
  status: string;
  /** 实际罐号（完成后回填） */
  ladleId?: string;
  /** 实际出铁量 t */
  actualWeight?: number;
  remark?: string;
}

/** 铁水罐（TM0002） */
export interface IronLadle {
  id: string;
  /** 容量 t */
  capacity: number;
  /** 空/重/检修/烘烤 */
  status: string;
  /** 位置：高炉/运输中/炼钢/烘烤区 */
  location: string;
  furnaceId?: string;
  /** 当前铁次 */
  tapNo?: number;
  lastTappingTime?: string;
  /** 已使用次数 */
  lifetime: number;
  /** 寿命上限 */
  maxLifetime: number;
  /** 罐龄使用率 0-1（NotColumn，由 model 派生，配 ratioBarRenderer） */
  lifeRatio?: number;
  remark?: string;
}

/** 铁水过磅台账（TM0003）：计量系统回传的磅重 + 温度 + 成分 */
export interface TappingActual {
  id: string;
  tappingPlanId?: string;
  furnaceId: string;
  tapNo: number;
  tapHole?: string;
  tapStartTime: string;
  tapEndTime: string;
  ladleId: string;
  /** 磅重 t */
  weight: number;
  /** 铁水温度 ℃ */
  temperature: number;
  destination: string;
  qualityBatchId?: string;
  /** 成分（Si/Mn/S/P），来自质量回传 */
  si?: number;
  mn?: number;
  s?: number;
  p?: number;
  /** 温降 ℃（出铁到过磅） */
  tempDrop?: number;
  remark?: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   8. 成本（TC0001-TC0003）
   ══════════════════════════════════════════════════════════════════════════ */

/** 成本项单价（TPF_1002） */
export interface CostItemPrice {
  id: string;
  /** C_ITEM_NO 成本项代码 */
  itemNo: string;
  /** 成本项名（NotColumn） */
  itemName?: string;
  /** D_DATE 账务日期 */
  date: string;
  unit?: string;
  /** N_PRICE 成本项单价 */
  price?: number;
  /** C_WORKSHOP_CODE 车间代码 */
  workshopCode?: string;
  /** 成本分类：原料/燃料/辅材/备件/能源/人员（B1 的成本结构表） */
  category?: string;
  remark?: string;
}

/** 合同物料成本价格（TPF_1001） */
export interface CostItem {
  id: string;
  /** C_CONTRACT_NO 合同号 */
  contractNo: string;
  /** C_MATRL_CODE 物料号 */
  materialId: string;
  /** D_DATE 账务日期 */
  date: string;
  /** C_ITEM_MODEL 规格 */
  spec?: string;
  suppId?: string;
  suppName?: string;
  /** N_CONTRACT_PRICE 合同单价 */
  contractPrice?: number;
  /** N_ZZSL 增值税率 */
  zzsl?: number;
  /** N_H2O 合同水分 */
  h2o?: number;
  /** N_QY_PRICE 汽运价格 */
  qyPrice?: number;
  /** N_HY_PRICE 海运价格 */
  hyPrice?: number;
  /** N_TZ_PRICE 价格浮动调整 */
  tzPrice?: number;
  /** N_TOTAL_PRICE 计价 */
  totalPrice: number;
}

/** 工序成本分析（TC0002） */
export interface CostAnalysis {
  id: string;
  /** YYYYMM */
  period: string;
  /** 工序机组 */
  unitId: string;
  rawMaterialCost: number;
  fuelCost: number;
  /** ERP 抛送 */
  auxiliaryCost: number;
  /** ERP 抛送 */
  sparePartCost: number;
  /** EMS 抛送 */
  energyCost: number;
  /** ERP 抛送 */
  laborCost: number;
  totalCost: number;
  /** 元/t 产品 */
  unitCost: number;
  outputQty: number;
  /** 月结状态：数据收集中/计算中/已计算/已审核/已锁定/已调差 */
  status: string;
  /** 环比 %（NotColumn） */
  momRate?: number;
}

/** 成本调差记录（TC0003） */
export interface CostAdjust {
  id: string;
  period: string;
  unitId: string;
  /** 成本项 */
  itemNo: string;
  itemName?: string;
  /** 调整前金额 */
  beforeAmount: number;
  /** 调整后金额 */
  afterAmount: number;
  /** 调差金额 = after - before */
  diffAmount?: number;
  /** 调差原因 */
  reason: string;
  /** 调差人 / 审核人 / 时间 */
  operator?: string;
  auditUser?: string;
  adjustTime?: string;
  status: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   9. 统计报表（TR0001-TR0003）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 统计行（TR 三页共用）。
 *
 * 子母项口径见规格书 B4：**子项**是每班/每日的单项原始值，**母项**是由子项加权计算的汇总值。
 * 所以这张表里 `childItems` 是子项明细、`value` 是母项值，`formula` 写清怎么算出来的——
 * 客户追问「这个数怎么来的」时，答案就在行里，不用翻文档。
 */
export interface StatRow {
  id: string;
  /** 统计对象（机组名 / 班组名 / 指标名） */
  target: string;
  /** 统计粒度：班/日/月 */
  granularity: string;
  /** 日期或 YYYYMM */
  period: string;
  /** 工序 */
  process?: string;
  /** 指标名 */
  indicator: string;
  unit: string;
  /** 母项值 */
  value: number;
  /** 计划值（有则算完成率） */
  planValue?: number;
  /** 完成率 % */
  rate?: number;
  /** 子项明细：名称 → 值 */
  childItems?: Record<string, number>;
  /** 计算公式（展示用） */
  formula?: string;
  /** 班组竞赛排名（TR0002） */
  rank?: number;
  /** 指标达标率 %（TR0002） */
  passRate?: number;
  remark?: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   10. 大屏看板（TD0001-TD0003）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 大屏 KPI 项。
 *
 * B2 里没有这个实体：三张大屏的形状（1920×1080、深色、等比缩放）与列表页差得太远，
 * 硬塞进列表契约只会让两边都别扭。所以大屏走**独立聚合端点**，
 * 数据形状就是「一组 KPI + 若干曲线/图元」，由 `overview.ts` 现算。
 */
export interface BoardKpi {
  key: string;
  label: string;
  value: number | string;
  unit?: string;
  /** 目标值（有则画进度） */
  target?: number;
  /** 同比/环比 % */
  delta?: number;
  /** 状态：正常/预警/报警（决定大屏上的颜色） */
  status?: string;
}

/** 大屏曲线序列 */
export interface BoardSeries {
  name: string;
  unit?: string;
  /** 与 `times` 等长 */
  data: number[];
}

/** 大屏整屏数据 */
export interface BoardData {
  /** 屏标题 */
  title: string;
  /** 采集时刻 */
  clock: string;
  kpis: BoardKpi[];
  /** 曲线：时间轴 + 多条序列 */
  times: string[];
  series: BoardSeries[];
  /** 报警条（最新几条） */
  alarms?: Array<{ clock: string; level: string; text: string }>;
}

/* ══════════════════════════════════════════════════════════════════════════
   11. 系统集成（TI0001-TI0004）
   ══════════════════════════════════════════════════════════════════════════ */

/** 采集点位（TI0001） */
export interface CollectPoint {
  id: string;
  unitId: string;
  pointName: string;
  /** AI 模拟量 / DI 开关量 */
  dataType: string;
  /** OPC-DA / OPC-UA / MBE / MB+ / FDDI / 非标TCP */
  protocol: string;
  address: string;
  description?: string;
  upperLimit: number;
  lowerLimit: number;
  enabled: boolean;
  /** 所属区域（对应 B1 的自控系统表：高炉主工艺/烧结/焦化…） */
  area?: string;
  /** 单位 */
  unit?: string;
}

/** 采集结果（TI0002） */
export interface CollectResult {
  id: string;
  pointId: string;
  pointName?: string;
  timestamp: string;
  value: number;
  unit?: string;
  /** Good / Bad / Uncertain（对应「正常/异常/可疑」） */
  quality: string;
  /** 是否超限（由 model 按点位上下限判定） */
  overLimit?: boolean;
}

/** 接口日志（TI0003） */
export interface InterfaceLog {
  id: string;
  /** ERP-DI / 计量-DB_LINK / 检化验-DB_LINK / 数采-TCP / EMS-DB_LINK */
  interfaceName: string;
  /** 上抛/下抛/请求/响应 */
  direction: string;
  sourceSystem: string;
  targetSystem: string;
  content: string;
  /** 成功/失败/处理中 */
  status: string;
  timestamp: string;
  /** 耗时 ms */
  costMs?: number;
  errorMsg?: string;
}

/** 能源数据接口（TI0004）：接收 EMS 的水电气消耗数据 */
export interface EnergyInterfaceRow {
  id: string;
  /** 能源介质：电/水/蒸汽/高炉煤气/焦炉煤气/转炉煤气/氧气/氮气/氩气/压缩空气 */
  medium: string;
  unit: string;
  /** 工序/用能单元 */
  unitId?: string;
  /** 接收日期 */
  date: string;
  /** 班次 */
  shift?: string;
  /** 消耗量 */
  qty: number;
  /** 折标煤 tce */
  stdCoal?: number;
  /** 单价 元 */
  price?: number;
  amount?: number;
  /** 来源接口 */
  source?: string;
  /** 接收状态：成功/失败/处理中 */
  status: string;
  /** 接收时间 */
  receiveTime?: string;
  remark?: string;
}
