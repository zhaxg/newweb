<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTmp1220（板头板边）：DDH.Winforms.SMP.Forms.FrmTmp1220
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CRollTypeOne', headerName: '轧制方式', width: 112 },
      { field: 'NSlabThickMin', headerName: '板厚最小值', width: 112 },
      { field: 'NSlabThickSwitch', headerName: '板厚区间', width: 112 },
      { field: 'NSlabThickMax', headerName: '板厚最大值', width: 112 },
      { field: 'NWidthSwitchMin', headerName: '宽度最小值', width: 112 },
      { field: 'NWidthSwitch', headerName: '宽度区间', width: 112 },
      { field: 'NWidthSwitchMax', headerName: '宽度最大值', width: 112 },
      { field: 'NLenSwitchMin', headerName: '长度最小值', width: 112 },
      { field: 'NLenSwitch', headerName: '长度区间', width: 112 },
      { field: 'NLenSwitchMax', headerName: '长度最大值', width: 112 },
      { field: 'NSlabEdgeMin', headerName: '板边(MIN)', width: 112 },
      { field: 'NSlabEdgeMax', headerName: '板边(MAX)', width: 112 },
      { field: 'NSlabHeadMin', headerName: '板头(MIN)', width: 112 },
      { field: 'NSlabHeadMax', headerName: '板头(MAX)', width: 112 },
      { field: 'NThickSwitchMin', headerName: '厚度区间最小值', width: 112 },
      { field: 'NThickSwitchMax', headerName: '厚度区间最大值', width: 112 },
      { field: 'CRollTypeTwo', headerName: '轧制方式2', width: 112 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 112 },
      { field: 'CCcl', headerName: '成材率', width: 112 },
      { field: 'NThickMin', headerName: '最小厚度', width: 112 },
      { field: 'NThickMax', headerName: '最大厚度', width: 112 },
      { field: 'NWidthMin', headerName: '最小宽度', width: 112 },
      { field: 'NWidthMax', headerName: '最大宽度', width: 112 },
      { field: 'NLenMin', headerName: '最小长度', width: 112 },
      { field: 'NLenMax', headerName: '最大长度', width: 112 },
      { field: 'NSlabEdge', headerName: '板边取值', width: 112 },
      { field: 'NSlabHead', headerName: '板头取值', width: 112 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]));
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnAdd() { /* TODO: 接入业务逻辑 */ }
function onbtnDel() { /* TODO: 接入业务逻辑 */ }
function onbtnSave() { /* TODO: 接入业务逻辑 */ }

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
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnAdd"><IconPlus class="h-3.5 w-3.5" />添加</Button>
      <Button text size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onbtnDel"><IconTrash class="h-3.5 w-3.5" />删除</Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onbtnSave"><IconDeviceFloppy class="h-3.5 w-3.5" />保存</Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
