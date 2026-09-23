<script setup lang="ts">
/** 对应 FrmSS3010（装炉实绩）：DDH.Winforms.SHR.Forms.StripSteel.FrmSS3010
 *  已接入：e1000Api.queryTiE3010List
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
import { e1000Api, type Tie3010Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const rows = ref<Tie3010Dto[]>([]);
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
  { field: "c_LINE_CODE", headerName: "产线", width: 112 },
  { field: "c_MACHINE", headerName: "机台号", width: 112 },
  { field: "c_STOVE", headerName: "炉号", width: 112 },
  { field: "c_PIECE_NO", headerName: "件次号", width: 112 },
  { field: "slabNo", headerName: "板坯号", width: 112 },
  { field: "c_PRINT_CODE", headerName: "喷印号", width: 112 },
  { field: "c_SG_CODE", headerName: "钢种", width: 112 },
  { field: "n_THICK", headerName: "厚度", width: 112 },
  { field: "n_WTH", headerName: "宽度", width: 112 },
  { field: "n_LEN", headerName: "长度", width: 112 },
  { field: "n_CAL_WGT", headerName: "理重", width: 112 },
  { field: "n_WGT", headerName: "实重", width: 112 },
  { field: "c_SPEC", headerName: "规格", width: 112 },
  { field: "c_SG_STD", headerName: "执行标准", width: 112 },
  { field: "furNo", headerName: "炉号", width: 112 },
  { field: "furRow", headerName: "炉列", width: 112 },
  { field: "chargeTime", headerName: "装炉时刻", width: 112 },
  { field: "plantCode", headerName: "机组代码", width: 112 },
  { field: "c_PROC", headerName: "工序代码", width: 112 },
  { field: "creator", headerName: "创建人", width: 112, hide: true },
  { field: "createTime", headerName: "创建时间", width: 112, hide: true },
  { field: "lastModifier", headerName: "最后修改人", width: 125, hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138, hide: true },
  { field: "readTime", headerName: "读取时间", width: 112, hide: true },
  { field: "readStatus", headerName: "读取状态", width: 112, hide: true },
  { field: "n_NUM", headerName: "支数", width: 112, hide: true },
  { field: "c_PIECE_NO_SLAB", headerName: "板坯号", width: 112, hide: true },
];

async function onQuery() {
  querying.value = true;
  try {
    rows.value =
      (await e1000Api.queryTiE3010List({
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
