<script setup lang="ts">
/** 对应 FrmMS2142（连铸产出（含自动添加/更新规格），多菜单共享 cQueryString={LineCode,MachineCode}）：DDH.Winforms.SMS.Forms.FrmMS2142
 *  已接入：publicKVApi.getMSLZLiu（流号下拉） / frmMS2142Api.getSgCodeSimpDatas（钢种代码下拉）
 *          frmMS2140Api.queryRoutePlans（炉次计划）/ getOutInfo（产出刷新）/ addPiece / removePiece / checkUpdatePieceInfo
 *          frmMS2141Api.queryOrderInfo（提料单计划，内存按订单状态过滤）
 *          tms9001Api.mathPlanAndZp（匹配）/ cancelMathPlanAndZp（取消匹配）
 *          frmMS2142Api.autoAddStoveOutInfo（自动添加件次）/ checkUpdatePieceSizeInfo + updatePieceSizeInfo（更新规格）
 *          systemKeyValueApi.querySysKvItemList（取消原因 / 异常坯类型 / 一厂断面规格字典）
 *  cQueryString：{LineCode,MachineCode} —— LG01 走断面规格下拉并隐藏厚宽；LG02 走厚/宽/长 SpinEdit 并隐藏断面/单重
 *  分栏（照 Designer 的 Dock + Location.Y 顺序）：stackPanel1 查询
 *      → panelControl2（groupBox1 炉次计划 641 | splitterControl2 | groupBox2 提料单信息 748，左右并排）
 *      → splitterControl1（上下可拖，310:437）→ dataLayoutControl1 录入参数 → stackPanel4 按钮 → panelControl1(gridControl2 产出材料, Fill)
 *      —— stackPanel2（dropDownButton1「头/尾/异常坯设置」+ labelControl1「占位控件」）Designer 里 Visible=false，不渲染
 *  列集：gridView1 炉次 23+100 / gridView2 产出 41+21 / gvPlan 提料单 24+6
 *  待接入：二级弹窗占位（班次 ShiftInfo、坯料修改窗、机台工位）；
 *          tms3000Api.setException/cancelException swagger 未生成（标记/取消异常坯暂不可用）；
 *          StorageMatchPlanRule 前端规则校验未迁（依赖 Hmx widget 规则库，交后端 mathPlan 校验）；
 *          断面规格字典 A0000:MS_LG01_LZ_SPEC_VALUE 按 LineCode=LG01 时灌注 */
import { onMounted, reactive, ref, shallowRef, nextTick } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
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

import { publicKVApi, frmMS2140Api, frmMS2141Api, tms9001Api, frmMS2142Api } from "@/api/mes4ddh/sms.swagger";
import { systemKeyValueApi } from "@/api/admin/request";

const { json: menuJson } = useMenuQuery();
const { toast } = useToast();
const qs = menuJson as { LineCode?: string; MachineCode?: string };
const lineCode = qs.LineCode ?? "";
const machineCode = qs.MachineCode ?? "";
const isLg01 = lineCode === "LG01";

const theme = makeHmxGridTheme();
const querying = ref(false);
const planApi = ref<GridApi | null>(null);
const outApi = ref<GridApi | null>(null);
const orderApi = ref<GridApi | null>(null);

const plans = ref<any[]>([]);
const outs = ref<any[]>([]);
const orders = ref<any[]>([]);
const focusedPlan = shallowRef<any | null>(null);
const focusedOrder = shallowRef<any | null>(null);

const liuOptions = ref<{ label: string; value: string }[]>([]);
const statusOptions = [
  { label: "全部", value: null },
  { label: "未完成", value: "N" },
  { label: "已完成", value: "Y" },
];
const specOptions = ref<{ label: string; value: string }[]>([]);
const sgCodeOptions = ref<{ label: string; value: string }[]>([]);
const sgCodeList = ref<any[]>([]);

function day(offset: number) {
  const t = new Date();
  t.setDate(t.getDate() + offset);
  return t;
}

const q = reactive({
  stoveNo: "",
  dtS: day(-8),
  dtE: day(7),
  gz: "",
  status: null as string | null,
});

const f = reactive({
  liu: "",
  nums: 1,
  nThick: 263,
  nWth: 2230,
  nLen: 6000,
  proRemark: "",
  spec: "",
  lenWgt: 0,
  sgCodeSimp: "",
});

const planCols = ref<ColDef[]>(
  bridge([
    { field: "tms2000_CStove", headerName: "炉号", width: 64 },
    { field: "tms2000_CPono", headerName: "制造命令号", width: 93 },
    { field: "tms2000_CSgCode", headerName: "钢种", width: 64 },
    { field: "tms2000_COrderNo", headerName: "订单号", width: 67 },
    { field: "tms2010_CStoveState", headerName: "工序炉次状态", width: 106 },
    { field: "tms2000_CSgStd", headerName: "执行标准", width: 80 },
    { field: "tms2000_CSpec", headerName: "规格", width: 64 },
    { field: "tms2000_CPlanTime", headerName: "计划日期", width: 80 },
    { field: "tms2000_NThick", headerName: "厚度", width: 64 },
    { field: "tms2000_NWidth", headerName: "宽度", width: 64 },
    { field: "tms2000_NLen", headerName: "长度", width: 64 },
    { field: "tms2000_CTsyq", headerName: "特殊要求", width: 80 },
    { field: "tms2000_CRemark", headerName: "备注", width: 64 },
    { field: "tms2000_CStoveLocation", headerName: "最新炉次位置", width: 106 },
    { field: "tms2000_CStoveState", headerName: "最新炉次状态", width: 106 },
    { field: "tms2010_DPlanBegtime", headerName: "计划工序开始时间", width: 132 },
    { field: "tms2010_DPlanEndtime", headerName: "计划工序结束时间", width: 132 },
    { field: "tms2010_DActualBegtime", headerName: "实际工序开始时间", width: 132 },
    { field: "tms2010_DActualEndtime", headerName: "实际工序结束时间", width: 132 },
    { field: "tms2010_DAccountDate", headerName: "账务日期", width: 80 },
    { field: "tms2010_DTeamDate", headerName: "班次日期", width: 80 },
    { field: "tms2010_CShift", headerName: "班次", width: 64 },
    { field: "tms2010_CTeam", headerName: "班组", width: 64 },
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
    { field: "tms2000_CStoveLocationStation", headerName: "最新炉次工位", width: 106, hide: true },
    { field: "tms2000_CStovePlanId", headerName: "最新炉次计划工序机台id", width: 165, hide: true },
    { field: "tms2000_CToCurrentStoveSplitMergeType", headerName: "生成当前炉次的拆合类型", width: 171, hide: true },
    {
      field: "tms2000_CToCurrentStoveSplitMergeTypeSign",
      headerName: "生成当前炉次的拆合类型标识",
      width: 197,
      hide: true,
    },
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
    { field: "tms2010_CPlanMachineDesc", headerName: "计划工序机台名称", width: 132, hide: true },
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
    { field: "tms2010_CActualMachineStationDesc", headerName: "实际机台工位描述", width: 132, hide: true },
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
  ]),
);
const outCols = ref<ColDef[]>(
  bridge([
    { field: "Selected", headerName: "选择", width: 64 },
    { field: "CStove", headerName: "炉号", width: 64 },
    { field: "CPono", headerName: "制造命令号", width: 93 },
    { field: "CStrandNo", headerName: "流号", width: 64 },
    { field: "CPieceNo", headerName: "头侧件次号", width: 93 },
    { field: "CPrintCode", headerName: "喷号", width: 64 },
    { field: "CSgCode", headerName: "钢种", width: 64 },
    { field: "CSgStd", headerName: "执行标准", width: 80 },
    { field: "COrderNo", headerName: "订单号", width: 67 },
    { field: "CProRemark", headerName: "生产备注", width: 80 },
    { field: "NStatus", headerName: "处理标记", width: 80 },
    { field: "NThick", headerName: "坯厚", width: 64 },
    { field: "NWth", headerName: "宽度", width: 64 },
    { field: "NLen", headerName: "坯长", width: 64 },
    { field: "NNum", headerName: "提货件数", width: 80 },
    { field: "NCalWgt", headerName: "理重", width: 64 },
    { field: "NWgt", headerName: "坯重", width: 64 },
    { field: "CShiftNo", headerName: "结果录入班次", width: 106 },
    { field: "CGroupNo", headerName: "结果录入班组", width: 106 },
    { field: "DProTime", headerName: "产出时间", width: 80 },
    { field: "CConfirmStatus", headerName: "确认判定状态", width: 106 },
    { field: "CMsc", headerName: "冶金规范码", width: 93 },
    { field: "CMscLine", headerName: "冶金规范产线", width: 106 },
    { field: "CStNo", headerName: "制造标准号", width: 93 },
    { field: "CPieceNoQd", headerName: "钢坯切断件次号", width: 119 },
    { field: "CBilletTypeCode", headerName: "铸坯标识", width: 80 },
    { field: "CSurfaceResult", headerName: "表检结果", width: 80 },
    { field: "DSurfaceTime", headerName: "表面判定时间", width: 106 },
    { field: "CSurfaceUser", headerName: "表面判定人", width: 93 },
    { field: "CSurfaceRemark", headerName: "缺陷描述", width: 80 },
    { field: "CSurfaceAdvice", headerName: "表检处置意见", width: 106 },
    { field: "DConfirmTime", headerName: "成分确认时间", width: 106 },
    { field: "CConfirmUser", headerName: "成分确认人", width: 93 },
    { field: "CPcResult", headerName: "理化结果", width: 80 },
    { field: "DPcTime", headerName: "理化判定时间", width: 106 },
    { field: "CPcUser", headerName: "理化判定人", width: 93 },
    { field: "CPcRemark", headerName: "理化判定备注", width: 106 },
    { field: "NQmStatus", headerName: "质量状态", width: 80 },
    { field: "CDestination", headerName: "去向", width: 64 },
    { field: "CSampleLotNo", headerName: "试批号", width: 67 },
    { field: "NCastDivCode", headerName: "模连铸标识", width: 93 },
    { field: "Id", headerName: "主键", width: 64, hide: true },
    { field: "Creator", headerName: "创建人", width: 67, hide: true },
    { field: "CreateTime", headerName: "创建时间", width: 80, hide: true },
    { field: "LastModifier", headerName: "最后修改人", width: 93, hide: true },
    { field: "LastModifyTime", headerName: "最后修改时间", width: 106, hide: true },
    { field: "CFactoryId", headerName: "工厂编码", width: 80, hide: true },
    { field: "CLineCode", headerName: "产线", width: 64, hide: true },
    { field: "CMachine", headerName: "炉台号", width: 67, hide: true },
    { field: "CPlanId", headerName: "计划ID", width: 64, hide: true },
    { field: "CConNo", headerName: "合同号", width: 67, hide: true },
    { field: "CMatCode", headerName: "物料编码", width: 80, hide: true },
    { field: "CSpec", headerName: "规格", width: 64, hide: true },
    { field: "CStoreCode", headerName: "库区号", width: 67, hide: true },
    { field: "CStackNo", headerName: "垛位号", width: 67, hide: true },
    { field: "CStackNum", headerName: "层号", width: 64, hide: true },
    { field: "CIsHot", headerName: "是否热送", width: 80, hide: true },
    { field: "CSteelType", headerName: "钢种大类", width: 80, hide: true },
    { field: "CShiftNoSj", headerName: "炉次实绩班次", width: 106, hide: true },
    { field: "CGroupNoSj", headerName: "炉次实绩班组", width: 106, hide: true },
    { field: "CQmHandleDesc", headerName: "处置注释", width: 80, hide: true },
    { field: "CRouteCode", headerName: "精炼路径", width: 80, hide: true },
  ]),
);
const orderCols = ref<ColDef[]>(
  bridge([
    { field: "PlanNo", headerName: "计划号", width: 67 },
    { field: "PlanTime", headerName: "计划号", width: 67 },
    { field: "CSgCodeTl", headerName: "炼钢钢种", width: 80 },
    { field: "SgStd", headerName: "标准", width: 64 },
    { field: "Thick", headerName: "厚度", width: 64 },
    { field: "Width", headerName: "宽度", width: 64 },
    { field: "LengthMin", headerName: "最小长度", width: 80 },
    { field: "NumStr", headerName: "匹配情况", width: 80 },
    { field: "Percent", headerName: "完成率", width: 67 },
    { field: "NNum", headerName: "提货件数", width: 80 },
    { field: "NNeedNum", headerName: "需求块数", width: 80 },
    { field: "NPlanNum", headerName: "计划件数", width: 80 },
    { field: "NStorageNum", headerName: "已挂坯支数", width: 93 },
    { field: "ZZThick", headerName: "轧制厚度", width: 80 },
    { field: "ZZWidth", headerName: "轧制宽度", width: 80 },
    { field: "CTrimFlag", headerName: "切边方式", width: 80 },
    { field: "CSaleOrderNo1", headerName: "订单1", width: 64 },
    { field: "CSaleOrderNo2", headerName: "订单2", width: 64 },
    { field: "CSaleOrderNo3", headerName: "订单3", width: 64 },
    { field: "CSaleOrderNo4", headerName: "订单4", width: 64 },
    { field: "NLenPlan1", headerName: "套切长度1", width: 87 },
    { field: "NLenPlan2", headerName: "套切长度2", width: 87 },
    { field: "NLenPlan3", headerName: "套切长度3", width: 87 },
    { field: "NLenPlan4", headerName: "套切长度4", width: 87 },
    { field: "SgCode", headerName: "钢种", width: 64, hide: true },
    { field: "NOrder", headerName: "消息排序号", width: 93, hide: true },
    { field: "NStatus", headerName: "处理标记", width: 80, hide: true },
    { field: "CSteelType", headerName: "钢种大类", width: 80, hide: true },
    { field: "CSaleOrderNo", headerName: "?", width: 64, hide: true },
    { field: "NLenPlan", headerName: "轧制长度", width: 80, hide: true },
  ]),
);

function onPlanReady(e: GridReadyEvent) {
  planApi.value = e.api;
}
function onOutReady(e: GridReadyEvent) {
  outApi.value = e.api;
}
function onOrderReady(e: GridReadyEvent) {
  orderApi.value = e.api;
}

function paramDto() {
  if (!lineCode || !machineCode) {
    toast("禁止操作，产线和机台均不得为空！", 2500, "warn");
    return null;
  }
  return { lineCode, lineDesc: lineCode, machineCode, machineName: machineCode, stoveNo: q.stoveNo || undefined };
}
function orderParamDto() {
  const dto = paramDto();
  if (!dto) return null;
  return { ...dto, dTimeStart: q.dtS, dTimeEnd: q.dtE, cSgCode: q.gz || undefined };
}

async function queryOrders() {
  const dto = orderParamDto();
  if (!dto) return;
  try {
    const list = (await frmMS2141Api.queryOrderInfo(dto)) ?? [];
    const status = q.status;
    orders.value = list.filter((x: any) =>
      status === "Y" ? x.isFullMatch === true : status === "N" ? x.isFullMatch !== true : true,
    );
    await nextTick();
    orderApi.value?.autoSizeAllColumns();
  } catch {
    /* 拦截层已 toast */
  }
}

async function loadOut() {
  const row = focusedPlan.value;
  if (!row) {
    outs.value = [];
    return;
  }
  try {
    const stove = row.tms2000_cStove ?? row.tms2000_CStove;
    outs.value = (await frmMS2140Api.getOutInfo(stove)) ?? [];
    await nextTick();
    outApi.value?.autoSizeAllColumns();
  } catch {
    /* 拦截层已 toast */
  }
}

function updateSizeInfo() {
  const row = focusedPlan.value;
  if (!row) {
    f.nThick = 263;
    f.nWth = 2230;
    f.nLen = 6000;
    f.proRemark = "";
    return;
  }
  f.nThick = row.tms2000_nThick ?? 263;
  f.nWth = row.tms2000_nWidth ?? 2230;
  if (lineCode === "LG02") f.nLen = row.tms2000_nLen ?? 6000;
  f.proRemark = "";
}

async function onQuery() {
  const dto = paramDto();
  if (!dto) return;
  querying.value = true;
  try {
    plans.value = (await frmMS2140Api.queryRoutePlans(dto)) ?? [];
    focusedPlan.value = plans.value[0] ?? null;
    updateSizeInfo();
    await nextTick();
    planApi.value?.autoSizeAllColumns();
    await queryOrders();
    await loadOut();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

async function onPlanClick(e: any) {
  focusedPlan.value = e.data ?? null;
  updateSizeInfo();
  await loadOut();
}

function selectedOuts(needUnmatched: boolean) {
  const sel = outs.value.filter((r: any) => r.selected === true || r.Selected === true);
  if (!needUnmatched) return sel;
  return sel.filter((r: any) => !r.cOrderNo && !r.COrderNo);
}

async function onRefresh() {
  try {
    await loadOut();
  } catch {
    /* 拦截层已 toast */
  }
}

async function onAdd() {
  const row = focusedPlan.value;
  if (!row) return;
  if (!f.liu) {
    toast("禁止操作，流号不得为空！", 2500, "warn");
    return;
  }
  if (lineCode === "LG01" && !(f.lenWgt > 0)) {
    toast("禁止操作，米单重不得小于或等于0！", 2500, "warn");
    return;
  }
  const thick = lineCode === "LG02" ? f.nThick : parseInt(String(f.spec || "0"), 10) || 0;
  const wth = lineCode === "LG02" ? f.nWth : parseInt(String(f.spec || "0"), 10) || 0;
  const liuLabel = liuOptions.value.find((o) => o.value === f.liu)?.label ?? f.liu;
  try {
    await frmMS2140Api.addPiece({
      routePlan: row,
      shiftInfoDto: null,
      liuHao: f.liu,
      liuHao_Alpha: liuLabel,
      nums: f.nums,
      nThick: thick,
      nWth: wth,
      nLen: f.nLen,
      proRemark: f.proRemark,
      lineCode,
      nLenWgt: f.lenWgt,
      sgCodeSimp: f.sgCodeSimp || undefined,
    });
    await loadOut();
    await queryOrders();
    f.nums = 1;
    toast("添加件次成功", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

async function onRemove() {
  const row = focusedPlan.value;
  if (!row) return;
  if (outs.value.length === 0) return;
  if (outs.value.length < f.nums) {
    toast("删除件数不能大于现有件数！", 2500, "warn");
    return;
  }
  const liuLabel = liuOptions.value.find((o) => o.value === f.liu)?.label ?? f.liu;
  const ok = window.confirm(
    `确定删除一件炉次‘${row.tms2000_cStove}’‘${liuLabel}’流的产出？\n说明：该操作会删除${f.nums}件最新添加的炉次铸坯！`,
  );
  if (!ok) return;
  try {
    await frmMS2140Api.removePiece({ routePlanInfo: row, liu: liuLabel, nums: f.nums });
    await loadOut();
    await queryOrders();
    f.nums = 1;
    toast("删除件次成功", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

async function onMatch(isAllow: boolean) {
  const storages = selectedOuts(true);
  if (storages.length === 0) {
    toast("请选择未匹配的材料", 2500, "warn");
    return;
  }
  const planItem = focusedOrder.value;
  if (!planItem) {
    toast("请选择计划后再操作", 2500, "warn");
    return;
  }
  const count = planItem.nNum ?? planItem.NNum ?? 0;
  const planNum = planItem.nPlanNum ?? planItem.NPlanNum ?? 0;
  const storageNum = planItem.nStorageNum ?? planItem.NStorageNum ?? 0;
  if (count + storages.length > planNum - storageNum) {
    toast(`已超量${count + storages.length}/${planNum - storageNum}，不允许操作`, 3000, "warn");
    return;
  }
  const desc = `${planItem.planNo ?? ""}/${planItem.csGCodeTl ?? ""}/${planItem.thick ?? ""}×${planItem.width ?? ""}`;
  if (!window.confirm(`确认匹配计划？数量${storages.length}\n${desc}`)) return;
  try {
    await tms9001Api.mathPlanAndZp({
      pieceNos: storages.map((s: any) => s.cPieceNo ?? s.CPieceNo),
      matchPlanId: planItem.id ?? planItem.Id,
      isAllow,
    });
    await queryOrders();
    await loadOut();
    toast("匹配成功", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

async function onCancelMatch() {
  const storages = outs.value.filter(
    (r: any) => (r.selected === true || r.Selected === true) && (r.cOrderNo || r.COrderNo),
  );
  if (storages.length === 0) {
    toast("请选择已匹配的材料", 2500, "warn");
    return;
  }
  if (storages.some((r: any) => ["ConsumeLocked", "Consume"].includes(String(r.nStatus ?? r.NStatus ?? "")))) {
    toast("已投料生产，不允许操作", 2500, "warn");
    return;
  }
  const reason = window.prompt(`取消${storages.length}支,请选择取消原因`, "");
  if (reason == null) return;
  if (!reason.trim()) {
    toast("请选择取消原因", 2000, "warn");
    return;
  }
  try {
    await tms9001Api.cancelMathPlanAndZp({
      pieceNos: storages.map((s: any) => s.cPieceNo ?? s.CPieceNo),
      reason: reason.trim(),
    });
    await queryOrders();
    await loadOut();
    toast("取消匹配成功", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

async function onSetExp() {
  const storages = selectedOuts(false);
  if (storages.length === 0) {
    toast("请选择后再操作", 2500, "warn");
    return;
  }
  if (storages.some((r: any) => ["ConsumeLocked", "Consume"].includes(String(r.nStatus ?? r.NStatus ?? "")))) {
    toast("已投料生产，不允许操作", 2500, "warn");
    return;
  }
  if (storages.some((r: any) => r.cOrderNo || r.COrderNo)) {
    toast("已匹配订单，不允许操作", 2500, "warn");
    return;
  }
  let arr: string[] = [];
  try {
    const list = (await systemKeyValueApi.querySysKvItemList("A0000:SLAB_EXCEPTION")) ?? [];
    arr = list.map((w) => w.cCode ?? "").filter(Boolean);
  } catch {
    /* 拦截层已 toast */
  }
  const v = window.prompt(`指定异常坯（可选：${arr.join(" / ")}`, "");
  if (v == null) return;
  if (!v.trim()) {
    toast("请选择异常坯类型后再确认", 2500, "warn");
    return;
  }
  toast("标记异常坯：tms3000Api.setException swagger 未生成，待接入", 3000, "warn");
  await queryOrders();
  await loadOut();
}

async function onCancelSetExp() {
  const storages = selectedOuts(false);
  if (storages.length === 0) {
    toast("请选择后再操作", 2500, "warn");
    return;
  }
  if (storages.some((r: any) => !(r.cOrderNo || r.COrderNo))) {
    toast("请选择异常坯后再操作", 2500, "warn");
    return;
  }
  if (storages.some((r: any) => ["ConsumeLocked", "Consume"].includes(String(r.nStatus ?? r.NStatus ?? "")))) {
    toast("已投料生产，不允许操作", 2500, "warn");
    return;
  }
  if (storages.some((r: any) => r.cOrderNo || r.COrderNo)) {
    toast("已匹配订单，不允许操作", 2500, "warn");
    return;
  }
  if (!window.confirm("确认取消？")) return;
  toast("取消异常坯：tms3000Api.cancelException swagger 未生成，待接入", 3000, "warn");
  await queryOrders();
  await loadOut();
}

async function onUpdatePiece() {
  const storages = selectedOuts(false);
  if (storages.length === 0) {
    toast("请选择要修改的的材料", 2500, "warn");
    return;
  }
  if (!window.confirm("坯料已挂单，修改定尺后系统自动脱挂订单，确认继续操作？\n修改其他不受影响")) return;
  try {
    for (const s of storages) {
      await frmMS2140Api.checkUpdatePieceInfo(s);
    }
    toast("坯料修改二级弹窗待接入", 2500, "warn");
  } catch {
    /* 拦截层已 toast */
  }
}

async function onAutoAdd() {
  const row = focusedPlan.value;
  if (!row) return;
  const ok = window.confirm(
    `确定按照\n厚度：${f.nThick}，\n宽度：${f.nWth}，\n长度：${f.nLen}\n自动添加炉次‘${row.tms2000_cStove}’的产出信息？`,
  );
  if (!ok) return;
  const thick = lineCode === "LG02" ? f.nThick : parseInt(String(f.spec || "0"), 10) || 0;
  const wth = lineCode === "LG02" ? f.nWth : parseInt(String(f.spec || "0"), 10) || 0;
  const liuLabel = liuOptions.value.find((o) => o.value === f.liu)?.label ?? f.liu;
  try {
    await frmMS2142Api.autoAddStoveOutInfo({
      routePlan: row,
      shiftInfoDto: null,
      liuHao: f.liu,
      liuHao_Alpha: liuLabel,
      nums: f.nums,
      nThick: thick,
      nWth: wth,
      nLen: f.nLen,
      proRemark: f.proRemark,
      lineCode,
      nLenWgt: f.lenWgt,
      sgCodeSimp: f.sgCodeSimp || undefined,
    });
    await queryOrders();
    await loadOut();
    toast("自动添加件次成功", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

async function onUpdateSize() {
  const sel = outs.value.filter((r: any) => r.selected === true || r.Selected === true);
  if (sel.length === 0) {
    toast("请选择要修改的的材料", 2500, "warn");
    return;
  }
  const hasOrder = sel.some((x: any) => x.cOrderNo || x.COrderNo);
  let str = `确定将所选的炉次产出件次的尺寸信息更新为：\n厚度：${f.nThick}，\n宽度：${f.nWth}，\n长度：${f.nLen} ?`;
  if (hasOrder) {
    str = `${str}\n且存在已挂单坯料，修改规格后系统自动脱挂订单，确认继续操作？\n修改其他不受影响`;
  }
  if (!window.confirm(str)) return;
  const dtos = sel.map((x: any) => ({
    cPieceNo: x.cPieceNo ?? x.CPieceNo,
    cPrintCode: x.cPrintCode ?? x.CPrintCode,
    nLen: x.nLen ?? x.NLen,
    nWth: x.nWth ?? x.NWth,
    nThick: x.nThick ?? x.NThick,
    cProRemark: x.cProRemark ?? x.CProRemark,
  }));
  try {
    await frmMS2142Api.checkUpdatePieceSizeInfo(dtos);
    await frmMS2142Api.updatePieceSizeInfo(dtos);
    await queryOrders();
    await loadOut();
    toast("更新规格成功", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(async () => {
  try {
    const liu = (await publicKVApi.getMSLZLiu(machineCode)) ?? [];
    liuOptions.value = (Array.isArray(liu) ? liu : []).map((x: any) => ({
      label: x.cDesc ?? x.CDesc ?? x.cValue ?? x.CValue ?? "",
      value: x.cValue ?? x.CValue ?? "",
    }));
    if (liuOptions.value.length) f.liu = liuOptions.value[0].value;
  } catch {
    /* 拦截层已 toast */
  }
  if (isLg01) {
    try {
      const range = (await systemKeyValueApi.querySysKvItemList("A0000:MS_LG01_LZ_SPEC_VALUE")) ?? [];
      specOptions.value = range.map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
      if (specOptions.value.length) f.spec = specOptions.value[0].value;
    } catch {
      /* 拦截层已 toast */
    }
  }
  try {
    sgCodeList.value = (await frmMS2142Api.getSgCodeSimpDatas()) ?? [];
    sgCodeOptions.value = [...new Set(sgCodeList.value.map((x: any) => x.cCode).filter(Boolean))]
      .sort()
      .map((c: string) => ({ label: c, value: c }));
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 顶栏（原 stackPanel1） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineCode" disabled class="w-16 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">机台</label>
      <InputText :model-value="machineCode" disabled class="w-20 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">炉次号</label>
      <InputText v-model="q.stoveNo" class="w-28 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">销售下发时间</label>
      <DatePicker v-model="q.dtS" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">~</label>
      <DatePicker v-model="q.dtE" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">提料钢种</label>
      <InputText v-model="q.gz" class="w-24 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">订单状态</label>
      <Select
        v-model="q.status"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        show-clear
        class="w-24 shrink-0"
      />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery"
        ><IconSearch class="h-3 w-3" />查询</Button
      >
    </div>

    <!-- 原 stackPanel2（含 dropDownButton1「头/尾/异常坯设置」）Designer 里 Visible=false，整条不渲染 -->

    <!-- 原 splitterControl1：上=panelControl2（炉次计划 | 提料单信息，310/834）；下=录入参数 + 按钮 + 产出材料 -->
    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="42" :minSize="18" class="min-h-0 overflow-hidden">
        <!-- 原 panelControl2：groupBox1 左 641 / splitterControl2 / groupBox2 右 748 -->
        <Splitter layout="horizontal" class="h-full min-h-0">
          <SplitterPanel :size="46" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">炉次计划</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="planCols"
                :row-data="plans"
                :pagination="false"
                :loading="querying"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                @grid-ready="onPlanReady"
                @first-data-rendered="autoSizeOnFirstData"
                @row-clicked="onPlanClick"
              />
            </div>
          </SplitterPanel>

          <SplitterPanel :size="54" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">提料单信息</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="orderCols"
                :row-data="orders"
                :pagination="false"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                @grid-ready="onOrderReady"
                @first-data-rendered="autoSizeOnFirstData"
                @row-clicked="(e: any) => (focusedOrder = e.data)"
              />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>

      <SplitterPanel :size="58" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <!-- 录入参数（原 dataLayoutControl1） -->
        <div class="flex h-9 shrink-0 items-center gap-2 overflow-x-auto border-b border-border/60 px-2">
          <label class="shrink-0 text-xs text-muted-foreground">流号</label>
          <Select
            v-model="f.liu"
            :options="liuOptions"
            option-label="label"
            option-value="value"
            class="w-24 shrink-0"
          />
          <label class="shrink-0 text-xs text-muted-foreground">添加/删除件次数量</label>
          <div class="w-24 shrink-0">
            <InputNumber v-model="f.nums" :min="1" :show-buttons="false" fluid />
          </div>
          <template v-if="isLg01">
            <label class="shrink-0 text-xs text-muted-foreground">断面规格</label>
            <Select
              v-model="f.spec"
              :options="specOptions"
              option-label="label"
              option-value="value"
              class="w-28 shrink-0"
            />
            <label class="shrink-0 text-xs text-muted-foreground">米单重</label>
            <div class="w-24 shrink-0">
              <InputNumber v-model="f.lenWgt" :min="0" :show-buttons="false" fluid />
            </div>
          </template>
          <template v-else>
            <label class="shrink-0 text-xs text-muted-foreground">厚度</label>
            <div class="w-24 shrink-0">
              <InputNumber v-model="f.nThick" :min="0" :show-buttons="false" fluid />
            </div>
            <label class="shrink-0 text-xs text-muted-foreground">宽度</label>
            <div class="w-24 shrink-0">
              <InputNumber v-model="f.nWth" :min="0" :show-buttons="false" fluid />
            </div>
          </template>
          <label class="shrink-0 text-xs text-muted-foreground">长度</label>
          <div class="w-28 shrink-0">
            <InputNumber v-model="f.nLen" :min="0" :show-buttons="false" fluid />
          </div>
          <label class="shrink-0 text-xs text-muted-foreground">生产备注</label>
          <InputText v-model="f.proRemark" class="w-36 shrink-0" />
          <label class="shrink-0 text-xs text-muted-foreground">钢种代码</label>
          <Select
            v-model="f.sgCodeSimp"
            :options="sgCodeOptions"
            option-label="label"
            option-value="value"
            show-clear
            editable
            class="w-32 shrink-0"
          />
        </div>
        <!-- stackPanel4 操作按钮 + 主表标题（gridControl2 无 Caption，标题按仓库惯例挂在按钮行右端） -->
        <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
          <Button text class="shrink-0 whitespace-nowrap" @click="onRefresh">刷新</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onAutoAdd">自动添加件次</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onUpdateSize">更新规格</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onAdd">添加件次</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onRemove">删除件次</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onMatch(false)">匹配</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onMatch(true)">强制匹配</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onCancelMatch">取消匹配</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onSetExp">标记异常坯</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onCancelSetExp">取消异常坯</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onUpdatePiece">坯料修改</Button>
          <span class="ml-auto shrink-0 text-xs font-medium text-muted-foreground">产出材料</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="outCols"
            :row-data="outs"
            :pagination="false"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            @grid-ready="onOutReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
