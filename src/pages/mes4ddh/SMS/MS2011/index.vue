<script setup lang="ts">
/** 对应 FrmMS2011（一炼钢铁水倒灌记录）：DDH.Winforms.SMS.Forms.FrmMS2011
 *  已接入：frmMS2010Api.getIntrusionDatas（查询 btnQuery——lineCode + begDate + endDate）
 *  cQueryString：{FactoryCode,LineCode} 经 useMenuQuery 解析，产线只读回显（原 ucLine1 Enabled=false/ReadOnly）
 *  初始化照 FrmMS2011_Load：deBegDate=今天-7、deEndDate=今天+1；列集按 extract（可见13+隐藏11，Selected 在隐藏列）
 *  待接入：倒罐类型/班次/班组编码格式化器（IntrusionTypeEnumFormatter、MS_SHIFT/MS_GROUP 字典）未迁，单元格显示原始编码 */
import { ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { frmMS2010Api } from "@/api/mes4ddh/sms.swagger";
import { useMenuQuery } from "@/lib/menuQuery";

type Row = Record<string, any>;

const { json: menuJson } = useMenuQuery();
const qsLine =
  typeof menuJson.LineCode === "string"
    ? menuJson.LineCode
    : typeof menuJson.lineCode === "string"
      ? menuJson.lineCode
      : "";
const lineCode = ref(qsLine);

const theme = makeHmxGridTheme();
const rows = ref<Row[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

function addDays(delta: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return d;
}
function fmt(d: Date | null): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* 原 stackPanel1：产线 ucLine1(只读) + 日期 deBegDate~deEndDate + 查询 */
const deBegDate = ref<Date | null>(addDays(-7));
const deEndDate = ref<Date | null>(addDays(1));

const colDefs = ref<ColDef[]>([
  { field: "cIntrusionSign", headerName: "倒罐标识", width: 112 },
  { field: "cIntrusionType", headerName: "倒罐类型", width: 112 },
  { field: "nIntrusionWgt", headerName: "倒罐重量吨", width: 83 },
  { field: "cTsId", headerName: "铁水数据id", width: 104 },
  { field: "cIronNo", headerName: "铁次号", width: 83 },
  { field: "cPotNo", headerName: "罐号", width: 86 },
  { field: "cCarNo", headerName: "车号", width: 86 },
  { field: "dTeamDate", headerName: "虚拟或占用炉号班次日期", width: 72 },
  { field: "cShift", headerName: "班次", width: 86 },
  { field: "cTeam", headerName: "班组", width: 86 },
  { field: "cBackup", headerName: "备注", width: 86 },
  { field: "creator", headerName: "创建人", width: 99 },
  { field: "createTime", headerName: "创建时间", width: 112 },
  { field: "id", headerName: "主键", hide: true },
  { field: "cTimestamp", headerName: "时间戳", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cSw01", headerName: "备用字段1", hide: true },
  { field: "cSw02", headerName: "备用字段2", hide: true },
  { field: "cSw03", headerName: "备用字段3", hide: true },
  { field: "cSw04", headerName: "备用字段4", hide: true },
  { field: "cSw05", headerName: "备用字段5", hide: true },
  { field: "cSw06", headerName: "备用字段6", hide: true },
  { field: "selected", headerName: "选择", hide: true },
]);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/** btnQuery_Click → Proxy.GetIntrusionDatas(lineCode, begDate, endDate) */
async function onQuery() {
  querying.value = true;
  try {
    rows.value =
      (await frmMS2010Api.getIntrusionDatas({
        lineCode: lineCode.value || undefined,
        begDate: fmt(deBegDate.value),
        endDate: fmt(deEndDate.value),
      })) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询行（原 stackPanel1 Dock=Top：产线/日期/~/查询） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineCode" disabled class="w-28 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">日期</label>
      <DatePicker v-model="deBegDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">~</label>
      <DatePicker v-model="deEndDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        :loading="querying"
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
