<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTql6100（中厚板质量异常汇总）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTql6100
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'DTime', headerName: '时间', width: 112 },
      { field: 'HasFile', headerName: '是否已上传', width: 112 },
      { field: 'CStoveNo', headerName: '炉号', width: 112 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'CPieceNoSlab', headerName: '板坯号', width: 112 },
      { field: 'NThickSlab', headerName: '坯料厚度', width: 112 },
      { field: 'NWidthSlab', headerName: '坯料宽度', width: 112 },
      { field: 'NLenSlab', headerName: '坯料长度', width: 112 },
      { field: 'DTimeJL', headerName: '精炼时间', width: 112 },
      { field: 'DTimeKJ', headerName: '开浇时间', width: 112 },
      { field: 'DFurTime', headerName: '入炉时间', width: 112 },
      { field: 'CFurType', headerName: '装炉类型（冷/热）', width: 112 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 112 },
      { field: 'CInboundNo', headerName: '入库单号', width: 112 },
      { field: 'NThickPlate', headerName: '钢板厚', width: 112 },
      { field: 'NWidthPlate', headerName: '钢板宽', width: 112 },
      { field: 'NLenPlate', headerName: '钢板长', width: 112 },
      { field: 'CTolType', headerName: '公差类型', width: 112 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 112 },
      { field: 'CZrDw', headerName: '责任单位', width: 112 },
      { field: 'CDefectType', headerName: '缺陷类型', width: 112 },
      { field: 'CDefectPosition', headerName: '缺陷位置', width: 112 },
      { field: 'CDefectDesc', headerName: '缺陷描述', width: 112 },
      { field: 'CLgReason', headerName: '炼钢原因分析', width: 112 },
      { field: 'CZgReason', headerName: '中厚板原因分析', width: 112 },
      { field: 'DRollTime', headerName: '轧制时间', width: 112 },
      { field: 'DJyTime', headerName: '检验时间', width: 112 },
      { field: 'CResult', headerName: '判定结果', width: 112 },
      { field: 'CSurfaceCategory', headerName: '判定分类', width: 106 },
      { field: 'CPutPos', headerName: '摆放位置', width: 112 },
      { field: 'CZgGroup', headerName: '中厚板班组', width: 112 },
      { field: 'CUser', headerName: '操作人', width: 112 },
      { field: 'CLgGroup', headerName: '炼钢班组', width: 112 },
      { field: 'DHandleTime', headerName: '已处理时间', width: 112 },
      { field: 'CHandleResult', headerName: '处理结果判定', width: 112 },
      { field: 'CGroup', headerName: '班组', width: 112 },
      { field: 'CUser2', headerName: '检查员', width: 112 },
      { field: 'CInPos', headerName: '入库摆放位置', width: 112 },
      { field: 'CRemark', headerName: '备注', width: 112 },
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
