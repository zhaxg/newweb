/**
 * Canvas 2D 渲染层。
 *
 * 对应原版的一批自绘方法：
 *   Gant.OnPaint / DrawGant / DrawRuler / DrawLeftResource / DrawLeftResourceCaption
 *   Gant.DrawResourceRightRow / DrawGridLines / DrawDateNowLine
 *   ResourceRulerCell.DrawCell / ResourceCaptionCell.DrawCell
 *   ResourceCaptionHeaderCell.DrawCell / ResourceRowCell.DrawCell
 *   AppointmentCell.DrawCell / DrawLinkLine
 *   PointCell.DrawCell / GridLineCell.DrawCell
 *
 * 原版用离屏 Bitmap 分块绘制再 DrawImage 贴回，这里改成 ctx.translate + clip，
 * 坐标含义保持一致：右区绘制前先平移到 (resourceWidth, rulerRowHeight)。
 */

import {
  appointmentInnerRect,
  appointmentOuterRect,
  gridLineClientX,
  minutesBetween,
  resourceIndex,
  rowClientRect,
  secondScaleLength,
  timeAtClientX,
  timelineWidth,
  totalHours,
  worldXAt,
  type LayoutView,
  type Rect,
  type ScrollMetrics,
} from './geometry'
import type { AppointmentObject, GridLine, PointObject, ResourceObject } from './model'
import { fontLineHeight, type GanttStyle } from './style'
import { isLinkConflict, resolveAppointmentColor } from './rules'

export interface Viewport {
  width: number
  height: number
}

/** 渲染所需的全部状态。 */
export interface RenderModel extends LayoutView {
  appointments: readonly AppointmentObject[]
  pointObjects: readonly PointObject[]
  gridLines: readonly GridLine[]
  /** 点位 id → 是否选中 */
  selected: ReadonlySet<string>
  /** 当前点位 id */
  currentId: string | null
  /** 同炉联动高亮的点位 id */
  stoveSelected: ReadonlySet<string>
  /** 与其它点位重叠的点位 id */
  overlapped: ReadonlySet<string>
  /** 点位 id → 同炉上一道工序点位 id */
  previousOf: ReadonlyMap<string, string>
  /** 点位 id → 跨炉父点位 id 列表 */
  previousDiffOf: ReadonlyMap<string, readonly string[]>
  showLink: boolean
  scrollMetrics: ScrollMetrics
  /** 鼠标位置（客户端坐标），用于画准星 */
  pointer: { x: number; y: number } | null
  /** 本次绘制的实际像素缩放比，用于按物理像素对齐 */
  scale: PixelScale
}

// ---------------------------------------------------------------------------
// 绘制原语，对应 GantDrawPaint
//
// 高分屏下的清晰度要点：
//   1. 所有描边线宽按「物理像素」给定（1/scale 个 CSS 像素），与 WinForms 在
//      高 DPI 下画 1 物理像素线的观感一致；直接用 1 个 CSS 像素会变成 1.75
//      物理像素，看起来又粗又糊。
//   2. 轴线（横线/竖线）的常量坐标吸附到物理像素中心，避免落在两个物理
//      像素之间被抗锯齿摊开。
//   3. 字号取整到物理像素，避免小数物理尺寸导致字形栅格化发虚。
//   4. 两个轴分别用各自的缩放比（缓冲尺寸取整后可能与 dpr 有微小偏差）。
// ---------------------------------------------------------------------------

/** 缓冲尺寸 / CSS 尺寸的实际比值，两个轴分别记录。 */
export interface PixelScale {
  x: number
  y: number
  /**
   * 当前绘图上下文的平移量（CSS 像素）。
   * 右区绘制前会 translate(resourceWidth, rulerRowHeight)，平移量乘以分数缩放后
   * 通常不是整数物理像素，因此吸附必须把平移量一起计入设备像素网格，
   * 否则线条仍会落在半像素上。
   */
  ox: number
  oy: number
}

/** 把 X 坐标吸附到物理像素中心（计入上下文平移）。 */
function snapX(v: number, s: PixelScale): number {
  return (Math.round((v + s.ox) * s.x) + 0.5) / s.x - s.ox
}

/** 把 Y 坐标吸附到物理像素中心（计入上下文平移）。 */
function snapY(v: number, s: PixelScale): number {
  return (Math.round((v + s.oy) * s.y) + 0.5) / s.y - s.oy
}

/** 把字号取整到整数物理像素。 */
function crispFont(font: string, scale: number): string {
  return font.replace(/(\d+(?:\.\d+)?)px/, (_, size: string) => {
    const device = Math.max(1, Math.round(Number(size) * scale))
    return `${device / scale}px`
  })
}

function fillRect(ctx: CanvasRenderingContext2D, r: Rect, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(r.x, r.y, r.w, r.h)
}

/** 矩形描边，线宽以物理像素计，四边对齐到最外侧的物理像素。 */
function strokeRect(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  color: string,
  scale: PixelScale,
  deviceWidth = 1,
): void {
  const wx = deviceWidth / scale.x
  const wy = deviceWidth / scale.y
  const x0 = snapX(r.x, scale)
  const y0 = snapY(r.y, scale)
  const x1 = snapX(r.x + r.w, scale) - wx
  const y1 = snapY(r.y + r.h, scale) - wy
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(wx, wy)
  ctx.beginPath()
  ctx.rect(x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0))
  ctx.stroke()
  ctx.restore()
}

/**
 * 画线。水平线与竖线的常量坐标会吸附到物理像素中心；
 * 斜线（连线）保持原样。dash 长度按物理像素给定。
 */
function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  scale: PixelScale,
  deviceWidth = 1,
  dash: number[] = [],
): void {
  const vertical = Math.abs(x1 - x2) < 1e-6
  const horizontal = Math.abs(y1 - y2) < 1e-6
  const ax = vertical ? snapX(x1, scale) : x1
  const bx = vertical ? snapX(x2, scale) : x2
  const ay = horizontal ? snapY(y1, scale) : y1
  const by = horizontal ? snapY(y2, scale) : y2
  const w = vertical
    ? deviceWidth / scale.x
    : horizontal
      ? deviceWidth / scale.y
      : deviceWidth / Math.max(scale.x, scale.y)

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = w
  if (dash.length > 0) ctx.setLineDash(dash.map((d) => d / Math.max(scale.x, scale.y)))
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  ctx.lineTo(bx, by)
  ctx.stroke()
  ctx.restore()
}

/** 对应 ControlPaint.DrawBorder3D(RaisedOuter)：左上高光、右下阴影。 */
function drawBorder3D(ctx: CanvasRenderingContext2D, r: Rect, scale: PixelScale): void {
  const wx = 1 / scale.x
  const wy = 1 / scale.y
  const x0 = snapX(r.x, scale)
  const y0 = snapY(r.y, scale)
  const x1 = snapX(r.x + r.w, scale) - wx
  const y1 = snapY(r.y + r.h, scale) - wy
  line(ctx, x0, y0, x1, y0, '#ffffff', scale)
  line(ctx, x0, y0, x0, y1, '#ffffff', scale)
  line(ctx, x0, y1, x1, y1, '#404040', scale)
  line(ctx, x1, y0, x1, y1, '#404040', scale)
}

/** 对应 GantDrawPaint.DrawString(rect, ..., StringFormat 居中 + 省略号)。 */
function drawTextCenter(
  ctx: CanvasRenderingContext2D,
  text: string,
  r: Rect,
  font: string,
  color: string,
  scale: PixelScale,
): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(r.x, r.y, r.w, r.h)
  ctx.clip()
  ctx.font = crispFont(font, scale.y)
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, r.x + r.w / 2, snapY(r.y + r.h / 2, scale))
  ctx.restore()
}

// ---------------------------------------------------------------------------
// 顶部时间刻度，对应 Gant.DrawRuler + ResourceRulerCell.DrawCell
// ---------------------------------------------------------------------------

function hourLabel(v: LayoutView, hourIndex: number): string {
  const midnight = new Date(
    v.startDate.getFullYear(),
    v.startDate.getMonth(),
    v.startDate.getDate(),
  )
  const d = new Date(midnight.getTime() + hourIndex * 3600000)
  return String(d.getHours()).padStart(2, '0')
}

export function drawRuler(ctx: CanvasRenderingContext2D, v: RenderModel, size: Viewport): void {
  const s = v.style
  const bodyW = size.width - s.resourceWidth
  if (bodyW <= 0) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(s.resourceWidth, 0, bodyW, s.rulerRowHeight)
  ctx.clip()
  ctx.translate(s.resourceWidth, 0)
  // 平移后坐标系原点不在设备像素网格上，吸附必须带上平移量
  const scale: PixelScale = { ...v.scale, ox: s.resourceWidth, oy: 0 }

  const width = timelineWidth(v)
  const back: Rect = { x: -v.scrollX, y: 0, w: width, h: s.rulerRowHeight }
  fillRect(ctx, back, '#f0f0f0')
  strokeRect(ctx, back, s.borderColor, scale)

  const hours = totalHours(v)
  const lineHeight = fontLineHeight(s.ruleHourFont)

  for (let h = 0; h < hours; h++) {
    const x = s.ruleHourLength * h - v.scrollX
    const topY = s.rulerRowHeight - s.ruleHourHeight

    line(ctx, x, topY, x, s.rulerRowHeight, s.borderColor, scale)

    ctx.font = crispFont(s.ruleHourFont, scale.y)
    ctx.fillStyle = s.ruleHourFontColor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(hourLabel(v, h), snapX(x, scale), snapY(topY - lineHeight / 2, scale))

    // 最后一个小时不画右边界细分刻度，与原版一致
    const subCount = s.ruleMinCount - (h === hours - 1 ? 0 : 1)
    for (let i = 1; i <= subCount; i++) {
      const sx = x + i * secondScaleLength(v)
      line(ctx, sx, topY + s.ruleHourHeight / 2, sx, s.rulerRowHeight, s.borderColor, scale)
    }
  }

  ctx.restore()
}

// ---------------------------------------------------------------------------
// 左侧资源列，对应 Gant.DrawLeftResource / DrawLeftResourceCaption
// ---------------------------------------------------------------------------

function headerCaption(v: LayoutView): string {
  // 原版 ReNameCaption：标题显示的是当前滚动位置对应的时间
  const t = timeAtClientX(v, v.style.resourceWidth)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

export function drawLeftColumn(ctx: CanvasRenderingContext2D, v: RenderModel, size: Viewport): void {
  const s = v.style
  const scale = v.scale
  const header: Rect = { x: 0, y: 0, w: s.resourceWidth, h: s.rulerRowHeight }
  fillRect(ctx, header, s.resourceCaptionHeaderBackColor)
  strokeRect(ctx, header, s.borderColor, scale)
  drawTextCenter(
    ctx,
    headerCaption(v),
    header,
    s.resourceCaptionHeaderFont,
    s.resourceCaptionHeaderFontColor,
    scale,
  )

  const bodyH = size.height - s.rulerRowHeight
  if (bodyH <= 0) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, s.rulerRowHeight, s.resourceWidth, bodyH)
  ctx.clip()

  v.sortedResources.forEach((resource, i) => {
    const r: Rect = {
      x: 0,
      y: s.resourceRowHeight * i - v.scrollY + s.rulerRowHeight,
      w: s.resourceWidth,
      h: s.resourceRowHeight,
    }
    fillRect(ctx, r, resource.colorName ?? s.resourceCaptionBackColor)
    strokeRect(ctx, r, s.borderColor, scale)
    drawTextCenter(ctx, resource.resourceName, r, s.resourceCaptionFont, s.resourceCaptionFontColor, scale)
  })

  ctx.restore()
}

// ---------------------------------------------------------------------------
// 右侧点位区，对应 Gant.DrawResourceRightRow
// ---------------------------------------------------------------------------

export function drawRightArea(ctx: CanvasRenderingContext2D, v: RenderModel, size: Viewport): void {
  const s = v.style
  const bodyW = size.width - s.resourceWidth
  const bodyH = size.height - s.rulerRowHeight
  if (bodyW <= 0 || bodyH <= 0) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(s.resourceWidth, s.rulerRowHeight, bodyW, bodyH)
  ctx.clip()
  ctx.translate(s.resourceWidth, s.rulerRowHeight)
  // 平移后坐标系原点不在设备像素网格上，吸附必须带上平移量
  const scale: PixelScale = { ...v.scale, ox: s.resourceWidth, oy: s.rulerRowHeight }

  drawResourceRows(ctx, v, scale)
  drawPointObjects(ctx, v, scale)
  drawNowLine(ctx, v, scale)
  for (const appt of v.appointments) drawAppointmentBlock(ctx, v, appt, bodyW, scale)
  if (v.showLink) {
    for (const appt of v.appointments) drawLinkLine(ctx, v, appt, bodyW, scale)
  }

  ctx.restore()
}

function drawResourceRows(ctx: CanvasRenderingContext2D, v: RenderModel, scale: PixelScale): void {
  const s = v.style
  const width = timelineWidth(v)
  v.sortedResources.forEach((_, i) => {
    const r: Rect = {
      x: -v.scrollX,
      y: s.resourceRowHeight * i - v.scrollY,
      w: width,
      h: s.resourceRowHeight,
    }
    // 原版此处把 ResourceRowBackColor 注释掉，改用硬编码的 240,240,240
    fillRect(ctx, r, s.resourceRowBackColor)
    strokeRect(ctx, r, s.borderColor, scale)
  })
}

/** 对应 PointCell.DrawCell：行中央一个 5x5 蓝点。 */
function drawPointObjects(ctx: CanvasRenderingContext2D, v: RenderModel, scale: PixelScale): void {
  const s = v.style
  for (const point of v.pointObjects) {
    const index = resourceIndex(v, point.resourceId)
    if (index < 0) continue
    const rowY = s.resourceRowHeight * index - v.scrollY
    const x = worldXAt(v, point.start) - v.scrollX
    const r: Rect = { x, y: rowY + (s.resourceRowHeight - 5) / 2, w: 5, h: 5 }
    strokeRect(ctx, r, '#0000ff', scale)
  }
}

/** 对应 Gant.DrawDateNowLine。 */
function drawNowLine(ctx: CanvasRenderingContext2D, v: RenderModel, scale: PixelScale): void {
  const s = v.style
  const minutes = Math.trunc(minutesBetween(v.startDate, new Date()))
  const x = Math.trunc((minutes * s.ruleHourLength) / 60) - v.scrollX
  const limit = totalHours(v) * s.ruleHourLength
  if (x <= 0 || x >= limit) return
  const endY = s.resourceRowHeight * v.sortedResources.length - v.scrollY
  // 虚线长度按物理像素给定，2 物理像素宽
  line(ctx, x, 0, x, endY, s.nowLineColor, scale, 2, [4, 4])
}

/** 对应 AppointmentCell.DrawCell。 */
function drawAppointmentBlock(
  ctx: CanvasRenderingContext2D,
  v: RenderModel,
  appt: AppointmentObject,
  bodyW: number,
  scale: PixelScale,
): void {
  const s = v.style
  const outer = appointmentOuterRect(v, appt)
  const inner = appointmentInnerRect(v, appt)

  const scrollbar = v.scrollMetrics.vVisible ? s.scrollbarSize : 0
  if (outer.x + outer.w + s.ruleHourLength < 0) return
  if (outer.x + outer.w - s.ruleHourLength > bodyW - scrollbar) return

  const isSelected = v.selected.has(appt.appointmentId)
  const isStoveSelected = v.stoveSelected.has(appt.appointmentId)
  const back = resolveAppointmentColor(v, appt)

  if (isSelected) {
    fillRect(ctx, outer, s.appointmentSelectedColor)
  }

  if (isSelected) {
    fillRect(ctx, inner, s.appointmentInnerSelectedColor)
  } else if (isStoveSelected) {
    fillRect(ctx, outer, s.appointmentSelectedColor)
    fillRect(ctx, inner, s.stoveSelectedInnerColor)
  } else {
    if (v.overlapped.has(appt.appointmentId)) {
      fillRect(ctx, outer, s.overlapColor)
    }
    fillRect(ctx, inner, back)
  }

  drawBorder3D(ctx, inner, scale)

  const font = isSelected ? biggerFont(s.displayFont) : s.displayFont
  const fontColor = isSelected
    ? s.appointmentInnerSelectedColor
    : isStoveSelected
      ? s.stoveSelectedFontColor
      : s.displayFontColor

  // 上显示文本：居中压在块上方
  ctx.font = crispFont(font, scale.y)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = fontColor
  if (appt.headIdShowStr) {
    ctx.fillText(appt.headIdShowStr, snapX(inner.x + inner.w / 2, scale), snapY(inner.y, scale))
  }

  // 下显示文本：居中贴在块下方
  ctx.textBaseline = 'top'
  if (appt.pRelationId) {
    ctx.fillText(appt.pRelationId, snapX(inner.x + inner.w / 2, scale), snapY(inner.y + inner.h, scale))
  }

  // 浇次内序号 + 首炉标识
  if (appt.nSortJcActual != null) {
    const marker = appt.nJcBeg ? `${appt.nSortJcActual}首` : String(appt.nSortJcActual)
    ctx.textAlign = 'left'
    ctx.fillStyle = s.markerColor
    ctx.fillText(marker, snapX(inner.x, scale), snapY(inner.y - 2.9 * inner.h, scale))
  }

  // 尾炉标识
  if (appt.nJcEnd) {
    ctx.textAlign = 'left'
    ctx.fillStyle = s.markerColor
    ctx.fillText('尾', snapX(inner.x + inner.w - 15, scale), snapY(inner.y - 2.9 * inner.h, scale))
  }
}

function biggerFont(font: string): string {
  const size = fontLineHeight(font) / 1.2
  return font.replace(/(\d+(?:\.\d+)?)px/, `${size + 3}px`)
}

/** 对应 AppointmentCell.DrawLinkLine。 */
function drawLinkLine(
  ctx: CanvasRenderingContext2D,
  v: RenderModel,
  appt: AppointmentObject,
  bodyW: number,
  scale: PixelScale,
): void {
  const s = v.style
  const outer = appointmentOuterRect(v, appt)
  const inner = appointmentInnerRect(v, appt)

  const scrollbar = v.scrollMetrics.vVisible ? s.scrollbarSize : 0
  if (outer.x + outer.w + s.ruleHourLength < 0) return
  if (outer.x + outer.w - s.ruleHourLength > bodyW - scrollbar) return

  const endY = inner.y + inner.h / 2
  const toX = outer.x

  const draw = (fromId: string): void => {
    const from = v.appointments.find((m) => m.appointmentId === fromId)
    if (!from) return
    const fromOuter = appointmentOuterRect(v, from)
    const fromInner = appointmentInnerRect(v, from)
    const fromX = fromOuter.x + fromOuter.w
    const fromY = fromInner.y + fromInner.h / 2
    const color = isLinkConflict(from, appt) ? s.linkConflictColor : resolveAppointmentColor(v, from)
    line(ctx, fromX, fromY, toX, endY, color, scale, 2)
  }

  const prev = v.previousOf.get(appt.appointmentId)
  if (prev) {
    draw(prev)
    return
  }
  for (const diffId of v.previousDiffOf.get(appt.appointmentId) ?? []) {
    draw(diffId)
  }
}

// ---------------------------------------------------------------------------
// GridLine 与准星
// ---------------------------------------------------------------------------

/** 对应 Gant.DrawGridLines + GridLineCell.DrawCell（客户端坐标）。 */
export function drawGridLines(ctx: CanvasRenderingContext2D, v: RenderModel, size: Viewport): void {
  const s = v.style
  for (const gl of v.gridLines) {
    const x = gridLineClientX(v, gl)
    if (x < s.resourceWidth) continue
    if (gl.selected) {
      strokeRect(ctx, { x, y: 10, w: 16, h: 16 }, s.gridLineColor, v.scale)
    }
    line(ctx, x + 8, 23, x + 8, size.height, s.gridLineColor, v.scale)
  }
}

/** 对应 Gant.DrawGant 末尾那条跟随鼠标的紫色竖线与时间文本。 */
export function drawCrosshair(ctx: CanvasRenderingContext2D, v: RenderModel, size: Viewport): void {
  if (!v.pointer) return
  const s = v.style
  const x = v.pointer.x
  line(ctx, x, 0, x, size.height, s.crosshairColor, v.scale)

  const t = timeAtClientX(v, x)
  const text = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`
  ctx.font = crispFont('12px sans-serif', v.scale.y)
  ctx.fillStyle = s.crosshairColor
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(text, snapX(x, v.scale), 0)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// ---------------------------------------------------------------------------
// 滚动条
// ---------------------------------------------------------------------------

export interface ScrollbarThumbs {
  v: Rect | null
  h: Rect | null
}

/** 竖向滚动条的可拖动轨道范围（不含两端留白）。 */
export function verticalTrack(
  metrics: ScrollMetrics,
  style: GanttStyle,
  size: Viewport,
): { x: number; y: number; length: number } {
  return {
    x: size.width - style.scrollbarSize,
    y: style.rulerRowHeight,
    length: size.height - style.rulerRowHeight - (metrics.hVisible ? style.scrollbarSize : 0),
  }
}

/** 横向滚动条的可拖动轨道范围。 */
export function horizontalTrack(
  metrics: ScrollMetrics,
  style: GanttStyle,
  size: Viewport,
): { x: number; y: number; length: number } {
  return {
    x: style.resourceWidth,
    y: size.height - style.scrollbarSize,
    length: size.width - style.resourceWidth - (metrics.vVisible ? style.scrollbarSize : 0),
  }
}

/**
 * 滑块矩形。
 * WinForms 的取值区间是 [0, Maximum - LargeChange + 1]，滑块长度按 LargeChange
 * 占满量程的比例换算，并给一个最小长度避免太短抓不住。
 */
export function scrollbarThumbs(
  metrics: ScrollMetrics,
  style: GanttStyle,
  size: Viewport,
  scrollX: number,
  scrollY: number,
): ScrollbarThumbs {
  const bar = style.scrollbarSize
  let v: Rect | null = null
  let h: Rect | null = null

  if (metrics.vVisible) {
    const track = verticalTrack(metrics, style, size)
    const thumbH = Math.max(24, (track.length * metrics.vLargeChange) / Math.max(1, metrics.vMax + metrics.vLargeChange))
    const travel = Math.max(0, track.length - thumbH)
    const y = track.y + (metrics.vMax > 0 ? (scrollY / metrics.vMax) * travel : 0)
    v = { x: track.x, y, w: bar, h: thumbH }
  }

  if (metrics.hVisible) {
    const track = horizontalTrack(metrics, style, size)
    const thumbW = Math.max(24, (track.length * metrics.hLargeChange) / Math.max(1, metrics.hMax + metrics.hLargeChange))
    const travel = Math.max(0, track.length - thumbW)
    const x = track.x + (metrics.hMax > 0 ? (scrollX / metrics.hMax) * travel : 0)
    h = { x, y: track.y, w: thumbW, h: bar }
  }

  return { v, h }
}

export function drawScrollbars(
  ctx: CanvasRenderingContext2D,
  v: RenderModel,
  size: Viewport,
  thumbs: ScrollbarThumbs,
): void {
  const s = v.style
  const bar = s.scrollbarSize

  if (v.scrollMetrics.vVisible) {
    const trackH = size.height - s.rulerRowHeight - (v.scrollMetrics.hVisible ? bar : 0)
    fillRect(ctx, { x: size.width - bar, y: s.rulerRowHeight, w: bar, h: trackH }, '#f0f0f0')
    if (thumbs.v) {
      fillRect(ctx, thumbs.v, '#c0c0c0')
      strokeRect(ctx, thumbs.v, '#808080', v.scale)
    }
  }

  if (v.scrollMetrics.hVisible) {
    const trackW = size.width - s.resourceWidth - (v.scrollMetrics.vVisible ? bar : 0)
    fillRect(ctx, { x: s.resourceWidth, y: size.height - bar, w: trackW, h: bar }, '#f0f0f0')
    if (thumbs.h) {
      fillRect(ctx, thumbs.h, '#c0c0c0')
      strokeRect(ctx, thumbs.h, '#808080', v.scale)
    }
  }
}

/** 供命中测试复用：某个客户端 Y 落在哪一行资源上。 */
export function resourceRowAt(
  v: RenderModel,
  size: Viewport,
  clientY: number,
): ResourceObject | null {
  for (let i = 0; i < v.sortedResources.length; i++) {
    const r = rowClientRect(v, i, size.width)
    if (clientY >= r.y && clientY < r.y + r.h) return v.sortedResources[i]
  }
  return null
}
