<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR9110（定尺剪实绩）：DDH.Winforms.SHR.Forms.FrmHR9110
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'InPlateNo', headerName: '入口钢板号', width: 150 },
      { field: 'TPlateNo', headerName: '头侧板号', width: 150 },
      { field: 'BestSurface', headerName: '好面朝向', width: 150 },
      { field: 'DsTemp', headerName: '剪切温度', width: 150 },
      { field: 'OperatorId', headerName: '操作者', width: 150 },
      { field: 'SlCode', headerName: '剪切线代码', width: 150 },
      { field: 'DsTime', headerName: 'CS剪切时间', width: 150 },
      { field: 'TPlateThk', headerName: '头侧板厚度', width: 150 },
      { field: 'TPlateWth', headerName: '头侧板宽度', width: 150 },
      { field: 'TPlateLth', headerName: '头侧板长度', width: 150 },
      { field: 'TPlateWgt', headerName: '头侧板重量', width: 150 },
      { field: 'TOrdNum', headerName: '头侧合同数', width: 150 },
      { field: 'TPartMark', headerName: '头侧取板记号', width: 150 },
      { field: 'TProductSum', headerName: '头侧成品板总数', width: 150 },
      { field: 'TTdsLth', headerName: '头侧剪切长度(头部)', width: 150 },
      { field: 'TBdsLth', headerName: '头侧剪切长度(尾部)', width: 150 },
      { field: 'TLthMark', headerName: '头侧是否余长标记', width: 150 },
      { field: 'BPlateNo', headerName: '尾侧板号', width: 150 },
      { field: 'BPlateThk', headerName: '尾侧板厚度', width: 150 },
      { field: 'BPlateWth', headerName: '尾侧板宽度', width: 150 },
      { field: 'BPlateLth', headerName: '尾侧板长度', width: 150 },
      { field: 'BPlateWgt', headerName: '尾侧板重量', width: 150 },
      { field: 'BOrdNum', headerName: '尾侧合同数', width: 150 },
      { field: 'BPartMark', headerName: '尾侧取板记号', width: 150 },
      { field: 'BProductSum', headerName: '尾侧成品板总数', width: 150 },
      { field: 'BLthMark', headerName: '尾侧是否余长标记', width: 150 },
      { field: 'Reserved0', headerName: '头侧板成品毛长', width: 150 },
      { field: 'Reserved1', headerName: '预留1', width: 150 },
      { field: 'Reserved2', headerName: '预留2', width: 150 },
      { field: 'Reserved3', headerName: '预留3', width: 150 },
      { field: 'CropCutLenTop', headerName: 'CROP', width: 150 },
      { field: 'CropCutLenBottom', headerName: 'CROP', width: 150 },
      { field: 'ShiftNo', headerName: '班次号', width: 150 },
      { field: 'ShiftGroup', headerName: '班次组', width: 150 },
      { field: 'ActMaxWth', headerName: '头侧宽度最大值（仪表)', width: 150 },
      { field: 'ActMinWth', headerName: '头侧宽度最小值（仪表)', width: 150 },
      { field: 'ActAveWth', headerName: '头侧宽度最平均值（仪表)', width: 150 },
      { field: 'DHandle', headerName: '处理时间', width: 150 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]));
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">

      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
    </div>
        <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
