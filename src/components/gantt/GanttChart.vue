<script setup lang="ts">
/** GanttChart.vue —— 把 engine/ 下的 canvas 引擎类（同名 GanttChart）包成声明式 Vue 组件。
 *  宿主职责：喂数据、接事件、行高自适应、当前时间线定时刷新、卸载时销毁。
 *  与引擎类同名，页面若两者都要引，给引擎那个起别名：
 *    import GanttChart from "@/components/gantt/GanttChart.vue";
 *    import { GanttChart as GanttEngine } from "@/components/gantt/engine";
 *
 *  数据约定（引擎是命令式的，且会原地改写点位对象）：
 *  - resources / appointments 请传普通数组或 shallowRef，不要用深层 reactive ——
 *    引擎会直接改 appointment 的 startTime/endTime/relationId/editState；
 *  - 组件交给引擎的是 props 数组的浅拷贝，故 addAppointment/removeAppointment
 *    不会回写父组件的数组；要让 props 重新生效就换个新数组引用（触发 watch 重绑）。 */

import { onBeforeUnmount, onMounted, ref, shallowRef, toRaw, watch } from "vue";
import {
  GanttChart,
  SelectModel,
  type AppointmentObject,
  type GantError,
  type GanttStyle,
  type GridLine,
  type ResourceObject,
} from "./engine";

const props = withDefaults(
  defineProps<{
    startDate: Date;
    endDate: Date;
    resources?: ResourceObject[];
    appointments?: AppointmentObject[];
    gridLines?: GridLine[];
    style?: Partial<GanttStyle>;
    selectModel?: SelectModel;
    canMoveHorizontal?: boolean;
    canMoveVertical?: boolean;
    showLink?: boolean;
    /** 按可视高度均分行高（资源少时行高封顶，超出则走纵向滚动） */
    fitRowHeight?: boolean;
  }>(),
  {
    resources: () => [],
    appointments: () => [],
    gridLines: () => [],
    style: () => ({}),
    selectModel: SelectModel.Single,
    canMoveHorizontal: false,
    canMoveVertical: false,
    showLink: true,
    fitRowHeight: true,
  },
);

const emit = defineEmits<{
  /** 点位被点击；clearSelect() 也会抛 null */
  (e: "appointment-click", appt: AppointmentObject | null): void;
  /** 引擎抛出的业务异常（同组约束、时间冲突等），提示方式由宿主决定 */
  (e: "gant-exception", err: GantError): void;
  (e: "mouse-down-after", appt: AppointmentObject | null): void;
  (e: "mouse-up-after", appt: AppointmentObject | null): void;
  (e: "mouse-double-click", appt: AppointmentObject | null): void;
  (e: "context-menu-action", action: string): void;
}>();

/** 行高可读性下限与上限（像素），同 main.ts */
const MIN_ROW_HEIGHT = 22;
const MAX_ROW_HEIGHT = 160;
/** 底部留白，避免最后一行紧贴滚动条 */
const BOTTOM_PADDING = 8;
/** 行内有色横条：占行高比例与下限（同 main.ts 默认 0.15 / 5） */
const INNER_RATIO = 0.15;
const MIN_INNER = 5;
/** 当前时间线刷新间隔 */
const TICK_MS = 30_000;

const canvasEl = ref<HTMLCanvasElement | null>(null);
const chart = shallowRef<GanttChart | null>(null);
let stop: Array<() => void> = [];

/** 行高自适应。须在 bindingData() 之后调用：行数由它重算 sortedResources 得到。 */
function reflowRowHeight(): void {
  const c = chart.value;
  if (!c || !props.fitRowHeight) return;
  const count = Math.max(1, c.sortedResources.length);
  const available = c.viewport().height - c.style.rulerRowHeight - BOTTOM_PADDING;
  const rowHeight = Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, Math.floor(available / count)));
  const inner = Math.max(MIN_INNER, Math.floor(rowHeight * INNER_RATIO));
  if (c.style.resourceRowHeight === rowHeight && c.style.resourceRowHeightInner === inner) return;
  c.style.resourceRowHeight = rowHeight;
  c.style.resourceRowHeightInner = inner;
  c.invalidate();
}

/** 重新绑定 props 数据并重绘（对应 main.ts 的 loadXxx 尾部三步）。 */
function reload(): void {
  const c = chart.value;
  if (!c) return;
  c.startDate = props.startDate;
  c.endDate = props.endDate;
  c.resources = toRaw(props.resources).slice();
  c.appointments = toRaw(props.appointments).slice();
  c.gridLines = toRaw(props.gridLines).slice();
  c.bindingData();
  reflowRowHeight();
}

onMounted(() => {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const c = new GanttChart(canvas, {
    style: toRaw(props.style),
    selectModel: props.selectModel,
    canMoveHorizontal: props.canMoveHorizontal,
    canMoveVertical: props.canMoveVertical,
    showLink: props.showLink,
  });
  c.handlers = {
    appointmentClick: (appt) => emit("appointment-click", appt),
    gantException: (err) => emit("gant-exception", err),
    mouseDownAfter: (appt) => emit("mouse-down-after", appt),
    mouseUpAfter: (appt) => emit("mouse-up-after", appt),
    mouseDoubleClick: (appt) => emit("mouse-double-click", appt),
    contextMenuAction: (action) => emit("context-menu-action", action),
  };
  chart.value = c;

  // 等首屏 flex 布局稳定后再量高度（同 main.ts 的 requestAnimationFrame）
  requestAnimationFrame(reload);

  const onResize = (): void => reflowRowHeight();
  const ro = new ResizeObserver(onResize);
  ro.observe(canvas);
  window.addEventListener("resize", onResize);
  const timer = window.setInterval(() => c.invalidate(), TICK_MS);
  stop = [
    () => ro.disconnect(),
    () => window.removeEventListener("resize", onResize),
    () => window.clearInterval(timer),
  ];
});

onBeforeUnmount(() => {
  for (const off of stop) off();
  stop = [];
  chart.value?.destroy();
  chart.value = null;
});

watch(
  () => [props.startDate, props.endDate, props.resources, props.appointments, props.gridLines] as const,
  reload,
);
watch(
  () => [props.selectModel, props.canMoveHorizontal, props.canMoveVertical, props.showLink] as const,
  ([selectModel, canMoveHorizontal, canMoveVertical, showLink]) => {
    const c = chart.value;
    if (!c) return;
    c.selectModel = selectModel;
    c.canMoveHorizontal = canMoveHorizontal;
    c.canMoveVertical = canMoveVertical;
    c.showLink = showLink;
    c.invalidate();
  },
);
watch(
  () => props.style,
  (style) => {
    const c = chart.value;
    if (!c) return;
    Object.assign(c.style, toRaw(style));
    reflowRowHeight();
  },
  { deep: true },
);

defineExpose({ chart, reload, reflowRowHeight });
</script>

<template>
  <canvas ref="canvasEl" class="block h-full w-full"></canvas>
</template>
