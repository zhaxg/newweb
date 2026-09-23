<script setup lang="ts">
/** 对应 FrmMP3000（订单产出实绩）：DDH.Winforms.SMP.Forms.FrmMP3000
 *  已接入：tmp3000Api.queryTmp2010Dtos（主表查询）/ queryThr4000s（主行聚焦联动子表「轧钢产出实绩」）
 *          + tPa1000Api.queryLines（产线下拉，原 QueryString 为空时显示）
 *  布局：查询条件区 + h-9 查询工具栏；上下 Splitter（原 splitContainerControl1 Horizontal=false,
 *        SplitterPosition 590/1015≈58%）→ 上=主表(gridControl1)、下=GroupControl「轧钢产出实绩」(gridControl3)
 *  查询条件：原 stackPanel1 —— 下发时间 DateStart~DateEnd、产线 comCLineCode、订单号、钢种、执行标准、入库标识
 *  列：主表 32 可见（含 Selected/NStatus；Selected 勾选列改 hide 保留，勾选由 row-selection 呈现）+ 69 hide；子表 60 可见 + 27 hide（列序列头对齐 Designer） */

import { onMounted, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { CellFocusedEvent, ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  tmp3000Api,
  type Tmp2010Dto,
  type Thr4000,
  type InputTmp2010Dto,
  type DtoQuerySlabs,
} from "@/api/mes4ddh/smp.swagger";
import { tPa1000Api } from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: menuQs } = useMenuQuery(); // 原 QueryString（产线代码，非空时隐藏产线下拉）
const showLineSelect = !menuQs;

function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthEnd(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

/* 查询条件（原 stackPanel1） */
const query = ref({
  dates: [monthStart(), monthEnd()] as Date[] | null,
  cOrderNo: "",
  cSgCode: "",
  cSgStd: "",
  cInboundNo: "",
});
const lineOptions = ref<{ label: string; value: string }[]>([]);
const lineCode = ref<string | null>(null);

const rows = ref<Tmp2010Dto[]>([]);
const subRows = ref<Thr4000[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const subApi = ref<GridApi | null>(null);

/* 主表列（gridControl1 / gridView1，绑定实体 Tmp2010Dto）：32 可见 + 69 hide */
const rawMainCols: ColDef[] = [
      { field: "selected", headerName: "选择", width: 149, hide: true },
      { field: "cLineCode", headerName: "产线代码", width: 149 },
      { field: "cOrderNo", headerName: "订单号", width: 149 },
      { field: "nStatus", headerName: "订单状态", width: 149 },
      { field: "cSgCode", headerName: "钢种", width: 149 },
      { field: "cSgStd", headerName: "执行标准", width: 149 },
      { field: "cSpec", headerName: "规格", width: 149 },
      { field: "nNum", headerName: "订货件数", width: 149 },
      { field: "nWgt", headerName: "订单重量", width: 149 },
      { field: "cSteelType", headerName: "钢类", width: 149 },
      { field: "cProdCode", headerName: "品名代码", width: 149 },
      { field: "cDelivyStatusCode", headerName: "交货状态", width: 149 },
      { field: "cCustStdCode", headerName: "加工用途代码", width: 149 },
      { field: "cOrderCustCname", headerName: "订货客户中文名称", width: 149 },
      { field: "dOrderTime", headerName: "订单日期", width: 149 },
      { field: "dJhqTime", headerName: "合同交货期", width: 149 },
      { field: "cConRemark", headerName: "合同备注", width: 149 },
      { field: "cDelivyQtyFlag", headerName: "计重方式", width: 149 },
      { field: "cDeptCode", headerName: "部门编码", width: 149 },
      { field: "cProdName", headerName: "品名名称", width: 149 },
      { field: "nWtMax", headerName: "单量上限", width: 149 },
      { field: "nWtMin", headerName: "单量下限", width: 149 },
      { field: "nWidthWgt", headerName: "边部宽度余量", width: 149 },
      { field: "cTrimFlag", headerName: "切边方式", width: 149 },
      { field: "cFlawDesc", headerName: "探伤等级", width: 149 },
      { field: "cDelivyAddress", headerName: "流向", width: 149 },
      { field: "cTol", headerName: "公差", width: 149 },
      { field: "cOverstepBl", headerName: "短溢装比例", width: 149 },
      { field: "cInboundNo", headerName: "入库标识", width: 149 },
      { field: "cZggyCode", headerName: "轧钢工艺编码", width: 150 },
      { field: "cJrzzgyCode", headerName: "加热轧制工艺编码", width: 150 },
      { field: "cJqgyCode", headerName: "剪切工艺编码", width: 150 },
      { field: "cTlOrderNo", headerName: "提料订单号", width: 149, hide: true },
      { field: "cConNo", headerName: "合同号", width: 149, hide: true },
      { field: "nWgtSy", headerName: "剩余重量", width: 149, hide: true },
      { field: "nThick", headerName: "厚度", width: 149, hide: true },
      { field: "nThickMin", headerName: "厚度下限", width: 149, hide: true },
      { field: "nThickMax", headerName: "厚度上限", width: 149, hide: true },
      { field: "nWidth", headerName: "宽度", width: 149, hide: true },
      { field: "nWidthMin", headerName: "宽度下限", width: 149, hide: true },
      { field: "nWidthMax", headerName: "宽度上限", width: 149, hide: true },
      { field: "nLen", headerName: "长度", width: 149, hide: true },
      { field: "cLengthType", headerName: "长度类型", width: 149, hide: true },
      { field: "nLenMin", headerName: "长度下限", width: 149, hide: true },
      { field: "nLenMax", headerName: "长度上限", width: 149, hide: true },
      { field: "nDbc", headerName: "单倍尺", width: 149, hide: true },
      { field: "cMsc", headerName: "冶金规范", width: 149, hide: true },
      { field: "cPsc", headerName: "产品规范码", width: 149, hide: true },
      { field: "cMscLineNo", headerName: "冶金规范产线号", width: 149, hide: true },
      { field: "cMscLineDesc", headerName: "产线描述", width: 149, hide: true },
      { field: "cWholeBacklog", headerName: "全程工序码", width: 149, hide: true },
      { field: "cWholeBacklogDesc", headerName: "全程工序说明", width: 149, hide: true },
      { field: "cOrderCustNo", headerName: "订货客户编码", width: 149, hide: true },
      { field: "cOrderCustEname", headerName: "订货客户英文名称", width: 149, hide: true },
      { field: "cProductH", headerName: "重点品种", width: 149, hide: true },
      { field: "cOrderTypeCode", headerName: "合同性质QAA期货", width: 149, hide: true },
      { field: "cExportFlag", headerName: "出口标志", width: 149, hide: true },
      { field: "cMatCode", headerName: "物料编码", width: 149, hide: true },
      { field: "cMatName", headerName: "物料名称", width: 149, hide: true },
      { field: "cSlabType", headerName: "自备坯R", width: 149, hide: true },
      { field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 149, hide: true },
      { field: "cWarrantyDesc", headerName: "质保书要求", width: 149, hide: true },
      { field: "cPackCode", headerName: "特殊包装要求", width: 149, hide: true },
      { field: "cOrderProcFlag", headerName: "合同处理标志（", width: 149, hide: true },
      { field: "nFlag", headerName: "计划类型", width: 149, hide: true },
      { field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 149, hide: true },
      { field: "cCustStdDesc", headerName: "加工用途说明", width: 149, hide: true },
      { field: "nApplyCloseStatus", headerName: "1待封锁", width: 149, hide: true },
      { field: "cApplyCloseEmp", headerName: "申请关闭人", width: 149, hide: true },
      { field: "dApplyCloseDt", headerName: "申请关闭时间", width: 149, hide: true },
      { field: "cApplyCloseRemark", headerName: "申请关闭说明", width: 149, hide: true },
      { field: "cDesignNo", headerName: "质量设计号", width: 149, hide: true },
      { field: "cDesignDesc", headerName: "质量设计失败说明", width: 149, hide: true },
      { field: "nSendNum", headerName: "发送次数", width: 149, hide: true },
      { field: "cShape", headerName: "形状代码", width: 149, hide: true },
      { field: "cSlabSource", headerName: "供坯单位", width: 149, hide: true },
      { field: "cTlSgCode", headerName: "炼钢钢种", width: 149, hide: true },
      { field: "cTlSgStd", headerName: "炼钢标准", width: 149, hide: true },
      { field: "nSlabThick", headerName: "钢坯厚度", width: 149, hide: true },
      { field: "nSlabWidth", headerName: "钢坯宽度", width: 149, hide: true },
      { field: "nSlabLenMin", headerName: "钢坯长度最小值", width: 149, hide: true },
      { field: "nSlabLenMax", headerName: "钢坯长度最大值", width: 149, hide: true },
      { field: "nSlabQua", headerName: "钢坯支数", width: 149, hide: true },
      { field: "nWgtMeter", headerName: "钢坯米单重", width: 149, hide: true },
      { field: "nWgtUnit", headerName: "钢坯单支重量", width: 149, hide: true },
      { field: "nRate", headerName: "理论成材率", width: 149, hide: true },
      { field: "nSlabWgt", headerName: "坯料重量", width: 149, hide: true },
      { field: "nSlabWgtSy", headerName: "坯料剩余重量", width: 149, hide: true },
      { field: "cSlabRemark", headerName: "提料备注", width: 149, hide: true },
      { field: "nTlStatus", headerName: "提料状态", width: 149, hide: true },
      { field: "cTlRemark", headerName: "提料失败说明", width: 149, hide: true },
      { field: "cTlName", headerName: "提料操作人", width: 149, hide: true },
      { field: "dTlTime", headerName: "提料时间", width: 149, hide: true },
      { field: "cTlOrderFlag", headerName: "是否提料订单", width: 149, hide: true },
      { field: "cCcmCode", headerName: "连铸机编码", width: 149, hide: true },
      { field: "nSfpj", headerName: "评审状态", width: 149, hide: true },
      { field: "cPjName", headerName: "评审人", width: 149, hide: true },
      { field: "dPjTime", headerName: "评审时间", width: 149, hide: true },
      { field: "cPjRemark", headerName: "评审失败原因", width: 149, hide: true },
      { field: "cSlabSize", headerName: "坯料规格", width: 149, hide: true },
      { field: "cStNo", headerName: "炼钢工艺卡", width: 149, hide: true },
];
/** Selected（选择）列 = 原勾选列：改由 AG Grid row-selection 复选框呈现，原列以 hide:true 保留在列面板（ui-rules §7） */
const colDefs = ref<ColDef[]>(rawMainCols);

/* 子表列（groupControl1「轧钢产出实绩」内 gridControl3 / gridView3，绑定实体 Thr4000）：60 可见 + 27 hide */
const subColDefs = ref<ColDef[]>([
      { field: "cLineCode", headerName: "产线代码", width: 149 },
      { field: "cOrderNo", headerName: "订单号", width: 149 },
      { field: "cBatchNo", headerName: "批号", width: 149 },
      { field: "cStove", headerName: "炉号", width: 149 },
      { field: "cPieceNo", headerName: "件次号", width: 149 },
      { field: "cSgCode", headerName: "钢种", width: 149 },
      { field: "cSgStd", headerName: "执行标准", width: 149 },
      { field: "cSpec", headerName: "规格", width: 149 },
      { field: "nQua", headerName: "支数", width: 149 },
      { field: "nWgt", headerName: "重量", width: 149 },
      { field: "cTrimFlag", headerName: "切边方式", width: 149 },
      { field: "cInboundNo", headerName: "入库标识", width: 149 },
      { field: "cEngMinThick", headerName: "厚度下偏差", width: 149 },
      { field: "cEngMaxThick", headerName: "厚度上偏差", width: 149 },
      { field: "cEngMinWidth", headerName: "宽度下偏差", width: 149 },
      { field: "cEngMaxWidth", headerName: "宽度上偏差", width: 149 },
      { field: "cEngMinLen", headerName: "长度下偏差", width: 149 },
      { field: "cEngMaxLen", headerName: "长度上偏差", width: 149 },
      { field: "cCustName", headerName: "客户名称", width: 149 },
      { field: "cSteelType", headerName: "钢种大类", width: 149 },
      { field: "cDelivyStatusCode", headerName: "交货状态代码", width: 149 },
      { field: "cCustStdCode", headerName: "加工用途代码", width: 149 },
      { field: "cPieceNoSlab", headerName: "坯料件次号", width: 149 },
      { field: "cSgCodeSlab", headerName: "坯料钢种", width: 149 },
      { field: "cSgStdSlab", headerName: "坯料执行标准", width: 149 },
      { field: "cSpecSlab", headerName: "坯料规格", width: 149 },
      { field: "nQuaSlab", headerName: "坯料支数", width: 149 },
      { field: "nWgtSlab", headerName: "坯料重量", width: 149 },
      { field: "nFurType", headerName: "装炉方式", width: 149 },
      { field: "cFurCode", headerName: "加热炉编号", width: 149 },
      { field: "cRollCode", headerName: "轧机编号", width: 149 },
      { field: "dFinish", headerName: "完成时间", width: 149 },
      { field: "cFinishShift", headerName: "完成班次", width: 149 },
      { field: "cFinishGroup", headerName: "完成班组", width: 149 },
      { field: "cSurfaceResult", headerName: "表检结果", width: 149 },
      { field: "dSurfaceTime", headerName: "表检时间", width: 149 },
      { field: "cSurfaceUser", headerName: "表检人", width: 149 },
      { field: "cSurfaceRemark", headerName: "表检说明", width: 149 },
      { field: "cRespDept", headerName: "责任部门", width: 149 },
      { field: "cFaceHandleAdvice", headerName: "处置意见", width: 149 },
      { field: "cSampleLotNo", headerName: "试批号", width: 149 },
      { field: "cSampleLotNoSlab", headerName: "坯料试批号", width: 149 },
      { field: "cQmHandleDesc", headerName: "处置注释", width: 149 },
      { field: "nStatus", headerName: "入库状态", width: 149 },
      { field: "cStoreCode", headerName: "库区号", width: 149 },
      { field: "cStackNo", headerName: "垛位号", width: 149 },
      { field: "cStackNum", headerName: "层号", width: 149 },
      { field: "cFlawDesc", headerName: "探伤等级", width: 149 },
      { field: "cDelivyAddress", headerName: "流向", width: 149 },
      { field: "cProdCode", headerName: "品名", width: 149 },
      { field: "cWgtToler", headerName: "重量偏差等级", width: 149 },
      { field: "nOrderThick", headerName: "合同厚度", width: 149 },
      { field: "nOrderWidth", headerName: "合同宽度", width: 149 },
      { field: "cOrderLenType", headerName: "合同长度类型", width: 149 },
      { field: "nOrderLenMax", headerName: "合同长度上限", width: 149 },
      { field: "nOrderLenMin", headerName: "合同长度下限", width: 149 },
      { field: "nOrderLen", headerName: "合同长度", width: 149 },
      { field: "nCalWgt", headerName: "理重", width: 149 },
      { field: "cPrint", headerName: "喷印完成标记", width: 149 },
      { field: "cSlCode", headerName: "剪切线代码", width: 149 },
      { field: "nThick", headerName: "厚度", width: 149, hide: true },
      { field: "nWidth", headerName: "宽度", width: 149, hide: true },
      { field: "nLen", headerName: "长度", width: 149, hide: true },
      { field: "cMatCode", headerName: "物料编码", width: 149, hide: true },
      { field: "cMatName", headerName: "物料描述", width: 149, hide: true },
      { field: "cLengthType", headerName: "长度类型", width: 149, hide: true },
      { field: "nLenMin", headerName: "长度下限", width: 149, hide: true },
      { field: "nLenMax", headerName: "长度上限", width: 149, hide: true },
      { field: "cCustCode", headerName: "客户编码", width: 149, hide: true },
      { field: "dDeliveryDate", headerName: "交货日期", width: 149, hide: true },
      { field: "dOrdDate", headerName: "订单日期", width: 149, hide: true },
      { field: "cSpecReqText", headerName: "客户特殊要求", width: 149, hide: true },
      { field: "cConNo", headerName: "合同号", width: 149, hide: true },
      { field: "cOrderCustCname", headerName: "订货客户中文名称", width: 149, hide: true },
      { field: "cConsigneeCustCname", headerName: "收货客户中文名称", width: 149, hide: true },
      { field: "nThickSlab", headerName: "坯料厚度", width: 149, hide: true },
      { field: "nWidthSlab", headerName: "坯料宽度", width: 149, hide: true },
      { field: "nLenSlab", headerName: "坯料长度", width: 149, hide: true },
      { field: "cMatCodeSlab", headerName: "坯料物料编码", width: 149, hide: true },
      { field: "cMatNameSlab", headerName: "坯料物料名称", width: 149, hide: true },
      { field: "cFinishEmp", headerName: "收料完成人", width: 149, hide: true },
      { field: "cConfirmStatus", headerName: "收料状态", width: 149, hide: true },
      { field: "cConfirmShift", headerName: "收料班次", width: 149, hide: true },
      { field: "cConfirmGroup", headerName: "收料班组", width: 149, hide: true },
      { field: "cConfirmEmp", headerName: "收料完成人", width: 149, hide: true },
      { field: "dConfirm", headerName: "收料完成时间", width: 149, hide: true },
      { field: "selected", headerName: "选择", width: 149, hide: true },
]);

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }
function onSubGridReady(e: GridReadyEvent) { subApi.value = e.api; }

/* 产线下拉（原 QueryLines → comCLineCode，CName/CCode；Load: SelectedIndex = 1） */
async function loadLines() {
  if (!showLineSelect) return;
  try {
    const list = (await tPa1000Api.queryLines()) ?? [];
    lineOptions.value = list
      .filter((x) => x.cCode != null)
      .map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode as string }));
    lineCode.value = lineOptions.value[1]?.value ?? lineOptions.value[0]?.value ?? null;
  } catch {
    /* 拦截层已 toast */
  }
}

async function onQuery() {
  querying.value = true;
  try {
    const input: InputTmp2010Dto & { cInboundNo?: string | null } = {
      dTimeStart: query.value.dates?.[0]?.toISOString(),
      dTimeEnd: query.value.dates?.[1]?.toISOString(),
      cOrderNo: query.value.cOrderNo,
      cLineCode: menuQs || lineCode.value || undefined,
      cSgCode: query.value.cSgCode,
      cSgStd: query.value.cSgStd,
      cInboundNo: query.value.cInboundNo,
    };
    rows.value = (await tmp3000Api.queryTmp2010Dtos(input)) ?? [];
    subRows.value = [];
    requestAnimationFrame(() => {
      gridApi.value?.autoSizeAllColumns();
      subApi.value?.autoSizeAllColumns();
    });
    if (!rows.value.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 原 gridView1_FocusedRowObjectChanged → QueryThr4000s 联动子表 */
async function onCellFocused(e: CellFocusedEvent) {
  if (e.rowIndex == null) return;
  const row = gridApi.value?.getDisplayedRowAtIndex(e.rowIndex)?.data as Tmp2010Dto | undefined;
  if (!row) return;
  try {
    const input: DtoQuerySlabs = { cOrderNo: row.cOrderNo ?? undefined, cLineCode: row.cLineCode ?? undefined };
    subRows.value = (await tmp3000Api.queryThr4000s(input)) ?? [];
    requestAnimationFrame(() => subApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(() => { void loadLines(); });
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 stackPanel1：7 控件 / 6 条件，日期范围 col-span-2） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">下发时间</label>
        <DatePicker v-model="query.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
      </div>
      <div v-if="showLineSelect" class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">产线</label>
        <Select v-model="lineCode" :options="lineOptions" option-label="label" option-value="value" show-clear
          filter placeholder="选择产线" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="query.cOrderNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="query.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="query.cSgStd" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
        <InputText v-model="query.cInboundNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1 内 btnQuery 查询） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 主体（原 splitContainerControl1：上下分栏 590/1015≈58%） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="58" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :pagination="false" :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :loading="querying" @grid-ready="onGridReady" @cell-focused="onCellFocused"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="42" :minSize="20" class="flex flex-col overflow-hidden">
        <!-- GroupControl「轧钢产出实绩」纯标题分区头 → h-8 -->
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">轧钢产出实绩</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :pagination="false" :default-col-def="hmxDefaultColDef" :column-defs="subColDefs" :row-data="subRows"
            @grid-ready="onSubGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
