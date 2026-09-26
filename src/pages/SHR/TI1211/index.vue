<script setup lang="ts">
/** 对应 FrmTI1211（加热实绩信息）：DDH.Winforms.SHR.Forms.APILogViewer.FrmTI1211
 *  已接入：tI1211Api.getListAsync（关键字 + 时间区间；默认 [今天-6天, 今天23:59:59]，原 Today.AddDays(-6) ~ Today.AddDays(1).AddSeconds(-1)）
 *  待接入：编辑弹窗 FrmTI1211_Edit（原窗体内 ShowDialog 二级窗体，保存走 ITI1211AppService.UpdateAsync，
 *         swagger 未生成 tI1211Api.updateAsync；编辑按钮仅保留原「未选行提示」校验后占位）
 *  偏差：查询条件与按钮同行、以 placeholder 代替原「关键字/时间区间」LabelControl（ui-rules §6，1–2 个条件）；
 *        入/出炉班次（A0000:THR_SHIFT）与班组（A0000:GROUP）走 KV 字典翻译（原 SetCodeFormatterAsync），
 *        种子缺组时回退原值 */

import { onMounted, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconPencil, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { systemKeyValueApi } from "@/api/admin/request";
import { tI1211Api, type TiL2me11, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();
const rows = ref<TiL2me11[]>([]);
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

/* ---------- 列头翻译（原 colIn/OutFurnaceShiftGroup→GROUP，colIn/OutFurnaceShiftNo→THRSHIFT） ---------- */
const kvGroup = new Map<string, string>();
const kvShift = new Map<string, string>();
const kvFmt = (m: Map<string, string>) => (p: ValueFormatterParams) => m.get(String(p.value)) ?? String(p.value ?? "");
onMounted(async () => {
  try {
    for (const x of (await systemKeyValueApi.getSysKvListByGroup("A0000:GROUP")) ?? [])
      kvGroup.set(x.cCode ?? "", x.cName ?? "");
  } catch {
    /* 拦截层已 toast */
  }
  try {
    for (const x of (await systemKeyValueApi.getSysKvListByGroup("A0000:THR_SHIFT")) ?? [])
      kvShift.set(x.cCode ?? "", x.cName ?? "");
  } catch {
    /* 拦截层已 toast */
  }
  gridApi.value?.refreshCells({ force: true });
});

/* ---------- 表格（gridView1 / TiL2me11，Designer 42 列） ---------- */
const colDefs: ColDef[] = [
  { colId: "matNo", field: "matNo", headerName: "材料号", width: 112 },
  { colId: "planNo", field: "planNo", headerName: "计划号", width: 112 },
  { colId: "slabFurTime", field: "slabFurTime", headerName: "板坯装炉时刻", width: 112 },
  { colId: "slabFurBefTemp", field: "slabFurBefTemp", headerName: "板坯装炉前温度", width: 112 },
  { colId: "furNo", field: "furNo", headerName: "加热炉号", width: 112 },
  { colId: "furType", field: "furType", headerName: "加热炉类型", width: 112 },
  {
    colId: "inFurnaceShiftNo",
    field: "inFurnaceShiftNo",
    headerName: "入炉班次",
    width: 112,
    valueFormatter: kvFmt(kvShift),
  },
  {
    colId: "inFurnaceShiftGroup",
    field: "inFurnaceShiftGroup",
    headerName: "入炉班组",
    width: 112,
    valueFormatter: kvFmt(kvGroup),
  },
  {
    colId: "outFurnaceShiftNo",
    field: "outFurnaceShiftNo",
    headerName: "出炉班次",
    width: 112,
    valueFormatter: kvFmt(kvShift),
  },
  {
    colId: "outFurnaceShiftGroup",
    field: "outFurnaceShiftGroup",
    headerName: "出炉班组",
    width: 112,
    valueFormatter: kvFmt(kvGroup),
  },
  { colId: "tapSlabTempAve", field: "tapSlabTempAve", headerName: "出钢时板坯平均温度", width: 112 },
  { colId: "tapSlabTempSrfc", field: "tapSlabTempSrfc", headerName: "出钢时板坯表面温度", width: 112 },
  { colId: "tapSlabTempCt", field: "tapSlabTempCt", headerName: "出钢时板坯中心温度", width: 112 },
  { colId: "outTime", field: "outTime", headerName: "抽出时刻", width: 112 },
  { colId: "outTempAvg", field: "outTempAvg", headerName: "抽出平均温度", width: 112 },
  { colId: "inFurnaceTime", field: "inFurnaceTime", headerName: "在炉内时间", width: 112 },
  { colId: "preHtTempAve", field: "preHtTempAve", headerName: "预热段入口的平均板坯温度", width: 112 },
  { colId: "preHtHotAve", field: "preHtHotAve", headerName: "预热段入口的板坯均热温度", width: 112 },
  { colId: "preHtTempSrf", field: "preHtTempSrf", headerName: "预热段入口的板坯表面温度", width: 112 },
  { colId: "preHtTempCt", field: "preHtTempCt", headerName: "预热段入口的板坯中心温度", width: 112 },
  { colId: "preHtAveTemp", field: "preHtAveTemp", headerName: "在预热段时的平均温度", width: 112 },
  { colId: "preHtFurPerd", field: "preHtFurPerd", headerName: "预热段在炉时间", width: 112 },
  { colId: "ht1SlabTempAve", field: "ht1SlabTempAve", headerName: "加热段1入口板坯平均温度", width: 112 },
  { colId: "ht1SlabHotAve", field: "ht1SlabHotAve", headerName: "加热段1入口板坯均热度", width: 112 },
  { colId: "ht1SlabTempSrfc", field: "ht1SlabTempSrfc", headerName: "加热段1入口板坯表面温度", width: 112 },
  { colId: "ht1SlabTempCt", field: "ht1SlabTempCt", headerName: "加热段1入口板坯中心温度", width: 112 },
  { colId: "ht1AveTemp", field: "ht1AveTemp", headerName: "在加热段1时的平均温度", width: 112 },
  { colId: "ht1InFurPerd", field: "ht1InFurPerd", headerName: "加热段1在炉时段", width: 112 },
  { colId: "ht2SlabTempAve", field: "ht2SlabTempAve", headerName: "加热段2入口板坯平均温度", width: 112 },
  { colId: "ht2SlabHotAve", field: "ht2SlabHotAve", headerName: "加热段2入口板坯均热度", width: 112 },
  { colId: "ht2SlabTempSrfc", field: "ht2SlabTempSrfc", headerName: "加热段2入口板坯表面温度", width: 112 },
  { colId: "ht2SlabTempCt", field: "ht2SlabTempCt", headerName: "加热段2入口板坯中心温度", width: 112 },
  { colId: "ht2AveTemp", field: "ht2AveTemp", headerName: "在加热段2时的平均温度", width: 112 },
  { colId: "ht2InFurPerd", field: "ht2InFurPerd", headerName: "加热段2在炉时段", width: 112 },
  { colId: "eqSlabTempAve", field: "eqSlabTempAve", headerName: "均热段入口板坯平均温度", width: 112 },
  { colId: "eqSlabHotAve", field: "eqSlabHotAve", headerName: "均热段入口板坯均热度", width: 112 },
  { colId: "eqSlabTempSrfc", field: "eqSlabTempSrfc", headerName: "均热段入口板坯表面温度", width: 112 },
  { colId: "eqSlabTempCt", field: "eqSlabTempCt", headerName: "均热段入口板坯中心温度", width: 112 },
  { colId: "eqAveTemp", field: "eqAveTemp", headerName: "均热段时的平均温度", width: 112 },
  { colId: "eqInFurPerd", field: "eqInFurPerd", headerName: "均热段在炉时段", width: 112 },
  { colId: "dSlabFurTime", field: "dSlabFurTime", headerName: "板坯装炉时间", width: 112 },
  { colId: "dOutTime", field: "dOutTime", headerName: "抽出时间", width: 112 },
];

/* 原 btnQuery_Click：GetListAsync(关键字, 时间区间) → 回填 + BestFitColumns */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tI1211Api.getListAsync(keyword.value.trim() || undefined, toTimeRange(dates.value))) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 原 btnEdit_Click：无焦点行 →「请选择信息」；有则开 FrmTI1211_Edit（待接入占位） */
function onEdit() {
  const r = gridApi.value?.getSelectedRows()[0] as TiL2me11 | undefined;
  if (!r) {
    toast("请选择信息", 2000, "warn");
    return;
  }
  toast("编辑弹窗（FrmTI1211_Edit）待接入", 2000, "warn");
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
