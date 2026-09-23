<script setup lang="ts">
/** 对应 FrmYD2020（调拨/转运入库，多菜单共用 cQueryString={Store,TarStores,Operators,StackType}）：
 *  DDH.Winforms.SYD.Forms.FrmYD2020 — 覆盖 产成品入库管理/堆冷板转运入库/各厂调拨入库·出库 共 6 个菜单
 *  已接入：tyd2020Api.queryDB（主表）+ dBCK（调拨出库）+ cancelDB / cancelCPDBRK（取消调拨，按业务类型分流）
 *  待接入：① 接收入库 → FrmYD2000DBRK（二级弹窗，占位）
 *          ② 子表右键「记录」弹出菜单（原 SetPopupMenuForRecord，占位）
 *  按钮显隐：「调拨出库」按菜单 cQueryString.Operators 含 btnOut 才显示（原 btnOut.Visible）
 *  布局：查询区(6条件) → 工具栏(stackPanel1：查询/调拨出库) → 上下Splitter：
 *        上=调拨单(Tyd2020Dto 14可见) | 下=[stackPanel2：接收入库/取消调拨] + 明细(Tyd2020 33可见) */
import { computed, onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconArrowBackUp, IconInbox, IconSearch, IconTruck } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { tyd1000Api, tyd2020Api, Tyd2010TypeEnum, Tyd2011StatusEnum, type QueryDBDto, type Tyd1000, type Tyd2020, type Tyd2020Dto } from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: menuQs, json: qsJson } = useMenuQuery();

interface InputParams {
  Store?: string;
  TarStores?: string[];
  Operators?: string[];
  StackType?: number;
}
const params = computed<InputParams>(() => ({
  Store: typeof qsJson.Store === "string" ? qsJson.Store : undefined,
  TarStores: Array.isArray(qsJson.TarStores) ? (qsJson.TarStores as string[]) : [],
  Operators: Array.isArray(qsJson.Operators) ? (qsJson.Operators as string[]) : [],
  StackType: typeof qsJson.StackType === "number" ? qsJson.StackType : undefined,
}));

function defaultRange(): [Date, Date] {
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 1);
  const end = new Date(); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() + 1); end.setSeconds(end.getSeconds() - 1);
  return [start, end];
}

/* 主表（原 gridView1，Tyd2020Dto 14 可见 + 2 hide） */
const masterColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cBusinsNo", headerName: "业务单据号", width: 160 },
  { field: "nStatus", headerName: "调拨状态", width: 110 },
  { field: "dReqTime", headerName: "申请时间", width: 170 },
  { field: "cReqUser", headerName: "申请人", width: 110 },
  { field: "nBusinsType", headerName: "业务类型", width: 110 },
  { field: "cStoreCode", headerName: "库区号", width: 130 },
  { field: "cTarStoreCode", headerName: "目标库区号", width: 140 },
  { field: "cCarNo", headerName: "运输车辆", width: 120 },
  { field: "totalNum", headerName: "总数量", width: 100 },
  { field: "totalNWgt", headerName: "总重", width: 100 },
  { field: "totalAccept", headerName: "已接收数量", width: 120 },
  { field: "totalAcceptWgt", headerName: "已接收重量", width: 130 },
  { field: "totalFinishNum", headerName: "已完成数量", width: 130 },
  { field: "totalFinishNWgt", headerName: "已完成重量", width: 140, flex: 1 },
  { field: "cTarStackNo", headerName: "目标垛位号", hide: true },
  { field: "cTarStackNum", headerName: "目标层号", hide: true },
]);

/* 子表（原 gridView2，Tyd2020 33 可见 + 20 hide） */
const detailColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cBusinsNo", headerName: "业务单据号", width: 160 },
  { field: "nStatus", headerName: "调拨状态", width: 110, cellClass: "yd-status-out" },
  { field: "cStove", headerName: "炉号", width: 110 },
  { field: "cPieceNo", headerName: "件次号", width: 150 },
  { field: "cBatchNo", headerName: "批次号", width: 120 },
  { field: "cOrderNo", headerName: "订单号", width: 150 },
  { field: "cSgCode", headerName: "钢种", width: 110 },
  { field: "cSgStd", headerName: "执行标准", width: 130 },
  { field: "cSpec", headerName: "规格", width: 140 },
  { field: "cInboundNo", headerName: "入库标识", width: 120 },
  { field: "nWgt", headerName: "实重", width: 100 },
  { field: "cFinishUser", headerName: "完成人", width: 110 },
  { field: "dFinishTime", headerName: "完成时间", width: 170 },
  { field: "cTarStoreCode", headerName: "目标库区号", width: 140 },
  { field: "cTarStackNo", headerName: "目标垛位号", width: 130 },
  { field: "cTarStackNum", headerName: "目标层号", width: 110 },
  { field: "nThick", headerName: "厚度", width: 90 },
  { field: "nWth", headerName: "宽度", width: 90 },
  { field: "nLen", headerName: "长度", width: 90 },
  { field: "nNum", headerName: "支数", width: 90 },
  { field: "cStoreCode", headerName: "原库区号", width: 130 },
  { field: "cStackNo", headerName: "原垛位号", width: 120 },
  { field: "cStackNum", headerName: "原层号", width: 100 },
  { field: "cShiftNo", headerName: "产出班次", width: 110 },
  { field: "cGroupNo", headerName: "产出班组", width: 110 },
  { field: "dProTime", headerName: "产出时间", width: 170 },
  { field: "cOutUser", headerName: "出库人", width: 110 },
  { field: "dOutTime", headerName: "出库时间", width: 170 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 110 },
  { field: "cCustStdCode", headerName: "加工用途代码", width: 140 },
  { field: "cSteelType", headerName: "钢种大类", width: 120 },
  { field: "cCutFlag", headerName: "切边方式", width: 110, flex: 1 },
  { field: "id", headerName: "主键", hide: true },
  { field: "cMachine", headerName: "机台号", hide: true },
  { field: "cMatCode", headerName: "物料号", hide: true },
  { field: "nCalWgt", headerName: "理重", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cIngotCode", headerName: "锭坯型代码", hide: true },
  { field: "cReason", headerName: "申请原因", hide: true },
  { field: "dReqTime", headerName: "申请时间", hide: true },
  { field: "nBusinsType", headerName: "业务类型", hide: true },
  { field: "cUnacceptBusinsNo", headerName: "拒收单据号", hide: true },
  { field: "nUnacceptBusinsType", headerName: "拒收类型", hide: true },
  { field: "nProType", headerName: "坯材区分", hide: true },
  { field: "nWgtP", headerName: "坯重", hide: true },
  { field: "nWgtD", headerName: "锭重", hide: true },
  { field: "cpStove", headerName: "母炉号", hide: true },
  { field: "nCastDivCode", headerName: "模连铸标识", hide: true },
]);

/* 查询条件（原 dataLayoutControl1 + stackPanel2 场景） */
const STATUS_OPTIONS = [
  { label: "未完成", value: "1" },
  { label: "已取消", value: "3" },
  { label: "已完成", value: "4" },
];
const q = reactive({
  nStatus: null as string | null,
  cStore: params.value.Store ?? "",
  cTarStore: null as string | null,
  cPieceNo: "",
  cCarNo: "",
  dates: defaultRange() as Date[] | null,
});

const storeOptions = ref<{ label: string; value: string }[]>([]);
const tarStoreOptions = ref<{ label: string; value: string }[]>([]);
const masters = ref<Tyd2020Dto[]>([]);
const details = ref<Tyd2020[]>([]);
const querying = ref(false);
const masterApi = ref<GridApi | null>(null);
const detailApi = ref<GridApi | null>(null);

const showOut = computed(() => params.value.Operators?.includes("btnOut") ?? false);

function onMasterReady(e: GridReadyEvent) { masterApi.value = e.api; }
function onDetailReady(e: GridReadyEvent) { detailApi.value = e.api; }

function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function loadStores() {
  try {
    const list = ((await tyd1000Api.queryRoom("")) ?? []) as Tyd1000[];
    const opts = list.filter((x) => x.cStoreCode != null)
      .map((x) => ({ label: x.cStoreDes ?? x.cStoreCode ?? "", value: x.cStoreCode! }));
    storeOptions.value = opts;
    tarStoreOptions.value = params.value.TarStores?.length
      ? opts.filter((o) => params.value.TarStores!.includes(o.value))
      : opts;
    if (q.cStore && !opts.some((o) => o.value === q.cStore)) {
      // 菜单库区可能不在全量里，仍回填展示
      q.cStore = q.cStore;
    }
    if (tarStoreOptions.value.length === 1) q.cTarStore = tarStoreOptions.value[0]!.value;
  } catch { /* 拦截层已 toast */ }
}

function buildQuery(): QueryDBDto {
  return {
    timeRange: q.dates?.[0] && q.dates?.[1]
      ? { min: isoDate(q.dates[0]), max: isoDate(q.dates[1]) }
      : undefined,
    cStore: q.cStore || null,
    cTarStore: q.cTarStore || null,
    cStatus: q.nStatus,
    cPieceNo: q.cPieceNo || null,
    cCarNo: q.cCarNo || null,
  };
}

async function onQuery() {
  querying.value = true;
  try {
    masters.value = ((await tyd2020Api.queryDB(buildQuery())) ?? []) as Tyd2020Dto[];
    details.value = [];
    masterApi.value?.setGridOption("rowData", masters.value);
    detailApi.value?.setGridOption("rowData", []);
    requestAnimationFrame(() => masterApi.value?.autoSizeAllColumns());
    if (masters.value.length) selectFirst();
    if (!masters.value.length) toast("无符合条件的数据", 2000, "info");
  } catch { /* 拦截层已 toast */ } finally { querying.value = false; }
}

function selectFirst() {
  if (!masterApi.value) return;
  let first = true;
  masterApi.value.forEachNode((n) => { if (first) { n.setSelected(true, true); first = false; } });
}

function focusMaster(): Tyd2020Dto | null {
  return (masterApi.value?.getSelectedNodes()[0]?.data as Tyd2020Dto | undefined) ?? null;
}
function selectedDetails(): Tyd2020[] {
  const byGrid = (detailApi.value?.getSelectedRows() ?? []) as Tyd2020[];
  if (byGrid.length) return byGrid;
  return details.value.filter((x) => x.selected);
}

function onMasterSelectionChanged() {
  const cur = focusMaster();
  details.value = (cur?.details ?? []) as Tyd2020[];
  detailApi.value?.setGridOption("rowData", details.value);
  requestAnimationFrame(() => detailApi.value?.autoSizeAllColumns());
}

/* btnOut 调拨出库 → DBCK */
async function onOut() {
  const cur = focusMaster();
  if (!cur) { toast("请选择后再操作", 2000, "warn"); return; }
  const list = (cur.details ?? []) as Tyd2020[];
  if (list.some((l) => l.nStatus !== Tyd2011StatusEnum.Request)) { toast("状态错误不允许操作", 2500, "warn"); return; }
  if (!window.confirm(`确认出库？数量${list.length}`)) return;
  querying.value = true;
  try {
    await tyd2020Api.dBCK(list.map((w) => w.id!).filter(Boolean));
    await onQuery();
  } catch { /* 拦截层已 toast */ } finally { querying.value = false; }
}

/* btnRecevie 接收入库 → FrmYD2000DBRK（占位） */
function onReceive() {
  const cur = focusMaster();
  if (!cur) { toast("请选择后再操作", 2000, "warn"); return; }
  const selected = selectedDetails();
  if (!selected.length) { toast("请勾选材料后再操作", 2500, "warn"); return; }
  if (selected.some((l) => l.nStatus !== Tyd2011StatusEnum.Out)) { toast("状态错误不允许操作", 2500, "warn"); return; }
  toast("接收入库弹窗（FrmYD2000DBRK）待接入", 2500, "warn");
}

/* btnCancel 取消调拨 → CancelCPDBRK / CancelDB */
async function onCancel() {
  const cur = focusMaster();
  if (!cur) { toast("请选择后再操作", 2000, "warn"); return; }
  const validStatus =
    cur.nBusinsType === Tyd2010TypeEnum.DB203 || cur.nBusinsType === Tyd2010TypeEnum.DB201
      ? Tyd2011StatusEnum.Out
      : Tyd2011StatusEnum.Request;
  const selected = selectedDetails();
  if (!selected.length) { toast("请勾选材料后再操作", 2500, "warn"); return; }
  if (selected.some((l) => l.nStatus !== validStatus)) { toast("状态错误不允许操作", 2500, "warn"); return; }
  if (!window.confirm(`确认取消？数量${selected.length}`)) return;
  querying.value = true;
  try {
    const ids = selected.map((w) => w.id!).filter(Boolean);
    if (cur.nBusinsType === Tyd2010TypeEnum.DB203) await tyd2020Api.cancelCPDBRK(ids);
    else await tyd2020Api.cancelDB(ids);
    await onQuery();
  } catch { /* 拦截层已 toast */ } finally { querying.value = false; }
}

onMounted(() => { void loadStores().then(() => onQuery()); });
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区 -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">申请状态</label>
        <Select v-model="q.nStatus" :options="STATUS_OPTIONS" option-label="label" option-value="value" show-clear
          placeholder="全部" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">库区</label>
        <Select v-model="q.cStore" :options="storeOptions" option-label="label" option-value="value"
          placeholder="库区" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">目标库区</label>
        <Select v-model="q.cTarStore" :options="tarStoreOptions" option-label="label" option-value="value" show-clear
          placeholder="全部" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">车号</label>
        <InputText v-model="q.cCarNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">申请时间</label>
        <DatePicker v-model="q.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
      </div>
    </div>

    <!-- 顶部工具栏（原 stackPanel1：查询 / 调拨出库） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button v-if="showOut" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onOut">
        <IconTruck class="h-3 w-3" />调拨出库
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">调拨单（{{ masters.length }}）</span>
    </div>

    <!-- 上下分栏（原 splitContainerControl1 Orientation=Vertical SplitterPosition=321） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="45" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="masterColDefs"
            :default-col-def="hmxDefaultColDef" :row-data="masters" :locale-text="AG_GRID_LOCALE_CN"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onMasterReady" @selection-changed="onMasterSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="55" :minSize="25" class="flex flex-col overflow-hidden">
        <!-- 底部按钮条（原 stackPanel2：接收入库 / 取消调拨） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onReceive">
            <IconInbox class="h-3 w-3" />接收入库
          </Button>
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onCancel">
            <IconArrowBackUp class="h-3 w-3" />取消调拨
          </Button>
          <span class="ml-auto text-xs text-muted-foreground">调拨明细（{{ details.length }}）</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="detailColDefs"
            :default-col-def="hmxDefaultColDef" :row-data="details" :locale-text="AG_GRID_LOCALE_CN"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :pagination="false" :animate-rows="false"
            @grid-ready="onDetailReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<style scoped>
/* 原 gridView2_RowStyle：已出库行黄底 */
:deep(.yd-status-out) {
  background-color: #fef9c3;
}
</style>
