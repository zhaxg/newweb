import type { RouteMap } from "../admin/core";
import { ok } from "../admin/core";
import { listRoute, stubRoute } from "./list";
import { seedAnalysisRecords } from "./data/carbonAnalyse";
import {
  seedCalculatorEnergies,
  seedCarbonEnterprises,
  seedConfigFuels,
  seedConfigHeats,
  seedConfigMcfs,
  seedConfigProcesses,
  seedConfigReduces,
  seedConfigWaters,
  seedIndustries,
  seedPermitEnterprises,
} from "./data/carbonCalculator";
import {
  seedEmissionCalendar,
  seedEmissionDetails,
  seedEmissionProjectDownPull,
  seedEmissionProjects,
  seedEmissionRecordCollect,
  seedEmissionRecords,
  seedEmissionTypes,
  seedMonthCollect,
  seedYearCollect,
} from "./data/carbonEmission";
import { seedCarbonInfos } from "./data/carbonInfo";
import {
  seedEnergyTypes,
  seedEquipments,
  seedFactoryEnergies,
  seedFactoryProducts,
  seedFactorySelectList,
  seedFactorys,
  seedFuels,
  seedMaterials,
  seedProcessCalendar,
  seedProcessEnergies,
  seedProcessEnergyMonth,
  seedProcessEnergyYear,
  seedProcedureProducts,
  seedProcesses,
  seedProducts,
} from "./data/carbonProduction";
import { seedAnticipatedQuotas, seedCompliances, seedTradingPosts } from "./data/carbonQuota";
import {
  seedOffsetCodeNames,
  seedOffsetTypes,
  seedReductionMonths,
  seedReductionProjects,
  seedReductionRecords,
  seedReductionReport,
  seedReductionYears,
} from "./data/carbonReduction";
import { seedQualityStrategies, seedMonthlyEvidence } from "./data/carbonReport";
import { seedTargetList } from "./data/carbonTarget";
import { seedCarbonTrades } from "./data/carbonTrade";
import { seedWarningRecords, seedWarningSettings } from "./data/carbonWarning";
import { seedDataConfigs } from "./data/screenData";
import { seedScreenContributions, seedScreenOverview } from "./data/screenOverview";
import { seedEmissionDays, seedEmissionMonths, seedEnergyDays, seedEnergyMonths } from "./data/reportForm";

const B = "/business";

/**
 * 碳资产其余 48 页的列表端点 mock（查询全部真实现，写/导出全部 `stubRoute()`）。
 *
 * `[查询参数名, 行字段名]` 成对列出：参数名与线上一致（能实测的已实测：enterName /
 * mainAccountNo / sourceName …；其余按「参数名 = 响应字段名」的同一命名法推定，见各自注释）。
 * 种子里没有的维度不会参与过滤（见 list.ts），避免「明明有数据却搜成空表」。
 */
export const carbonListRoutes: RouteMap = {
  /* ── 碳目标（目标管理 / 完成情况共用 list） ─────────────────── */
  [`get ${B}/targetManagement/list`]: listRoute(seedTargetList, [
    ["targetName", "targetName"],
    ["enterName", "enterName"],
    ["factoryName", "factoryName"],
    ["processName", "processName"],
    ["targetYear", "targetYear"],
    ["overStatus", "overStatus"],
  ]),
  [`post ${B}/targetManagement/export`]: stubRoute(),

  /* ── 碳排放 ─────────────────────────────────────────────── */
  [`get ${B}/emissionType/select`]: listRoute(seedEmissionTypes, [["emissionName", "emissionName"]]),
  [`get ${B}/emissionProject/list`]: listRoute(seedEmissionProjects, [
    ["enterName", "enterName"],
    ["emissionName", "emissionName"],
    ["status", "status"],
  ]),
  [`get ${B}/emissionProject/downPull`]: listRoute(seedEmissionProjectDownPull, [["projectName", "projectName"]]),
  [`post ${B}/emissionRecords/company/table`]: listRoute(
    seedEmissionRecords,
    [
      ["enterName", "enterName"],
      ["emissionName", "emissionName"],
      ["dataSource", "dataSource"],
      ["dataTime", "dataTime"],
    ],
    { method: "post" },
  ),
  [`post ${B}/emissionRecords/company/emissionRecordsCompanyCollect`]: listRoute(seedEmissionRecordCollect, [], {
    method: "post",
  }),
  [`get ${B}/emissionRecords/company/emissionCalendar`]: listRoute(seedEmissionCalendar, [], {
    defaults: { date: "2026-09-26" },
  }),
  [`post ${B}/emissionRecords/company/details`]: listRoute(seedEmissionDetails, [["companyName", "companyName"]], {
    method: "post",
    dateField: "reportDate",
  }),
  [`post ${B}/emissionRecords/company/monthCollect`]: listRoute(
    seedMonthCollect,
    [
      ["enterName", "enterName"],
      ["emissionName", "emissionName"],
      ["date", "date"],
    ],
    { method: "post" },
  ),
  [`post ${B}/emissionRecords/company/yearCollect`]: listRoute(
    seedYearCollect,
    [
      ["enterName", "enterName"],
      ["emissionName", "emissionName"],
      ["date", "date"],
    ],
    { method: "post" },
  ),

  /* ── 碳排放 · 工序层级核算 ───────────────────────────────── */
  [`get ${B}/energyType/list`]: listRoute(seedEnergyTypes, [["oneName", "oneName"]]),
  [`get ${B}/fuelManageEnter/list`]: listRoute(seedFuels, [
    ["fuelName", "fuelName"],
    ["fuelTypeId", "fuelTypeId"],
    ["energyTypeId", "energyTypeId"],
    ["fuelFormId", "fuelFormId"],
  ]),
  [`get ${B}/productionMaterialsEnter/list`]: listRoute(seedMaterials, [["materialsName", "materialsName"]], {
    ranges: [["emissionFactorsMin", "emissionFactorsMax", "emissionFactorsValue"]],
  }),
  [`get ${B}/productManage/list`]: listRoute(seedProducts, [["productName", "productName"]]),
  [`get ${B}/factoryManage/list`]: listRoute(seedFactorys, [
    ["factoryName", "factoryName"],
    ["enterName", "enterName"],
  ]),
  [`get ${B}/factoryManage/selectList`]: listRoute(seedFactorySelectList, [["factoryName", "factoryName"]]),
  [`get ${B}/factoryEnergy/list`]: listRoute(seedFactoryEnergies, [["factoryName", "factoryName"]]),
  [`get ${B}/factoryProduct/list`]: listRoute(seedFactoryProducts, [
    ["productName", "productName"],
    ["enterName", "enterName"],
    ["factoryName", "factoryName"],
  ]),
  [`get ${B}/factoryProcess/list`]: listRoute(seedProcesses, [
    ["processName", "processName"],
    ["enterName", "enterName"],
    ["factoryName", "factoryName"],
  ]),
  [`get ${B}/factoryEnergy/processList`]: listRoute(seedProcessEnergies, [
    ["enterName", "enterName"],
    ["factoryName", "factoryName"],
    ["processName", "processName"],
    ["energyTime", "energyTime"],
  ]),
  [`get ${B}/factoryEnergy/process/emissionCalendar`]: listRoute(seedProcessCalendar, [], {
    defaults: { date: "2026-09-26" },
  }),
  [`get ${B}/factoryProduct/processList`]: listRoute(seedProcedureProducts, [
    ["factoryName", "factoryName"],
    ["processName", "processName"],
    ["productName", "productName"],
  ]),
  [`post ${B}/processEnergyCollect/page`]: listRoute(seedProcessEnergyMonth, [], {
    method: "post",
    defaults: { processDate: "2026-09-01" },
  }),
  [`post ${B}/processEnergyYearController/pageYear`]: listRoute(
    seedProcessEnergyYear,
    [
      ["enterName", "enterName"],
      ["factoryName", "factoryName"],
      ["processName", "processName"],
      ["dateYear", "dateYear"],
    ],
    { method: "post" },
  ),
  [`post ${B}/equipment/manage/page`]: listRoute(
    seedEquipments,
    [
      ["equipmentCode", "equipmentCode"],
      ["equipmentName", "equipmentName"],
      ["mountingLocation", "mountingLocation"],
      ["calibrationFrequency", "calibrationFrequencyStr"],
      ["calibrationApproach", "calibrationApproachStr"],
      ["calibrationEmployees", "calibrationEmployeesStr"],
      ["lastCalibrationDateStr", "lastCalibrationDateStr"],
    ],
    { method: "post", dateField: "lastCalibrationDate" },
  ),

  /* ── 碳配额履约 ─────────────────────────────────────────── */
  [`get ${B}/tradingPost/selectList`]: listRoute(seedTradingPosts, [["tradingPostName", "tradingPostName"]]),
  [`get ${B}/anticipatedQuota/list`]: listRoute(seedAnticipatedQuotas, [
    ["enterName", "enterName"],
    ["professionName", "professionName"],
    ["tradingPostName", "tradingPostName"],
    ["quotaYear", "quotaYear"],
  ]),
  [`get ${B}/complianceManage/list`]: listRoute(
    seedCompliances,
    [
      ["enterName", "enterName"],
      ["serverType", "serverType"],
    ],
    { dateField: "serverTime" },
  ),

  /* ── 碳减排（类型/项目/记录/统计/月报/年报共用 offset 候选） ── */
  [`get ${B}/offset/list`]: listRoute(seedOffsetTypes, [
    ["typeName", "typeName"],
    ["offsetFlag", "offsetFlag"],
  ]),
  [`get ${B}/offset/getCodeNameList`]: listRoute(seedOffsetCodeNames, [["typeName", "typeName"]]),
  [`get ${B}/reductionProject/list`]: listRoute(seedReductionProjects, [
    ["projectName", "projectName"],
    ["enterName", "enterName"],
    ["offsetId", "offsetId"],
    ["status", "status"],
  ]),
  [`get ${B}/reductionRecords/list`]: listRoute(
    seedReductionRecords,
    [
      ["projectName", "projectName"],
      ["enterName", "enterName"],
      ["offsetId", "offsetId"],
    ],
    { dateField: "dataTime" },
  ),
  [`get ${B}/reductionRecords/selectProjectRecordsReport`]: listRoute(
    seedReductionReport,
    [
      ["enterName", "enterName"],
      ["projectName", "projectName"],
      ["offsetId", "offsetId"],
    ],
    { dateField: "dataTime" },
  ),
  [`get ${B}/reductionRecords/selectProjectRecordsMonth`]: listRoute(
    seedReductionMonths,
    [
      ["enterName", "enterName"],
      ["projectName", "projectName"],
      ["offsetId", "offsetId"],
    ],
    { dateField: "dataTime" },
  ),
  [`get ${B}/reductionRecords/selectProjectRecordsYear`]: listRoute(
    seedReductionYears,
    [
      ["enterName", "enterName"],
      ["projectName", "projectName"],
      ["offsetId", "offsetId"],
    ],
    { dateField: "dataTime" },
  ),

  /* ── 碳交易 ─────────────────────────────────────────────── */
  [`get ${B}/carbonTrade/list`]: listRoute(
    seedCarbonTrades,
    [
      ["enterName", "enterName"],
      ["tradeTypeName", "tradeTypeName"],
    ],
    { dateField: "tradeTime" },
  ),

  /* ── 碳预警 ─────────────────────────────────────────────── */
  [`get ${B}/warningSetting/list`]: listRoute(seedWarningSettings, [
    ["enterName", "enterName"],
    ["warningType", "warningType"],
    ["statusFlag", "statusFlag"],
  ]),
  [`get ${B}/warningRecord/list`]: listRoute(
    seedWarningRecords,
    [
      ["enterName", "enterName"],
      ["warningType", "warningType"],
    ],
    { dateField: "warningTime" },
  ),

  /* ── 碳分析 ─────────────────────────────────────────────── */
  [`post ${B}/analysisRecord/page`]: listRoute(
    seedAnalysisRecords,
    [
      ["name", "name"],
      ["status", "status"],
    ],
    { method: "post" },
  ),

  /* ── 碳报告 ─────────────────────────────────────────────── */
  [`post ${B}/business/qualityStrategy/page`]: listRoute(
    seedQualityStrategies,
    [
      ["strategyVersion", "strategyVersion"],
      ["revisionDate", "revisionDate"],
    ],
    { method: "post" },
  ),
  [`get ${B}/business/monthlyEvidence/yearStatus`]: listRoute(seedMonthlyEvidence, [], { defaults: { year: "2026" } }),

  /* ── 报表管理（四张报表） ───────────────────────────────── */
  [`get ${B}/monthReport/selectEnergyMonthByEnergy`]: listRoute(seedEnergyMonths, [
    ["energyName", "energyName"],
    ["dataTime", "dataTime"],
  ]),
  [`get ${B}/monthReport/selectEmissionMonth`]: listRoute(seedEmissionMonths, [
    ["enterName", "enterName"],
    ["dataTime", "dataTime"],
  ]),
  [`get ${B}/dayReport/selectEmissionDay`]: listRoute(seedEmissionDays, [
    ["enterName", "enterName"],
    ["factoryName", "factoryName"],
    ["processName", "processName"],
    ["dataTime", "dataTime"],
  ]),
  [`get ${B}/dayReport/selectEnergyDayByEnergy`]: listRoute(seedEnergyDays, [
    ["energyName", "energyName"],
    ["dataTime", "dataTime"],
  ]),

  /* ── 碳信息 ─────────────────────────────────────────────── */
  [`get ${B}/carbonInfo/getCarbonInfoList`]: listRoute(seedCarbonInfos, [
    ["title", "title"],
    ["carbonInfoType", "carbonInfoType"],
  ]),

  /* ── 碳排放计算器管理（6 张配置表 + 计算器 + 行业/企业） ──── */
  [`get ${B}/forestCarbonConfigFuel/listPage`]: listRoute(seedConfigFuels, [["industryType", "industryType"]]),
  [`get ${B}/forestCarbonConfigHeat/listPage`]: listRoute(seedConfigHeats, [
    ["industryType", "industryType"],
    ["type", "typeName"],
  ]),
  [`get ${B}/forestCarbonConfigMcf/listPage`]: listRoute(seedConfigMcfs, [["industryType", "industryType"]]),
  [`get ${B}/forestCarbonConfigProcess/listPage`]: listRoute(seedConfigProcesses, [
    ["industryType", "industryType"],
    ["type", "typeName"],
  ]),
  [`get ${B}/forestCarbonConfigReduce/listPage`]: listRoute(seedConfigReduces, [
    ["industryType", "industryType"],
    ["type", "typeName"],
  ]),
  [`get ${B}/forestCarbonConfigWater/listPage`]: listRoute(seedConfigWaters, [["industryType", "industryType"]]),
  [`get ${B}/CarbonPermitsConfigure/viewingEnterpriseRights`]: listRoute(seedPermitEnterprises, [], {
    defaults: { type: 1 },
  }),
  [`get ${B}/forestCarbonEnergy/listPage`]: listRoute(seedCalculatorEnergies, [
    ["enterName", "enterName"],
    ["industryName", "industryName"],
    ["creatorUserName", "creatorUserName"],
  ]),
  [`get ${B}/CarbonIndustryManage`]: listRoute(seedIndustries, [
    ["industryName", "industryName"],
    ["missItemName", "missItemName"],
    ["missReduceItemName", "missReduceItemName"],
  ]),
  [`get ${B}/CarbonEnterprise`]: listRoute(seedCarbonEnterprises, [
    ["enterName", "enterName"],
    ["areaName", "areaName"],
  ]),

  /* ── 领导驾驶舱（碳资产数据大屏）─────────────────────────────
     两个接口都不带分页、返回裸对象/数组，所以不用 listRoute（那是 {total,rows} 的形状）。
     路径是主站同名业务段：线上前缀是 /prod-api/api，本仓库统一走 /api（withApiPrefix）。 */
  [`get ${B}/assetsOverview/getAssertVO`]: (config) => ok(config, seedScreenOverview),
  [`get ${B}/assetsOverview/getReductionAssertVO`]: (config) => ok(config, seedScreenContributions),

  /* ── 大屏数据管理 ───────────────────────────────────────── */
  [`get ${B}/dataConfig/list`]: listRoute(seedDataConfigs, [
    ["dataName", "dataName"],
    ["screenTypeName", "screenTypeName"],
    ["sourceType", "sourceType"],
  ]),
};
