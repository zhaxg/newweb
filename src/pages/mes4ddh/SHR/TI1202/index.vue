<script setup lang="ts">
/** 对应 FrmTI1202（轧制信息）：DDH.Winforms.SHR.Forms.APILogViewer.FrmTI1202
 *  已接入：tI1202Api.getListAsync（关键字 + 时间区间；默认 [今天-6天, 今天23:59:59]，原 Today.AddDays(-6) ~ Today.AddDays(1).AddSeconds(-1)）
 *  待接入：编辑弹窗 FrmTI1202_Edit（原窗体内 ShowDialog 二级窗体，保存走 ITI1202AppService.UpdateAsync，
 *         swagger 未生成 tI1202Api.updateAsync；编辑按钮仅保留原「未选行提示」校验后占位）
 *  偏差：查询条件与按钮同行、以 placeholder 代替原「关键字/时间区间」LabelControl（ui-rules §6，1–2 个条件）；
 *        责任者A/B（A0000:ZGAUTHOR）/班组（A0000:GROUP）/班次（A0000:THR_SHIFT）走 KV 字典翻译
 *        （原 SetCodeFormatterAsync），种子缺组时回退原值 */

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
import { tI1202Api, type TiL2me02, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();
const rows = ref<TiL2me02[]>([]);
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

/* ---------- 列头翻译（原 colRmAuthorA/B·colFmAuthorA/B→ZGAUTHOR，colShiftGroup→GROUP，colShiftNo→THRSHIFT） ---------- */
const kvAuthor = new Map<string, string>();
const kvGroup = new Map<string, string>();
const kvShift = new Map<string, string>();
const kvFmt = (m: Map<string, string>) => (p: ValueFormatterParams) => m.get(String(p.value)) ?? String(p.value ?? "");
onMounted(async () => {
  try {
    for (const x of (await systemKeyValueApi.getSysKvListByGroup("A0000:ZGAUTHOR")) ?? [])
      kvAuthor.set(x.cCode ?? "", x.cName ?? "");
  } catch {
    /* 拦截层已 toast */
  }
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

/* ---------- 表格（gridView1 / TiL2me02，Designer 62 列） ---------- */
const colDefs: ColDef[] = [
  { colId: "plateNo", field: "plateNo", headerName: "钢板号", width: 112 },
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 112 },
  { colId: "planNo", field: "planNo", headerName: "计划号", width: 112 },
  { colId: "slabStatus", field: "slabStatus", headerName: "BD板坯标识", width: 112 },
  { colId: "standNo", field: "standNo", headerName: "机架号", width: 112 },
  { colId: "steelGrade", field: "steelGrade", headerName: "牌号", width: 112 },
  { colId: "productCode", field: "productCode", headerName: "产品代码", width: 112 },
  { colId: "crCode", field: "crCode", headerName: "CR代码", width: 112 },
  { colId: "rmPass", field: "rmPass", headerName: "粗轧总轧制道次数", width: 112 },
  { colId: "fmPass", field: "fmPass", headerName: "精轧总轧制道次数", width: 112 },
  { colId: "rollingStatus", field: "rollingStatus", headerName: "误轧制标记", width: 112 },
  { colId: "exitThick", field: "exitThick", headerName: "轧制厚度（计算）", width: 112 },
  { colId: "exitWidth", field: "exitWidth", headerName: "轧制宽度（计算）", width: 112 },
  { colId: "exitLength", field: "exitLength", headerName: "轧制长度（计算）", width: 112 },
  { colId: "operateUserCode", field: "operateUserCode", headerName: "轧制操作人员代码（改规标记1）", width: 112 },
  { colId: "crownMark", field: "crownMark", headerName: "钢板凸度（实绩标记)", width: 112 },
  { colId: "meaThickWs", field: "meaThickWs", headerName: "厚度（工作侧）测厚仪", width: 112 },
  { colId: "meaThickDs", field: "meaThickDs", headerName: "厚度（传动侧）测厚仪", width: 112 },
  { colId: "hsbExitTempAvg", field: "hsbExitTempAvg", headerName: "除鳞后温度（平均）", width: 112 },
  { colId: "hsbExitTempMax", field: "hsbExitTempMax", headerName: "除鳞后温度（最大）", width: 112 },
  { colId: "rmEntTempCal", field: "rmEntTempCal", headerName: "粗轧开轧温度（计算）", width: 112 },
  { colId: "rmEntTempAvg", field: "rmEntTempAvg", headerName: "粗轧开轧温度（测量平均）", width: 112 },
  { colId: "rmEntTempMin", field: "rmEntTempMin", headerName: "粗轧开轧温度（测量最小）", width: 112 },
  { colId: "rmEntTempMax", field: "rmEntTempMax", headerName: "粗轧开轧温度（测量最大）", width: 112 },
  { colId: "rmEntTempDev", field: "rmEntTempDev", headerName: "粗轧开轧温度（测量偏差）", width: 112 },
  { colId: "rmExitTempCal", field: "rmExitTempCal", headerName: "粗轧终轧温度（计算）", width: 112 },
  { colId: "rmExitTempAvg", field: "rmExitTempAvg", headerName: "粗轧终轧温度（测量平均）", width: 112 },
  { colId: "rmExitTempMin", field: "rmExitTempMin", headerName: "粗轧终轧温度（测量最小）", width: 112 },
  { colId: "rmExitTempMax", field: "rmExitTempMax", headerName: "粗轧终轧温度（测量最大）", width: 112 },
  { colId: "rmExitTempDev", field: "rmExitTempDev", headerName: "粗轧终轧温度（测量偏差）", width: 112 },
  { colId: "rmEntThick", field: "rmEntThick", headerName: "粗轧开始厚度（计算）", width: 112 },
  { colId: "fmEntTempCal", field: "fmEntTempCal", headerName: "精轧开轧温度（计算）", width: 112 },
  { colId: "fmEntTempAvg", field: "fmEntTempAvg", headerName: "精轧开轧温度（测量平均）", width: 112 },
  { colId: "fmEntTempMin", field: "fmEntTempMin", headerName: "精轧开轧温度（测量最小）", width: 112 },
  { colId: "fmEntTempMax", field: "fmEntTempMax", headerName: "精轧开轧温度（测量最大）", width: 112 },
  { colId: "fmEntTempDev", field: "fmEntTempDev", headerName: "精轧开轧温度（测量偏差）", width: 112 },
  { colId: "fmExitTempCal", field: "fmExitTempCal", headerName: "精轧终轧温度（计算）", width: 112 },
  { colId: "fmExitTempAvg", field: "fmExitTempAvg", headerName: "精轧终轧温度（测量平均）", width: 112 },
  { colId: "fmExitTempMin", field: "fmExitTempMin", headerName: "精轧终轧温度（测量最小）", width: 112 },
  { colId: "fmExitTempMax", field: "fmExitTempMax", headerName: "精轧终轧温度（测量最大）", width: 112 },
  { colId: "fmExitTempDev", field: "fmExitTempDev", headerName: "精轧终轧温度（测量偏差）", width: 112 },
  { colId: "fmEntThick", field: "fmEntThick", headerName: "精轧开始厚度（计算）", width: 112 },
  { colId: "firstConThick", field: "firstConThick", headerName: "第一阶段控制轧制点厚度", width: 112 },
  { colId: "secondConThick", field: "secondConThick", headerName: "第二阶段控制轧制点厚度", width: 112 },
  { colId: "firstContTemp", field: "firstContTemp", headerName: "第一阶段控制轧制点温度", width: 112 },
  { colId: "secondConTemp", field: "secondConTemp", headerName: "第二阶段控制轧制点温度", width: 112 },
  { colId: "thickHp", field: "thickHp", headerName: "钢板测厚仪中部厚度", width: 112 },
  { colId: "broadbef", field: "broadbef", headerName: "展宽轧制前厚度", width: 112 },
  { colId: "broadaft", field: "broadaft", headerName: "展宽轧制后厚度", width: 112 },
  { colId: "shiftNo", field: "shiftNo", headerName: "班次", width: 112, valueFormatter: kvFmt(kvShift) },
  { colId: "shiftGroup", field: "shiftGroup", headerName: "班组", width: 112, valueFormatter: kvFmt(kvGroup) },
  { colId: "productTime", field: "productTime", headerName: "生产时间", width: 112 },
  { colId: "author", field: "author", headerName: "责任者", width: 112 },
  { colId: "slabWeight", field: "slabWeight", headerName: "板坯实际重量", width: 112 },
  { colId: "rmAuthorA", field: "rmAuthorA", headerName: "粗轧责任者A", width: 112, valueFormatter: kvFmt(kvAuthor) },
  { colId: "rmAuthorB", field: "rmAuthorB", headerName: "粗轧责任者B", width: 112, valueFormatter: kvFmt(kvAuthor) },
  { colId: "fmAuthorA", field: "fmAuthorA", headerName: "精轧责任者A", width: 112, valueFormatter: kvFmt(kvAuthor) },
  { colId: "fmAuthorB", field: "fmAuthorB", headerName: "精轧责任者B", width: 112, valueFormatter: kvFmt(kvAuthor) },
  { colId: "dDischargeTime", field: "dDischargeTime", headerName: "出炉时间", width: 112 },
  { colId: "dRollingTimeStart", field: "dRollingTimeStart", headerName: "轧制开始时间", width: 112 },
  { colId: "dRollingTimeEnd", field: "dRollingTimeEnd", headerName: "轧制结束时间", width: 112 },
  { colId: "dProductTime", field: "dProductTime", headerName: "生产时间", width: 112 },
];

/* 原 btnQuery_Click：GetListAsync(关键字, 时间区间) → 回填 + BestFitColumns */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tI1202Api.getListAsync(keyword.value.trim() || undefined, toTimeRange(dates.value))) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 原 btnEdit_Click：无焦点行 →「请选择修改的信息」；有则开 FrmTI1202_Edit（待接入占位） */
function onEdit() {
  const r = gridApi.value?.getSelectedRows()[0] as TiL2me02 | undefined;
  if (!r) {
    toast("请选择修改的信息", 2000, "warn");
    return;
  }
  toast("编辑弹窗（FrmTI1202_Edit）待接入", 2000, "warn");
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
