<script setup lang="ts">
/** 对应 FrmFH3000（派车计划查询）：DDH.Winforms.SMP.Forms.FrmFH3000
 *  已接入：xSApi.getBillDetailList（swagger 补，IXSAppService.GetBillDetailList
 *          → /dDH.Service.Interface.Services.XS/xS/getBillDetailList）
 *          明细一次拉全(PageIndex=1/PageSize=10000) → 主表按 提货单/经销商/车/船/流向/码头/备注/时间/状态 分组求和；
 *          主行变化再按 orderNo 过滤出子表，纯前端聚合与原 C# 一致
 *  待接入：无二级弹窗
 *  布局：查询区(6条件+查询) → 上下Splitter：上=派车计划汇总(11可见列) | 下=提货明细(14可见列) */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { xSApi, type ApiBillDetail, type ApiBillDetailInput } from "@/api/mes4ddh/smp.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

function defaultRange(): [Date, Date] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1);
  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);
  end.setSeconds(end.getSeconds() - 1);
  return [start, end];
}

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const q = reactive({
  orderNo: "",
  dealersName: "",
  carNo: "",
  shipNo: "",
  dates: defaultRange() as Date[] | null,
});

/* ---------- 列 ---------- */
/* 主表（原 gridView1，11 可见 + 21 hide） */
const mainColDefs = ref<ColDef[]>([
  { field: "orderNo", headerName: "提货单号", width: 140 },
  { field: "carNo", headerName: "车牌号", width: 110 },
  { field: "stateName", headerName: "状态", width: 100 },
  { field: "shipNo", headerName: "船号", width: 110 },
  { field: "wharfName", headerName: "卸货码头", width: 110 },
  { field: "dealersName", headerName: "提货单位", width: 140 },
  { field: "count", headerName: "提货件数", width: 90 },
  { field: "weight", headerName: "提货重量", width: 100 },
  { field: "bcArea", headerName: "流向", width: 110 },
  { field: "orderRemark", headerName: "备注", width: 130 },
  { field: "firstAuTime", headerName: "创建时间", width: 150, flex: 1 },
  { field: "entrustDealerName", headerName: "委托经销商", hide: true },
  { field: "performanceMark", headerName: "性能要求", hide: true },
  { field: "goodsName", headerName: "商品名称", hide: true },
  { field: "nC_GoodsCode", headerName: "产品编码", hide: true },
  { field: "goodsTypeName", headerName: "品名", hide: true },
  { field: "materialName", headerName: "材质名称", hide: true },
  { field: "goodsSpec", headerName: "商品规格", hide: true },
  { field: "gYText", headerName: "工艺", hide: true },
  { field: "gCText", headerName: "公差", hide: true },
  { field: "qCNo", headerName: "质量号", hide: true },
  { field: "lengthMin", headerName: "最小长度", hide: true },
  { field: "lengthMax", headerName: "最大长度", hide: true },
  { field: "gyQb", headerName: "切边", hide: true },
  { field: "gyTs", headerName: "探伤", hide: true },
  { field: "gyRcl", headerName: "热处理", hide: true },
  { field: "gC", headerName: "公差", hide: true },
  { field: "gCJJ", headerName: "公差加价", hide: true },
  { field: "recordId", headerName: "接口ID", hide: true },
  { field: "zcNum", headerName: "装车件数", hide: true },
  { field: "zcWgt", headerName: "装车重量", hide: true },
  { field: "amtWeight", headerName: "重量", hide: true },
]);

/* 子表（原 gridView2，14 可见 + 18 hide） */
const detailColDefs = ref<ColDef[]>([
  { field: "orderNo", headerName: "提货单号", width: 140 },
  { field: "carNo", headerName: "车牌号", width: 110 },
  { field: "stateName", headerName: "状态", width: 100 },
  { field: "shipNo", headerName: "船号", width: 110 },
  { field: "wharfName", headerName: "卸货码头", width: 110 },
  { field: "dealersName", headerName: "提货单位", width: 140 },
  { field: "goodsName", headerName: "商品名称", width: 140 },
  { field: "count", headerName: "提货件数", width: 90 },
  { field: "amtWeight", headerName: "提货重量", width: 100 },
  { field: "gyQb", headerName: "切边", width: 90 },
  { field: "gC", headerName: "公差", width: 90 },
  { field: "bcArea", headerName: "流向", width: 110 },
  { field: "orderRemark", headerName: "备注", width: 130 },
  { field: "firstAuTime", headerName: "创建时间", width: 150, flex: 1 },
  { field: "entrustDealerName", headerName: "委托经销商", hide: true },
  { field: "performanceMark", headerName: "性能要求", hide: true },
  { field: "nC_GoodsCode", headerName: "产品编码", hide: true },
  { field: "goodsTypeName", headerName: "品名", hide: true },
  { field: "materialName", headerName: "材质名称", hide: true },
  { field: "goodsSpec", headerName: "商品规格", hide: true },
  { field: "weight", headerName: "单重", hide: true },
  { field: "gYText", headerName: "工艺", hide: true },
  { field: "gCText", headerName: "公差", hide: true },
  { field: "qCNo", headerName: "质量号", hide: true },
  { field: "lengthMin", headerName: "最小长度", hide: true },
  { field: "lengthMax", headerName: "最大长度", hide: true },
  { field: "gyTs", headerName: "探伤", hide: true },
  { field: "gyRcl", headerName: "热处理", hide: true },
  { field: "gCJJ", headerName: "公差加价", hide: true },
  { field: "recordId", headerName: "接口ID", hide: true },
  { field: "zcNum", headerName: "装车件数", hide: true },
  { field: "zcWgt", headerName: "装车重量", hide: true },
]);

/* ---------- 状态 ---------- */
const rawRows = ref<ApiBillDetail[]>([]);
const groupRows = ref<ApiBillDetail[]>([]);
const detailRows = ref<ApiBillDetail[]>([]);
const querying = ref(false);
const mainApi = ref<GridApi | null>(null);
const detailApi = ref<GridApi | null>(null);

function onMainReady(e: GridReadyEvent) {
  mainApi.value = e.api;
}
function onDetailReady(e: GridReadyEvent) {
  detailApi.value = e.api;
}

/* 原 BindData：分组求和（客户端聚合） */
function groupSummary(list: ApiBillDetail[]): ApiBillDetail[] {
  const keyOf = (x: ApiBillDetail) =>
    [
      x.orderNo,
      x.dealersName,
      x.carNo,
      x.shipNo,
      x.bcArea,
      x.wharfName,
      x.orderRemark,
      x.firstAuTime,
      x.stateName,
    ].join("");
  const map = new Map<string, ApiBillDetail>();
  for (const x of list) {
    const k = keyOf(x);
    let agg = map.get(k);
    if (!agg) {
      agg = {
        orderNo: x.orderNo,
        dealersName: x.dealersName,
        carNo: x.carNo,
        shipNo: x.shipNo,
        bcArea: x.bcArea,
        wharfName: x.wharfName,
        orderRemark: x.orderRemark,
        firstAuTime: x.firstAuTime,
        stateName: x.stateName,
        count: 0,
        weight: 0,
        amtWeight: 0,
        zcNum: 0,
        zcWgt: 0,
      };
      map.set(k, agg);
    }
    agg.count = (agg.count ?? 0) + (x.count ?? 0);
    agg.weight = (agg.weight ?? 0) + (x.amtWeight ?? 0);
    agg.amtWeight = (agg.amtWeight ?? 0) + (x.amtWeight ?? 0);
    agg.zcNum = (agg.zcNum ?? 0) + (x.zcNum ?? 0);
    agg.zcWgt = (agg.zcWgt ?? 0) + (x.zcWgt ?? 0);
  }
  return [...map.values()].sort((a, b) => String(a.firstAuTime).localeCompare(String(b.firstAuTime)));
}

async function onQuery() {
  querying.value = true;
  try {
    const input: ApiBillDetailInput = {
      pageIndex: 1,
      pageSize: 10000,
      orderNo: q.orderNo || null,
      dealersName: q.dealersName || null,
      carNo: q.carNo || null,
      shipNo: q.shipNo || null,
      startDate: q.dates?.[0] ? fmt(q.dates[0]) : null,
      endDate: q.dates?.[1] ? fmt(q.dates[1]) : null,
    };
    rawRows.value = ((await xSApi.getBillDetailList(input)) ?? []) as ApiBillDetail[];
    groupRows.value = groupSummary(rawRows.value);
    detailRows.value = [];
    mainApi.value?.setGridOption("rowData", groupRows.value);
    detailApi.value?.setGridOption("rowData", []);
    requestAnimationFrame(() => {
      mainApi.value?.autoSizeAllColumns();
      detailApi.value?.autoSizeAllColumns();
    });
    if (!groupRows.value.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 主行变化 → 按 orderNo 过滤（原 gridView1_FocusedRowObjectChanged） */
function onMainSelectionChanged() {
  const current = (mainApi.value?.getSelectedNodes()[0]?.data as ApiBillDetail | undefined) ?? null;
  if (!current) {
    detailRows.value = [];
    detailApi.value?.setGridOption("rowData", []);
    return;
  }
  detailRows.value = rawRows.value
    .filter((x) => x.orderNo === current.orderNo)
    .sort((a, b) => String(a.goodsName).localeCompare(String(b.goodsName)));
  detailApi.value?.setGridOption("rowData", detailRows.value);
  requestAnimationFrame(() => detailApi.value?.autoSizeAllColumns());
}

onMounted(() => {
  void onQuery();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl1：6 条件 + 查询） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">提货单号</label>
        <InputText v-model="q.orderNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">经销商</label>
        <InputText v-model="q.dealersName" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">车牌号</label>
        <InputText v-model="q.carNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">船号</label>
        <InputText v-model="q.shipNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">开始时间</label>
        <DatePicker
          v-model="q.dates"
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
      <div class="flex items-center">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>

    <!-- 上下分栏（原 gridControl1 Top + splitterControl1 + gridControl2 Fill） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="55" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">派车计划汇总</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="mainColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="groupRows"
            :locale-text="AG_GRID_LOCALE_CN"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onMainReady"
            @selection-changed="onMainSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="45" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">提货明细</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="detailColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="detailRows"
            :locale-text="AG_GRID_LOCALE_CN"
            :pagination="false"
            :animate-rows="false"
            @grid-ready="onDetailReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
