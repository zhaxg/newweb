<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmQL3000（检验委托发送）：DDH.Winforms.LIMS.Forms.FrmQL3000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CTestSubItemCode', headerName: '试验子项目代码', width: 120 },
      { field: 'CTestSubItemName', headerName: '试验子项目名称', width: 120 },
      { field: 'CDisplayText', headerName: '项目说明', width: 120 },
      { field: 'NValueMin', headerName: '检验标准下限', width: 120 },
      { field: 'CInterval', headerName: '开闭区间', width: 120 },
      { field: 'NValueMax', headerName: '检验标准上限', width: 120 },
      { field: 'CTargetValue', headerName: '目标值', width: 120 },
      { field: 'NItemAccuracy', headerName: '精度', width: 120 },
      { field: 'CFormula', headerName: '计算公式', width: 120 },
      { field: 'CIsPrint', headerName: '是否打质保书', width: 120 },
      { field: 'CIsJudge', headerName: '是否判定', width: 120 },
      { field: 'NMinValueNk', headerName: '内控最小值', width: 120 },
      { field: 'NValueIntervalNk', headerName: '内控开闭区间', width: 120 },
      { field: 'NMaxValueNk', headerName: '内控最大值', width: 120 },
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
      <Button text class="shrink-0 whitespace-nowrap" @click="onBtn0"><IconPlus class="h-3 w-3" />新增项目</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onBtn1"><IconDeviceFloppy class="h-3 w-3" />保存</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onBtn2"><IconDeviceFloppy class="h-3 w-3" />保存并发送</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onBtn3"><IconDeviceFloppy class="h-3 w-3" />保存发送（加急）</Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onBtn4"><IconTrash class="h-3 w-3" />删除项目</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onBtn5"><IconSearch class="h-3 w-3" />新建委托</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onBtn6"><IconSend class="h-3 w-3" />撤销发送</Button>
    </div>
        <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
