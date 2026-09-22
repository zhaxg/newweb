/**
 * 数据模型层。
 *
 * 对应 C# 命名空间 GantterSchedule 中的：
 *   AppointmentObject.cs / ResourceObject.cs / EditState.cs / SelectModel.cs
 *   PointObject.cs / GridLineCell.cs / CellStyle.cs / GantException.cs
 *
 * 字段名由 C# 的 PascalCase 改为 TS 的 camelCase，一一对应。
 */

/** 对应 EditState.cs。Normal=0, New=1, Edit=2 */
export enum EditState {
  Normal = 0,
  New = 1,
  Edit = 2,
}

/**
 * 对应 SelectModel.cs。
 * 注意取值顺序与原版一致：New=0, Multiple=1, Single=2, Stove=3,
 * ResourceGroup=4, Group=5, Split=6, Combine=7。
 * 原版 Gant.SelectAppointment 只实现了 Single 分支，其余为未完成代码。
 */
export enum SelectModel {
  New = 0,
  Multiple = 1,
  Single = 2,
  Stove = 3,
  ResourceGroup = 4,
  Group = 5,
  Split = 6,
  Combine = 7,
}

/** 对应 ResourceObject.cs：一行资源（转炉 / 精炼 / 连铸机台）。 */
export interface ResourceObject {
  /** 转炉工序号，参与炉号重排；"0" 表示保留前导 0 前缀 */
  erpBofNo?: string
  /** 连铸机资源 */
  isCcmResource: boolean
  /** 转炉资源 */
  isBofResource: boolean
  /** 资源组，垂直拖动只允许在同一组内 */
  resourceGroup: string
  /** 行排序号 */
  seq: number
  resourceId: string
  resourceName: string
  /** 资源标题背景色（CSS 颜色），对应原版 ColorName */
  colorName?: string
}

/** 对应 AppointmentObject.cs：一个甘特点位。 */
export interface AppointmentObject {
  castSeq: number
  groupSeq: number
  editState: EditState
  /** 甘特图点位 id */
  appointmentId: string
  /** 分组 id */
  groupId: string
  /**
   * 炉次唯一且不变的标识（原版注释：制造命令号）。
   * 控件内部不会改写该值。
   */
  headId: string
  /** 点位显示文本（原版注释：炉次号 / 制造命令号） */
  headIdShowStr: string
  /** 对应连铸机项 */
  ccmResourceId: string
  /** 同一炉工序冶炼的先后顺序 */
  seq: number
  /**
   * 炉号。必须是数字字符串，否则内部取模运算会出错。
   * 原版中该值会被控件内部改写（转炉资源重排炉号）。
   */
  relationId: string
  /** 下显示文本 */
  pRelationId: string
  /** 对应的机台工位项 */
  resourceId: string
  /** 开始时间（计划） */
  startTime: Date
  /** 结束时间（计划） */
  endTime: Date
  /** 开始时间（实际） */
  startTimeAct: Date | null
  /** 结束时间（实际） */
  endTimeAct: Date | null
  /** 持续时间（分钟），实际时间缺失时用它算宽度 */
  duringMins: number
  tag?: unknown
  resourceId2?: string
  stlGrd?: string
  cardId?: string
  /** 拆合炉后当前炉次的来源炉次 HeadId 集合，用于跨炉连线 */
  previousDiffHeadIds: string[]
  /** 是否允许点位垂直移动 */
  allowVerticalMove: boolean
  /** 炉次是否有产出 */
  stoveHaveOutput: boolean
  /** 生产本浇次首炉 */
  nJcBeg: boolean
  /** 生产浇次内顺序号 */
  nSortJcActual: number | null
  /** 生产本浇次尾炉 */
  nJcEnd: boolean
}

/** 对应 PointObject.cs：行内的一个时间点标记。 */
export interface PointObject {
  relationId: string
  resourceId: string
  start: Date
}

/** 对应 GridLineCell.cs：可拖动的时间竖线，选中状态挂在同一条数据上。 */
export interface GridLine {
  id: string
  timeValue: Date
  selected?: boolean
}

/** 对应 CellStyle.cs。颜色统一用 CSS 颜色字符串。 */
export interface CellStyle {
  font: string
  fontColor: string
  backColor: string
  borderColor: string
  selectedColor: string
}

/** 对应 GantException.cs。 */
export class GantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GantError'
  }
}

/** 生成点位 id，对应原版 Guid.NewGuid().ToString("N").ToUpper()。 */
export function newAppointmentId(): string {
  return crypto.randomUUID().replace(/-/g, '').toUpperCase()
}

/** 生成分组 id，原版同样用 Guid。 */
export function newGroupId(): string {
  return crypto.randomUUID().replace(/-/g, '').toUpperCase()
}

/** 与 C# DateTime.Now.ToString("yyMM") 等价，用于拼炉号前缀。 */
export function yearMonthCode(now: Date = new Date()): string {
  return `${String(now.getFullYear() % 100).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 构造点位对象。原版没有工厂方法，字段靠对象初始化器逐个赋值，
 * 这里给出默认值以便调用方只写关心的字段。
 */
export function createAppointment(
  init: Partial<AppointmentObject> & {
    headId: string
    resourceId: string
    startTime: Date
    endTime: Date
  },
): AppointmentObject {
  return {
    castSeq: 0,
    groupSeq: 0,
    editState: EditState.Normal,
    appointmentId: init.appointmentId ?? newAppointmentId(),
    groupId: init.groupId ?? '00001',
    headId: init.headId,
    headIdShowStr: init.headIdShowStr ?? init.headId,
    ccmResourceId: init.ccmResourceId ?? '',
    seq: init.seq ?? 1,
    relationId: init.relationId ?? init.headId,
    pRelationId: init.pRelationId ?? '',
    resourceId: init.resourceId,
    startTime: init.startTime,
    endTime: init.endTime,
    startTimeAct: init.startTimeAct ?? null,
    endTimeAct: init.endTimeAct ?? null,
    duringMins: init.duringMins ?? Math.round((init.endTime.getTime() - init.startTime.getTime()) / 60000),
    tag: init.tag,
    resourceId2: init.resourceId2,
    stlGrd: init.stlGrd,
    cardId: init.cardId,
    previousDiffHeadIds: init.previousDiffHeadIds ?? [],
    allowVerticalMove: init.allowVerticalMove ?? true,
    stoveHaveOutput: init.stoveHaveOutput ?? false,
    nJcBeg: init.nJcBeg ?? false,
    nSortJcActual: init.nSortJcActual ?? null,
    nJcEnd: init.nJcEnd ?? false,
  }
}
