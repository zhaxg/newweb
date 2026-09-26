<script setup lang="ts">
/** 对应 FrmTI1030（定尺剪剪切实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1030
 *  已接入：tI1030Api.ti1030Query（原 Svc<ITI1030AppService>.Proxy.Ti1030Query(DtoTi1030Query)）
 *    / systemKeyValueApi.getSysKvListByGroup("010100:CUTFLAG")（colCTrimFlag 原 KeyValueFormatters.CUTFLAG 翻译）
 *  查询条件（原 dataLayoutControl1 6 项，X 序）：创建时间(UCTimeRange，默认 [今天00:00, 明天00:00]) /
 *    板坯号 / 组批号 / 钢种 / 切边方式(原 .cs 手工三项：毛边=0 四切=1 两毛两切=2) / 机组代码(CCrewCode 1#剪/2#剪)
 *  列格式化（原 SetCodeFormatterAsync）：切边方式←KV CUTFLAG；机组代码←CCrewCode(1/2)；剪切班组←a/b/c=甲乙丙；
 *    剪切班次←1/2/3=早中夜；头侧取板记号←A/G/S=普通/火切/剖分；头侧是否余长标记←0/1=否/是
 *  列集：36 列一一对应；Selected 勾选列 hide:true，勾选由 AG Grid row-selection 复选框呈现（ui-rules §7）
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
import { CCrewCode, tI1030Api, type DtoTi1030Query, type Ti1030Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

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

/* 切边方式：原 .cs Load 手工 Add 三项；机组代码：AddEnum(CCrewCode) */
const trimOptions = [
  { label: "毛边", value: "0" },
  { label: "四切", value: "1" },
  { label: "两毛两切", value: "2" },
];
const crewOptions = [
  { label: "1#剪", value: CCrewCode.Cut1 },
  { label: "2#剪", value: CCrewCode.Cut2 },
];

/* 枚举列翻译（KV 列切边方式走 systemKeyValueApi，见下方 kvTrim） */
const crewMap: Record<string, string> = { "1": "1#剪", "2": "2#剪" };
const shiftGroupMap: Record<string, string> = { a: "甲", b: "乙", c: "丙" };
const shiftNoMap: Record<string, string> = { "1": "早", "2": "中", "3": "夜" };
const partMarkMap: Record<string, string> = { A: "普通", G: "火切", S: "剖分" };
const lthMarkMap: Record<string, string> = { "0": "否", "1": "是" };
const codeFmt = (map: Record<string, string>) => (p: ValueFormatterParams) =>
  map[String(p.value ?? "")] ?? String(p.value ?? "");
const kvTrim = new Map<string, string>();
const kvFmt = (m: Map<string, string>) => (p: ValueFormatterParams) =>
  m.get(String(p.value ?? "")) ?? String(p.value ?? "");

/* ---------- 查询条件（原 bscDtoTi1030Query → DtoTi1030Query） ---------- */
const query = ref({
  cSlabNo: "",
  cZpNo: "",
  cCardNo: "",
  cTrimFlag: null as string | null,
  cCrewCode: null as CCrewCode | null,
  dates: defaultRange() as Date[] | null,
});

const rows = ref<Ti1030Dto[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/* ---------- colDefs（gridView1 / Ti1030Dto，Designer VisibleIndex 序） ---------- */
const colDefs: ColDef[] = [
  { field: "selected", headerName: "选择", width: 112, hide: true },
  { field: "creatTime", headerName: "创建时间", width: 112 },
  { field: "cCustName", headerName: "客户名称", width: 112 },
  { field: "cSaleCon", headerName: "销售合同号", width: 112 },
  { field: "cSonNo", headerName: "子板号", width: 112 },
  { field: "cSlabNo", headerName: "板坯号", width: 112 },
  { field: "cZpNo", headerName: "组批号", width: 112 },
  { field: "cSgCode", headerName: "钢种", width: 112 },
  { field: "cTrimFlag", headerName: "切边方式", width: 112, valueFormatter: kvFmt(kvTrim) },
  { field: "dCenterThick", headerName: "中心厚度", width: 112 },
  { field: "dSonThick", headerName: "子板厚mm", width: 112 },
  { field: "dSonWidth", headerName: "子板宽mm", width: 112 },
  { field: "dSonLen", headerName: "子板长mm", width: 112 },
  { field: "dSonWgt", headerName: "子板理重T", width: 112 },
  { field: "dSmallWgt", headerName: "小板实重", width: 112 },
  { field: "dPlanThick", headerName: "目标厚mm", width: 112 },
  { field: "dPlanWidth", headerName: "目标宽mm", width: 112 },
  { field: "dPlanLen", headerName: "目标长mm", width: 112 },
  { field: "dPlanWgt", headerName: "目标理论T", width: 112 },
  { field: "cCrewCode", headerName: "机组代码", width: 112, valueFormatter: codeFmt(crewMap) },
  { field: "dDsTime", headerName: "剪切时间", width: 112 },
  { field: "cShiftGroup", headerName: "剪切班组", width: 112, valueFormatter: codeFmt(shiftGroupMap) },
  { field: "cShiftNo", headerName: "剪切班次", width: 112, valueFormatter: codeFmt(shiftNoMap) },
  { field: "cInSlabNo", headerName: "入口材料号", width: 112 },
  { field: "cGlSonNo", headerName: "管理子板号", width: 112 },
  { field: "cBestSurface", headerName: "好面朝向", width: 112 },
  { field: "ctOrdNum", headerName: "头侧合同数", width: 112 },
  { field: "ctPartMark", headerName: "头侧取板记号", width: 112, valueFormatter: codeFmt(partMarkMap) },
  { field: "ctProductSum", headerName: "头侧成品板总数", width: 112 },
  { field: "cTdsLth", headerName: "头侧剪切长度(头部)", width: 112 },
  { field: "cBdsLth", headerName: "头侧剪切长度(尾部)", width: 112 },
  { field: "ctLthMark", headerName: "头侧是否余长标记", width: 112, valueFormatter: codeFmt(lthMarkMap) },
  { field: "cOperatorId", headerName: "操作者", width: 112 },
  { field: "cPosition", headerName: "岗位", width: 112 },
  { field: "cName", headerName: "姓名", width: 112 },
  { field: "dDsTemp", headerName: "剪切温度", width: 112 },
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

/* 原 btnQuery_Click：Ti1030Query(dto) → 回填 + BestFitColumns */
async function onQuery() {
  querying.value = true;
  try {
    const q = query.value;
    const dto: DtoTi1030Query = {
      timeRange: toTimeRange(q.dates),
      cSlabNo: q.cSlabNo || null,
      cZpNo: q.cZpNo || null,
      cCardNo: q.cCardNo || null,
      cTrimFlag: q.cTrimFlag,
      cCrewCode: q.cCrewCode,
    };
    rows.value = (await tI1030Api.ti1030Query(dto)) ?? [];
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
    <!-- 查询条件区（原 dataLayoutControl1 六项，按 X 坐标序：创建时间在前） -->
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="query.cSlabNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批号</label>
        <InputText v-model="query.cZpNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="query.cCardNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">切边方式</label>
        <Select
          v-model="query.cTrimFlag"
          :options="trimOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">机组代码</label>
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
    </div>

    <!-- 工具栏（原 stackPanel1 内 btnQuery 查询） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 主表（gridControl1 / gridView1，绑定实体 Ti1030Dto） -->
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
