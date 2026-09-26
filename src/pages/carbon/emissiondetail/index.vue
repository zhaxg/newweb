<script setup lang="ts">
/**
 * 对应线上「排放明细」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/emissiondetail）
 *
 * **这是「列在接口里动态给」的宽表**，不能套 ListPage 的静态 columns：
 * 每行是 `{reportDate, companyName, indicators:[{key,name,value}]}`，34 列由 `indicators[].name`
 * 透视出来（线上列头 34 根，与 indicators 数量一致、顺序一致，实测核对过）。
 * 故本页独立写：列在运行时按 indicators 生成，单位按指标名补（见 `headerOf`）。
 *
 * 已接入：POST /business/emissionRecords/company/details（分页 + 时间区间，按 reportDate 过滤）
 *   · 线上请求体是 `{startTime, endTime, pageNum, pageSize}`，本页统一用全站的 `currentPage/pageSize`
 *     （参数名不同只影响我们自己的 mock，没有对应真后端）；
 *   · 时间区间默认不带 → 返回全部行（线上默认当月，带了反而会把种子筛空）。
 * 待接入：
 *   · **「工序层级」**：线上是 radio 切换、切换**不发请求**（实测），DOM 里是第二张同结构的表，
 *     当前 0 行且指标列未单独捕获 —— 本页切过去显示同样的列头、行数为 0，与线上空表一致；
 *     等拿到它的指标集再拆。
 */
import { computed, onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import SelectButton from "primevue/selectbutton";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent, GridReadyEvent, GridApi } from "ag-grid-community";
import { IconRotateClockwise, IconSearch } from "@tabler/icons-vue";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { carbonQuery } from "@/api/carbon/queries";
import CarbonPager from "../CarbonPager.vue";

interface Indicator {
  key: string;
  name: string;
  value: string;
}
interface DetailRow {
  reportDate: string;
  companyName: string;
  indicators: Indicator[];
}

const theme = makeHmxGridTheme();

/** 与线上 radio 一致：企业层级 / 工序层级 */
const mode = ref<string[]>(["企业层级"]);
const range = ref<Date[] | null>(null);
const rows = ref<DetailRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

/** 按指标名补单位：线上列头 = 指标名 + 括号单位（实测 34 列逐个核对） */
function headerOf(name: string): string {
  if (name === "排放总量") return "排放总量（tCO2）";
  if (name === "粗钢产量") return "粗钢产量（t）";
  if (name === "单位粗钢排放量") return "单位粗钢排放量（tCO2/t）";
  if (name === "天然气") return "天然气（104Nm3）";
  if (name.endsWith("排放量")) return `${name}（tCO2）`;
  return `${name}（t）`;
}

const colDefs = computed<ColDef[]>(() => {
  const base: ColDef[] = [
    { field: "reportDate", headerName: "日期", width: 110 },
    { field: "companyName", headerName: "企业名称", minWidth: 170, width: 180 },
  ];
  /* 工序层级：线上当前也是空表且指标集未捕获 → 只留基础三列 */
  if (mode.value[0] !== "企业层级") return base;
  const names: string[] = [];
  for (const r of rows.value) {
    for (const i of r.indicators ?? []) if (!names.includes(i.name)) names.push(i.name);
  }
  return [
    ...base,
    ...names.map((n) => ({
      colId: n,
      headerName: headerOf(n),
      width: 130,
      valueGetter: (p: any) => p.data?.indicators?.find((i: Indicator) => i.name === n)?.value ?? "",
    })),
  ];
});

function buildParams(): Record<string, any> {
  const p: Record<string, any> = { currentPage: page.value, pageSize: pageSize.value };
  if (range.value?.[0]) p.startTime = fmt(range.value[0]);
  if (range.value?.[1]) p.endTime = fmt(range.value[1]);
  return p;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

async function query() {
  if (querying.value) return;
  querying.value = true;
  try {
    const res = await carbonQuery("/emissionRecords/company/details", "post")(buildParams());
    rows.value = (res.rows ?? []) as DetailRow[];
    total.value = res.total ?? rows.value.length;
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function reset() {
  range.value = null;
  page.value = 1;
  query();
}

function onPage(p: number, size: number) {
  page.value = p;
  pageSize.value = size;
  query();
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}

onMounted(query);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏 h-9：层级切换 + 时间区间 + 查询/重置 -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <SelectButton v-model="mode" :options="['企业层级', '工序层级']" />
      <DatePicker
        v-model="range"
        selection-mode="range"
        :manual-input="false"
        date-format="yy-mm-dd"
        show-time
        hour-format="24"
        show-icon
        placeholder="开始时间"
        class="w-72 shrink-0"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="reset">
        <IconRotateClockwise class="h-3 w-3" />重置
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">共 {{ total }} 条</span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        @grid-ready="onGridReady"
        @first-data-rendered="onFirstData"
      />
    </div>

    <CarbonPager :total="total" :page="page" :page-size="pageSize" @change="onPage" />
  </div>
</template>
