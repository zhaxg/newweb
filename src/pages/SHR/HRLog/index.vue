<script setup lang="ts">
/** 对应 FrmHRLog（轧钢日志查询）：DDH.Winforms.SHR.Forms.FrmHRLog
 *  已接入：tPa1000Api.queryLines（产线下拉）/ hRLogApi.queryLogs（10 项查询条件）/ bxApi.handleHRLog（重试接口，取选中行整行回传后重查）
 *  待接入：无
 *  偏差：默认时间范围为「本月1日 ~ 本月末」，与原 C# Load 一致；产线下拉默认取菜单 QueryString（本菜单 ZG01），无则回落列表首项；
 *        重试接口原为 FocusedRowObject 单行、无二次确认，此处以选中行执行并在成功后重查（额外一条结果 toast）；
 *        NL2Status/CReadFlag/CIsCancel 等编码列显示原值 */

import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconRefresh, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";

import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { bxApi, hRLogApi, tPa1000Api, type DtoQueryLog, type ThrLog, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();
const { parts: menuQs } = useMenuQuery();

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

/* 产线下拉（原 CLineCodeTextEdit，queryLines 灌值，默认取菜单 QueryString） */
const lineOptions = ref<{ label: string; value: string }[]>([]);
const lineCode = ref<string>(menuQs[0] ?? "");

const input = reactive({
  cShift: "",
  cGroup: "",
  cOrderNo: "",
  cBatchNo: "",
  cStove: "",
  cPieceNo: "",
  cSgCode: "",
  cSgStd: "",
  dates: monthRange() as Date[] | null,
});

const rows = shallowRef<ThrLog[]>([]);
const loading = ref(false);
const retrying = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 150 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 150 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 150 },
  { colId: "nQua", field: "nQua", headerName: "支数", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 150 },
  { colId: "cDeviceCode", field: "cDeviceCode", headerName: "设备编号", width: 150 },
  { colId: "cGxId", field: "cGxId", headerName: "工序主键", width: 150 },
  { colId: "cIsCancel", field: "cIsCancel", headerName: "是否取消", width: 150 },
  { colId: "cType", field: "cType", headerName: "操作说明", width: 150 },
  { colId: "cShift", field: "cShift", headerName: "操作班次", width: 150 },
  { colId: "cGroup", field: "cGroup", headerName: "操作班组", width: 150 },
  { colId: "cRemark", field: "cRemark", headerName: "备注", width: 150 },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 150 },
  { colId: "nL2Status", field: "nL2Status", headerName: "反馈L2消息状态", width: 150 },
  { colId: "cReadFlag", field: "cReadFlag", headerName: "是否读取", width: 150 },
  { colId: "dReadTime", field: "dReadTime", headerName: "读取时间", width: 150 },
  { colId: "cL2Id", field: "cL2Id", headerName: "L2消息标识", width: 150 },
  { colId: "cL2Code", field: "cL2Code", headerName: "L2消息标识", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 150, hide: true },
  { colId: "cMxId", field: "cMxId", headerName: "THR3010主键", width: 150, hide: true },
  { colId: "cSlabId", field: "cSlabId", headerName: "TYD2000主键", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },
];

function buildDto(): DtoQueryLog {
  return {
    cLineCode: lineCode.value || null,
    cShift: input.cShift.trim() || null,
    cGroup: input.cGroup.trim() || null,
    cOrderNo: input.cOrderNo.trim() || null,
    cBatchNo: input.cBatchNo.trim() || null,
    cStove: input.cStove.trim() || null,
    cPieceNo: input.cPieceNo.trim() || null,
    cSgCode: input.cSgCode.trim() || null,
    cSgStd: input.cSgStd.trim() || null,
    dCreateTimeRange: toTimeRange(input.dates),
  };
}

async function query() {
  loading.value = true;
  try {
    rows.value = (await hRLogApi.queryLogs(buildDto())) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

/* 重试接口（原 btnInter_Click：FocusedRowObject → HandleHRLog，无二次确认，成功后重查） */
async function onRetry() {
  const row = api.value?.getSelectedRows()[0] as ThrLog | undefined;
  if (!row) return;
  retrying.value = true;
  try {
    await bxApi.handleHRLog(row);
    await query();
    toast("接口重试完成", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    retrying.value = false;
  }
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
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">班次</label>
        <InputText v-model="input.cShift" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">班组</label>
        <InputText v-model="input.cGroup" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="input.cPieceNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
        <Select
          v-model="lineCode"
          :options="lineOptions"
          option-label="label"
          option-value="value"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">创建时间</label>
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
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="retrying" @click="onRetry">
          <IconRefresh class="h-3 w-3" />重试接口
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
