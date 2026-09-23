<script setup lang="ts">
/** 对应 FrmHR5310_JC（棒材组批管理）：DDH.Winforms.SHR.Forms.ThrBar.FrmHR5310_JC
 *  已接入：tPa1000Api.queryLines / hR5310JCApi.getThr3010s / addZpInfo / hR2000Api.queryThr2000Dtos
 *  待接入：二级弹窗 FrmHR5400_SelectStove（组批后选炉挂单，AddZpInfo 成功后弹出；win 侧已调通接口，弹窗本体待接入）
 *  偏差：产线下拉默认值 = 菜单 cQueryString（缺省回落产线接口第一项）；
 *        原 comNStatus Designer 候选为 Thr3000StatusEnum，运行时被 AddEnum(Thr5400Status) 覆盖，web 侧按运行时（已组批/未组批）实现 */

import { computed, onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Textarea from "primevue/textarea";
import { IconChevronDown, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import {
  hR2000Api,
  hR5310JCApi,
  tPa1000Api,
  Thr5400Status,
  type QueryHR5310JCDto,
  type Thr2000Dto,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* ---------- 时间范围（原 ucTimeRange1/2，默认本月 1 号 0 点 ~ 下月 1 号前 1 秒） ---------- */
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

/* ---------- 产线下拉（原 CLineCodeTextEdit，ITpa1000AppService.QueryLines；默认产线 = 菜单 cQueryString） ---------- */
const { parts: menuQs } = useMenuQuery();
const lineOptions = ref<{ label: string; value: string }[]>([]);
const lineCode = ref<string>(menuQs[0] ?? "");

/* ---------- 材料明细查询条件（DtoHR5400JcQuery） ---------- */
const matQuery = reactive({
  cStove: "",
  cOrderNo: "",
  cSgCode: "",
  cSgStd: "",
  slabNo: "",
  cBatchNo: "",
  nStatus: Thr5400Status.NotBatch as number | null,
  dates: monthRange() as Date[] | null,
});
const statusOptions = [
  { label: "已组批", value: Thr5400Status.Batch },
  { label: "未组批", value: Thr5400Status.NotBatch },
];

/* ---------- 日计划查询条件（DtoQueryThr2000） ---------- */
const dayQuery = reactive({
  cOrderNo: "",
  orders: "",
  dates: monthRange() as Date[] | null,
});

/* ---------- 批量计划号：原 MemoExEdit 弹出 → 单列 + Dialog（同 HR2000） ----------
   存 dayQuery.orders 为逗号串；查询兼容逗号/换行拆分 */
const ordersDialogOpen = ref(false);
const ordersDraft = ref("");
function parseOrderList(text: string): string[] {
  return text
    .split(/[,，\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
const ordersCount = computed(() => parseOrderList(dayQuery.orders).length);
const ordersDisplay = computed(() => {
  const list = parseOrderList(dayQuery.orders);
  if (!list.length) return "";
  return `${list.length} 个计划号`;
});
function openOrdersDialog() {
  ordersDraft.value = parseOrderList(dayQuery.orders).join("\n");
  ordersDialogOpen.value = true;
}
function applyOrdersDialog() {
  dayQuery.orders = parseOrderList(ordersDraft.value).join(",");
  ordersDialogOpen.value = false;
}
function clearOrdersDialog() {
  ordersDraft.value = "";
}

/* ---------- 上表：材料明细（gridView1 / QueryHR5310JCDto，勾选=Selected） ---------- */
const matRows = ref<QueryHR5310JCDto[]>([]);
const matLoading = ref(false);
const matApi = ref<GridApi | null>(null);
function onMatReady(e: GridReadyEvent) { matApi.value = e.api; }

/* ---------- 下表：日计划（gridView2 / Thr2000Dto，聚焦行=单选） ---------- */
const dayRows = ref<Thr2000Dto[]>([]);
const dayLoading = ref(false);
const dayApi = ref<GridApi | null>(null);
const dayCurrent = ref<Thr2000Dto | null>(null);
function onDayReady(e: GridReadyEvent) { dayApi.value = e.api; }
function onDaySelectionChanged() {
  dayCurrent.value = (dayApi.value?.getSelectedRows()[0] as Thr2000Dto | undefined) ?? null;
}

/* ---------- 列定义 ---------- */
const matColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "cRemark", field: "cRemark", headerName: "备注", width: 112 },
];

const dayColDefs: ColDef[] = [
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序", width: 112 },
  { colId: "cPlanTime", field: "cPlanTime", headerName: "计划日期", width: 112 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140 },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
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
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112 },
  { colId: "cPieceNos", field: "cPieceNos", headerName: "已挂单材料", width: 125 },
  { colId: "cConRemark", field: "cConRemark", headerName: "合同备注", width: 112 },
  /* 以下 Designer 未排 VisibleIndex，以 hide 迁入 */
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "TMP2020主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 112, hide: true },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 112, hide: true },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 112, hide: true },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 112, hide: true },
  { colId: "nLenTq1", field: "nLenTq1", headerName: "套切1", width: 112, hide: true },
  { colId: "nLenTq2", field: "nLenTq2", headerName: "套切2", width: 112, hide: true },
  { colId: "nLenTq3", field: "nLenTq3", headerName: "套切3", width: 112, hide: true },
  { colId: "nLenTq4", field: "nLenTq4", headerName: "套切4", width: 112, hide: true },
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
  { colId: "nWidthWgt", field: "nWidthWgt", headerName: "边部宽度余量", width: 125, hide: true },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式:四切", width: 125, hide: true },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112, hide: true },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 112, hide: true },
  { colId: "cOverstepBl", field: "cOverstepBl", headerName: "短溢装比例", width: 125, hide: true },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112, hide: true },
  { colId: "cShape", field: "cShape", headerName: "形状代码", width: 112, hide: true },
  { colId: "cIsMerge", field: "cIsMerge", headerName: "是否合并提料", width: 125, hide: true },
  { colId: "nQuaFur", field: "nQuaFur", headerName: "入炉支数", width: 112, hide: true },
  { colId: "nWgtFur", field: "nWgtFur", headerName: "入炉量", width: 112, hide: true },
  { colId: "nQuaRoll", field: "nQuaRoll", headerName: "轧制完成支数", width: 125, hide: true },
  { colId: "nWgtRoll", field: "nWgtRoll", headerName: "轧制完成量", width: 112, hide: true },
  { colId: "nQuaPlan", field: "nQuaPlan", headerName: "计划收料支数", width: 125, hide: true },
  { colId: "nQuaFinish", field: "nQuaFinish", headerName: "收料支数", width: 112, hide: true },
  { colId: "nWgtFinish", field: "nWgtFinish", headerName: "收料重量", width: 112, hide: true },
  { colId: "dStart", field: "dStart", headerName: "开始产出", width: 140, hide: true },
  { colId: "dEnd", field: "dEnd", headerName: "最后产出", width: 140, hide: true },
  { colId: "cCool", field: "cCool", headerName: "是否冷坯计划", width: 125, hide: true },
  { colId: "nBc", field: "nBc", headerName: "倍尺", width: 112, hide: true },
  { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 125, hide: true },
];

/* ---------- 查询 ---------- */
async function dataBindThr3010() {
  matLoading.value = true;
  try {
    const list = (await hR5310JCApi.getThr3010s({
      cLineCode: lineCode.value || undefined,
      cStove: matQuery.cStove.trim() || undefined,
      cOrderNo: matQuery.cOrderNo.trim() || undefined,
      cSgCode: matQuery.cSgCode.trim() || undefined,
      cSgStd: matQuery.cSgStd.trim() || undefined,
      slabNo: matQuery.slabNo.trim() || undefined,
      cBatchNo: matQuery.cBatchNo.trim() || undefined,
      nStatus: (matQuery.nStatus ?? undefined) as Thr5400Status | undefined,
      dCreateTimeRange: toTimeRange(matQuery.dates),
    })) ?? [];
    matRows.value = list;
    requestAnimationFrame(() => matApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    matLoading.value = false;
  }
}

async function btnQueryDay() {
  dayLoading.value = true;
  try {
    const orders = parseOrderList(dayQuery.orders);
    const list = (await hR2000Api.queryThr2000Dtos({
      cLineCode: lineCode.value || undefined,
      cOrderNo: dayQuery.cOrderNo.trim() || undefined,
      cOrderNos: orders.length ? orders : undefined,
      dTimeRange: toTimeRange(dayQuery.dates),
    })) ?? [];
    dayRows.value = list;
    dayCurrent.value = null;
    requestAnimationFrame(() => dayApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    dayLoading.value = false;
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

/* ---------- 组批 ---------- */
async function doZp() {
  const sel = (matApi.value?.getSelectedRows() ?? []) as QueryHR5310JCDto[];
  const order = dayCurrent.value;
  if (!order) return;
  const cStoveNos = sel.map((x) => x.cStove).filter((x): x is string => !!x);
  try {
    const thr3000 = await hR5310JCApi.addZpInfo({
      cOrderNo: order.cOrderNo,
      cLineCode: lineCode.value || undefined,
      cStoveNos,
    });
    if (thr3000) {
      // 原 FrmHR5400_SelectStove 二级弹窗：组批生成后选炉挂单（待接入），弹窗内走 addZpJcSj/saveZp
      toast("组批信息已生成；选炉弹窗 FrmHR5400_SelectStove 待接入", 2500, "warn");
    }
    await dataBindThr3010();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnZp() {
  if (matRows.value.length === 0) return;
  const sel = (matApi.value?.getSelectedRows() ?? []) as QueryHR5310JCDto[];
  if (sel.length === 0) {
    toast("请选择材料明细进行组批！", 2000, "warn");
    return;
  }
  const order = dayCurrent.value;
  if (!order) {
    toast("请选择计划信息！", 2000, "warn");
    return;
  }
  askConfirm("是否确认组批所选材料！", doZp);
}

onMounted(async () => {
  try {
    const devices = (await tPa1000Api.queryLines()) ?? [];
    lineOptions.value = devices.map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
    if (!lineCode.value && lineOptions.value.length) lineCode.value = lineOptions.value[0].value;
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 上下主子表：原 splitContainerControl1 SplitterPosition=472/837 ≈ 56% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="56" :minSize="25" class="flex flex-col overflow-hidden">
        <!-- 材料明细查询条件（原 dataLayoutControl1）在上，工具栏在下 -->
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">产线代码</label>
            <Select v-model="lineCode" :options="lineOptions" option-label="label" option-value="value"
              class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
            <InputText v-model="matQuery.cSgStd" class="min-w-0 flex-1" @keydown.enter="dataBindThr3010" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
            <InputText v-model="matQuery.slabNo" class="min-w-0 flex-1" @keydown.enter="dataBindThr3010" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
            <InputText v-model="matQuery.cSgCode" class="min-w-0 flex-1" @keydown.enter="dataBindThr3010" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
            <InputText v-model="matQuery.cOrderNo" class="min-w-0 flex-1" @keydown.enter="dataBindThr3010" />
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
            <DatePicker v-model="matQuery.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
              show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">状态</label>
            <Select v-model="matQuery.nStatus" :options="statusOptions" option-label="label" option-value="value"
              show-clear placeholder="全部" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
            <InputText v-model="matQuery.cStove" class="min-w-0 flex-1" @keydown.enter="dataBindThr3010" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
            <InputText v-model="matQuery.cBatchNo" class="min-w-0 flex-1" @keydown.enter="dataBindThr3010" />
          </div>
        </div>
        <!-- 工具栏在条件区下面：查询靠左，材料明细靠右 -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="matLoading"
            @click="dataBindThr3010">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <span class="ml-auto text-xs font-medium text-muted-foreground">材料明细</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="matColDefs" :row-data="matRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :pagination="false" :animate-rows="false" :loading="matLoading"
            @grid-ready="onMatReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="25" class="flex flex-col overflow-hidden">
        <!-- 日计划查询条件（原 dataLayoutControl2；批量计划号=弹出编辑，同 HR2000） -->
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-20 shrink-0 text-xs text-muted-foreground">提料计划号</label>
            <InputText v-model="dayQuery.cOrderNo" class="min-w-0 flex-1" @keydown.enter="btnQueryDay" />
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-20 shrink-0 text-xs text-muted-foreground">批量计划号</label>
            <div class="flex min-w-0 flex-1 items-center gap-0.5">
              <InputText :model-value="ordersDisplay" readonly class="min-w-0 flex-1" placeholder="批量录入…"
                @click="openOrdersDialog" />
              <Button text class="shrink-0 px-1" aria-label="批量录入计划号" @click="openOrdersDialog">
                <IconChevronDown class="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-20 shrink-0 text-xs text-muted-foreground">时间区间</label>
            <DatePicker v-model="dayQuery.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
              show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
          </div>
        </div>
        <!-- 条件区下工具栏：查询日计划/组批靠左，日计划列表靠右 -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="dayLoading" @click="btnQueryDay">
            <IconSearch class="h-3 w-3" />查询日计划
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnZp">组批</Button>
          <span class="ml-auto text-xs font-medium text-muted-foreground">日计划列表</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="dayColDefs" :row-data="dayRows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false" :animate-rows="false" :loading="dayLoading"
            @grid-ready="onDayReady" @selection-changed="onDaySelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>

    <!-- 批量计划号（原 MemoExEdit 弹出编辑）：逗号/换行分隔 -->
    <Dialog :visible="ordersDialogOpen" modal header="批量计划号"
      :style="{ width: 'min(32rem, calc(100vw - 2rem))' }" @update:visible="ordersDialogOpen = $event">
      <div class="flex flex-col gap-2">
        <p class="text-xs text-muted-foreground">粘贴或输入多个计划号，用逗号或换行分隔（共 {{ ordersCount }} 个）</p>
        <Textarea v-model="ordersDraft" rows="8" class="w-full" placeholder="例如：&#10;JH001,JH002,JH003&#10;JH004" />
      </div>
      <template #footer>
        <Button label="清空" variant="outlined" severity="secondary" @click="clearOrdersDialog" />
        <Button label="取消" variant="outlined" @click="ordersDialogOpen = false" />
        <Button label="确定" @click="applyOrdersDialog" />
      </template>
    </Dialog>

    <!-- ShowYesNo 受控确认 -->
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
