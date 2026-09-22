<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS2220_RH（1#RH真空报表）：DDH.Winforms.SMS.Forms.FrmMS2220_RH
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Tms2010Id', headerName: 'Tms2010Id', width: 85 },
      { field: 'CPono', headerName: 'PONO', width: 83 },
      { field: 'CActualMachineStationCode', headerName: '实际机台工位编码', width: 119 },
      { field: 'Index', headerName: '序号', width: 120 },
      { field: 'Date', headerName: '日期', width: 120 },
      { field: 'CUserIdLuzhang', headerName: '炉长id', width: 120 },
      { field: 'CUserIdYicaoshou', headerName: '一操手id', width: 120 },
      { field: 'CStoveNo', headerName: '炉号', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'CActualMachineStationDesc', headerName: '实际机台工位描述', width: 119 },
      { field: 'CPotNo', headerName: '罐号', width: 120 },
      { field: 'CPotState', headerName: '钢包包况 包况', width: 120 },
      { field: 'Pot_TouQiXing', headerName: '钢包情况 透气性', width: 111 },
      { field: 'Pot_JingKong', headerName: '钢包情况 净空（mm）', width: 143 },
      { field: 'Pot_ZhaHou', headerName: '钢包情况 渣厚（mm）', width: 143 },
      { field: 'DStaIn', headerName: '到站时刻(h:min)', width: 159 },
      { field: 'DZb', headerName: '工序时间（min) 到处理位时刻', width: 183 },
      { field: 'D_Pro_Beg_Time', headerName: '工序时间（min) 开始处理时刻', width: 183 },
      { field: 'D_PoKong', headerName: '工序时间（min) 破空时刻', width: 159 },
      { field: 'DStaOut', headerName: '离站时刻(h:min)', width: 159 },
      { field: 'Time_Min_ChouZhenKong', headerName: '工序时间（min) 抽真空时间', width: 171 },
      { field: 'Time_Min_ShenZhenKong', headerName: '工序时间（min) 深真空时间', width: 171 },
      { field: 'Time_Min_JingXunHuan', headerName: '工序时间（min) 净循环时间', width: 171 },
      { field: 'Time_Min_Pro', headerName: '工序时间（min) 处理时间', width: 159 },
      { field: 'O2_In_Pressure', headerName: '吹氧 进站氧（ppm）', width: 135 },
      { field: 'O2_Use_Time', headerName: '吹氧 吹氧时间（s）', width: 128 },
      { field: 'O2_Use', headerName: '吹氧 吹氧量（m³）', width: 127 },
      { field: 'CTempIn', headerName: '到站温度(℃)', width: 94 },
      { field: 'CTemp1', headerName: '温度(℃)过程温度1', width: 125 },
      { field: 'CTemp2', headerName: '温度(℃)过程温度2', width: 125 },
      { field: 'CTemp3', headerName: '温度(℃)破空温度', width: 118 },
      { field: 'CTempOut', headerName: '吹氩出站温度', width: 94 },
      { field: 'Max_ZhenKong', headerName: '温度(℃)最高真空度', width: 130 },
      { field: 'CEndO', headerName: '终点氧', width: 106 },
      { field: 'CaoBianHao_Shang', headerName: '真空室 上部槽编号', width: 123 },
      { field: 'Cao_Shang', headerName: '真空室 上部槽次数', width: 123 },
      { field: 'CaoBianHao_Xia', headerName: '真空室 下部槽编号', width: 123 },
      { field: 'Cao_Xia', headerName: '真空室 下部槽次数', width: 123 },
      { field: 'JinZiGuan_Num', headerName: '真空室 浸渍管次数', width: 123 },
      { field: 'ReWanGuan_No', headerName: '热弯管 编号', width: 87 },
      { field: 'ReWanGuan_Num', headerName: '热弯管 使用次数', width: 111 },
      { field: 'GSCF_RH_In_C', headerName: '进站成分(%) C', width: 104 },
      { field: 'GSCF_RH_In_Si', headerName: '进站成分(%) Si', width: 106 },
      { field: 'GSCF_RH_In_Mn', headerName: '进站成分(%) Mn', width: 113 },
      { field: 'GSCF_RH_In_P', headerName: '进站成分(%) P', width: 104 },
      { field: 'GSCF_RH_In_S', headerName: '进站成分(%) S', width: 104 },
      { field: 'GSCF_RH_In_Als', headerName: '进站成分(%) Als', width: 112 },
      { field: 'GSCF_RH_In_N', headerName: '进站成分(%) N', width: 105 },
      { field: 'GSCF_RH_In_Ca', headerName: '进站成分(%) Ca', width: 110 },
      { field: 'GSCF_RH_In_Ti', headerName: '进站成分(%) Ti', width: 107 },
      { field: 'GSCF_RH_In_Cr', headerName: '进站成分(%) Cr', width: 108 },
      { field: 'GSCF_RH_In_Cu', headerName: '进站成分(%) Cu', width: 111 },
      { field: 'GSCF_RH_In_Ni', headerName: '进站成分(%) Ni', width: 107 },
      { field: 'GSCF_RH_In_Mo', headerName: '进站成分(%) Mo', width: 113 },
      { field: 'GSCF_RH_In_Nb', headerName: '进站成分(%) Nb', width: 112 },
      { field: 'GSCF_RH_Out_C', headerName: '出站成分(%) C', width: 104 },
      { field: 'GSCF_RH_Out_Si', headerName: '出站成分(%) Si', width: 106 },
      { field: 'GSCF_RH_Out_Mn', headerName: '出站成分(%) Mn', width: 113 },
      { field: 'GSCF_RH_Out_P', headerName: '出站成分(%) P', width: 104 },
      { field: 'GSCF_RH_Out_S', headerName: '出站成分(%) S', width: 104 },
      { field: 'GSCF_RH_Out_Als', headerName: '出站成分(%) Als', width: 112 },
      { field: 'GSCF_RH_Out_N', headerName: '出站成分(%) N', width: 105 },
      { field: 'GSCF_RH_Out_Ca', headerName: '出站成分(%) Ca', width: 110 },
      { field: 'GSCF_RH_Out_Ti', headerName: '出站成分(%) Ti', width: 107 },
      { field: 'GSCF_RH_Out_Nb', headerName: '出站成分(%) Nb', width: 112 },
      { field: 'GSCF_RH_Out_V', headerName: '出站成分(%) V', width: 105 },
      { field: 'GSCF_RH_Out_Cr', headerName: '出站成分(%) Cr', width: 108 },
      { field: 'GSCF_RH_Out_Cu', headerName: '出站成分(%) Cu', width: 111 },
      { field: 'GSCF_RH_Out_Ni', headerName: '出站成分(%) Ni', width: 107 },
      { field: 'GSCF_RH_Out_Mo', headerName: '出站成分(%) Mo', width: 113 },
      { field: 'GSCF_C', headerName: '成品成分(%) C', width: 104 },
      { field: 'GSCF_Si', headerName: '成品成分(%) Si', width: 106 },
      { field: 'GSCF_Mn', headerName: '成品成分(%) Mn', width: 113 },
      { field: 'GSCF_P', headerName: '成品成分(%) P', width: 104 },
      { field: 'GSCF_S', headerName: '成品成分(%) S', width: 104 },
      { field: 'GSCF_Als', headerName: '成品成分(%) Als', width: 112 },
      { field: 'GSCF_N', headerName: '成品成分(%) N', width: 105 },
      { field: 'GSCF_Ca', headerName: '成品成分(%) Ca', width: 110 },
      { field: 'GSCF_Ti', headerName: '成品成分(%) Ti', width: 107 },
      { field: 'GSCF_Nb', headerName: '成品成分(%) Nb', width: 112 },
      { field: 'GSCF_V', headerName: '成品成分(%) V', width: 105 },
      { field: 'GSCF_Cr', headerName: '成品成分(%) Cr', width: 108 },
      { field: 'GSCF_Cu', headerName: '成品成分(%) Cu', width: 111 },
      { field: 'GSCF_Ni', headerName: '成品成分(%) Ni', width: 107 },
      { field: 'GSCF_Mo', headerName: '成品成分(%) Mo', width: 113 },
      { field: 'GSCF_B', headerName: '成品成分(%) B', width: 104 },
      { field: 'Wgt_LvFen', headerName: '铝粉(kg)', width: 120 },
      { field: 'Wgt_TeZhongGuiTie', headerName: '特种硅铁(kg)', width: 94 },
      { field: 'Wgt_ZhongMeng', headerName: '中锰(kg)', width: 120 },
      { field: 'Wgt_JinShuMeng', headerName: '金属锰(kg)', width: 82 },
      { field: 'Wgt_LinTie', headerName: '磷铁(kg)', width: 120 },
      { field: 'Wgt_TaiTie', headerName: '钛铁(kg)', width: 120 },
      { field: 'Wgt_GaoLvGaiZhiJi', headerName: '高铝改质剂(kg)', width: 106 },
      { field: 'Wgt_TuoLiuJi', headerName: '脱硫剂(kg)', width: 82 },
      { field: 'Len_LvXian', headerName: '铝线(m)', width: 81 },
      { field: 'Len_GaoGaiXian', headerName: '高钙线(m)', width: 93 },
      { field: 'Wgt_GuiMeng', headerName: '硅锰(kg)', width: 120 },
      { field: 'Wgt_NiTie', headerName: '铌铁', width: 120 },
      { field: 'Wgt_TanFen', headerName: '碳粉', width: 120 },
      { field: 'Per_LvHuiShou', headerName: '铝回收率', width: 120 },
      { field: 'GsAfterGo', headerName: '钢水去向', width: 120 },
      { field: 'DuanMian', headerName: '断面宽度（mm×mm)', width: 137 },
      { field: 'BackUp', headerName: '备注', width: 120 },
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
