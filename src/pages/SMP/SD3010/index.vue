<script setup lang="ts">
import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import RangeInput from "@/components/common/RangeInput.vue";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { tmp2000Api, type InputStockDto, type QueryTyd2000Dto } from "@/api/mes4ddh/smp.swagger";

/** 对应 FrmSD3010（中厚板转挂订单）：DDH.Winforms.SMP.Forms.FrmSD3010
 *  已接入：tmp2000Api.getStockList（查询）/ cancelMatchOrder（取消订单匹配）
 *  待接入：二级弹窗 FrmSD2062 占位（转挂订单）；mock 已有 getStockList/cancelMatchOrder
 *  布局：查询区(16 项：12 文本 + 厚/宽/长 数字区间 + 产出时间区间) → 工具栏(查询/取消订单匹配/转挂订单) → 单表 Fill
 *        厚/宽/长 是复合数字区间（RangeInput），占 1 列即可、不跨列；仅「产出时间」日期区间按 ui-rules 占 col-span-2
 *  库区号取菜单 cQueryString「ZG01-04」（原 _searchInput.CStoreCode = QueryString）；切边方式为 KV 字典下拉（选项运行时灌，先按文本输入）；
 *  转挂前校验按 C#：库存状态/质量封锁/已存在订单/钢种标准规格一致（SpecCalHelper 断面规则同源）；列集按 extract（可见34+隐藏2=36） */

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();
const theme = makeHmxGridTheme();
const rows = ref<QueryTyd2000Dto[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

/* InventoryStatusEnum.Normal=1、QMStatuEnum.Locked=10 */
const INVENTORY_NORMAL = 1;
const QM_LOCKED = 10;

/* 原 dataLayoutControl 查询区（InputStockDto） */
const input = reactive({
  cOrderNo: "",
  cSettleCust: "",
  cConsignee: "",
  cStackNo: "",
  cStove: "",
  cPieceNo: "",
  cSgCode: "",
  cSgStd: "",
  cInboundNo: "",
  cCutFlag: "",
  cWgtToler: "",
  cDetectDefectLevel: "",
  nThickMin: null as number | null,
  nThickMax: null as number | null,
  nWthMin: null as number | null,
  nWthMax: null as number | null,
  nLenMin: null as number | null,
  nLenMax: null as number | null,
  dProTime: null as Date[] | null,
});

const colDefs: ColDef[] = [
        { field: "selected", headerName: "选择", width: 56, minWidth: 56, cellRenderer: "agCheckboxCellRenderer", editable: true, sortable: false, filter: false },
      { field: "cOrderNo", headerName: "订单号", width: 100 },
      { field: "cInboundNo", headerName: "入库标识", width: 100 },
      { field: "cConsignee", headerName: "订货单位", width: 100 },
      { field: "cSettleCust", headerName: "结算单位", width: 100 },
      { field: "cPieceNo", headerName: "件次号", width: 100 },
      { field: "cSgCode", headerName: "钢种", width: 100 },
      { field: "cSpec", headerName: "规格", width: 100 },
      { field: "cSgStd", headerName: "执行标准", width: 100 },
      { field: "nNum", headerName: "支数", width: 100 },
      { field: "nCalWgt", headerName: "理重", width: 100 },
      { field: "cComplexDecideCode", headerName: "综判结果", width: 100 },
      { field: "cSurfaceResult", headerName: "表检结果", width: 100 },
      { field: "cDetectResultCode", headerName: "探伤判定结果", width: 100 },
      { field: "nQmLevel", headerName: "质量等级", width: 100 },
      { field: "cProdCode", headerName: "品名", width: 100 },
      { field: "cStackNo", headerName: "垛位号", width: 100 },
      { field: "cStackNum", headerName: "层号", width: 100 },
      { field: "nThick", headerName: "厚度", width: 100 },
      { field: "nWth", headerName: "宽度", width: 100 },
      { field: "nLen", headerName: "长度", width: 100 },
      { field: "nQmStatus", headerName: "质量状态", width: 100 },
      { field: "nLockReason", headerName: "质量封锁原因", width: 100 },
      { field: "cWgtToler", headerName: "公差", width: 100 },
      { field: "cCutFlag", headerName: "切边方式", width: 100 },
      { field: "cDetectDefectLevel", headerName: "探伤等级", width: 100 },
      { field: "cSpecialMarkGy", headerName: "性能要求", width: 100 },
      { field: "cDelivyStatusCode", headerName: "交货状态", width: 100 },
      { field: "cDelivyAddress", headerName: "流向", width: 100 },
      { field: "nStatus", headerName: "库存状态", width: 100 },
      { field: "cProRemark", headerName: "生产备注", width: 100 },
      { field: "dProTime", headerName: "产出时间", width: 100 },
      { field: "cStoreCode", headerName: "库区号", width: 100 },
      { field: "cStove", headerName: "炉号", width: 100 },
      { field: "cPrintCode", headerName: "喷号", width: 100, hide: true },
      { field: "nWgt", headerName: "实重", width: 100, hide: true },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function selectedRows(): QueryTyd2000Dto[] {
  const byGrid = (gridApi.value?.getSelectedRows() ?? []) as QueryTyd2000Dto[];
  const byCheck = rows.value.filter((x) => x.selected);
  return Array.from(new Set([...byGrid, ...byCheck]));
}

function numRange(min: number | null, max: number | null) {
  return min != null || max != null ? { min, max } : undefined;
}
function timeRange(d: Date[] | null | undefined) {
  return d && d.length === 2 && d[0] && d[1] ? { min: d[0].toISOString(), max: d[1].toISOString() } : undefined;
}
function buildInput(): InputStockDto {
  return {
    cOrderNo: input.cOrderNo || null,
    cSettleCust: input.cSettleCust || null,
    cConsignee: input.cConsignee || null,
    cStackNo: input.cStackNo || null,
    cStove: input.cStove || null,
    cPieceNo: input.cPieceNo || null,
    cSgCode: input.cSgCode || null,
    cSgStd: input.cSgStd || null,
    cInboundNo: input.cInboundNo || null,
    cCutFlag: input.cCutFlag || null,
    cWgtToler: input.cWgtToler || null,
    cDetectDefectLevel: input.cDetectDefectLevel || null,
    nThick: numRange(input.nThickMin, input.nThickMax),
    nWth: numRange(input.nWthMin, input.nWthMax),
    nLen: numRange(input.nLenMin, input.nLenMax),
    dProTime: timeRange(input.dProTime),
    cStoreCode: menuQs || null,
  };
}

/* btnS 查询 → GetStockList */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tmp2000Api.getStockList(buildInput())) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnCancelOrder 取消订单匹配 → CancelMatchOrder(件次号) */
async function onCancelMatch() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择库存！", 2000, "warn");
    return;
  }
  if (selected.some((x) => !x.cOrderNo)) {
    toast("没有订单无法取消", 2000, "warn");
    return;
  }
  if (!window.confirm(`确认取消匹配订单?件数：${selected.length}`)) return;
  querying.value = true;
  try {
    const pieceNos = selected
      .map((x) => x.cPieceNo ?? "")
      .filter(Boolean);
    const count = (await tmp2000Api.cancelMatchOrder(pieceNos)) ?? 0;
    await onQuery();
    toast(`取消成功${count}条！`, 2500, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 原 SpecCalHelper.Get：厚*宽（无宽则 φ厚） */
function specCal(thick: number | null | undefined, width: number | null | undefined): string {
  const t = String(thick ?? 0);
  if (width != null && width > 0) return `${t}*${String(width)}`;
  return `φ${t}`;
}

/* btnZgOrder 转挂订单 → 校验后弹 FrmSD2062（占位） */
function onZgOrder() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择库存！", 2000, "warn");
    return;
  }
  if (selected.some((x) => x.nStatus !== INVENTORY_NORMAL)) {
    toast("库存状态错误，不允许操作 !", 2500, "warn");
    return;
  }
  if (selected.some((x) => x.nQmStatus === QM_LOCKED)) {
    toast("质量已封锁，不允许操作！", 2500, "warn");
    return;
  }
  if (selected.some((x) => x.cOrderNo)) {
    toast("已存在订单，请取消订单后再转挂！", 2500, "warn");
    return;
  }
  /* 原按 钢种/标准/品名/厚/宽/公差/切边/探伤等级/性能要求/交货状态 分组，>1 组不允许 */
  const groups = new Map<string, QueryTyd2000Dto[]>();
  for (const row of selected) {
    const key = [
      row.cSgCode,
      row.cSgStd,
      row.cProdCode,
      row.nThick,
      row.nWth,
      row.cWgtToler,
      row.cCutFlag,
      row.cDetectDefectLevel,
      row.cSpecialMarkGy,
      row.cDelivyStatusCode,
    ].join("\u0001");
    const g = groups.get(key);
    if (g) g.push(row);
    else groups.set(key, [row]);
  }
  if (groups.size > 1) {
    const remarks = [...groups.values()].map((g) => {
      const w = g[0] ?? {};
      return `${w.cSgCode}/${w.cSgStd}/${w.cProdCode}/${specCal(w.nThick, w.nWth)}/${w.cWgtToler}/${w.cCutFlag}/${w.cDetectDefectLevel}/${w.cDelivyStatusCode}`;
    });
    toast(`不允许操作，钢种/标准/规格/工艺要求/不一致\n${remarks.join("\n")}`, 4000, "warn");
    return;
  }
  toast("FrmSD2062 弹窗待迁移", 2000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 dataLayoutControl，16 项 LayoutControlItem） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">结算单位</label>
          <InputText v-model="input.cSettleCust" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订货单位</label>
          <InputText v-model="input.cConsignee" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">垛位号</label>
          <InputText v-model="input.cStackNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="input.cStove" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
          <InputText v-model="input.cPieceNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.cSgCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
          <InputText v-model="input.cSgStd" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
          <InputText v-model="input.cInboundNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">切边方式</label>
          <InputText v-model="input.cCutFlag" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">公差</label>
          <InputText v-model="input.cWgtToler" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">探伤等级</label>
          <InputText v-model="input.cDetectDefectLevel" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">厚度</label>
          <RangeInput
            v-model:min="input.nThickMin"
            v-model:max="input.nThickMax"
            :min-fraction-digits="0"
            :max-fraction-digits="2"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">宽度</label>
          <RangeInput
            v-model:min="input.nWthMin"
            v-model:max="input.nWthMax"
            :min-fraction-digits="0"
            :max-fraction-digits="1"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">长度</label>
          <RangeInput
            v-model:min="input.nLenMin"
            v-model:max="input.nLenMax"
            :min-fraction-digits="0"
            :max-fraction-digits="1"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产出时间</label>
          <DatePicker
            v-model="input.dProTime"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1：查询/取消订单匹配/转挂订单） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelMatch">取消订单匹配</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onZgOrder">转挂订单</Button>
    </div>

    <!-- 数据表格（原 gridControl1 Dock.Fill） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
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
