<script setup lang="ts">
/** 对应 FrmFH2000（提货单查询，菜单 cQueryString=1003）：DDH.Winforms.SMP.Forms.FrmFH2000
 *  已接入：fh2000Api.getFhJl2000Lst（明细一次拉全，按 提货单/任务/车号/物流号… 分组求和 → 主表；
 *          主行变化再按 cTaskId 过滤出「提货明细」子表，纯前端过滤与原 C# 一致）
 *  待接入：无二级弹窗
 *  布局：查询区(10条件) → 查询按钮行 h-9[…查询 ……… 提货单汇总 右] → 上下Splitter：
 *        上=汇总主表(17可见列，原独立 h-8 标题「提货单汇总」按需求去掉) | 下=提货明细 h-8 标题 + 子表(31可见列) */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { fh2000Api, type InputFh2000Dto, type QueryFhJl2000Dto } from "@/api/mes4ddh/smp.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: menuQs } = useMenuQuery();

function defaultRange(): [Date, Date] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1);
  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);
  end.setSeconds(end.getSeconds() - 1);
  return [start, end];
}

const ZC_STATUS_OPTIONS = [
  { label: "准备", value: 0 },
  { label: "确认装车", value: 1 },
  { label: "下发计量称重", value: 2 },
  { label: "称重完成", value: 3 },
  { label: "作废", value: 98 },
  { label: "出厂", value: 99 },
];

const q = reactive({
  cBillOfLadingNo: "",
  cTaskId: "",
  cShipName: "",
  cVehicleNo: "",
  cPort: "",
  cOrderCustCname: "",
  cMatchId: "",
  nZcStatus: null as number | null,
  dates: defaultRange() as Date[] | null,
});

/* ---------- 列 ---------- */
/* 主表：分组汇总（原 gridView1，17 可见 + 49 hide） */
const mainColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cTaskId", headerName: "任务号", width: 130 },
  { field: "cBillOfLadingNo", headerName: "提货单号", width: 130 },
  { field: "cMatchId", headerName: "物流号", width: 130 },
  { field: "cVehicleNo", headerName: "车牌号", width: 110 },
  { field: "cItemFree3", headerName: "车辆状态", width: 100 },
  { field: "cShipName", headerName: "船名", width: 100 },
  { field: "cPort", headerName: "港口", width: 100 },
  { field: "cOrderCustCname", headerName: "订货客户名称", width: 150 },
  { field: "nNum", headerName: "提货件数", width: 90 },
  { field: "nWgt", headerName: "提货重量", width: 100 },
  { field: "nZcNum", headerName: "装车件数", width: 90 },
  { field: "nZcWgt", headerName: "装车重量", width: 100 },
  { field: "nSyNum", headerName: "剩余件数", width: 90 },
  { field: "nSyWgt", headerName: "剩余重量", width: 100 },
  { field: "cRemark", headerName: "备注", width: 130 },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "sysRemark", headerName: "系统备注", width: 130, flex: 1 },
  /* 主表隐藏列 */
  { field: "nZcStatus", headerName: "装车状态", hide: true },
  { field: "cOrderCustNo", headerName: "订货客户编码", hide: true },
  { field: "cOutStockCode", headerName: "出库仓库", hide: true },
  { field: "cOrderNo", headerName: "订单号", hide: true },
  { field: "cMatCode", headerName: "物料编码", hide: true },
  { field: "cMatName", headerName: "物料名称", hide: true },
  { field: "cSgCode", headerName: "钢种", hide: true },
  { field: "cSpec", headerName: "规格", hide: true },
  { field: "nThick", headerName: "厚度", hide: true },
  { field: "nWidth", headerName: "宽度", hide: true },
  { field: "cLengthType", headerName: "长度类型", hide: true },
  { field: "nLenMin", headerName: "长度下限", hide: true },
  { field: "nLenMax", headerName: "长度上限", hide: true },
  { field: "cQualityNo", headerName: "质量号", hide: true },
  { field: "cPlanId", headerName: "计划号", hide: true },
  { field: "nTare", headerName: "皮重", hide: true },
  { field: "dTareTime", headerName: "皮重时间", hide: true },
  { field: "nOutLen", headerName: "出库长度", hide: true },
  { field: "cTargetPlace", headerName: "收货地点", hide: true },
  { field: "nSwlx", headerName: "事务类型", hide: true },
  { field: "cKhzd", headerName: "客户终端", hide: true },
  { field: "nBillitemid", headerName: "制卡子表ID", hide: true },
  { field: "cInterfaceid", headerName: "接口id", hide: true },
  { field: "nSourceid", headerName: "供货单位ID", hide: true },
  { field: "nSourceplaceid", headerName: "供货地点ID", hide: true },
  { field: "cSourcememo", headerName: "供货备注", hide: true },
  { field: "nTargetplaceid", headerName: "收货库房ID", hide: true },
  { field: "targetid", headerName: "收货地点ID", hide: true },
  { field: "targetmemo", headerName: "收货备注", hide: true },
  { field: "planbegintime", headerName: "单据有效开始时间（制卡）", hide: true },
  { field: "planendtime", headerName: "单据有效结束时间（制卡）", hide: true },
  { field: "settlementmodes", headerName: "计重方式", hide: true },
  { field: "accountstype", headerName: "结算方", hide: true },
  { field: "operatype", headerName: "业务类型", hide: true },
  { field: "nClassindex", headerName: "班次", hide: true },
  { field: "nClasstype", headerName: "班别", hide: true },
  { field: "cItemFree1", headerName: "物料ID", hide: true },
  { field: "cItemFree2", headerName: "车辆状态", hide: true },
  { field: "gyqb", headerName: "切边", hide: true },
  { field: "gyqbDesc", headerName: "切边", hide: true },
  { field: "gyts", headerName: "探伤", hide: true },
  { field: "gyrcl", headerName: "交货状态", hide: true },
  { field: "cDelivyStatusCode", headerName: "交货状态", hide: true },
  { field: "gc", headerName: "公差", hide: true },
  { field: "performancemark", headerName: "性能要求", hide: true },
  { field: "qualitygrade", headerName: "质量等级", hide: true },
  { field: "qualitygradeDesc", headerName: "质量等级", hide: true },
  { field: "bcarea", headerName: "流向区域", hide: true },
  { field: "suttlleapp", headerName: "suttleapp", hide: true },
]);

/* 子表：提货明细（原 gridView2 ViewCaption=提货明细，31 可见 + 26 hide） */
const detailColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cMatchId", headerName: "物流号", width: 130 },
  { field: "cBillOfLadingNo", headerName: "提货单号", width: 130 },
  { field: "cItemFree3", headerName: "车辆状态", width: 100 },
  { field: "cVehicleNo", headerName: "车牌号", width: 110 },
  { field: "cMatName", headerName: "物料名称", width: 130 },
  { field: "cOrderCustCname", headerName: "订货客户名称", width: 150 },
  { field: "nNum", headerName: "提货件数", width: 90 },
  { field: "nWgt", headerName: "提货重量", width: 100 },
  { field: "nZcNum", headerName: "装车件数", width: 90 },
  { field: "nZcWgt", headerName: "装车重量", width: 100 },
  { field: "nSyNum", headerName: "剩余件数", width: 90 },
  { field: "nSyWgt", headerName: "剩余重量", width: 100 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  { field: "cSpec", headerName: "规格", width: 120 },
  { field: "nLenMin", headerName: "长度下限", width: 90 },
  { field: "nLenMax", headerName: "长度上限", width: 90 },
  { field: "nTare", headerName: "皮重", width: 90 },
  { field: "dTareTime", headerName: "皮重时间", width: 150 },
  { field: "cRemark", headerName: "备注", width: 130 },
  { field: "cShipName", headerName: "船名", width: 100 },
  { field: "cPort", headerName: "港口", width: 100 },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "cSourcememo", headerName: "供货备注", width: 130 },
  { field: "targetmemo", headerName: "收货备注", width: 130 },
  { field: "bcarea", headerName: "流向区域", width: 100 },
  { field: "gc", headerName: "公差", width: 80 },
  { field: "gyqbDesc", headerName: "切边", width: 80 },
  { field: "gyrcl", headerName: "交货状态", width: 90 },
  { field: "gyts", headerName: "探伤", width: 80 },
  { field: "qualitygradeDesc", headerName: "质量等级", width: 90 },
  { field: "performancemark", headerName: "性能要求", width: 100, flex: 1 },
  /* 隐藏列 */
  { field: "cTaskId", headerName: "任务号", hide: true },
  { field: "nZcStatus", headerName: "装车状态", hide: true },
  { field: "cOrderCustNo", headerName: "订货客户编码", hide: true },
  { field: "cOutStockCode", headerName: "出库仓库", hide: true },
  { field: "cOrderNo", headerName: "订单号", hide: true },
  { field: "cMatCode", headerName: "物料编码", hide: true },
  { field: "nThick", headerName: "厚度", hide: true },
  { field: "nWidth", headerName: "宽度", hide: true },
  { field: "cLengthType", headerName: "长度类型", hide: true },
  { field: "cQualityNo", headerName: "质量号", hide: true },
  { field: "cPlanId", headerName: "计划号", hide: true },
  { field: "nOutLen", headerName: "出库长度", hide: true },
  { field: "cTargetPlace", headerName: "收货地点", hide: true },
  { field: "nSwlx", headerName: "事务类型", hide: true },
  { field: "cKhzd", headerName: "客户终端", hide: true },
  { field: "nBillitemid", headerName: "制卡子表ID", hide: true },
  { field: "cInterfaceid", headerName: "接口id", hide: true },
  { field: "nSourceid", headerName: "供货单位ID", hide: true },
  { field: "nSourceplaceid", headerName: "供货地点ID", hide: true },
  { field: "nTargetplaceid", headerName: "收货库房ID", hide: true },
  { field: "targetid", headerName: "收货地点ID", hide: true },
  { field: "planbegintime", headerName: "单据有效开始时间（制卡）", hide: true },
  { field: "planendtime", headerName: "单据有效结束时间（制卡）", hide: true },
  { field: "settlementmodes", headerName: "计重方式", hide: true },
  { field: "accountstype", headerName: "结算方", hide: true },
  { field: "operatype", headerName: "业务类型", hide: true },
  { field: "nClassindex", headerName: "班次", hide: true },
  { field: "nClasstype", headerName: "班别", hide: true },
  { field: "cItemFree1", headerName: "物料ID", hide: true },
  { field: "cItemFree2", headerName: "车辆状态", hide: true },
]);

/* ---------- 状态 ---------- */
const rawRows = ref<QueryFhJl2000Dto[]>([]);
const groupRows = ref<QueryFhJl2000Dto[]>([]);
const detailRows = ref<QueryFhJl2000Dto[]>([]);
const querying = ref(false);
const mainApi = ref<GridApi | null>(null);
const detailApi = ref<GridApi | null>(null);

function onMainReady(e: GridReadyEvent) {
  mainApi.value = e.api;
}
function onDetailReady(e: GridReadyEvent) {
  detailApi.value = e.api;
}

/* ---------- 原 BindData：一次查询 → 分组求和（客户端聚合，与 C# 一致） ---------- */
function groupSummary(list: QueryFhJl2000Dto[]): QueryFhJl2000Dto[] {
  const keyOf = (x: QueryFhJl2000Dto) =>
    [x.cBillOfLadingNo, x.cTaskId, x.cVehicleNo, x.cMatchId, x.cOrderCustCname, x.cRemark, x.cItemFree2, x.createTime, x.cShipName, x.cPort].join("");
  const map = new Map<string, QueryFhJl2000Dto>();
  for (const x of list) {
    const k = keyOf(x);
    let agg = map.get(k);
    if (!agg) {
      agg = {
        cMatchId: x.cMatchId,
        cTaskId: x.cTaskId,
        cBillOfLadingNo: x.cBillOfLadingNo,
        cVehicleNo: x.cVehicleNo,
        cOrderCustCname: x.cOrderCustCname,
        cRemark: x.cRemark,
        cItemFree2: x.cItemFree2,
        cItemFree3: x.cItemFree3,
        createTime: x.createTime,
        cShipName: x.cShipName,
        cPort: x.cPort,
        nNum: 0,
        nWgt: 0,
        nZcNum: 0,
        nZcWgt: 0,
        nSyNum: 0,
        nSyWgt: 0,
      };
      map.set(k, agg);
    }
    agg.nNum = (agg.nNum ?? 0) + (x.nNum ?? 0);
    agg.nWgt = (agg.nWgt ?? 0) + (x.nWgt ?? 0);
    agg.nZcNum = (agg.nZcNum ?? 0) + (x.nZcNum ?? 0);
    agg.nZcWgt = (agg.nZcWgt ?? 0) + (x.nZcWgt ?? 0);
    agg.nSyNum = (agg.nSyNum ?? 0) + (x.nSyNum ?? 0);
    agg.nSyWgt = (agg.nSyWgt ?? 0) + (x.nSyWgt ?? 0);
  }
  return [...map.values()].sort((a, b) => String(a.createTime).localeCompare(String(b.createTime)));
}

async function onQuery() {
  querying.value = true;
  try {
    const input: InputFh2000Dto = {
      cBillOfLadingNo: q.cBillOfLadingNo || null,
      cTaskId: q.cTaskId || null,
      cMatchId: q.cMatchId || null,
      cShipName: q.cShipName || null,
      cVehicleNo: q.cVehicleNo || null,
      cPort: q.cPort || null,
      cOrderCustCname: q.cOrderCustCname || null,
      dBegin: q.dates?.[0]?.toISOString() ?? null,
      dEnd: q.dates?.[1]?.toISOString() ?? null,
      nZcStatus: (q.nZcStatus ?? null) as InputFh2000Dto["nZcStatus"],
      tclass: menuQs || null,
    };
    rawRows.value = ((await fh2000Api.getFhJl2000Lst(input)) ?? []) as QueryFhJl2000Dto[];
    groupRows.value = groupSummary(rawRows.value);
    detailRows.value = [];
    mainApi.value?.setGridOption("rowData", groupRows.value);
    detailApi.value?.setGridOption("rowData", []);
    requestAnimationFrame(() => {
      mainApi.value?.autoSizeAllColumns();
      detailApi.value?.autoSizeAllColumns();
    });
    if (!groupRows.value.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 主行变化 → 按 cTaskId 过滤明细（原 gridView1_FocusedRowObjectChanged） */
function onMainSelectionChanged() {
  const current = (mainApi.value?.getSelectedNodes()[0]?.data as QueryFhJl2000Dto | undefined) ?? null;
  if (!current) {
    detailRows.value = [];
    detailApi.value?.setGridOption("rowData", []);
    return;
  }
  detailRows.value = rawRows.value
    .filter((x) => x.cTaskId === current.cTaskId)
    .sort((a, b) => (a.nThick ?? 0) - (b.nThick ?? 0));
  detailApi.value?.setGridOption("rowData", detailRows.value);
  requestAnimationFrame(() => detailApi.value?.autoSizeAllColumns());
}

onMounted(() => {
  void onQuery();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl1：10 条件） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">提货单号</label>
        <InputText v-model="q.cBillOfLadingNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">任务号</label>
        <InputText v-model="q.cTaskId" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">船名</label>
        <InputText v-model="q.cShipName" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">车牌号</label>
        <InputText v-model="q.cVehicleNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">港口</label>
        <InputText v-model="q.cPort" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">收货单位</label>
        <InputText v-model="q.cOrderCustCname" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">物流号</label>
        <InputText v-model="q.cMatchId" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">装车状态</label>
        <Select v-model="q.nZcStatus" :options="ZC_STATUS_OPTIONS" option-label="label" option-value="value"
          show-clear placeholder="全部" class="min-w-0 flex-1" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">开始时间</label>
        <DatePicker v-model="q.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
      </div>
    </div>

    <!-- 按钮行（原 stackPanel1：查询） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <!-- 原为「提货明细（detailRows.length）」，按需求改文案；原上栏 h-8「提货单汇总」标题条已去除 -->
      <span class="ml-auto text-xs text-muted-foreground">提货单汇总</span>
    </div>

    <!-- 上下分栏（原 gridControl1 Fill / splitterControl2 / gridControl2 Dock.Bottom=提货明细） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="55" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="mainColDefs"
            :default-col-def="hmxDefaultColDef" :row-data="groupRows" :locale-text="AG_GRID_LOCALE_CN"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onMainReady" @selection-changed="onMainSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="45" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">提货明细</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="detailColDefs"
            :default-col-def="hmxDefaultColDef" :row-data="detailRows" :locale-text="AG_GRID_LOCALE_CN"
            :pagination="false" :animate-rows="false"
            @grid-ready="onDetailReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
