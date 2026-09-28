<script setup lang="ts">
/** 对应 FrmTI1000（拒收实绩明细）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1000
 *  已接入：tI1000Api.queryTiL2me01（主表查询，原 Svc<ITI1000AppService>.Proxy.QueryTiL2me01(DtoTi1000Query)）
 *    / tI1000Api.queryTiL2Me011s（明细查询，原 QueryTiL2Me011s(TiL2me01Id)）
 *    / tPa1000Api.queryLines（colRejectType 原 LineFormatter 产线代码翻译）
 *  查询条件（原 stackPanel1）：创建时间(UCTimeRange，默认 [今天00:00, 明天00:00]) / 材料号 / 计划号 /
 *    拒收位置(TiL2me01RejectPositionEnum 炉前甩坯…计划删除)
 *  列格式化（原 SetCodeFormatterAsync）：拒收类型←产线 KV；拒收位置←枚举名(FUR…)；拒收原因←枚举数字(1/2/3)；
 *    班组←TiShiftGroupEnum.StringValue(a/b/c=甲乙丙)；班次←TiShiftNoEnum(1/2/3=早中夜)
 *  列集：主表 21 可见 + 3 隐藏（tiL2me01Id/slabId/cZpId）；明细 24 可见 + 7 隐藏；Selected 列 hide:true
 *  待接入：无
 *  偏差：原明细随主表「焦点行变化」(FocusedRowObjectChanged) 加载；web 以点击选中行（取最后选中）触发，
 *    查询回填后自动加载第一行；原 Selected 勾选列以 hide:true 保留，勾选由 AG Grid row-selection 复选框呈现（ui-rules §7） */

import { onMounted, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, RowSelectedEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import {
  tI1000Api,
  tPa1000Api,
  type DtoTi1000Query,
  type TimeRange,
  type Ti1000Dto,
  type Ti1000_1Dto,
} from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}
/* 原 Load：TimeRange = [今天 00:00, 明天 00:00] */
function defaultRange(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ];
}

/* 拒收位置下拉候选（原 comRejectZone AddEnum(TiL2me01RejectPositionEnum)，值为枚举名） */
const rejectZoneOptions = [
  { label: "炉前甩坯", value: "FUR" },
  { label: "炉后甩坯", value: "FURD" },
  { label: "粗轧轧废", value: "RM" },
  { label: "精轧轧废", value: "FRM" },
  { label: "计划删除", value: "PDID" },
];

/* 列翻译映射（枚举类静态照搬；产线走 tPa1000Api.queryLines） */
const rejectPositionMap: Record<string, string> = {
  FUR: "炉前甩坯",
  FURD: "炉后甩坯",
  RM: "粗轧轧废",
  FRM: "精轧轧废",
  PDID: "计划删除",
};
const rejectReasonMap: Record<string, string> = { "1": "规格不符", "2": "质量不符", "3": "生产原因" };
const shiftGroupMap: Record<string, string> = { a: "甲", b: "乙", c: "丙" };
const shiftNoMap: Record<string, string> = { "1": "早", "2": "中", "3": "夜" };
const codeFmt = (map: Record<string, string>) => (p: ValueFormatterParams) =>
  map[String(p.value ?? "")] ?? String(p.value ?? "");
const kvLine = new Map<string, string>();
const kvFmt = (m: Map<string, string>) => (p: ValueFormatterParams) =>
  m.get(String(p.value ?? "")) ?? String(p.value ?? "");

/* ---------- 查询条件（原 DtoTi1000Query） ---------- */
const query = ref({
  dates: defaultRange() as Date[] | null,
  slabNo: "",
  planNo: "",
  rejectZone: null as string | null,
});

const rows = ref<Ti1000Dto[]>([]);
const detailRows = ref<Ti1000_1Dto[]>([]);
const querying = ref(false);
const detailQuerying = ref(false);
const masterApi = ref<GridApi | null>(null);
const detailApi = ref<GridApi | null>(null);
function onMasterReady(e: GridReadyEvent) {
  masterApi.value = e.api;
}
function onDetailReady(e: GridReadyEvent) {
  detailApi.value = e.api;
}

/* ---------- 主表 colDefs（gridView1 / Ti1000Dto，Designer VisibleIndex 序；Selected/主键列 hide） ---------- */
const colDefs: ColDef[] = [
  { field: "selected", headerName: "选择", width: 112, hide: true },
  { field: "slabNo", headerName: "材料号", width: 112 },
  { field: "zpNo", headerName: "组批号", width: 112 },
  { field: "rejectType", headerName: "拒收类型", width: 112, valueFormatter: kvFmt(kvLine) },
  { field: "rejectPosition", headerName: "拒收位置", width: 112, valueFormatter: codeFmt(rejectPositionMap) },
  { field: "planNo", headerName: "计划号", width: 112 },
  { field: "cardNo", headerName: "牌号", width: 112 },
  { field: "rejectReason", headerName: "拒收原因", width: 112, valueFormatter: codeFmt(rejectReasonMap) },
  { field: "furCode", headerName: "加热炉号", width: 112 },
  { field: "shiftGroup", headerName: "班组", width: 112, valueFormatter: codeFmt(shiftGroupMap) },
  { field: "shiftNo", headerName: "班次", width: 112, valueFormatter: codeFmt(shiftNoMap) },
  { field: "thick", headerName: "厚", width: 112 },
  { field: "width", headerName: "宽", width: 112 },
  { field: "len", headerName: "长", width: 112 },
  { field: "wgt", headerName: "重量", width: 112 },
  { field: "orderThick", headerName: "订单厚", width: 112 },
  { field: "orderWidth", headerName: "订单宽", width: 112 },
  { field: "orderLen", headerName: "订单长", width: 112 },
  { field: "orderWgt", headerName: "订单重量", width: 112 },
  { field: "createTime", headerName: "记录创建时间", width: 112 },
  { field: "author", headerName: "责任者", width: 112 },
  { field: "tiL2me01Id", headerName: "轧制计划异常实绩表主键", width: 112, hide: true },
  { field: "slabId", headerName: "组批材料主键", width: 112, hide: true },
  { field: "cZpId", headerName: "组批计划主键", width: 112, hide: true },
];

/* ---------- 明细 colDefs（gridView2 / Ti1000_1Dto；审计字段等 7 列 hide） ---------- */
const detailColDefs: ColDef[] = [
  { field: "passNo", headerName: "轧制道次", width: 112 },
  { field: "temp", headerName: "测量温度", width: 112 },
  { field: "tempCal", headerName: "计算温度", width: 112 },
  { field: "thickCal", headerName: "计算厚度", width: 112 },
  { field: "spray", headerName: "除鳞应用", width: 112 },
  { field: "turnFlag", headerName: "转钢标记", width: 112 },
  { field: "forceCal", headerName: "预算轧制力", width: 112 },
  { field: "forceAct", headerName: "实际轧制力", width: 112 },
  { field: "torqueCal", headerName: "预算扭矩", width: 112 },
  { field: "torqueAct", headerName: "实际扭矩", width: 112 },
  { field: "bendForceCal", headerName: "预算弯辊力", width: 112 },
  { field: "bendForceAct", headerName: "实际弯辊力", width: 112 },
  { field: "threadSpeed", headerName: "咬钢速度", width: 112 },
  { field: "runSpeed", headerName: "轧制速度", width: 112 },
  { field: "entryTemp", headerName: "入口温度", width: 112 },
  { field: "outSpeed", headerName: "出口速度", width: 112 },
  { field: "tempCalEn", headerName: "入口计算温度", width: 112 },
  { field: "widthEn", headerName: "入口宽度", width: 112 },
  { field: "widthEx", headerName: "出口宽度", width: 112 },
  { field: "lengthEx", headerName: "出口长度", width: 112 },
  { field: "rollTimeStart", headerName: "咬钢时间", width: 112 },
  { field: "rollTimeStop", headerName: "轧制时刻", width: 112 },
  { field: "falgN", headerName: "FALG_N", width: 112 },
  { field: "falgC", headerName: "FALG_C", width: 112 },
  { field: "selected", headerName: "选择", width: 112, hide: true },
  { field: "id", headerName: "主键", width: 112, hide: true },
  { field: "creator", headerName: "创建人", width: 112, hide: true },
  { field: "createTime", headerName: "创建时间", width: 112, hide: true },
  { field: "lastModifier", headerName: "最后修改人", width: 112, hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 112, hide: true },
  { field: "cpId", headerName: "轧制计划异常实绩表主键", width: 112, hide: true },
];

onMounted(async () => {
  try {
    for (const x of (await tPa1000Api.queryLines()) ?? []) kvLine.set(x.cCode ?? "", x.cName ?? "");
  } catch {
    /* 拦截层已 toast */
  }
  masterApi.value?.refreshCells({ force: true });
});

/* 原 btnQuery_Click：QueryTiL2me01(dto) → 主表回填 */
async function onQuery() {
  querying.value = true;
  try {
    const q = query.value;
    const dto: DtoTi1000Query = {
      timeRange: toTimeRange(q.dates),
      slabNo: q.slabNo || null,
      planNo: q.planNo || null,
      rejectZone: q.rejectZone,
    };
    rows.value = (await tI1000Api.queryTiL2me01(dto)) ?? [];
    requestAnimationFrame(() => masterApi.value?.autoSizeAllColumns());
    if (!rows.value.length) {
      detailRows.value = [];
      toast("无符合条件的数据", 2000, "info");
      return;
    }
    /* 原 FocusedRowObjectChanged：绑定数据源后焦点落在首行，自动带出明细 */
    loadDetail(rows.value[0]);
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 原 gridView1_FocusedRowObjectChanged：web 以选中行变化触发（取最后选中行） */
function onMasterRowSelected(e: RowSelectionEvent) {
  const sel = e.api.getSelectedRows() as Ti1000Dto[];
  if (sel.length) loadDetail(sel[sel.length - 1]);
}

async function loadDetail(row: Ti1000Dto) {
  if (!row.tiL2me01Id) {
    detailRows.value = [];
    return;
  }
  detailQuerying.value = true;
  try {
    detailRows.value = (await tI1000Api.queryTiL2Me011s(row.tiL2me01Id)) ?? [];
    requestAnimationFrame(() => detailApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    detailQuerying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 stackPanel1：创建时间 / 材料号 / 计划号 / 拒收位置） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">创建时间</label>
        <DatePicker
          v-model="query.dates"
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">材料号</label>
        <InputText v-model="query.slabNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">计划号</label>
        <InputText v-model="query.planNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">拒收位置</label>
        <Select
          v-model="query.rejectZone"
          :options="rejectZoneOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1 内 btnQuery 查询） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 上下主子表（原 splitContainerControl1，SplitterPosition 716/1070 ≈ 67%:33%） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="67" :minSize="25" class="flex flex-col overflow-hidden">
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
            :pagination="false"
            :loading="querying"
            @grid-ready="onMasterReady"
            @row-selected="onMasterRowSelected"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="33" :minSize="15" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="detailColDefs"
            :row-data="detailRows"
            :pagination="false"
            :loading="detailQuerying"
            @grid-ready="onDetailReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
