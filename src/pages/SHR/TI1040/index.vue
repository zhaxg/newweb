<script setup lang="ts">
/** 对应 FrmTI1040（双边剪剪切实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1040
 *  已接入：tI1040Api.queryTi1040（原 Svc<ITI1040AppService>.Proxy.QueryTi1040(DtoTi1040Query)）
 *    / systemKeyValueApi.getSysKvListByGroup("010100:CUTFLAG")（colCTrimFlag 原 KeyValueFormatters.CUTFLAG 翻译）
 *  查询条件（原 stackPanel1 三项）：创建时间(UCTimeRange，默认 [今天00:00, 明天00:00]) / 机组(CCrewCode 1#剪/2#剪) / 子板号
 *  列格式化（原 SetCodeFormatterAsync）：机组←CCrewCode(1/2=1#剪/2#剪)；切边标记←KV CUTFLAG
 *  列集：24 列一一对应；Selected 勾选列 hide:true，勾选由 AG Grid row-selection 复选框呈现（ui-rules §7）
 *  待接入：无
 *  偏差：无 */

import { onMounted, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { systemKeyValueApi } from "@/api/admin/request";
import { CCrewCode, tI1040Api, type DtoTi1040Query, type Ti1040Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

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

/* 机组下拉：原 txtCCrewCode AddEnum(CCrewCode) */
const crewOptions = [
  { label: "1#剪", value: CCrewCode.Cut1 },
  { label: "2#剪", value: CCrewCode.Cut2 },
];
const crewMap: Record<string, string> = { "1": "1#剪", "2": "2#剪" };
const codeFmt = (map: Record<string, string>) => (p: ValueFormatterParams) =>
  map[String(p.value ?? "")] ?? String(p.value ?? "");
const kvTrim = new Map<string, string>();
const kvFmt = (m: Map<string, string>) => (p: ValueFormatterParams) =>
  m.get(String(p.value ?? "")) ?? String(p.value ?? "");

/* ---------- 查询条件（原 bscDtoTi1040Query → DtoTi1040Query） ---------- */
const query = ref({
  dates: defaultRange() as Date[] | null,
  cCrewCode: null as CCrewCode | null,
  cSonNo: "",
});

const rows = ref<Ti1040Dto[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/* ---------- colDefs（gridView1 / Ti1040Dto，Designer VisibleIndex 序） ---------- */
const colDefs: ColDef[] = [
  { field: "selected", headerName: "选择", width: 112, hide: true },
  { field: "createTime", headerName: "创建时间", width: 112 },
  { field: "cCustName", headerName: "客户", width: 112 },
  { field: "cCon", headerName: "合同号", width: 112 },
  { field: "cSonNo", headerName: "子板号", width: 112 },
  { field: "cSgCode", headerName: "钢种", width: 112 },
  { field: "dSonThick", headerName: "子板厚", width: 112 },
  { field: "dSonWidth", headerName: "子板宽", width: 112 },
  { field: "dSonLen", headerName: "子板长", width: 112 },
  { field: "dSonWgt", headerName: "子板理重", width: 112 },
  { field: "nSlabThick", headerName: "坯厚", width: 112 },
  { field: "nSlabWidth", headerName: "坯宽", width: 112 },
  { field: "nSlabLen", headerName: "坯长", width: 112 },
  { field: "nSlabWgt", headerName: "坯重", width: 112 },
  { field: "nLlWgt", headerName: "理论重量", width: 112 },
  { field: "cCrewCode", headerName: "机组", width: 112, valueFormatter: codeFmt(crewMap) },
  { field: "dDssTime", headerName: "剪切时间", width: 112 },
  { field: "dProductTime", headerName: "生产时刻", width: 112 },
  { field: "cTrimFlag", headerName: "切边标记", width: 112, valueFormatter: kvFmt(kvTrim) },
  { field: "cInSlabNo", headerName: "入口材料号", width: 112 },
  { field: "cInSlabWgt", headerName: "入口材料重", width: 112 },
  { field: "dDssTemp", headerName: "剪切温度", width: 112 },
  { field: "cCollectType", headerName: "收集方式", width: 112 },
  { field: "cSlabNo", headerName: "材料号", width: 112 },
];

onMounted(async () => {
  try {
    for (const x of (await systemKeyValueApi.getSysKvListByGroup("010100:CUTFLAG")) ?? [])
      kvTrim.set(x.cCode ?? "", x.cName ?? "");
  } catch {
    /* 拦截层已 toast */
  }
  gridApi.value?.refreshCells({ force: true });
});

/* 原 btnQuery_Click：QueryTi1040(dto) → 回填 + BestFitColumns */
async function onQuery() {
  querying.value = true;
  try {
    const q = query.value;
    const dto: DtoTi1040Query = {
      timeRange: toTimeRange(q.dates),
      cCrewCode: q.cCrewCode,
      cSonNo: q.cSonNo || null,
    };
    rows.value = (await tI1040Api.queryTi1040(dto)) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
    if (!rows.value.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 stackPanel1 三项：创建时间 / 机组 / 子板号） -->
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">机组</label>
        <Select
          v-model="query.cCrewCode"
          :options="crewOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">子板号</label>
        <InputText v-model="query.cSonNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1 内 btnQuery 查询） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 主表（gridControl1 / gridView1，绑定实体 Ti1040Dto） -->
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
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
