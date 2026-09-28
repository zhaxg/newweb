<script setup lang="ts">
/** 对应 FrmSD2061（成品库存资源调配，窗体标题「成品库存资源调配」，ViewCaption「成品库存」）：
 *  DDH.Winforms.SMP.Forms.FrmSD2061
 *  已接入：tmp2000Api.getCustomer（结算单位候选，原 GetCust→searchLookCust）/ getStockList（查询，CStoreCode=菜单参数）/
 *         updateStockAllocation（确认调配）/ cancelMatchOrder（取消订单匹配）/ generateOrderTemplate（生成现货订单）/
 *         systemKeyValueApi.getSysKvListByGroup("010100:CUTFLAG")（切边方式下拉，原 KeyValueFormatters.CUTFLAG）
 *  待接入：FrmSD2062（转挂订单）/ FrmSD2063（现货订单模板）弹窗占位；列上 KeyValueFormatters（品名/切边/交货状态）
 *         字典翻译未迁显示原值；转挂订单多规格提示的规格串依赖 SpecCalHelper 未迁，仅输出提示前缀；
 *         取消订单匹配/转挂订单原 Visible=false 按钮按元素齐全原则仍显示；入库标识隐藏输入对未显示 */

import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import { IconArrowRight, IconCheck, IconFileText, IconSearch, IconX } from "@tabler/icons-vue";
import RangeInput from "@/components/common/RangeInput.vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { systemKeyValueApi } from "@/api/admin/request";
import { tmp2000Api } from "@/api/mes4ddh/smp.swagger";
import type { InputStockDto, QueryTyd2000Dto } from "@/api/mes4ddh/smp.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: menuQs } = useMenuQuery(); // 原窗体 QueryString → _searchInput.CStoreCode

const rows = ref<QueryTyd2000Dto[]>([]);
const querying = ref(false);
const acting = ref(false);
const gridApi = ref<GridApi | null>(null);

// 查询条件（原 dataLayoutControl1 → InputStockDto；UCDecimalRange/UCTimeRange → RangeInput/日期区间）
const q = reactive({
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

// 工具栏（原 stackPanel1）：结算单位 SearchLookUpEdit + 切边方式 ImageComboBox 字典
const settleCust = ref<string | null>(null);
const settleCustOptions = ref<{ label: string; value: string }[]>([]);
const cutFlagOptions = ref<{ label: string; value: string }[]>([]);

function numRange(min: number | null, max: number | null): { min: number | null; max: number | null } | undefined {
  return min != null || max != null ? { min, max } : undefined;
}
function fmtDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function buildDto(): InputStockDto {
  const [t0, t1] = q.dProTime ?? [];
  return {
    cOrderNo: q.cOrderNo || undefined,
    cSettleCust: q.cSettleCust || undefined,
    cConsignee: q.cConsignee || undefined,
    cStackNo: q.cStackNo || undefined,
    cStove: q.cStove || undefined,
    cPieceNo: q.cPieceNo || undefined,
    cSgCode: q.cSgCode || undefined,
    cSgStd: q.cSgStd || undefined,
    cInboundNo: q.cInboundNo || undefined,
    cCutFlag: q.cCutFlag || undefined,
    cWgtToler: q.cWgtToler || undefined,
    cDetectDefectLevel: q.cDetectDefectLevel || undefined,
    nThick: numRange(q.nThickMin, q.nThickMax),
    nWth: numRange(q.nWthMin, q.nWthMax),
    nLen: numRange(q.nLenMin, q.nLenMax),
    dProTime: t0 && t1 ? { min: fmtDateTime(t0), max: fmtDateTime(t1) } : undefined,
    cStoreCode: menuQs || undefined, // C#: _searchInput.CStoreCode = this.QueryString
  };
}

// gridView1「成品库存」：36 可见列 + CPrintCode hide（QueryTyd2000Dto [LDisplay]，NWgt 为 Designer Caption）
const colDefs: ColDef[] = [
  { field: "selected", headerName: "选择", hide: true },
  { field: "cInboundNo", headerName: "入库标识", width: 120 },
  { field: "cComplexDecideCode", headerName: "综判结果", width: 100 },
  { field: "cStackNo", headerName: "垛位号", width: 90 },
  { field: "cStackNum", headerName: "层号", width: 70 },
  { field: "cConsignee", headerName: "订货单位", width: 120 },
  { field: "cSettleCust", headerName: "结算单位", width: 120 },
  { field: "cPieceNo", headerName: "件次号", width: 110 },
  { field: "cProdClass", headerName: "钢板分类", width: 90 },
  { field: "cStove", headerName: "炉号", width: 90 },
  { field: "cSgCode", headerName: "钢种", width: 90 },
  { field: "cSpec", headerName: "规格", width: 130 },
  { field: "cSgStd", headerName: "执行标准", width: 110 },
  { field: "cProdCode", headerName: "品名", width: 90 },
  { field: "nWgt", headerName: "理重", width: 80 },
  { field: "nNum", headerName: "支数", width: 70 },
  { field: "nThick", headerName: "厚度", width: 70 },
  { field: "nWth", headerName: "宽度", width: 70 },
  { field: "nLen", headerName: "长度", width: 70 },
  { field: "cOrderNo", headerName: "订单号", width: 130 },
  { field: "nQmStatus", headerName: "质量状态", width: 90 },
  { field: "nLockReason", headerName: "质量封锁原因", width: 120 },
  { field: "cWgtToler", headerName: "公差", width: 80 },
  { field: "cCutFlag", headerName: "切边方式", width: 90 },
  { field: "cDetectDefectLevel", headerName: "探伤等级", width: 90 },
  { field: "cSpecialMarkGy", headerName: "性能要求", width: 110 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 90 },
  { field: "cDelivyAddress", headerName: "流向", width: 120 },
  { field: "nStatus", headerName: "库存状态", width: 90 },
  { field: "cProRemark", headerName: "生产备注", width: 120 },
  { field: "dProTime", headerName: "产出时间", width: 150 },
  { field: "nQmLevel", headerName: "质量等级", width: 90 },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 110 },
  { field: "cSurfaceResult", headerName: "表检结果", width: 90 },
  { field: "cStoreCode", headerName: "库区号", width: 90 },
  { field: "cSaleEmp", headerName: "销售业务员", width: 100 },
  { field: "cPrintCode", headerName: "喷号", hide: true },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/** AllowSyncRowStateToCheckboxSelection：行选择 ↔ Selected 列同步 */
function onSelectionChanged() {
  const set = new Set((gridApi.value?.getSelectedRows() ?? []).map((r) => (r as QueryTyd2000Dto).cPieceNo));
  for (const r of rows.value) r.selected = r.cPieceNo != null && set.has(r.cPieceNo);
  gridApi.value?.refreshCells({ force: true, columns: ["selected"] });
}

function selectedRows(): QueryTyd2000Dto[] {
  return (gridApi.value?.getSelectedRows() ?? []) as QueryTyd2000Dto[];
}

/** 原 BindData：GetStockList(_searchInput)（CPieceNoLst 置空、CStoreCode=QueryString） */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tmp2000Api.getStockList(buildDto())) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 原 btnAllocation_Click：选中校验 → 结算单位校验 → 确认 → UpdateStockAllocation → 重查 → 成功N条 */
async function onAllocation() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择库存！", 2000, "warn");
    return;
  }
  if (!settleCust.value) {
    toast("请选择结算单位！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  const dto = buildDto() as InputStockDto & { cPieceNoLst?: string[] | null };
  dto.cPieceNoLst = selected.map((x) => x.cPieceNo).filter((x): x is string => !!x);
  acting.value = true;
  try {
    const count = await tmp2000Api.updateStockAllocation(settleCust.value, undefined, dto);
    await onQuery();
    toast(`成功执行${count}条！`, 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    acting.value = false;
  }
}

/** 原 btnZgOrder_Click：库存状态/质量封锁/已存在订单校验 → 规格一致性 → FrmSD2062（占位） */
function onZgOrder() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择库存！", 2000, "warn");
    return;
  }
  if (selected.some((x) => x.nStatus !== 1)) {
    toast("库存状态错误，不允许操作 !", 2000, "warn");
    return;
  }
  if (selected.some((x) => x.nQmStatus === 10)) {
    toast("质量已封锁，不允许操作！", 2000, "warn");
    return;
  }
  if (selected.some((x) => x.cOrderNo)) {
    toast("已存在订单，请取消订单后再转挂！", 2000, "warn");
    return;
  }
  const grpMatchKey = new Set(
    selected.map((x) =>
      [
        x.cSgCode,
        x.cSgStd,
        x.cProdCode,
        x.nThick,
        x.nWth,
        x.cWgtToler,
        x.cCutFlag,
        x.cDetectDefectLevel,
        x.cSpecialMarkGy,
        x.cDelivyStatusCode,
      ].join("|"),
    ),
  );
  if (grpMatchKey.size > 1) {
    // 原提示含 SpecCalHelper 规格串，web 未迁该 helper，仅输出前缀
    toast("不允许操作，钢种/标准/规格/工艺要求/不一致", 2000, "warn");
    return;
  }
  toast("FrmSD2062 弹窗待接入", 2000, "warn");
}

/** 原 btnCancelOrder_Click：选中 → 无订单校验 → 确认 → CancelMatchOrder → 重查 → 取消成功N条 */
async function onCancelOrder() {
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
  acting.value = true;
  try {
    const count = await tmp2000Api.cancelMatchOrder(selected.map((x) => x.cPieceNo).filter((x): x is string => !!x));
    await onQuery();
    toast(`取消成功${count}条！`, 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    acting.value = false;
  }
}

/** 原 btnOrderTemplate_Click：选中 → GenerateOrderTemplate → 无数据校验 → FrmSD2063（占位） */
async function onOrderTemplate() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择库存！", 2000, "warn");
    return;
  }
  acting.value = true;
  try {
    const templateData = (await tmp2000Api.generateOrderTemplate(selected)) ?? [];
    if (!templateData.length) {
      toast("无数据！", 2000, "warn");
      return;
    }
    toast("FrmSD2063 弹窗待接入", 2000, "warn");
  } catch {
    /* 拦截层已 toast */
  } finally {
    acting.value = false;
  }
}

onMounted(async () => {
  try {
    // 原 FrmSD2061_Load → GetCust + CUTFLAG 字典
    const [cust, kv] = await Promise.all([
      tmp2000Api.getCustomer(),
      systemKeyValueApi.getSysKvListByGroup("010100:CUTFLAG"),
    ]);
    settleCustOptions.value = (cust ?? []).map((x) => ({
      label: x.cOrderCustCname ?? "",
      value: x.cOrderCustCname ?? "",
    }));
    cutFlagOptions.value = (kv ?? []).map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 dataLayoutControl1，16 项；区间/日期不跨行标签规则按 ui-rules） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">结算单位</label>
          <InputText v-model="q.cSettleCust" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订货单位</label>
          <InputText v-model="q.cConsignee" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="q.cSgCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
          <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="q.cStove" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="q.cOrderNo" class="min-w-0 flex-1" />
        </div>

        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">厚度</label>
          <RangeInput
            v-model:min="q.nThickMin"
            v-model:max="q.nThickMax"
            :min-fraction-digits="1"
            :max-fraction-digits="2"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">宽度</label>
          <RangeInput
            v-model:min="q.nWthMin"
            v-model:max="q.nWthMax"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
          <InputText v-model="q.cSgStd" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">切边方式</label>
          <Select
            v-model="q.cCutFlag"
            :options="cutFlagOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="请选择"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">长度</label>
          <RangeInput
            v-model:min="q.nLenMin"
            v-model:max="q.nLenMax"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">公差</label>
          <InputText v-model="q.cWgtToler" class="min-w-0 flex-1" />
        </div>

        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产出时间</label>
          <DatePicker
            v-model="q.dProTime"
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
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
          <InputText v-model="q.cInboundNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">探伤等级</label>
          <InputText v-model="q.cDetectDefectLevel" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">垛位号</label>
          <InputText v-model="q.cStackNo" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1）：查询 | 结算单位：lookup | 确认调配 | 取消订单匹配 | 转挂订单 | 生成现货订单 -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <label class="shrink-0 text-xs text-muted-foreground">结算单位：</label>
      <Select
        v-model="settleCust"
        :options="settleCustOptions"
        option-label="label"
        option-value="value"
        filter
        show-clear
        placeholder="请选择"
        class="w-64 shrink-0"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="acting" @click="onAllocation">
        <IconCheck class="h-3 w-3" />确认调配
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="acting" @click="onCancelOrder">
        <IconX class="h-3 w-3" />取消订单匹配
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onZgOrder">
        <IconArrowRight class="h-3 w-3" />转挂订单
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="acting" @click="onOrderTemplate">
        <IconFileText class="h-3 w-3" />生成现货订单
      </Button>
    </div>

    <!-- 表标题（原 gridView1.ViewCaption=成品库存，纯标题 h-8） -->
    <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
      <span class="text-xs font-medium text-muted-foreground">成品库存</span>
    </div>

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
        @selection-changed="onSelectionChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
