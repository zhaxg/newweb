<script setup lang="ts">
/** 对应 FrmTI1208（预矫直信息）：DDH.Winforms.SHR.Forms.APILogViewer.FrmTI1208
 *  已接入：tI1208Api.getListAsync（关键字 + 时间区间；默认 [今天-6天, 今天23:59:59]，原 Today.AddDays(-6) ~ Today.AddDays(1).AddSeconds(-1)）
 *  待接入：编辑弹窗 FrmTI1208_Edit（原窗体内 ShowDialog 二级窗体，保存走 ITI1208AppService.UpdateAsync，
 *         swagger 未生成 tI1208Api.updateAsync；编辑按钮仅保留原「未选行提示」校验后占位）
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
import { tI1208Api, type TiL2me08, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();
const rows = ref<TiL2me08[]>([]);
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
    new Date(now.getFullYear(), now.getMonth(), day - 6),
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

/* ---------- 表格（gridView1 / TiL2me08，Designer 可见 19 列 + 隐藏 2 列） ---------- */
const colDefs: ColDef[] = [
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 112 },
  { colId: "totalPass", field: "totalPass", headerName: "矫直总次数", width: 112 },
  { colId: "currPass", field: "currPass", headerName: "矫直当前次数", width: 112 },
  { colId: "entryTime", field: "entryTime", headerName: "进入时间", width: 112 },
  { colId: "endTime", field: "endTime", headerName: "结束时间", width: 112 },
  { colId: "entryTemp", field: "entryTemp", headerName: "钢板温度", width: 112 },
  { colId: "levelerSpeed", field: "levelerSpeed", headerName: "矫直速度", width: 112 },
  { colId: "bitSpeed", field: "bitSpeed", headerName: "咬入速度", width: 112 },
  { colId: "entryGap", field: "entryGap", headerName: "入口辊缝", width: 112 },
  { colId: "exitGap", field: "exitGap", headerName: "出口辊缝", width: 112 },
  { colId: "entrySideRollGap", field: "entrySideRollGap", headerName: "入口边辊高度", width: 112 },
  { colId: "exitSideRollGap", field: "exitSideRollGap", headerName: "出口边辊高度", width: 112 },
  { colId: "tilt1", field: "tilt1", headerName: "倾斜量", width: 112 },
  { colId: "tilt2", field: "tilt2", headerName: "倾动量", width: 112 },
  { colId: "l2Force", field: "l2Force", headerName: "矫直力", width: 112 },
  { colId: "bendPosition", field: "bendPosition", headerName: "弯辊量", width: 112 },
  { colId: "torqueMotor", field: "torqueMotor", headerName: "扭矩", width: 112 },
  { colId: "emptyFlag", field: "emptyFlag", headerName: "是否空过", width: 112 },
  { colId: "spare", field: "spare", headerName: "预留", width: 112 },
  { colId: "dHandle", field: "dHandle", headerName: "处理时间", width: 112, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "处理结果", width: 112, hide: true },
];

/* 原 btnQuery_Click：GetListAsync(关键字, 时间区间) → 回填 + BestFitColumns */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tI1208Api.getListAsync(keyword.value.trim() || undefined, toTimeRange(dates.value))) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 原 btnEdit_Click：无焦点行 →「请选择修改的信息」；有则开 FrmTI1208_Edit（待接入占位） */
function onEdit() {
  const r = gridApi.value?.getSelectedRows()[0] as TiL2me08 | undefined;
  if (!r) {
    toast("请选择修改的信息", 2000, "warn");
    return;
  }
  toast("编辑弹窗（FrmTI1208_Edit）待接入", 2000, "warn");
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
