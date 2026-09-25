<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTdaZb149（10KV电力数据）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTdaZb149
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>([
  { field: "date", headerName: "计划月份", width: 112 },
  { field: "TimeRange", headerName: "检验时间", width: 112 },
  { field: "N10Ec001", headerName: "轧机10kV电气室Ⅰ段电源进线", width: 60 },
  { field: "N10Ec002", headerName: "轧机10kV电气室水系统、冷床、矫直1#馈线", width: 60 },
  { field: "N10Ec003", headerName: "轧机10kV电气室2#双边剪辊道变压器", width: 60 },
  { field: "N10Ec004", headerName: "轧机10kV电气室1#双边剪辊道变压器", width: 60 },
  { field: "N10Ec005", headerName: "轧机10kV电气室精轧后辊道变压器", width: 60 },
  { field: "N10Ec006", headerName: "轧机10kV电气室粗轧压下变压器", width: 60 },
  { field: "N10Ec007", headerName: "轧机10kV电气室RM励磁变压器", width: 60 },
  { field: "N10Ec008", headerName: "轧机10kV电气室预矫直变压器", width: 60 },
  { field: "N10Ec009", headerName: "轧机10kV电气室FM励磁变压器", width: 60 },
  { field: "N10Ec010", headerName: "轧机10kV电气室精轧运输辊道变压器", width: 60 },
  { field: "N10Ec011", headerName: "轧机10kV电气室2#煤烟引风机", width: 60 },
  { field: "N10Ec012", headerName: "轧机10kV电气室2#鼓风机", width: 60 },
  { field: "N10Ec013", headerName: "轧机10kV电气室3#鼓风机", width: 60 },
  { field: "N10Ec014", headerName: "轧机10kV电气室2#空烟引风机", width: 60 },
  { field: "N10Ec015", headerName: "轧机10kV电气室2#提升自吸泵", width: 60 },
  { field: "N10Ec016", headerName: "轧机10kV电气室2#冲渣自吸泵", width: 60 },
  { field: "N10Ec017", headerName: "轧机10kV电气室粗精轧除尘风机", width: 60 },
  { field: "N10Ec018", headerName: "轧机10kV电气室脱硫风机系统", width: 60 },
  { field: "N10Ec019", headerName: "轧机10kV电气室炉区2#馈线", width: 60 },
  { field: "N10Ec020", headerName: "轧机10kV电气室2#SVG", width: 60 },
  { field: "N10Ec021", headerName: "轧机10kV电气室2#5次滤波通道", width: 60 },
  { field: "N10Ec022", headerName: "轧机10kV电气室2#7次滤波通道", width: 60 },
  { field: "N10Ec023", headerName: "轧机10kV电气室2#11次滤波通道", width: 60 },
  { field: "N10Ec024", headerName: "轧机10kV电气室Ⅱ段备用1", width: 60 },
  { field: "N10Ec025", headerName: "轧机10kV电气室Ⅱ段备用2", width: 60 },
  { field: "N10Ec026", headerName: "轧机10kV电气室#2接地变压器", width: 60 },
  { field: "N10Ec027", headerName: "轧机10kV电气室粗精轧1#干式动力变压器", width: 60 },
  { field: "N10Ec028", headerName: "轧机10kV电气室粗精轧3#干式动力变压器", width: 60 },
  { field: "N10Ec029", headerName: "轧机10kV电气室精轧前辊道变压器", width: 60 },
  { field: "N10Ec030", headerName: "轧机10kV电气室粗轧前辊道变压器", width: 60 },
  { field: "N10Ec031", headerName: "轧机10kV电气室粗轧后辊道变压器", width: 60 },
  { field: "N10Ec032", headerName: "轧机10kV电气室1#煤烟引风机", width: 60 },
  { field: "N10Ec033", headerName: "轧机10kV电气室1#鼓风机", width: 60 },
  { field: "N10Ec034", headerName: "轧机10kV电气室1#空烟引风机", width: 60 },
  { field: "N10Ec035", headerName: "轧机10kV电气室1#提升自吸泵", width: 60 },
  { field: "N10Ec036", headerName: "轧机10kV电气室3#提升自吸泵", width: 60 },
  { field: "N10Ec037", headerName: "轧机10kV电气室1#冲渣自吸泵", width: 60 },
  { field: "N10Ec038", headerName: "轧机10kV电气室高压水除磷泵系统", width: 60 },
  { field: "N10Ec039", headerName: "轧机10kV电气室炉区1#馈线", width: 60 },
  { field: "N10Ec040", headerName: "轧机10kV电气室1#SVG", width: 60 },
  { field: "N10Ec041", headerName: "轧机10kV电气室1#5次滤波通道", width: 60 },
  { field: "N10Ec042", headerName: "轧机10kV电气室1#7次滤波通道", width: 60 },
  { field: "N10Ec043", headerName: "轧机10kV电气室1#11次滤波通道", width: 60 },
  { field: "N10Ec044", headerName: "轧机10kV电气室Ⅰ段备用1", width: 60 },
  { field: "N10Ec045", headerName: "轧机10kV电气室Ⅰ段备用2", width: 60 },
  { field: "N10Ec046", headerName: "轧机10kV电气室#1接地变压器", width: 60 },
  { field: "N10Ec047", headerName: "轧机10kV电气室分段", width: 60 },
  { field: "N10Ec048", headerName: "轧机10kV电气室Ⅱ段电源进线", width: 60 },
  { field: "N10Ec049", headerName: "轧机10kV电气室水系统、冷床、矫直2#馈线", width: 60 },
  { field: "N10Ec050", headerName: "轧机10kV电气室1#双边剪变压器", width: 60 },
  { field: "N10Ec051", headerName: "轧机10kV电气室2#双边剪变压器", width: 60 },
  { field: "N10Ec052", headerName: "轧机10kV电气室双边剪干式动力变压器", width: 60 },
  { field: "N10Ec053", headerName: "轧机10kV电气室切头剪变压器", width: 60 },
  { field: "N10Ec054", headerName: "轧机10kV电气室粗精轧2#干式动力变压器", width: 60 },
  { field: "N10Ec055", headerName: "轧机10kV电气室粗精轧4#干式动力变压器", width: 60 },
  { field: "N10Ec056", headerName: "轧机10kV电气室精轧压下变压器", width: 60 },
  { field: "N10Ec057", headerName: "一段电度表", width: 60 },
  { field: "N10Ec058", headerName: "二段电度表", width: 60 },
  { field: "N10Ec059", headerName: "水系统10kV电气室Ⅰ段电源进线", width: 60 },
  { field: "N10Ec060", headerName: "水系统10kV电气室1#", width: 60 },
  { field: "N10Ec061", headerName: "水系统10kV电气室2#", width: 60 },
  { field: "N10Ec062", headerName: "水系统10kV电气室热矫辊道变压器", width: 60 },
  { field: "N10Ec063", headerName: "水系统10kV电气室热矫直整流变压器", width: 60 },
  { field: "N10Ec064", headerName: "水系统10kV电气室冷床1#干式动力变压器", width: 60 },
  { field: "N10Ec065", headerName: "水系统10kV电气室冷床3#干式动力变压器", width: 60 },
  { field: "N10Ec066", headerName: "水系统10kV电气室水系统1#动力变压器", width: 60 },
  { field: "N10Ec067", headerName: "水系统10kV电气室1#超快冷低压供水自吸泵", width: 60 },
  { field: "N10Ec068", headerName: "水系统10kV电气室1#超快冷侧喷供水自吸泵", width: 60 },
  { field: "N10Ec069", headerName: "水系统10kV电气室1#超快冷中压供水自吸泵", width: 60 },
  { field: "N10Ec070", headerName: "水系统10kV电气室3#超快冷中压供水自吸泵", width: 60 },
  { field: "N10Ec071", headerName: "水系统10kV电气室1#超快冷过滤供水自吸泵", width: 60 },
  { field: "N10Ec072", headerName: "水系统10kV电气室1#超快冷冷却塔供水自吸泵", width: 60 },
  { field: "N10Ec073", headerName: "水系统10kV电气室1#轧机净环离心泵", width: 60 },
  { field: "N10Ec074", headerName: "水系统10kV电气室1#高压浊环离心泵", width: 60 },
  { field: "N10Ec075", headerName: "水系统10kV电气室1#低压浊环离心泵", width: 60 },
  { field: "N10Ec076", headerName: "水系统10kV电气室1#浊环上塔供水泵", width: 60 },
  { field: "N10Ec077", headerName: "水系统10kV电气室Ⅰ段备用1", width: 60 },
  { field: "N10Ec078", headerName: "水系统10kV电气室Ⅰ段备用2", width: 60 },
  { field: "N10Ec079", headerName: "水系统10kV电气室分段", width: 60 },
  { field: "N10Ec080", headerName: "水系统10kV电气室Ⅱ段电源进线", width: 60 },
  { field: "N10Ec081", headerName: "水系统10kV电气室3#", width: 60 },
  { field: "N10Ec082", headerName: "水系统10kV电气室冷床2#干式动力变压器", width: 60 },
  { field: "N10Ec083", headerName: "水系统10kV电气室水系统2#动力变压器", width: 60 },
  { field: "N10Ec084", headerName: "水系统10kV电气室2#超快冷低压供水自吸泵", width: 60 },
  { field: "N10Ec085", headerName: "水系统10kV电气室2#超快冷侧喷供水自吸泵", width: 60 },
  { field: "N10Ec086", headerName: "水系统10kV电气室2#超快冷中压供水自吸泵", width: 60 },
  { field: "N10Ec087", headerName: "水系统10kV电气室2#超快冷过滤供水自吸泵", width: 60 },
  { field: "N10Ec088", headerName: "水系统10kV电气室3#超快冷过滤供水自吸泵", width: 60 },
  { field: "N10Ec089", headerName: "水系统10kV电气室2#超快冷冷却塔供水自吸泵", width: 60 },
  { field: "N10Ec090", headerName: "水系统10kV电气室3#超快冷冷却塔供水自吸泵", width: 60 },
  { field: "N10Ec091", headerName: "水系统10kV电气室2#轧机净环离心泵", width: 60 },
  { field: "N10Ec092", headerName: "水系统10kV电气室2#高压浊环离心泵", width: 60 },
  { field: "N10Ec093", headerName: "水系统10kV电气室2#低压浊环离心泵", width: 60 },
  { field: "N10Ec094", headerName: "水系统10kV电气室3#低压浊环离心泵", width: 60 },
  { field: "N10Ec095", headerName: "水系统10kV电气室2#浊环上塔供水泵", width: 60 },
  { field: "N10Ec096", headerName: "水系统10kV电气室3#浊环上塔供水泵", width: 60 },
  { field: "N10Ec097", headerName: "水系统10kV电气室预留变压器", width: 60 },
  { field: "N10Ec098", headerName: "水系统10kV电气室Ⅱ段备用1", width: 60 },
  { field: "N10Ec099", headerName: "水系统10kV电气室Ⅱ段备用2", width: 60 },
  { field: "N10Ec100", headerName: "电度表一段", width: 60 },
  { field: "N10Ec101", headerName: "电度表二段", width: 60 },
  { field: "N10Ec102", headerName: "炉区10kV电气室Ⅰ段备用", width: 60 },
  { field: "N10Ec103", headerName: "炉区10kV电气室分段", width: 60 },
  { field: "N10Ec104", headerName: "炉区10kV电气室Ⅱ段电源进线", width: 60 },
  { field: "N10Ec105", headerName: "炉区10kV电气室1#定尺剪辊道变压器", width: 60 },
  { field: "N10Ec106", headerName: "炉区10kV电气室2#定尺剪辊道变压器", width: 60 },
  { field: "N10Ec107", headerName: "炉区10kV电气室检查台辊道变压器", width: 60 },
  { field: "N10Ec108", headerName: "炉区10kV电气室加热炉2#干式动力变压器", width: 60 },
  { field: "N10Ec109", headerName: "炉区10kV电气室加热炉4#干式动力变压器", width: 60 },
  { field: "N10Ec110", headerName: "炉区10kV电气室Ⅱ段备用", width: 60 },
  { field: "N10Ec111", headerName: "炉区10kV电气室Ⅰ段电源进线", width: 60 },
  { field: "N10Ec112", headerName: "炉区10kV电气室入炉辊道变压器", width: 60 },
  { field: "N10Ec113", headerName: "炉区10kV电气室出炉辊道变压器", width: 60 },
  { field: "N10Ec114", headerName: "炉区10kV电气室1#定尺剪变压器", width: 60 },
  { field: "N10Ec115", headerName: "炉区10kV电气室2#定尺剪变压器", width: 60 },
  { field: "N10Ec116", headerName: "炉区10kV电气室加热炉1#干式动力变压器", width: 60 },
  { field: "N10Ec117", headerName: "炉区10kV电气室加热炉3#干式动力变压器", width: 60 },
  { field: "N10Ec118", headerName: "一段电度表", width: 60 },
  { field: "N10Ec119", headerName: "二段电度表", width: 60 },
  { field: "Creator", headerName: "创建人", width: 112 },
  { field: "CreateTime", headerName: "创建时间", width: 112 },
  { field: "LastModifier", headerName: "最后修改人", width: 112 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery"
        ><IconSearch class="h-3.5 w-3.5" />查询</Button
      >
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        row-selection="multiple"
        @grid-ready="onGridReady"
      />
    </div>
  </div>
</template>
