/**
 * 业务规则层。
 *
 * 原版把这些规则直接写在 Gant.cs 的鼠标事件里（MoveHorizontalAppointment /
 * MoveVerticalAppointment），并且会顺手改写 RelationId（炉号）。移植时抽成
 * 独立纯函数，宿主可以替换或关闭，避免 MES 业务规则埋进渲染代码。
 *
 * 对应原版方法：
 *   Gant.MoveHorizontalAppointment  → moveSelectedHorizontally
 *   Gant.MoveVerticalAppointment    → moveSelectedVertically
 *   AppointmentCell.DrawCell 的配色分支 → resolveAppointmentColor
 *   AppointmentCell.DrawLinkLine 的冲突判断 → isLinkConflict
 */

import {
  appointmentStart,
  minutesBetween,
  resourceIndex,
} from './geometry'
import type { LayoutView } from './geometry'
import {
  EditState,
  GantError,
  newGroupId,
  yearMonthCode,
  type AppointmentObject,
  type ResourceObject,
} from './model'

export interface RuleContext extends LayoutView {
  appointments: readonly AppointmentObject[]
}

function resourceById(ctx: RuleContext, resourceId: string): ResourceObject | undefined {
  return ctx.sortedResources.find((r) => r.resourceId === resourceId)
}

/** 用于排序与比较的时间：有实际用实际，否则用计划。 */
function effectiveTime(appt: AppointmentObject): number {
  return appointmentStart(appt).getTime()
}

/**
 * 对应原版在两处拖动入口的同一段判断：
 * 选中点位里只要有一个已有实际时间，就禁止拖动并抛出“炉次X 已经有实际开始时间或结束时间禁止拖动”。
 */
export function assertNoActualTime(appointments: readonly AppointmentObject[]): void {
  const blocked = appointments.find(
    (a) => a.startTimeAct != null || a.endTimeAct != null,
  )
  if (blocked) {
    throw new GantError(
      `炉次${blocked.headIdShowStr} 已经有实际开始时间或结束时间禁止拖动`,
    )
  }
}

/**
 * 对应 Gant.MoveVerticalAppointment 里的资源组校验：
 * 垂直拖动只能在同一个 ResourceGroup 内进行。
 */
export function assertSameResourceGroup(
  ctx: RuleContext,
  selected: readonly AppointmentObject[],
  target: ResourceObject,
): void {
  for (const appt of selected) {
    const from = resourceById(ctx, appt.resourceId)
    if (!from) continue
    if (from.resourceGroup !== target.resourceGroup) {
      throw new GantError(
        `炉次${appt.headIdShowStr} 不能从${from.resourceName}拖到${target.resourceName}`,
      )
    }
  }
}

/**
 * 转炉资源上的炉号重排。
 *
 * 对应原版四处重复代码（水平拖动提前 / 水平拖动延后 / 垂直拖动旧资源 / 垂直拖动新资源），
 * 它们形状一致，只是边界时间与比较是否取等不同，因此合并成一个函数：
 *   1. 取该资源上时间在边界之后的全部 HeadId，按时间升序；
 *   2. 以边界之前最近的一个炉次号为基准（没有则用 ErpBofNo + yyMM + "0000"）；
 *   3. 逐个炉次递增炉号，已有实际时间的炉次保持原炉号不变，并成为新的基准。
 *
 * @param inclusive 边界比较是否取等号。水平拖动提前、垂直拖动用 >=；水平拖动延后用 >。
 */
export function renumberRelationIds(
  ctx: RuleContext,
  resourceId: string,
  boundary: Date,
  erpBofNo: string,
  inclusive: boolean,
): void {
  const prefix = erpBofNo === '0' ? '0' : ''
  const boundaryMs = boundary.getTime()

  const after = ctx.appointments
    .filter((m) => m.resourceId === resourceId)
    .filter((m) =>
      inclusive ? effectiveTime(m) >= boundaryMs : effectiveTime(m) > boundaryMs,
    )
    .sort((a, b) => effectiveTime(a) - effectiveTime(b))
    .map((m) => m.headId)

  const before = ctx.appointments
    .filter((m) => m.resourceId === resourceId)
    .filter((m) => effectiveTime(m) < boundaryMs)
    .sort((a, b) => effectiveTime(a) - effectiveTime(b))

  const prev = before.length > 0 ? before[before.length - 1] : undefined
  let startRelationId =
    prev == null
      ? `${erpBofNo}${yearMonthCode()}0000`
      : `${prefix}${Number.parseInt(prev.relationId, 10)}`

  for (const headId of after) {
    const group = ctx.appointments.filter((m) => m.headId === headId)
    // 原版用 join Resources where IsBofResource 取该炉次在转炉上的那条记录
    const bofPoint = group.find((m) => resourceById(ctx, m.resourceId)?.isBofResource)

    if (bofPoint && (bofPoint.startTimeAct != null || bofPoint.endTimeAct != null)) {
      // 已实际生产的炉次炉号不再重排，并作为后续炉次的基准
      startRelationId = group[0].relationId
      continue
    }

    startRelationId = `${prefix}${Number.parseInt(startRelationId, 10) + 1}`
    for (const m of group) {
      if (m.relationId !== startRelationId) {
        m.editState = m.editState === EditState.New ? EditState.New : EditState.Edit
      }
      m.relationId = startRelationId
    }
  }
}

/**
 * 水平拖动：按像素位移换算成时间位移，整体平移选中点位。
 * 对应 Gant.MoveHorizontalAppointment。
 *
 * @param dxPixels 本次鼠标移动的像素增量
 */
export function moveSelectedHorizontally(
  ctx: RuleContext,
  selected: readonly AppointmentObject[],
  dxPixels: number,
): void {
  if (selected.length === 0) return
  assertNoActualTime(selected)

  const midnight = new Date(
    ctx.startDate.getFullYear(),
    ctx.startDate.getMonth(),
    ctx.startDate.getDate(),
  )

  // 原版按 StartTime 升序处理
  const ordered = [...selected].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime(),
  )

  for (const appt of ordered) {
    const worldX = (minutesBetween(ctx.startDate, appointmentStart(appt)) * ctx.style.ruleHourLength) / 60
    const seconds = ((Math.trunc(worldX) + dxPixels) * 3600) / ctx.style.ruleHourLength
    const newMoveTime = new Date(midnight.getTime() + seconds * 1000)
    const oldStartDate = appointmentStart(appt)

    appt.editState = appt.editState === EditState.New ? EditState.New : EditState.Edit
    appt.startTime = newMoveTime
    appt.endTime = new Date(newMoveTime.getTime() + appt.duringMins * 60000)

    const resource = resourceById(ctx, appt.resourceId)
    if (!resource?.isBofResource) continue

    const erpBofNo = resource.erpBofNo ?? ''
    if (newMoveTime.getTime() < oldStartDate.getTime()) {
      renumberRelationIds(ctx, appt.resourceId, newMoveTime, erpBofNo, true)
    } else if (newMoveTime.getTime() > oldStartDate.getTime()) {
      renumberRelationIds(ctx, appt.resourceId, oldStartDate, erpBofNo, false)
    }
  }
}

/**
 * 垂直拖动：把选中点位整体换到目标资源行。
 * 对应 Gant.MoveVerticalAppointment。
 */
export function moveSelectedVertically(
  ctx: RuleContext,
  selected: readonly AppointmentObject[],
  target: ResourceObject,
): void {
  if (selected.length === 0) return
  assertNoActualTime(selected)
  assertSameResourceGroup(ctx, selected, target)

  const groupId = newGroupId()

  for (const appt of selected) {
    // 注意：原版这里取的是“移动前”所属资源，用它判断是否走转炉 / 连铸分支
    const fromResource = resourceById(ctx, appt.resourceId)
    const startTime = appointmentStart(appt)
    const oldResourceId = appt.resourceId

    appt.editState = appt.editState === EditState.New ? EditState.New : EditState.Edit
    appt.resourceId = target.resourceId
    const newResourceId = target.resourceId

    if (fromResource?.isBofResource) {
      const erpBofNo = fromResource.erpBofNo ?? ''
      renumberRelationIds(ctx, oldResourceId, startTime, erpBofNo, true)
      renumberRelationIds(ctx, newResourceId, startTime, erpBofNo, true)
    }

    if (fromResource?.isCcmResource) {
      // 连铸换机台会带动同炉次的所有点位
      for (const m of ctx.appointments) {
        if (m.headId !== appt.headId) continue
        m.editState = m.editState === EditState.New ? EditState.New : EditState.Edit
        m.groupId = groupId
        m.ccmResourceId = target.resourceId
      }
    }
  }
}

/**
 * 点位配色。
 * 对应 AppointmentCell.DrawCell 里的一串状态判断，优先级由高到低：
 *   有产出 → 进行中（有实际开始、无实际结束） → 已完成 → 该炉次对应连铸资源的标题色。
 */
export function resolveAppointmentColor(ctx: RuleContext, appt: AppointmentObject): string {
  const s = ctx.style
  if (appt.stoveHaveOutput) return s.appointmentStoveHaveOutputBackColor
  if (appt.startTimeAct != null && appt.endTimeAct == null) return s.appointmentWorkingBackColor
  if (appt.startTimeAct != null && appt.endTimeAct != null) return s.appointmentCompleteBackColor

  const ccm = resourceById(ctx, appt.ccmResourceId)
  return ccm?.colorName ?? s.appointmentBackColor
}

/**
 * 连线冲突判断。
 * 对应 AppointmentCell.DrawLinkLine：前驱结束时间晚于当前开始时间即为冲突，线画成红色。
 * 这里用的是计划时间（StartTime / EndTime），与原版一致。
 */
export function isLinkConflict(previous: AppointmentObject, current: AppointmentObject): boolean {
  return previous.endTime.getTime() > current.startTime.getTime()
}

/** 供外部按资源 id 取行索引，命中测试用。 */
export function indexOfResource(ctx: RuleContext, resourceId: string): number {
  return resourceIndex(ctx, resourceId)
}
