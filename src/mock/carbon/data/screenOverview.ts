/**
 * 领导驾驶舱（碳资产数据大屏）的查询种子。
 *
 * 线上是大屏站 carbon-screen.rcisyn.com 的两个接口（路径前缀 `/prod-api/api`，业务段与主站一致）：
 *   GET /business/assetsOverview/getAssertVO           → 单个对象（各板块汇总值）
 *   GET /business/assetsOverview/getReductionAssertVO → 数组（减碳贡献图的数据）
 *
 * 抓取自线上（2026-09-26，只读 GET）。两个接口都**不带分页**、不是 `{total,rows}` 形状，
 * 故 api 侧用 `carbonGet` 而不是 `carbonQuery`（见 src/api/carbon/queries.ts）。
 */

/** `GET /business/assetsOverview/getAssertVO` → data */

export const seedScreenOverview: Record<string, string | number> = {
  deleteMark: 0,
  emissionReductionTotal: "1018195.30",
  emissionTotal: "74885910.00",
  emissionIntensityTotal: "2.03",
  eisenReductionTotal: "86.00",
  greeningReductionTotal: "1140.00",
  doubleSlagReductionTotal: "72700.00",
  sewageReductionTotal: "0.00",
  smartFactoryReductionTotal: "132000.00",
  makHydCount: "1",
  hydStationCount: "15",
  hydVehicleCount: "1215",
  hydTravlledDistanceCount: "6030.50",
  hydTransportCount: "7083.23",
  hydReductionTotal: "57007.58",
  steelMechanicalReduceTotal: "0.00",
  steelElectricReduceTotal: "84822.00",
  electricGenerateReduceTotal: "46909.00",
  electricSinteringReduceTotal: "31903.00",
  electricSolarPowerReduceTotal: "43040.00",
  heatingAreaCount: "300.00",
  heatingReduceTotal: "39400.00",
  greenElectricBuyCount: "53141.96",
  greenElectricReduceTotal: "46993.00",
};

/**  → data（减碳贡献图） */
export const seedScreenContributions: Array<{ contributionProductName: string; contributionTotal: string }> = [
  {
    contributionProductName: "氢能产业",
    contributionTotal: "57007.58",
  },
  {
    contributionProductName: "钢铁生产",
    contributionTotal: "84822.00",
  },
  {
    contributionProductName: "发电",
    contributionTotal: "121852.00",
  },
  {
    contributionProductName: "余热供暖",
    contributionTotal: "39400.00",
  },
  {
    contributionProductName: "绿电",
    contributionTotal: "46993.00",
  },
];
