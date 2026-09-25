<script setup lang="ts">
/** 对应 FrmYD9200（入库统计，菜单代码 YD9200）：DDH.Winforms.SYD.Forms.InvStat.FrmYD9200
 *  已接入：frmYd9200Api.queryStoreList（swagger 补整个 Api，/dDH.Service.SYD.Services.InvStat/frmYD9200/queryStoreList）
 *          默认时间 = 6 天前 ~ 次日（原 Load：startDate=Now-6d，endDate=Now.Date+1）
 *  待接入：无二级弹窗
 *  布局：工具栏一行(日期 UCTimeRange + 查询) → 单表(YD9200Dto 25列全可见) */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { frmYd9200Api, type YD9200Dto, type YD9200QueryDto } from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

function defaultRange(): [Date, Date] {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);
  end.setSeconds(end.getSeconds() - 1);
  return [start, end];
}

const q = reactive({ dates: defaultRange() as Date[] | null });

/* 原 gridView1：YD9200Dto 25 列全部可见 */
const colDefs = ref<ColDef[]>([
  { field: "cInboundNo", headerName: "入库标识", width: 130 },
  { field: "cPieceNo", headerName: "件次号", width: 150 },
  { field: "cDestination", headerName: "去向", width: 120 },
  { field: "cSgCode", headerName: "钢种", width: 110 },
  { field: "nThick", headerName: "厚度", width: 90 },
  { field: "nWth", headerName: "宽度", width: 90 },
  { field: "nLen", headerName: "长度", width: 90 },
  { field: "nCalWgt", headerName: "理重", width: 100 },
  { field: "nWgt", headerName: "实重", width: 100 },
  { field: "cCutFlag", headerName: "切边方式", width: 100 },
  { field: "cWgtToler", headerName: "重量偏差等级", width: 130 },
  { field: "cComplexDecideCode", headerName: "综判结果", width: 110 },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 130 },
  { field: "cSurfaceResult", headerName: "表检结果", width: 110 },
  { field: "cStoreCode", headerName: "库区号", width: 120 },
  { field: "cStackNo", headerName: "垛位号", width: 110 },
  { field: "cStackNum", headerName: "层号", width: 80 },
  { field: "cSourceStoreCode", headerName: "原库区号", width: 120 },
  { field: "cSourceStackNo", headerName: "原垛位号", width: 120 },
  { field: "cSourceStackNum", headerName: "原层号", width: 100 },
  { field: "nNum", headerName: "支数", width: 90 },
  { field: "cShiftNo", headerName: "产出班次", width: 110 },
  { field: "cGroupNo", headerName: "产出班组", width: 110 },
  { field: "cInUser", headerName: "入库人", width: 110 },
  { field: "dInTime", headerName: "入库时间", width: 170, flex: 1 },
]);

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const rows = ref<YD9200Dto[]>([]);
const querying = ref(false);
const api = ref<GridApi | null>(null);

function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

/* btnQuery → QueryStoreList({ TimeRange }) */
async function onQuery() {
  querying.value = true;
  try {
    const input: YD9200QueryDto = {
      timeRange: q.dates?.[0] && q.dates?.[1] ? { min: isoLocal(q.dates[0]), max: isoLocal(q.dates[1]) } : undefined,
    };
    const list = ((await frmYd9200Api.queryStoreList(input)) ?? []) as YD9200Dto[];
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
    <!-- 工具栏（原 stackPanel1：日期 UCTimeRange + 查询） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">日期</label>
      <DatePicker
        v-model="q.dates"
        selection-mode="range"
        :manual-input="false"
        date-format="yy-mm-dd"
        show-time
        hour-format="24"
        show-icon
        placeholder="开始 至 结束"
        class="w-80 shrink-0"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">入库统计（{{ rows.length }}）</span>
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
