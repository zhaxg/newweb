<script setup lang="ts">
/** 对应 FrmMS9000（二炼钢铸坯实绩查询）：DDH.Winforms.SMS.Forms.FrmMS9000
 *  已接入：publicFactoryLineAreaMachineApi.getFactoryLineAreaMachine_LG（Load——机台下拉，
 *          过滤 LineCode=QueryString && RouteProcValue 以 CCM 开头，按机台编码/名称去重排序）
 *          + tms3000Api.queryList（btnQuery_Click——MS3000SjInputDto：产线/机台/炉号/件次号/钢种
 *          + 厚宽长区间 + 产出时间区间，Load 默认产出时间=昨天 00:00 ~ 明天 23:59:59）
 *  查询条件（原 dataLayoutControl1 8 个 LayoutControlItem）：机台(下拉) / 炉号 / 件次号 / 钢种 /
 *    厚度(UCDecimalRange) / 宽度(UCDecimalRange) / 长度(UCDecimalRange) / 产出时间(UCTimeRange)
 *  列：39 可见（LDisplay:Tms3000）+ 22 隐藏（hide:true）；炉号列页脚=自定义汇总去重计数
 *      （原 gridView1_CustomSummaryCalculate：HashSet 炉号去重取 Count）
 *  cQueryString：裸产线码 LG02 → LineCode
 *  待接入：右键记录菜单（原 SetPopupMenuForRecord<CPieceNo>，web 未迁）
 *  字段桥接：extract 为 PascalCase，后端 JSON 为 camelCase —— 列 field 直接写 camelCase */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import RangeInput from "@/components/common/RangeInput.vue";
import { tms3000Api, publicFactoryLineAreaMachineApi } from "@/api/mes4ddh/sms.swagger";
import { useMenuQuery } from "@/lib/menuQuery";

const { raw: menuQs } = useMenuQuery();
/** 原 _inputDto.LineCode = QueryString（菜单种子 LG02） */
const lineCode = menuQs || undefined;

type TimeRange = { min?: string; max?: string };
type DecimalRange = { min?: number | null; max?: number | null };

const theme = makeHmxGridTheme();
const rows = ref<Record<string, unknown>[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

/* 列头=extract LDisplay:Tms3000（39 可见 + 22 隐藏）；中文列头估宽=字数×13+60，autoSize 收口 */
const W = (h: string) => h.length * 13 + 60;
/* 原 colCStove.Summary(Custom,"炉数={0}") + gridView1_CustomSummaryCalculate（HashSet 去重取 Count）——
   AG Grid v36 无 footerValueGetter，等价迁移为 grandTotalRow 底部汇总行 + 该列 aggFunc 去重计数 */
const colDefs = ref<ColDef[]>([
  {
    field: "cStove",
    headerName: "炉号",
    width: W("炉号"),
    aggFunc: (p: { values: unknown[] }) => `炉数=${new Set(p.values.filter((v) => v)).size}`,
  },
  { field: "cPieceNo", headerName: "件次号", width: W("件次号") },
  { field: "cSgCode", headerName: "钢种", width: W("钢种") },
  { field: "cSgStd", headerName: "执行标准", width: W("执行标准") },
  { field: "cSpec", headerName: "规格", width: W("规格") },
  { field: "nCalWgt", headerName: "理论重量", width: 150 },
  { field: "nWgt", headerName: "实际重量", width: W("实际重量") },
  { field: "nStatus", headerName: "入库状态", width: W("入库状态") },
  { field: "cPrintCode", headerName: "喷号", width: W("喷号") },
  { field: "cLineCode", headerName: "产线", width: W("产线") },
  { field: "cMachine", headerName: "机台号", width: W("机台号") },
  { field: "cStrandNo", headerName: "流号", width: W("流号") },
  { field: "dProTime", headerName: "产出时间", width: W("产出时间") },
  { field: "cBilletTypeCode", headerName: "铸坯标识", width: W("铸坯标识") },
  { field: "nThick", headerName: "厚度", width: W("厚度") },
  { field: "nWth", headerName: "宽度", width: W("宽度") },
  { field: "nLen", headerName: "长度", width: W("长度") },
  { field: "nNum", headerName: "支数", width: W("支数") },
  { field: "cPlanId", headerName: "计划号", width: W("计划号") },
  { field: "cOrderNo", headerName: "订单号", width: W("订单号") },
  { field: "cShiftNo", headerName: "产出班次", width: W("产出班次") },
  { field: "cGroupNo", headerName: "产出班组", width: W("产出班组") },
  { field: "cConfirmStatus", headerName: "收料状态", width: W("收料状态") },
  { field: "cIsHot", headerName: "热送区分", width: W("热送区分") },
  { field: "cMsc", headerName: "冶金规范码", width: W("冶金规范码") },
  { field: "cMscLine", headerName: "冶金规范产线", width: W("冶金规范产线") },
  { field: "cStNo", headerName: "制造标准号", width: W("制造标准号") },
  { field: "cSteelType", headerName: "钢种大类", width: W("钢种大类") },
  { field: "cProRemark", headerName: "生产备注", width: W("生产备注") },
  { field: "cSurfaceResult", headerName: "表检结果", width: W("表检结果") },
  { field: "dSurfaceTime", headerName: "表检时间", width: W("表检时间") },
  { field: "cSurfaceUser", headerName: "表检人", width: W("表检人") },
  { field: "cSurfaceRemark", headerName: "表检说明", width: W("表检说明") },
  { field: "cSurfaceAdvice", headerName: "表检处置意见", width: W("表检处置意见") },
  { field: "dConfirmTime", headerName: "确认时间", width: W("确认时间") },
  { field: "cConfirmUser", headerName: "确认人", width: W("确认人") },
  { field: "cDestination", headerName: "去向", width: W("去向") },
  { field: "cSampleLotNo", headerName: "试批号", width: W("试批号") },
  { field: "nCastDivCode", headerName: "模连铸标识", width: W("模连铸标识") },
  /* 隐藏列（原 Visible=false / 未排 VisibleIndex，hide:true 收着） */
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cFactoryId", headerName: "工厂", hide: true },
  { field: "cPono", headerName: "制造命令号", hide: true },
  { field: "cConNo", headerName: "合同号", hide: true },
  { field: "cMatCode", headerName: "物料号", hide: true },
  { field: "cStoreCode", headerName: "预设库区号", hide: true },
  { field: "cStackNo", headerName: "预设垛位号", hide: true },
  { field: "cStackNum", headerName: "预设垛位层号", hide: true },
  { field: "cShiftNoSj", headerName: "炉次实绩班次", hide: true },
  { field: "cGroupNoSj", headerName: "炉次实绩班组", hide: true },
  { field: "cPcResult", headerName: "理化结果", hide: true },
  { field: "dPcTime", headerName: "理化判定时间", hide: true },
  { field: "cPcUser", headerName: "理化判定人", hide: true },
  { field: "cPcRemark", headerName: "理化判定备注", hide: true },
  { field: "cQmHandleDesc", headerName: "处置注释", hide: true },
  { field: "nQmStatus", headerName: "质量状态", hide: true },
  { field: "cRouteCode", headerName: "精炼路径", hide: true },
  { field: "selected", headerName: "选择", hide: true },
]);

/* 查询条件（原 bscInput : MS3000SjInputDto + UCDecimalRange×3 + UCTimeRange；Load 默认昨天~明天） */
function dayAt(offset: number, h = 0, m = 0, s = 0): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset, h, m, s);
}
const q = reactive({
  machine: null as string | null,
  cStove: "",
  cPieceNo: "",
  cSgCode: "",
  thickMin: null as number | null,
  thickMax: null as number | null,
  wthMin: null as number | null,
  wthMax: null as number | null,
  lenMin: null as number | null,
  lenMax: null as number | null,
  dates: [dayAt(-1), dayAt(1, 23, 59, 59)] as Date[] | null,
});

type MachRaw = {
  machineCode?: string;
  machineName?: string;
  lineCode?: string;
  routeProcValue?: string;
  cCode?: string;
  cName?: string;
};
const machineOptions = ref<{ label: string; value: string }[]>([]);

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}
function decimalRange(lo: number | null, hi: number | null): DecimalRange {
  return { min: lo, max: hi };
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/** 原 FrmMS9000_Load：机台下拉 = 产线命中 && RouteProcValue.StartsWith(Consts_MS.CCM="CCM")，按编码去重排序 */
async function loadMachines() {
  try {
    const list = ((await publicFactoryLineAreaMachineApi.getFactoryLineAreaMachine_LG()) ?? []) as MachRaw[];
    const map = new Map<string, string>();
    for (const x of list) {
      const code = x.machineCode ?? x.cCode;
      const name = x.machineName ?? x.cName ?? code;
      if (!code) continue;
      if (x.lineCode != null && lineCode != null && x.lineCode !== lineCode) continue;
      if (x.routeProcValue != null && !x.routeProcValue.startsWith("CCM")) continue;
      if (!map.has(code)) map.set(code, name ?? code);
    }
    machineOptions.value = [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, label]) => ({ label, value }));
  } catch {
    /* 拦截层已 toast */
  }
}

/** 原 btnQuery_Click → Proxy.QueryList(_inputDto) */
async function onQuery() {
  querying.value = true;
  try {
    const input = {
      lineCode,
      machine: q.machine ?? undefined,
      cStove: q.cStove.trim() || undefined,
      cPieceNo: q.cPieceNo.trim() || undefined,
      cSgCode: q.cSgCode.trim() || undefined,
      thickRange: decimalRange(q.thickMin, q.thickMax),
      wthRange: decimalRange(q.wthMin, q.wthMax),
      lenRange: decimalRange(q.lenMin, q.lenMax),
      timeRange: toTimeRange(q.dates),
    };
    rows.value = ((await tms3000Api.queryList(input)) ?? []) as Record<string, unknown>[];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}

onMounted(() => {
  void loadMachines();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1：机台/炉号/件次号/钢种 + 厚宽长区间 + 产出时间） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-2 py-1.5">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">机台</label>
        <Select
          v-model="q.machine"
          :options="machineOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="q.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="q.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">厚度</label>
        <RangeInput v-model:min="q.thickMin" v-model:max="q.thickMax" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">宽度</label>
        <RangeInput v-model:min="q.wthMin" v-model:max="q.wthMax" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">长度</label>
        <RangeInput v-model:min="q.lenMin" v-model:max="q.lenMax" class="min-w-0 flex-1" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">产出时间</label>
        <DatePicker
          v-model="q.dates"
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

    <!-- 工具栏（原 stackPanel1 内 btnQuery） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-auto text-xs font-medium text-muted-foreground">铸坯实绩</span>
    </div>

    <!-- 主表（gridControl1 / gridView1，绑定实体 Tms3000） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        grand-total-row="pinnedBottom"
        :pagination="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
