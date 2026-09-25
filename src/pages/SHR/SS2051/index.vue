<script setup lang="ts">
/** 对应 FrmSS2051（板坯数据）：DDH.Winforms.SHR.Forms.StripSteel.FrmSS2051
 *  已接入：e1000Api.queryTiE2051List
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
import { e1000Api, type TiE2051, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const rows = ref<TiE2051[]>([]);
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

const colDefs: ColDef[] = [
  { field: "nOrder", headerName: "消息排序号", width: 125 },
  { field: "slabNo", headerName: "板坯号", width: 112 },
  { field: "heatNo", headerName: "炼钢炉号", width: 112 },
  { field: "castNo", headerName: "铸机号", width: 112 },
  { field: "sthk", headerName: "板坯厚度", width: 112 },
  { field: "swid", headerName: "板坯宽度", width: 112 },
  { field: "slng", headerName: "板坯长度", width: 112 },
  { field: "swet", headerName: "板坯重量", width: 112 },
  { field: "readStatus", headerName: "读取状态", width: 112 },
  { field: "readTime", headerName: "读取时间", width: 112 },
  { field: "steelGrade", headerName: "材质代码", width: 112 },
  { field: "hotFlag", headerName: "热坯标记", width: 112 },
  { field: "shortFlag", headerName: "短坯标记", width: 112 },
  { field: "calcSwet", headerName: "板坯理论重量", width: 138 },
  { field: "slabTapFlag", headerName: "锥形坯标记", width: 125 },
  { field: "slabTapVal", headerName: "锥形坯头尾宽度差", width: 164 },
  { field: "slabTapHeadthk", headerName: "锥形坯头部厚度", width: 151 },
  { field: "slabTapTailthk", headerName: "锥形坯尾部厚度", width: 151 },
  { field: "slabTapThkstartpos", headerName: "锥形坯头部厚度开始距离", width: 203 },
  { field: "slabTapThkendpos", headerName: "锥形坯头部厚度结束距离", width: 203 },
  { field: "slabTapHeadwid", headerName: "锥形坯头部宽度", width: 151 },
  { field: "slabTapTailwid", headerName: "锥形坯尾部宽度", width: 151 },
  { field: "slabTapWidstartpos", headerName: "锥形坯头部宽度开始距离", width: 203 },
  { field: "slabTapWidendpos", headerName: "锥形坯尾部宽度开始距离", width: 203 },
  { field: "chemValidFlag", headerName: "化学成分有效标记", width: 164 },
  { field: "fPcntal", headerName: "铝百分比", width: 112 },
  { field: "fPcntas", headerName: "砷百分比", width: 112 },
  { field: "fPcntb", headerName: "硼百分比", width: 112 },
  { field: "fPcntbe", headerName: "铍百分比", width: 112 },
  { field: "fPcntbi", headerName: "铋百分比", width: 112 },
  { field: "fPcntc", headerName: "碳百分比", width: 112 },
  { field: "fPcntca", headerName: "钙百分比", width: 112 },
  { field: "fPcntnb", headerName: "铌(Nb)百分比", width: 112 },
  { field: "fPcntcd", headerName: "镉百分比", width: 112 },
  { field: "fPcntce", headerName: "铈百分比", width: 112 },
  { field: "fPcntco", headerName: "钴百分比", width: 112 },
  { field: "fPcntcr", headerName: "铬百分比", width: 112 },
  { field: "fPcntcu", headerName: "铜百分比", width: 112 },
  { field: "fPcntfe", headerName: "铁百分比", width: 112 },
  { field: "fPcntga", headerName: "镓百分比", width: 112 },
  { field: "fPcntge", headerName: "锗百分比", width: 112 },
  { field: "fPcnth", headerName: "氢百分比", width: 112 },
  { field: "fPcntli", headerName: "锂百分比", width: 112 },
  { field: "fPcntmg", headerName: "镁百分比", width: 112 },
  { field: "fPcntmn", headerName: "锰百分比", width: 112 },
  { field: "fPcntmo", headerName: "钼百分比", width: 112 },
  { field: "fPcntn", headerName: "氮百分比", width: 112 },
  { field: "fPcntna", headerName: "钠百分比", width: 112 },
  { field: "fPcntni", headerName: "镍百分比", width: 112 },
  { field: "fPcnto", headerName: "氧百分比", width: 112 },
  { field: "fPcntp", headerName: "磷百分比", width: 112 },
  { field: "fPcntpb", headerName: "铅百分比", width: 112 },
  { field: "fPcntr", headerName: "稀土百分比", width: 125 },
  { field: "fPcnts", headerName: "硫百分比", width: 112 },
  { field: "fPcntsb", headerName: "锑百分比", width: 112 },
  { field: "fPcntse", headerName: "硒百分比", width: 112 },
  { field: "fPcntsi", headerName: "硅百分比", width: 112 },
  { field: "fPcntsn", headerName: "锡百分比", width: 112 },
  { field: "fPcntta", headerName: "钽百分比", width: 112 },
  { field: "fPcntte", headerName: "碲百分比", width: 112 },
  { field: "fPcntti", headerName: "钛百分比", width: 112 },
  { field: "fPcntv", headerName: "钒百分比", width: 112 },
  { field: "fPcntw", headerName: "钨百分比", width: 112 },
  { field: "fPcntzn", headerName: "锌百分比", width: 112 },
  { field: "fPcntzr", headerName: "锆百分比", width: 112 },
  { field: "fPcntsolal", headerName: "酸溶铝百分比", width: 138 },
  { field: "fPcntsolb", headerName: "酸溶硼百分比", width: 138 },
  { field: "fPcntceq", headerName: "碳当量百分比", width: 138 },
  { field: "fPcntre", headerName: "稀土百分比", width: 125 },
  { field: "id", headerName: "主键", width: 112, hide: true },
  { field: "creator", headerName: "创建人", width: 112, hide: true },
  { field: "createTime", headerName: "创建时间", width: 112, hide: true },
  { field: "lastModifier", headerName: "最后修改人", width: 125, hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138, hide: true },
  { field: "plantCode", headerName: "机组代码", width: 112, hide: true },
  { field: "castExt", headerName: "铸机流号", width: 112, hide: true },
  { field: "selected", headerName: "选择", width: 112, hide: true },
];

async function onQuery() {
  querying.value = true;
  try {
    rows.value =
      (await e1000Api.queryTiE2051List({
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
