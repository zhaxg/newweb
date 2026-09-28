<script setup lang="ts">
/** 对应 FrmSS5000（轧辊实绩）：DDH.Winforms.SHR.Forms.StripSteel.FrmSS5000
 *  已接入：e1000Api.queryTiE5000List
 *  待接入：无
 *  偏差：查询条件按 ui-rules §6 与按钮同行、以 placeholder 代替原 LabelControl；
 *        默认时间范围取原 uctimeRange1._Load 的「本月1日 ~ 次日」；A0000:SHIFT/A0000:DG_GROUP 走 KV 字典翻译，种子缺组时回退原值 */

import { onMounted, ref } from "vue";
import { systemKeyValueApi } from "@/api/admin/request";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { e1000Api, type TiE5000, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const rows = ref<TiE5000[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

const dates = ref<Date[] | null>(defaultRange());

/* 时间范围默认值（原 uctimeRange1._Load：本月1日 ~ 次日） */
function defaultRange(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ];
}
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    p(d.getMonth() + 1) +
    "-" +
    p(d.getDate()) +
    "T" +
    p(d.getHours()) +
    ":" +
    p(d.getMinutes()) +
    ":" +
    p(d.getSeconds())
  );
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}

/* 班次/班组 字典翻译（原 colShiftNo/colGroupNo SetCodeFormatterEdit<SHIFT/DG_GROUP>） */
const kvShift = new Map<string, string>();
const kvGroup = new Map<string, string>();
const kvFmt = (m: Map<string, string>) => (p: ValueFormatterParams) => m.get(String(p.value)) ?? String(p.value ?? "");
onMounted(async () => {
  try {
    for (const x of (await systemKeyValueApi.getSysKvListByGroup("A0000:SHIFT")) ?? [])
      kvShift.set(x.cCode ?? "", x.cName ?? "");
  } catch {
    /* 拦截层已 toast */
  }
  try {
    for (const x of (await systemKeyValueApi.getSysKvListByGroup("A0000:DG_GROUP")) ?? [])
      kvGroup.set(x.cCode ?? "", x.cName ?? "");
  } catch {
    /* 拦截层已 toast；A0000:DG_GROUP mock 种子缺失时回退原值 */
  }
  gridApi.value?.refreshCells({ force: true });
});

const colDefs: ColDef[] = [
  { field: "shiftNo", headerName: "班次", width: 112, valueFormatter: kvFmt(kvShift) },
  { field: "groupNo", headerName: "班组", width: 112, valueFormatter: kvFmt(kvGroup) },
  { field: "plantCode", headerName: "机组代码", width: 112 },
  { field: "standNo", headerName: "机架号", width: 112 },
  { field: "rollType", headerName: "轧辊类型er", width: 112 },
  { field: "rollOperateFlag", headerName: "换上换下辊", width: 125 },
  { field: "rollChangeReason", headerName: "卸辊原因", width: 112 },
  { field: "rollChangeTime", headerName: "卸辊时刻", width: 112 },
  { field: "upRollId", headerName: "上辊号", width: 112 },
  { field: "upRolledLength", headerName: "上辊轧制公里数", width: 151 },
  { field: "upRolledWeight", headerName: "上辊轧制吨数", width: 138 },
  { field: "upTime", headerName: "上辊生产时间", width: 138 },
  { field: "upRolledNum", headerName: "上辊轧制块数", width: 138 },
  { field: "lowRollId", headerName: "下辊号", width: 112 },
  { field: "lowRolledLength", headerName: "下辊轧制公里数", width: 151 },
  { field: "lowRolledWeight", headerName: "下辊轧制吨数", width: 138 },
  { field: "lowTime", headerName: "下辊生产时间", width: 138 },
  { field: "lowRolledNum", headerName: "下辊轧制块数", width: 138 },
  { field: "id", headerName: "主键", width: 112, hide: true },
  { field: "creator", headerName: "创建人", width: 112, hide: true },
  { field: "createTime", headerName: "创建时间", width: 112, hide: true },
  { field: "lastModifier", headerName: "最后修改人", width: 125, hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138, hide: true },
  { field: "readTime", headerName: "读取时间", width: 112, hide: true },
  { field: "readStatus", headerName: "读取状态", width: 112, hide: true },
  { field: "selected", headerName: "选择", width: 112, hide: true },
];

async function onQuery() {
  querying.value = true;
  try {
    rows.value =
      (await e1000Api.queryTiE5000List({
        timeRange: toTimeRange(dates.value),
      })) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 stackPanel1：label + textEdit1 + uctimeRange1 + btnQuery）；ui-rules §6 条件与按钮同行、用 placeholder -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <DatePicker
        v-model="dates"
        selection-mode="range"
        :manual-input="false"
        date-format="yy-mm-dd"
        show-time
        hour-format="24"
        show-icon
        placeholder="日期"
        class="w-80"
      />
      <Button variant="outlined" :loading="querying" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
