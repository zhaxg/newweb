<script setup lang="ts">
/** 对应 FrmMS2220_RH（1#RH 真空台账报表，cQueryString={LineCode,MachineCode}）：DDH.Winforms.SMS.Forms.FrmMS2220_RH
 *  已接入：crudAppService.SaveList("FrmMS2220_RHViewDto")（btnSave_Click：GetTrackingList→ToSaveChangesData；
 *         行内编辑 TrackableList；保存按钮与可编辑门控 = 查询后任一行 IsEnableEditAndSaveDatas）
 *  待接入：② 炉长/一操手列下拉候选（原 OperateViewModel → frmMS2100_X_ShiftInfo/getProcUserInfo 未生成），暂文本编辑
 *  提取器所列二级弹窗 FrmMS2200_X_QueryString_Dto 为菜单注入参数结构（.cs 无 ShowDialog），不设弹窗
 *  结构：stackPanel1（产线|机台|日期|炉次号|查询|保存）+ bandedGridView1 单表；产线/机台=qs 单值只读；日期变更自动重查
 *  列集：extract 待确认 103 可见 + 5 隐藏（hide:true，含 Tms2010Id 之外的内键）；无班次/班组列（本实体无 GroupCode/ShiftCode）
 *  字段桥接：后端 JSON camelCase → 回填 toPascal 首字母还原 */
import { onMounted, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconDeviceFloppy, IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { CellValueChangedEvent, ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";

import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { crudAppService } from "@/api/common/crudAppService";
import { TrackableList } from "@/api/common/trackableList";
import { frmMS2220RHApi } from "@/api/mes4ddh/sms.swagger";

const { toast } = useToast();
const { raw: menuQs, json: menuJson } = useMenuQuery();
const qsFormat = JSON.stringify({ LineCode: null, MachineCode: null });

const theme = makeHmxGridTheme();
const gridApi = ref<GridApi | null>(null);
const querying = ref(false);
const saving = ref(false);
const canEdit = ref(false);
const loaded = ref(false);

const lineCode = ref(String((menuJson as { LineCode?: string }).LineCode ?? ""));
const machineCode = ref(String((menuJson as { MachineCode?: string }).MachineCode ?? ""));
const deDate = ref<Date>(new Date());
const stoveNo = ref("");

const trackList = shallowRef<TrackableList<Record<string, unknown>>>(new TrackableList<Record<string, unknown>>());

const colDefs = ref<ColDef[]>([      { field: "CPono", headerName: "PONO", width: 112 },
      { field: "Index", headerName: "序号", width: 86 },
      { field: "Date", headerName: "日期", width: 86 },
      { field: "CUserIdLuzhang", headerName: "炉长id", width: 112 },
      { field: "CUserIdYicaoshou", headerName: "一操手id", width: 125 },
      { field: "CStoveNo", headerName: "炉号", width: 86 },
      { field: "CSgCode", headerName: "钢种", width: 86 },
      { field: "CActualMachineStationCode", headerName: "实际机台工位编码", width: 164 },
      { field: "CActualMachineStationDesc", headerName: "实际机台工位描述", width: 164 },
      { field: "CPotNo", headerName: "罐号", width: 86 },
      { field: "CPotState", headerName: "钢包包况 包况", width: 151 },
      { field: "Pot_TouQiXing", headerName: "钢包情况 透气性", width: 164 },
      { field: "Pot_JingKong", headerName: "钢包情况 净空（mm）", width: 203 },
      { field: "Pot_ZhaHou", headerName: "钢包情况 渣厚（mm）", width: 203 },
      { field: "DStaIn", headerName: "到站时刻(h:min)", width: 203 },
      { field: "DZb", headerName: "工序时间（min) 到处理位时刻", width: 268 },
      { field: "D_Pro_Beg_Time", headerName: "工序时间（min) 开始处理时刻", width: 268 },
      { field: "D_PoKong", headerName: "工序时间（min) 破空时刻", width: 242 },
      { field: "DStaOut", headerName: "离站时刻(h:min)", width: 203 },
      { field: "Time_Min_ChouZhenKong", headerName: "工序时间（min) 抽真空时间", width: 255 },
      { field: "Time_Min_ShenZhenKong", headerName: "工序时间（min) 深真空时间", width: 255 },
      { field: "Time_Min_JingXunHuan", headerName: "工序时间（min) 净循环时间", width: 255 },
      { field: "Time_Min_Pro", headerName: "工序时间（min) 处理时间", width: 242 },
      { field: "O2_In_Pressure", headerName: "吹氧 进站氧（ppm）", width: 203 },
      { field: "O2_Use_Time", headerName: "吹氧 吹氧时间（s）", width: 190 },
      { field: "O2_Use", headerName: "吹氧 吹氧量（m³）", width: 190 },
      { field: "CTempIn", headerName: "到站温度(℃)", width: 151 },
      { field: "CTemp1", headerName: "温度(℃)过程温度1", width: 190 },
      { field: "CTemp2", headerName: "温度(℃)过程温度2", width: 190 },
      { field: "CTemp3", headerName: "温度(℃)破空温度", width: 177 },
      { field: "CTempOut", headerName: "吹氩出站温度", width: 138 },
      { field: "Max_ZhenKong", headerName: "温度(℃)最高真空度", width: 190 },
      { field: "CEndO", headerName: "终点氧", width: 99 },
      { field: "CaoBianHao_Shang", headerName: "真空室 上部槽编号", width: 177 },
      { field: "Cao_Shang", headerName: "真空室 上部槽次数", width: 177 },
      { field: "CaoBianHao_Xia", headerName: "真空室 下部槽编号", width: 177 },
      { field: "Cao_Xia", headerName: "真空室 下部槽次数", width: 177 },
      { field: "JinZiGuan_Num", headerName: "真空室 浸渍管次数", width: 177 },
      { field: "ReWanGuan_No", headerName: "热弯管 编号", width: 138 },
      { field: "ReWanGuan_Num", headerName: "热弯管 使用次数", width: 164 },
      { field: "GSCF_RH_In_C", headerName: "进站成分(%) C", width: 177 },
      { field: "GSCF_RH_In_Si", headerName: "进站成分(%) Si", width: 190 },
      { field: "GSCF_RH_In_Mn", headerName: "进站成分(%) Mn", width: 190 },
      { field: "GSCF_RH_In_P", headerName: "进站成分(%) P", width: 177 },
      { field: "GSCF_RH_In_S", headerName: "进站成分(%) S", width: 177 },
      { field: "GSCF_RH_In_Als", headerName: "进站成分(%) Als", width: 203 },
      { field: "GSCF_RH_In_N", headerName: "进站成分(%) N", width: 177 },
      { field: "GSCF_RH_In_Ca", headerName: "进站成分(%) Ca", width: 190 },
      { field: "GSCF_RH_In_Ti", headerName: "进站成分(%) Ti", width: 190 },
      { field: "GSCF_RH_In_Cr", headerName: "进站成分(%) Cr", width: 190 },
      { field: "GSCF_RH_In_Cu", headerName: "进站成分(%) Cu", width: 190 },
      { field: "GSCF_RH_In_Ni", headerName: "进站成分(%) Ni", width: 190 },
      { field: "GSCF_RH_In_Mo", headerName: "进站成分(%) Mo", width: 190 },
      { field: "GSCF_RH_In_Nb", headerName: "进站成分(%) Nb", width: 190 },
      { field: "GSCF_RH_Out_C", headerName: "出站成分(%) C", width: 177 },
      { field: "GSCF_RH_Out_Si", headerName: "出站成分(%) Si", width: 190 },
      { field: "GSCF_RH_Out_Mn", headerName: "出站成分(%) Mn", width: 190 },
      { field: "GSCF_RH_Out_P", headerName: "出站成分(%) P", width: 177 },
      { field: "GSCF_RH_Out_S", headerName: "出站成分(%) S", width: 177 },
      { field: "GSCF_RH_Out_Als", headerName: "出站成分(%) Als", width: 203 },
      { field: "GSCF_RH_Out_N", headerName: "出站成分(%) N", width: 177 },
      { field: "GSCF_RH_Out_Ca", headerName: "出站成分(%) Ca", width: 190 },
      { field: "GSCF_RH_Out_Ti", headerName: "出站成分(%) Ti", width: 190 },
      { field: "GSCF_RH_Out_Nb", headerName: "出站成分(%) Nb", width: 190 },
      { field: "GSCF_RH_Out_V", headerName: "出站成分(%) V", width: 177 },
      { field: "GSCF_RH_Out_Cr", headerName: "出站成分(%) Cr", width: 190 },
      { field: "GSCF_RH_Out_Cu", headerName: "出站成分(%) Cu", width: 190 },
      { field: "GSCF_RH_Out_Ni", headerName: "出站成分(%) Ni", width: 190 },
      { field: "GSCF_RH_Out_Mo", headerName: "出站成分(%) Mo", width: 190 },
      { field: "GSCF_C", headerName: "成品成分(%) C", width: 177 },
      { field: "GSCF_Si", headerName: "成品成分(%) Si", width: 190 },
      { field: "GSCF_Mn", headerName: "成品成分(%) Mn", width: 190 },
      { field: "GSCF_P", headerName: "成品成分(%) P", width: 177 },
      { field: "GSCF_S", headerName: "成品成分(%) S", width: 177 },
      { field: "GSCF_Als", headerName: "成品成分(%) Als", width: 203 },
      { field: "GSCF_N", headerName: "成品成分(%) N", width: 177 },
      { field: "GSCF_Ca", headerName: "成品成分(%) Ca", width: 190 },
      { field: "GSCF_Ti", headerName: "成品成分(%) Ti", width: 190 },
      { field: "GSCF_Nb", headerName: "成品成分(%) Nb", width: 190 },
      { field: "GSCF_V", headerName: "成品成分(%) V", width: 177 },
      { field: "GSCF_Cr", headerName: "成品成分(%) Cr", width: 190 },
      { field: "GSCF_Cu", headerName: "成品成分(%) Cu", width: 190 },
      { field: "GSCF_Ni", headerName: "成品成分(%) Ni", width: 190 },
      { field: "GSCF_B", headerName: "成品成分(%) B", width: 177 },
      { field: "Wgt_LvFen", headerName: "铝粉(kg)", width: 138 },
      { field: "Wgt_TeZhongGuiTie", headerName: "特种硅铁(kg)", width: 164 },
      { field: "Wgt_ZhongMeng", headerName: "中锰(kg)", width: 138 },
      { field: "Wgt_JinShuMeng", headerName: "金属锰(kg)", width: 151 },
      { field: "Wgt_LinTie", headerName: "磷铁(kg)", width: 138 },
      { field: "Wgt_TaiTie", headerName: "钛铁(kg)", width: 138 },
      { field: "Wgt_GaoLvGaiZhiJi", headerName: "高铝改质剂(kg)", width: 177 },
      { field: "Wgt_TuoLiuJi", headerName: "脱硫剂(kg)", width: 151 },
      { field: "Len_LvXian", headerName: "铝线(m)", width: 125 },
      { field: "Len_GaoGaiXian", headerName: "高钙线(m)", width: 138 },
      { field: "Wgt_GuiMeng", headerName: "硅锰(kg)", width: 138 },
      { field: "Wgt_NiTie", headerName: "铌铁", width: 86 },
      { field: "Wgt_TanFen", headerName: "碳粉", width: 86 },
      { field: "Per_LvHuiShou", headerName: "铝回收率", width: 112 },
      { field: "GsAfterGo", headerName: "钢水去向", width: 112 },
      { field: "DuanMian", headerName: "断面宽度（mm×mm)", width: 203 },
      { field: "BackUp", headerName: "备注", width: 86 },
      { field: "Tms2010Id", headerName: "Tms2010Id", width: 177 },
      { field: "GSCF_Mo", headerName: "成品成分(%) Mo", width: 190 },
      { field: "CUserNameLuzhang", headerName: "炉长姓名", width: 112, hide: true },
      { field: "CUserNameYicaoshou", headerName: "一操手姓名", width: 125, hide: true },
      { field: "IsEnableEditAndSaveDatas", headerName: "IsEnableEditAndSaveDatas", width: 300, hide: true },
      { field: "Tms2000Id", headerName: "Tms2000Id", width: 177, hide: true },
      { field: "Tms2013RhId", headerName: "Tms2013RhId", width: 203, hide: true }]);

const RO = new Set(["Id", "Creator", "CreateTime", "LastModifier", "LastModifyTime"]);
for (const c of colDefs.value) {
  if (!c.field || RO.has(c.field)) continue;
  c.editable = () => canEdit.value;
}

function toPascal(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k ? k[0].toUpperCase() + k.slice(1) : k] = v;
  return out;
}

function getParamDto() {
  if (!lineCode.value || !machineCode.value) {
    toast("禁止操作，产线和机台均不得为空！", 2000, "warn");
    return null;
  }
  return {
    LineCode: lineCode.value,
    LineDesc: lineCode.value,
    MachineCode: machineCode.value,
    MachineName: machineCode.value,
    Date: deDate.value,
    StoveNo: stoveNo.value,
  };
}

async function onQuery() {
  const p = getParamDto();
  if (!p) return;
  querying.value = true;
  try {
    const list = ((await frmMS2220RHApi.query(p)) ?? []) as Record<string, unknown>[];
    trackList.value = new TrackableList(list.map(toPascal));
    canEdit.value = list.some((x) => x.IsEnableEditAndSaveDatas === true || x.isEnableEditAndSaveDatas === true);
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}

async function onSave() {
  if (!trackList.value.length) return;
  saving.value = true;
  try {
    await crudAppService.SaveList(trackList.value, "FrmMS2220_RHViewDto");
    // 原保存后重查——查询已接 frmMS2220RHApi.query
    toast("保存成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

function onDateChange() {
  if (loaded.value) void onQuery();
}

function onCellValueChanged(_e: CellValueChangedEvent) {
  gridApi.value?.refreshCells({ force: true });
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

onMounted(() => {
  if (!menuQs) {
    toast(
      `界面必须配置注入参数，MES程序版本可能已严重落后，请退出并重新打开MES程序！\r\n若问题仍未得到解决，请联系管理员！\r\n界面注入参数格式为：'${qsFormat}'`,
      5000,
      "error",
    );
  } else if (menuQs.startsWith("{") && !Object.keys(menuJson).length) {
    toast(`界面参数错误应为:${qsFormat}，\r\nMES程序版本可能已严重落后，请退出并重新打开MES程序！`, 5000, "error");
  }
  loaded.value = true;
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：产线/机台/日期/炉次号/查询/保存） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineCode" disabled class="w-24 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">机台</label>
      <InputText :model-value="machineCode" disabled class="w-28 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">日期</label>
      <DatePicker v-model="deDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0"
        @update:model-value="onDateChange" />
      <label class="shrink-0 text-xs text-muted-foreground">炉次号</label>
      <InputText v-model="stoveNo" class="w-32 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button v-if="canEdit" variant="outlined" class="shrink-0 whitespace-nowrap" :loading="saving" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="trackList" :pagination="false"
        :loading="querying" @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData"
        @cell-value-changed="onCellValueChanged" />
    </div>
  </div>
</template>
