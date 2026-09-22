# 甘特图组件（GanttChart）

炼钢生产计划的时序甘特图，从原 WinForms 控件 `Gant`（`DDH.Winforms.SMS` 的 `FrmMS2000` 在用）移植而来。
页面上用 `<GanttChart>` 即可，不需要直接碰引擎。

```
src/components/gantt/
├── GanttChart.vue   Vue 封装（props / emits / 生命周期 / 行高自适应）
├── README.md         本文
└── engine/           与 Vue 无关的纯 TS 引擎，可单独测试
    ├── index.ts      对外出口
    ├── chart.ts      控件主体（对应 Gant.cs）：状态、选中、拖动、滚动、右键菜单、事件分发
    ├── renderer.ts   Canvas 2D 绘制层（对应 OnPaint / DrawGant / DrawRuler / …Cell.DrawCell）
    ├── geometry.ts   坐标换算纯函数（世界坐标 ↔ 局部坐标 ↔ 客户区坐标）
    ├── rules.ts      业务规则纯函数（横/纵移动、炉号重排、配色、连线冲突）
    ├── model.ts      数据模型（ResourceObject / AppointmentObject / GridLine / EditState / SelectModel / GantError）
    └── style.ts      样式与尺寸默认值（源自 FrmMS2000.Designer.cs 的 gant1 实际配置）
```

## 设计要点

- **单 canvas 自绘**，不是 DOM/SVG 表格。缩放、滚动、命中测试全在引擎里，行多、点位多时不产生 DOM 抖动。
- **引擎命令式、Vue 侧声明式**。`engine/GanttChart` 是普通 class：构造时吃一个 `<canvas>`，之后靠字段赋值 + `bindingData()` / `invalidate()` 驱动。组件做的事就是把 props 变化翻译成这几句调用，把 `handlers` 回调翻译成 `emit`。
- **职责分层**：绘制（renderer）、换算（geometry）、规则（rules）都从 `chart.ts` 里拆出来了，`chart.ts` 只留状态与交互。规则层是纯函数，宿主可以替换或关掉，避免 MES 业务规则埋进渲染代码。
- **DPR 与高分屏**：绘图缓冲按 `min(devicePixelRatio, 单边 8192, 总面积 1600 万像素)` 夹逼，超过上限 canvas 会分配失败整块变白；缩放比从取整后的缓冲尺寸反推，线条才落在整数物理像素上。`matchMedia(resolution:)` 监听跨屏移动/页面缩放，重新按新 DPR 绘制。
- **尺寸自适应**：引擎内部有 `ResizeObserver`（重绘）+ `window.resize`（DPR 变化时 CSS 尺寸可能不变，兜底）。组件另加一层 `ResizeObserver` 只做行高重排。
- **行高自适应**（`fitRowHeight`，默认开）：`(视口高 - 刻度行高 - 8) / 资源行数`，夹在 22~160px；行内有色横条 = `行高 × 0.15`（下限 5px）。资源多到一屏放不下时走纵向滚动。必须在 `bindingData()` 之后算，因为行数由它重排 `sortedResources` 才得到。
- **数据是引用语义**：引擎会原地改 `appointment` 的 `startTime`/`endTime`/`relationId`/`editState`（拖动即改），所以点位对象必须是普通对象。组件把 props 数组 `toRaw().slice()` 后交给引擎——数组本身是浅拷贝，元素对象仍是同一批。

## 用法

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import GanttChart from "@/components/gantt/GanttChart.vue";
import { SelectModel, createAppointment, type AppointmentObject, type ResourceObject } from "@/components/gantt/engine";

const gantt = ref<InstanceType<typeof GanttChart> | null>(null);
const resources = ref<ResourceObject[]>([]);
const appointments = ref<AppointmentObject[]>([]);

/* 时间窗：计划起止 */
const window = computed(() => ({
  startDate: new Date(Date.now() - 2 * 3600_000),
  endDate: new Date(Date.now() + 22 * 3600_000),
}));

/** 同炉联动高亮，对应 FrmMS2000 在 Events_AppointmentClick 里设 IsSelectedByStoveSelected */
function onAppointmentClick(appt: AppointmentObject | null): void {
  gantt.value?.chart?.setStoveHighlight(appt?.headId ?? null);
}

/** 同机台时间重叠的点位标黄，对应 FrmMS2000.UpdateGanttPointOverlapInfo —— 属宿主业务，引擎不管 */
function refreshOverlap(): void {
  const c = gantt.value?.chart;
  if (!c) return;
  const ids: string[] = [];
  for (let i = 0; i < c.appointments.length; i++)
    for (let j = i + 1; j < c.appointments.length; j++) {
      const a = c.appointments[i], b = c.appointments[j];
      if (a.resourceId === b.resourceId && a.startTime < b.endTime && b.startTime < a.endTime) ids.push(a.appointmentId, b.appointmentId);
    }
  c.setOverlapped(ids);
}

/** 新增点位后必须回灌新数组引用，否则 props 的 watch 不触发 */
function addAfterCurrent(): void {
  const c = gantt.value?.chart;
  const cur = c?.currentAppointment;
  if (!c || !cur) return;
  c.addAppointment(
    createAppointment({
      headId: cur.headId,
      headIdShowStr: cur.headIdShowStr,
      relationId: cur.relationId,
      resourceId: cur.resourceId,
      seq: cur.seq + 1,
      startTime: new Date(cur.endTime.getTime() + 5 * 60_000),
      endTime: new Date(cur.endTime.getTime() + (5 + cur.duringMins) * 60_000),
      duringMins: cur.duringMins,
    }),
  );
  appointments.value = c.appointments.slice();
  refreshOverlap();
}
</script>

<template>
  <!-- 父容器必须有确定高度，canvas 是 h-full w-full -->
  <div class="min-h-0 flex-1">
    <GanttChart
      ref="gantt" v-bind="window" :resources="resources" :appointments="appointments"
      :select-model="SelectModel.Single" :can-move-horizontal="true" :can-move-vertical="true"
      @appointment-click="onAppointmentClick" @gant-exception="(e) => toast(e.message)"
      @mouse-double-click="addAfterCurrent"
    />
  </div>
</template>
```

### props

| 名称 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `startDate` / `endDate` | `Date` | 必填 | 时间窗，决定横向刻度范围 |
| `resources` | `ResourceObject[]` | `[]` | 一行一个资源（转炉/精炼/连铸机台） |
| `appointments` | `AppointmentObject[]` | `[]` | 点位，建议用 `createAppointment()` 造 |
| `gridLines` | `GridLine[]` | `[]` | 可拖动的时间竖线（对应原版 `gant1.LineCells`） |
| `style` | `Partial<GanttStyle>` | `{}` | 覆盖 `style.ts` 默认值；改动会重排行高 |
| `selectModel` | `SelectModel` | `Single` | 见「已知偏差 4」 |
| `canMoveHorizontal` / `canMoveVertical` | `boolean` | `false` | 点位横/纵拖动开关 |
| `showLink` | `boolean` | `true` | 跨炉连线 |
| `fitRowHeight` | `boolean` | `true` | 关掉后就按 `style.resourceRowHeight` 固定行高 |

数组/日期 prop 换引用才会重绑（`bindingData()` + 行高重排）；原地 push 不算变更。

### emits

| 事件 | 载荷 | 对应原版 |
|---|---|---|
| `appointment-click` | `AppointmentObject \| null` | `Events_AppointmentClick`（`clearSelect()` 也抛 `null`） |
| `gant-exception` | `GantError` | `Events_GantException`，提示方式由宿主决定 |
| `mouse-down-after` / `mouse-up-after` | `AppointmentObject \| null` | `Gantt_Events_OnMouseDownAfter` / `OnMouseUpAfter` |
| `mouse-double-click` | `AppointmentObject \| null` | `Gantt_Events_OnMouseDoubleClick` |
| `context-menu-action` | `string` | 右键菜单项，见「已知偏差 3」 |

### expose

- `chart`：`engine/GanttChart` 实例，`addAppointment` / `removeAppointment` / `editAppointment` / `setStoveHighlight` / `setOverlapped` / `clearSelect` / `invalidate` / `bindingData` / `refreshState` / `currentAppointment` / `selectedAppointments` / `viewport()` / `style` 全在这上面。
- `reload()`：按当前 props 重新绑定并重绘。
- `reflowRowHeight()`：手动触发行高重排（自己改过 `style.resourceRowHeight` 后用）。

## 已知偏差（相对 WinForms 原版）

1. **离屏分块绘制 → translate + clip**。原版每种单元格先画进离屏 `Bitmap` 再 `DrawImage` 贴回，Web 侧直接在主上下文平移裁剪，省掉一批位图分配。
2. **DPR 会被压到安全上限**，极端高分屏下画面可能略软，换来的是不再整块空白。
3. **右键菜单只留扩展点**。原版菜单项动作走 `SelectedToolStripMenuItem`，实际未触发；这里统一抛 `context-menu-action`，宿主自己接。
4. **`SelectModel` 只实现了 `Single` 分支**（原版 `Gant.SelectAppointment` 就只有 Single 可用，其余枚举值是未完成代码）。传别的值不报错，但行为仍按单选。
5. **行高算法改了**。原版 `ResetGanttResourceRowHeight` 是 `(控件高 - 60) / 资源数`，且不小于键值对 `Gantt_ResourceRowHeight`，放不下就纵向滚；这里改成始终按可视高度均分并夹在 22~160px，键值对的值只作参考。
6. **炉号改写规则保留在 `rules.ts`**，没有塞进 `chart.ts`；`moveSelectedVertically` 等纯函数可单测，也可由宿主替换。

## 调试

引擎与 Vue 无关，脱离页面也能跑。项目内没有常驻 demo 页（原独立 demo 的 `demo/data.ts`、`demo/snapshot.ts` 未入库），需要临时看效果时按 `temp/gantt-probe.html` 的路子挂一个 Vite 入口：`http://localhost:5173/temp/gantt-probe.html`，配套驱动脚本 `temp/gantt-probe-drive.mjs`（无头浏览器点位点击 + 截图 + 报错计数）。
