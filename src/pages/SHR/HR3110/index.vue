<script setup lang="ts">
/** 对应 FrmHR3110（作业计划调整）：DDH.Winforms.SHR.Forms.FrmHR3110
 *  已接入：hR3010Api.querySlabs / hR2000Api.queryThr2000Dtos / hR3130Api.changePlans
 *  待接入：无
 *  说明：本菜单为独立画面（原窗体亦可作对话框由 HR3100 改规格按钮带 cZpIds 打开，web 侧仅实现独立形态）；
 *        colCTrimFlag/colCSteelType KV 翻译缺省显示原值 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import {
  hR2000Api,
  hR3010Api,
  hR3130Api,
  Thr2000StatusEnum,
  type DtoThr3010,
  type Thr2000Dto,
} from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { parts: menuQs } = useMenuQuery();
const cLineCode = menuQs[0] ?? "ZG01";

/* ---------- 日计划查询条件 ---------- */
const planInput = reactive({
  cSgCode: "",
  nThick: null as number | null,
  nWidth: null as number | null,
  cPieceNo: "",
});
/* ---------- 材料查询条件 ---------- */
const slabInput = reactive({ cBatchNo: "", cPieceNoSlab: "" });

/* ---------- 上：日计划列表（gridView1 / Thr2000Dto） ---------- */
const planRows = ref<Thr2000Dto[]>([]);
const planLoading = ref(false);
const planApi = ref<GridApi | null>(null);
const planCurrent = ref<Thr2000Dto | null>(null);
function onPlanReady(e: GridReadyEvent) { planApi.value = e.api; }
function onPlanSelectionChanged() {
  planCurrent.value = (planApi.value?.getSelectedRows()[0] as Thr2000Dto | undefined) ?? null;
}

/* ---------- 下：材料明细（gridView2 / DtoThr3010，勾选=Selected） ---------- */
const slabRows = ref<DtoThr3010[]>([]);
const slabLoading = ref(false);
const slabApi = ref<GridApi | null>(null);
function onSlabReady(e: GridReadyEvent) { slabApi.value = e.api; }
function onSlabSelectionChanged() {
  const rows = slabApi.value?.getSelectedRows() as DtoThr3010[] | undefined;
  const row = rows?.[0] ?? null;
  if (row) {
    planInput.cSgCode = row.cSgCode ?? "";
    planInput.nThick = row.nThickPlan ?? null;
    planInput.nWidth = row.nWidthPlan ?? null;
  }
}

/* ---------- 列定义 ---------- */
const coolFmt = (p: ValueFormatterParams) =>
  (({ N: "热坯", Y: "冷坯" }) as Record<string, string>)[String(p.value)] ?? "";

const planColDefs: ColDef[] = [
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序", width: 112 },
  { colId: "cPlanPieceNos", field: "cPlanPieceNos", headerName: "计划材料", width: 125 },
  { colId: "cPlanTime", field: "cPlanTime", headerName: "计划日期", width: 112 },
  { colId: "cCool", field: "cCool", headerName: "是否冷坯计划", width: 125, valueFormatter: coolFmt },
  { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 125 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140 },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 112 },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 112 },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 112 },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 112 },
  { colId: "nLenTq1", field: "nLenTq1", headerName: "套切1", width: 112 },
  { colId: "nLenTq2", field: "nLenTq2", headerName: "套切2", width: 112 },
  { colId: "nLenTq3", field: "nLenTq3", headerName: "套切3", width: 112 },
  { colId: "nLenTq4", field: "nLenTq4", headerName: "套切4", width: 112 },
  { colId: "nBc", field: "nBc", headerName: "倍尺", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nPlanedWgt", field: "nPlanedWgt", headerName: "排产量", width: 112 },
  { colId: "nPlanZpWgt", field: "nPlanZpWgt", headerName: "计划组批量", width: 125 },
  { colId: "nZpSyWgt", field: "nZpSyWgt", headerName: "剩余组批量", width: 125 },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 112 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态代码", width: 138 },
  { colId: "cRemark", field: "cRemark", headerName: "日计划备注", width: 125 },
  { colId: "cSgCodeTl", field: "cSgCodeTl", headerName: "提料钢种", width: 112 },
  { colId: "cSgStdTl", field: "cSgStdTl", headerName: "提料标准", width: 112 },
  { colId: "nThickTl", field: "nThickTl", headerName: "提料厚度", width: 112 },
  { colId: "nWidthTl", field: "nWidthTl", headerName: "提料宽度", width: 112 },
  { colId: "nLenMinTl", field: "nLenMinTl", headerName: "提料长度最小值", width: 151 },
  { colId: "nLenMaxTl", field: "nLenMaxTl", headerName: "提料长度最大值", width: 151 },
  { colId: "nQuaTl", field: "nQuaTl", headerName: "提料支数", width: 112 },
  { colId: "nWgtUnitTl", field: "nWgtUnitTl", headerName: "提料单支重量", width: 138 },
  { colId: "nWgtTl", field: "nWgtTl", headerName: "提料重量", width: 112 },
  { colId: "nQuaZp", field: "nQuaZp", headerName: "组批支数", width: 112 },
  { colId: "nWgtZp", field: "nWgtZp", headerName: "组批重量", width: 112 },
  { colId: "nQuaFur", field: "nQuaFur", headerName: "入炉支数", width: 112 },
  { colId: "nWgtFur", field: "nWgtFur", headerName: "入炉量", width: 112 },
  { colId: "nQuaRoll", field: "nQuaRoll", headerName: "轧制完成支数", width: 125 },
  { colId: "nWgtRoll", field: "nWgtRoll", headerName: "轧制完成量", width: 125 },
  { colId: "nQuaPlan", field: "nQuaPlan", headerName: "计划收料支数", width: 125 },
  { colId: "nQuaFinish", field: "nQuaFinish", headerName: "收料支数", width: 112 },
  { colId: "nWgtFinish", field: "nWgtFinish", headerName: "收料重量", width: 112 },
  { colId: "nWidthWgt", field: "nWidthWgt", headerName: "边部宽度余量", width: 138 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式:四切", width: 138 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112 },
  { colId: "dStart", field: "dStart", headerName: "开始产出", width: 140 },
  { colId: "dEnd", field: "dEnd", headerName: "最后产出", width: 140 },
  { colId: "cPieceNos", field: "cPieceNos", headerName: "已挂单材料", width: 125 },
  { colId: "cConRemark", field: "cConRemark", headerName: "合同备注", width: 112 },
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "TMP2020主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112, hide: true },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112, hide: true },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112, hide: true },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 112, hide: true },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 112, hide: true },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 112, hide: true },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 125, hide: true },
  { colId: "dJhqTime", field: "dJhqTime", headerName: "交货期", width: 140, hide: true },
  { colId: "cDesignNo", field: "cDesignNo", headerName: "质量设计号", width: 125, hide: true },
  { colId: "cMsc", field: "cMsc", headerName: "冶金规范", width: 112, hide: true },
  { colId: "cMscLineNo", field: "cMscLineNo", headerName: "冶金规范产线号", width: 138, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "计划状态", width: 112, hide: true },
  { colId: "cCloseEmp", field: "cCloseEmp", headerName: "关闭人", width: 112, hide: true },
  { colId: "dClose", field: "dClose", headerName: "关闭时间", width: 140, hide: true },
  { colId: "cSourceTl", field: "cSourceTl", headerName: "供坯单位", width: 112, hide: true },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112, hide: true },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 112, hide: true },
  { colId: "cOverstepBl", field: "cOverstepBl", headerName: "短溢装比例", width: 125, hide: true },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112, hide: true },
  { colId: "cShape", field: "cShape", headerName: "形状代码", width: 112, hide: true },
];

const slabColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140 },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112 },
  { colId: "cPos", field: "cPos", headerName: "当前位置", width: 112 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "熔炼序号", width: 112 },
  { colId: "cPrintCode", field: "cPrintCode", headerName: "喷印号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "冶炼钢种", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "坯宽", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "nThickPlan", field: "nThickPlan", headerName: "计划厚度", width: 112 },
  { colId: "nWidthPlan", field: "nWidthPlan", headerName: "计划宽度", width: 112 },
  { colId: "nLenPlan", field: "nLenPlan", headerName: "计划长度", width: 112 },
  { colId: "cSgCodePlan", field: "cSgCodePlan", headerName: "计划钢种", width: 112 },
  { colId: "cSgStdPlan", field: "cSgStdPlan", headerName: "计划执行标准", width: 138 },
  { colId: "nRateLl", field: "nRateLl", headerName: "理论成材率", width: 125 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 112 },
  { colId: "cDn", field: "cDn", headerName: "需要堆冷", width: 112 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 112 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112 },
  { colId: "cSpecialMarkGy", field: "cSpecialMarkGy", headerName: "性能要求", width: 112 },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112 },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 112 },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 112 },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 112 },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 112 },
  { colId: "nLenTq1", field: "nLenTq1", headerName: "套切1", width: 112 },
  { colId: "nLenTq2", field: "nLenTq2", headerName: "套切2", width: 112 },
  { colId: "nLenTq3", field: "nLenTq3", headerName: "套切3", width: 112 },
  { colId: "nLenTq4", field: "nLenTq4", headerName: "套切4", width: 112 },
  { colId: "nBc", field: "nBc", headerName: "倍尺", width: 112 },
  { colId: "cBilletTypeCode", field: "cBilletTypeCode", headerName: "铸坯标识", width: 112 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 112 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "dRl", field: "dRl", headerName: "入炉时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 150, hide: true },
  { colId: "cSlabId", field: "cSlabId", headerName: "TYD2000主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "cRowNo", field: "cRowNo", headerName: "道次", width: 112, hide: true },
  { colId: "nQua", field: "nQua", headerName: "支数", width: 112, hide: true },
  { colId: "nWgtCz", field: "nWgtCz", headerName: "称重重量", width: 112, hide: true },
  { colId: "cInboundNo1", field: "cInboundNo1", headerName: "入库标识1", width: 112, hide: true },
  { colId: "cInboundNo2", field: "cInboundNo2", headerName: "入库标识2", width: 112, hide: true },
  { colId: "cInboundNo3", field: "cInboundNo3", headerName: "入库标识3", width: 112, hide: true },
  { colId: "cInboundNo4", field: "cInboundNo4", headerName: "入库标识4", width: 112, hide: true },
  { colId: "cFurCode", field: "cFurCode", headerName: "加热炉编号", width: 125, hide: true },
  { colId: "nFurStatus", field: "nFurStatus", headerName: "加热炉状态", width: 125, hide: true },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 112, hide: true },
  { colId: "cSpecPlan", field: "cSpecPlan", headerName: "计划规格", width: 112, hide: true },
  { colId: "nOrderPlan", field: "nOrderPlan", headerName: "计划生产顺序", width: 138, hide: true },
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序号", width: 125, hide: true },
  { colId: "nL2Status", field: "nL2Status", headerName: "L2计划状态", width: 125, hide: true },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112, hide: true },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112, hide: true },
];

/* ---------- 查询 ---------- */
async function queryPlan() {
  planLoading.value = true;
  try {
    const list = (await hR2000Api.queryThr2000Dtos({
      cLineCode,
      nStatus: Thr2000StatusEnum.Open,
      cSgCodeTl: planInput.cSgCode.trim() || undefined,
      nThick: planInput.nThick ?? undefined,
      nWidth: planInput.nWidth ?? undefined,
      cPieceNo: planInput.cPieceNo.trim() || undefined,
    })) ?? [];
    planRows.value = list;
    planCurrent.value = null;
    requestAnimationFrame(() => planApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    planLoading.value = false;
  }
}

async function querySlab() {
  const cBatchNo = slabInput.cBatchNo.trim();
  const slabNo = slabInput.cPieceNoSlab.trim();
  if (!cBatchNo && !slabNo) {
    toast("请输入批号或者板坯号查询！", 2000, "warn");
    return;
  }
  slabLoading.value = true;
  try {
    const list = (await hR3010Api.querySlabs({
      cLineCode,
      cBatchNo: cBatchNo || undefined,
      slabNo: slabNo || undefined,
    })) ?? [];
    slabRows.value = list;
    requestAnimationFrame(() => slabApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    slabLoading.value = false;
  }
}

/* ---------- ShowYesNo 受控确认 ---------- */
const confirmOpen = ref(false);
const confirmMsg = ref("");
let confirmAction: (() => Promise<void>) | null = null;
function askConfirm(msg: string, action: () => Promise<void>) {
  confirmMsg.value = msg;
  confirmAction = action;
  confirmOpen.value = true;
}
async function onConfirmOk() {
  confirmOpen.value = false;
  const act = confirmAction;
  confirmAction = null;
  if (act) await act();
}

/* ---------- 确认改单 ---------- */
async function doChange(cZpIds: string[], plan: Thr2000Dto) {
  try {
    await hR3130Api.changePlans({ cZpIds, cOrderId: plan.id });
    toast("修改成功！", 2000, "success");
    await queryPlan();
    await querySlab();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnOk() {
  const plan = planCurrent.value;
  if (!plan) {
    toast("请选择日计划操作！", 2000, "warn");
    return;
  }
  if (slabRows.value.length === 0) {
    toast("请查询材料明细！", 2000, "warn");
    return;
  }
  const sel = (slabApi.value?.getSelectedRows() ?? []) as DtoThr3010[];
  if (sel.length === 0) {
    toast("请勾选材料明细！", 2000, "warn");
    return;
  }
  const cOrderNos = sel.map((x) => x.cOrderNo);
  if (cOrderNos.includes(plan.cOrderNo)) {
    toast("选择的新订单不能和现有一样！", 2000, "warn");
    return;
  }
  const cZpIds = [...new Set(sel.map((x) => x.cZpId).filter((x): x is string => !!x))];
  askConfirm(`是否确认把选中材料的轧制计划的订单号修改为${plan.cOrderNo}?`, () => doChange(cZpIds, plan));
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 上下分栏：原 split1 486/960 ≈ 51% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="51" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">日计划列表</span>
        </div>
        <!-- stackPanel1：炼钢钢种/订单厚度/订单宽度/计划材料 + 查询/确认 -->
        <div class="flex h-9 shrink-0 items-center gap-1.5 border-b border-border/60 px-2">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炼钢钢种</label>
          <InputText v-model="planInput.cSgCode" class="w-32 shrink-0" @keydown.enter="queryPlan" />
          <label class="shrink-0 text-xs text-muted-foreground">订单厚度</label>
          <InputNumber v-model="planInput.nThick" :show-buttons="false" :use-grouping="false" class="w-24 shrink-0" />
          <label class="shrink-0 text-xs text-muted-foreground">订单宽度</label>
          <InputNumber v-model="planInput.nWidth" :show-buttons="false" :use-grouping="false" class="w-24 shrink-0" />
          <label class="shrink-0 text-xs text-muted-foreground">计划材料</label>
          <InputText v-model="planInput.cPieceNo" class="w-32 shrink-0" @keydown.enter="queryPlan" />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="planLoading" @click="queryPlan">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnOk">确认</Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="planColDefs" :row-data="planRows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false" :animate-rows="false" :loading="planLoading"
            @grid-ready="onPlanReady" @selection-changed="onPlanSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">材料明细</span>
        </div>
        <!-- stackPanel2：批号/板坯号 + 查询 -->
        <div class="flex h-9 shrink-0 items-center gap-1.5 border-b border-border/60 px-2">
          <label class="w-8 shrink-0 text-xs text-muted-foreground">批号</label>
          <InputText v-model="slabInput.cBatchNo" class="w-36 shrink-0" @keydown.enter="querySlab" />
          <label class="shrink-0 text-xs text-muted-foreground">板坯号</label>
          <InputText v-model="slabInput.cPieceNoSlab" class="w-36 shrink-0" @keydown.enter="querySlab" />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="slabLoading" @click="querySlab">
            <IconSearch class="h-3 w-3" />查询
          </Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="slabColDefs" :row-data="slabRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :pagination="false" :animate-rows="false" :loading="slabLoading"
            @grid-ready="onSlabReady" @selection-changed="onSlabSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>

    <Dialog :visible="confirmOpen" modal header="确认" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>
