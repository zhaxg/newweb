<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR9400（中厚板轧制台账）：DDH.Winforms.SHR.Forms.FrmHR9400
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CPlanTime', headerName: '计划时间', width: 60 },
      { field: 'COrderNo', headerName: '订单号', width: 60 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 60 },
      { field: 'COrderNo1', headerName: '订单号1', width: 60 },
      { field: 'COrderNo2', headerName: '订单号2', width: 60 },
      { field: 'COrderNo3', headerName: '订单号3', width: 60 },
      { field: 'COrderNo4', headerName: '订单号4', width: 60 },
      { field: 'NFurType', headerName: '装炉方式', width: 60 },
      { field: 'DFurTime', headerName: '入炉时间', width: 60 },
      { field: 'DRollTime', headerName: '轧制时间', width: 60 },
      { field: 'CDelivyStatus', headerName: '交货状态', width: 60 },
      { field: 'CSgCodeOrder', headerName: '订单钢种', width: 60 },
      { field: 'CBatchNo', headerName: '批号', width: 60 },
      { field: 'CPieceNoSlab', headerName: '板坯号', width: 112 },
      { field: 'CStoveNo', headerName: '炉号', width: 60 },
      { field: 'CSgCodeLg', headerName: '炼钢钢种', width: 60 },
      { field: 'NSlabThick', headerName: '坯料厚度', width: 60 },
      { field: 'NSlabWidth', headerName: '坯料宽度', width: 60 },
      { field: 'NSlabLen', headerName: '钢坯长', width: 60 },
      { field: 'NSlabWgtCal', headerName: '钢坯重量', width: 60 },
      { field: 'NSlabWgtSj', headerName: '钢坯实重', width: 60 },
      { field: 'DRollQua', headerName: '轧制块数', width: 112 },
      { field: 'CInboundNo1', headerName: '入库标识1', width: 60 },
      { field: 'NThick', headerName: '厚度', width: 60 },
      { field: 'NWidth1', headerName: '板宽1', width: 60 },
      { field: 'NWidth2', headerName: '板宽2', width: 60 },
      { field: 'NLen1', headerName: '板长1', width: 60 },
      { field: 'NLen2', headerName: '板长1', width: 60 },
      { field: 'NBc', headerName: '倍尺', width: 60 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 60 },
      { field: 'CRollSpec', headerName: '轧制规格', width: 112 },
      { field: 'NThickRoll', headerName: '轧制厚', width: 60 },
      { field: 'NWidthRoll', headerName: '轧制宽', width: 60 },
      { field: 'NLenRoll', headerName: '轧制长', width: 60 },
      { field: 'TotalRollingTime', headerName: '总轧制时间', width: 112 },
      { field: 'CTol', headerName: '公差', width: 60 },
      { field: 'CDelivyQtyFlag', headerName: '交货数量标志', width: 60 },
      { field: 'CSgStd', headerName: '钢种标准', width: 60 },
      { field: 'CConRemark', headerName: '合同备注', width: 60 },
      { field: 'CFaceKeyPoint', headerName: '表面重点', width: 60 },
      { field: 'CFaceClass', headerName: '表面类别', width: 60 },
      { field: 'NLenLlB', headerName: '理论板边', width: 60 },
      { field: 'NLenLlT', headerName: '理论板头', width: 60 },
      { field: 'NLlSc', headerName: '理论烧损', width: 60 },
      { field: 'NLenLlMc', headerName: '理论毛长', width: 60 },
      { field: 'NLenMbJc', headerName: '母板净长', width: 60 },
      { field: 'NCclTL', headerName: '提料成材率', width: 60 },
      { field: 'NCclSj', headerName: '实际成材率', width: 60 },
      { field: 'NRateCz', headerName: '成材率差值', width: 60 },
      { field: 'CIsNotDl', headerName: '是否堆冷', width: 60 },
      { field: 'CIsQY', headerName: '是否取样', width: 60 },
      { field: 'NCalWgt1', headerName: '钢板理重1', width: 60 },
      { field: 'CIsNotTq', headerName: '是否套切', width: 60 },
      { field: 'NLenTq1', headerName: '套切1', width: 60 },
      { field: 'NLenTq2', headerName: '套切2', width: 60 },
      { field: 'NLenTq3', headerName: '套切3', width: 60 },
      { field: 'CIsNotWidthTq', headerName: '是否宽套切', width: 60 },
      { field: 'NWidthTq1', headerName: '宽度套切1', width: 60 },
      { field: 'NWidthTq2', headerName: '宽度套切2', width: 60 },
      { field: 'NWidthTq3', headerName: '宽度套切3', width: 60 },
      { field: 'CLengthType', headerName: '长度类型', width: 60 },
      { field: 'NCalWgt2', headerName: '钢板理重2', width: 60 },
      { field: 'NCalWgt3', headerName: '钢板理重3', width: 60 },
      { field: 'NCalWgt4', headerName: '钢板理重4', width: 60 },
      { field: 'NCalWgtSum', headerName: '钢板合计重量', width: 60 },
      { field: 'CFlawStand', headerName: '探伤标准', width: 60 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 60 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 60 },
      { field: 'C', headerName: '碳', width: 60 },
      { field: 'Si', headerName: '硅', width: 60 },
      { field: 'Mn', headerName: '锰', width: 60 },
      { field: 'P', headerName: '磷', width: 60 },
      { field: 'S', headerName: '硫', width: 60 },
      { field: 'Cr', headerName: '铬', width: 60 },
      { field: 'Ni', headerName: '镍', width: 60 },
      { field: 'Mo', headerName: '钼', width: 60 },
      { field: 'Cu', headerName: '铜', width: 60 },
      { field: 'Al', headerName: '铝', width: 60 },
      { field: 'Ti', headerName: '钛', width: 60 },
      { field: 'Nb', headerName: '铌', width: 60 },
      { field: 'V', headerName: '钒', width: 60 },
      { field: 'Als', headerName: 'ALS', width: 60 },
      { field: 'Ca', headerName: '钙', width: 60 },
      { field: 'Ceq', headerName: '碳当量', width: 60 },
      { field: 'B', headerName: '硼', width: 60 },
      { field: 'Alins', headerName: 'ALINS', width: 60 },
      { field: 'W', headerName: '钨', width: 60 },
      { field: 'As', headerName: '砷', width: 60 },
      { field: 'Sn', headerName: '锡', width: 60 },
      { field: 'Co', headerName: '钴', width: 60 },
      { field: 'Pb', headerName: '铅', width: 60 },
      { field: 'Sb', headerName: '锑', width: 60 },
      { field: 'Ta', headerName: '钽', width: 60 },
      { field: 'Zr', headerName: '锆', width: 60 },
      { field: 'Bi', headerName: '铋', width: 60 },
      { field: 'Se', headerName: '硒', width: 60 },
      { field: 'Te', headerName: '碲', width: 60 },
      { field: 'Ce', headerName: '铈', width: 60 },
      { field: 'La', headerName: '镧', width: 60 },
      { field: 'N', headerName: '氮', width: 60 },
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
