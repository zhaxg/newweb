<script setup lang="ts">
/** 对应 FrmMS2210_LF（LF 精炼台账报表，3 菜单共用 cQueryString={LineCode,MachineCode}）：DDH.Winforms.SMS.Forms.FrmMS2210_LF
 *  已接入：crudAppService.SaveList("FrmMS2210_LFViewDto")（btnSave_Click：GetTrackingList→ToSaveChangesData；
 *         行内编辑 TrackableList；保存按钮与可编辑门控 = 查询后任一行 IsEnableEditAndSaveDatas）
 *  待接入：② 炉长/一操手列下拉候选（原 OperateViewModel → frmMS2100_X_ShiftInfo/getProcUserInfo 未生成），暂文本编辑
 *  提取器所列二级弹窗 FrmMS2200_X_QueryString_Dto 为菜单注入参数结构（.cs 无 ShowDialog），不设弹窗
 *  结构：stackPanel1（产线|机台|日期|炉次号|查询|保存）+ bandedGridView1 单表；产线/机台=qs 单值只读；日期变更自动重查
 *  列集：extract 待确认 99 可见 + 7 隐藏（hide:true，含 Creator）；班次/班组列 agSelect（0-2 / 01-04 照列头）
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
import { frmMS2210LFApi } from "@/api/mes4ddh/sms.swagger";

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
      { field: "Date", headerName: "日期", width: 86 },
      { field: "CStoveNo", headerName: "炉号", width: 86 },
      { field: "CSgCode", headerName: "钢种", width: 86 },
      { field: "CActualMachineCode", headerName: "实际工序机台", width: 138 },
      { field: "CActualMachineDesc", headerName: "实际工序机台名称", width: 164 },
      { field: "CActualMachineStationCode", headerName: "实际机台工位编码", width: 164 },
      { field: "CActualMachineStationDesc", headerName: "实际机台工位描述", width: 164 },
      { field: "GroupCode", headerName: "班组(01:甲；02:乙；03:丙；04:丁)", width: 300 },
      { field: "ShiftCode", headerName: "班次(0:夜；1:白；2:中)", width: 255 },
      { field: "CUserIdLuzhang", headerName: "炉长id", width: 112 },
      { field: "CPotNo", headerName: "罐号", width: 86 },
      { field: "CPotState", headerName: "钢包包况 包况", width: 151 },
      { field: "DStaIn", headerName: "到站时刻(h:min)", width: 203 },
      { field: "DProBegTime", headerName: "处理开始时刻(h:min)", width: 229 },
      { field: "DProEndTime", headerName: "产出截止时间", width: 138 },
      { field: "DStaOut", headerName: "离站时刻(h:min)", width: 203 },
      { field: "NElecTimeMin", headerName: "送电时间(min)", width: 177 },
      { field: "DSmeltMin", headerName: "冶炼时间(min)", width: 177 },
      { field: "NRcMin", headerName: "软吹时间(min)", width: 177 },
      { field: "NTotalEleUsed", headerName: "电耗(kwh)", width: 151 },
      { field: "CTempIn", headerName: "到站温度(℃)", width: 151 },
      { field: "CTempForCCM", headerName: "连铸要温度(℃)", width: 164 },
      { field: "CTempOut", headerName: "吹氩出站温度", width: 138 },
      { field: "GSAfterGo", headerName: "钢水去向", width: 112 },
      { field: "GSCF_Ar_C", headerName: "氩站 成分（%）C", width: 177 },
      { field: "GSCF_Ar_Si", headerName: "氩站 成分（%）Si", width: 190 },
      { field: "GSCF_Ar_Mn", headerName: "氩站 成分（%）Mn", width: 190 },
      { field: "GSCF_Ar_P", headerName: "氩站 成分（%）P", width: 177 },
      { field: "GSCF_Ar_S", headerName: "氩站 成分（%）S", width: 177 },
      { field: "GSCF_Ar_Als", headerName: "氩站 成分（%）Als", width: 203 },
      { field: "GSCF_Ar_Ca", headerName: "氩站成分 Ca", width: 151 },
      { field: "GSCF_Ar_ArStation", headerName: "氩站成分 氩站", width: 151 },
      { field: "GSCF_Ar_Cr", headerName: "氩站成分 Cr", width: 151 },
      { field: "GSCF_Ar_Cu", headerName: "氩站成分 Cu", width: 151 },
      { field: "GSCF_LF_In_C", headerName: "进站样（%）C", width: 151 },
      { field: "GSCF_LF_In_Si", headerName: "进站样（%）Si", width: 164 },
      { field: "GSCF_LF_In_Mn", headerName: "进站样（%）Mn", width: 164 },
      { field: "GSCF_LF_In_P", headerName: "进站样（%）P", width: 151 },
      { field: "GSCF_LF_In_S", headerName: "进站样（%）S", width: 151 },
      { field: "GSCF_LF_In_Als", headerName: "进站样（%）Als", width: 177 },
      { field: "GSCF_LF_In_Ca", headerName: "进站样（%）Ca", width: 164 },
      { field: "GSCF_LF_In_N", headerName: "进站样（%）N", width: 151 },
      { field: "GSCF_LF_In_Cu", headerName: "进站样（%）Cu", width: 164 },
      { field: "GSCF_LF_C", headerName: "上钢成分（%）C", width: 164 },
      { field: "GSCF_LF_Si", headerName: "上钢成分（%）Si", width: 177 },
      { field: "GSCF_LF_Mn", headerName: "上钢成分（%）Mn", width: 177 },
      { field: "GSCF_LF_P", headerName: "上钢成分（%）P", width: 164 },
      { field: "GSCF_LF_S", headerName: "上钢成分（%）S", width: 164 },
      { field: "GSCF_LF_Als", headerName: "上钢成分（%）Als", width: 190 },
      { field: "GSCF_LF_Ca", headerName: "上钢成分（%）Ca", width: 177 },
      { field: "GSCF_LF_Ti", headerName: "上钢成分（%）Ti", width: 177 },
      { field: "GSCF_LF_N", headerName: "上钢成分（%）N", width: 164 },
      { field: "GSCF_LF_Cu", headerName: "上钢成分（%）Cu", width: 177 },
      { field: "GSCF_LF_Cr", headerName: "上钢成分（%）Cr", width: 177 },
      { field: "GSCF_LF_Ni", headerName: "上钢成分（%）Ni", width: 177 },
      { field: "GSCF_LF_Nb", headerName: "上钢成分（%）Nb", width: 177 },
      { field: "GSCF_CP_C", headerName: "成品成分（%）C", width: 164 },
      { field: "GSCF_CP_Si", headerName: "成品成分（%）Si", width: 177 },
      { field: "GSCF_CP_Mn", headerName: "成品成分（%）Mn", width: 177 },
      { field: "GSCF_CP_P", headerName: "成品成分（%）P", width: 164 },
      { field: "GSCF_CP_S", headerName: "成品成分（%）S", width: 164 },
      { field: "GSCF_CP_Als", headerName: "成品成分（%）Als", width: 190 },
      { field: "GSCF_CP_Ca", headerName: "成品成分（%）Ca", width: 177 },
      { field: "GSCF_CP_Ti", headerName: "成品成分（%）Ti", width: 177 },
      { field: "GSCF_CP_N", headerName: "成品成分（%）N", width: 164 },
      { field: "GSCF_CP_Cu", headerName: "成品成分（%）Cu", width: 177 },
      { field: "GSCF_CP_Cr", headerName: "成品成分（%）Cr", width: 177 },
      { field: "GSCF_CP_Ni", headerName: "成品成分（%）Ni", width: 177 },
      { field: "GSCF_CP_Nb", headerName: "成品成分（%）Nb", width: 177 },
      { field: "Wgt_GuiTie", headerName: "硅铁(kg)", width: 138 },
      { field: "Wgt_GuiTieQiu", headerName: "硅铁球(kg)", width: 151 },
      { field: "Wgt_GuiMeng", headerName: "硅锰(kg)", width: 138 },
      { field: "Wgt_Zhong_C_Meng", headerName: "中C锰(kg)", width: 151 },
      { field: "Wgt_Di_C_Meng", headerName: "低C锰(kg)", width: 151 },
      { field: "Wgt_LvTie", headerName: "铝铁(kg)", width: 138 },
      { field: "Wgt_GeTie", headerName: "铬铁(kg)", width: 138 },
      { field: "Wgt_LinTie", headerName: "磷铁(kg)", width: 138 },
      { field: "Wgt_Tong", headerName: "铜(kg)", width: 125 },
      { field: "Wgt_LvKuai", headerName: "铝块(kg)", width: 138 },
      { field: "Wgt_LvFen", headerName: "铝粉(kg)", width: 138 },
      { field: "Wgt_LvLi", headerName: "铝粒(kg)", width: 138 },
      { field: "Wgt_TaiTie", headerName: "钛铁(kg)", width: 138 },
      { field: "Wgt_ShiHui", headerName: "石灰(kg)", width: 138 },
      { field: "Wgt_GaiZhiJi", headerName: "改质剂(kg)", width: 151 },
      { field: "Wgt_YingShi", headerName: "萤石(kg)", width: 138 },
      { field: "Wgt_ZengTanJi", headerName: "增碳剂(kg)", width: 151 },
      { field: "Wgt_DianShi", headerName: "电石(kg)", width: 138 },
      { field: "Len_LvXian", headerName: "铝线(m)", width: 125 },
      { field: "Len_GaoGaiXian", headerName: "高钙线(m)", width: 138 },
      { field: "Makers_GaiXian", headerName: "钙线厂家", width: 112 },
      { field: "Wgt_FuGaiJi", headerName: "覆盖剂(kg)", width: 151 },
      { field: "Air_Ar", headerName: "氩气(m³)", width: 138 },
      { field: "ZheZha", headerName: "是否折渣", width: 112 },
      { field: "ZheZha_Time", headerName: "折渣时间", width: 112 },
      { field: "SongDianCiShu", headerName: "送电次数", width: 112 },
      { field: "GP_Type", headerName: "类别（中厚板、卷板）", width: 190 },
      { field: "Pro_Exception", headerName: "生产异常", width: 112 },
      { field: "CUserIdYiCaoShou", headerName: "一操手Id", width: 125 },
      { field: "CUserNameLuzhang", headerName: "炉长姓名", width: 112, hide: true },
      { field: "Creator", headerName: "创建人", width: 99, hide: true },
      { field: "Tms2010Id", headerName: "Tms2010Id", width: 177, hide: true },
      { field: "CUserNameYiCaoShou", headerName: "一操手姓名", width: 125, hide: true },
      { field: "IsEnableEditAndSaveDatas", headerName: "IsEnableEditAndSaveDatas", width: 300, hide: true },
      { field: "Tms2000Id", headerName: "Tms2000Id", width: 177, hide: true },
      { field: "Tms2012LfId", headerName: "Tms2012LfId", width: 203, hide: true }]);

const RO = new Set(["Id", "Creator", "CreateTime", "LastModifier", "LastModifyTime"]);
for (const c of colDefs.value) {
  if (!c.field || RO.has(c.field)) continue;
  c.editable = () => canEdit.value;
  if (c.field === "GroupCode") {
    c.cellEditor = "agSelectCellEditor";
    c.cellEditorParams = { values: ["01", "02", "03", "04"] };
  } else if (c.field === "ShiftCode") {
    c.cellEditor = "agSelectCellEditor";
    c.cellEditorParams = { values: ["0", "1", "2"] };
  }
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
    const list = ((await frmMS2210LFApi.query(p)) ?? []) as Record<string, unknown>[];
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
    await crudAppService.SaveList(trackList.value, "FrmMS2210_LFViewDto");
    // 原保存后重查——查询已接 frmMS2210LFApi.query
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
