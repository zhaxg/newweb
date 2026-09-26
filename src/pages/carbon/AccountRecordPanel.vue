<script setup lang="ts">
/**
 * 账户记录子表区（碳排/减排/配额/交易 四页共用）。
 *
 * **它不是弹窗**——线上是点主表行后在页面**下方展开的区块**，自带查询条件、表格、
 * （碳排/减排才有）行内「详情」。所以落在 Splitter 下半区，不是 Dialog。
 *
 * 四种账户的差异全部收敛在这一个组件里（用 variant 切），因为它们骨架完全相同、
 * 只差列头/筛选项/接口：
 *   emission·reduction 列同构，筛选 = 企业名称 + 来源 + 变动类型
 *   quota·trade       列同构（仅第二列头「变动时间」vs「时间」），筛选 = 企业名称 + 变动类型 + 日期范围
 * 筛选项与下拉候选都是照线上实测抄的（来源：人工录入/系统对接；碳排侧变动类型：增加/删除/修改；
 * 配额侧变动类型：新增/减少）。
 */
import { onMounted, reactive, ref, watch } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { IconRotateClockwise, IconSearch } from "@tabler/icons-vue";
import { carbonApi, type AccountRecordQuery } from "@/api/carbon";
import type { AccountRecordRow, PageResult, QuotaTradeRecordRow } from "@/api/carbon/types";
import { actionRenderer } from "./rowActions";
import AccountRecordDetailDialog from "./AccountRecordDetailDialog.vue";
import TradeAccDetailDialog from "./TradeAccDetailDialog.vue";

type RecordVariant = "emission" | "reduction" | "quota" | "trade";

const props = defineProps<{
  variant: RecordVariant;
  /** 主表选中行的企业 id（记录列表的必填查询参数） */
  enterId: string;
}>();

const theme = makeHmxGridTheme();

const isEmissionLike = props.variant === "emission" || props.variant === "reduction";

/* ---------- 查询条件 ---------- */
const q = reactive({
  enterName: "",
  sourceName: null as string | null,
  changeFlagName: null as string | null,
  range: null as Date[] | null,
});

const SOURCE_OPTIONS = ["人工录入", "系统对接"];
const CHANGE_OPTIONS = isEmissionLike ? ["增加", "删除", "修改"] : ["新增", "减少"];
const rows = ref<Array<AccountRecordRow | QuotaTradeRecordRow>>([]);
const total = ref(0);
const querying = ref(false);

function toParams(): AccountRecordQuery {
  const p: AccountRecordQuery = {
    currentPage: 1,
    pageSize: 20,
    enterId: props.enterId,
    enterName: q.enterName.trim() || undefined,
  };
  if (isEmissionLike) {
    p.sourceName = q.sourceName ?? undefined;
    p.serviceName = q.changeFlagName ?? undefined;
  } else {
    p.changeFlagName = q.changeFlagName ?? undefined;
    // 日期范围 → 后端两个独立参数（ui-rules §6：拆分函数转换）
    p.startTime = q.range?.[0] ? fmt(q.range[0]) : undefined;
    p.endTime = q.range?.[1] ? fmt(q.range[1]) : undefined;
  }
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
    const p = toParams();
    const res: PageResult<AccountRecordRow | QuotaTradeRecordRow> =
      props.variant === "emission"
        ? await carbonApi.getEmissionRecords(p)
        : props.variant === "reduction"
          ? await carbonApi.getReductionRecords(p)
          : props.variant === "quota"
            ? await carbonApi.getQuotaRecords(p)
            : await carbonApi.getTradeRecords(p);
    rows.value = res.rows ?? [];
    total.value = res.total ?? rows.value.length;
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function reset() {
  q.enterName = "";
  q.sourceName = null;
  q.changeFlagName = null;
  q.range = null;
  query();
}

onMounted(query);
watch(
  () => props.enterId,
  () => query(),
);

/* ---------- 表格 ---------- */
function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}

/** 详情弹窗（两种形态的数据分开放：碳排/减排与配额/交易的详情字段完全不同） */
const detailOpen = ref(false);
const emissionData = ref<any>(null);
const tradeData = ref<any>(null);

async function openDetail(row: any) {
  try {
    if (props.variant === "emission") emissionData.value = await carbonApi.getEmissionRecordDetail(row.id);
    else if (props.variant === "reduction") emissionData.value = await carbonApi.getReductionRecordDetail(row.id);
    else tradeData.value = await carbonApi.getTradeAccDetail(row.id);
    detailOpen.value = true;
  } catch {
    /* 拦截层已 toast */
  }
}

const ACCOUNT_LABEL: Record<string, string> = { emission: "碳排账户", reduction: "减排账户" };

const colDefs = ref<ColDef[]>(buildCols());

function actionCol(): ColDef {
  return {
    colId: "actions",
    headerName: "操作",
    width: 80,
    sortable: false,
    cellRenderer: actionRenderer([{ label: "详情", onClick: openDetail }]),
  };
}

function buildCols(): ColDef[] {
  if (props.variant === "emission" || props.variant === "reduction") {
    return [
      { field: "enterName", headerName: "企业名称", minWidth: 180, flex: 1 },
      { field: "recordTime", headerName: "时间", width: 160 },
      { field: "sourceName", headerName: "来源", width: 100 },
      { field: "serviceName", headerName: "变动类型", width: 100 },
      { field: "dataVal", headerName: "变动额度（tCO2）", width: 140 },
      { field: "balanceVal", headerName: "变动后余额（tCO2）", width: 150 },
      actionCol(),
    ];
  }
  // 配额「变动时间」/交易「时间」是线上两页的真实差异，保留
  return [
    { field: "enterName", headerName: "企业名称", minWidth: 180, flex: 1 },
    { field: "recordTime", headerName: props.variant === "quota" ? "变动时间" : "时间", width: 160 },
    { field: "changeFlagName", headerName: "变动类型", width: 100 },
    { field: "dataVal", headerName: "碳量（tCO2）", width: 130 },
    { field: "balanceVal", headerName: "变动后余额（tCO2）", width: 150 },
    { field: "sourceTypeName", headerName: "业务来源", width: 110 },
    actionCol(),
  ];
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <!-- 查询条件区：3 个条件 → grid-cols-6（ui-rules §6），日期范围占 col-span-2 -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">企业名称</label>
          <InputText v-model="q.enterName" placeholder="请输入企业名称" class="min-w-0 flex-1" @keydown.enter="query" />
        </div>
        <div v-if="isEmissionLike" class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">来源</label>
          <Select
            v-model="q.sourceName"
            :options="SOURCE_OPTIONS"
            show-clear
            placeholder="请选择来源"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">变动类型</label>
          <Select
            v-model="q.changeFlagName"
            :options="CHANGE_OPTIONS"
            show-clear
            placeholder="请选择变动类型"
            class="min-w-0 flex-1"
          />
        </div>
        <div v-if="!isEmissionLike" class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">日期</label>
          <DatePicker
            v-model="q.range"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            placeholder="开始时间"
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- 工具栏 h-9：按钮靠左、表标题靠右（ui-rules §6） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="reset">
        <IconRotateClockwise class="h-3 w-3" />重置
      </Button>
      <span class="ml-auto text-xs font-medium text-muted-foreground">账户记录（{{ total }}）</span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        @first-data-rendered="onFirstData"
      />
    </div>

    <AccountRecordDetailDialog
      v-if="isEmissionLike"
      v-model:open="detailOpen"
      :account-label="ACCOUNT_LABEL[props.variant] ?? ''"
      :detail="emissionData"
    />
    <TradeAccDetailDialog v-else v-model:open="detailOpen" :detail="tradeData" />
  </div>
</template>
