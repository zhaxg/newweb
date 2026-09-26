<script setup lang="ts">
/** 对应 FrmTI1070（定尺剪余量判断）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1070
 *  已接入：tI1070Api.queryDS（原 dpc.Proxy<ITI1070AppService>().QueryDS(DtoTi1070Query)）
 *  待接入：无
 *  偏差：原查询无校验（照原样，不做前端必填检查）；默认时间范围取原 Load 值 [今天 00:00, 明天 00:00]；
 *        原 Selected 勾选列以 hide:true 保留（ui-rules §7），勾选由 AG Grid row-selection 复选框呈现；
 *        原 gridView1 页脚 CSonNo 计数汇总（SUM={0:0.##} 条）以底部统计条呈现；
 *        列宽原 Designer 一律 112，此处按列头估宽 + 首帧自适应列宽接管 */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { tI1070Api, type DtoTi1070Query, type TimeRange, type Ti1070Dto } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
/* 原 FrmTI1070_Load：new TimeRange(DateTime.Now.Date, DateTime.Now.AddDays(1).Date) */
function defaultRange(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ];
}

/* 查询条件（原 bscTi1070QueryDto：ucTimeRange1 创建时间 / textEdit1 材料号 / textEdit2 组批号 / textEdit3 钢种） */
const input = reactive({
  dates: defaultRange() as Date[] | null,
  slabNo: "",
  cZpNo: "",
  cCardNo: "",
});

const rows = shallowRef<Ti1070Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

/* 列集 = Designer gridView1 的 11 列（顺序按 VisibleIndex），无隐藏业务列 */
const colDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 86, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 112 },
  { colId: "slabNo", field: "slabNo", headerName: "材料号", width: 99 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 86 },
  { colId: "cSonNo", field: "cSonNo", headerName: "子板号", width: 99 },
  { colId: "cZpNo", field: "cZpNo", headerName: "组批号", width: 99 },
  { colId: "dThick", field: "dThick", headerName: "厚", width: 73, minWidth: 73 },
  { colId: "dPlanLen", field: "dPlanLen", headerName: "长1(计划)", width: 138 },
  { colId: "dSjLen", field: "dSjLen", headerName: "长2(实际)", width: 138 },
  { colId: "dReAmount", field: "dReAmount", headerName: "余量(mm)", width: 138 },
  { colId: "dReAmountT", field: "dReAmountT", headerName: "余量吨位", width: 112 },
];

/* 原 btnQuery_Click：ShowLoadingPanel → QueryDS(dto) → 回填 + BestFitColumns（无前置校验） */
async function query() {
  loading.value = true;
  try {
    const dto: DtoTi1070Query = {
      timeRange: toTimeRange(input.dates),
      slabNo: input.slabNo.trim() || null,
      cZpNo: input.cZpNo.trim() || null,
      cCardNo: input.cCardNo.trim() || null,
    };
    rows.value = (await tI1070Api.queryDS(dto)) ?? [];
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
    <!-- 查询条件区（原 stackPanel1：4 个条件 + 查询按钮同一行） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
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
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">材料号</label>
        <InputText v-model="input.slabNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批号</label>
        <InputText v-model="input.cZpNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cCardNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>

    <!-- 主表（gridControl1 / gridView1，绑定实体 Ti1070Dto） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{
          mode: 'multiRow',
          checkboxes: true,
          headerCheckbox: true,
          enableClickSelection: true,
          enableSelectionWithoutKeys: true,
        }"
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <!-- 底部统计（原 gridView1 页脚 CSonNo 计数汇总「SUM=x 条」） -->
    <div class="flex h-7 shrink-0 items-center gap-2 border-t border-border/60 px-3">
      <span class="text-xs text-muted-foreground">SUM={{ rows.length }} 条</span>
    </div>
  </div>
</template>
