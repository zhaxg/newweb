/**
 * 样式与尺寸配置。
 *
 * 数值来源：
 *   - Gant.cs 的属性默认值
 *   - FrmMS2000.Designer.cs 里 gant1 的实际赋值（生产环境真实配置）
 *   - ResourceCaptionCell.cs / ResourceCaptionHeaderCell.cs / ResourceRulerCell.cs
 *     / ResourceRowCell.cs 中硬编码的颜色
 *
 * C# 用 Font 对象 + Color 结构，Web 侧统一换成 CSS 字体串与 CSS 颜色串。
 * pt → px 换算：px = pt * 96 / 72。
 */

/** 中文字体栈，替代原版的“宋体”。 */
export const CJK_FONT_STACK =
  '"SimSun", "宋体", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif'

export interface GanttStyle {
  /** 资源列宽度，原版 ResourceWidth，默认 120 */
  resourceWidth: number
  /** 刻度行高度，原版 RulerRowHeight，默认 40 */
  rulerRowHeight: number
  /** 时间刻度高度（小时刻线长度），原版 RuleHourHeight，默认 15 */
  ruleHourHeight: number
  /** 小时刻度长度，即 1 小时对应的像素，原版 RuleHourLength，默认 100 */
  ruleHourLength: number
  /** 每小时细分刻度个数，原版 RuleMinCount，默认 6（即 10 分钟一格） */
  ruleMinCount: number
  /** 资源行高，原版 ResourceRowHeight */
  resourceRowHeight: number
  /** 行内有色横条高度下限，原版 ResourceRowHeight_Inner */
  resourceRowHeightInner: number
  /** 边框色，原版 BorderColor */
  borderColor: string
  /** 资源行背景色，原版 ResourceRowBackColor（原版 ResourceRowCell 实际硬编码为 #F0F0F0） */
  resourceRowBackColor: string
  /** 滚动条宽度，原版固定用 16 */
  scrollbarSize: number

  /** 刻度字体，原版 RuleHourFont 宋体 8pt */
  ruleHourFont: string
  /** 刻度字体颜色，原版 RuleHourFontColor */
  ruleHourFontColor: string

  /** 点位文字字体，原版 DisplayFont */
  displayFont: string
  /** 点位文字默认颜色，取自 CellStyle.FontColor */
  displayFontColor: string
  /** 点位默认底色，取自 AppointmentCell 构造函数 Color.CadetBlue */
  appointmentBackColor: string
  /** 选中的块外框颜色，原版 AppointmentSelectedColor */
  appointmentSelectedColor: string
  /** 选中的块内框颜色，原版 AppointmentInnerSelectedColor */
  appointmentInnerSelectedColor: string
  /** 有产出颜色，原版 AppointmentStoveHaveOutputBackColor */
  appointmentStoveHaveOutputBackColor: string
  /** 完成颜色，原版 AppointmentCompleteBackColor */
  appointmentCompleteBackColor: string
  /** 进行中颜色，原版 AppointmentWorkingBackColor */
  appointmentWorkingBackColor: string
  /** 与其它点位重叠时的提示色，原版硬编码 Color.Yellow */
  overlapColor: string
  /** 同炉联动选中的内框色，原版硬编码 Color.Yellow */
  stoveSelectedInnerColor: string
  /** 同炉联动选中的文字色，原版硬编码 Color.DarkOrange */
  stoveSelectedFontColor: string
  /** 首炉 / 尾炉 / 浇次序号标识颜色，原版硬编码 Color.Red */
  markerColor: string
  /** 连线冲突颜色，原版硬编码 Color.Red */
  linkConflictColor: string
  /** 准星与 GridLine 颜色，原版硬编码 Color.Purple / Color.Blue */
  crosshairColor: string
  gridLineColor: string
  /** 当前时间线颜色，原版硬编码 Color.Red */
  nowLineColor: string

  /** 资源标题（左上角）字体，原版 ResourceCaptionHeaderFont 宋体 10pt Bold */
  resourceCaptionHeaderFont: string
  resourceCaptionHeaderFontColor: string
  resourceCaptionHeaderBackColor: string
  /** 资源名（左列）字体，原版 ResourceCaptionFont 宋体 10pt */
  resourceCaptionFont: string
  resourceCaptionFontColor: string
  /**
   * 资源名背景色。
   * 原版此处为 Color 的默认值（全透明），靠离屏位图叠加露出控件底色；
   * Web 侧没有等价机制，改为显式底色，默认取窗口色。
   */
  resourceCaptionBackColor: string

  /** 合并资源颜色组，原版 CombineSelectedColors = [Red, Green] */
  combineSelectedColors: string[]
  /** 每个组的间隔时间（分钟），原版 GroupIntervalMins */
  groupIntervalMins: number
}

/** 生产环境配置（FrmMS2000.Designer.cs）为默认值。 */
export function createDefaultStyle(): GanttStyle {
  return {
    resourceWidth: 120,
    rulerRowHeight: 40,
    ruleHourHeight: 15,
    ruleHourLength: 100,
    ruleMinCount: 6,
    resourceRowHeight: 68,
    resourceRowHeightInner: 5,
    borderColor: '#000000',
    resourceRowBackColor: '#f0f0f0',
    scrollbarSize: 16,

    ruleHourFont: `11px ${CJK_FONT_STACK}`,
    ruleHourFontColor: '#000000',

    displayFont: `bold 15px ${CJK_FONT_STACK}`,
    displayFontColor: '#000000',
    appointmentBackColor: '#5f9ea0',
    appointmentSelectedColor: '#0000ff',
    appointmentInnerSelectedColor: '#ff0000',
    appointmentStoveHaveOutputBackColor: '#007800',
    appointmentCompleteBackColor: '#ff5aff',
    appointmentWorkingBackColor: '#00ff00',
    overlapColor: '#ffff00',
    stoveSelectedInnerColor: '#ffff00',
    stoveSelectedFontColor: '#ff8c00',
    markerColor: '#ff0000',
    linkConflictColor: '#ff0000',
    crosshairColor: '#800080',
    gridLineColor: '#0000ff',
    nowLineColor: '#ff0000',

    resourceCaptionHeaderFont: `bold 13px ${CJK_FONT_STACK}`,
    resourceCaptionHeaderFontColor: '#000000',
    resourceCaptionHeaderBackColor: '#ffffff',
    resourceCaptionFont: `13px ${CJK_FONT_STACK}`,
    resourceCaptionFontColor: '#ff0000',
    resourceCaptionBackColor: '#ffffff',

    combineSelectedColors: ['#ff0000', '#008000'],
    groupIntervalMins: 5,
  }
}

/** 从 CSS 字体串里取字号（px），用于估算行高。 */
export function fontPixelSize(font: string): number {
  const m = /(\d+(?:\.\d+)?)px/.exec(font)
  return m ? Number(m[1]) : 12
}

/** 估算字体行高，近似替代 GDI+ Font.Height / Graphics.MeasureString().Height。 */
export function fontLineHeight(font: string): number {
  return fontPixelSize(font) * 1.2
}
