/**
 * 控件主体，对应 Gant.cs。
 *
 * 负责：状态持有、选中与拖动交互、滚动、右键菜单、公开 API 与事件分发。
 * 绘制交给 renderer.ts，业务规则交给 rules.ts，坐标换算交给 geometry.ts。
 *
 * 与 WinForms 版的差异见 README「已知偏差」一节。
 */

import {
  computeScrollMetrics,
  containsPoint,
  appointmentOuterRect,
  resourceIndex,
  sortResources,
  timeAtClientX,
  toClientRect,
  type ScrollMetrics,
} from './geometry'
import {
  EditState,
  GantError,
  newAppointmentId,
  SelectModel,
  type AppointmentObject,
  type GridLine,
  type PointObject,
  type ResourceObject,
} from './model'
import {
  assertNoActualTime,
  moveSelectedHorizontally,
  moveSelectedVertically,
} from './rules'
import {
  drawCrosshair,
  drawGridLines,
  drawLeftColumn,
  drawRightArea,
  drawRuler,
  drawScrollbars,
  horizontalTrack,
  resourceRowAt,
  scrollbarThumbs,
  verticalTrack,
  type RenderModel,
  type Viewport,
} from './renderer'
import { createDefaultStyle, type GanttStyle } from './style'
import { gridLineClientX } from './geometry'

export interface GanttEventHandlers {
  /** 对应 Events_AppointmentClick */
  appointmentClick?: (appt: AppointmentObject | null, chart: GanttChart) => void
  /** 对应 Events_GantException，宿主决定如何提示 */
  gantException?: (err: GantError) => void
  /** 对应 Gantt_Events_OnMouseDownAfter */
  mouseDownAfter?: (appt: AppointmentObject | null) => void
  /** 对应 Gantt_Events_OnMouseUpAfter */
  mouseUpAfter?: (appt: AppointmentObject | null) => void
  /** 对应 Gantt_Events_OnMouseDoubleClick */
  mouseDoubleClick?: (appt: AppointmentObject | null) => void
  /** 对应 Gantt_Events_SelectedToolStripMenuItem（扩展点，原版右键菜单未触发） */
  contextMenuAction?: (action: string) => void
}

export interface GanttOptions {
  style?: Partial<GanttStyle>
  startDate?: Date
  endDate?: Date
  resources?: ResourceObject[]
  appointments?: AppointmentObject[]
  selectModel?: SelectModel
  canMoveHorizontal?: boolean
  canMoveVertical?: boolean
  showLink?: boolean
}

type DragKind = 'vthumb' | 'hthumb' | 'vtrack' | 'htrack'

export class GanttChart {
  readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly resizeObserver: ResizeObserver
  private readonly disposers: Array<() => void> = []

  // --- LayoutView 的实现 -----------------------------------------------------
  style: GanttStyle
  startDate: Date
  endDate: Date
  scrollX = 0
  scrollY = 0
  sortedResources: ResourceObject[] = []

  // --- RenderModel 的实现 ----------------------------------------------------
  appointments: AppointmentObject[] = []
  pointObjects: PointObject[] = []
  gridLines: GridLine[] = []
  selected = new Set<string>()
  currentId: string | null = null
  stoveSelected = new Set<string>()
  overlapped = new Set<string>()
  previousOf = new Map<string, string>()
  previousDiffOf = new Map<string, string[]>()
  showLink = true
  scrollMetrics: ScrollMetrics
  pointer: { x: number; y: number } | null = null

  // --- 配置 ------------------------------------------------------------------
  resources: ResourceObject[] = []
  selectModel: SelectModel = SelectModel.Single
  canMoveHorizontal = false
  canMoveVertical = false
  handlers: GanttEventHandlers = {}

  // --- 交互中间态 ------------------------------------------------------------
  private isMouseDown = false
  private isMustMouseUp = false
  private lastMovePoint = { x: 0, y: 0 }
  private lastGridLinePoint = { x: 0, y: 0 }
  private currentCellIds: string[] = []
  private drag: { kind: DragKind; startX: number; startY: number; startScrollX: number; startScrollY: number } | null =
    null
  private menu: HTMLDivElement | null = null
  private disposed = false
  /** 缓冲尺寸 / CSS 尺寸的实际比值，两个轴分别记录 */
  scale: { x: number; y: number; ox: number; oy: number } = { x: 1, y: 1, ox: 0, oy: 0 }

  constructor(canvas: HTMLCanvasElement, options: GanttOptions = {}) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法获取 2D 绘图上下文')
    this.ctx = ctx

    this.style = { ...createDefaultStyle(), ...options.style }
    this.startDate = options.startDate ?? new Date()
    this.endDate = options.endDate ?? new Date()
    this.resources = options.resources ?? []
    this.appointments = options.appointments ?? []
    this.selectModel = options.selectModel ?? SelectModel.Single
    this.canMoveHorizontal = options.canMoveHorizontal ?? false
    this.canMoveVertical = options.canMoveVertical ?? false
    this.showLink = options.showLink ?? true

    this.sortedResources = sortResources(this.resources)
    this.scrollMetrics = computeScrollMetrics(this, this.viewport().width, this.viewport().height)

    this.attachEvents()
    this.watchDpr()
    this.resizeObserver = new ResizeObserver(() => this.render())
    this.resizeObserver.observe(canvas)
  }

  // ---------------------------------------------------------------------------
  // 尺寸与视口
  // ---------------------------------------------------------------------------

  viewport(): Viewport {
    const rect = this.canvas.getBoundingClientRect()
    return {
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    }
  }

  /**
   * 实际使用的设备像素比。
   *
   * 高分屏上直接乘 window.devicePixelRatio 会让绘图缓冲按物理像素膨胀，
   * 一旦超出浏览器的 canvas 上限（单边 65535、总面积约 2.68 亿像素，
   * 移动端 Safari 更低），canvas 会直接分配失败、整块变空白。
   * 这里按单边与总面积双限制把 DPR 压到安全范围，代价只是画面略微变软。
   */
  private effectiveDpr(size: Viewport): number {
    const raw = window.devicePixelRatio || 1
    const MAX_SIDE = 8192
    // 1600 万像素：够 5K 屏（约 1470 万）保持原生清晰度，
    // 又低于移动端 Safari 的 canvas 面积上限（约 1678 万）
    const MAX_AREA = 16_000_000
    const bySide = Math.min(MAX_SIDE / size.width, MAX_SIDE / size.height)
    const byArea = Math.sqrt(MAX_AREA / (size.width * size.height))
    return Math.max(1, Math.min(raw, bySide, byArea))
  }

  private syncCanvasSize(): Viewport {
    const size = this.viewport()
    const dpr = this.effectiveDpr(size)
    const pixelW = Math.max(1, Math.round(size.width * dpr))
    const pixelH = Math.max(1, Math.round(size.height * dpr))
    if (this.canvas.width !== pixelW || this.canvas.height !== pixelH) {
      this.canvas.width = pixelW
      this.canvas.height = pixelH
    }
    // 缩放比从「取整后的缓冲尺寸 / CSS 尺寸」反推，而不是直接用 dpr：
    // 缓冲尺寸必须取整，直接用 dpr 会让缩放比与缓冲对不上，
    // 线条就会落到非整数物理像素上、重新变得模糊。
    this.scale = { x: pixelW / size.width, y: pixelH / size.height, ox: 0, oy: 0 }
    return size
  }

  /**
   * 监听 DPR 变化（窗口在不同缩放的显示器之间移动、或页面缩放时会变）。
   *
   * window.devicePixelRatio 带浮点噪声（1.25 实际是 1.2500000298），
   * 直接拼进媒体查询会匹配不上，所以先四舍五入到两位小数。
   * 同时补一个 window.resize 监听兜底，因为只改缩放时画布的 CSS 尺寸可能不变，
   * ResizeObserver 不会触发。
   */
  private watchDpr(): void {
    if (this.disposed) return
    const key = (window.devicePixelRatio || 1).toFixed(2)
    const query = window.matchMedia(`(resolution: ${key}dppx)`)
    const onChange = (): void => {
      query.removeEventListener('change', onChange)
      this.render()
      this.watchDpr()
    }
    query.addEventListener('change', onChange)
    this.disposers.push(() => query.removeEventListener('change', onChange))

    const onResize = (): void => this.render()
    window.addEventListener('resize', onResize)
    this.disposers.push(() => window.removeEventListener('resize', onResize))
  }

  // ---------------------------------------------------------------------------
  // 派生状态
  // ---------------------------------------------------------------------------

  /**
   * 重建连线关系，对应 Gant.BindingData 里构建 PreviousCell /
   * PreviousCellWithDiffHeadIdList 的两段逻辑。
   */
  private rebuildDerived(): void {
    this.previousOf.clear()
    this.previousDiffOf.clear()

    const all = this.appointments
    for (const appt of all) {
      let best: AppointmentObject | null = null
      for (const m of all) {
        if (m.headId !== appt.headId || m.seq >= appt.seq) continue
        if (!best || m.seq > best.seq) best = m
      }
      if (best) this.previousOf.set(appt.appointmentId, best.appointmentId)
    }

    for (const appt of all) {
      if (this.previousOf.has(appt.appointmentId)) continue
      if (appt.previousDiffHeadIds.length === 0) continue

      const byHead = new Map<string, AppointmentObject>()
      for (const m of all) {
        if (!appt.previousDiffHeadIds.includes(m.headId)) continue
        const cur = byHead.get(m.headId)
        if (!cur || m.seq > cur.seq) byHead.set(m.headId, m)
      }
      if (byHead.size === 0) continue
      this.previousDiffOf.set(
        appt.appointmentId,
        [...byHead.values()].map((m) => m.appointmentId),
      )
    }
  }

  private updateMetrics(): void {
    const size = this.viewport()
    this.scrollMetrics = computeScrollMetrics(this, size.width, size.height)
    this.scrollX = clamp(this.scrollX, 0, this.scrollMetrics.hMax)
    this.scrollY = clamp(this.scrollY, 0, this.scrollMetrics.vMax)
  }

  // ---------------------------------------------------------------------------
  // 公开 API
  // ---------------------------------------------------------------------------

  /** 对应 Gant.BindingData：重建派生状态、重置滚动与选中，并把视图滚到当前时间附近。 */
  bindingData(): void {
    this.scrollX = 0
    this.scrollY = 0
    this.sortedResources = sortResources(this.resources)
    this.rebuildDerived()
    this.clearSelectionInternal()

    this.updateMetrics()
    // 原版初始横向位置：当前时间往前 2 小时
    const minutes = (Date.now() - this.startDate.getTime()) / 60000 - 120
    const num = Math.trunc((minutes * this.style.ruleHourLength) / 60)
    if (num > 0 && num < this.scrollMetrics.hMax) this.scrollX = num

    this.render()
  }

  addAppointment(appt: AppointmentObject): void {
    if (!appt.appointmentId) appt.appointmentId = newAppointmentId()
    appt.editState = EditState.New
    if (this.appointments.some((m) => m.appointmentId === appt.appointmentId)) {
      throw new Error(`已经存在数据${appt.headIdShowStr}！`)
    }
    this.appointments.push(appt)
    this.rebuildDerived()
    this.render()
  }

  /** 返回 null 表示该点位是新增后又被删除，宿主无需回传后端。 */
  removeAppointment(appointmentId: string): AppointmentObject | null {
    const idx = this.appointments.findIndex((m) => m.appointmentId === appointmentId)
    if (idx < 0) return null
    const [removed] = this.appointments.splice(idx, 1)
    this.selected.delete(appointmentId)
    if (this.currentId === appointmentId) this.currentId = null
    this.rebuildDerived()
    this.render()
    return removed.editState === EditState.New ? null : removed
  }

  editAppointment(appt: AppointmentObject): void {
    const target = this.appointments.find((m) => m.appointmentId === appt.appointmentId)
    if (!target) return
    target.resourceId = appt.resourceId
    target.editState = appt.editState === EditState.New ? EditState.New : EditState.Edit
    this.rebuildDerived()
    this.render()
  }

  /** 对应 Gant.RefushState。 */
  refreshState(): void {
    for (const m of this.appointments) m.editState = EditState.Normal
  }

  /** 对应 Gant.GetTimeByPointToClient。 */
  getTimeByPointToClient(x: number, y: number): Date {
    void y
    return timeAtClientX(this, x)
  }

  /** 对应 Gant.GetResourceLine。 */
  getResourceLine(x: number, y: number): ResourceObject | null {
    void x
    return resourceRowAt(this, this.viewport(), y)
  }

  /** 对应 Gant.ClearSelect。 */
  clearSelect(): void {
    this.clearSelectionInternal()
    this.render()
    this.handlers.appointmentClick?.(null, this)
  }

  /** 同炉联动高亮，对应 FrmMS2000 在 Events_AppointmentClick 里设置 IsSelectedByStoveSelected。 */
  setStoveHighlight(headId: string | null): void {
    this.stoveSelected.clear()
    if (headId != null) {
      for (const m of this.appointments) {
        if (m.headId === headId) this.stoveSelected.add(m.appointmentId)
      }
    }
    this.render()
  }

  /** 设置与其它点位重叠的标记集合。 */
  setOverlapped(ids: Iterable<string>): void {
    this.overlapped = new Set(ids)
    this.render()
  }

  get currentAppointment(): AppointmentObject | null {
    return this.appointments.find((m) => m.appointmentId === this.currentId) ?? null
  }

  get selectedAppointments(): AppointmentObject[] {
    return this.appointments.filter((m) => this.selected.has(m.appointmentId))
  }

  invalidate(): void {
    this.render()
  }

  destroy(): void {
    this.disposed = true
    this.resizeObserver.disconnect()
    for (const dispose of this.disposers) dispose()
    this.disposers.length = 0
    this.closeMenu()
  }

  // ---------------------------------------------------------------------------
  // 渲染
  // ---------------------------------------------------------------------------

  render(): void {
    if (this.disposed) return
    const size = this.syncCanvasSize()
    const ctx = this.ctx

    ctx.setTransform(this.scale.x, 0, 0, this.scale.y, 0, 0)
    ctx.clearRect(0, 0, size.width, size.height)
    ctx.fillStyle = this.style.resourceCaptionHeaderBackColor
    ctx.fillRect(0, 0, size.width, size.height)

    this.updateMetrics()

    const model = this as unknown as RenderModel
    const thumbs = scrollbarThumbs(this.scrollMetrics, this.style, size, this.scrollX, this.scrollY)

    drawRuler(ctx, model, size)
    drawLeftColumn(ctx, model, size)
    drawRightArea(ctx, model, size)
    drawGridLines(ctx, model, size)
    drawScrollbars(ctx, model, size, thumbs)
    drawCrosshair(ctx, model, size)
  }

  // ---------------------------------------------------------------------------
  // 命中测试
  // ---------------------------------------------------------------------------

  /** 命中鼠标的点位，按外框 X 从右到左排序，对应原版的 OrderByDescending(rectangle.X)。 */
  private hitAppointments(clientX: number, clientY: number): AppointmentObject[] {
    return this.appointments
      .filter((a) => containsPoint(toClientRect(this, appointmentOuterRect(this, a)), clientX, clientY))
      .sort((a, b) => appointmentOuterRect(this, b).x - appointmentOuterRect(this, a).x)
  }

  private appointmentById(id: string): AppointmentObject | undefined {
    return this.appointments.find((m) => m.appointmentId === id)
  }

  private resourceOf(appt: AppointmentObject | undefined): ResourceObject | undefined {
    if (!appt) return undefined
    const index = resourceIndex(this, appt.resourceId)
    return index < 0 ? undefined : this.sortedResources[index]
  }

  private emitError(err: unknown): void {
    const error = err instanceof GantError ? err : new GantError(String(err))
    if (this.handlers.gantException) this.handlers.gantException(error)
    else console.warn('[GanttChart]', error.message)
  }

  // ---------------------------------------------------------------------------
  // 事件绑定
  // ---------------------------------------------------------------------------

  private attachEvents(): void {
    const el = this.canvas

    const on = <K extends keyof HTMLElementEventMap>(
      type: K,
      listener: (ev: HTMLElementEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ): void => {
      el.addEventListener(type, listener as EventListener, options)
      this.disposers.push(() => el.removeEventListener(type, listener as EventListener, options))
    }

    on('pointerdown', (e) => this.onPointerDown(e))
    on('pointermove', (e) => this.onPointerMove(e))
    on('pointerup', (e) => this.onPointerUp(e))
    on('pointerleave', () => {
      this.pointer = null
      this.render()
    })
    on('dblclick', (e) => this.onDoubleClick(e))
    on('wheel', (e) => this.onWheel(e), { passive: false })
    on('contextmenu', (e) => this.onContextMenu(e))
    on('pointercancel', () => {
      this.isMouseDown = false
      this.drag = null
    })
  }

  private localPoint(e: PointerEvent | MouseEvent | WheelEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  private onPointerDown(e: PointerEvent): void {
    const p = this.localPoint(e)
    this.canvas.setPointerCapture(e.pointerId)

    if (e.button === 2) return
    if (this.beginScrollbarDrag(p)) return

    this.selectAppointment(e, p)
    this.selectGridLine(p)
    this.handlers.mouseDownAfter?.(this.currentAppointment)
    this.render()
  }

  private onPointerMove(e: PointerEvent): void {
    const p = this.localPoint(e)
    this.pointer = p

    if (this.drag) {
      this.applyScrollbarDrag(p)
      this.render()
      return
    }

    const leftDown = (e.buttons & 1) === 1
    if (leftDown) {
      if (this.isMouseDown) {
        this.moveHorizontal(p)
        this.moveVertical(p)
      }
      this.moveGridLine(p)
    }
    this.render()
  }

  private onPointerUp(e: PointerEvent): void {
    const p = this.localPoint(e)
    if (this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId)
    }
    if (this.drag) {
      this.drag = null
      return
    }

    if (this.isMustMouseUp) {
      this.advanceToNextCell(p)
      this.isMustMouseUp = false
    } else {
      this.isMouseDown = false
    }

    for (const gl of this.gridLines) gl.selected = false
    this.render()
    this.handlers.mouseUpAfter?.(this.currentAppointment)
  }

  private onDoubleClick(e: MouseEvent): void {
    const p = this.localPoint(e)
    this.selectAppointment(e, p)
    this.selectGridLine(p)
    this.handlers.mouseDoubleClick?.(this.currentAppointment)
    this.render()
  }

  // ---------------------------------------------------------------------------
  // 选中，对应 Gant.SelectAppointment / OnMouseUp
  // ---------------------------------------------------------------------------

  private selectAppointment(e: PointerEvent | MouseEvent, p: { x: number; y: number }): void {
    if (e.button !== 0) return
    // 原版只实现了 SelectModel.Single 分支
    if (this.selectModel !== SelectModel.Single) return

    this.isMouseDown = true
    this.lastMovePoint = p

    const ctrl = e.ctrlKey || e.metaKey
    const hits = this.hitAppointments(p.x, p.y)

    if (ctrl) {
      const hit = hits[0]
      if (hit) {
        this.currentId = hit.appointmentId
        this.selected.add(hit.appointmentId)
      } else {
        this.currentId = null
        this.selected.clear()
      }
      this.render()
      this.handlers.appointmentClick?.(this.currentAppointment, this)
      return
    }

    this.currentCellIds = hits.map((a) => a.appointmentId)

    if (hits.length === 0) {
      if (this.currentId != null) {
        this.selected.clear()
        this.render()
      }
      this.currentId = null
      this.handlers.appointmentClick?.(null, this)
      return
    }

    if (this.currentId == null) {
      this.currentId = hits[0].appointmentId
      this.selected.add(this.currentId)
      this.render()
      this.handlers.appointmentClick?.(this.currentAppointment, this)
      return
    }

    const resource = this.resourceOf(this.appointmentById(this.currentId))
    // 连铸资源且允许移动时，按下后直接进入拖动；否则松开时切到下一个点位
    this.isMustMouseUp = !(resource?.isCcmResource && (this.canMoveHorizontal || this.canMoveVertical))
  }

  /** 对应 Gant.OnMouseUp 里 isMustMouseUp 分支：松开时把选中切到相邻点位。 */
  private advanceToNextCell(p: { x: number; y: number }): void {
    const current = this.appointmentById(this.currentId ?? '')
    if (!current) return

    const candidates = this.currentCellIds
      .map((id) => this.appointmentById(id))
      .filter((a): a is AppointmentObject => a != null)

    let next = candidates
      .filter((a) => a.relationId > current.relationId)
      .sort((a, b) => (a.relationId < b.relationId ? -1 : 1))[0]
    if (!next) {
      next = candidates
        .filter((a) => a.relationId < current.relationId)
        .sort((a, b) => (a.relationId < b.relationId ? -1 : 1))[0]
    }
    if (!next) return

    const under = this.hitAppointments(p.x, p.y)
    if (!under.some((a) => a.appointmentId === next!.appointmentId)) return

    this.selected.clear()
    this.currentId = next.appointmentId
    this.selected.add(next.appointmentId)
    this.render()
    this.handlers.appointmentClick?.(next, this)
  }

  private clearSelectionInternal(): void {
    this.selected.clear()
    this.currentId = null
    this.currentCellIds = []
    this.stoveSelected.clear()
  }

  // ---------------------------------------------------------------------------
  // 拖动，对应 Gant.MoveHorizontalAppointment / MoveVerticalAppointment / MoveLine
  // ---------------------------------------------------------------------------

  private moveHorizontal(p: { x: number; y: number }): void {
    if (this.canMoveHorizontal) {
      const selected = this.selectedAppointments
      if (selected.length > 0) {
        try {
          assertNoActualTime(selected)
          const dx = p.x - this.lastMovePoint.x
          moveSelectedHorizontally(this, selected, dx)
          this.rebuildDerived()
          this.render()
        } catch (err) {
          this.emitError(err)
        }
      }
      this.lastMovePoint = p
    }
  }

  private moveVertical(p: { x: number; y: number }): void {
    if (!this.canMoveVertical) return
    const selected = this.selectedAppointments
    if (selected.length === 0) return

    try {
      assertNoActualTime(selected)
    } catch (err) {
      this.emitError(err)
      return
    }

    const target = resourceRowAt(this, this.viewport(), p.y)
    if (!target) return

    try {
      moveSelectedVertically(this, selected, target)
      this.rebuildDerived()
      this.render()
    } catch (err) {
      this.emitError(err)
    }
  }

  private moveGridLine(p: { x: number; y: number }): void {
    const gl = this.gridLines.find((g) => g.selected)
    if (!gl) return
    const dx = p.x - this.lastGridLinePoint.x
    const seconds = (dx * 3600) / this.style.ruleHourLength
    gl.timeValue = new Date(gl.timeValue.getTime() + seconds * 1000)
    this.lastGridLinePoint = p
  }

  /** 对应 Gant.SelectGridLine：在刻度行内按下可选中一条竖线。 */
  private selectGridLine(p: { x: number; y: number }): void {
    if (p.x <= this.style.resourceWidth || p.y >= this.style.rulerRowHeight) return
    for (const gl of this.gridLines) {
      const rect = { x: gridLineClientX(this, gl), y: 10, w: 16, h: 16 }
      if (containsPoint(rect, p.x, p.y)) gl.selected = true
    }
    this.lastGridLinePoint = p
  }

  // ---------------------------------------------------------------------------
  // 滚轮，对应 Gant.OnMouseWheel
  // ---------------------------------------------------------------------------

  private onWheel(e: WheelEvent): void {
    e.preventDefault()
    const lines = 3
    const up = e.deltaY < 0

    if (e.ctrlKey) {
      if (this.scrollMetrics.hVisible) this.scrollHorizontal(up, lines * 25)
    } else if (this.scrollMetrics.vVisible) {
      this.scrollVertical(up, lines * 15)
    } else {
      this.scrollHorizontal(up, lines * 25)
    }
    this.render()
  }

  private scrollHorizontal(up: boolean, delta: number): void {
    const next = up ? this.scrollX - delta : this.scrollX + delta
    this.scrollX = clamp(next, 0, this.scrollMetrics.hMax)
  }

  private scrollVertical(up: boolean, delta: number): void {
    const next = up ? this.scrollY - delta : this.scrollY + delta
    this.scrollY = clamp(next, 0, this.scrollMetrics.vMax)
  }

  // ---------------------------------------------------------------------------
  // 滚动条拖动
  // ---------------------------------------------------------------------------

  private beginScrollbarDrag(p: { x: number; y: number }): boolean {
    const size = this.viewport()
    const thumbs = scrollbarThumbs(this.scrollMetrics, this.style, size, this.scrollX, this.scrollY)
    const bar = this.style.scrollbarSize

    if (this.scrollMetrics.vVisible) {
      const track = verticalTrack(this.scrollMetrics, this.style, size)
      if (p.x >= size.width - bar && p.y >= track.y && p.y < track.y + track.length) {
        const kind: DragKind = thumbs.v && containsPoint(thumbs.v, p.x, p.y) ? 'vthumb' : 'vtrack'
        if (kind === 'vtrack' && thumbs.v) {
          this.scrollY = clamp(this.scrollY + (p.y < thumbs.v.y ? -this.scrollMetrics.vLargeChange : this.scrollMetrics.vLargeChange), 0, this.scrollMetrics.vMax)
        }
        this.drag = { kind, startX: p.x, startY: p.y, startScrollX: this.scrollX, startScrollY: this.scrollY }
        return true
      }
    }

    if (this.scrollMetrics.hVisible) {
      const track = horizontalTrack(this.scrollMetrics, this.style, size)
      if (p.y >= size.height - bar && p.x >= track.x && p.x < track.x + track.length) {
        const kind: DragKind = thumbs.h && containsPoint(thumbs.h, p.x, p.y) ? 'hthumb' : 'htrack'
        if (kind === 'htrack' && thumbs.h) {
          this.scrollX = clamp(this.scrollX + (p.x < thumbs.h.x ? -this.scrollMetrics.hLargeChange : this.scrollMetrics.hLargeChange), 0, this.scrollMetrics.hMax)
        }
        this.drag = { kind, startX: p.x, startY: p.y, startScrollX: this.scrollX, startScrollY: this.scrollY }
        return true
      }
    }

    return false
  }

  private applyScrollbarDrag(p: { x: number; y: number }): void {
    if (!this.drag) return
    const size = this.viewport()
    const thumbs = scrollbarThumbs(this.scrollMetrics, this.style, size, this.drag.startScrollX, this.drag.startScrollY)

    if (this.drag.kind === 'vthumb' && thumbs.v) {
      const track = verticalTrack(this.scrollMetrics, this.style, size)
      const travel = Math.max(1, track.length - thumbs.v.h)
      const dy = p.y - this.drag.startY
      this.scrollY = clamp(this.drag.startScrollY + (dy / travel) * this.scrollMetrics.vMax, 0, this.scrollMetrics.vMax)
    } else if (this.drag.kind === 'hthumb' && thumbs.h) {
      const track = horizontalTrack(this.scrollMetrics, this.style, size)
      const travel = Math.max(1, track.length - thumbs.h.w)
      const dx = p.x - this.drag.startX
      this.scrollX = clamp(this.drag.startScrollX + (dx / travel) * this.scrollMetrics.hMax, 0, this.scrollMetrics.hMax)
    }
  }

  // ---------------------------------------------------------------------------
  // 右键菜单，对应 Gant 构造函数里添加的“放大行距 / 缩小行距”
  // ---------------------------------------------------------------------------

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault()
    this.closeMenu()

    const items: Array<{ action: string; text: string; run: () => void }> = [
      {
        action: 'Zoom_Increase',
        text: '放大行距',
        run: () => {
          this.style.resourceRowHeight += 1
        },
      },
      {
        action: 'Zoom_Decrease',
        text: '缩小行距',
        run: () => {
          if (this.style.resourceRowHeight >= 6) this.style.resourceRowHeight -= 1
        },
      },
    ]

    const menu = document.createElement('div')
    menu.className = 'gantt-context-menu'
    menu.style.position = 'fixed'
    menu.style.left = `${e.clientX}px`
    menu.style.top = `${e.clientY}px`
    menu.style.zIndex = '9999'
    menu.style.background = '#f5f5f5'
    menu.style.border = '1px solid #999'
    menu.style.boxShadow = '2px 2px 6px rgba(0,0,0,.25)'
    menu.style.padding = '2px 0'
    menu.style.minWidth = '110px'
    menu.style.font = '13px "SimSun", "Microsoft YaHei", sans-serif'

    for (const item of items) {
      const row = document.createElement('div')
      row.textContent = item.text
      row.style.padding = '4px 14px'
      row.style.cursor = 'default'
      row.addEventListener('mouseenter', () => {
        row.style.background = '#d0d0d0'
      })
      row.addEventListener('mouseleave', () => {
        row.style.background = 'transparent'
      })
      row.addEventListener('click', () => {
        item.run()
        this.closeMenu()
        this.render()
        this.handlers.contextMenuAction?.(item.action)
      })
      menu.appendChild(row)
    }

    document.body.appendChild(menu)
    this.menu = menu

    const close = (ev: MouseEvent): void => {
      if (this.menu && ev.target instanceof Node && this.menu.contains(ev.target)) return
      this.closeMenu()
    }
    setTimeout(() => document.addEventListener('pointerdown', close, { once: true }), 0)
  }

  private closeMenu(): void {
    this.menu?.remove()
    this.menu = null
  }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}
