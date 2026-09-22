<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS2230_LZ（2#连铸报表）：DDH.Winforms.SMS.Forms.FrmMS2230_LZ
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'Index', headerName: '序号', width: 120 },
      { field: 'CStoveNo', headerName: '炉号', width: 120 },
      { field: 'Date', headerName: '日期', width: 120 },
      { field: 'CActualMachineDesc', headerName: '实际工序机台名称', width: 120 },
      { field: 'CPono', headerName: 'PONO', width: 120 },
      { field: 'CActualMachineStationCode', headerName: '实际机台工位编码', width: 120 },
      { field: 'ShiftCode', headerName: '班次(0:夜；1:白；2:中)', width: 120 },
      { field: 'GroupCode', headerName: '班组(01:甲；02:乙；03:丙；04:丁)', width: 120 },
      { field: 'CUserIdLuzhang', headerName: '炉长id', width: 120 },
      { field: 'CUserIdYiCaoShou', headerName: '一操手Id', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'CPotNo', headerName: '罐号', width: 120 },
      { field: 'CPotState', headerName: '钢包包况 包况', width: 120 },
      { field: 'CZbh1', headerName: '中包号1', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'NWidth', headerName: '宽度', width: 120 },
      { field: 'CCMIndex', headerName: '包次序号', width: 120 },
      { field: 'Wgt_Remaining', headerName: '浇余（吨）', width: 120 },
      { field: 'Temp_Get', headerName: '温度（℃）索要温度', width: 120 },
      { field: 'CDbdtwd', headerName: '温度（℃）上台温度', width: 120 },
      { field: 'Time_ZhenJing', headerName: '过程时间（min)镇静时间', width: 120 },
      { field: 'Time_Leave_LF', headerName: '过程时间（min)精炼出站时间', width: 120 },
      { field: 'CTimekjsj', headerName: '过程时间（min)开浇', width: 120 },
      { field: 'CTimetjsj', headerName: '过程时间（min)停浇', width: 120 },
      { field: 'CDbzk1', headerName: '是否自开', width: 120 },
      { field: 'Temp_ZJB_1', headerName: '中包温度（℃）1', width: 120 },
      { field: 'Temp_ZJB_2', headerName: '中包温度（℃）2', width: 120 },
      { field: 'Temp_ZJB_3', headerName: '中包温度（℃）3', width: 120 },
      { field: 'Temp_ZJB_4', headerName: '中包温度（℃）4', width: 120 },
      { field: 'N1Lasu1', headerName: '一流拉速/m.min 1', width: 120 },
      { field: 'N1Lasu2', headerName: '一流拉速/m.min 2', width: 120 },
      { field: 'N1Lasu3', headerName: '一流拉速/m.min 3', width: 120 },
      { field: 'N1Lasu4', headerName: '一流拉速/m.min 4', width: 120 },
      { field: 'N2Lasu1', headerName: '二流拉速/m.min 1', width: 120 },
      { field: 'N2Lasu2', headerName: '二流拉速/m.min 2', width: 120 },
      { field: 'N2Lasu3', headerName: '二流拉速/m.min 3', width: 120 },
      { field: 'N2Lasu4', headerName: '二流拉速/m.min 4', width: 120 },
      { field: 'GSCF_ShangGang_N', headerName: '上钢成分 N（上钢）', width: 120 },
      { field: 'GSCF_ShangGang_Als', headerName: '上钢成分 Als（上钢', width: 120 },
      { field: 'GSCF_CP_C', headerName: '成品成分（%）C', width: 120 },
      { field: 'GSCF_CP_Si', headerName: '成品成分（%）Si', width: 120 },
      { field: 'GSCF_CP_Mn', headerName: '成品成分（%）Mn', width: 120 },
      { field: 'GSCF_CP_P', headerName: '成品成分（%）P', width: 120 },
      { field: 'GSCF_CP_S', headerName: '成品成分（%）S', width: 120 },
      { field: 'GSCF_CP_Als', headerName: '成品成分（%）Als', width: 120 },
      { field: 'GSCF_CP_Ca', headerName: '成品成分（%）Ca', width: 120 },
      { field: 'GSCF_CP_Ti', headerName: '成品成分（%）Ti', width: 120 },
      { field: 'GSCF_CP_N', headerName: '成品成分（%）N', width: 120 },
      { field: 'GSCF_CP_Cu', headerName: '成品成分（%）Cu', width: 120 },
      { field: 'GSCF_CP_Cr', headerName: '成品成分（%）Cr', width: 120 },
      { field: 'GSCF_CP_Ni', headerName: '成品成分（%）Ni', width: 120 },
      { field: 'GSCF_CP_Nb', headerName: '成品成分（%）Nb', width: 120 },
      { field: 'GSCF_CP_Al', headerName: '成品成分（%）Al', width: 120 },
      { field: 'Wgt_GaiLvBi', headerName: '钙铝比', width: 120 },
      { field: 'BaoHuZha_Liu1', headerName: '一流保护渣', width: 120 },
      { field: 'BaoHuZha_Liu2', headerName: '二流保护渣', width: 120 },
      { field: 'DaBaoFuGaiJi', headerName: '大包覆盖剂', width: 120 },
      { field: 'ShuiBiaoHao', headerName: '水表号', width: 120 },
      { field: 'BaoHuZha', headerName: '保护渣', width: 120 },
      { field: 'FuGaiJi', headerName: '覆盖剂', width: 120 },
      { field: 'BangSai', headerName: '塞棒', width: 120 },
      { field: 'ShuiKou_Shang', headerName: '上水口', width: 120 },
      { field: 'ShuiKou_JinRuShi', headerName: '浸入式水口', width: 120 },
      { field: 'ShuiKou_Chang', headerName: '长水口', width: 120 },
      { field: 'BackUp', headerName: '备注', width: 120 },
      { field: 'CuiHuo', headerName: '是否投用淬火', width: 120 },
      { field: 'Wgt_GS_MZ', headerName: '钢水量 毛重', width: 120 },
      { field: 'Wgt_GS_PZ', headerName: '钢水量 皮重', width: 120 },
      { field: 'Wgt_GS', headerName: '钢水量 净重', width: 120 },
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
