<script setup lang="ts">
/** 对应 FrmHR3030（剪切计划调整）：DDH.Winforms.SHR.Forms.FrmHR3030
 *  已接入：hR3700Api.getSlabs / hR3030Api.queryThr3030s / hR2000Api.queryThr2000Dtos / hR3000Api.changeJQPlan
 *  待接入：无
 *  说明：菜单参数 cQueryString "ZG01-03" 为备料库号；产线代码取自材料查询结果首行（原对话框构造器行为）；
 *        colCSteelType/colCTrimFlag/colNStatus 原走 KV/枚举翻译，web 显示原值 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import {
  hR2000Api,
  hR3000Api,
  hR3030Api,
  hR3700Api,
  Thr2000StatusEnum,
  type Thr2000Dto,
  type Thr3030,
} from "@/api/mes4ddh/shr.swagger";
import type { Tyd2000 } from "@/api/mes4ddh/syd.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: menuRaw } = useMenuQuery();
const cStoreCode = menuRaw || undefined;

/* ---------- 材料查询条件（DtoQuerySlabs） ---------- */
const slabInput = reactive({ cBatchNo: "", cPieceNo: "", cPieceNoSlab: "", cStove: "", cSgCode: "", cSgStd: "" });
let cLineCode: string | undefined;

/* ---------- 日计划查询条件 ---------- */
const planInput = reactive({
  cSgCode: "" as string,
  nThick: null as number | null,
  nWidth: null as number | null,
  cPieceNo: "",
});

/* ---------- 左上：待剪切材料明细（gridView1 / Tyd2000） ---------- */
const slabRows = ref<Tyd2000[]>([]);
const slabLoading = ref(false);
const slabApi = ref<GridApi | null>(null);
const slabCurrent = ref<Tyd2000 | null>(null);
function onSlabReady(e: GridReadyEvent) {
  slabApi.value = e.api;
}
function onSlabSelectionChanged() {
  const row = (slabApi.value?.getSelectedRows()[0] as Tyd2000 | undefined) ?? null;
  slabCurrent.value = row;
  void bindThr3030(row);
}

/* ---------- 右上：现剪切计划（gridView2 / Thr3030） ---------- */
const jqRows = ref<Thr3030[]>([]);
const jqLoading = ref(false);
const jqApi = ref<GridApi | null>(null);
function onJqReady(e: GridReadyEvent) {
  jqApi.value = e.api;
}

/* ---------- 下：日计划列表（gridView3 / Thr2000Dto） ---------- */
const planRows = ref<Thr2000Dto[]>([]);
const planLoading = ref(false);
const planApi = ref<GridApi | null>(null);
const planCurrent = ref<Thr2000Dto | null>(null);
function onPlanReady(e: GridReadyEvent) {
  planApi.value = e.api;
}
function onPlanSelectionChanged() {
  planCurrent.value = (planApi.value?.getSelectedRows()[0] as Thr2000Dto | undefined) ?? null;
}

/* ---------- 列定义 ---------- */
const slabColDefs: ColDef[] = [
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 112 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 112 },
  { colId: "cPrintCode", field: "cPrintCode", headerName: "喷印号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nNum", field: "nNum", headerName: "签订块数", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "id", field: "id", headerName: "thr3010 id", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "nProType", field: "nProType", headerName: "库存分类", width: 112, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "cProc", field: "cProc", headerName: "工序", width: 112, hide: true },
  { colId: "cMachine", field: "cMachine", headerName: "机台", width: 112, hide: true },
  { colId: "cStrandNo", field: "cStrandNo", headerName: "流道号", width: 112, hide: true },
  { colId: "cPlanNo", field: "cPlanNo", headerName: "计划号", width: 112, hide: true },
  { colId: "cConNo", field: "cConNo", headerName: "合同号", width: 112, hide: true },
  { colId: "cMatCode", field: "cMatCode", headerName: "物料编码", width: 112, hide: true },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112, hide: true },
  { colId: "nWth", field: "nWth", headerName: "宽度", width: 112, hide: true },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112, hide: true },
  { colId: "nCalWgt", field: "nCalWgt", headerName: "理重", width: 112, hide: true },
  { colId: "dProTime", field: "dProTime", headerName: "产出时间", width: 140, hide: true },
  { colId: "cProUser", field: "cProUser", headerName: "产出人", width: 112, hide: true },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "班次", width: 112, hide: true },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "产出班组", width: 112, hide: true },
  { colId: "dInTime", field: "dInTime", headerName: "入库时间", width: 140, hide: true },
  { colId: "cInUser", field: "cInUser", headerName: "入库人", width: 112, hide: true },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库房", width: 112, hide: true },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 112, hide: true },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 112, hide: true },
  { colId: "cSourceStoreCode", field: "cSourceStoreCode", headerName: "来源库房", width: 125, hide: true },
  { colId: "cSourceStackNo", field: "cSourceStackNo", headerName: "来源垛位号", width: 125, hide: true },
  { colId: "cSourceStackNum", field: "cSourceStackNum", headerName: "来源层号", width: 125, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "状态", width: 112, hide: true },
  { colId: "nBeforeStatus", field: "nBeforeStatus", headerName: "前状态", width: 112, hide: true },
  { colId: "cIsHot", field: "cIsHot", headerName: "热送区分", width: 112, hide: true },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 112, hide: true },
  { colId: "nCastDivCode", field: "nCastDivCode", headerName: "浇区分", width: 112, hide: true },
  { colId: "cLockedLine", field: "cLockedLine", headerName: "封锁产线", width: 125, hide: true },
  { colId: "cLockedPlan", field: "cLockedPlan", headerName: "封锁计划", width: 125, hide: true },
  { colId: "cMatType", field: "cMatType", headerName: "物料类型", width: 112, hide: true },
  { colId: "cProdCode", field: "cProdCode", headerName: "品名代码", width: 112, hide: true },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 112, hide: true },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态", width: 112, hide: true },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 125, hide: true },
  { colId: "cOrderNoLast", field: "cOrderNoLast", headerName: "原提料计划号", width: 138, hide: true },
  { colId: "cDestination", field: "cDestination", headerName: "去向", width: 112, hide: true },
  { colId: "cHotNo", field: "cHotNo", headerName: "热送号", width: 112, hide: true },
  { colId: "cSlabType", field: "cSlabType", headerName: "坯料类型", width: 112, hide: true },
  { colId: "qm", field: "qm", headerName: "QM", width: 112, hide: true },
  { colId: "info", field: "info", headerName: "信息", width: 112, hide: true },
  { colId: "planItem", field: "planItem", headerName: "计划项", width: 112, hide: true },
  { colId: "appendices", field: "appendices", headerName: "附件", width: 112, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
];

const jqColDefs: ColDef[] = [
  { colId: "cPieceNo", field: "cPieceNo", headerName: "子板号", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "订单规格", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "计划厚度", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "计划宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "计划长度", width: 112 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 150, hide: true },
  { colId: "cMxId", field: "cMxId", headerName: "THR3010主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 112, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
];

const planColDefs: ColDef[] = [
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 112 },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 112 },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 112 },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 112 },
  { colId: "nLenTq1", field: "nLenTq1", headerName: "套切1", width: 112 },
  { colId: "nLenTq2", field: "nLenTq2", headerName: "套切2", width: 112 },
  { colId: "nLenTq3", field: "nLenTq3", headerName: "套切3", width: 112 },
  { colId: "nLenTq4", field: "nLenTq4", headerName: "套切4", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112 },
  { colId: "nPlanedWgt", field: "nPlanedWgt", headerName: "排产量", width: 112 },
  { colId: "nPlanZpWgt", field: "nPlanZpWgt", headerName: "计划组批量", width: 125 },
  { colId: "nZpWgt", field: "nZpWgt", headerName: "组批重量", width: 112 },
  { colId: "nZpSyWgt", field: "nZpSyWgt", headerName: "剩余组批量", width: 125 },
  { colId: "nFurWgt", field: "nFurWgt", headerName: "入炉量", width: 112 },
  { colId: "nRollWgt", field: "nRollWgt", headerName: "轧制板重t", width: 112 },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 112 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态代码", width: 138 },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 125 },
  { colId: "dJhqTime", field: "dJhqTime", headerName: "交货期", width: 140 },
  { colId: "cConRemark", field: "cConRemark", headerName: "合同备注", width: 112 },
  { colId: "cDesignNo", field: "cDesignNo", headerName: "质量设计号", width: 125 },
  { colId: "cMsc", field: "cMsc", headerName: "冶金规范", width: 112 },
  { colId: "cMscLineNo", field: "cMscLineNo", headerName: "冶金规范产线号", width: 138 },
  { colId: "nStatus", field: "nStatus", headerName: "计划状态", width: 112 },
  { colId: "cRemark", field: "cRemark", headerName: "日计划备注", width: 125 },
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序", width: 112 },
  { colId: "cSourceTl", field: "cSourceTl", headerName: "供坯单位", width: 112 },
  { colId: "cSgCodeTl", field: "cSgCodeTl", headerName: "提料钢种", width: 112 },
  { colId: "cSgStdTl", field: "cSgStdTl", headerName: "提料标准", width: 112 },
  { colId: "nThickTl", field: "nThickTl", headerName: "提料厚度", width: 112 },
  { colId: "nWidthTl", field: "nWidthTl", headerName: "提料宽度", width: 112 },
  { colId: "nLenMinTl", field: "nLenMinTl", headerName: "提料长度最小值", width: 151 },
  { colId: "nLenMaxTl", field: "nLenMaxTl", headerName: "提料长度最大值", width: 151 },
  { colId: "nQuaTl", field: "nQuaTl", headerName: "提料支数", width: 112 },
  { colId: "nWgtMeterTl", field: "nWgtMeterTl", headerName: "提料米单重", width: 125 },
  { colId: "nWgtUnitTl", field: "nWgtUnitTl", headerName: "提料单支重量", width: 138 },
  { colId: "nWgtTl", field: "nWgtTl", headerName: "提料重量", width: 112 },
  { colId: "nWidthWgt", field: "nWidthWgt", headerName: "边部宽度余量", width: 138 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式:四切", width: 138 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112 },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 112 },
  { colId: "cOverstepBl", field: "cOverstepBl", headerName: "短溢装比例", width: 125 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112 },
  { colId: "cShape", field: "cShape", headerName: "形状代码", width: 112 },
  { colId: "cIsMerge", field: "cIsMerge", headerName: "是否合并提料", width: 125 },
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "TMP2020主键", width: 150, hide: true },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 112, hide: true },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 112, hide: true },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 112, hide: true },
  { colId: "cCloseEmp", field: "cCloseEmp", headerName: "关闭人", width: 112, hide: true },
  { colId: "dClose", field: "dClose", headerName: "关闭时间", width: 140, hide: true },
];

/* ---------- 数据绑定 ---------- */
async function querySlab() {
  slabLoading.value = true;
  try {
    const list =
      (await hR3700Api.getSlabs({
        cStoreCode,
        cBatchNo: slabInput.cBatchNo.trim() || undefined,
        cPieceNo: slabInput.cPieceNo.trim() || undefined,
        cPieceNoSlab: slabInput.cPieceNoSlab.trim() || undefined,
        cStove: slabInput.cStove.trim() || undefined,
        cSgCode: slabInput.cSgCode.trim() || undefined,
        cSgStd: slabInput.cSgStd.trim() || undefined,
      })) ?? [];
    slabRows.value = list;
    slabCurrent.value = null;
    jqRows.value = [];
    if (list.length) cLineCode = list[0].cLineCode ?? undefined;
    requestAnimationFrame(() => slabApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    slabLoading.value = false;
  }
}

async function bindThr3030(item: Tyd2000 | null) {
  if (!item) {
    jqRows.value = [];
    return;
  }
  planInput.cSgCode = item.cSgCode ?? "";
  planInput.nThick = item.nThick ?? null;
  planInput.nWidth = item.nWth ?? null;
  jqLoading.value = true;
  try {
    const list = (await hR3030Api.queryThr3030s(item.cPieceNo ?? undefined, item.cPieceNoSlab ?? undefined)) ?? [];
    jqRows.value = list;
    requestAnimationFrame(() => jqApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    jqLoading.value = false;
  }
}

async function queryPlan() {
  planLoading.value = true;
  try {
    const list =
      (await hR2000Api.queryThr2000Dtos({
        cLineCode,
        nStatus: Thr2000StatusEnum.Open,
        cSgCodeTl: planInput.cSgCode.trim() || undefined,
        nThick: planInput.nThick ?? undefined,
        nWidth: planInput.nWidth ?? undefined,
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
async function doChange() {
  const tyd2000 = slabCurrent.value;
  const plan = planCurrent.value;
  if (!tyd2000 || !plan) return;
  try {
    await hR3000Api.changeJQPlan(plan.id ?? undefined, [tyd2000.id ?? ""]);
    toast("修改成功！", 2000, "success");
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
  const tyd2000 = slabCurrent.value;
  if (!tyd2000) {
    toast("请选择材料操作！", 2000, "warn");
    return;
  }
  askConfirm(`是否确认把材料${tyd2000.cPieceNo}的订单号修改为${plan.cOrderNo}?`, doChange);
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 上下分栏：原 split1 638/1071 ≈ 60% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="60" :minSize="25" class="flex flex-col overflow-hidden">
        <!-- 材料查询条件区（批号/件次号/板坯号/炉号/钢种/执行标准 + 查询） -->
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
            <InputText v-model="slabInput.cBatchNo" class="min-w-0 flex-1" @keydown.enter="querySlab" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
            <InputText v-model="slabInput.cPieceNo" class="min-w-0 flex-1" @keydown.enter="querySlab" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
            <InputText v-model="slabInput.cPieceNoSlab" class="min-w-0 flex-1" @keydown.enter="querySlab" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
            <InputText v-model="slabInput.cStove" class="min-w-0 flex-1" @keydown.enter="querySlab" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
            <InputText v-model="slabInput.cSgCode" class="min-w-0 flex-1" @keydown.enter="querySlab" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
            <InputText v-model="slabInput.cSgStd" class="min-w-0 flex-1" @keydown.enter="querySlab" />
          </div>
          <div class="col-span-6 flex items-center">
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="slabLoading" @click="querySlab">
              <IconSearch class="h-3 w-3" />查询
            </Button>
          </div>
        </div>
        <!-- 左右分栏：原 split2 1545/2080 ≈ 74% -->
        <Splitter class="min-h-0 flex-1">
          <SplitterPanel :size="74" :minSize="20" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">待剪切材料明细</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="slabColDefs"
                :row-data="slabRows"
                :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
                :pagination="false"
                :animate-rows="false"
                :loading="slabLoading"
                @grid-ready="onSlabReady"
                @selection-changed="onSlabSelectionChanged"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
          <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">现剪切计划</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="jqColDefs"
                :row-data="jqRows"
                :pagination="false"
                :animate-rows="false"
                :loading="jqLoading"
                @grid-ready="onJqReady"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>

      <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">日计划列表</span>
        </div>
        <!-- 日计划查询条件（炼钢钢种/订单厚度/订单宽度/计划材料 + 查询/确认） -->
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
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="planColDefs"
            :row-data="planRows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="planLoading"
            @grid-ready="onPlanReady"
            @selection-changed="onPlanSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>

    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>
