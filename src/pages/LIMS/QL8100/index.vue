<script setup lang="ts">
/** 对应 FrmQL8100（检验结果查询）：DDH.Winforms.LIMS.Forms.FrmQL8100
 *  已接入：frmQL8100Api.query + testItemApi.queryTestItems/querySubItems（动态列字典）
 *  待接入：无
 *  动态列：原 BandedGrid 按 (TypeCode, TestItem) 建 GridBand、子项列 Caption 取 querySubItems；
 *         AG Grid 用列组（ColGroupDef）等价复刻，取值走 valueGetter（P101/P106 原样整数舍入），
 *         合格/不合格底色 = 原 RowCellStyle（绿/红 25% alpha） */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { frmQL8100Api, SampleJudgeResult, type FrmQL8100Dto, type TimeRange } from "@/api/mes4ddh/lims.swagger";
import type { FrmQL8100QueryInputDto } from "@/api/mes4ddh/shr.swagger";
import { testItemApi } from "@/api/mes4ddh/sqm.swagger";

const theme = makeHmxGridTheme();

/* ---------- 查询条件（原 bindingSourceQuery / FrmQL8100QueryInputDto；默认检验时间=今天-7 ~ 明天） ---------- */
function defaultRange(): Date[] {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  a.setDate(a.getDate() - 7);
  const b = new Date();
  b.setDate(b.getDate() + 1);
  b.setHours(0, 0, 0, 0);
  return [a, b];
}
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2 || !dates[0] || !dates[1]) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

const query = reactive({
  cTestNo: "",
  cStove: "",
  cBatch: "",
  cSgSign: "",
  cSgStd: "",
  dates: defaultRange() as Date[] | null,
});

/* fitWidth 估宽：中文字数×13+60（初值，first-data 再 autoSize 收） */
const fw = (h: string) => h.length * 13 + 60;

/* ---------- 静态列（原 gridBand1 16 列，顺序照 band.Columns.Add；CSpec 原 Visible=false） ---------- */
const staticGroup: ColGroupDef = {
  headerName: " ",
  children: [
    { field: "cTestNo", headerName: "委托单号", width: fw("委托单号") },
    { field: "cDelivyStatusCode", headerName: "交货状态代码", width: fw("交货状态代码") },
    { field: "cDeliveryStateDesc", headerName: "交货状态描述", width: fw("交货状态描述") },
    { field: "cStove", headerName: "炉号", width: fw("炉号") },
    { field: "cBatch", headerName: "批号", width: fw("批号") },
    { field: "cSgSign", headerName: "钢种", width: fw("钢种") },
    { field: "cSgStd", headerName: "执行标准", width: fw("执行标准") },
    { field: "cSpec", headerName: "规格", width: fw("规格"), hide: true },
    { field: "thick", headerName: "厚", width: fw("厚") },
    { field: "width", headerName: "宽", width: fw("宽") },
    { field: "len", headerName: "长", width: fw("长") },
    { field: "cJudgeResult", headerName: "最终判定结果", width: fw("最终判定结果") },
    { field: "jyTime", headerName: "检验时间", width: fw("检验时间") },
    { field: "cSampleNo", headerName: "试样号", width: fw("试样号") },
    { field: "cRecheckFlag", headerName: "复验标记", width: fw("复验标记") },
    { field: "nTestTimes", headerName: "试验次数", width: fw("试验次数") },
  ],
};

const rows = ref<FrmQL8100Dto[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const colDefs = ref<(ColDef | ColGroupDef)[]>([staticGroup]);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/* ---------- 动态列（原 InitColumns + CustomUnboundColumnData + RowCellStyle） ---------- */
function resultOf(row: FrmQL8100Dto | undefined | null, code: string) {
  return row?.results?.find((r) => r.subItemCode === code);
}
function judgeClass(code: string) {
  const ok = (params: { data?: unknown }) =>
    resultOf(params.data as FrmQL8100Dto, code)?.judgeResult === SampleJudgeResult.Qualified;
  const ng = (params: { data?: unknown }) =>
    resultOf(params.data as FrmQL8100Dto, code)?.judgeResult === SampleJudgeResult.Unqualified;
  return {
    "!bg-[rgba(0,255,0,0.25)]": ok,
    "!bg-[rgba(255,0,0,0.25)]": ng,
  };
}
function dynCol(testItem: string, code: string, fallbackName: string): ColDef {
  return {
    field: `__col_${testItem}_${code}`,
    headerName: subItemNameMap.value.get(code) || fallbackName,
    width: fw(subItemNameMap.value.get(code) || fallbackName),
    valueGetter: (params) => {
      const res = resultOf(params.data as FrmQL8100Dto, code);
      const v = res?.cTestResult;
      if (v == null || v === "") return "";
      if (code === "P101" || code === "P106") {
        /* 原 RoundHelper.Round(..., 0)：上下屈服固定整数 */
        const n = Number(v);
        return Number.isFinite(n) ? Math.round(n) : v;
      }
      return v;
    },
    cellClassRules: judgeClass(code),
  };
}
const testItemNameMap = ref(new Map<string, string>());
const subItemNameMap = ref(new Map<string, string>());

/** 原 InitColumns：按 (TypeCode, TestItem) 分组建 Band（OrderBy TypeCode 稳定），子项按 SubItemCode 排序 */
function buildGroups(list: FrmQL8100Dto[]): ColGroupDef[] {
  const order: { typeCode: string; testItem: string; subs: { code: string; name: string }[] }[] = [];
  const idx = new Map<string, (typeof order)[number]>();
  for (const row of list) {
    for (const r of row.results ?? []) {
      const tk = `${r.typeCode ?? ""}::${r.testItem ?? ""}`;
      let g = idx.get(tk);
      if (!g) {
        g = { typeCode: r.typeCode ?? "", testItem: r.testItem ?? "", subs: [] };
        idx.set(tk, g);
        order.push(g);
      }
      if (!g.subs.some((s) => s.code === r.subItemCode)) {
        g.subs.push({ code: r.subItemCode ?? "", name: r.subItemName ?? "" });
      }
    }
  }
  order.sort((a, b) => (a.typeCode < b.typeCode ? -1 : a.typeCode > b.typeCode ? 1 : 0));
  return order.map((g) => ({
    headerName: g.testItem ? testItemNameMap.value.get(g.testItem) || g.testItem : " ",
    children: [...g.subs]
      .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0))
      .map((s) => dynCol(g.testItem, s.code, s.name)),
  }));
}

/* ---------- 查询（原 btnQuery_Click：Query → InitColumns → BestFitColumns） ---------- */
async function onQuery() {
  querying.value = true;
  try {
    const input: FrmQL8100QueryInputDto = {
      cTestNo: query.cTestNo.trim(),
      cStove: query.cStove.trim(),
      cBatch: query.cBatch.trim(),
      cSgSign: query.cSgSign.trim(),
      cSgStd: query.cSgStd.trim(),
      completeTime: toTimeRange(query.dates),
    };
    const list = (await frmQL8100Api.query(input)) ?? [];
    const [testItems, subItems] = await Promise.all([testItemApi.queryTestItems(), testItemApi.querySubItems()]);
    testItemNameMap.value = new Map((testItems ?? []).map((t) => [t.testItemCode ?? "", t.testItemName ?? ""]));
    subItemNameMap.value = new Map((subItems ?? []).map((s) => [s.testSubItemCode ?? "", s.testSubItemName ?? ""]));
    rows.value = list;
    colDefs.value = [staticGroup, ...buildGroups(list)];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 dataLayoutControl1，Dock=Top：委托单号/炉号/批号/钢种/执行标准/检验时间） -->
    <div class="shrink-0 border-b border-border/60 px-2 py-1.5">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">委托单号</label>
          <InputText v-model="query.cTestNo" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="query.cStove" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
          <InputText v-model="query.cBatch" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="query.cSgSign" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
          <InputText v-model="query.cSgStd" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">检验时间</label>
          <DatePicker
            v-model="query.dates"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-icon
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1：查询；原网格 OptionsBehavior.Editable=false，无行选择/勾选列） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
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
