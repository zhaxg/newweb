/**
 * 组织与参数（附录 B3 的人员表 + 考核系数）。
 *
 * **为什么参数要放这里**：equipment.md 模块五的命名说明要求「考核哪一类备件、
 * 奖罚系数、折算公式全部做成配置项」——换客户/换厂区只改参数、页面零改动。
 * 所以这几个数字是**系统参数**，不是页面里写死的字面量；AG0001 与结算单页都读它，
 * 客户问「我们厂系数不一样怎么办」，答案是「改配置，不改代码」，而演示必须能当场指给他看。
 */

export interface Person {
  id: string;
  name: string;
  role: "点检工" | "维修钳工" | "作业区主管" | "库管员" | "安环部" | "已离职";
  dept: string;
  phone: string;
  /** 是否在岗——离职交接折算页按这个过滤 */
  active: boolean;
}

export const seedPeople: Person[] = [
  { id: "P-001", name: "李强", role: "点检工", dept: "设备管理部 点检一组", phone: "138****2075", active: true },
  { id: "P-002", name: "王涛", role: "点检工", dept: "设备管理部 点检二组", phone: "139****6118", active: true },
  { id: "P-003", name: "张伟", role: "维修钳工", dept: "检修中心 机修一班", phone: "137****4402", active: true },
  { id: "P-004", name: "赵刚", role: "维修钳工", dept: "检修中心 机修二班", phone: "135****8810", active: true },
  { id: "P-005", name: "刘工", role: "作业区主管", dept: "设备管理部", phone: "136****0021", active: true },
  { id: "P-006", name: "陈明", role: "库管员", dept: "备件库", phone: "150****3364", active: true },
  { id: "P-007", name: "何敏", role: "安环部", dept: "安全环保部", phone: "158****7742", active: true },
  { id: "P-008", name: "孙磊", role: "维修钳工", dept: "检修中心 机修三班", phone: "131****5528", active: false },
];

/**
 * 派工/验证/领料下拉的候选人（在岗才算，离职的留给折算页当主角）。
 *
 * 为什么是函数而不是 `filter().map()` 常量：AS0005 折算页会让一个人变成 `active:false`，
 * 常量在模块求值时就冻结了，之后「他还在派工下拉里」——那条联动就演不出来。
 * 每次读当前状态，页面刷新即生效。
 */
export function activeAssignees(): string[] {
  return seedPeople.filter((p) => p.active && p.role !== "安环部").map((p) => p.name);
}

/** 系统参数（寿命考核） */
export const EAM_PARAMS = {
  /** 厂区/演示企业名——与碳资产域同一叙事口径 */
  plantName: "红河谷钢铁事业部",
  deptName: "设备管理部",
  /** 超期奖励：单价 元/小时 */
  rewardRate: 20,
  /** 未达线处罚：单价 元/小时 */
  punishRate: 40,
  /** 达标线：实际使用小时数须达到寿命限期的这个比例，否则按差额处罚 */
  passRate: 0.9,
  /** 临期判定：剩余寿命低于寿命限期的 (1 - 该值) 时标黄；等价于 used > limit × 0.9 时按 passRate 口径判 */
  nearRatio: 0.9,
  /** 到期预警扫描窗口（天）：特种设备检验、计量检定、寿命临期共用这一条规则 */
  warnDays: 30,
  /** 折算公式的口径说明（结算单/交接单打印时脚注要用，客户要对得上他们的制度文本） */
  rewardFormula: "超期奖励 =（实际使用小时 − 寿命限期小时）× 20 元/小时",
  punishFormula: "未达线处罚 =（寿命限期小时 × 90% − 实际使用小时）× 40 元/小时",
  handoverFormula: "离职折算金额 = 备件单价 ×（1 − 实际使用小时 ÷ 寿命限期小时）",
};

/**
 * 近 12 个月的 KPI 走势（AR0001 / AO0001 的曲线数据源）。
 *
 * 为什么写死而不是从工单实时算：只有 12 张种子工单，实时算出来的月度曲线会是
 * 一根孤零零的九月柱，大屏看起来像坏掉了。演示要的是**趋势叙事**（故障率降、OEE 升），
 * 所以历史 11 个月给静态值，**当月**由 store 按真实数据现算并覆盖最后一个点——
 * 这样剧本走完（关单、领料、报警）时大屏当月那一根会真的动。
 */
export const KPI_MONTHS = [
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
];

export const KPI_HISTORY = {
  /** 故障率 % ——逐年下降是「预测性维护见效」的主张 */
  faultRate: [3.8, 3.6, 3.9, 3.4, 3.2, 3.3, 2.9, 2.8, 3.0, 2.6, 2.4, 2.3],
  oee: [82.1, 82.6, 81.9, 83.4, 84.0, 83.7, 84.9, 85.2, 85.0, 85.9, 86.4, 86.8],
  /** 备件周转率 次/年 */
  turnover: [1.6, 1.7, 1.6, 1.8, 1.9, 1.9, 2.0, 2.1, 2.1, 2.2, 2.3, 2.4],
  /** 人均绩效分 */
  performance: [78, 80, 79, 82, 84, 83, 86, 87, 86, 88, 90, 91],
};

/** 报表中心（AR0002）的固定表头与口径说明——月报/年报由 store 按当月数据现算 */
export const REPORT_DEFS = [
  { id: "RP-001", name: "设备故障停机月报", period: "月", owner: "设备管理部", retention: "10 年" },
  { id: "RP-002", name: "维修工时与费用月报", period: "月", owner: "检修中心", retention: "10 年" },
  { id: "RP-003", name: "备件寿命考核结算表", period: "月", owner: "设备管理部", retention: "永久" },
  { id: "RP-004", name: "特种设备定期检验台账", period: "年", owner: "安全环保部", retention: "永久" },
  { id: "RP-005", name: "计量器具周检完成情况表", period: "年", owner: "设备管理部", retention: "5 年" },
  { id: "RP-006", name: "设备综合效率 OEE 年报", period: "年", owner: "生产部", retention: "永久" },
  { id: "RP-007", name: "点巡检到位率统计表", period: "月", owner: "点检一组", retention: "3 年" },
  { id: "RP-008", name: "隐患整改闭环情况表", period: "月", owner: "安全环保部", retention: "5 年" },
];
