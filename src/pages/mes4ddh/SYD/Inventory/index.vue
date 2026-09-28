<script setup lang="ts">
/** 对应 FrmInventory（库存盘点计划，菜单代码 YD9000）：DDH.Winforms.SYD.Forms.Inven.FrmInventory
 *  已接入：inventoryApi.queryInventoryPlan / queryInventoryArea（主子联动）
 *          + startInventoryPlan（盘点开始）/ editInventoryResults（结束盘点）/ delPlan（作废）
 *          + tPa1000Api.queryLines（产线下拉，原 UCLine.RefreshData → ITpa1000AppService.QueryLines）
 *          默认时间 = 本月1日 ~ 月末（原 Load）
 *  待接入：创建盘点计划 → FrmInventoryEdit（二级弹窗，占位）
 *  状态色：未盘点=蓝 / 进行中=红粗 / 盘点结束=绿粗（原 gridView1_RowCellStyle）
 *  布局：工具栏一行(产线/盘点计划号/起止时间/查询/创建盘点计划/盘点开始/结束盘点/作废)
 *        → 左右Splitter：左=盘点计划(Tyd2000PdPlan 7可见) | 右=盘点区域(Tyd2000PdPlanArea 3可见) */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconFilePlus, IconPlayerPlay, IconPlayerStop, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { tPa1000Api } from "@/api/mes4ddh/shr.swagger";
import {
  inventoryApi,
  InventoryPlanStatusEnum,
  type InventoryPlanQueryDto,
  type Tyd2000PdPlan,
  type Tyd2000PdPlanArea,
} from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* 状态着色（原 gridView1_RowCellStyle） */
const STATUS_STYLE: Record<number, string> = {
  [InventoryPlanStatusEnum.InProgress]: "font-weight-bold;color:#dc2626;", // 进行中 红粗
  [InventoryPlanStatusEnum.Completed]: "font-weight-bold;color:#16a34a;", // 盘点结束 绿粗
  [InventoryPlanStatusEnum.NotStarted]: "color:#2563eb;", // 未盘点 蓝
  [InventoryPlanStatusEnum.Del]: "color:#6b7280;", // 作废 灰
};
const statusCellClass = (p: { value?: unknown }) =>
  STATUS_STYLE[p.value as number] ?? STATUS_STYLE[InventoryPlanStatusEnum.NotStarted]!;

const STATUS_LABELS: Record<number, string> = {
  [InventoryPlanStatusEnum.NotStarted]: "未盘点",
  [InventoryPlanStatusEnum.InProgress]: "进行中",
  [InventoryPlanStatusEnum.Completed]: "盘点结束",
  [InventoryPlanStatusEnum.Del]: "作废",
};
const statusFmt = (p: { value?: unknown }) => STATUS_LABELS[p.value as number] ?? String(p.value ?? "");

/* 原 gridView1：Tyd2000PdPlan，7 可见 + 6 hide */
const planColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cLineCode", headerName: "产线", width: 110 },
  { field: "cInventoryPlanNo", headerName: "盘点计划号", width: 170 },
  { field: "dPlanStartTime", headerName: "计划开始时间", width: 170 },
  { field: "dPlanEndTime", headerName: "计划结束时间", width: 170 },
  { field: "cPlanStatus", headerName: "计划状态", width: 110, valueFormatter: statusFmt, cellClass: statusCellClass },
  { field: "cInventoryType", headerName: "盘点类型", width: 110 },
  { field: "cPlanDescription", headerName: "计划描述", width: 220, flex: 1 },
  /* 隐藏列 */
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
]);

/* 原 gridView3：Tyd2000PdPlanArea，3 可见 + 6 hide */
const areaColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cInventoryPlanNo", headerName: "盘点计划号", width: 180 },
  { field: "cStoreCode", headerName: "库区号", width: 140 },
  { field: "cStackNo", headerName: "垛位号", width: 140, flex: 1 },
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
]);

/* 查询条件（原 stackPanel1：产线 UCLine / 盘点计划号 / 计划创建时间 dtS~dtE） */

/** AG Grid 本版 GridApi 无 selectIndex：用 forEachNode 选中首行 */
function selectFirstRow(gridApi: GridApi | null) {
  if (!gridApi) return;
  let first = true;
  gridApi.forEachNode((node) => {
    if (first) {
      node.setSelected(true, true);
      first = false;
    }
  });
}

function monthRange(): [Date, Date] {
  const s = new Date();
  s.setDate(1);
  s.setHours(0, 0, 0, 0);
  const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
  e.setHours(23, 59, 59, 0);
  return [s, e];
}

const q = reactive({
  lineCode: null as string | null,
  inventoryPlanNo: "",
  dates: monthRange() as Date[] | null,
});

const lineOptions = ref<{ label: string; value: string }[]>([]);
const plans = ref<Tyd2000PdPlan[]>([]);
const areas = ref<Tyd2000PdPlanArea[]>([]);
const querying = ref(false);
const planApi = ref<GridApi | null>(null);
const areaApi = ref<GridApi | null>(null);

function onPlanReady(e: GridReadyEvent) {
  planApi.value = e.api;
}
function onAreaReady(e: GridReadyEvent) {
  areaApi.value = e.api;
}

function focusPlan(): Tyd2000PdPlan | null {
  return (planApi.value?.getSelectedNodes()[0]?.data as Tyd2000PdPlan | undefined) ?? null;
}

function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* 产线下拉（原 ucLine1.RefreshData → QueryLines） */
async function loadLines() {
  try {
    const list = (await tPa1000Api.queryLines()) ?? [];
    lineOptions.value = list
      .filter((x: { cLineCode?: string | null }) => x.cLineCode != null)
      .map((x: { cLineCode?: string | null; cName?: string | null; cSimpName?: string | null }) => ({
        label: x.cSimpName ?? x.cName ?? x.cLineCode!,
        value: x.cLineCode!,
      }));
  } catch {
    /* 拦截层已 toast */
  }
}

/* LoadInventoryPlanData → QueryInventoryPlan */
async function onQuery() {
  querying.value = true;
  try {
    const input: InventoryPlanQueryDto = {
      lineCode: q.lineCode ?? undefined,
      inventoryPlanNo: q.inventoryPlanNo.trim() || null,
      startDate: q.dates?.[0] ? isoDate(q.dates[0]) : undefined,
      endDate: q.dates?.[1] ? isoDate(q.dates[1]) : undefined,
    };
    plans.value = ((await inventoryApi.queryInventoryPlan(input)) ?? []) as Tyd2000PdPlan[];
    planApi.value?.setGridOption("rowData", plans.value);
    areas.value = [];
    areaApi.value?.setGridOption("rowData", []);
    requestAnimationFrame(() => planApi.value?.autoSizeAllColumns());
    if (plans.value.length) {
      selectFirstRow(planApi.value);
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* LoadInventoryAreaData → QueryInventoryArea(planNo)，随主行选中变化 */
async function onPlanSelectionChanged() {
  const plan = focusPlan();
  if (!plan) {
    areas.value = [];
    areaApi.value?.setGridOption("rowData", []);
    return;
  }
  try {
    areas.value = ((await inventoryApi.queryInventoryArea(plan.cInventoryPlanNo ?? undefined)) ??
      []) as Tyd2000PdPlanArea[];
    areaApi.value?.setGridOption("rowData", areas.value);
    requestAnimationFrame(() => areaApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  }
}

/* btnCreateInvPlan → FrmInventoryEdit（二级弹窗，占位） */
function onCreatePlan() {
  toast("创建盘点计划弹窗（FrmInventoryEdit）待接入", 2500, "warn");
}

/* btnStartInv → StartInventoryPlan，含原状态校验与提示 */
async function onStart() {
  const plan = focusPlan();
  if (!plan) {
    toast("请先选择要开始的盘点计划！", 2000, "warn");
    return;
  }
  if (plan.cPlanStatus === InventoryPlanStatusEnum.Completed) {
    toast("该盘点计划已结束，无法重新开始！", 2500, "warn");
    return;
  }
  if (plan.cPlanStatus === InventoryPlanStatusEnum.InProgress) {
    toast("该盘点计划已开始，无需重复！", 2500, "warn");
    return;
  }
  if (!window.confirm("确认要开始盘点吗？")) return;
  querying.value = true;
  try {
    await inventoryApi.startInventoryPlan(plan.cInventoryPlanNo ?? undefined);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnEndInventory → EditInventoryResults，含原状态校验 */
async function onEnd() {
  const plan = focusPlan();
  if (!plan) {
    toast("请先选择要结束的盘点计划！", 2000, "warn");
    return;
  }
  if (plan.cPlanStatus === InventoryPlanStatusEnum.NotStarted) {
    toast("该计划未开始盘点，无法结束盘点！", 2500, "warn");
    return;
  }
  if (plan.cPlanStatus === InventoryPlanStatusEnum.Completed) {
    toast("该盘点计划已结束！", 2500, "warn");
    return;
  }
  if (!window.confirm("确认要结束盘点吗？")) return;
  querying.value = true;
  try {
    await inventoryApi.editInventoryResults(plan.cInventoryPlanNo ?? undefined);
    toast("盘点结束成功！", 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnDel 作废盘点 → DelPlan */
async function onDel() {
  const plan = focusPlan();
  if (!plan) {
    toast("请先选择盘点计划！", 2000, "warn");
    return;
  }
  if (!window.confirm("确认要作废吗？")) return;
  querying.value = true;
  try {
    await inventoryApi.delPlan(plan.id ?? undefined);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

onMounted(() => {
  void loadLines().then(() => onQuery());
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：产线/盘点计划号/计划创建时间~ + 查询/创建盘点计划/盘点开始/结束盘点/作废） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <Select
        v-model="q.lineCode"
        :options="lineOptions"
        option-label="label"
        option-value="value"
        show-clear
        filter
        placeholder="全部产线"
        class="w-40 shrink-0"
      />
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">盘点计划号</label>
      <InputText v-model="q.inventoryPlanNo" class="w-44 shrink-0" @keydown.enter="onQuery" />
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">计划创建时间</label>
      <DatePicker
        v-model="q.dates"
        selection-mode="range"
        :manual-input="false"
        date-format="yy-mm-dd"
        placeholder="~"
        class="w-72 shrink-0"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCreatePlan">
        <IconFilePlus class="h-3 w-3" />创建盘点计划
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onStart">
        <IconPlayerPlay class="h-3 w-3" />盘点开始
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEnd">
        <IconPlayerStop class="h-3 w-3" />结束盘点
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDel">
        <IconTrash class="h-3 w-3" />作废盘点
      </Button>
    </div>

    <!-- 左右分栏（原 splitContainerControl1 SplitterPosition=778：Panel1=计划 / Panel2=区域） -->
    <Splitter class="min-h-0 flex-1">
      <SplitterPanel :size="55" :minSize="30" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">盘点计划</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="planColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="plans"
            :locale-text="AG_GRID_LOCALE_CN"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onPlanReady"
            @selection-changed="onPlanSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="45" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">盘点区域</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="areaColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="areas"
            :locale-text="AG_GRID_LOCALE_CN"
            :pagination="false"
            :animate-rows="false"
            @grid-ready="onAreaReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
