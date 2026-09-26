/**
 * 行业类型字典（线上字典组 `CIndustryType`，24 项）——碳排放计算器管理下 7 个页面共用。
 *
 * 为什么需要单独一份：配置表行里存的是**序号**（`industryType = "9"`），
 * 而 `CarbonIndustryManage` 那张行业表的主键是 18 位长 id（`864060581555108681`），
 * 两者**不是同一套 id**（实测比对过，对不上），所以不能从行业表反查。
 * 线上是拿字典组把序号翻成中文的，这里照抄同一份对照。
 *
 * 来源：`GET /api/system/DictionaryData/All` → `data.list[enCode="CIndustryType"].dictionaryList`（2026-09-26 抓取）。
 */
const ITEMS: Array<[code: string, name: string]> = [
  ["1", "造纸和纸制品生产企业"],
  ["2", "矿山企业"],
  ["3", "工业其他行业企业"],
  ["4", "中国钢铁生产企业"],
  ["5", "其他有色金属冶炼和压延加工企业"],
  ["6", "电子设备制造企业"],
  ["7", "机械设备制造企业"],
  ["8", "食品、烟草及酒、饮料和精制茶企业"],
  ["9", "公共建筑运营单位（企业）"],
  ["10", "陆上交通运输企业"],
  ["11", "氟化工企业"],
  ["12", "中国发电企业"],
  ["13", "中国电网企业"],
  ["14", "中国化工生产企业"],
  ["15", "中国电解铝企业"],
  ["16", "中国镁冶炼企业"],
  ["17", "中国平板玻璃生产企业"],
  ["18", "中国水泥生产企业"],
  ["19", "中国陶瓷生产企业"],
  ["20", "中国民航企业"],
  ["21", "中国石油和天然气生产企业"],
  ["22", "中国石油化工企业"],
  ["23", "中国独立焦化企业"],
  ["24", "中国煤炭生产企业"],
];

/** 序号 → 中文（列展示用） */
export const INDUSTRY_TYPE: Record<string, string> = Object.fromEntries(ITEMS);

/** 下拉候选（按序号顺序，即线上字典顺序） */
export const INDUSTRY_OPTIONS = ITEMS.map(([, name]) => name);

/** 展示文案 → 请求值（筛选时反查） */
export const INDUSTRY_VALUE_MAP: Record<string, string> = Object.fromEntries(ITEMS.map(([c, n]) => [n, c]));

/**
 * 几个「是/否」编码列的显示对照——值都是照**线上行的实际显示**反推的，不是猜的：
 * - isDefault 实测恒为 "1" 且列显示「是」
 * - isPotency "0" 列显示「否」（carbon-process 行1）
 * - isSelect  "0" 显示「否」、「2」显示「是」（energy-water 行1/行2）
 */
export const YES_NO_DEFAULT: Record<string, string> = { "1": "是", "0": "否" };
export const YES_NO_PURITY: Record<string, string> = { "0": "否", "1": "是" };
export const YES_NO_SELECT: Record<string, string> = { "0": "否", "1": "是", "2": "是" };

/**
 * 电和热配置的 `type`：线上行「蒸汽→热力」「电力→电力」，故 1=电力、2=热力
 * （由 name 与 type 的对应关系反推：seed 里 电力 全是 type=1，热水/蒸汽 全是 type=2）。
 */
export const HEAT_TYPE: Record<string, string> = { "1": "电力", "2": "热力" };
