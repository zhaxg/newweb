<script setup lang="ts">
/** 对应 FrmHR4510（堆冷台账）：DDH.Winforms.SHR.Forms.FrmHR4510
 *  已接入：hR3600Api.queryHls（上·堆冷明细）、hR3600Api.queryHR4510s（下·台账信息汇总）；
 *          堆冷状态取自菜单参数（原 nHlStatus = QueryString）；默认时间 [今日, 明日]（原 ucTimeRange1）
 *  待接入：无（原窗体无二级弹窗）
 *  偏差：班组/班次/切边方式/操作人/去向等 KV 列显示原值（原为 CodeFormatter 运行时灌值）；
 *        汇总表按实体 HR4510HzDto 的 LDisplay 列头平铺、未复刻原 band（「到期数量」等列头重复出现，
 *        成品库/堆冷坑两组按原列序区分）；
 *        TS DtoQuerySlabs 尚未声明 cBatchOrder/cBatchOrders（后端 C# Dto 已有），页面本地类型补；
 *        原 Selected（"选择"）列以行选择复选框承接，不再作数据列 */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  hR3600Api,
  Thr3010HlStatusEnum,
  type DtoQuerySlabs,
  type HR4510HzDto,
  type Thr3010Hl,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

/* ---------- 菜单参数（原 FrmHR4510_Load: nHlStatus = QueryString） ---------- */
const { raw: menuQs } = useMenuQuery();
const nHlStatus = /^\d+$/.test(menuQs.trim()) ? (Number(menuQs.trim()) as Thr3010HlStatusEnum) : null;

/* ---------- 时间（原 ucTimeRange1，默认 [今天零点, 明天零点]） ---------- */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 查询条件（组批号 / 批量组批号 / 时间范围） ---------- */
const input = reactive({
  cBatchOrder: "",
  cBatchOrders: "",
  dates: defaultRange() as Date[] | null,
});

/** C# DtoQuerySlabs 的 CBatchOrder/CBatchOrders 两字段暂缺于 TS swagger，本地补 */
type HlQuery = DtoQuerySlabs & { cBatchOrder?: string | null; cBatchOrders?: string[] | null };

/* 原 txtBatchOrders.Text.Split(['\r','\n'], RemoveEmptyEntries) */
function splitLines(text: string): string[] {
  return text.split(/[\r\n]+/).filter(Boolean);
}

/* ---------- 表格状态（两表各自独立转圈，原各 ShowLoadingPanel） ---------- */
const rows = shallowRef<Thr3010Hl[]>([]);
const hzRows = shallowRef<HR4510HzDto[]>([]);
const loading = ref(false);
const loadingHz = ref(false);
const gridApi = ref<GridApi | null>(null);
const hzGridApi = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function onHzReady(e: GridReadyEvent) {
  hzGridApi.value = e.api;
}

/* ---------- 主表 gridView1 / Thr3010HlDto（33 可见列，Selected 以行选择承接） ---------- */
const colDefs: ColDef[] = [
  { colId: "cStackType", field: "cStackType", headerName: "垛位类型", width: 150 },
  { colId: "cHlStack", field: "cHlStack", headerName: "垛位", width: 112 },
  { colId: "cHlStackNum", field: "cHlStackNum", headerName: "层号", width: 112 },
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 112 },
  { colId: "cInboundNo1", field: "cInboundNo1", headerName: "入库标识1", width: 112 },
  { colId: "cInboundNo2", field: "cInboundNo2", headerName: "入库标识2", width: 112 },
  { colId: "nThickOrder", field: "nThickOrder", headerName: "订单厚度", width: 112 },
  { colId: "cIsQy", field: "cIsQy", headerName: "取样板标记", width: 113 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "坯宽", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "坯重", width: 112 },
  { colId: "nLenPlan1", field: "nLenPlan1", headerName: "套切长度1", width: 112 },
  { colId: "nLenPlan2", field: "nLenPlan2", headerName: "套切长度2", width: 112 },
  { colId: "nWidthPlan1", field: "nWidthPlan1", headerName: "套切宽度1", width: 112 },
  { colId: "nWidthPlan2", field: "nWidthPlan2", headerName: "套切宽度2", width: 112 },
  { colId: "cExitem1", field: "cExitem1", headerName: "是否工程单", width: 112 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 112 },
  { colId: "cHlGroupIn", field: "cHlGroupIn", headerName: "开始班组", width: 112 },
  { colId: "dLcIn", field: "dLcIn", headerName: "上冷床时间", width: 150 },
  { colId: "nLcWd", field: "nLcWd", headerName: "上冷床温度", width: 150 },
  { colId: "nLc", field: "nLc", headerName: "冷床冷却时长", width: 150 },
  { colId: "dHlIn", field: "dHlIn", headerName: "开始时间", width: 112 },
  { colId: "nWdIn", field: "nWdIn", headerName: "开始温度", width: 112 },
  { colId: "nHlHour", field: "nHlHour", headerName: "计划堆冷时间", width: 112 },
  { colId: "nHlHourSj", field: "nHlHourSj", headerName: "实际堆冷时间", width: 112 },
  { colId: "nHlHourSy", field: "nHlHourSy", headerName: "剩余堆冷时间", width: 112 },
  { colId: "cHlUserIn", field: "cHlUserIn", headerName: "开始人", width: 112 },
  { colId: "dHlOut", field: "dHlOut", headerName: "结束时间", width: 112 },
  { colId: "cHlGroupOut", field: "cHlGroupOut", headerName: "结束班组", width: 112 },
  { colId: "cHlUserOut", field: "cHlUserOut", headerName: "结束人", width: 112 },
  { colId: "id", field: "id", headerName: "主键", width: 112, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 112, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 112, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 112, hide: true },
  { colId: "cMxId", field: "cMxId", headerName: "THR3010主键", width: 112, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线", width: 112, hide: true },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 112, hide: true },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112, hide: true },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112, hide: true },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "头侧件次号", width: 112, hide: true },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 112, hide: true },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112, hide: true },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112, hide: true },
  { colId: "nNum", field: "nNum", headerName: "提货件数", width: 112, hide: true },
  { colId: "nHlStatus", field: "nHlStatus", headerName: "缓冷状态", width: 112, hide: true },
  { colId: "cHlCode", field: "cHlCode", headerName: "堆冷设备", width: 112, hide: true },
  { colId: "cHlShiftIn", field: "cHlShiftIn", headerName: "开始班次", width: 112, hide: true },
  { colId: "nWdOut", field: "nWdOut", headerName: "结束温度", width: 112, hide: true },
  { colId: "cHlShiftOut", field: "cHlShiftOut", headerName: "结束班次", width: 112, hide: true },
  { colId: "cPlanNo", field: "cPlanNo", headerName: "计划号", width: 112, hide: true },
  { colId: "cOrderCustCname", field: "cOrderCustCname", headerName: "订货客户", width: 112, hide: true },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 112, hide: true },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 112, hide: true },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 112, hide: true },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 112, hide: true },
  { colId: "cOrderNo5", field: "cOrderNo5", headerName: "订单号5", width: 112, hide: true },
  { colId: "cOrderNo6", field: "cOrderNo6", headerName: "订单号6", width: 112, hide: true },
  { colId: "nLenPlan3", field: "nLenPlan3", headerName: "套切长度3", width: 112, hide: true },
  { colId: "nLenPlan4", field: "nLenPlan4", headerName: "套切长度4", width: 112, hide: true },
  { colId: "nLenPlan5", field: "nLenPlan5", headerName: "套切长度5", width: 112, hide: true },
  { colId: "nLenPlan6", field: "nLenPlan6", headerName: "套切长度6", width: 112, hide: true },
  { colId: "cInboundNo3", field: "cInboundNo3", headerName: "入库标识3", width: 112, hide: true },
  { colId: "cInboundNo4", field: "cInboundNo4", headerName: "入库标识4", width: 112, hide: true },
  { colId: "cInboundNo5", field: "cInboundNo5", headerName: "入库标识5", width: 112, hide: true },
  { colId: "cInboundNo6", field: "cInboundNo6", headerName: "入库标识6", width: 112, hide: true },
  { colId: "nWidthPlan3", field: "nWidthPlan3", headerName: "套切宽度3", width: 112, hide: true },
  { colId: "nWidthPlan4", field: "nWidthPlan4", headerName: "套切宽度4", width: 112, hide: true },
  { colId: "nWidthPlan5", field: "nWidthPlan5", headerName: "套切宽度5", width: 112, hide: true },
  { colId: "nWidthPlan6", field: "nWidthPlan6", headerName: "套切宽度6", width: 112, hide: true },
  { colId: "cDestination", field: "cDestination", headerName: "去向", width: 112, hide: true },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", width: 112, hide: true },
  { colId: "cPosCode", field: "cPosCode", headerName: "下线位置", width: 112, hide: true },
];

/* ---------- 汇总表 bandedGridView1 / HR4510HzDto（17 列，列头取实体 LDisplay） ---------- */
const hzColDefs: ColDef[] = [
  { colId: "date", field: "date", headerName: "日期", width: 112 },
  { colId: "nAllDlQua", field: "nAllDlQua", headerName: "总数量", width: 112 },
  { colId: "nAllDlWgt", field: "nAllDlWgt", headerName: "总重量", width: 112 },
  { colId: "nQuaHq", field: "nQuaHq", headerName: "火切支数", width: 112 },
  { colId: "nWgtHq", field: "nWgtHq", headerName: "火切重量", width: 112 },
  { colId: "nQuaDrk", field: "nQuaDrk", headerName: "待入库支数", width: 112 },
  { colId: "nWgtDrk", field: "nWgtDrk", headerName: "待入库重量", width: 112 },
  { colId: "nCpDlFinishQua", field: "nCpDlFinishQua", headerName: "到期数量", width: 112 },
  { colId: "nCpDlFinishWgt", field: "nCpDlFinishWgt", headerName: "到期重量", width: 112 },
  { colId: "nCpDlNotQua", field: "nCpDlNotQua", headerName: "未到期数量", width: 112 },
  { colId: "nCpDlNotWgt", field: "nCpDlNotWgt", headerName: "未到期重量", width: 112 },
  { colId: "nSlabDlFinishQua", field: "nSlabDlFinishQua", headerName: "到期数量", width: 112 },
  { colId: "nQuaJq", field: "nQuaJq", headerName: "剪切支数", width: 112 },
  { colId: "nSlabDlFinishWgt", field: "nSlabDlFinishWgt", headerName: "到期重量", width: 112 },
  { colId: "nSlabDlNotQua", field: "nSlabDlNotQua", headerName: "未到期数量", width: 112 },
  { colId: "nSlabDlNotWgt", field: "nSlabDlNotWgt", headerName: "未到期重量", width: 112 },
  { colId: "nWgtJq", field: "nWgtJq", headerName: "剪切重量", width: 112 },
];

/* ---------- 原 btnQuery_Click → DataBind + HzDataBind（各自独立异步） ---------- */
async function query() {
  loading.value = true;
  try {
    const dto: HlQuery = {
      cBatchOrder: input.cBatchOrder.trim() || null,
      cBatchOrders: splitLines(input.cBatchOrders),
      timeRange: toTimeRange(input.dates),
      nHlStatus,
    };
    rows.value = (await hR3600Api.queryHls(dto)) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

async function queryHz() {
  loadingHz.value = true;
  try {
    const dto: HlQuery = {
      cBatchOrders: splitLines(input.cBatchOrders),
      timeRange: toTimeRange(input.dates),
      nHlStatus,
    };
    hzRows.value = (await hR3600Api.queryHR4510s(dto)) ?? [];
    requestAnimationFrame(() => hzGridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loadingHz.value = false;
  }
}

function onQuery() {
  query();
  queryHz();
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：组批号 / 批量组批号（原 MemoExEdit 多行）/ 时间范围 -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批号</label>
        <InputText v-model="input.cBatchOrder" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批量组批号</label>
        <Textarea v-model="input.cBatchOrders" rows="1" class="min-w-0 flex-1" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
        <DatePicker
          v-model="input.dates"
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
    </div>

    <!-- 工具栏（原 btnQuery；标题为原 groupControl1「堆冷明细」） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading || loadingHz" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">堆冷明细（{{ rows.length }}）</span>
    </div>

    <!-- 上下分栏（原 splitContainerControl1，SplitterPosition 429/874） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="49" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs"
            :row-data="rows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="loading"
            @grid-ready="onReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :minSize="25" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs text-muted-foreground">台账信息（{{ hzRows.length }}）</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="hzColDefs"
            :row-data="hzRows"
            :pagination="false"
            :animate-rows="false"
            :loading="loadingHz"
            @grid-ready="onHzReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
