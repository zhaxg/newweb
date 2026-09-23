<script setup lang="ts">
/** 对应 FrmFH3030（装车出厂统计查询 / 窗体标题「装车明细查询」）：DDH.Winforms.SMP.Forms.FrmFH3030
 *  已接入：fh2000Api.getZcDetailLst（既有方法）
 *          + 默认时间 = 昨天 0 点 ~ 今天末（原 Load）
 *  待接入：无二级弹窗
 *  布局：查询区(12条件+查询) → 单表(QueryMatOutDto 32可见列 + 5 hide) */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { fh2000Api, type InputFh2000Dto, type QueryMatOutDto } from "@/api/mes4ddh/smp.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

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

const q = reactive({
  cMatchId: "",
  cVehicleNo: "",
  cBillOfLadingNo: "",
  cShipName: "",
  creator: "",
  cPieceNo: "",
  cOrderCustCname: "",
  cSgCode: "",
  cInboundNo: "",
  cStove: "",
  dates: defaultRange() as Date[] | null,
});

const colDefs = ref<ColDef[]>([
  { field: "cMatchId", headerName: "物流号", width: 140 },
  { field: "cOrderCustCname", headerName: "订货客户名称", width: 150 },
  { field: "cVehicleNo", headerName: "车号", width: 110 },
  { field: "nStatus", headerName: "装车状态", width: 100 },
  { field: "cMatNo", headerName: "件次号", width: 150 },
  { field: "nMatCount", headerName: "件数", width: 80 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  { field: "nMatActWgt", headerName: "材料重量", width: 100 },
  { field: "nMatThick", headerName: "材料厚度", width: 90 },
  { field: "nMatWidth", headerName: "材料宽度", width: 90 },
  { field: "nMatLen", headerName: "材料长度", width: 90 },
  { field: "cTrimFlag", headerName: "切边方式", width: 90 },
  { field: "cWgtToler", headerName: "公差", width: 80 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 90 },
  { field: "cComplexDecideCode", headerName: "综判结果", width: 100 },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 110 },
  { field: "cInboundNo", headerName: "入库标识", width: 100 },
  { field: "cShiftNo", headerName: "出库班次", width: 90 },
  { field: "cGroupNo", headerName: "出库班组", width: 90 },
  { field: "creator", headerName: "发货人", width: 100 },
  { field: "createTime", headerName: "发货时间", width: 160 },
  { field: "cShipName", headerName: "船名", width: 110 },
  { field: "cPort", headerName: "港口", width: 100 },
  { field: "nSelectMode", headerName: "PDA模式", width: 90 },
  { field: "cBillOfLadingNo", headerName: "提货单号", width: 140 },
  { field: "cTaskId", headerName: "任务号", width: 120 },
  { field: "cMatCode", headerName: "物料编码", width: 120 },
  { field: "cMatName", headerName: "物料名称", width: 150 },
  { field: "cRemark", headerName: "备注", width: 130 },
  { field: "cStockRoomNo", headerName: "库位号", width: 100 },
  { field: "cArer", headerName: "区域", width: 100 },
  { field: "cReserveField1", headerName: "钢板分类", width: 100, flex: 1 },
  /* 隐藏列 */
  { field: "cGcStd", headerName: "公差标准", hide: true },
  { field: "cTsStd", headerName: "探伤标准", hide: true },
  { field: "cSgStd", headerName: "执行标准", hide: true },
  { field: "cStove", headerName: "炉号", hide: true },
  { field: "cZStd", headerName: "Z性能标准", hide: true },
  { field: "selected", headerName: "选择", hide: true },
]);

const rows = ref<QueryMatOutDto[]>([]);
const querying = ref(false);
const api = ref<GridApi | null>(null);

function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

async function onQuery() {
  querying.value = true;
  try {
    const input: InputFh2000Dto = {
      cMatchId: q.cMatchId || null,
      cVehicleNo: q.cVehicleNo || null,
      cBillOfLadingNo: q.cBillOfLadingNo || null,
      cShipName: q.cShipName || null,
      creator: q.creator || null,
      cPieceNo: q.cPieceNo || null,
      cOrderCustCname: q.cOrderCustCname || null,
      cSgCode: q.cSgCode || null,
      cInboundNo: q.cInboundNo || null,
      cStove: q.cStove || null,
      dBegin: q.dates?.[0]?.toISOString() ?? null,
      dEnd: q.dates?.[1]?.toISOString() ?? null,
    };
    const list = ((await fh2000Api.getZcDetailLst(input)) ?? []) as QueryMatOutDto[];
    rows.value = list;
    api.value?.setGridOption("rowData", list);
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
    if (!list.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

onMounted(() => {
  void onQuery();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl1：12 条件 + 查询） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">物流号</label>
        <InputText v-model="q.cMatchId" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">车号</label>
        <InputText v-model="q.cVehicleNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">提货单号</label>
        <InputText v-model="q.cBillOfLadingNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">船名</label>
        <InputText v-model="q.cShipName" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">发货人</label>
        <InputText v-model="q.creator" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订货单位</label>
        <InputText v-model="q.cOrderCustCname" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="q.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
        <InputText v-model="q.cInboundNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="q.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">开始时间</label>
        <DatePicker v-model="q.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
      </div>
      <div class="flex items-center">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
          <IconSearch class="h-3 w-3" />查 询
        </Button>
      </div>
    </div>

    <!-- 单表 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="colDefs"
        :default-col-def="hmxDefaultColDef" :row-data="rows" :locale-text="AG_GRID_LOCALE_CN"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
        :pagination="false" :animate-rows="false" :loading="querying"
        @grid-ready="onReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
