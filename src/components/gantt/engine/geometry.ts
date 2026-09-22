/**
 * 坐标与布局计算。
 *
 * 移植自 Gant.cs 里散落的换算逻辑，集中成纯函数便于测试与复用：
 *   AppointmentCell.X / Width / Y / Y_Inner / Height_Inner
 *   ResourceRowCell.Y / Height
 *   ResourceRulerCell.DrawCell 的刻度布局
 *   Gant.GetTimeByPointToClient / Gant.BindingData 的滚动条计算
 *
 * 坐标系约定（与原版一致）：
 *   - “世界坐标”：时间轴 0 对应 StartDate，1 小时 = RuleHourLength 像素；行 0 对应第一条资源。
 *   - “局部坐标”：世界坐标减去滚动偏移（scrollX / scrollY），即原版的 OffSetX / OffSetY。
 *   - “客户端坐标”：局部坐标再加上左上角占位（+ResourceWidth / +RulerRowHeight）。
 */

import type { AppointmentObject, GridLine, ResourceObject } from './model'
import type { GanttStyle } from './style'

export interface LayoutView {
  startDate: Date
  endDate: Date
  style: GanttStyle
  scrollX: number
  scrollY: number
  /** 已按 seq 升序排好的资源列表 */
  sortedResources: ResourceObject[]
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const MS_PER_MINUTE = 60000

/** 按 seq 升序稳定排序，得到行的显示顺序。 */
export function sortResources(resources: readonly ResourceObject[]): ResourceObject[] {
  return resources
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.seq - b.r.seq) || (a.i - b.i))
    .map((e) => e.r)
}

export function minutesBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_MINUTE
}

/** 原版 Gant.TotalHours。 */
export function totalHours(v: LayoutView): number {
  return minutesBetween(v.startDate, v.endDate) / 60
}

/** 时间轴总宽度，对应 (int)(TotalHours * RuleHourLength)。 */
export function timelineWidth(v: LayoutView): number {
  return Math.trunc(totalHours(v) * v.style.ruleHourLength)
}

/** 每小格像素，对应 Gant.SecondScalelen。 */
export function secondScaleLength(v: LayoutView): number {
  return v.style.ruleHourLength / v.style.ruleMinCount
}

/** 时间 → 世界 X。对应 AppointmentCell.X 里的 num。 */
export function worldXAt(v: LayoutView, t: Date): number {
  return Math.trunc((minutesBetween(v.startDate, t) * v.style.ruleHourLength) / 60)
}

/** 世界 X → 时间。 */
export function timeAtWorldX(v: LayoutView, x: number): Date {
  return new Date(v.startDate.getTime() + ((x * 60) / v.style.ruleHourLength) * MS_PER_MINUTE)
}

/** 世界 X → 客户端 X。 */
export function clientXAt(v: LayoutView, worldX: number): number {
  return worldX - v.scrollX + v.style.resourceWidth
}

/** 客户端 X → 世界 X。 */
export function worldXAtClient(v: LayoutView, clientX: number): number {
  return clientX + v.scrollX - v.style.resourceWidth
}

/** 客户端 X → 时间。对应 Gant.GetTimeByPointToClient。 */
export function timeAtClientX(v: LayoutView, clientX: number): Date {
  const num = v.scrollX - v.style.resourceWidth + clientX
  return new Date(v.startDate.getTime() + ((num * 60) / v.style.ruleHourLength) * MS_PER_MINUTE)
}

/** 资源行索引，找不到返回 -1。 */
export function resourceIndex(v: LayoutView, resourceId: string): number {
  return v.sortedResources.findIndex((r) => r.resourceId === resourceId)
}

/** 资源行世界 Y。对应 ResourceRowCell.Y。 */
export function rowWorldY(v: LayoutView, resourceId: string): number {
  const index = resourceIndex(v, resourceId)
  return index < 0 ? 0 : v.style.resourceRowHeight * index
}

/** 行内横条高度，对应 AppointmentCell.Height_Inner。 */
export function innerHeight(v: LayoutView): number {
  const tenth = Math.trunc(v.style.resourceRowHeight / 10)
  return tenth < v.style.resourceRowHeightInner ? v.style.resourceRowHeightInner : tenth
}

/** 点位实际开始时间（有实际用实际）。 */
export function appointmentStart(appt: AppointmentObject): Date {
  return appt.startTimeAct ?? appt.startTime
}

/** 点位实际结束时间（有实际用实际）。 */
export function appointmentEnd(appt: AppointmentObject): Date {
  return appt.endTimeAct ?? appt.endTime
}

/** 点位宽度，对应 AppointmentCell.Width。 */
export function appointmentWidth(v: LayoutView, appt: AppointmentObject): number {
  let minutes = 0
  if (appt.endTimeAct) {
    minutes = minutesBetween(appointmentStart(appt), appt.endTimeAct)
  }
  if (minutes <= 0) minutes = appt.duringMins
  return Math.trunc(Math.trunc(minutes * v.style.ruleHourLength) / 60)
}

/** 点位外框（局部坐标），对应 AppointmentCell.DrawCell 里的 base.rectangle。 */
export function appointmentOuterRect(v: LayoutView, appt: AppointmentObject): Rect {
  return {
    x: worldXAt(v, appointmentStart(appt)) - v.scrollX,
    y: rowWorldY(v, appt.resourceId) - v.scrollY,
    w: appointmentWidth(v, appt),
    h: v.style.resourceRowHeight,
  }
}

/** 点位内框（局部坐标），对应 AppointmentCell.DrawCell 里的 rectangle_Inner。 */
export function appointmentInnerRect(v: LayoutView, appt: AppointmentObject): Rect {
  const inner = innerHeight(v)
  const rowH = v.style.resourceRowHeight
  const rowY = rowWorldY(v, appt.resourceId)

  // 连铸资源固定居中；其它资源按炉号奇偶错开半格，避免同机台点位互相遮挡
  let offset = 0
  if (!isCcm(v, appt.resourceId)) {
    const relation = Number(appt.relationId)
    offset = Number.isFinite(relation) && relation % 2 === 0 ? inner : 0
  }

  const worldYInner = rowY + Math.floor((rowH - inner) / 2) + offset
  return {
    x: worldXAt(v, appointmentStart(appt)) - v.scrollX,
    y: worldYInner - v.scrollY,
    w: appointmentWidth(v, appt),
    h: inner,
  }
}

export function isCcm(v: LayoutView, resourceId: string): boolean {
  return v.sortedResources.find((r) => r.resourceId === resourceId)?.isCcmResource ?? false
}

export function isBof(v: LayoutView, resourceId: string): boolean {
  return v.sortedResources.find((r) => r.resourceId === resourceId)?.isBofResource ?? false
}

/** 局部坐标 → 客户端坐标。 */
export function toClientRect(v: LayoutView, local: Rect): Rect {
  return {
    x: local.x + v.style.resourceWidth,
    y: local.y + v.style.rulerRowHeight,
    w: local.w,
    h: local.h,
  }
}

export function containsPoint(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h
}

/** 由资源行索引得到客户端 Y（用于垂直拖动命中测试）。 */
export function rowClientRect(v: LayoutView, index: number, viewportWidth: number): Rect {
  return {
    x: v.style.resourceWidth,
    y: v.style.resourceRowHeight * index - v.scrollY + v.style.rulerRowHeight,
    w: viewportWidth - v.style.resourceWidth,
    h: v.style.resourceRowHeight,
  }
}

/** GridLine 的客户端 X。对应 GridLineCell.X。 */
export function gridLineClientX(v: LayoutView, line: GridLine): number {
  return worldXAt(v, line.timeValue) - v.scrollX + v.style.resourceWidth
}

// ---------------------------------------------------------------------------
// 滚动条
// ---------------------------------------------------------------------------

export interface ScrollMetrics {
  vVisible: boolean
  vMax: number
  vLargeChange: number
  vSmallChange: number
  hVisible: boolean
  hMax: number
  hLargeChange: number
  hSmallChange: number
}

/**
 * 对应 Gant.BindingData 的滚动条计算。
 * WinForms 的取值上界是 Maximum - LargeChange + 1，这里保留同样的语义。
 */
export function computeScrollMetrics(
  v: LayoutView,
  viewportWidth: number,
  viewportHeight: number,
): ScrollMetrics {
  const s = v.style
  const totalCaptionHeight = s.resourceRowHeight * v.sortedResources.length
  const bodyHeight = viewportHeight - s.rulerRowHeight
  const bodyWidth = viewportWidth - s.resourceWidth

  const vLargeChange = s.resourceRowHeight
  const vVisible = totalCaptionHeight > bodyHeight

  const hLargeChange = s.ruleHourLength
  const hSmallChange = Math.trunc(secondScaleLength(v))
  const hVisible = totalHours(v) * s.ruleHourLength > bodyWidth

  const vMaximum =
    totalCaptionHeight + vLargeChange - bodyHeight + (hVisible ? s.scrollbarSize : 0)
  const hMaximum =
    Math.trunc(totalHours(v)) * s.ruleHourLength +
    hLargeChange -
    bodyWidth +
    (vVisible ? s.scrollbarSize : 0)

  return {
    vVisible,
    vMax: Math.max(0, vMaximum - vLargeChange + 1),
    vLargeChange,
    vSmallChange: s.resourceRowHeight,
    hVisible,
    hMax: Math.max(0, hMaximum - hLargeChange + 1),
    hLargeChange,
    hSmallChange,
  }
}
