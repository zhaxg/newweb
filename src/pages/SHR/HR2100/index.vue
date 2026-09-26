<script setup lang="ts">
/** 对应 FrmHR2100（轧钢日计划查询）：DDH.Winforms.SHR.Forms.FrmHR2100
 *  已接入：hR2000Api.queryThr2000Dtos（批量计划号/计划状态/提料计划号/熔炼号/时间区间）
 *  待接入：无
 *  偏差：默认时间范围为「本月1日 ~ 本月末」，与原 C# Load 一致；cLineCode 取菜单 QueryString（本菜单为空 = 不限产线）；
 *        计划状态下拉原 AddEnum 首项为「全部」（不传 nStatus）；
 *        CCool/CLengthType/CSteelType/CLineCode/CTrimFlag 等编码列原为运行时 CodeFormatter 转文本，此处显示原值（nStatus 已按枚举转文本） */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";

import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  hR2000Api,
  Thr2000StatusEnum,
  type DtoQueryThr2000,
  type Thr2000Dto,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";
import BatchIdInput from "@/pages/Widgets/BatchIdInput/index.vue";
import { parseBatchIds } from "@/pages/Widgets/BatchIdInput/parse";

const theme = makeHmxGridTheme();
const { parts: menuQs } = useMenuQuery();
const cLineCode = menuQs[0] ?? "";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
function monthRange(): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  last.setSeconds(last.getSeconds() - 1);
  return [first, last];
}

const statusOptions = [
  { label: "全部", value: null as number | null },
  { label: "已开启", value: Thr2000StatusEnum.Open as number },
  { label: "已关闭", value: Thr2000StatusEnum.Close as number },
];

const input = reactive({
  orders: "",
  nStatus: null as number | null,
  cOrderNo: "",
  cPieceNo: "",
  dates: monthRange() as Date[] | null,
});

const rows = shallowRef<Thr2000Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

function statusText(p: { value: unknown }) {
  if (p.value == null || p.value === "") return "";
  return Number(p.value) === Thr2000StatusEnum.Close ? "已关闭" : "已开启";
}

const colDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112 },
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序", width: 112 },
  { colId: "cPlanTime", field: "cPlanTime", headerName: "计划日期", width: 112 },
  { colId: "cCool", field: "cCool", headerName: "是否冷坯计划", width: 112 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 112 },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 112 },
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
  { colId: "nPlanZpWgt", field: "nPlanZpWgt", headerName: "计划组批量", width: 112 },
  { colId: "nZpSyWgt", field: "nZpSyWgt", headerName: "剩余组批量", width: 112 },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 112 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态代码", width: 112 },
  { colId: "cRemark", field: "cRemark", headerName: "日计划备注", width: 112 },
  { colId: "cSgCodeTl", field: "cSgCodeTl", headerName: "提料钢种", width: 112 },
  { colId: "cSgStdTl", field: "cSgStdTl", headerName: "提料标准", width: 112 },
  { colId: "nThickTl", field: "nThickTl", headerName: "提料厚度", width: 112 },
  { colId: "nWidthTl", field: "nWidthTl", headerName: "提料宽度", width: 112 },
  { colId: "nLenMinTl", field: "nLenMinTl", headerName: "提料长度最小值", width: 112 },
  { colId: "nLenMaxTl", field: "nLenMaxTl", headerName: "提料长度最大值", width: 112 },
  { colId: "nQuaTl", field: "nQuaTl", headerName: "提料支数", width: 112 },
  { colId: "nWgtUnitTl", field: "nWgtUnitTl", headerName: "提料单支重量", width: 112 },
  { colId: "nWgtTl", field: "nWgtTl", headerName: "提料重量", width: 112 },
  { colId: "nQuaZp", field: "nQuaZp", headerName: "组批支数", width: 112 },
  { colId: "nWgtZp", field: "nWgtZp", headerName: "组批重量", width: 112 },
  { colId: "nQuaFur", field: "nQuaFur", headerName: "入炉支数", width: 112 },
  { colId: "nWgtFur", field: "nWgtFur", headerName: "入炉量", width: 112 },
  { colId: "nQuaRoll", field: "nQuaRoll", headerName: "轧制完成支数", width: 112 },
  { colId: "nWgtRoll", field: "nWgtRoll", headerName: "轧制完成量", width: 112 },
  { colId: "nQuaPlan", field: "nQuaPlan", headerName: "计划收料支数", width: 112 },
  { colId: "nQuaFinish", field: "nQuaFinish", headerName: "收料支数", width: 112 },
  { colId: "nWgtFinish", field: "nWgtFinish", headerName: "收料重量", width: 112 },
  { colId: "nWidthWgt", field: "nWidthWgt", headerName: "边部宽度余量", width: 112 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式:四切", width: 112 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112 },
  { colId: "dStart", field: "dStart", headerName: "开始产出", width: 112 },
  { colId: "dEnd", field: "dEnd", headerName: "最后产出", width: 112 },
  { colId: "cPieceNos", field: "cPieceNos", headerName: "已挂单材料", width: 112 },
  { colId: "id", field: "id", headerName: "主键", width: 112, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 112, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 112, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "TMP2020主键", width: 112, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112, hide: true },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112, hide: true },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112, hide: true },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 112, hide: true },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 112, hide: true },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 112, hide: true },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 112, hide: true },
  { colId: "dJhqTime", field: "dJhqTime", headerName: "交货期", width: 112, hide: true },
  { colId: "cConRemark", field: "cConRemark", headerName: "合同备注", width: 112, hide: true },
  { colId: "cDesignNo", field: "cDesignNo", headerName: "质量设计号", width: 112, hide: true },
  { colId: "cMsc", field: "cMsc", headerName: "冶金规范", width: 112, hide: true },
  { colId: "cMscLineNo", field: "cMscLineNo", headerName: "冶金规范产线号", width: 112, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "计划状态", width: 112, hide: true, valueFormatter: statusText },
  { colId: "cCloseEmp", field: "cCloseEmp", headerName: "关闭人", width: 112, hide: true },
  { colId: "dClose", field: "dClose", headerName: "关闭时间", width: 112, hide: true },
  { colId: "cSourceTl", field: "cSourceTl", headerName: "供坯单位", width: 112, hide: true },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112, hide: true },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 112, hide: true },
  { colId: "cOverstepBl", field: "cOverstepBl", headerName: "短溢装比例", width: 112, hide: true },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112, hide: true },
  { colId: "cShape", field: "cShape", headerName: "形状代码", width: 112, hide: true },
  { colId: "cIsMerge", field: "cIsMerge", headerName: "是否合并提料", width: 112, hide: true },
];

async function query() {
  loading.value = true;
  try {
    const orders = parseBatchIds(input.orders);
    const dto: DtoQueryThr2000 = {
      cLineCode: cLineCode || undefined,
      dTimeRange: toTimeRange(input.dates),
      cOrderNo: input.cOrderNo.trim() || null,
      cOrderNos: orders.length ? orders : [],
      cPieceNo: input.cPieceNo.trim() || null,
      nStatus: input.nStatus ?? undefined,
    };
    rows.value = (await hR2000Api.queryThr2000Dtos(dto)) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <BatchIdInput v-model="input.orders" label="批量计划号" />
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">计划状态</label>
        <Select
          v-model="input.nStatus"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">提料计划号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">熔炼号</label>
        <InputText v-model="input.cPieceNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">时间区间</label>
        <DatePicker
          v-model="input.dates"
          selection-mode="range"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          placeholder="开始 至 结束"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
