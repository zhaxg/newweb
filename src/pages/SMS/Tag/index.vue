<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTag（炼钢总厂自动化点位配置）：DDH.Winforms.SMS.Forms.Tag.FrmTag
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CLineName', headerName: '产线名称', width: 120 },
      { field: 'CMachineName', headerName: '机台名称', width: 120 },
      { field: 'CSmnsTag', headerName: '自动化点位', width: 83 },
      { field: 'CTagNm', headerName: '点位描述', width: 120 },
      { field: 'CTagUsage', headerName: '点位用途', width: 120 },
      { field: 'CStationNo', headerName: '站点编码', width: 120 },
      { field: 'CStationDesc', headerName: '站点描述', width: 120 },
      { field: 'CValueStyle', headerName: '数据类型', width: 120 },
      { field: 'CFunction', headerName: '点位功能', width: 120 },
      { field: 'CTableField', headerName: '存储位置', width: 83 },
      { field: 'NEnable', headerName: '是否启用', width: 120 },
      { field: 'CUnit', headerName: '单片钢坯', width: 107 },
      { field: 'NCovMom', headerName: '倍率', width: 120 },
      { field: 'NDecimals', headerName: '修约', width: 120 },
      { field: 'NAddRecord', headerName: '是否记录日志', width: 95 },
      { field: 'CBackup', headerName: '备注', width: 120 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },,
]));

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">

      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
        <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
