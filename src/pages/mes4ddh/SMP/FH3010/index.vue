<script setup lang="ts">
/** 对应 FrmFH3010（装车异常日志）：DDH.Winforms.SMP.Forms.FrmFH3010
 *  已接入：fh2000Api.getTsd1000Log（swagger 补）
 *          + 默认时间 = 本月1日 ~ 今天（原 Load）
 *  待接入：无二级弹窗
 *  布局：查询区(5条件+查询) → 单表(Tsd1000Log 6可见列 + 13 hide) */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { fh2000Api, type InputFh2000Dto, type Tsd1000Log } from "@/api/mes4ddh/smp.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

function defaultRange(): [Date, Date] {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  return [start, end];
}

const q = reactive({
  cMatchId: "",
  cVehicleNo: "",
  cPieceNo: "",
  dates: defaultRange() as Date[] | null,
});

const colDefs = ref<ColDef[]>([
  { field: "creator", headerName: "创建人", width: 100 },
  { field: "createTime", headerName: "创建时间", width: 160 },
  { field: "cMatchId", headerName: "物流号", width: 140 },
  { field: "cVehicleNo", headerName: "车牌号", width: 110 },
  { field: "cMatNo", headerName: "件次号", width: 150 },
  { field: "cRemark", headerName: "日志说明", width: 300, flex: 1 },
  /* 隐藏列 */
  { field: "id", headerName: "C_ID", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cTaskId", headerName: "任务ID", hide: true },
  { field: "cBillOfLadingNo", headerName: "提货单号", hide: true },
  { field: "cMatCode", headerName: "物料编码", hide: true },
  { field: "cMatName", headerName: "物料名称", hide: true },
  { field: "nStatus", headerName: "业务状态1有效，0无效", hide: true },
  { field: "nZcStatus", headerName: "业务装车状态", hide: true },
  { field: "nSwlx", headerName: "事务类型", hide: true },
  { field: "nWgt", headerName: "提货重量", hide: true },
  { field: "nNum", headerName: "提货件数", hide: true },
  { field: "selected", headerName: "选择", hide: true },
  { field: "cErrorCode", headerName: "错误代码", hide: true },
]);

const rows = ref<Tsd1000Log[]>([]);
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
      cPieceNo: q.cPieceNo || null,
      dBegin: q.dates?.[0]?.toISOString() ?? null,
      dEnd: q.dates?.[1]?.toISOString() ?? null,
    };
    const list = ((await fh2000Api.getTsd1000Log(input)) ?? []) as Tsd1000Log[];
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
    <!-- 查询区（原 dataLayoutControl1：5 条件 + 查询） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">物流号</label>
        <InputText v-model="q.cMatchId" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">车牌号</label>
        <InputText v-model="q.cVehicleNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">开始时间</label>
        <DatePicker
          v-model="q.dates"
          selection-mode="range"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          placeholder="开始 至 结束"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex items-center">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>

    <!-- 单表（原 gridControl1 Dock.Fill） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :default-col-def="hmxDefaultColDef"
        :row-data="rows"
        :locale-text="AG_GRID_LOCALE_CN"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
