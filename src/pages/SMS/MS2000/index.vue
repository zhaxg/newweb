<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS2000（炼钢总厂甘特图）：DDH.Winforms.SMS.Forms.FrmMS2000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CPlanTime', headerName: '计划时间', width: 120 },
      { field: 'CCcCode', headerName: 'CCM代码', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'CZGLineCode', headerName: '轧制产线', width: 120 },
      { field: 'CPono', headerName: 'PONO', width: 83 },
      { field: 'CJcNo', headerName: '炉次号', width: 120 },
      { field: 'NSortJc', headerName: '炉次序号', width: 119 },
      { field: 'CDownDdUser', headerName: '下发调度人', width: 83 },
      { field: 'DDownDdTime', headerName: '下达时间', width: 95 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'NWidth', headerName: '宽度', width: 120 },
      { field: 'NLen', headerName: '长度', width: 120 },
      { field: 'COrderNo', headerName: '订单号', width: 120 },
      { field: 'CTsyq', headerName: '特殊要求', width: 120 },
      { field: 'CIsZb', headerName: '是否组批', width: 95 },
      { field: 'CRemark', headerName: '备注', width: 120 },
      { field: 'NGenerateRoutePlan', headerName: '生成工艺路线计划', width: 119 },
      { field: 'CLineName', headerName: '产线名称', width: 120 },
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
