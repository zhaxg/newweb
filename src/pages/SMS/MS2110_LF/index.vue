<script setup lang="ts">
/** 对应 FrmMS2110_LF（LF 精炼作业，多菜单共享 cQueryString={LineCode,MachineCode}）：DDH.Winforms.SMS.Forms.FrmMS2110_LF
 *  已接入：frmMS2110LFFullApi.queryRoutePlans / checkStoveArrived+stoveArrived / checkCancelStoveArrived+cancelStoveArrived / checkStoveLeave+stoveLeave / getTms2012LFData+saveTms2012LFData / frmMS2100XMessageApi.checkIsNeedShowDialog / uCMSStoveInputInfoApi.getStoveInputInfo+saveStoveInputInfo / uCGYYDApi.getGYYDInfo / uCCustomPLCPointShowInfoApi.query
 *  分栏：上=炉次计划+后序明细/成分 | 工艺要点；下=冶炼投料 | 生产实绩 | 机台实时
 *  待接入：二级弹窗占位（班次 FrmMS2100_X_ShiftInfo_1、机台工位、异常信息编辑窗、取消出钢 FrmMS2100_X_CancelLeave、到站工位选择）；
 *          成分信息 publicQMInfo.getGHGSQMInfo swagger 未生成；投料明细 getStoveInputDetailInfo 未生成 */
import { onMounted, onBeforeUnmount, reactive, ref, shallowRef, nextTick } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Textarea from "primevue/textarea";
import { IconSearch } from "@tabler/icons-vue";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

function bridge(cols: ColDef[]): ColDef[] {
  return cols.map((c) => {
    if (!c.field) return c;
    const f = c.field;
    const ck = f.charAt(0).toLowerCase() + f.slice(1);
    return {
      ...c,
      valueGetter: (p: ValueGetterParams) => {
        const d = p.data as Record<string, unknown> | undefined;
        return d ? (d[ck] ?? d[f]) : undefined;
      },
      valueSetter: (p: ValueSetterParams) => {
        const d = p.data as Record<string, unknown> | undefined;
        if (!d) return false;
        d[ck] = p.newValue;
        d[f] = p.newValue;
        return true;
      },
    };
  });
}

import {
  frmMS2110LFFullApi,
  uCMSStoveInputInfoApi,
  uCGYYDApi,
  uCCustomPLCPointShowInfoApi,
  frmMS2100XMessageApi,
} from "@/api/mes4ddh/sms.swagger";

const { json: menuJson } = useMenuQuery();
const { toast } = useToast();
const qs = menuJson as { LineCode?: string; MachineCode?: string };
const lineCode = qs.LineCode ?? "";
const machineCode = qs.MachineCode ?? "";

const theme = makeHmxGridTheme();
const querying = ref(false);
const planApi = ref<GridApi | null>(null);
const detailApi = ref<GridApi | null>(null);
const cfApi = ref<GridApi | null>(null);
const gyydApi = ref<GridApi | null>(null);

const plans = ref<any[]>([]);
const detailRows = ref<any[]>([]);
const cfRows = ref<any[]>([]);
const gyydRows = ref<any[]>([]);
const focused = shallowRef<any | null>(null);

const autoRefresh = ref(false);
const autoRefreshLf = ref(false);

const bof = reactive<Record<string, any>>({});
const formFields = [
{ k: "id", t: "ID" },
  { k: "cStoveNo", t: "炉次号" },
  { k: "cPono", t: "制造命令号" },
  { k: "cGsId", t: "钢水id" },
  { k: "cTms2010Id", t: "tms2010表数据id" },
  { k: "cUserIdLuzhang", t: "炉长id" },
  { k: "cUserIdYicaoshou", t: "一操手id" },
  { k: "cPotType", t: "钢包类型" },
  { k: "cPotNo", t: "钢包号" },
  { k: "cPotNoId", t: "钢包唯一标识" },
  { k: "cPotAge", t: "钢包龄", m: "i" },
  { k: "cPotState", t: "包况" },
  { k: "dStaIn", t: "进站时刻", m: "d" },
  { k: "dStaOut", t: "出站时刻", m: "d" },
  { k: "dZb", t: "座包时间", m: "d" },
  { k: "dDb", t: "吊包时间", m: "d" },
  { k: "dSmelt", t: "冶炼时间", m: "d" },
  { k: "cElec", t: "电耗" },
  { k: "nDjrUsedTime", t: "电加热时长秒", m: "i" },
  { k: "cTempDown", t: "座包温度" },
  { k: "cTemp1", t: "一次测温" },
  { k: "cTemp2", t: "二次测温" },
  { k: "cTemp3", t: "三次测温" },
  { k: "cTempUp", t: "吊包温度" },
  { k: "cTempRcStart", t: "软吹开始温度" },
  { k: "cTempRcEnd", t: "软吹结束温度" },
  { k: "dRcStart", t: "软吹开始时间", m: "d" },
  { k: "dRcEnd", t: "软吹结束时间", m: "d" },
  { k: "nTotalN", t: "总N2耗", m: "g" },
  { k: "nArUsedJb", t: "搅拌Ar耗", m: "g" },
  { k: "nJrNum", t: "加热次数", m: "i" },
  { k: "nDjjUsed", t: "电加热时长", m: "i" },
  { k: "nDjrDl", t: "电加热平均电流", m: "g" },
  { k: "cTransfLevel", t: "变压器档位" },
  { k: "cTransfTemp", t: "变压器油温" },
  { k: "nElecIdle", t: "无功电耗", m: "g" },
  { k: "nElecAct", t: "有功电耗", m: "g" },
  { k: "nWgtIn", t: "到站重量", m: "g" },
  { k: "nWgtOut", t: "出站重量", m: "g" },
  { k: "cStoveJg", t: "炉次间隔" },
  { k: "cStoveJgRes", t: "炉次间隔原因" },
  { k: "cIsXl", t: "是否洗炉炉次" },
  { k: "cTimestamp", t: "时间戳", m: "d" },
  { k: "creator", t: "创建人" },
  { k: "createTime", t: "创建时间", m: "d" },
  { k: "lastModifier", t: "最后更新人" },
  { k: "lastModifyTime", t: "最后更新时间", m: "d" },
  { k: "cSw01", t: "备用字段1" },
  { k: "cSw02", t: "备用字段2" },
  { k: "cSw03", t: "备用字段3" },
  { k: "cSw04", t: "备用字段4" },
  { k: "cSw05", t: "备用字段5" },
  { k: "cSw06", t: "备用字段6" },
  { k: "selected", t: "Selected", m: "c" },
  { k: "dProBeg", t: "处理开始时刻", m: "d" },
  { k: "dProEnd", t: "处理结束时刻", m: "d" },
  { k: "cIsZz", t: "是否折渣", m: "c" },
  { k: "nZz", t: "折渣时间秒", m: "i" },
  { k: "cTempIn", t: "到站温度" },
  { k: "cTempOut", t: "离站温度" },
  { k: "cTempForCcm", t: "连铸要温度" },
  { k: "cBackup", t: "备注", m: "m" },
  { k: "nRc_Minutes", t: "软吹时长(分)" },
  { k: "dZzBeg", t: "折渣开始时间", m: "d" },
];

const ynOptions = [
  { label: "是", value: "Y" },
  { label: "否", value: "N" },
];

const planCols = ref<ColDef[]>(bridge([
{ field: "tms2000_CPono", headerName: "制造命令号", width: 93 },
      { field: "tms2000_CStove", headerName: "炉号", width: 64 },
      { field: "tms2000_CSgCode", headerName: "钢种", width: 64 },
      { field: "tms2000_CSgStd", headerName: "执行标准", width: 80 },
      { field: "tms2010_CPlanMachineDesc", headerName: "计划机台", width: 80 },
      { field: "tms2010_CStoveState", headerName: "工序炉次状态", width: 106 },
      { field: "tms2010_CActualMachineStationDesc", headerName: "生产工位", width: 80 },
      { field: "tms2000_CSpec", headerName: "规格", width: 64 },
      { field: "tms2000_NThick", headerName: "厚度", width: 64 },
      { field: "tms2000_NWidth", headerName: "宽度", width: 64 },
      { field: "tms2000_NLen", headerName: "长度", width: 64 },
      { field: "tms2000_COrderNo", headerName: "订单号", width: 67 },
      { field: "tms2000_CTsyq", headerName: "特殊要求", width: 80 },
      { field: "tms2000_CRemark", headerName: "备注", width: 64 },
      { field: "tms2010_DAccountDate", headerName: "账务日期", width: 80 },
      { field: "tms2010_DTeamDate", headerName: "班次日期", width: 80 },
      { field: "tms2010_CShift", headerName: "班次", width: 64 },
      { field: "tms2010_CTeam", headerName: "班组", width: 64 },
      { field: "tms2010_DPlanBegtime", headerName: "计划工序开始时间", width: 132 },
      { field: "tms2010_DPlanEndtime", headerName: "计划工序结束时间", width: 132 },
      { field: "tms2010_DActualBegtime", headerName: "实际工序开始时间", width: 132 },
      { field: "tms2010_DActualEndtime", headerName: "实际工序结束时间", width: 132 },
      { field: "tms2000_Id", headerName: "主键", width: 64, hide: true },
      { field: "tms2000_NStatus", headerName: "状态", width: 64, hide: true },
      { field: "tms2000_CJcFk", headerName: "浇次主键", width: 80, hide: true },
      { field: "tms2000_CJcNo", headerName: "浇次号", width: 67, hide: true },
      { field: "tms2000_CLineCode", headerName: "产线", width: 64, hide: true },
      { field: "tms2000_NQua", headerName: "支数", width: 64, hide: true },
      { field: "tms2000_NWgt", headerName: "重量", width: 64, hide: true },
      { field: "tms2000_NSort", headerName: "顺序号", width: 67, hide: true },
      { field: "tms2000_NSortJc", headerName: "浇次内炉次顺序号", width: 132, hide: true },
      { field: "tms2000_CMatCode", headerName: "钢坯物料号", width: 93, hide: true },
      { field: "tms2000_CMatName", headerName: "钢坯物料名称", width: 106, hide: true },
      { field: "tms2000_CCcCode", headerName: "连铸代码", width: 80, hide: true },
      { field: "tms2000_CRhCode", headerName: "真空代码", width: 80, hide: true },
      { field: "tms2000_CLfCode", headerName: "精炼代码", width: 80, hide: true },
      { field: "tms2000_LdCode", headerName: "转炉代码", width: 80, hide: true },
      { field: "tms2000_CIsZb", headerName: "是否备坯计划", width: 106, hide: true },
      { field: "tms2000_DUseTime", headerName: "可用时间", width: 80, hide: true },
      { field: "tms2000_CRoute", headerName: "工艺路线", width: 80, hide: true },
      { field: "tms2000_DJhqTime", headerName: "交货期", width: 67, hide: true },
      { field: "tms2000_CCustName", headerName: "客户名称", width: 80, hide: true },
      { field: "tms2000_NLgCn", headerName: "炼钢产能", width: 80, hide: true },
      { field: "tms2000_CLenMx", headerName: "长度明细", width: 80, hide: true },
      { field: "tms2000_CSgCodeStd", headerName: "钢种标准", width: 80, hide: true },
      { field: "tms2000_CStNo", headerName: "炼钢工艺卡", width: 93, hide: true },
      { field: "tms2000_DDownDdTime", headerName: "下发调度时间", width: 106, hide: true },
      { field: "tms2000_CDownDdUser", headerName: "下发调度人", width: 93, hide: true },
      { field: "tms2000_DDownLgsc", headerName: "下发生产时间", width: 106, hide: true },
      { field: "tms2000_CDownLgscUser", headerName: "下发人", width: 67, hide: true },
      { field: "tms2000_NWgtMeter", headerName: "单量", width: 64, hide: true },
      { field: "tms2000_CSpecOrder", headerName: "成品规格", width: 80, hide: true },
      { field: "tms2000_CLineName", headerName: "产线名称", width: 80, hide: true },
      { field: "tms2000_CIsSl", headerName: "是否收料", width: 80, hide: true },
      { field: "tms2000_NGenerateRoutePlan", headerName: "生成工艺路线计划", width: 132, hide: true },
      { field: "tms2000_CPotType", headerName: "钢包类型", width: 80, hide: true },
      { field: "tms2000_CPotNo", headerName: "钢包号", width: 67, hide: true },
      { field: "tms2000_CPotNoId", headerName: "钢包唯一标识", width: 106, hide: true },
      { field: "tms2000_CStoveLocation", headerName: "最新炉次位置", width: 106, hide: true },
      { field: "tms2000_CStoveLocationStation", headerName: "最新炉次工位", width: 106, hide: true },
      { field: "tms2000_CStoveState", headerName: "最新炉次状态", width: 106, hide: true },
      { field: "tms2000_CStovePlanId", headerName: "最新炉次计划工序机台id", width: 165, hide: true },
      { field: "tms2000_CToCurrentStoveSplitMergeType", headerName: "生成当前炉次的拆合类型", width: 171, hide: true },
      { field: "tms2000_CToCurrentStoveSplitMergeTypeSign", headerName: "生成当前炉次的拆合类型标识", width: 197, hide: true },
      { field: "tms2000_CStoveSplitMergeType", headerName: "炉次拆合类型", width: 106, hide: true },
      { field: "tms2000_CStoveSplitMergeTypeSign", headerName: "炉次拆合类型标识", width: 132, hide: true },
      { field: "tms2000_CStoveChangeId", headerName: "炉次最终更改标识id", width: 139, hide: true },
      { field: "tms2000_CStoveChangeMachinename", headerName: "炉次最终更改位置", width: 132, hide: true },
      { field: "tms2000_CQmAdjust", headerName: "质检改判", width: 80, hide: true },
      { field: "tms2000_CQmAdjustActualId", headerName: "最终质检改判时炉次工序机台实际id", width: 220, hide: true },
      { field: "tms2000_CRefurnace", headerName: "炉次回炉", width: 80, hide: true },
      { field: "tms2000_CRefurnaceState", headerName: "炉次回炉状态", width: 106, hide: true },
      { field: "tms2000_CRefurnaceActualId", headerName: "炉次回炉时炉次工序机台实际id", width: 204, hide: true },
      { field: "tms2000_CMoveGs", headerName: "炉次转钢水", width: 93, hide: true },
      { field: "tms2000_CMoveGsSign", headerName: "炉次转钢水标识", width: 119, hide: true },
      { field: "tms2000_CMoveGsPlanId", headerName: "炉次转钢水时炉次工序机台计划id", width: 217, hide: true },
      { field: "tms2000_CEnable", headerName: "启用", width: 64, hide: true },
      { field: "tms2000_CNotEnableBackup", headerName: "不启用状态备注", width: 119, hide: true },
      { field: "tms2000_DAccountDate", headerName: "账务日期", width: 80, hide: true },
      { field: "tms2000_NMixStove", headerName: "混合炉", width: 67, hide: true },
      { field: "tms2010_Id", headerName: "TMS2010_ID", width: 64, hide: true },
      { field: "tms2010_CGsId", headerName: "钢水id", width: 64, hide: true },
      { field: "tms2010_CStoveNo", headerName: "炉次号", width: 67, hide: true },
      { field: "tms2010_CPono", headerName: "制造命令号", width: 93, hide: true },
      { field: "tms2010_CProc", headerName: "炉次工艺路线计划工序", width: 158, hide: true },
      { field: "tms2010_CProcDesc", headerName: "炉次工艺路线计划工序描述", width: 184, hide: true },
      { field: "tms2010_CProcIndex", headerName: "炉次工艺路线序号", width: 132, hide: true },
      { field: "tms2010_CPlanLineCode", headerName: "计划产线", width: 80, hide: true },
      { field: "tms2010_CPlanLineDesc", headerName: "计划产线描述", width: 106, hide: true },
      { field: "tms2010_CPlanMachineCode", headerName: "计划工序机台", width: 106, hide: true },
      { field: "tms2010_CPlanMachineStationCode", headerName: "计划机台工位编码", width: 132, hide: true },
      { field: "tms2010_CPlanMachineStationDesc", headerName: "计划机台工位描述", width: 132, hide: true },
      { field: "tms2010_CSign", headerName: "机台工位同时生产标识", width: 158, hide: true },
      { field: "tms2010_CPlanState", headerName: "计划状态", width: 80, hide: true },
      { field: "tms2010_CPlanType", headerName: "计划生成类型", width: 106, hide: true },
      { field: "tms2010_CEnable", headerName: "启用", width: 64, hide: true },
      { field: "tms2010_CRefurnace", headerName: "炉次回炉", width: 80, hide: true },
      { field: "tms2010_CRefurnaceState", headerName: "炉次回炉状态", width: 106, hide: true },
      { field: "tms2010_CMoveGs", headerName: "炉次转钢水", width: 93, hide: true },
      { field: "tms2010_CMoveGsSign", headerName: "炉次转钢水标识", width: 119, hide: true },
      { field: "tms2010_CStoveSplitMergeType", headerName: "炉次拆合类型", width: 106, hide: true },
      { field: "tms2010_CStoveSplitMergeTypeSign", headerName: "拆合类型标识", width: 106, hide: true },
      { field: "tms2010_CPlanBackup", headerName: "计划备注", width: 80, hide: true },
      { field: "tms2010_NActualExist", headerName: "按计划进行实际生产", width: 145, hide: true },
      { field: "tms2010_CActualLineCode", headerName: "实际产线", width: 80, hide: true },
      { field: "tms2010_CActualLineDesc", headerName: "实际产线描述", width: 106, hide: true },
      { field: "tms2010_CActualMachineCode", headerName: "实际工序机台", width: 106, hide: true },
      { field: "tms2010_CActualMachineDesc", headerName: "实际工序机台名称", width: 132, hide: true },
      { field: "tms2010_CActualMachineStationCode", headerName: "实际机台工位编码", width: 132, hide: true },
      { field: "tms2010_NWgtMz", headerName: "钢水毛重", width: 80, hide: true },
      { field: "tms2010_NWgtPz", headerName: "钢水皮重", width: 80, hide: true },
      { field: "tms2010_NWgtKz", headerName: "钢水扣重", width: 80, hide: true },
      { field: "tms2010_NWgt", headerName: "钢水净重", width: 80, hide: true },
      { field: "tms2010_CPotType", headerName: "钢包类型", width: 80, hide: true },
      { field: "tms2010_CPotNo", headerName: "钢包号", width: 67, hide: true },
      { field: "tms2010_CPotNoId", headerName: "钢包唯一标识", width: 106, hide: true },
      { field: "tms2010_CActualBackup", headerName: "实际备注", width: 80, hide: true },
      { field: "tms2010_CDelFlag", headerName: "删除标识", width: 80, hide: true },
      { field: "AllowEditInProcPage", headerName: "当前工序数据是否允许编辑", width: 184, hide: true },
      { field: "tms2000_CZGLineCode", headerName: "轧制产线", width: 80, hide: true },
      { field: "DActualBegtimePro", headerName: "实际工序生产开始时间", width: 158, hide: true },
      { field: "DActualEndtimePro", headerName: "实际工序生产结束时间", width: 158, hide: true },
      { field: "tms2000_CPlanTime", headerName: "计划日期", width: 80, hide: true },
]));
const detailCols = ref<ColDef[]>(bridge([
{ field: "CPono", headerName: "制造命令号", width: 93 },
      { field: "CStoveNo", headerName: "炉次号", width: 67 },
      { field: "CProcDesc", headerName: "工序", width: 64 },
      { field: "CProcIndex", headerName: "工序序号", width: 80 },
      { field: "CStoveState", headerName: "炉次状态", width: 80 },
      { field: "CPlanLineDesc", headerName: "计划产线描述", width: 106 },
      { field: "CPlanMachineDesc", headerName: "计划机台名称", width: 106 },
      { field: "DPlanBegtime", headerName: "计划开始时间", width: 106 },
      { field: "DPlanEndtime", headerName: "计划结束时间", width: 106 },
      { field: "CActualLineDesc", headerName: "实际产线描述", width: 106 },
      { field: "CActualMachineDesc", headerName: "实际机台名称", width: 106 },
      { field: "DActualBegtime", headerName: "实际开始时间", width: 106 },
      { field: "DActualEndtime", headerName: "实际结束时间", width: 106 },
      { field: "DAccountDate", headerName: "账务日期", width: 80 },
      { field: "DTeamDate", headerName: "班次日期", width: 80 },
      { field: "CShift", headerName: "班次", width: 64 },
      { field: "CTeam", headerName: "班组", width: 64 },
]));
const cfCols = ref<ColDef[]>(bridge([
{ field: "CStove", headerName: "炉号", width: 64 },
      { field: "CGw", headerName: "工位", width: 64 },
      { field: "CSampleNo", headerName: "试样号", width: 67 },
      { field: "CAutoJudgeResult", headerName: "自动判定结果", width: 106 },
      { field: "CFinalFlag", headerName: "是否最终样", width: 93 },
      { field: "DLastTime", headerName: "判定时间", width: 80 },
      { field: "CJudgeRemark", headerName: "判定备注", width: 80 },
      { field: "CSgSign", headerName: "钢种", width: 64, hide: true },
      { field: "CLineCode", headerName: "产线", width: 64, hide: true },
      { field: "CSgStd", headerName: "执行标准", width: 80, hide: true },
      { field: "CSpec", headerName: "规格", width: 64, hide: true },
      { field: "NCount", headerName: "支数", width: 64, hide: true },
      { field: "NWeight", headerName: "重量", width: 64, hide: true },
      { field: "DTestTime", headerName: "结果录入时间", width: 106, hide: true },
]));
const gyydCols = ref<ColDef[]>(bridge([
{ field: "Info", headerName: "工艺要点信息", width: 106 },
      { field: "CClass", headerName: "分类代码", width: 80, hide: true },
      { field: "CClassDesc", headerName: "分类", width: 64, hide: true },
      { field: "CCode", headerName: "元素代码", width: 80, hide: true },
      { field: "CName", headerName: "元素名称", width: 80, hide: true },
      { field: "NSeq", headerName: "顺序号", width: 67, hide: true },
      { field: "NMinValue", headerName: "最小值", width: 67, hide: true },
      { field: "NInterval", headerName: "开闭区间", width: 80, hide: true },
      { field: "NMaxValue", headerName: "最大值", width: 67, hide: true },
      { field: "CTextValue", headerName: "文本值", width: 67, hide: true },
      { field: "PreviewDesc", headerName: "工艺说明", width: 80, hide: true },
]));


const inputRows = ref<any[]>([]);
const inputDetailRows = ref<any[]>([]);
const allowAutoRefreshInput = ref(false);
const inputCols = ref<ColDef[]>(bridge([
{ field: "RowNums", headerName: "行号", width: 64 },
      { field: "CSiloName", headerName: "料仓描述", width: 80 },
      { field: "CMtrlName", headerName: "物料描述", width: 80 },
      { field: "TotalWgt", headerName: "总投料量", width: 80 },
      { field: "CFeedingMtrlType", headerName: "投料物料种类", width: 106 },
      { field: "WgtByPLC", headerName: "采集投料量", width: 93 },
      { field: "WgtByManual", headerName: "人工投料量", width: 93 },
      { field: "CUnit", headerName: "单片钢坯", width: 80 },
      { field: "CMachineName", headerName: "机台名称", width: 80 },
      { field: "StoveNo", headerName: "炉号", width: 64, hide: true },
      { field: "PoNo", headerName: "制造命令号", width: 93, hide: true },
      { field: "WgtByPLCBak", headerName: "?", width: 64, hide: true },
      { field: "WgtByManualBak", headerName: "?", width: 64, hide: true },
      { field: "TotalWgtBak", headerName: "?", width: 64, hide: true },
      { field: "ModifyWgtPLC", headerName: "?", width: 64, hide: true },
      { field: "ModifyWgtManual", headerName: "?", width: 64, hide: true },
      { field: "ModifyWgtTotal", headerName: "?", width: 64, hide: true },
      { field: "dataAddTypeEnum", headerName: "?", width: 64, hide: true },
      { field: "Id", headerName: "主键", width: 64, hide: true },
      { field: "CSiloId", headerName: "料仓数据id", width: 87, hide: true },
      { field: "CFactoryCode", headerName: "工厂", width: 64, hide: true },
      { field: "CFactoryName", headerName: "工厂名称", width: 80, hide: true },
      { field: "CLineCode", headerName: "产线", width: 64, hide: true },
      { field: "CLineName", headerName: "产线名称", width: 80, hide: true },
      { field: "CProc", headerName: "工序", width: 64, hide: true },
      { field: "CProcName", headerName: "工序名称", width: 80, hide: true },
      { field: "CMachineCode", headerName: "机台编码", width: 80, hide: true },
      { field: "CMachineNameShort", headerName: "机台名称简称", width: 106, hide: true },
      { field: "CSiloCode", headerName: "料仓编码", width: 80, hide: true },
      { field: "CSiloGrp", headerName: "料仓分组", width: 80, hide: true },
      { field: "CSiloGrpIdx", headerName: "料仓分组序号", width: 106, hide: true },
      { field: "CSiloGrpIdxShow", headerName: "料仓分组展示序号", width: 132, hide: true },
      { field: "CSiloVolume", headerName: "料仓容量", width: 80, hide: true },
      { field: "CTimeMtrlUnique", headerName: "时刻物料唯一", width: 106, hide: true },
      { field: "CQuick", headerName: "快捷换料", width: 80, hide: true },
      { field: "CSiloBackup", headerName: "料仓备注", width: 80, hide: true },
      { field: "CMtrlCode", headerName: "物料编码", width: 80, hide: true },
      { field: "CMtrlNameEn", headerName: "物料英文名称", width: 106, hide: true },
      { field: "CStock", headerName: "关联库存", width: 80, hide: true },
      { field: "CType", headerName: "类型", width: 64, hide: true },
      { field: "CTypeNums", headerName: "时刻物料非唯一投料量", width: 158, hide: true },
      { field: "CAdjustType", headerName: "投料调整类型", width: 106, hide: true },
      { field: "CAdjustTypeNums", headerName: "投料调整量", width: 93, hide: true },
      { field: "CChangeTime", headerName: "换料时间", width: 80, hide: true },
      { field: "CNextTime", headerName: "下次换料时间", width: 106, hide: true },
      { field: "CEnable", headerName: "启用", width: 64, hide: true },
      { field: "CBackup", headerName: "备注", width: 64, hide: true },
      { field: "CTimestamp", headerName: "时间戳", width: 67, hide: true },
      { field: "Creator", headerName: "创建人", width: 67, hide: true },
      { field: "CreateTime", headerName: "创建时间", width: 80, hide: true },
      { field: "LastModifier", headerName: "最后修改人", width: 93, hide: true },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 106, hide: true },
      { field: "CSw01", headerName: "备用字段1", width: 87, hide: true },
      { field: "CSw02", headerName: "备用字段2", width: 87, hide: true },
      { field: "CSw03", headerName: "备用字段3", width: 87, hide: true },
      { field: "CSw04", headerName: "备用字段4", width: 87, hide: true },
      { field: "CSw05", headerName: "备用字段5", width: 87, hide: true },
      { field: "CSw06", headerName: "备用字段6", width: 87, hide: true },
      { field: "Selected", headerName: "选择", width: 64, hide: true },
]));
const inputDetailCols = ref<ColDef[]>(bridge([
{ field: "CMtrlType", headerName: "物料种类", width: 80 },
      { field: "CSiloName", headerName: "料仓描述", width: 80 },
      { field: "CMtrlName", headerName: "物料描述", width: 80 },
      { field: "CreateTime", headerName: "创建时间", width: 80 },
      { field: "NWgt", headerName: "坯重", width: 64 },
      { field: "CUnit", headerName: "单片钢坯", width: 80 },
      { field: "CDataAddType", headerName: "数据添加方式", width: 106 },
      { field: "CPotNo", headerName: "罐号", width: 64 },
      { field: "Creator", headerName: "创建人", width: 67 },
      { field: "Id", headerName: "主键", width: 64, hide: true },
      { field: "CGsId", headerName: "钢水id", width: 64, hide: true },
      { field: "CStoveNo", headerName: "炉号", width: 64, hide: true },
      { field: "CPono", headerName: "制造命令号", width: 93, hide: true },
      { field: "CRouteId", headerName: "炉次工艺路线及机台计划id", width: 178, hide: true },
      { field: "CFactoryCode", headerName: "工厂", width: 64, hide: true },
      { field: "CFactoryName", headerName: "工厂名称", width: 80, hide: true },
      { field: "CLineCode", headerName: "产线", width: 64, hide: true },
      { field: "CLineName", headerName: "产线名称", width: 80, hide: true },
      { field: "CProc", headerName: "工序", width: 64, hide: true },
      { field: "CProcName", headerName: "工序名称", width: 80, hide: true },
      { field: "CMachineCode", headerName: "机台编码", width: 80, hide: true },
      { field: "CMachineName", headerName: "机台名称", width: 80, hide: true },
      { field: "CMachineStationCode", headerName: "机台工位编码", width: 106, hide: true },
      { field: "CMachineStationDesc", headerName: "机台工位描述", width: 106, hide: true },
      { field: "CProcNumForQm", headerName: "工序次数", width: 80, hide: true },
      { field: "CSiloCode", headerName: "料仓编码", width: 80, hide: true },
      { field: "CTimeMtrlUnique", headerName: "时刻物料唯一", width: 106, hide: true },
      { field: "CQuick", headerName: "快捷换料", width: 80, hide: true },
      { field: "CTsId", headerName: "铁水数据id", width: 87, hide: true },
      { field: "CIronNo", headerName: "铁次号", width: 67, hide: true },
      { field: "NMainQm", headerName: "作为炉次铁水成分", width: 132, hide: true },
      { field: "CRefurnaceGsId", headerName: "回炉钢水id", width: 87, hide: true },
      { field: "CRefurnaceStoveNo", headerName: "回炉钢水炉次号", width: 119, hide: true },
      { field: "CRefurnacePono", headerName: "回炉钢水制造命令号", width: 145, hide: true },
      { field: "CMtrlCode", headerName: "物料编码", width: 80, hide: true },
      { field: "CStock", headerName: "关联库存", width: 80, hide: true },
      { field: "CType", headerName: "类型", width: 64, hide: true },
      { field: "CTypeNums", headerName: "时刻物料非唯一投料量", width: 158, hide: true },
      { field: "CAdjustType", headerName: "投料调整类型", width: 106, hide: true },
      { field: "CAdjustTypeNums", headerName: "投料调整量", width: 93, hide: true },
      { field: "NCollectWgt", headerName: "采集重量", width: 80, hide: true },
      { field: "CAllowTotal", headerName: "是否统计投料量", width: 119, hide: true },
      { field: "CBackup", headerName: "备注", width: 64, hide: true },
      { field: "CTimestamp", headerName: "时间戳", width: 67, hide: true },
      { field: "LastModifier", headerName: "最后修改人", width: 93, hide: true },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 106, hide: true },
      { field: "CSw01", headerName: "备用字段1", width: 87, hide: true },
      { field: "CSw02", headerName: "备用字段2", width: 87, hide: true },
      { field: "CSw03", headerName: "备用字段3", width: 87, hide: true },
      { field: "CSw04", headerName: "备用字段4", width: 87, hide: true },
      { field: "CSw05", headerName: "备用字段5", width: 87, hide: true },
      { field: "CSw06", headerName: "备用字段6", width: 87, hide: true },
      { field: "Selected", headerName: "选择", width: 64, hide: true },
]));
const inputApi = ref<GridApi | null>(null);
const inputDetailApi = ref<GridApi | null>(null);
function onInputReady(e: GridReadyEvent) { inputApi.value = e.api; }
function onInputDetailReady(e: GridReadyEvent) { inputDetailApi.value = e.api; }
async function refreshInput() {
  const tms = tms2010Of(focused.value);
  if (!tms) return;
  try {
    inputRows.value = (await uCMSStoveInputInfoApi.getStoveInputInfo(tms)) ?? [];
    await nextTick();
    inputApi.value?.autoSizeAllColumns();
  } catch { /* 拦截层已 toast */ }
}
async function onCellCommit() {
  const tms = tms2010Of(focused.value);
  if (!tms) return;
  try {
    await uCMSStoveInputInfoApi.saveStoveInputInfo({ tms2010: tms, datas: inputRows.value });
    toast("保存成功！", 2000, "success");
  } catch { /* 拦截层已 toast */ }
}
async function confirmAllInput() { await onCellCommit(); }


function pick(row: any | null, checkAllow: boolean) {
  if (!row) return null;
  if (checkAllow && row.allowEditInProcPage === false) {
    const err = row.tms2000_cStove ? `，炉次号为‘${row.tms2000_cStove}’` : "";
    toast(`禁止操作，所选的制造命令号为‘${row.tms2000_cPono}’${err}的炉次的前序工序还未结束，不允许进行此操作！`, 3000, "warn");
    return null;
  }
  return row;
}

function checkStoveState(row: any) {
  if (!row) return false;
  const st = String(row.tms2010_cStoveState ?? "");
  if (st === "Out" || st === "Done") {
    toast(`禁止操作，炉次‘${row.tms2000_cStove}’已出站！`, 2500, "warn");
    return false;
  }
  return true;
}

function paramDto() {
  if (!lineCode || !machineCode) {
    toast("禁止操作，产线和机台均不得为空！", 2500, "warn");
    return null;
  }
  return { lineCode, lineDesc: lineCode, machineCode, machineName: machineCode };
}

function tms2010Of(row: any) {
  if (!row) return null;
  return row._tms2010 ?? row.tms2010 ?? null;
}


async function showLastProcException() {
  const row = focused.value;
  if (!row) return;
  const st = String(row.tms2010_cStoveState ?? "");
  if (!st || st === "None") return;
  try {
    const need = await frmMS2100XMessageApi.checkIsNeedShowDialog({
      messageOperationTypeEnum: "OnlyShow",
      tms2010: tms2010Of(row),
    });
    if (!need) return;
    toast("上工序异常信息弹窗待接入", 2000, "warn");
  } catch { /* 拦截层已 toast */ }
}


async function loadAffiliated(mandatory = true) {
  const row = focused.value;
  try {
    const tms = tms2010Of(row);
    inputRows.value = tms ? (await uCMSStoveInputInfoApi.getStoveInputInfo(tms)) ?? [] : [];
  } catch { /* 拦截层已 toast */ }
  cfRows.value = [];
  try {
    gyydRows.value = row
      ? (await uCGYYDApi.getGYYDInfo({ machineCode, sgCode: row.tms2000_cSgCode, sgStd: row.tms2000_cSgStd })) ?? []
      : [];
  } catch { /* 拦截层已 toast */ }
  detailRows.value = row?.tms2010List_After ?? [];
  await loadBof(mandatory);
  try {
    await uCCustomPLCPointShowInfoApi.query({ lineCode, machineCode });
  } catch { /* 拦截层已 toast */ }

}


async function loadBof(mandatory = true) {
  if (!mandatory && !autoRefreshLf.value) return;
  const row = focused.value;
  try {
    if (!row) {
      Object.keys(bof).forEach((k) => delete bof[k]);
      return;
    }
    const id = row.tms2010_id ?? row.tms2010_Id;
    const data = (await frmMS2110LFFullApi.getTms2012LFData(id)) ?? {};
    Object.keys(bof).forEach((k) => delete bof[k]);
    Object.assign(bof, data);
  } catch { /* 拦截层已 toast */ }
}


async function onQuery(mandatory = true) {
  const dto = paramDto();
  if (!dto) return;
  querying.value = true;
  try {
    plans.value = (await frmMS2110LFFullApi.queryRoutePlans(dto)) ?? [];
    focused.value = plans.value[0] ?? null;
    await nextTick();
    planApi.value?.autoSizeAllColumns();
    await loadAffiliated(mandatory);
    await showLastProcException();
    if (mandatory) toast("查询执行完毕！", 1500, "success");
  } catch { /* 拦截层已 toast */ } finally {
    querying.value = false;
  }
}

async function onPlanRowClick(e: any) {
  focused.value = e.data ?? null;
  await loadAffiliated(true);
}

function onGridReady(e: GridReadyEvent) { planApi.value = e.api; }
function onDetailReady(e: GridReadyEvent) { detailApi.value = e.api; }
function onCfReady(e: GridReadyEvent) { cfApi.value = e.api; }
function onGyydReady(e: GridReadyEvent) { gyydApi.value = e.api; }

function placeholder(name: string) {
  toast(`${name}：二级弹窗待接入`, 2000, "warn");
}


async function onArrival() {
  if (!checkStoveState(focused.value)) return;
  const row = pick(focused.value, true);
  if (!row) return;
  try {
    await frmMS2110LFFullApi.checkStoveArrived(tms2010Of(row));
    const dto = paramDto();
    if (!dto) return;
    if (row.tms2010_cPlanMachineCode && row.tms2010_cPlanMachineCode !== machineCode) {
      if (!window.confirm(`炉次‘${row.tms2000_cStove}’的计划机台不是当前机台，是否继续？`)) return;
    }
    await frmMS2110LFFullApi.stoveArrived({ tms2010: tms2010Of(row), shiftInfoDto: null, operationModeEnum: "Custom" });
    await onQuery(true);
    await showLastProcException();
    toast("炉次到站执行成功", 2000, "success");
  } catch { /* 拦截层已 toast */ }
}

async function onArrivalCancel() {
  if (!checkStoveState(focused.value)) return;
  const row = pick(focused.value, true);
  if (!row) return;
  try {
    await frmMS2110LFFullApi.checkCancelStoveArrived(tms2010Of(row));
    if (!window.confirm(`确定对炉次号为‘${row.tms2000_cStove}’的炉次执行取消炉次到站操作？`)) return;
    await frmMS2110LFFullApi.cancelStoveArrived(tms2010Of(row));
    await onQuery(true);
    toast("取消到站执行成功", 2000, "success");
  } catch { /* 拦截层已 toast */ }
}

async function onOut() {
  if (!checkStoveState(focused.value)) return;
  const row = pick(focused.value, true);
  if (!row) return;
  try {
    await frmMS2110LFFullApi.checkStoveLeave(tms2010Of(row));
    if (!window.confirm(`确定对炉次号为‘${row.tms2000_cStove}’的炉次执行炉次出站操作？`)) return;
    await frmMS2110LFFullApi.stoveLeave({ tms2010: tms2010Of(row), operationModeEnum: "Custom" });
    await onQuery(true);
    await showLastProcException();
    toast("炉次出站执行成功", 2000, "success");
  } catch { /* 拦截层已 toast */ }
}

function onOutCancel() {
  placeholder("取消出钢");
}



async function onSave() {
  if (Object.keys(bof).length === 0) return;
  try {
    await frmMS2110LFFullApi.saveTms2012LFData({ ...bof });
    await loadBof(true);
    toast("保存成功！", 2000, "success");
  } catch { /* 拦截层已 toast */ }
}


let timer: ReturnType<typeof setInterval> | null = null;
function syncTimer() {
  if (timer) { clearInterval(timer); timer = null; }
  if (autoRefresh.value) {
    timer = setInterval(() => { void onQuery(false); }, 10000);
  }
}
onMounted(() => { syncTimer(); });
onBeforeUnmount(() => { if (timer) clearInterval(timer); });
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineCode" disabled class="w-20 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">机台</label>
      <InputText :model-value="machineCode" disabled class="w-24 shrink-0" />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery(true)"><IconSearch class="h-3 w-3" />查询</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onArrival">炉次到站</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onArrivalCancel">取消到站</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onOut">炉次出站</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onOutCancel">取消出站</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="placeholder('异常信息')">异常信息</Button>
      <span class="ml-auto flex shrink-0 items-center gap-1">
        <Checkbox v-model="autoRefresh" binary input-id="autoRefresh" @update:model-value="syncTimer" />
        <label for="autoRefresh" class="text-xs text-muted-foreground">自动刷新</label>
      </span>
    </div>


    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="50" :minSize="25" class="min-h-0 overflow-hidden">
        <Splitter layout="horizontal" class="h-full min-h-0">
          <SplitterPanel :size="70" :minSize="30" class="flex min-h-0 flex-col overflow-hidden">
            <Splitter layout="vertical" class="min-h-0 flex-1">
              <SplitterPanel :size="70" :minSize="30" class="flex min-h-0 flex-col overflow-hidden">
                <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
                  <span class="text-xs font-medium text-muted-foreground">炉次计划</span>
                </div>
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="planCols" :row-data="plans"
                    :pagination="false" :loading="querying"
                    :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                    @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" @row-clicked="onPlanRowClick" />
                </div>
                <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
                  <span class="text-xs font-medium text-muted-foreground">炉次后序工艺路线计划</span>
                </div>
                <div class="h-32 shrink-0 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="detailCols" :row-data="detailRows"
                    :pagination="false" @grid-ready="onDetailReady" @first-data-rendered="autoSizeOnFirstData" />
                </div>
              </SplitterPanel>
              <SplitterPanel :size="30" :minSize="15" class="flex min-h-0 flex-col overflow-hidden">
                <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
                  <span class="text-xs font-medium text-muted-foreground">成分信息</span>
                </div>
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="cfCols" :row-data="cfRows"
                    :pagination="false" @grid-ready="onCfReady" @first-data-rendered="autoSizeOnFirstData" />
                </div>
              </SplitterPanel>
            </Splitter>
          </SplitterPanel>
          <SplitterPanel :size="30" :minSize="15" class="flex min-h-0 flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">工艺要点</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="gyydCols" :row-data="gyydRows"
                :pagination="false" @grid-ready="onGyydReady" @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>

      <SplitterPanel :size="50" :minSize="25" class="min-h-0 overflow-hidden">
        <Splitter layout="horizontal" class="h-full min-h-0">

          <SplitterPanel :size="30" :minSize="15" class="flex min-h-0 flex-col overflow-hidden">
            <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
              <Button text class="shrink-0 whitespace-nowrap" @click="refreshInput">刷新耗用</Button>
              <Button text class="shrink-0 whitespace-nowrap" @click="confirmAllInput">全部确认</Button>
              <Button text class="shrink-0 whitespace-nowrap" @click="refreshInput">刷新明细</Button>
              <span class="ml-auto text-xs font-medium text-muted-foreground">冶炼投料信息</span>
            </div>
            <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
              <span class="text-xs text-muted-foreground">炉次号：{{ focused?.tms2010_cStoveNo ?? focused?.tms2000_cStove ?? "" }}</span>
              <span class="text-xs text-muted-foreground">制造命令号：{{ focused?.tms2000_cPono ?? "" }}</span>
              <Checkbox v-model="allowAutoRefreshInput" binary input-id="allowAutoRefreshInput" />
              <label for="allowAutoRefreshInput" class="text-xs text-muted-foreground">自动刷新</label>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="inputCols" :row-data="inputRows"
                :pagination="false" @grid-ready="onInputReady" @first-data-rendered="autoSizeOnFirstData"
                @cell-value-changed="onCellCommit" />
            </div>
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">投料明细</span>
            </div>
            <div class="h-36 shrink-0 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="inputDetailCols" :row-data="inputDetailRows"
                :pagination="false" @grid-ready="onInputDetailReady" @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>

          <SplitterPanel :size="45" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
            <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
              <Checkbox v-model="autoRefreshLf" binary input-id="autoRefreshBof" />
              <label for="autoRefreshBof" class="text-xs text-muted-foreground">自动刷新运转数据</label>
              <span class="ml-auto text-xs font-medium text-muted-foreground">生产实绩信息</span>
              <Button text class="shrink-0 whitespace-nowrap" @click="onSave">保存</Button>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto">
              <div class="grid grid-cols-4 gap-x-3 gap-y-1.5 p-2">
                <template v-for="f in formFields" :key="f.k">
                  <label class="text-xs text-muted-foreground">{{ f.t }}</label>
                  <DatePicker v-if="f.m === 'd'" v-model="bof[f.k]" :manual-input="false" date-format="yy-mm-dd" show-time hour-format="24" show-icon class="w-full" />
                  <Textarea v-else-if="f.m === 'm'" v-model="bof[f.k]" :rows="2" class="w-full" />
                  <Checkbox v-else-if="f.m === 'c'" v-model="bof[f.k]" binary :input-id="'f_' + f.k" />
                  <Select v-else-if="f.m === 's'" v-model="bof[f.k]" :options="ynOptions" option-label="label" option-value="value" class="w-full" />
                  <div v-else-if="f.m === 'i' || f.m === 'g'" class="w-full">
                    <InputNumber v-model="bof[f.k]" :min-fraction-digits="0" :max-fraction-digits="f.m === 'i' ? 0 : 6" fluid class="w-full" />
                  </div>
                  <InputText v-else v-model="bof[f.k]" class="w-full" />
                </template>
              </div>
            </div>
          </SplitterPanel>
          <SplitterPanel :size="25" :minSize="12" class="flex min-h-0 flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">机台实时运行信息</span>
            </div>
            <div class="min-h-0 flex-1 p-2">
              <p class="text-xs text-muted-foreground">PLC 点位信息展示区（已接入 uCCustomPLCPointShowInfoApi.query）</p>
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
