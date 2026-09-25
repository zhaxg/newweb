<script setup lang="ts">
/** 对应 FrmTqlCfCollect（成分信息，菜单 QL1130）：DDH.Winforms.LIMS.Forms.FrmTqlCfCollect
 *  布局：查询条件区（DataLayout 可见 4 项：创建时间 TimeRange / 熔炼号 HeatNo / 样号 CSampNo / 钢种 SteelGrade；
 *         状态 NStatus LayoutVisibility=Never 不展示，查询仍默认 正常）
 *       + stackPanel1（查询）→ 全宽网格 TqlCfCollect（可见47+隐藏1备注）
 *  已接入：tqlCFCollectApi.queryTqlCfCollects（swagger 已生成）
 *  待接入：无（原窗体仅此 1 处查询）
 *  已知偏差：默认 创建时间=近7天、状态=正常（原 Load 默认值）；
 *         化学元素列头保持英文符号（ui-rules，不译中文） */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import {
  TqlCFCollectNstatus,
  tqlCFCollectApi,
  type QueryTqlCFCollectDto,
  type TqlCfCollect,
  type TimeRange,
} from "@/api/mes4ddh/lims.swagger";

const theme = makeHmxGridTheme();
const rows = shallowRef<TqlCfCollect[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

/* ---------- 查询条件（原 bscQueryTqlCFCollectDto；Load 默认 近7天 + 状态=正常） ---------- */
function defaultDates(): Date[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 7);
  const end = new Date();
  end.setHours(23, 59, 59, 0);
  end.setDate(end.getDate() + 1);
  end.setSeconds(end.getSeconds() - 1);
  return [start, end];
}
const input = reactive({
  dates: defaultDates() as Date[] | null,
  heatNo: "",
  cSampNo: "",
  steelGrade: "",
});
/** 原 dto.NStatus = Normal；状态控件 Visibility=Never，仅作查询默认 */
const nStatusDefault = TqlCFCollectNstatus.Normal;

function isoLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates?.[0]) return undefined;
  return { min: isoLocal(dates[0]), max: dates[1] ? isoLocal(dates[1]) : undefined };
}
function buildQuery(): QueryTqlCFCollectDto {
  return {
    timeRange: toTimeRange(input.dates),
    heatNo: input.heatNo?.trim() || undefined,
    cSampNo: input.cSampNo?.trim() || undefined,
    steelGrade: input.steelGrade?.trim() || undefined,
    nStatus: nStatusDefault,
  };
}

/* ---------- 格式化 ---------- */
/** 原 AddEnum(TqlCFCollectNstatus) → LDisplay */
const nStatusFmt = (p: ValueFormatterParams) =>
  (
    ({
      [TqlCFCollectNstatus.Failure]: "处理失败",
      [TqlCFCollectNstatus.Normal]: "正常",
      [TqlCFCollectNstatus.Abnormal]: "失效",
      [TqlCFCollectNstatus.UnHandle]: "待处理",
      [TqlCFCollectNstatus.NStatusAbnormal]: "异常",
    }) as Record<string, string>
  )[String(p.value)] ?? (p.value == null ? "" : String(p.value));

/* ---------- 列（Designer VisibleIndex；化学元素列头英文；camelCase 对齐 swagger） ---------- */
const colDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cSampNo", headerName: "样号", width: 90 },
  { field: "cMeltingNo", headerName: "熔炼号", width: 100 },
  { field: "cStove", headerName: "炉号", width: 90 },
  { field: "cSgCode", headerName: "钢种", width: 90 },
  { field: "creator", headerName: "创建人", width: 90 },
  { field: "createTime", headerName: "创建时间", width: 140 },
  { field: "cSgStd", headerName: "标准", width: 120 },
  { field: "cStaCode", headerName: "工位", width: 80 },
  { field: "cCheckTime", headerName: "检验时间", width: 140 },
  { field: "cShift", headerName: "班次", width: 70 },
  { field: "cGroup", headerName: "班组", width: 70 },
  { field: "nStatus", headerName: "状态", width: 90, valueFormatter: nStatusFmt },
  /* 化学元素列头保持英文（ui-rules §8.4），字段对齐 swagger 小写 */
  { field: "c", headerName: "C", width: 70 },
  { field: "si", headerName: "Si", width: 70 },
  { field: "mn", headerName: "Mn", width: 70 },
  { field: "p", headerName: "P", width: 70 },
  { field: "s", headerName: "S", width: 70 },
  { field: "cr", headerName: "Cr", width: 70 },
  { field: "ni", headerName: "Ni", width: 70 },
  { field: "mo", headerName: "Mo", width: 70 },
  { field: "cu", headerName: "Cu", width: 70 },
  { field: "al", headerName: "Al", width: 70 },
  { field: "ti", headerName: "Ti", width: 70 },
  { field: "nb", headerName: "Nb", width: 70 },
  { field: "v", headerName: "V", width: 70 },
  { field: "als", headerName: "Als", width: 70 },
  { field: "ca", headerName: "Ca", width: 70 },
  { field: "ceq", headerName: "Ceq", width: 70 },
  { field: "b", headerName: "B", width: 70 },
  { field: "alins", headerName: "Alins", width: 75 },
  { field: "w", headerName: "W", width: 70 },
  { field: "as", headerName: "As", width: 70 },
  { field: "sn", headerName: "Sn", width: 70 },
  { field: "co", headerName: "Co", width: 70 },
  { field: "pb", headerName: "Pb", width: 70 },
  { field: "sb", headerName: "Sb", width: 70 },
  { field: "ta", headerName: "Ta", width: 70 },
  { field: "zr", headerName: "Zr", width: 70 },
  { field: "bi", headerName: "Bi", width: 70 },
  { field: "se", headerName: "Se", width: 70 },
  { field: "te", headerName: "Te", width: 70 },
  { field: "ce", headerName: "Ce", width: 70 },
  { field: "la", headerName: "La", width: 70 },
  { field: "n", headerName: "N", width: 70 },
  { field: "lastModifier", headerName: "最后修改人", width: 110 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 140 },
  { field: "cRemark", headerName: "备注", hide: true },
  { field: "id", headerName: "主键", hide: true },
]);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/* ---------- 查询（原 btnQuery_Click → QueryTqlCfCollects） ---------- */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tqlCFCollectApi.queryTqlCfCollects(buildQuery())) ?? [];
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
    <!-- 查询条件区（4 可见项一行；状态控件原窗体隐藏不迁） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">创建时间</label>
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
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">熔炼号</label>
          <InputText v-model="input.heatNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">样号</label>
          <InputText v-model="input.cSampNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.steelGrade" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- stackPanel1：查询 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-auto shrink-0 text-xs text-muted-foreground">成分信息（{{ rows.length }}）</span>
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
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
