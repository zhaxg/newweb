<script setup lang="ts">
/** 对应 FrmTI1214（超快冷信息）：DDH.Winforms.SHR.Forms.APILogViewer.FrmTI1214
 *  已接入：tI1214Api.getListAsync（关键字 + 时间区间；默认 [今天00:00, 今天23:59:59]，原 Today ~ Today.AddDays(1).AddSeconds(-1)，
 *         与其他 TI12xx 页不同——此页 Load 里起点是当天而非今天-6天）
 *  待接入：编辑弹窗 FrmTI1214_Edit（原窗体内 ShowDialog 二级窗体，保存走 ITI1214AppService.UpdateAsync，
 *         swagger 未生成 tI1214Api.updateAsync；编辑按钮仅保留原「未选行提示」校验后占位）
 *  偏差：查询条件与按钮同行、以 placeholder 代替原「关键字/时间区间」LabelControl（ui-rules §6，1–2 个条件） */

import { ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconPencil, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { tI1214Api, type TiL2me14, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();
const rows = ref<TiL2me14[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/* ---------- 查询条件（原 txtText01 关键字 + ucTimeRange1 时间区间） ---------- */
const keyword = ref("");
const dates = ref<Date[] | null>(defaultRange());
function defaultRange(): Date[] {
  const now = new Date();
  const day = now.getDate();
  return [
    new Date(now.getFullYear(), now.getMonth(), day),
    new Date(now.getFullYear(), now.getMonth(), day, 23, 59, 59),
  ];
}
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function isoLocal(d: Date): string {
  const p = pad2;
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}

/* ---------- 表格（gridView1 / TiL2me14，Designer 49 列） ---------- */
const colDefs: ColDef[] = [
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 112 },
  { colId: "steelGrade", field: "steelGrade", headerName: "钢种", width: 112 },
  { colId: "thick", field: "thick", headerName: "厚度", width: 112 },
  { colId: "width", field: "width", headerName: "宽度", width: 112 },
  { colId: "length", field: "length", headerName: "长度", width: 112 },
  { colId: "coolMode", field: "coolMode", headerName: "冷却模式", width: 112 },
  { colId: "startCoolTime", field: "startCoolTime", headerName: "开冷时间", width: 112 },
  { colId: "finishCoolTime", field: "finishCoolTime", headerName: "终冷时间", width: 112 },
  { colId: "rollAveTemp", field: "rollAveTemp", headerName: "轧后平均温度", width: 112 },
  { colId: "rollMaxTemp", field: "rollMaxTemp", headerName: "轧后温度最大值", width: 112 },
  { colId: "rollMinTemp", field: "rollMinTemp", headerName: "轧后温度最小值", width: 112 },
  { colId: "entryAveTemp", field: "entryAveTemp", headerName: "开冷平均温度", width: 112 },
  { colId: "entryMaxTemp", field: "entryMaxTemp", headerName: "开冷最大温度", width: 112 },
  { colId: "entryMinTemp", field: "entryMinTemp", headerName: "开冷最小温度", width: 112 },
  { colId: "targetFinishTemp", field: "targetFinishTemp", headerName: "目标返红温度", width: 112 },
  { colId: "finishAveTemp", field: "finishAveTemp", headerName: "返红平均温度", width: 112 },
  { colId: "finishMaxTemp", field: "finishMaxTemp", headerName: "返红温度最大", width: 112 },
  { colId: "finishMinTemp", field: "finishMinTemp", headerName: "返红温度最小", width: 112 },
  { colId: "scanAveTemp", field: "scanAveTemp", headerName: "扫描高温计平均温度", width: 112 },
  { colId: "scanMaxTemp", field: "scanMaxTemp", headerName: "扫描高温计最大温度", width: 112 },
  { colId: "scanMinTemp", field: "scanMinTemp", headerName: "扫描高温计最小温度", width: 112 },
  { colId: "coolingRate", field: "coolingRate", headerName: "实际冷速", width: 112 },
  { colId: "fluxA", field: "fluxA", headerName: "A区设定流量", width: 112 },
  { colId: "fluxB", field: "fluxB", headerName: "B区设定流量", width: 112 },
  { colId: "actFluxA", field: "actFluxA", headerName: "A区实际流量", width: 112 },
  { colId: "actFluxB", field: "actFluxB", headerName: "B区实际流量", width: 112 },
  { colId: "ratioA", field: "ratioA", headerName: "A区设定水比", width: 112 },
  { colId: "ratioB", field: "ratioB", headerName: "B区设定水比", width: 112 },
  { colId: "actRatioA", field: "actRatioA", headerName: "A区实际水比", width: 112 },
  { colId: "actRatioB", field: "actRatioB", headerName: "B区实际水比", width: 112 },
  { colId: "speed", field: "speed", headerName: "设定辊速", width: 112 },
  { colId: "actSpeed", field: "actSpeed", headerName: "实际辊速", width: 112 },
  { colId: "aspd", field: "aspd", headerName: "设定加速度", width: 112 },
  { colId: "actAspd", field: "actAspd", headerName: "实际加速度", width: 112 },
  { colId: "num", field: "num", headerName: "开启集管组数", width: 112 },
  { colId: "sideSpary", field: "sideSpary", headerName: "侧喷", width: 112 },
  { colId: "midSpary", field: "midSpary", headerName: "中喷", width: 112 },
  { colId: "htsis", field: "htsis", headerName: "头尾遮蔽投入信号", width: 112 },
  { colId: "headUpLength", field: "headUpLength", headerName: "头上长度", width: 112 },
  { colId: "headBotLength", field: "headBotLength", headerName: "头下长度", width: 112 },
  { colId: "headUpCoef", field: "headUpCoef", headerName: "头上系数", width: 112 },
  { colId: "headBotCoef", field: "headBotCoef", headerName: "头下系数", width: 112 },
  { colId: "tailUpLength", field: "tailUpLength", headerName: "尾上长度", width: 112 },
  { colId: "tailBotLength", field: "tailBotLength", headerName: "尾下长度", width: 112 },
  { colId: "tailUpCoef", field: "tailUpCoef", headerName: "尾上系数", width: 112 },
  { colId: "tailBotCoef", field: "tailBotCoef", headerName: "尾下系数", width: 112 },
  { colId: "tempWater", field: "tempWater", headerName: "水温", width: 112 },
  { colId: "pressWater", field: "pressWater", headerName: "水压", width: 112 },
  { colId: "total_flow", field: "total_flow", headerName: "总水量", width: 112 },
];

/* 原 btnQuery_Click：GetListAsync(关键字, 时间区间) → 回填 + BestFitColumns */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tI1214Api.getListAsync(keyword.value.trim() || undefined, toTimeRange(dates.value))) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 原 btnEdit_Click：无焦点行 →「请选择信息」；有则开 FrmTI1214_Edit（待接入占位） */
function onEdit() {
  const r = gridApi.value?.getSelectedRows()[0] as TiL2me14 | undefined;
  if (!r) {
    toast("请选择信息", 2000, "warn");
    return;
  }
  toast("编辑弹窗（FrmTI1214_Edit）待接入", 2000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 stackPanel1：txtText01 + ucTimeRange1 + btnQuery/btnEdit）；ui-rules §6 1–2 个条件与按钮同行、placeholder 提示 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="keyword" placeholder="关键字" class="w-44 shrink-0" @keydown.enter="onQuery" />
      <DatePicker
        v-model="dates"
        selection-mode="range"
        :manual-input="false"
        date-format="yy-mm-dd"
        show-time
        hour-format="24"
        show-icon
        placeholder="时间区间"
        class="w-80 shrink-0"
      />
      <Button variant="outlined" :loading="querying" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
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
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
