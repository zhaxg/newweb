<script setup lang="ts">
/** 对应 FrmHR3000（轧钢组批管理）：DDH.Winforms.SHR.Forms.FrmHR3000
 *  已接入：hR2000Api.queryThr2000Dtos / hR3000Api.getSlabs / saveZp
 *  待接入：无
 *  偏差：菜单参数 cQueryString "ZG01,LG02-01"（产线,备料库）经 useMenuQuery 下发；colCTrimFlag/colCSteelType 原走 KV 字典翻译，web 显示原值 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { hR2000Api, hR3000Api, Thr2000StatusEnum, type Thr2000Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";
import type { Tyd2000 } from "@/api/mes4ddh/syd.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { parts: menuQs } = useMenuQuery();
const cLineCode = menuQs[0] ?? "ZG01";
const cStoreCode = menuQs[1];

/* ---------- 时间（原 ucTimeRange2，默认本月） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function monthRange(): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  last.setSeconds(last.getSeconds() - 1);
  return [first, last];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 查询条件 ---------- */
const planInput = reactive({ cOrderNo: "", cSgCode: "", dates: monthRange() as Date[] | null });
const slabInput = reactive({ cStove: "", cSgCode: "", cSpec: "" });
/* 装炉方式（原 comFur，AddEnum(Thr3000FurTypeEnum)，SelectedIndex=1 → 热装） */
const furOptions = [
  { label: "冷装", value: 0 },
  { label: "热装", value: 1 },
  { label: "温装", value: 2 },
];
const nFurType = ref(1);
const zpRemark = ref("");

/* ---------- 上表：日计划列表（gridView1 / Thr2000Dto） ---------- */
const planRows = ref<Thr2000Dto[]>([]);
const planLoading = ref(false);
const planApi = ref<GridApi | null>(null);
const planCurrent = ref<Thr2000Dto | null>(null);
function onPlanReady(e: GridReadyEvent) {
  planApi.value = e.api;
}
function onPlanSelectionChanged() {
  const row = (planApi.value?.getSelectedRows()[0] as Thr2000Dto | undefined) ?? null;
  planCurrent.value = row;
  void bindSlabByPlan(row);
}

/* ---------- 下表：坯料库明细（gridView2 / Tyd2000，勾选=Selected） ---------- */
const slabRows = ref<Tyd2000[]>([]);
const slabLoading = ref(false);
const slabApi = ref<GridApi | null>(null);
function onSlabReady(e: GridReadyEvent) {
  slabApi.value = e.api;
}

/* ---------- 列定义（列集/顺序按 Designer VisibleIndex） ---------- */
const coolFmt = (p: ValueFormatterParams) =>
  (({ N: "热坯", Y: "冷坯" }) as Record<string, string>)[String(p.value)] ?? "";
const statusFmt = (p: ValueFormatterParams) =>
  (
    ({ [String(Thr2000StatusEnum.Open)]: "已开启", [String(Thr2000StatusEnum.Close)]: "已关闭" }) as Record<
      string,
      string
    >
  )[String(p.value)] ?? "";

const planColDefs: ColDef[] = [
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112 },
  { colId: "cPlanTime", field: "cPlanTime", headerName: "计划日期", width: 112 },
  { colId: "cCool", field: "cCool", headerName: "是否冷坯计划", width: 125, valueFormatter: coolFmt },
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
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 112 },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 112 },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 112 },
  { colId: "nPlanedWgt", field: "nPlanedWgt", headerName: "排产量", width: 112 },
  { colId: "nPlanZpWgt", field: "nPlanZpWgt", headerName: "计划组批量", width: 125 },
  { colId: "nQuaZp", field: "nQuaZp", headerName: "组批支数", width: 112 },
  { colId: "nWgtZp", field: "nWgtZp", headerName: "组批重量", width: 112 },
  { colId: "nZpSyWgt", field: "nZpSyWgt", headerName: "剩余组批量", width: 125 },
  { colId: "nQuaFur", field: "nQuaFur", headerName: "入炉支数", width: 112 },
  { colId: "nWgtFur", field: "nWgtFur", headerName: "入炉量", width: 112 },
  { colId: "nQuaRoll", field: "nQuaRoll", headerName: "轧制完成支数", width: 125 },
  { colId: "nWgtRoll", field: "nWgtRoll", headerName: "轧制完成量", width: 125 },
  { colId: "dStart", field: "dStart", headerName: "开始产出", width: 140 },
  { colId: "dEnd", field: "dEnd", headerName: "最后产出", width: 140 },
  { colId: "nQuaPlan", field: "nQuaPlan", headerName: "计划收料支数", width: 125 },
  { colId: "nQuaFinish", field: "nQuaFinish", headerName: "收料支数", width: 112 },
  { colId: "nWgtFinish", field: "nWgtFinish", headerName: "收料重量", width: 112 },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 112 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态代码", width: 138 },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 125 },
  { colId: "dJhqTime", field: "dJhqTime", headerName: "交货期", width: 140 },
  { colId: "cConRemark", field: "cConRemark", headerName: "合同备注", width: 112 },
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
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "TMP2020主键", width: 150, hide: true },
  { colId: "cDesignNo", field: "cDesignNo", headerName: "质量设计号", width: 125, hide: true },
  { colId: "cMsc", field: "cMsc", headerName: "冶金规范", width: 112, hide: true },
  { colId: "cMscLineNo", field: "cMscLineNo", headerName: "冶金规范产线号", width: 138, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "计划状态", width: 112, hide: true, valueFormatter: statusFmt },
  { colId: "cCloseEmp", field: "cCloseEmp", headerName: "关闭人", width: 112, hide: true },
  { colId: "dClose", field: "dClose", headerName: "关闭时间", width: 140, hide: true },
  { colId: "cIsMerge", field: "cIsMerge", headerName: "是否合并提料", width: 125, hide: true },
];

const slabColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cIsHot", field: "cIsHot", headerName: "热送区分", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nWth", field: "nWth", headerName: "宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112 },
  { colId: "nNum", field: "nNum", headerName: "签订块数", width: 112 },
  { colId: "nCalWgt", field: "nCalWgt", headerName: "理重", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "dProTime", field: "dProTime", headerName: "产出时间", width: 140 },
  { colId: "cProUser", field: "cProUser", headerName: "产出人", width: 112 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "班次", width: 112 },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "产出班组", width: 112 },
  { colId: "dInTime", field: "dInTime", headerName: "入库时间", width: 140 },
  { colId: "cInUser", field: "cInUser", headerName: "入库人", width: 112 },
  { colId: "nStatus", field: "nStatus", headerName: "状态", width: 112 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 112 },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 112 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态", width: 112 },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 125 },
  { colId: "cDestination", field: "cDestination", headerName: "去向", width: 112 },
  { colId: "id", field: "id", headerName: "thr3010 id", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cProc", field: "cProc", headerName: "工序", width: 112, hide: true },
  { colId: "cMachine", field: "cMachine", headerName: "机台", width: 112, hide: true },
  { colId: "cStrandNo", field: "cStrandNo", headerName: "流道号", width: 112, hide: true },
  { colId: "cPlanId", field: "cPlanId", headerName: "日计划主键", width: 150, hide: true },
  { colId: "cPono", field: "cPono", headerName: "生产订单号", width: 125, hide: true },
  { colId: "cConNo", field: "cConNo", headerName: "合同号", width: 112, hide: true },
  { colId: "cMatCode", field: "cMatCode", headerName: "物料编码", width: 112, hide: true },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 112, hide: true },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 112, hide: true },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库房", width: 112, hide: true },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 112, hide: true },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 112, hide: true },
  { colId: "cSourceStoreCode", field: "cSourceStoreCode", headerName: "来源库房", width: 125, hide: true },
  { colId: "cSourceStackNo", field: "cSourceStackNo", headerName: "来源垛位号", width: 125, hide: true },
  { colId: "cSourceStackNum", field: "cSourceStackNum", headerName: "来源层号", width: 125, hide: true },
  { colId: "cRemark", field: "cRemark", headerName: "备注", width: 112, hide: true },
  { colId: "cMsc", field: "cMsc", headerName: "冶金规范", width: 112, hide: true },
  { colId: "cMscLine", field: "cMscLine", headerName: "冶金规范产线", width: 138, hide: true },
  { colId: "cStNo", field: "cStNo", headerName: "统计号", width: 112, hide: true },
  { colId: "nCastDivCode", field: "nCastDivCode", headerName: "浇区分", width: 112, hide: true },
  { colId: "cLockedLine", field: "cLockedLine", headerName: "封锁产线", width: 125, hide: true },
  { colId: "cLockedPlan", field: "cLockedPlan", headerName: "封锁计划", width: 125, hide: true },
  { colId: "cMatType", field: "cMatType", headerName: "物料类型", width: 112, hide: true },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112, hide: true },
  { colId: "cOrderNoLast", field: "cOrderNoLast", headerName: "原提料计划号", width: 138, hide: true },
  { colId: "cIsFinishPath", field: "cIsFinishPath", headerName: "完成路径", width: 125, hide: true },
  { colId: "cHotNo", field: "cHotNo", headerName: "热送号", width: 112, hide: true },
  { colId: "cRouteCode", field: "cRouteCode", headerName: "路由代码", width: 112, hide: true },
  { colId: "cSlabType", field: "cSlabType", headerName: "坯料类型", width: 112, hide: true },
  { colId: "cCcfs", field: "cCcfs", headerName: "ccfs", width: 112, hide: true },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 112, hide: true },
];

/* ---------- 查询 ---------- */
async function queryPlan() {
  planLoading.value = true;
  try {
    const list =
      (await hR2000Api.queryThr2000Dtos({
        cLineCode,
        cOrderNo: planInput.cOrderNo.trim().toUpperCase() || undefined,
        nStatus: Thr2000StatusEnum.Open,
        cSgCode: planInput.cSgCode.trim() || undefined,
        dTimeRange: toTimeRange(planInput.dates),
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

async function querySlab(dto: { cStove?: string; cSgCode?: string; cSpec?: string; cOrderNo?: string }) {
  slabLoading.value = true;
  try {
    const list =
      (await hR3000Api.getSlabs({
        cLineCode,
        cStoreCode,
        cStove: dto.cStove || undefined,
        cSgCode: dto.cSgCode || undefined,
        cSpec: dto.cSpec || undefined,
        cOrderNo: dto.cOrderNo || undefined,
      })) ?? [];
    slabRows.value = list;
    requestAnimationFrame(() => slabApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    slabLoading.value = false;
  }
}

/* 原 gridView1_FocusedRowObjectChanged：聚焦日计划联动坯料（规格/钢种缺省回落提料值） */
function bindSlabByPlan(thr2000: Thr2000Dto | null) {
  if (!thr2000) {
    slabRows.value = [];
    return;
  }
  let cSpec = slabInput.cSpec.trim();
  if (!cSpec) cSpec = `${thr2000.nThickTl}*${thr2000.nWidthTl}`;
  const cSgCode = slabInput.cSgCode.trim() || thr2000.cSgCodeTl || undefined;
  void querySlab({ cStove: "", cSgCode, cSpec, cOrderNo: planInput.cOrderNo.trim() });
}

function querySlabByInput() {
  void querySlab({ cStove: slabInput.cStove.trim(), cSgCode: slabInput.cSgCode.trim(), cSpec: slabInput.cSpec.trim() });
}

/* ---------- 组批 ---------- */
async function doZp() {
  const thr2000 = planCurrent.value;
  if (!thr2000) return;
  const sel = (slabApi.value?.getSelectedRows() ?? []) as Tyd2000[];
  const slabIds = sel.map((x) => x.id).filter((x): x is string => !!x);
  try {
    await hR3000Api.saveZp({
      cPlanId: thr2000.id,
      cLineCode,
      slabIds,
      nFurType: nFurType.value,
      cRemark: zpRemark.value || undefined,
    });
    toast("组批成功！", 2000, "success");
    await queryPlan();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnZp() {
  const thr2000 = planCurrent.value;
  if (!thr2000) {
    toast("请选择日计划！", 2000, "warn");
    return;
  }
  if (slabRows.value.length === 0) return;
  const sel = (slabApi.value?.getSelectedRows() ?? []) as Tyd2000[];
  if (sel.length === 0) {
    toast("请勾选材料明细！", 2000, "warn");
    return;
  }
  askConfirm("是否确认组批？", doZp);
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
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 上下分栏：原 splitContainerControl1 481/1033 ≈ 47% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="47" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">日计划列表</span>
        </div>
        <!-- stackPanel1：创建时间/订单号/钢种 + 查询 -->
        <div class="flex h-9 shrink-0 items-center gap-1.5 border-b border-border/60 px-2">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">创建时间</label>
          <DatePicker
            v-model="planInput.dates"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            placeholder="开始 至 结束"
            class="w-72 shrink-0"
          />
          <label class="shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="planInput.cOrderNo" class="w-36 shrink-0" @keydown.enter="queryPlan" />
          <label class="shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="planInput.cSgCode" class="w-36 shrink-0" @keydown.enter="queryPlan" />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="planLoading" @click="queryPlan">
            <IconSearch class="h-3 w-3" />查询
          </Button>
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

      <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">坯料库明细</span>
        </div>
        <!-- stackPanel2：炉号/钢种/规格 + 查询；组批组：装炉方式/备注 + 组批 -->
        <div class="flex h-9 shrink-0 items-center gap-1.5 border-b border-border/60 px-2">
          <label class="w-8 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="slabInput.cStove" class="w-36 shrink-0" @keydown.enter="querySlabByInput" />
          <label class="shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="slabInput.cSgCode" class="w-36 shrink-0" @keydown.enter="querySlabByInput" />
          <label class="shrink-0 text-xs text-muted-foreground">规格</label>
          <InputText v-model="slabInput.cSpec" class="w-36 shrink-0" @keydown.enter="querySlabByInput" />
          <Button
            variant="outlined"
            class="shrink-0 whitespace-nowrap"
            :loading="slabLoading"
            @click="querySlabByInput"
          >
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <label class="ml-3 shrink-0 text-xs text-muted-foreground">装炉方式</label>
          <Select
            v-model="nFurType"
            :options="furOptions"
            option-label="label"
            option-value="value"
            class="w-28 shrink-0"
          />
          <label class="shrink-0 text-xs text-muted-foreground">备注</label>
          <InputText v-model="zpRemark" class="w-36 shrink-0" />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnZp">组批</Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="slabColDefs"
            :row-data="slabRows"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :pagination="false"
            :animate-rows="false"
            :loading="slabLoading"
            @grid-ready="onSlabReady"
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
