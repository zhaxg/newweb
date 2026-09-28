<script setup lang="ts">
/**
 * 铁区MES 通用列表页骨架（spec 驱动，见 ./listTypes.ts）。
 *
 * 一个文件把 ui-rules 的布局纪律写死一次，五十多个列表页不再各抄一遍：
 *  - 查询条件 **≤2 个**：与按钮同行、不写 label、靠 placeholder（§6）；
 *  - 查询条件 **≥3 个**：独立 `grid grid-cols-6` 条件区 + 下一行 `h-9` 按钮条（照 LIMS/QL3000）；
 *    日期范围占 `col-span-2`；
 *  - **凡有按钮的一行统一 `h-9`**，按钮靠左、表格统计靠右 `ml-auto`（§6）；
 *  - 表格 `hmx-ag-grid` + `makeHmxGridTheme()` + `autoSizeOnFirstData`，`:pagination="false"`
 *    （分页是服务端的，由下方 Pager 负责——见它的文件头说明）；
 *  - 每个 `<Dialog>` 都标了 autofocus（R5）。
 *
 * ── 本域比能源域**少了一层**：没有表单弹窗、没有确认框、没有删除 ─────────────
 * 规格范围是「只查桩」，mock 只提供查询端点，所以这个骨架的职责收窄成三件：
 * 查得对（条件与 mock 的过滤语义对齐）、看得清（列与详情默认全给）、导得出（`/tqmes/export`）。
 * 「▶ 模拟触发」这类 B7 要求的演示按钮走 `spec.toolbar.extraButtons`，点了提示待接入——
 * 按钮画出来是因为它是销售走查的抓手，提示待接入是因为它背后确实还没有端点。
 *
 * 列与详情**默认全给**：每列一个 case（含 `status`/`level` 的色标渲染、`wgt` 的吨位位数），
 * 详情按 key 自动生成中文段——**未知字段走兜底而不是被静默丢弃**，漏配只会显示成裸文本（可诊断），
 * 丢弃会让页面永远看不出少配了哪列（不可诊断）。页面传了自己的 columns/detail 时**整段替换**，
 * 不做合并：合并语义要记住「谁覆盖谁」，替换一眼看懂。
 *
 * 对外两个口子：`defineExpose({ reload })` 给「名称表后到、要重查一次」的页面；
 * `emit("changed")` 给「左树 + 右表是同一批行」的页面（L2 版式的那些页）。
 */
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { IconRotateClockwise, IconSearch } from "@tabler/icons-vue";
import { useToast } from "@/composables/useToast";
import { exportRows } from "@/api/mes4tq";
import { toDay, toStamp } from "./dateField";
import Pager from "./Pager.vue";
import DetailDialog from "./DetailDialog.vue";
import { actionRenderer, applyResult, rowId } from "./rowActions";
import {
  boolRenderer,
  clockFmt,
  codeFmt,
  dashFmt,
  dayFmt,
  levelBarRenderer,
  moneyFmt,
  numFmt,
  qtyFmt,
  tagRenderer,
} from "./cells";
import type { ListPageSpec, RowAct } from "./listTypes";

const props = defineProps<{
  /** 不传则用内置默认：列与详情从行数据 key 自动生成 */
  spec?: ListPageSpec;
  /** spec 驱动页的固定统计卡 */
  statCards?: Array<{ label: string; value: string | number; sub?: string }>;
}>();

const { toast } = useToast();
const router = useRouter();
const theme = makeHmxGridTheme();
/** 左树 + 右表同页的父组件用它重拉左树（树上的数字与右表的行数必须同源，见 L2 版式） */
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

/** 跳过内部字段与技术性外键——`hiLimit`/`loLimit` 是料位条的画线依据、`path` 是树的层级键，
 *  直接成列只会占宽；操作人/时间戳是有业务语义的审计轨迹，照旧显示 */
const HIDDEN_KEYS = new Set(["gridErrors", "hiLimit", "loLimit", "path", "children"]);

const LEVEL_MAP: Record<string, string> = { "1": "1级", "2": "2级", "3": "3级", "4": "4级", "5": "5级" };
/** 报警等级：行里存数字，列上翻中文再交给 `tagRenderer` 查色（只读 `value` 的话五级全灰） */
const ALARM_MAP: Record<string, string> = { "1": "事故", "2": "重大", "3": "一般", "4": "提示", "5": "告知" };

/** 每个 key 一个 case：数字列右对齐 + 千分位，状态列上色标 */
function colFor(k: string): ColDef {
  const base: ColDef = { field: k, headerName: k, minWidth: 84 };
  switch (k) {
    case "id":
      return { ...base, headerName: "编号", minWidth: 130 };
    case "code":
      return { ...base, headerName: "编码", minWidth: 96 };
    case "name":
      return { ...base, headerName: "名称", minWidth: 140 };
    case "status":
      return { ...base, headerName: "状态", cellRenderer: tagRenderer() };
    case "type":
      return { ...base, headerName: "类型", minWidth: 96, cellRenderer: tagRenderer() };
    case "kind":
      return { ...base, headerName: "类型", minWidth: 92, cellRenderer: tagRenderer() };
    case "process":
      return { ...base, headerName: "工序", minWidth: 92, cellRenderer: tagRenderer() };
    case "level":
      return {
        ...base,
        headerName: "等级",
        width: 84,
        valueFormatter: (p) => LEVEL_MAP[String(p.value)] ?? ALARM_MAP[String(p.value)] ?? dashFmt(p),
        cellRenderer: tagRenderer(),
      };
    case "unitId":
      return { ...base, headerName: "机组", minWidth: 120, valueFormatter: dashFmt };
    case "workshopId":
      return { ...base, headerName: "车间", minWidth: 110, valueFormatter: dashFmt };
    case "materialId":
      return { ...base, headerName: "物料", minWidth: 130, valueFormatter: dashFmt };
    case "materialName":
      return { ...base, headerName: "物料名称", minWidth: 130 };
    case "siloId":
    case "binCode":
      return { ...base, headerName: "料仓", minWidth: 100 };
    case "batchNo":
      return { ...base, headerName: "批次号", minWidth: 120 };
    case "stoveNo":
      return { ...base, headerName: "炉号", minWidth: 88 };
    case "ladleId":
      return { ...base, headerName: "罐号", minWidth: 96 };
    case "shift":
      return { ...base, headerName: "班次", width: 72 };
    case "team":
      return { ...base, headerName: "班组", width: 72 };
    case "prodDate":
    case "date":
      return { ...base, headerName: "日期", minWidth: 104, valueFormatter: dayFmt };
    case "time":
    case "createdAt":
      return { ...base, headerName: "时间", minWidth: 148 };
    case "startTime":
      return { ...base, headerName: "开始时间", minWidth: 148 };
    case "endTime":
      return { ...base, headerName: "结束时间", minWidth: 148 };
    case "clock":
      return { ...base, headerName: "时刻", minWidth: 84, valueFormatter: clockFmt };
    case "wgt":
    case "wetWeight":
    case "dryWeight":
    case "qty":
      return {
        ...base,
        headerName: k === "qty" ? "数量" : "重量 t",
        minWidth: 104,
        type: "numericColumn",
        valueFormatter: qtyFmt,
      };
    case "targetWeight":
    case "actualWeight":
    case "planWeight":
      return { ...base, headerName: "重量 t", minWidth: 104, type: "numericColumn", valueFormatter: qtyFmt };
    case "ratioPct":
      return { ...base, headerName: "配比 %", minWidth: 92, type: "numericColumn", valueFormatter: numFmt(2) };
    case "deviation":
      return { ...base, headerName: "偏差 %", minWidth: 104, type: "numericColumn", valueFormatter: numFmt(2) };
    case "h2o":
      return { ...base, headerName: "水分 %", minWidth: 92, type: "numericColumn", valueFormatter: numFmt(2) };
    case "temperature":
      return { ...base, headerName: "温度 ℃", minWidth: 96, type: "numericColumn", valueFormatter: numFmt(0) };
    case "levelPct":
    case "tankStock":
      return { ...base, headerName: "料位", minWidth: 132, cellRenderer: levelBarRenderer() };
    case "price":
    case "costPrice":
      return { ...base, headerName: "单价 元", minWidth: 96, type: "numericColumn", valueFormatter: moneyFmt };
    case "amount":
    case "totalPrice":
      return { ...base, headerName: "金额 元", minWidth: 108, type: "numericColumn", valueFormatter: moneyFmt };
    case "enabled":
    case "flagDel":
    case "isVirtual":
      return { ...base, headerName: "启用", width: 78, cellRenderer: boolRenderer() };
    case "remark":
    case "note":
      return { ...base, headerName: "备注", minWidth: 150, flex: 1, valueFormatter: dashFmt };
    case "operator":
    case "creator":
      return { ...base, headerName: "操作人", minWidth: 88, valueFormatter: dashFmt };
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

/** 页面可以传一张「字段 → 中文名」的表来覆盖自动列名（外键列尤其需要，见 nameMaps.ts） */
const HEADER_OVERRIDE: Record<string, string> = {};

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
        /* 钉到最左：有操作链接的表，操作列在最右要横滚才点得到（设备域收尾时统一改的，本域照做） */
        pinned: "left",
        cellRenderer: actionRenderer(acts),
      }
    : undefined;
  return [...(actionCol ? [actionCol] : []), ...cols];
});

/* 详情段：按 key 自动生成中文分组（基本信息 / 数量 / 状态 / 时间 / 人员 / 说明），页面传 detail 则整体替换 */
const LBL_GROUPS: Record<string, string> = {
  基本信息: [
    "id",
    "code",
    "name",
    "materialId",
    "materialName",
    "unitId",
    "workshopId",
    "siloId",
    "binCode",
    "batchNo",
    "stoveNo",
    "ladleId",
    "process",
    "type",
    "kind",
    "product",
  ],
  数量与金额: [
    "wgt",
    "wetWeight",
    "dryWeight",
    "qty",
    "targetWeight",
    "actualWeight",
    "planWeight",
    "ratioPct",
    "deviation",
    "h2o",
    "price",
    "costPrice",
    "amount",
    "totalPrice",
    "tankStock",
    "levelPct",
  ],
  状态: [
    "status",
    "level",
    "enabled",
    "flagDel",
    "isVirtual",
    "direction",
    "weighMode",
    "dataType",
    "dataStatus",
    "bizState",
  ],
  时间: [
    "time",
    "date",
    "prodDate",
    "createdAt",
    "startTime",
    "endTime",
    "beginDate",
    "endDate",
    "feedTime",
    "smpTime",
    "judgeTime",
    "clock",
  ],
  人员: ["operator", "creator", "smpUser", "sendUser", "judgeUser", "receiveUser", "issuer", "receiver"],
  说明: ["remark", "note", "reason", "message", "judgeRemark", "instruction"],
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
        label: HEADER_OVERRIDE[k] ?? colFor(k).headerName ?? k,
        from: k,
        ...(k === "level" ? { map: { ...LEVEL_MAP, ...ALARM_MAP } } : {}),
      })),
    });
  }
  const rest = keys.filter((k) => !used.has(k));
  if (rest.length) sections.push({ title: "其他", fields: rest.map((k) => ({ label: k, from: k })) });
  return sections;
});

const spec = computed<ListPageSpec>(() => ({
  code: "TQ",
  query: props.spec?.query ?? [],
  columns: [],
  fetch:
    props.spec?.fetch ??
    (async () => {
      throw new Error("铁区MES 列表页必须提供 spec.fetch（接口层见 src/api/mes4tq/index.ts）");
    }),
  ...props.spec,
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
      // 区间固定送 startTime/endTime（mock 的 dateRange/dayRange 只认这两个键，见 mock/mes4tq/query.ts）
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

/** 供页面外部（父组件通过 ref）触发重查：L2 版式里树选中变化后要重拉右表 */
defineExpose({ reload: query });

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
 * 导出：打 `POST /tqmes/export`（`exportRows`），刻意**不在前端造文件**——
 * 端点契约是回一个可读结果（「生产日报_2026-09.csv 已提交导出队列」），
 * 页面只负责把 msg 弹出来。真接后端时这个端点换成返回下载链接，页面零改动。
 * 送的是**上次查询的实际参数**（含分页），保证导出的和看到的是什么口径说得清。
 *
 * 这是本域**唯一的非查询端点**，但它不改任何数据，所以不违反「只查桩」的范围。
 */
async function exportCurrent() {
  try {
    const res = await exportRows(spec.value.exportEntity ?? spec.value.code, lastParams.value);
    applyResult(res, "已提交导出队列", toast);
  } catch {
    /* 拦截层已 toast */
  }
}

/* ── 详情弹窗 ─────────────────────────────────────────── */
const detailOpen = ref(false);
const detailData = ref<Record<string, any> | null>(null);

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

/** 行内动作的分派全在这一处：页面 spec 只声明「有什么动作」，不各页抄一遍管道 */
function runRowAct(a: RowAct, row: any) {
  if (a.kind === "detail") {
    void openDetail(row);
    return;
  }
  if (a.kind === "link" && a.to) {
    void router.push(a.to);
    return;
  }
  toast(`${a.label}待接入`, 2000, "warn");
}

function onExtra(label: string) {
  toast(`${label}待接入`, 2000, "warn");
}

/** 页面声明的动作 + 全域统一的「导出」（导出永远排最后，不抢页面自己的动作） */
const rowActions = computed(() => [
  ...(spec.value.actions ?? []).map((a) => ({
    label: a.label,
    shown: a.shown,
    onClick: (row: any) => runRowAct(a, row),
  })),
  { label: "导出", shown: undefined, onClick: () => void exportCurrent() },
]);

const summaryText = computed(() => {
  const s = spec.value.summary;
  if (typeof s === "function") return s({ total: total.value, rows: rows.value });
  return s ?? `共 ${total.value} 条`;
});

function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}

/**
 * 行点击 → 回调给页面（L3 主从双表的「选中主行」）。
 *
 * 只在 `spec.onRowClick` 给了时才有动作，L1 页不受影响——
 * L1 的行语义是「打开详情」，走的是操作列的 `detail`，不是整行点击
 * （整行点击会让「复制单号」这类操作变成点一下就弹窗）。
 */
function onRowClicked(row: any) {
  props.spec?.onRowClick?.(row);
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
        @row-clicked="onRowClicked"
      />
    </div>

    <Pager :total="total" :page="page" :page-size="pageSize" @change="onPage" />

    <DetailDialog v-model:open="detailOpen" :sections="detailSections" :data="detailData" />

    <!-- 统计卡：给 `statCards` 就出四格文字（数字 + 名称 + 次要行）。
         页面要给每格**再配一点东西**（迷你趋势、色标条）时用 <template #stat-card="{ t }">，
         有插槽时它与文字格并排成两列——两种用法都走同一条 grid，页面不必为
         「有没有插槽」另写一套布局。**只给插槽不给 statCards 是没有内容的空行**。 -->
    <div
      v-if="(statCards?.length ?? 0) > 0"
      class="shrink-0 grid grid-cols-2 gap-2 border-b border-border/60 px-3 py-2 sm:grid-cols-4"
    >
      <template v-for="(t, i) in statCards ?? []" :key="i">
        <div class="min-w-0">
          <div class="text-base tabular-nums">{{ t.value }}</div>
          <div class="truncate text-xs text-muted-foreground">{{ t.label }}</div>
          <div v-if="t.sub" class="truncate text-xs text-muted-foreground">{{ t.sub }}</div>
        </div>
        <slot v-if="$slots['stat-card']" name="stat-card" :t="t" />
      </template>
    </div>
  </div>
</template>
