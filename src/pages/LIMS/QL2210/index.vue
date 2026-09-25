<script setup lang="ts">
/** 对应 FrmQL2210（炉次过程成分查询）：DDH.Winforms.LIMS.Forms.FrmQL2210
 *  布局：查询区（原 dataLayout 5 项：炉号/钢种/工位/炉次时间 UCTimeRange/产线 UCLine）
 *       + stackPanel1（查询）+ stackPanel2（合格率 LabelControl）→ 数据表格 gvCFRecord
 *  已接入：stoveCFRecordApi.queryProcessRecord（SF.Proxy<IStoveCFRecordAppService>.QueryProcessRecord）/
 *         systemKeyValueApi.querySysKvItemList("A0100:QMYS")（动态元素列）/
 *         tPa1000Api.queryLines（原 ucLine1.RefreshData）
 *  已知偏差：合格率按 .cs 查询后整表计算一次（原 ColumnFilterChanged 读 DataSource 全量，等价不变）；
 *         0.## 舍入以 toFixed(2) 去尾零复刻；工位下拉候选照 .cs 构造函数硬编码（转炉/LF/RH）；
 *         钢种/执行标准列 CAutoJudgeResult 字色以 text 色类复刻；
 *         Mock 侧 stoveCFRecord/queryProcessRecord 已有占位，QMYS 字典走 admin kv 完整 mock */
import { computed, onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { stoveCFRecordApi, SampleJudgeResult, type TimeRange } from "@/api/mes4ddh/lims.swagger";
import { tPa1000Api, type Tpa1000 as LineRow } from "@/api/mes4ddh/shr.swagger";
import { systemKeyValueApi } from "@/api/admin/request";

const theme = makeHmxGridTheme();

/* ---------- 查询条件（原构造：炉次时间 近5天～明天） ---------- */
function defaultDates(): Date[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 5);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  return [start, end];
}
const input = reactive({
  cStove: "",
  cSgSign: "",
  gw: null as string | null,
  createDate: defaultDates() as Date[] | null,
  cLineCode: null as string | null,
});

/* 原构造函数 imageComboBoxEdit1.Items：转炉=BOF / LF / RH（AllowNullInput=True） */
const gwOptions = [
  { label: "转炉", value: "BOF" },
  { label: "LF", value: "LF" },
  { label: "RH", value: "RH" },
];

const lineOptions = ref<{ label: string; value: string }[]>([]);
async function loadLines() {
  try {
    const rows = (await tPa1000Api.queryLines()) ?? [];
    lineOptions.value = (rows as LineRow[])
      .filter((r) => r.cCode != null)
      .map((r) => ({ label: `${r.cCode}-${r.cName ?? ""}`, value: r.cCode! }));
  } catch {
    /* 拦截层已 toast */
  }
}

function isoLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates?.[0]) return undefined;
  return { min: isoLocal(dates[0]), max: dates[1] ? isoLocal(dates[1]) : undefined };
}

/* ---------- 动态元素列（原 Load：QuerySysKvItemList(QMYS) → Caption=CName / FieldName=CCode；汇总已注释不迁） ---------- */
interface ElemCol {
  code: string;
  name: string;
}
const elemCols = ref<ElemCol[]>([]);
async function loadElemCols() {
  try {
    const kv = (await systemKeyValueApi.querySysKvItemList("A0100:QMYS")) ?? [];
    elemCols.value = (kv as { cCode?: string; cName?: string }[])
      .filter((k) => !!k.cCode)
      .map((k) => ({ code: k.cCode!, name: k.cName ?? k.cCode! }));
  } catch {
    /* 拦截层已 toast */
  }
}

/* ---------- 行数据 + 合格率（原 labelControl1） ---------- */
const rows = shallowRef<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const passRate = ref("--");

function elemValueOf(row: any, code: string): number | null {
  const hit = (row?.testResults as { cElmCode?: string; nValue?: number | null }[] | undefined)?.find(
    (t) => t.cElmCode === code,
  );
  return hit?.nValue ?? null;
}

const colDefs = computed<ColDef[]>(() => [
  { field: "cStove", headerName: "炉号", width: 100, pinned: "left" },
  { field: "cSampleNo", headerName: "试样号", width: 110 },
  { field: "cGw", headerName: "工位", width: 70 },
  { field: "cSgSign", headerName: "钢种", width: 90, cellClass: sgCellClass },
  {
    field: "cLineCode",
    headerName: "产线",
    width: 80,
    valueFormatter: (p) => lineOptions.value.find((l) => l.value === p.value)?.label ?? p.value ?? "",
  },
  { field: "cFinalFlag", headerName: "是否最终样", width: 95, valueFormatter: yesNoFmt },
  { field: "cSpec", headerName: "规格", width: 90 },
  { field: "nCount", headerName: "支数", width: 70 },
  { field: "nWeight", headerName: "重量", width: 80 },
  { field: "cJudgeRemark", headerName: "判定备注", width: 130 },
  { field: "dLastTime", headerName: "判定时间", width: 130 },
  { field: "cAutoJudgeResult", headerName: "自动判定结果", width: 105, valueFormatter: sampleJudgeFmt },
  { field: "dTestTime", headerName: "结果录入时间", width: 130 },
  { field: "cSgStd", headerName: "执行标准", width: 110, hide: true, cellClass: sgCellClass },
  ...elemCols.value.map<ColDef>((c) => ({
    field: c.code,
    headerName: c.name,
    width: 110,
    valueGetter: (p) => elemValueOf(p.data, c.code),
  })),
]);

function yesNoFmt(p: ValueFormatterParams) {
  return p.value == null ? "" : Number(p.value) === 1 ? "是" : "否";
}
function sampleJudgeFmt(p: ValueFormatterParams) {
  return (
    ({ 0: "待判", 1: "不需判", 2: "合格", 3: "不合格" } as Record<string, string>)[String(p.value)] ??
    (p.value == null ? "" : String(p.value))
  );
}
/** 原 gvCFRecord_CustomDrawCell：钢种/执行标准列按 CAutoJudgeResult 着色 */
function sgCellClass(p: any) {
  const v = Number(p.data?.cAutoJudgeResult);
  if (v === SampleJudgeResult.Unqualified) return "text-red-600";
  if (v === SampleJudgeResult.None) return "text-blue-600";
  return "";
}

/** 原 btnQuery_Click 合格率：0.## 格式（toFixed(2) 去尾零） */
function fmtRate(n: number) {
  return n.toFixed(2).replace(/\.?0+$/, "");
}
function computePassRate(list: any[]) {
  const c = list.length;
  const q = list.filter((r) => Number(r.cAutoJudgeResult) === SampleJudgeResult.Qualified).length;
  const cs = new Set(list.map((r) => r.cStove)).size;
  const qs = new Set(
    list.filter((r) => Number(r.cAutoJudgeResult) === SampleJudgeResult.Qualified).map((r) => r.cStove),
  ).size;
  const p1 = c === 0 ? 0 : (q * 100) / c;
  const p2 = cs === 0 ? 0 : (qs * 100) / cs;
  passRate.value = `按样= ${q}/${c} = ${fmtRate(p1)}%  按炉= ${qs}/${cs} = ${fmtRate(p2)}%`;
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/* ---------- 查询（原 simpleButton1_Click → SF.Proxy.QueryProcessRecord） ---------- */
async function onQuery() {
  querying.value = true;
  try {
    const data = await stoveCFRecordApi.queryProcessRecord({
      cStove: input.cStove?.trim() || undefined,
      cSgSign: input.cSgSign?.trim() || undefined,
      cLineCode: input.cLineCode || undefined,
      gw: input.gw || undefined,
      range: toTimeRange(input.createDate),
    });
    rows.value = (data as any[]) ?? [];
    computePassRate(rows.value);
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

onMounted(() => {
  void loadLines();
  void loadElemCols();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl：炉号 / 钢种 / 工位 / 炉次时间 / 产线） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="input.cStove" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.cSgSign" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">工位</label>
          <Select
            v-model="input.gw"
            :options="gwOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉次时间</label>
          <DatePicker
            v-model="input.createDate"
            selectionMode="range"
            :manualInput="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            placeholder="开始 至 结束"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
          <Select
            v-model="input.cLineCode"
            :options="lineOptions"
            option-label="label"
            option-value="value"
            show-clear
            filter
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- stackPanel1（查询）+ stackPanel2（合格率 LabelControl） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-4 text-xs text-muted-foreground"
        >合格率：<span class="font-medium text-foreground">{{ passRate }}</span></span
      >
    </div>

    <!-- 数据表格（原 gvCFRecord） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{
          mode: 'multiRow',
          checkboxes: true,
          headerCheckbox: true,
          enableClickSelection: true,
          enableSelectionWithoutKeys: true,
        }"
        :suppress-column-virtualisation="true"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
