<script setup lang="ts">
/**
 * 能源域通用列表页骨架（spec 驱动，见 ./listTypes.ts）。
 *
 * 一个文件把 ui-rules 的布局纪律写死一次，二十多个列表页不再各抄一遍：
 *  - 查询条件 **≤2 个**：与按钮同行、不写 label、靠 placeholder（§6）；
 *  - 查询条件 **≥3 个**：独立 `grid grid-cols-6` 条件区 + 下一行 `h-9` 按钮条（照 LIMS/QL3000）；
 *    日期范围占 `col-span-2`；
 *  - **凡有按钮的一行统一 `h-9`**，按钮靠左、表格统计靠右 `ml-auto`（§6）；
 *  - 表格 `hmx-ag-grid` + `makeHmxGridTheme()` + `autoSizeOnFirstData`，`:pagination="false"`
 *    （分页是服务端的，由下方 Pager 负责——见它的文件头说明）；
 *  - 每个 `<Dialog>` 都标了 autofocus（R5）。
 *
 * 骨架的核心职责只有一个：**动作真的会改状态**。本域的写操作全部落库并引发跨模块联动——
 * 报警确认→转调度令→执行完毕→柜位回落、结算定稿→锁死当月实绩校正——于是不容协商的是三件事：
 * `applyResult` 统一判业务拒绝、成功后**必须重查**、动作按钮按 `shown(row)` 随状态机出现或消失。
 * 这三件都是本域骨架的核心职责，不是可选装饰。
 *
 * 列与详情**默认全给**：每列一个 case（含 `status`/`direction` 的色标渲染、`stdCoal` 的折标煤位数），
 * 详情按 key 自动生成中文段——**未知字段走兜底而不是被静默丢弃**，漏配只会显示成裸文本（可诊断），
 * 丢弃会让页面永远看不出少配了哪列（不可诊断）。页面传了自己的 columns/detail 时**整段替换**，
 * 不做合并：合并语义要记住「谁覆盖谁」，替换一眼看懂。每条列表带「导出」动作（走 `/ems/export`，见下）。
 *
 * 对外三个口子：`defineExpose({ reload, setQuery })`——`reload` 给「名称表后到、要重查一次」的页面，
 * `setQuery` 给「看板卡点击即筛选」（EM0005 的五级卡）；`emit("changed")` 给「左树 + 右表是同一批行」。的页面（EG0002/EC0001）——写成功之后树不跟着重拉，
 * 刚新增的下级就只在表里、不在树上，客户会当成系统两处数据不一致。
 */
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { IconPlus, IconRotateClockwise, IconSearch } from "@tabler/icons-vue";
import { useToast } from "@/composables/useToast";
import { exportRows } from "@/api/energy";
import { toDay, toStamp } from "./dateField";
import Pager from "./Pager.vue";
import DetailDialog from "./DetailDialog.vue";
import FormDialog from "./FormDialog.vue";
import { actionRenderer, applyResult, rowId } from "./rowActions";
import {
  boolRenderer,
  dashFmt,
  dayFmt,
  levelBarRenderer,
  moneyFmt,
  numFmt,
  qtyFmt,
  stdCoalFmt,
  tagRenderer,
} from "./cells";
import type { EditField, ListPageSpec, RowAct, ToolAct } from "./listTypes";

const props = defineProps<{
  /** 不传则用内置默认：列与详情从行数据 key 自动生成 */
  spec?: ListPageSpec;
  /** spec 驱动页的固定统计卡 */
  statCards?: Array<{ label: string; value: string | number; sub?: string }>;
}>();

const { toast } = useToast();
const router = useRouter();
const theme = makeHmxGridTheme();
/** 写成功对外只说一句话：「这份数据变了」。左树 + 右表同页的父组件用它重拉左树（见 EG0002） */
const emit = defineEmits<{ changed: [] }>();

const rows = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const querying = ref(false);
/** 上次查询实际送出的参数：导出要和看到的结果同口径，不能悄悄换一套条件 */
const lastParams = ref<Record<string, any>>({});

/** 行数据里出现过的 key（保序：第一行的 key 顺序就是后端给的字段顺序，最有代表性） */
const seenKeys = computed<string[]>(() => {
  const keys: string[] = [];
  for (const r of rows.value.slice(0, 50)) {
    for (const k of Object.keys(r ?? {})) if (!keys.includes(k)) keys.push(k);
  }
  return keys;
});

/** 跳过内部字段与技术性外键——`instId` 的名字已由仪表台账承载、`upperPoints` 是校验用的 id 数组，
 *  直接成列只会占宽；操作人/时间戳是有业务语义的审计轨迹，照旧显示 */
const HIDDEN_KEYS = new Set(["gridErrors", "instId", "upperPoints", "path"]);

const LEVEL_MAP: Record<string, string> = { "1": "1级", "2": "2级", "3": "3级", "4": "4级", "5": "5级" };

/** 每个 key 一个 case：数字列右对齐 + 千分位，状态列上色标 */
function colFor(k: string): ColDef {
  const base: ColDef = { field: k, headerName: k, minWidth: 84 };
  switch (k) {
    case "id":
      return { ...base, headerName: "编号", minWidth: 120 };
    case "code":
      return { ...base, headerName: "编码", minWidth: 96 };
    case "name":
      return { ...base, headerName: "名称", minWidth: 140 };
    case "mediaCode":
      return { ...base, headerName: "介质", cellRenderer: tagRenderer() };
    case "unitId":
      return { ...base, headerName: "用能单元", valueFormatter: dashFmt };
    case "pointId":
      return { ...base, headerName: "计量点", minWidth: 100 };
    case "channelId":
      return { ...base, headerName: "通道", minWidth: 92 };
    case "status":
      return { ...base, headerName: "状态", cellRenderer: tagRenderer() };
    case "direction":
      return { ...base, headerName: "方向", cellRenderer: tagRenderer() };
    case "level":
      return {
        ...base,
        headerName: "等级",
        width: 84,
        valueFormatter: (p) => LEVEL_MAP[String(p.value)] ?? dashFmt(p),
      };
    case "kind":
      return { ...base, headerName: "类型", minWidth: 92, valueFormatter: dashFmt };
    case "type":
      return { ...base, headerName: "类型", minWidth: 96, valueFormatter: dashFmt };
    case "time":
      return { ...base, headerName: "时间", minWidth: 148 };
    case "createdAt":
      return { ...base, headerName: "创建时间", minWidth: 148 };
    case "date":
      return { ...base, headerName: "日期", minWidth: 104, valueFormatter: dayFmt };
    case "month":
      return { ...base, headerName: "月份", minWidth: 88 };
    case "value":
      return { ...base, headerName: "实物量", minWidth: 92, type: "numericColumn", valueFormatter: qtyFmt };
    case "stdCoal":
      return { ...base, headerName: "折标煤", minWidth: 96, type: "numericColumn", valueFormatter: stdCoalFmt };
    case "intensity":
      return { ...base, headerName: "强度", minWidth: 88, type: "numericColumn", valueFormatter: numFmt(2) };
    case "price":
      return { ...base, headerName: "单价", minWidth: 88, type: "numericColumn", valueFormatter: moneyFmt };
    case "amount":
      return { ...base, headerName: "金额", minWidth: 96, type: "numericColumn", valueFormatter: moneyFmt };
    case "total":
      return { ...base, headerName: "合计金额", minWidth: 104, type: "numericColumn", valueFormatter: moneyFmt };
    case "levelPct":
      return { ...base, headerName: "柜位", minWidth: 132, cellRenderer: levelBarRenderer() };
    case "color":
      // 介质专色的 swatch：色值来自行数据（mock model.ts 唯一真源），不在前端另配
      return {
        ...base,
        headerName: "专色",
        width: 64,
        cellRenderer: (p: any) => {
          const el = document.createElement("span");
          el.className = "inline-block h-3.5 w-6 rounded-sm border border-white/20 align-middle";
          if (typeof p.value === "string") el.style.background = p.value;
          return el;
        },
      };
    case "enabled":
    case "isSettlement":
    case "forcedVerify":
    case "balanceParticipate":
    case "cacheMode":
    case "powerFactorAdj":
      return { ...base, headerName: "启用", width: 78, cellRenderer: boolRenderer() };
    case "remark":
    case "note":
      return { ...base, headerName: "备注", minWidth: 150, flex: 1, valueFormatter: dashFmt };
    case "owner":
    case "issuer":
    case "receiver":
      return { ...base, headerName: "责任人", minWidth: 88, valueFormatter: dashFmt };
    case "product":
      return { ...base, headerName: "主产品", minWidth: 96 };
    case "stationName":
      return { ...base, headerName: "站所", minWidth: 140 };
    case "protocol":
      return { ...base, headerName: "协议", minWidth: 130 };
    case "pointCount":
    case "pendingUpload":
      return {
        ...base,
        headerName: k === "pointCount" ? "测点数" : "待补传",
        width: 88,
        type: "numericColumn",
        valueFormatter: numFmt(0),
      };
    case "heartbeatAt":
      return { ...base, headerName: "心跳", minWidth: 148 };
    default: {
      const first = String(k).charAt(0);
      const probe = rows.value.find((r) => r?.[k] !== null && r?.[k] !== undefined);
      if (typeof probe?.[k] === "number")
        return { ...base, headerName: k, minWidth: 92, type: "numericColumn", valueFormatter: numFmt(0) };
      return {
        ...base,
        headerName: /[a-z][A-Z]/.test(k) ? k : `${first.toUpperCase()}${String(k).slice(1)}`,
        valueFormatter: dashFmt,
      };
    }
  }
}

const colDefs = computed<ColDef[]>(() => {
  const cols = props.spec?.columns?.length
    ? [...props.spec.columns]
    : seenKeys.value.filter((k) => !HIDDEN_KEYS.has(k)).map(colFor);
  const acts = rowActions.value;
  const actionCol: ColDef | undefined = acts.length
    ? {
        colId: "actions",
        headerName: "操作",
        width: Math.max(90, acts.length * 78),
        sortable: false,
        cellRenderer: actionRenderer(acts),
      }
    : undefined;
  return [...cols, ...(actionCol ? [actionCol] : [])];
});

/* 详情段：按 key 自动生成中文分组（基本信息 / 时间 / 人员），页面传 detail 则整体替换 */
const LBL_GROUPS: Record<string, string> = {
  基本信息: [
    "id",
    "code",
    "name",
    "mediaCode",
    "unitId",
    "pointId",
    "channelId",
    "stationName",
    "protocol",
    "kind",
    "type",
    "product",
    "category",
  ],
  数量与金额: ["value", "stdCoal", "intensity", "price", "amount", "total", "pointCount", "pendingUpload"],
  状态: [
    "status",
    "level",
    "levelPct",
    "direction",
    "enabled",
    "isSettlement",
    "forcedVerify",
    "balanceParticipate",
    "cacheMode",
    "powerFactorAdj",
    "overdue",
    "missing",
    "suspect",
  ],
  时间: [
    "time",
    "date",
    "month",
    "createdAt",
    "heartbeatAt",
    "issuedAt",
    "doneAt",
    "receiptAt",
    "closedAt",
    "ackAt",
    "lastVerifyAt",
    "nextVerifyAt",
    "effectiveMonth",
  ],
  人员: ["issuer", "receiver", "owner", "createdBy", "ackBy", "checkBy", "correctBy", "fillBy"],
  说明: ["remark", "note", "message", "reason", "instruction", "formulaTrace", "correctReason", "deviation"],
};

const detailSections = computed(() => {
  if (props.spec?.detail) return props.spec.detail.sections;
  const keys = seenKeys.value.filter((k) => !HIDDEN_KEYS.has(k) && !/^_(label|value|children)$/.test(k));
  const used = new Set<string>();
  const sections: Array<{
    title: string;
    fields: Array<{ label: string; from: string; map?: Record<string, string> }>;
  }> = [];
  for (const [title, group] of Object.entries(LBL_GROUPS)) {
    const fields = group.filter((k) => keys.includes(k) && !used.has(k));
    if (!fields.length) continue;
    for (const k of fields) used.add(k);
    sections.push({
      title,
      fields: fields.map((k) => ({
        label: colFor(k).headerName ?? k,
        from: k,
        ...(k === "level" ? { map: LEVEL_MAP } : {}),
      })),
    });
  }
  const rest = keys.filter((k) => !used.has(k));
  if (rest.length) sections.push({ title: "其他", fields: rest.map((k) => ({ label: k, from: k })) });
  return sections;
});

const spec = computed<ListPageSpec>(() => ({
  code: "EM",
  query: props.spec?.query ?? [],
  columns: [],
  fetch:
    props.spec?.fetch ??
    (async () => {
      throw new Error("能源域列表页必须提供 spec.fetch（接口层见 src/api/energy/index.ts）");
    }),
  ...props.spec,
  actions: [
    ...(props.spec?.actions ?? []),
    { label: "导出", kind: "run" as const, refresh: false, run: () => exportCurrent() },
  ],
  detail: props.spec?.detail ?? { sections: [] },
}));

/** 条件数 ≥3 才拆成独立条件区 + 按钮行（ui-rules §6） */
const multiQuery = computed(() => spec.value.query.length >= 3);

/* ── 查询条件 ─────────────────────────────────────────── */
const model = reactive<Record<string, any>>({});
for (const f of props.spec?.query ?? []) model[f.key] = f.kind === "range" ? null : "";

function buildParams(): Record<string, any> {
  const p: Record<string, any> = { currentPage: page.value, pageSize: pageSize.value };
  for (const f of spec.value.query) {
    const v = model[f.key];
    if (f.kind === "range") {
      // 区间固定送 startTime/endTime（mock 的 dateRange/dayRange 只认这两个键，见 mock/energy/query.ts）
      const pick = (d: Date) => (f.as === "date" ? toDay(d) : toStamp(d));
      if (v?.[0]) p.startTime = pick(v[0]);
      if (v?.[1]) p.endTime = pick(v[1]);
      continue;
    }
    if (f.kind === "date") {
      if (!v) continue;
      p[f.key] = f.as === "year" ? String((v as Date).getFullYear()) : f.as === "date" ? toDay(v) : toStamp(v);
      continue;
    }
    const s = typeof v === "string" ? v.trim() : v;
    if (s === "" || s === null || s === undefined) continue;
    p[f.key] = f.valueMap?.[String(s)] ?? s;
  }
  return p;
}

async function query() {
  if (querying.value) return;
  querying.value = true;
  try {
    lastParams.value = buildParams();
    const res = await spec.value.fetch(lastParams.value);
    rows.value = res?.rows ?? [];
    total.value = res?.total ?? rows.value.length;
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 供页面外部（父组件通过 ref）触发重查：跨页联动演示时「我刚在别的页确认了报警，这页也要立刻见到」 */
defineExpose({ reload: query, setQuery });

/**
 * 从页面外部把某个查询条件设成给定值并重查——**看板卡点击**是这套骨架里唯一的入口。
 *
 * 为什么要留这个口子而不是让页面自己维护一份过滤状态：那样就有两份查询条件
 * （卡里一份、条件区一份），客户点完卡再去条件区改下拉，看到的就会是「两个条件同时生效」
 * 的第三种结果。这里把值**写回同一个 `model`**，条件区的下拉因此会跟着变成点中的那一项，
 * 再点一次同一张卡则清空——页面和骨架看到的是同一份状态。
 *
 * 传的是**展示文案**（「重大」而不是 `2`），`valueMap` 在 `buildParams` 里统一翻，
 * 页面不需要知道后端编码。
 */
function setQuery(key: string, text: string | null) {
  const f = spec.value.query.find((x) => x.key === key);
  if (!f) return;
  /** 再点同一张卡 = 取消该条件，符合"筛选是开关"的直觉 */
  model[key] = text !== null && model[key] === text ? "" : (text ?? "");
  page.value = 1;
  void query();
}

function reset() {
  for (const f of spec.value.query) model[f.key] = f.kind === "range" ? null : "";
  page.value = 1;
  query();
}

function onPage(p: number, size: number) {
  page.value = p;
  pageSize.value = size;
  query();
}

onMounted(query);

/**
 * 导出：打 `POST /ems/export`（`exportRows`），刻意**不在前端造文件**——
 * 端点契约是回一个可读结果（「能耗实绩_2026-09.csv 已提交导出队列」），
 * 页面只负责把 msg 弹出来。真接后端时这个端点换成返回下载链接，页面零改动。
 * 送的是**上次查询的实际参数**（含分页），保证导出的和看到的是什么口径说得清。
 */
function exportCurrent() {
  return exportRows(spec.value.exportEntity ?? spec.value.code, lastParams.value);
}

/* ── 弹窗：详情 / 表单（编辑与动作共用 FormDialog）/ 确认 ─────────────── */
const detailOpen = ref(false);
const detailData = ref<Record<string, any> | null>(null);

const formOpen = ref(false);
const formState = ref<{
  title: string;
  fields: EditField[];
  row: Record<string, any> | null;
  okMsg: string;
  actionLabel: string;
  submit: (payload: Record<string, any>) => Promise<unknown>;
} | null>(null);

const confirmState = ref<{ text: string; run: () => Promise<unknown>; okMsg: string; danger: boolean } | null>(null);

function openForm(state: NonNullable<typeof formState.value>) {
  formState.value = state;
  formOpen.value = true;
}

/** 执行动作：成功才刷新（业务拒绝时列表本来就没错，重查一次只会闪） */
async function exec(run: () => Promise<unknown>, okMsg: string, refresh = true): Promise<boolean> {
  let res: unknown;
  try {
    res = await run();
  } catch {
    return false; // 拦截层已 toast
  }
  if (!applyResult(res, okMsg, toast)) return false;
  /* 业务拒绝时既不重查也不对外报——列表本来就没错。导出这类 `refresh: false` 的动作不改数据，
     所以也不发 `changed`（否则点一次导出会把父组件的左树白拉一遍）。 */
  if (!refresh) return true;
  emit("changed");
  query();
  return true;
}

async function openDetail(row: any) {
  if (!row) return;
  if (spec.value.detailFetch) {
    try {
      detailData.value = await spec.value.detailFetch(rowId(row) ?? "");
    } catch {
      return; // 拦截层已 toast
    }
  } else {
    detailData.value = row;
  }
  detailOpen.value = true;
}

/** 新增/编辑：`writeFn` 收到的是**含 id 的完整 payload**（有 id 即改、无 id 即增，见 mock 的 saveRow） */
function openEdit(row: any) {
  const e = spec.value.edit;
  if (!e || !spec.value.writeFn) return;
  const id = rowId(row);
  openForm({
    title: e.title ?? (row ? "编辑" : "新增"),
    fields: e.fields,
    row,
    okMsg: "保存成功",
    actionLabel: "保存",
    submit: (payload) => spec.value.writeFn!({ ...payload, ...(id ? { id } : {}) }),
  });
}

/** 行内动作的分派全在这一处：页面 spec 只声明「有什么动作」，不各页抄一遍管道 */
async function runRowAct(a: RowAct, row: any) {
  if (a.kind === "detail") {
    void openDetail(row);
    return;
  }
  if (a.kind === "edit") {
    openEdit(row);
    return;
  }
  if (a.kind === "link" && a.to) {
    void router.push(a.to);
    return;
  }
  if (a.kind === "delete") {
    const id = rowId(row);
    if (id === undefined) {
      toast("该行没有主键，无法删除", 2400, "warn");
      return;
    }
    confirmState.value = {
      text: "是否确定删除该条记录？",
      okMsg: "删除成功",
      danger: true,
      run: () => spec.value.deleteFn!(id),
    };
    return;
  }
  if (a.kind === "stub" || !a.run) {
    toast(`${a.label}待接入`, 2000, "warn");
    return;
  }
  if (a.kind === "form") {
    openForm({
      title: a.title ?? a.label,
      fields: a.fields ?? [],
      row,
      okMsg: a.okMsg ?? "操作成功",
      actionLabel: "确定",
      submit: (payload) => a.run!(row, payload),
    });
    return;
  }
  /** 状态机动作可以要二次确认（`▶模拟中断`、`下达` 这类一按就改全站的事）。
   *  和 `ToolAct.confirm` 同一套确认框、同样不标红：红色只留给「删除」这种收不回的动作 */
  if (a.confirm) {
    confirmState.value = {
      text: a.confirm,
      okMsg: a.okMsg ?? "操作成功",
      danger: false,
      run: () => a.run!(row, {}),
    };
    return;
  }
  await exec(() => a.run!(row, {}), a.okMsg ?? "操作成功", a.refresh !== false);
}

async function runToolAct(a: ToolAct) {
  if (!a.run) {
    toast(`${a.label}待接入`, 2000, "warn");
    return;
  }
  if (a.fields?.length) {
    openForm({
      title: a.label,
      fields: a.fields,
      row: null,
      okMsg: a.okMsg ?? "操作成功",
      actionLabel: "确定",
      submit: (payload) => a.run!(payload),
    });
    return;
  }
  if (a.confirm) {
    // 二次确认框的主按钮**不默认红色**：删除才要 danger，「生成本月结算单」这类推进型动作用红按钮会让客户误以为要出事
    confirmState.value = {
      text: a.confirm,
      okMsg: a.okMsg ?? "操作成功",
      danger: false,
      run: () => a.run!({}),
    };
    return;
  }
  await exec(() => a.run!({}), a.okMsg ?? "操作成功", a.refresh !== false);
}

async function runConfirm() {
  const c = confirmState.value;
  if (!c) return;
  if (await exec(c.run, c.okMsg)) confirmState.value = null;
}

function onExtra(label: string) {
  toast(`${label}待接入`, 2000, "warn");
}

const rowActions = computed(() =>
  (spec.value.actions ?? []).map((a) => ({
    label: a.label,
    shown: a.shown,
    onClick: (row: any) => void runRowAct(a, row),
  })),
);

const summaryText = computed(() => {
  const s = spec.value.summary;
  if (typeof s === "function") return s({ total: total.value, rows: rows.value });
  return s ?? `共 ${total.value} 条`;
});

function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件 ≥3 个：独立条件区（grid-cols-6，日期范围 col-span-2） -->
    <div v-if="multiQuery" class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div
          v-for="f in spec.query"
          :key="f.key"
          class="flex min-w-0 items-center gap-1.5"
          :class="f.kind === 'range' ? 'col-span-2' : ''"
        >
          <label :class="[spec.queryLabelWidth ?? 'w-16', 'shrink-0 text-xs text-muted-foreground']">{{
            f.label
          }}</label>
          <InputText
            v-if="f.kind === 'input'"
            v-model="model[f.key]"
            :placeholder="f.placeholder"
            class="min-w-0 flex-1"
            @keydown.enter="query"
          />
          <Select
            v-else-if="f.kind === 'select'"
            v-model="model[f.key]"
            :options="f.options ?? []"
            show-clear
            :placeholder="f.placeholder ?? '请选择'"
            class="min-w-0 flex-1"
          />
          <DatePicker
            v-else-if="f.kind === 'date'"
            v-model="model[f.key]"
            :manual-input="false"
            date-format="yy-mm-dd"
            :view-mode="f.as === 'year' ? 'year' : 'date'"
            show-icon
            :placeholder="f.placeholder"
            class="min-w-0 flex-1"
          />
          <DatePicker
            v-else
            v-model="model[f.key]"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            :show-time="f.as !== 'date'"
            :hour-format="f.as === 'date' ? undefined : '24'"
            show-icon
            :placeholder="f.placeholder ?? '开始时间'"
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- 工具栏 h-9：按钮靠左、统计靠右（条件 ≤2 时条件与按钮同行） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <!-- 条件 ≤2：与按钮同行，按 spec 原顺序渲染（不按控件类型分组，否则会打乱线上字段次序） -->
      <template v-if="!multiQuery" v-for="f in spec.query" :key="f.key">
        <InputText
          v-if="f.kind === 'input'"
          v-model="model[f.key]"
          :placeholder="f.placeholder ?? f.label"
          class="w-44 shrink-0"
          @keydown.enter="query"
        />
        <Select
          v-else-if="f.kind === 'select'"
          v-model="model[f.key]"
          :options="f.options ?? []"
          show-clear
          :placeholder="f.placeholder ?? f.label"
          class="w-40 shrink-0"
        />
        <DatePicker
          v-else
          v-model="model[f.key]"
          :selection-mode="f.kind === 'range' ? 'range' : undefined"
          :view-mode="f.as === 'year' ? 'year' : 'date'"
          :manual-input="false"
          date-format="yy-mm-dd"
          :show-time="f.kind === 'range' && f.as !== 'date'"
          show-icon
          :placeholder="f.placeholder ?? f.label"
          class="w-56 shrink-0"
        />
      </template>

      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="reset">
        <IconRotateClockwise class="h-3 w-3" />重置
      </Button>
      <Button v-if="spec.toolbar?.add" variant="outlined" class="shrink-0 whitespace-nowrap" @click="openEdit(null)">
        <IconPlus class="h-3 w-3" />新增
      </Button>
      <Button
        v-for="a in spec.toolbar?.acts ?? []"
        :key="a.label"
        variant="outlined"
        class="shrink-0 whitespace-nowrap"
        @click="runToolAct(a)"
      >
        {{ a.label }}
      </Button>
      <Button
        v-for="b in spec.toolbar?.extraButtons ?? []"
        :key="b"
        variant="outlined"
        class="shrink-0 whitespace-nowrap"
        @click="onExtra(b)"
      >
        {{ b }}
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">{{ summaryText }}</span>
    </div>

    <!-- 表格 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        @first-data-rendered="onFirstData"
      />
    </div>

    <Pager :total="total" :page="page" :page-size="pageSize" @change="onPage" />

    <DetailDialog v-model:open="detailOpen" :sections="detailSections" :data="detailData" />

    <FormDialog
      v-if="formState"
      v-model:open="formOpen"
      :title="formState.title"
      :fields="formState.fields"
      :row="formState.row"
      :ok-msg="formState.okMsg"
      :action-label="formState.actionLabel"
      :submit="formState.submit"
      @done="query"
    />

    <Dialog
      v-if="confirmState"
      :visible="true"
      modal
      header="确认"
      :style="{ width: 'min(24rem, calc(100vw - 2rem))' }"
      @update:visible="confirmState = null"
    >
      <div class="text-body py-2">{{ confirmState.text }}</div>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmState = null" />
        <Button label="确定" :severity="confirmState.danger ? 'danger' : 'primary'" autofocus @click="runConfirm" />
      </template>
    </Dialog>

    <!-- 统计卡（页面用 <template #stat-card="{ t }"> 渲染自己的四格）；插槽存在即展示，
         避免各页为「有没有这一条」再写一个布尔 prop -->
    <div
      v-if="$slots['stat-card']"
      class="shrink-0 grid grid-cols-2 gap-2 border-b border-border/60 px-3 py-2 sm:grid-cols-4"
    >
      <template v-for="(t, i) in statCards ?? []" :key="i">
        <div class="min-w-0">
          <div class="text-base tabular-nums">{{ t.value }}</div>
          <div class="truncate text-xs text-muted-foreground">{{ t.label }}</div>
          <div v-if="t.sub" class="truncate text-xs text-muted-foreground">{{ t.sub }}</div>
        </div>
        <slot name="stat-card" :t="t" />
      </template>
    </div>
  </div>
</template>
