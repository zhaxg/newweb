<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS2210_LF（2#LF精炼报表）：DDH.Winforms.SMS.Forms.FrmMS2210_LF
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CPono', headerName: 'PONO', width: 120 },
      { field: 'CActualMachineCode', headerName: '实际工序机台', width: 120 },
      { field: 'CActualMachineStationCode', headerName: '实际机台工位编码', width: 120 },
      { field: 'Date', headerName: '日期', width: 60 },
      { field: 'CStoveNo', headerName: '炉号', width: 60 },
      { field: 'CSgCode', headerName: '钢种', width: 60 },
      { field: 'CActualMachineDesc', headerName: '实际工序机台名称', width: 60 },
      { field: 'CActualMachineStationDesc', headerName: '实际机台工位描述', width: 60 },
      { field: 'ShiftCode', headerName: '班次(0:夜；1:白；2:中)', width: 60 },
      { field: 'GroupCode', headerName: '班组(01:甲；02:乙；03:丙；04:丁)', width: 60 },
      { field: 'CUserIdLuzhang', headerName: '炉长id', width: 120 },
      { field: 'CUserIdYiCaoShou', headerName: '一操手Id', width: 120 },
      { field: 'CPotNo', headerName: '罐号', width: 60 },
      { field: 'CPotState', headerName: '钢包包况 包况', width: 60 },
      { field: 'DStaIn', headerName: '到站时刻(h:min)', width: 60 },
      { field: 'DProBegTime', headerName: '处理开始时刻(h:min)', width: 60 },
      { field: 'DProEndTime', headerName: '产出截止时间', width: 60 },
      { field: 'DStaOut', headerName: '离站时刻(h:min)', width: 60 },
      { field: 'NElecTimeMin', headerName: '送电时间(min)', width: 60 },
      { field: 'DSmeltMin', headerName: '冶炼时间(min)', width: 60 },
      { field: 'NRcMin', headerName: '软吹时间(min)', width: 60 },
      { field: 'NTotalEleUsed', headerName: '电耗(kwh)', width: 60 },
      { field: 'CTempIn', headerName: '到站温度(℃)', width: 60 },
      { field: 'CTempForCCM', headerName: '连铸要温度(℃)', width: 60 },
      { field: 'CTempOut', headerName: '吹氩出站温度', width: 60 },
      { field: 'GSAfterGo', headerName: '钢水去向', width: 60 },
      { field: 'GSCF_Ar_C', headerName: '氩站 成分（%）C', width: 120 },
      { field: 'GSCF_Ar_Si', headerName: '氩站 成分（%）Si', width: 120 },
      { field: 'GSCF_Ar_Mn', headerName: '氩站 成分（%）Mn', width: 120 },
      { field: 'GSCF_Ar_P', headerName: '氩站 成分（%）P', width: 120 },
      { field: 'GSCF_Ar_S', headerName: '氩站 成分（%）S', width: 120 },
      { field: 'GSCF_Ar_Als', headerName: '氩站 成分（%）Als', width: 120 },
      { field: 'GSCF_Ar_Ca', headerName: '氩站成分 Ca', width: 120 },
      { field: 'GSCF_Ar_ArStation', headerName: '氩站成分 氩站', width: 120 },
      { field: 'GSCF_Ar_Cr', headerName: '氩站成分 Cr', width: 120 },
      { field: 'GSCF_Ar_Cu', headerName: '氩站成分 Cu', width: 120 },
      { field: 'GSCF_LF_In_C', headerName: '进站样（%）C', width: 120 },
      { field: 'GSCF_LF_In_Si', headerName: '进站样（%）Si', width: 120 },
      { field: 'GSCF_LF_In_Mn', headerName: '进站样（%）Mn', width: 120 },
      { field: 'GSCF_LF_In_P', headerName: '进站样（%）P', width: 120 },
      { field: 'GSCF_LF_In_S', headerName: '进站样（%）S', width: 120 },
      { field: 'GSCF_LF_In_Als', headerName: '进站样（%）Als', width: 120 },
      { field: 'GSCF_LF_In_Ca', headerName: '进站样（%）Ca', width: 120 },
      { field: 'GSCF_LF_In_N', headerName: '进站样（%）N', width: 120 },
      { field: 'GSCF_LF_In_Cu', headerName: '进站样（%）Cu', width: 120 },
      { field: 'GSCF_LF_C', headerName: '上钢成分（%）C', width: 120 },
      { field: 'GSCF_LF_Si', headerName: '上钢成分（%）Si', width: 120 },
      { field: 'GSCF_LF_Mn', headerName: '上钢成分（%）Mn', width: 120 },
      { field: 'GSCF_LF_P', headerName: '上钢成分（%）P', width: 120 },
      { field: 'GSCF_LF_S', headerName: '上钢成分（%）S', width: 120 },
      { field: 'GSCF_LF_Als', headerName: '上钢成分（%）Als', width: 120 },
      { field: 'GSCF_LF_Ca', headerName: '上钢成分（%）Ca', width: 120 },
      { field: 'GSCF_LF_Ti', headerName: '上钢成分（%）Ti', width: 120 },
      { field: 'GSCF_LF_N', headerName: '上钢成分（%）N', width: 120 },
      { field: 'GSCF_LF_Cu', headerName: '上钢成分（%）Cu', width: 120 },
      { field: 'GSCF_LF_Cr', headerName: '上钢成分（%）Cr', width: 120 },
      { field: 'GSCF_LF_Ni', headerName: '上钢成分（%）Ni', width: 120 },
      { field: 'GSCF_LF_Nb', headerName: '上钢成分（%）Nb', width: 120 },
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
      { field: 'Wgt_GuiTie', headerName: '硅铁(kg)', width: 120 },
      { field: 'Wgt_GuiTieQiu', headerName: '硅铁球(kg)', width: 120 },
      { field: 'Wgt_GuiMeng', headerName: '硅锰(kg)', width: 120 },
      { field: 'Wgt_Zhong_C_Meng', headerName: '中C锰(kg)', width: 120 },
      { field: 'Wgt_Di_C_Meng', headerName: '低C锰(kg)', width: 120 },
      { field: 'Wgt_LvTie', headerName: '铝铁(kg)', width: 120 },
      { field: 'Wgt_GeTie', headerName: '铬铁(kg)', width: 120 },
      { field: 'Wgt_LinTie', headerName: '磷铁(kg)', width: 120 },
      { field: 'Wgt_Tong', headerName: '铜(kg)', width: 120 },
      { field: 'Wgt_LvKuai', headerName: '铝块(kg)', width: 120 },
      { field: 'Wgt_LvFen', headerName: '铝粉(kg)', width: 120 },
      { field: 'Wgt_LvLi', headerName: '铝粒(kg)', width: 120 },
      { field: 'Wgt_TaiTie', headerName: '钛铁(kg)', width: 120 },
      { field: 'Wgt_ShiHui', headerName: '石灰(kg)', width: 120 },
      { field: 'Wgt_GaiZhiJi', headerName: '改质剂(kg)', width: 120 },
      { field: 'Wgt_YingShi', headerName: '萤石(kg)', width: 120 },
      { field: 'Wgt_ZengTanJi', headerName: '增碳剂(kg)', width: 120 },
      { field: 'Wgt_DianShi', headerName: '电石(kg)', width: 120 },
      { field: 'Len_LvXian', headerName: '铝线(m)', width: 120 },
      { field: 'Len_GaoGaiXian', headerName: '高钙线(m)', width: 120 },
      { field: 'Makers_GaiXian', headerName: '钙线厂家', width: 120 },
      { field: 'Wgt_FuGaiJi', headerName: '覆盖剂(kg)', width: 120 },
      { field: 'Air_Ar', headerName: '氩气(m³)', width: 120 },
      { field: 'ZheZha', headerName: '是否折渣', width: 120 },
      { field: 'ZheZha_Time', headerName: '折渣时间', width: 120 },
      { field: 'SongDianCiShu', headerName: '送电次数', width: 120 },
      { field: 'GP_Type', headerName: '类别（中厚板、卷板）', width: 120 },
      { field: 'Pro_Exception', headerName: '生产异常', width: 120 },
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
