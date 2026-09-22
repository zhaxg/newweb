<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS1021（炼钢总厂机台物料信息维护）：DDH.Winforms.SMS.Forms.FrmMS1021
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CLineName', headerName: '产线名称', width: 120 },
      { field: 'CMachineName', headerName: '机台名称', width: 120 },
      { field: 'CSiloCode', headerName: '料仓代码', width: 120 },
      { field: 'CSiloName', headerName: '料仓名称', width: 120 },
      { field: 'CMtrlCode', headerName: '物料编码', width: 120 },
      { field: 'CMtrlName', headerName: '物料描述', width: 120 },
      { field: 'CMtrlNameEn', headerName: '物料英文名称', width: 95 },
      { field: 'CFeedingMtrlType', headerName: '投料物料种类', width: 95 },
      { field: 'CUnit', headerName: '单片钢坯', width: 120 },
      { field: 'CChangeTime', headerName: '换料时间', width: 120 },
      { field: 'CNextTime', headerName: '下次换料时间', width: 95 },
      { field: 'CSiloBackup', headerName: '料仓备注', width: 120 },
      { field: 'CEnable', headerName: '启用', width: 120 },
      { field: 'CBackup', headerName: '备注', width: 120 },
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
