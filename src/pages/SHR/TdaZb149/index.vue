<script setup lang="ts">
/** 对应 FrmTdaZb149（10KV电力数据）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTdaZb149
 *  已接入：tdaZb149Api.getTdaZb149s
 *  待接入：无
 *  偏差：默认时间范围照原 Load 为 [今天-7天, 今天+1天]；原窗体无查询前校验、无行双击事件，故未设；
 *        原 119 个电度列 Designer 宽度 30 不抄（ui-rules §3.5），以 minWidth 60 + autoSize 呈现 */

import { ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { tdaZb149Api, type TdaZb149Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const rows = ref<TdaZb149Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

/* ---------- 时间范围（原 ucTimeRange1_Load：[今天-7天, 今天+1天]） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ];
}
const dates = ref<Date[] | null>(defaultRange());
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}

/* ---------- 表格（原 gridView1 / TdaZb149Dto：date + TimeRange + N10Ec001–N10Ec119 共 121 列，列头逐列内联照抄） ---------- */
const ecCols: [field: string, headerName: string][] = [
  ["n10Ec001", "轧机10kV电气室Ⅰ段电源进线"],
  ["n10Ec002", "轧机10kV电气室水系统、冷床、矫直1#馈线"],
  ["n10Ec003", "轧机10kV电气室2#双边剪辊道变压器"],
  ["n10Ec004", "轧机10kV电气室1#双边剪辊道变压器"],
  ["n10Ec005", "轧机10kV电气室精轧后辊道变压器"],
  ["n10Ec006", "轧机10kV电气室粗轧压下变压器"],
  ["n10Ec007", "轧机10kV电气室RM励磁变压器"],
  ["n10Ec008", "轧机10kV电气室预矫直变压器"],
  ["n10Ec009", "轧机10kV电气室FM励磁变压器"],
  ["n10Ec010", "轧机10kV电气室精轧运输辊道变压器"],
  ["n10Ec011", "轧机10kV电气室2#煤烟引风机"],
  ["n10Ec012", "轧机10kV电气室2#鼓风机"],
  ["n10Ec013", "轧机10kV电气室3#鼓风机"],
  ["n10Ec014", "轧机10kV电气室2#空烟引风机"],
  ["n10Ec015", "轧机10kV电气室2#提升自吸泵"],
  ["n10Ec016", "轧机10kV电气室2#冲渣自吸泵"],
  ["n10Ec017", "轧机10kV电气室粗精轧除尘风机"],
  ["n10Ec018", "轧机10kV电气室脱硫风机系统"],
  ["n10Ec019", "轧机10kV电气室炉区2#馈线"],
  ["n10Ec020", "轧机10kV电气室2#SVG"],
  ["n10Ec021", "轧机10kV电气室2#5次滤波通道"],
  ["n10Ec022", "轧机10kV电气室2#7次滤波通道"],
  ["n10Ec023", "轧机10kV电气室2#11次滤波通道"],
  ["n10Ec024", "轧机10kV电气室Ⅱ段备用1"],
  ["n10Ec025", "轧机10kV电气室Ⅱ段备用2"],
  ["n10Ec026", "轧机10kV电气室#2接地变压器"],
  ["n10Ec027", "轧机10kV电气室粗精轧1#干式动力变压器"],
  ["n10Ec028", "轧机10kV电气室粗精轧3#干式动力变压器"],
  ["n10Ec029", "轧机10kV电气室精轧前辊道变压器"],
  ["n10Ec030", "轧机10kV电气室粗轧前辊道变压器"],
  ["n10Ec031", "轧机10kV电气室粗轧后辊道变压器"],
  ["n10Ec032", "轧机10kV电气室1#煤烟引风机"],
  ["n10Ec033", "轧机10kV电气室1#鼓风机"],
  ["n10Ec034", "轧机10kV电气室1#空烟引风机"],
  ["n10Ec035", "轧机10kV电气室1#提升自吸泵"],
  ["n10Ec036", "轧机10kV电气室3#提升自吸泵"],
  ["n10Ec037", "轧机10kV电气室1#冲渣自吸泵"],
  ["n10Ec038", "轧机10kV电气室高压水除磷泵系统"],
  ["n10Ec039", "轧机10kV电气室炉区1#馈线"],
  ["n10Ec040", "轧机10kV电气室1#SVG"],
  ["n10Ec041", "轧机10kV电气室1#5次滤波通道"],
  ["n10Ec042", "轧机10kV电气室1#7次滤波通道"],
  ["n10Ec043", "轧机10kV电气室1#11次滤波通道"],
  ["n10Ec044", "轧机10kV电气室Ⅰ段备用1"],
  ["n10Ec045", "轧机10kV电气室Ⅰ段备用2"],
  ["n10Ec046", "轧机10kV电气室#1接地变压器"],
  ["n10Ec047", "轧机10kV电气室分段"],
  ["n10Ec048", "轧机10kV电气室Ⅱ段电源进线"],
  ["n10Ec049", "轧机10kV电气室水系统、冷床、矫直2#馈线"],
  ["n10Ec050", "轧机10kV电气室1#双边剪变压器"],
  ["n10Ec051", "轧机10kV电气室2#双边剪变压器"],
  ["n10Ec052", "轧机10kV电气室双边剪干式动力变压器"],
  ["n10Ec053", "轧机10kV电气室切头剪变压器"],
  ["n10Ec054", "轧机10kV电气室粗精轧2#干式动力变压器"],
  ["n10Ec055", "轧机10kV电气室粗精轧4#干式动力变压器"],
  ["n10Ec056", "轧机10kV电气室精轧压下变压器"],
  ["n10Ec057", "一段电度表"],
  ["n10Ec058", "二段电度表"],
  ["n10Ec059", "水系统10kV电气室Ⅰ段电源进线"],
  ["n10Ec060", "水系统10kV电气室1#"],
  ["n10Ec061", "水系统10kV电气室2#"],
  ["n10Ec062", "水系统10kV电气室热矫辊道变压器"],
  ["n10Ec063", "水系统10kV电气室热矫直整流变压器"],
  ["n10Ec064", "水系统10kV电气室冷床1#干式动力变压器"],
  ["n10Ec065", "水系统10kV电气室冷床3#干式动力变压器"],
  ["n10Ec066", "水系统10kV电气室水系统1#动力变压器"],
  ["n10Ec067", "水系统10kV电气室1#超快冷低压供水自吸泵"],
  ["n10Ec068", "水系统10kV电气室1#超快冷侧喷供水自吸泵"],
  ["n10Ec069", "水系统10kV电气室1#超快冷中压供水自吸泵"],
  ["n10Ec070", "水系统10kV电气室3#超快冷中压供水自吸泵"],
  ["n10Ec071", "水系统10kV电气室1#超快冷过滤供水自吸泵"],
  ["n10Ec072", "水系统10kV电气室1#超快冷冷却塔供水自吸泵"],
  ["n10Ec073", "水系统10kV电气室1#轧机净环离心泵"],
  ["n10Ec074", "水系统10kV电气室1#高压浊环离心泵"],
  ["n10Ec075", "水系统10kV电气室1#低压浊环离心泵"],
  ["n10Ec076", "水系统10kV电气室1#浊环上塔供水泵"],
  ["n10Ec077", "水系统10kV电气室Ⅰ段备用1"],
  ["n10Ec078", "水系统10kV电气室Ⅰ段备用2"],
  ["n10Ec079", "水系统10kV电气室分段"],
  ["n10Ec080", "水系统10kV电气室Ⅱ段电源进线"],
  ["n10Ec081", "水系统10kV电气室3#"],
  ["n10Ec082", "水系统10kV电气室冷床2#干式动力变压器"],
  ["n10Ec083", "水系统10kV电气室水系统2#动力变压器"],
  ["n10Ec084", "水系统10kV电气室2#超快冷低压供水自吸泵"],
  ["n10Ec085", "水系统10kV电气室2#超快冷侧喷供水自吸泵"],
  ["n10Ec086", "水系统10kV电气室2#超快冷中压供水自吸泵"],
  ["n10Ec087", "水系统10kV电气室2#超快冷过滤供水自吸泵"],
  ["n10Ec088", "水系统10kV电气室3#超快冷过滤供水自吸泵"],
  ["n10Ec089", "水系统10kV电气室2#超快冷冷却塔供水自吸泵"],
  ["n10Ec090", "水系统10kV电气室3#超快冷冷却塔供水自吸泵"],
  ["n10Ec091", "水系统10kV电气室2#轧机净环离心泵"],
  ["n10Ec092", "水系统10kV电气室2#高压浊环离心泵"],
  ["n10Ec093", "水系统10kV电气室2#低压浊环离心泵"],
  ["n10Ec094", "水系统10kV电气室3#低压浊环离心泵"],
  ["n10Ec095", "水系统10kV电气室2#浊环上塔供水泵"],
  ["n10Ec096", "水系统10kV电气室3#浊环上塔供水泵"],
  ["n10Ec097", "水系统10kV电气室预留变压器"],
  ["n10Ec098", "水系统10kV电气室Ⅱ段备用1"],
  ["n10Ec099", "水系统10kV电气室Ⅱ段备用2"],
  ["n10Ec100", "电度表一段"],
  ["n10Ec101", "电度表二段"],
  ["n10Ec102", "炉区10kV电气室Ⅰ段备用"],
  ["n10Ec103", "炉区10kV电气室分段"],
  ["n10Ec104", "炉区10kV电气室Ⅱ段电源进线"],
  ["n10Ec105", "炉区10kV电气室1#定尺剪辊道变压器"],
  ["n10Ec106", "炉区10kV电气室2#定尺剪辊道变压器"],
  ["n10Ec107", "炉区10kV电气室检查台辊道变压器"],
  ["n10Ec108", "炉区10kV电气室加热炉2#干式动力变压器"],
  ["n10Ec109", "炉区10kV电气室加热炉4#干式动力变压器"],
  ["n10Ec110", "炉区10kV电气室Ⅱ段备用"],
  ["n10Ec111", "炉区10kV电气室Ⅰ段电源进线"],
  ["n10Ec112", "炉区10kV电气室入炉辊道变压器"],
  ["n10Ec113", "炉区10kV电气室出炉辊道变压器"],
  ["n10Ec114", "炉区10kV电气室1#定尺剪变压器"],
  ["n10Ec115", "炉区10kV电气室2#定尺剪变压器"],
  ["n10Ec116", "炉区10kV电气室加热炉1#干式动力变压器"],
  ["n10Ec117", "炉区10kV电气室加热炉3#干式动力变压器"],
  ["n10Ec118", "一段电度表"],
  ["n10Ec119", "二段电度表"],
];
const colDefs: ColDef[] = [
  { colId: "date", field: "date", headerName: "日期", minWidth: 100 },
  { colId: "timeRange", field: "timeRange", headerName: "时间段", minWidth: 100 },
  ...ecCols.map(([field, headerName]) => ({ colId: field, field, headerName, minWidth: 60, type: "numericColumn" })),
];

async function query() {
  loading.value = true;
  try {
    rows.value = (await tdaZb149Api.getTdaZb149s({ timeRange: toTimeRange(dates.value) })) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 stackPanel1：label「发送时间范围」+ ucTimeRange + 查询）；单条件与按钮同行，ui-rules §6 以 placeholder 提示 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <DatePicker
        v-model="dates"
        selection-mode="range"
        :manual-input="false"
        date-format="yy-mm-dd"
        show-time
        hour-format="24"
        show-icon
        placeholder="发送时间范围"
        class="w-80 shrink-0"
        @keydown.enter="query"
      />
      <Button variant="outlined" :loading="loading" class="shrink-0 whitespace-nowrap" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
        :loading="loading"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
