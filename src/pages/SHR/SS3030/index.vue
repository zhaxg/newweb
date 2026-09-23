<script setup lang="ts">
/** 对应 FrmSS3030（剔料实绩）：DDH.Winforms.SHR.Forms.StripSteel.FrmSS3030
 *  已接入：e1000Api.queryTiE3030List
 *  待接入：无
 *  偏差：查询条件按 ui-rules §6 与按钮同行、以 placeholder 代替原 LabelControl；
 *        默认时间范围取原 uctimeRange1._Load 的「本月1日 ~ 次日」 */

import { ref } from "vue";

import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { e1000Api, type TiE3030, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const rows = ref<TiE3030[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

const keyword = ref("");
const dates = ref<Date[] | null>(defaultRange());

/* 时间范围默认值（原 uctimeRange1._Load：本月1日 ~ 次日） */
function defaultRange(): Date[] {
  const now = new Date();
  return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)];
}
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}

const colDefs: ColDef[] = [
  { field: "nOrder", headerName: "消息排序号", width: 125 },
  { field: "planId", headerName: "计划提料号", width: 125 },
  { field: "slabNo", headerName: "板坯号", width: 112 },
  { field: "plantCode", headerName: "机组代码", width: 112 },
  { field: "deleteFlag", headerName: "剔料标志", width: 112 },
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
      (await e1000Api.queryTiE3030List({
        planKeyword: keyword.value,
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
            <InputText v-model="keyword" placeholder="板坯号" class="w-40" @keydown.enter="onQuery" />
      <DatePicker v-model="dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd" show-time
        hour-format="24" show-icon placeholder="日期" class="w-80" />
      <Button variant="outlined" :loading="querying" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows" :pagination="false"
        @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
