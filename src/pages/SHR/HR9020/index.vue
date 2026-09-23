<script setup lang="ts">
/** 对应 FrmHR9020（装炉实绩·分1#/2#炉）：DDH.Winforms.SHR.Forms.FrmHR9020
 *  已接入：hR4200Api.queryTiL2me06s（前端按 furNo=1/2 拆两表、按装炉时间倒序）
 *  偏差：打印为占位（原 XtraReportPrinter 报表模板未在 web 侧接入）；nFurStatus 下拉仅 入炉/出炉（同原窗体 Load）；KV 列显示原值 */

import { onBeforeUnmount, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconPrinter, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, RowClassParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import {
  hR4200Api,
  Thr3010FurStatusEnum,
  type DtoQueryL2,
  type TiL2ME06ItemDto,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();

/* ---------- 时间（原 ucTimeRange，默认本月） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function monthRange(): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  last.setSeconds(last.getSeconds() - 1);
  return [first, last];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 查询条件（DtoQueryL2，默认入炉） ---------- */
const furStatusOptions = [
  { label: "入炉", value: Thr3010FurStatusEnum.EnterFur },
  { label: "出炉", value: Thr3010FurStatusEnum.ExitFur },
];
const input = reactive({
  slabNo: "",
  cBatchOrder: "",
  nFurStatus: Thr3010FurStatusEnum.EnterFur as Thr3010FurStatusEnum,
  dates: monthRange() as Date[] | null,
});

/* ---------- 两炉表格（gridView1/gridView2 同实体同列） ---------- */
const rows1 = shallowRef<TiL2ME06ItemDto[]>([]);
const rows2 = shallowRef<TiL2ME06ItemDto[]>([]);
const loading = ref(false);
const api1 = ref<GridApi | null>(null);
const api2 = ref<GridApi | null>(null);
function onReady1(e: GridReadyEvent) { api1.value = e.api; }
function onReady2(e: GridReadyEvent) { api2.value = e.api; }

const colDefs: ColDef[] = [
    { colId: "selected", field: "selected", headerName: "选择", width: 149 },
  { colId: "nOrderSj", field: "nOrderSj", headerName: "生产顺序号", width: 149 },
  { colId: "cCustName", field: "cCustName", headerName: "客户名称", width: 149 },
  { colId: "cConRemark", field: "cConRemark", headerName: "特殊要求", width: 500 },
  { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 149 },
  { colId: "cCool", field: "cCool", headerName: "是否冷坯计划", width: 100 },
  { colId: "createTime", field: "createTime", headerName: "装炉时间", width: 149 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 149 },
  { colId: "furNo", field: "furNo", headerName: "炉号", width: 149 },
  { colId: "rowNo", field: "rowNo", headerName: "列号", width: 149 },
  { colId: "zPNo", field: "zPNo", headerName: "组批号（计算列：批号-顺序号）", width: 149 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 149 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 149 },
  { colId: "nWth", field: "nWth", headerName: "宽度", width: 149 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 149 },
  { colId: "spare6", field: "spare6", headerName: "照核厚度", width: 149 },
  { colId: "spare5", field: "spare5", headerName: "照核宽度", width: 149 },
  { colId: "spare4", field: "spare4", headerName: "照核长度", width: 149 },
  { colId: "nLenDiff", field: "nLenDiff", headerName: "长度差", width: 149 },
  { colId: "cSgCodePlan", field: "cSgCodePlan", headerName: "计划钢种", width: 149 },
  { colId: "pLAN_NThickPlan", field: "pLAN_NThickPlan", headerName: "轧制厚", width: 149 },
  { colId: "pLAN_NWidthPlan", field: "pLAN_NWidthPlan", headerName: "轧制宽", width: 149 },
  { colId: "pLAN_NLlCleanLen", field: "pLAN_NLlCleanLen", headerName: "轧制长", width: 149 },
  { colId: "nCalWgt", field: "nCalWgt", headerName: "理重", width: 149 },
  { colId: "spare3", field: "spare3", headerName: "预留（炉前称重）", width: 149 },
  { colId: "nwgtDiff", field: "nwgtDiff", headerName: "重量差", width: 100 },
  { colId: "nStatus", field: "nStatus", headerName: "库存状态", width: 149 },
  { colId: "cDn", field: "cDn", headerName: "需要堆冷", width: 112 },
  { colId: "cCutFlag", field: "cCutFlag", headerName: "切边方式", width: 149 },
  { colId: "pLAN_CSpec", field: "pLAN_CSpec", headerName: "剪切计划规格", width: 149 },
  { colId: "nBoarCleanLen", field: "nBoarCleanLen", headerName: "母板净长", width: 149 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 149 },
  { colId: "cSpecialMarkGy", field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 149 },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 149 },
  { colId: "pLAN_COrderNo1", field: "pLAN_COrderNo1", headerName: "订单号1", width: 149 },
  { colId: "pLAN_COrderNo2", field: "pLAN_COrderNo2", headerName: "订单号2", width: 149 },
  { colId: "pLAN_COrderNo3", field: "pLAN_COrderNo3", headerName: "订单号3", width: 149 },
  { colId: "pLAN_COrderNo4", field: "pLAN_COrderNo4", headerName: "订单号4", width: 149 },
  { colId: "pLAN_NLenPlan1", field: "pLAN_NLenPlan1", headerName: "套切长度1", width: 149 },
  { colId: "pLAN_NLenPlan2", field: "pLAN_NLenPlan2", headerName: "套切长度2", width: 149 },
  { colId: "pLAN_NLenPlan3", field: "pLAN_NLenPlan3", headerName: "套切长度3", width: 149 },
  { colId: "pLAN_NLenPlan4", field: "pLAN_NLenPlan4", headerName: "套切长度4", width: 149 },
  { colId: "nDbc", field: "nDbc", headerName: "倍尺", width: 149 },
  { colId: "cBilletTypeCode", field: "cBilletTypeCode", headerName: "铸坯标识", width: 149 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 149 },
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 100 },
  { colId: "cInboundNo1", field: "cInboundNo1", headerName: "入库标识1", width: 100 },
  { colId: "cInboundNo2", field: "cInboundNo2", headerName: "入库标识2", width: 100 },
  { colId: "cInboundNo3", field: "cInboundNo3", headerName: "入库标识3", width: 100 },
  { colId: "cInboundNo4", field: "cInboundNo4", headerName: "入库标识4", width: 100 },
  { colId: "nThickMax", field: "nThickMax", headerName: "厚度上限", width: 100 },
  { colId: "nThickMin", field: "nThickMin", headerName: "厚度下限", width: 100 },
  { colId: "id", field: "id", headerName: "主键", width: 149, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 149, hide: true },
  { colId: "spare2", field: "spare2", headerName: "预留（照核长度）", width: 149, hide: true },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 149, hide: true },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 149, hide: true },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 149, hide: true },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 149, hide: true },
  { colId: "nWgt", field: "nWgt", headerName: "实重", width: 149, hide: true },
  { colId: "pLAN_COrderNo5", field: "pLAN_COrderNo5", headerName: "订单号5", width: 149, hide: true },
  { colId: "pLAN_COrderNo6", field: "pLAN_COrderNo6", headerName: "订单号6", width: 149, hide: true },
  { colId: "pLAN_NLenPlan5", field: "pLAN_NLenPlan5", headerName: "套切长度5", width: 149, hide: true },
  { colId: "pLAN_NLenPlan6", field: "pLAN_NLenPlan6", headerName: "套切长度6", width: 149, hide: true },
  { colId: "cInboundNo5", field: "cInboundNo5", headerName: "入库标识5", width: 100, hide: true },
  { colId: "cInboundNo6", field: "cInboundNo6", headerName: "入库标识6", width: 100, hide: true },
];

/* 原 RowStyle：订单号1-4 含 -B 或 合同备注含「加急」→ 红底 */
function rowRed(p: RowClassParams<TiL2ME06ItemDto>) {
  const r = p.data;
  if (!r) return undefined;
  const hit = [r.pLAN_COrderNo1, r.pLAN_COrderNo2, r.pLAN_COrderNo3, r.pLAN_COrderNo4].some(
    (x) => String(x ?? "").includes("-B"),
  ) || String(r.cConRemark ?? "").includes("加急");
  return hit ? { backgroundColor: "#fee2e2", color: "#b91c1c" } : undefined;
}

async function query() {
  loading.value = true;
  try {
    const dto: DtoQueryL2 = {
      dRange: toTimeRange(input.dates),
      slabNo: input.slabNo.trim() || null,
      cBatchOrder: input.cBatchOrder.trim() || null,
      nFurStatus: input.nFurStatus,
    };
    const list = (await hR4200Api.queryTiL2me06s(dto)) ?? [];
    const byTime = (a: TiL2ME06ItemDto, b: TiL2ME06ItemDto) => String(b.createTime ?? "").localeCompare(String(a.createTime ?? ""));
    rows1.value = list.filter((x) => x.furNo === 1).sort(byTime);
    rows2.value = list.filter((x) => x.furNo === 2).sort(byTime);
    requestAnimationFrame(() => {
      api1.value?.autoSizeAllColumns();
      api2.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

/* ---------- 自动刷新（原 timer1 Interval=10000 + checkButton1） ---------- */
const autoOn = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;
function toggleAuto() {
  autoOn.value = !autoOn.value;
  if (autoOn.value) timer = setInterval(() => void query(), 10000);
  else if (timer) { clearInterval(timer); timer = null; }
}
onBeforeUnmount(() => { if (timer) clearInterval(timer); });

/* ---------- 打印（占位） ---------- */
function btnPrint(which: 1 | 2) {
  const rowsData = which === 1 ? rows1.value : rows2.value;
  if (rowsData.length === 0) return;
  const selected = (which === 1 ? api1 : api2).value?.getSelectedRows() as TiL2ME06ItemDto[] | undefined;
  if (!selected || selected.length === 0) return;
  toast("打印功能待接入（原报表模板 9a7a97ba…）", 2500, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.slabNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批号</label>
        <InputText v-model="input.cBatchOrder" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">加热炉状态</label>
        <Select v-model="input.nFurStatus" :options="furStatusOptions" option-label="label" option-value="value"
          class="min-w-0 flex-1" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">作业时间</label>
        <DatePicker v-model="input.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
        <Button :variant="autoOn ? 'filled' : 'outlined'" severity="secondary"
          class="shrink-0 whitespace-nowrap" @click="toggleAuto">
          {{ autoOn ? "已开启" : "已关闭" }}
        </Button>
      </div>
    </div>

    <Splitter class="min-h-0 flex-1">
      <SplitterPanel :size="50" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">1#加热炉</span>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnPrint(1)">
            <IconPrinter class="h-3 w-3" />打印
          </Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows1"
            :row-selection="{ mode: 'multiRow', checkboxes: true }" :pagination="false" :animate-rows="false"
            :get-row-style="rowRed" :loading="loading" @grid-ready="onReady1"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="50" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">2#加热炉</span>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnPrint(2)">
            <IconPrinter class="h-3 w-3" />打印
          </Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows2"
            :row-selection="{ mode: 'multiRow', checkboxes: true }" :pagination="false" :animate-rows="false"
            :get-row-style="rowRed" :loading="loading" @grid-ready="onReady2"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
