<script setup lang="ts">
/** 对应 FrmHR9080（轧制异常实绩，HR9081-9085 共用）：DDH.Winforms.SHR.Forms.FrmHR9080
 *  已接入：hR9000Api.queryTiL2me01s（zone 取菜单路由参数 cQueryString：FUR/FURD/RM/FRM/PDID）
 *  偏差：shiftNo/shiftGroup/责任者等 KV 列显示原值 */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { hR9000Api, type DtoQueryL2, type TiL2me01Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { raw: menuRaw } = useMenuQuery();

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

/* ---------- 查询条件（DtoQueryL2，zone=菜单参数） ---------- */
const input = reactive({
  slabNo: "",
  plateNo: "",
  dates: monthRange() as Date[] | null,
});

/* ---------- 表格（gridView1 / TiL2me01Dto） ---------- */
const rows = shallowRef<TiL2me01Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) { api.value = e.api; }

/* 原 EnumCodeConverter<TiL2me01RejectReasonEnum> / <TiL2me01RejectPositionEnum.StringValue> */
const reasonFmt = (p: ValueFormatterParams) =>
  ({ "1": "规格不符", "2": "质量不符", "3": "生产原因" })[String(p.value)] ?? "";
const zoneFmt = (p: ValueFormatterParams) =>
  ({ FUR: "炉前甩坯", FURD: "炉后甩坯", RM: "粗轧轧废", FRM: "精轧轧废", PDID: "计划删除" })[String(p.value)] ?? "";

const colDefs: ColDef[] = [
    { colId: "plateNo", field: "plateNo", headerName: "钢板号", width: 150 },
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 150 },
  { colId: "zone", field: "zone", headerName: "位置", width: 150, valueFormatter: zoneFmt },
  { colId: "reason", field: "reason", headerName: "异常原因", width: 150, valueFormatter: reasonFmt },
  { colId: "actPassNo", field: "actPassNo", headerName: "当前实际道次号", width: 150 },
  { colId: "actThick", field: "actThick", headerName: "当前厚度", width: 150 },
  { colId: "actWidth", field: "actWidth", headerName: "当前宽度", width: 150 },
  { colId: "actLength", field: "actLength", headerName: "当前长度", width: 150 },
  { colId: "shiftNo", field: "shiftNo", headerName: "班次", width: 150 },
  { colId: "shiftGroup", field: "shiftGroup", headerName: "班组", width: 150 },
  { colId: "productTime", field: "productTime", headerName: "生产时间", width: 150 },
  { colId: "author", field: "author", headerName: "责任者", width: 150 },
  { colId: "slabWeight", field: "slabWeight", headerName: "板坯实际重量", width: 150 },
  { colId: "discAuthor", field: "discAuthor", headerName: "责任者", width: 150 },
  { colId: "rmAuthorA", field: "rmAuthorA", headerName: "粗轧责任者A", width: 150 },
  { colId: "rmAuthorB", field: "rmAuthorB", headerName: "粗轧责任者B", width: 150 },
  { colId: "fmAuthorA", field: "fmAuthorA", headerName: "精轧责任者A", width: 150 },
  { colId: "fmAuthorB", field: "fmAuthorB", headerName: "精轧责任者B", width: 150 },
  { colId: "dProductTime", field: "dProductTime", headerName: "生产时间", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "坯料钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "坯料标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "坯料规格", width: 150 },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 150 },
  { colId: "nWidth", field: "nWidth", headerName: "坯宽", width: 150 },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 150 },
  { colId: "furNo", field: "furNo", headerName: "加热炉号", width: 150 },
  { colId: "rowNo", field: "rowNo", headerName: "列号", width: 150 },
  { colId: "spare2", field: "spare2", headerName: "预留（照核长度）", width: 150 },
  { colId: "spare3", field: "spare3", headerName: "预留（炉前称重）", width: 150 },
  { colId: "spare4", field: "spare4", headerName: "照核长度", width: 150 },
  { colId: "spare5", field: "spare5", headerName: "照核宽度", width: 150 },
  { colId: "spare6", field: "spare6", headerName: "照核厚度", width: 150 },
  { colId: "cSgCodePlan", field: "cSgCodePlan", headerName: "计划钢种", width: 150 },
  { colId: "cSgStdPlan", field: "cSgStdPlan", headerName: "计划标准", width: 150 },
  { colId: "cSpecPlan", field: "cSpecPlan", headerName: "轧制规格", width: 150 },
  { colId: "nThickPlan", field: "nThickPlan", headerName: "轧制厚度", width: 150 },
  { colId: "nWidthPlan", field: "nWidthPlan", headerName: "轧制宽度", width: 150 },
  { colId: "nLenPlan", field: "nLenPlan", headerName: "轧制长度", width: 150 },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 150 },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 150 },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 150 },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 150 },
  { colId: "cOrderNo5", field: "cOrderNo5", headerName: "订单号5", width: 150 },
  { colId: "cOrderNo6", field: "cOrderNo6", headerName: "订单号6", width: 150 },
  { colId: "nLenPlan1", field: "nLenPlan1", headerName: "套切长度1", width: 150 },
  { colId: "nLenPlan2", field: "nLenPlan2", headerName: "套切长度2", width: 150 },
  { colId: "nLenPlan3", field: "nLenPlan3", headerName: "套切长度3", width: 150 },
  { colId: "nLenPlan4", field: "nLenPlan4", headerName: "套切长度4", width: 150 },
  { colId: "nLenPlan5", field: "nLenPlan5", headerName: "套切长度5", width: 150 },
  { colId: "nLenPlan6", field: "nLenPlan6", headerName: "套切长度6", width: 150 },
  { colId: "cInboundNo1", field: "cInboundNo1", headerName: "入库标识1", width: 150 },
  { colId: "cInboundNo2", field: "cInboundNo2", headerName: "入库标识2", width: 150 },
  { colId: "cInboundNo3", field: "cInboundNo3", headerName: "入库标识3", width: 150 },
  { colId: "cInboundNo4", field: "cInboundNo4", headerName: "入库标识4", width: 150 },
  { colId: "cInboundNo5", field: "cInboundNo5", headerName: "入库标识5", width: 150 },
  { colId: "cInboundNo6", field: "cInboundNo6", headerName: "入库标识6", width: 150 },
  { colId: "nBc", field: "nBc", headerName: "倍尺", width: 150 },
  { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 150 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 150 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 150 },
  { colId: "cSpecialMarkGy", field: "cSpecialMarkGy", headerName: "性能要求", width: 150 },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 150 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 150 },
  { colId: "cConRemark", field: "cConRemark", headerName: "合同备注", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "dHandle", field: "dHandle", headerName: "处理时间", width: 150, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "处理结果", width: 150, hide: true },
];

async function query() {
  loading.value = true;
  try {
    const dto: DtoQueryL2 = {
      dRange: toTimeRange(input.dates),
      slabNo: input.slabNo.trim() || null,
      plateNo: input.plateNo.trim() || null,
      zone: menuRaw || null,
    };
    rows.value = (await hR9000Api.queryTiL2me01s(dto)) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢板号</label>
        <InputText v-model="input.plateNo" class="min-w-0 flex-1" @keydown.enter="query" />
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
      </div>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows" :pagination="false"
        :animate-rows="false" :loading="loading" @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
