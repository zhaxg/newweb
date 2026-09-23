<script setup lang="ts">
/** UCIndexValueEditView（指标候选 / 指标明细左右转移）：
 *  DDH.Winforms.SQM.Forms.Tqmyl.UCIndexValueEditView
 *  布局：stackPanel1(Dock Top, 4 钉，仅「复制选中行数据」Visible=true) →
 *        splitContainerControl1 左右 SplitterPosition 238/692≈34%（左 gridControl1 候选，右 gridControl2 明细 + flowLayoutPanel2 Dock Bottom tips）
 *  两种绑定：mode='cqzb' → BindCqzb（产前准备，候选=YlgyTemplateRepo.getCqzb，值=model.cqzbs）
 *           mode='grp'  → BindData(gx, grp, model)（工序分组，候选=getByProcGrp，值=grp.values）
 *  列可见性（原 BindData）：工序以 CCM/MZ 开头且分组以 "C" 开头 → 小数位数后插
 *    是否判定/是否打印/计算公式/判定公式 四列，隐藏「报警等级」，报警下/上限改名「内控下限/内控上限」
 *  待接入：SetDefaultValues 之后的 CalcExpression（原 Formula 引擎求 nAlarmMin/nAlarmMax）；
 *          公式列的 FrmFormulaEditor；「二冷水」「从炼钢工艺卡复制」「从其他工序复制」三钉 Designer Visible=false 不渲染 */
import { computed, ref, watch, type PropType } from "vue";
import Button from "primevue/button";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCopy } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams, GridApi, GridReadyEvent, IRowNode, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import type { Tqmyl04 } from "@/api/mes4ddh/sqm.swagger";
import { EqualsFlag, YesNo } from "@/api/mes4ddh/sqm.swagger";
import { NextStrId } from "@/lib/yitIdHelper";
import {
  CQZB_GRP,
  LZ_CODE,
  MZ_CODE,
  YLGY_CF_CLASS,
  YlgyIndexPropertyRepo,
  YlgyTemplateRepo,
  type Tqmyl04Grp,
  type Ylgy,
  type YlgyGx,
  type YlgyTemplate,
} from "./ylgy";
import { useToast } from "@/composables/useToast";

const props = defineProps({
  model: { type: Object as PropType<Ylgy | null>, default: null },
  /** 工序分组模式必传；不传则按「产前准备」绑定 */
  gx: { type: Object as PropType<YlgyGx | null>, default: null },
  grp: { type: Object as PropType<Tqmyl04Grp | null>, default: null },
  editable: { type: Boolean, default: true },
});
const { toast } = useToast();
const theme = makeHmxGridTheme();

const mode = computed(() => (props.gx && props.grp ? "grp" : "cqzb"));

/* ---------- 数据源（直接持有模型里的活数组，增删即回写） ---------- */
const candRows = ref<YlgyTemplate[]>([]);
const valRows = ref<Tqmyl04[]>([]);
const tipsText = ref("");
const loading = ref(false);

const gridApi = ref<GridApi | null>(null);
const valApi = ref<GridApi | null>(null);
function onCandReady(e: GridReadyEvent) { gridApi.value = e.api; }
function onValReady(e: GridReadyEvent) { valApi.value = e.api; }

function intervalFmt(p: ValueFormatterParams) {
  return (({ 1: "≤E≤", 2: "＜E≤", 4: "≤E＜", 6: "＜E＜" }) as Record<string, string>)[String(p.value)] ?? "";
}
/** 原 CustomColumnDisplayText：nMax/nMin/nTarget 按 nAccuracy 取整显示 */
function accFmt(field: "nMinValue" | "nMaxValue" | "nTargetValue") {
  return (p: ValueFormatterParams) => {
    const v = p.value as number | null | undefined;
    if (v == null) return "";
    const row = p.data as Tqmyl04 | undefined;
    const n = row?.nAccuracy;
    if (n == null) return String(v);
    return Number(v).toFixed(n);
  };
}
const yesNoFmt = (p: ValueFormatterParams) => (p.value == null ? "" : Number(p.value) === 1 ? "是" : "否");

/** 分组以 "C" 开头且工序为 CCM/MZ 时才显示的四列（原 BindData 的 visible 分支） */
const showJudgeCols = computed(() => {
  if (mode.value !== "grp" || !props.gx) return false;
  const proc = props.gx.data.cProc ?? "";
  const grp = props.grp?.grp ?? "";
  return (proc.startsWith(LZ_CODE) || proc.startsWith(MZ_CODE)) && grp.startsWith(YLGY_CF_CLASS);
});

const xferCol = (dir: "in" | "out"): ColDef => {
  const caption = dir === "in" ? ">>" : "<<";
  return {
    colId: `xfer-${dir}`,
    headerName: caption,
    width: 52,
    minWidth: 52,
    sortable: false,
    resizable: false,
    filter: false,
    cellRenderer: () => caption,
  };
};

/** 原 GridView1_CustomDrawCell：该指标尚未进入右侧时，「名称」列加粗 + 黄底 */
const candPicked = (code?: string | null) => !!code && valRows.value.some((x) => x.cCode === code);

/* 候选：原 gridView1 → YlgyTemplate，VisibleIndex 0/1 + Unbound ">>" */
const candColDefs = computed<ColDef[]>(() => [
  { field: "code", headerName: "编码", width: 110 },
  {
    field: "name",
    headerName: "名称",
    width: 150,
    cellClass: (p) =>
      candPicked((p.data as YlgyTemplate | undefined)?.code)
        ? "font-bold !bg-[rgba(63,255,255,0.35)]"
        : "",
  },
  xferCol("in"),
]);

/* 明细：原 gridView2 → Tqmyl04，VisibleIndex 0~24（<< 在 0） */
const valColDefs = computed<ColDef[]>(() => [
  xferCol("out"),
  { field: "cCode", headerName: "指标代码", width: 110 },
  { field: "cName", headerName: "指标名称", width: 140 },
  { field: "nSeq", headerName: "顺序号", width: 80, editable: props.editable },
  { field: "cUnit", headerName: "单位", width: 70, editable: props.editable },
  { field: "nTargetValue", headerName: "目标值", width: 90, editable: props.editable, valueFormatter: accFmt("nTargetValue") },
  { field: "nMinValue", headerName: "最小值", width: 90, editable: props.editable, valueFormatter: accFmt("nMinValue") },
  { field: "nInterval", headerName: "开闭区间", width: 90, valueFormatter: intervalFmt, editable: props.editable },
  { field: "nMaxValue", headerName: "最大值", width: 90, editable: props.editable, valueFormatter: accFmt("nMaxValue") },
  { field: "cTextValue", headerName: "文本值", width: 110, editable: props.editable },
  { field: "nAccuracy", headerName: "小数位数", width: 90, editable: props.editable },
  { field: "nAlarmMin", headerName: showJudgeCols.value ? "内控下限" : "报警下限", width: 95, editable: props.editable },
  { field: "nIntervalAlarm", headerName: "开闭区间", width: 90, valueFormatter: intervalFmt, editable: props.editable },
  { field: "nAlarmMax", headerName: showJudgeCols.value ? "内控上限" : "报警上限", width: 95, editable: props.editable },
  ...(showJudgeCols.value
    ? ([
        { field: "cIsJudge", headerName: "是否判定", width: 90, valueFormatter: yesNoFmt, editable: props.editable },
        { field: "cIsPrint", headerName: "是否打印", width: 90, valueFormatter: yesNoFmt, editable: props.editable },
        { field: "cFormula", headerName: "计算公式", width: 130, editable: false },
        { field: "cJudgeFormula", headerName: "判定公式", width: 130, editable: false },
      ] as ColDef[])
    : []),
  ...(showJudgeCols.value ? [] : [{ field: "nAlarmLv", headerName: "报警等级", width: 90, editable: props.editable }]),
  { field: "cIngotCode", headerName: "锭坯型", width: 90, editable: props.editable },
  { field: "cSgSign", headerName: "钢种", width: 90, editable: props.editable },
  { field: "cSgStd", headerName: "标准", width: 110, editable: props.editable },
  { field: "cMachine", headerName: "机台", width: 90, editable: props.editable },
  { field: "cNextProc", headerName: "下道工序", width: 100, editable: props.editable },
  { field: "cLineCode", headerName: "产线", width: 80, editable: props.editable },
  { field: "nThickMin", headerName: "厚度下限", width: 90, editable: props.editable },
  { field: "nThickMax", headerName: "厚度上限", width: 90, editable: props.editable },
  { field: "nWidthMin", headerName: "宽度下限", width: 90, editable: props.editable },
  { field: "nWidthMax", headerName: "宽度上限", width: 90, editable: props.editable },
  { field: "id", headerName: "主键", width: 150, hide: true },
  { field: "cTqmyl01Id", headerName: "冶炼工艺要点ID", width: 150, hide: true },
  { field: "cTqmyl01Code", headerName: "冶炼工艺要点编号", width: 140, hide: true },
  { field: "cProc", headerName: "作业工序", width: 100, hide: true },
  { field: "nProcSeq", headerName: "作业工序顺序号", width: 130, hide: true },
  { field: "cTqmyl03Id", headerName: "TQMYL03", width: 150, hide: true },
  { field: "cClass", headerName: "指标分类", width: 100, hide: true },
  { field: "cClassDesc", headerName: "指标分类描述", width: 130, hide: true },
  { field: "nValueType", headerName: "值类型", width: 90, hide: true },
  { field: "nMinValueYellow", headerName: "黄色报警下限", width: 120, hide: true },
  { field: "nIntervalYellow", headerName: "开闭区间", width: 90, hide: true },
  { field: "nMaxValueYellow", headerName: "黄色报警上限", width: 120, hide: true },
  { field: "nDurationYellow", headerName: "黄色报警持续时间", width: 150, hide: true },
  { field: "nMinValueOrange", headerName: "橙色报警下限", width: 120, hide: true },
  { field: "nIntervalOrange", headerName: "开闭区间", width: 90, hide: true },
  { field: "nMaxValueOrange", headerName: "橙色报警上限", width: 120, hide: true },
  { field: "nDurationOrange", headerName: "橙色报警持续时间", width: 150, hide: true },
  { field: "nMinValueRed", headerName: "红色报警下限", width: 120, hide: true },
  { field: "nIntervalRed", headerName: "开闭区间", width: 90, hide: true },
  { field: "nMaxValueRed", headerName: "红色报警上限", width: 120, hide: true },
  { field: "nDurationRed", headerName: "红色报警持续时间", width: 150, hide: true },
  { field: "selected", headerName: "选择", width: 70, hide: true },
  { field: "nUpperPercent", headerName: "上偏差%", width: 90, hide: true },
  { field: "nLowerPercent", headerName: "下偏差%", width: 90, hide: true },
]);

function valRowId(p: GetRowIdParams) {
  return String((p.data as Tqmyl04).id ?? "");
}
function candRowId(p: GetRowIdParams) {
  return String((p.data as YlgyTemplate).code ?? "");
}

/** 转移后重算候选「名称」列的高亮 */
function refreshCandHighlight() {
  gridApi.value?.refreshCells({ force: true, columns: ["name"] });
}

/* ---------- 绑定 ---------- */
async function bind() {
  if (!props.model) {
    candRows.value = [];
    valRows.value = [];
    return;
  }
  loading.value = true;
  try {
    if (mode.value === "grp" && props.gx && props.grp) {
      candRows.value = await YlgyTemplateRepo.getByProcGrp(props.gx.data.cProc ?? "", props.grp.grp);
      // 持有模型里的活数组，增删直接回写 grp.values
      valRows.value = props.grp.values;
    } else {
      candRows.value = await YlgyTemplateRepo.getCqzb();
      valRows.value = props.model.cqzbs;
    }
    requestAnimationFrame(() => {
      gridApi.value?.autoSizeAllColumns();
      valApi.value?.autoSizeAllColumns();
      refreshCandHighlight();
    });
  } finally {
    loading.value = false;
  }
}

async function refreshTips(row?: Tqmyl04 | null) {
  if (!row) {
    tipsText.value = "";
    return;
  }
  const list = await YlgyIndexPropertyRepo.getAll();
  const hit = list.find(
    (x) =>
      x.proc === row.cProc &&
      x.group === (props.grp?.grp ?? CQZB_GRP) &&
      x.idxCode === row.cCode &&
      x.propertyName === "<tips>",
  );
  tipsText.value = `${row.cName ?? ""}: ${hit?.defaultValue ?? ""}`;
}

watch(() => [props.model, props.gx, props.grp], bind, { immediate: true });
watch(
  () => props.grp?.grp,
  () => void refreshTips(null),
);

function onValSelectionChanged() {
  const row = valApi.value?.getSelectedRows()[0] as Tqmyl04 | undefined;
  void refreshTips(row ?? null);
}

/* ---------- 新建一条指标（原 CreateYl04 + SetDefaultValues） ---------- */
function nextSeq() {
  if (!valRows.value.length) return 1;
  return Math.max(...valRows.value.map((x) => x.nSeq ?? 0)) + 1;
}

function createYl04(idx: YlgyTemplate): Tqmyl04 {
  const t = props.gx?.data;
  return {
    id: NextStrId(),
    cClass: props.grp?.grp ?? CQZB_GRP,
    cClassDesc: props.grp?.grpName ?? "产前准备",
    cCode: idx.code,
    cName: idx.name,
    cProc: t?.cProc,
    cTqmyl01Code: t?.cGyCode ?? props.model?.data.cCode,
    cTqmyl01Id: t?.cTqmyl01Id ?? props.model?.data.id,
    cTqmyl03Id: t?.id,
    nSeq: nextSeq(),
    nProcSeq: t?.nSeq ?? 0,
    cUnit: idx.unit,
    nInterval: EqualsFlag.Default,
    nIntervalOrange: EqualsFlag.Default,
    nIntervalRed: EqualsFlag.Default,
    nIntervalYellow: EqualsFlag.Default,
    nIntervalAlarm: EqualsFlag.Default,
  };
}

/** 原 SetDefaultValues：按 YLGY.INDEX.PROPERTITY 里除报警上下限外的属性灌默认值 */
async function setDefaultValues(row: Tqmyl04) {
  const list = await YlgyIndexPropertyRepo.getAll();
  const cfgs = list.filter(
    (x) => x.proc === row.cProc && x.idxCode === row.cCode && x.defaultValue != null,
  );
  const failed: string[] = [];
  for (const cfg of cfgs) {
    const key = cfg.propertyName ?? "";
    if (key === "nAlarmMax" || key === "nAlarmMin") continue; // 这两条原走 CalcExpression
    if (!(key in row)) continue;
    try {
      (row as unknown as Record<string, unknown>)[key] = coerce(
        cfg.defaultValue ?? undefined,
        (row as unknown as Record<string, unknown>)[key],
      );
    } catch {
      failed.push(`未能设置属性[${key}]的默认值[${cfg.defaultValue}]`);
    }
  }
  // 原 CalcExpression(nAlarmMin/nAlarmMax) 依赖 Formula 引擎 → 待接入
  if (failed.length) toast(failed.join("\n"), 4000, "error");
}

function coerce(raw: string | undefined, hint: unknown): unknown {
  if (raw == null) return raw;
  if (typeof hint === "number") {
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }
  return raw;
}

/* ---------- 交互 ---------- */
async function transferIn() {
  if (!props.editable) return;
  const sel = (gridApi.value?.getSelectedRows() ?? []) as YlgyTemplate[];
  if (!sel.length) return;
  for (const t of sel) {
    if (valRows.value.some((x) => x.cCode === t.code)) continue;
    const row = createYl04(t);
    await setDefaultValues(row);
    valRows.value.push(row);
  }
  requestAnimationFrame(() => {
    valApi.value?.autoSizeAllColumns();
    refreshCandHighlight();
  });
}

function transferOut() {
  if (!props.editable) return;
  const sel = (valApi.value?.getSelectedRows() ?? []) as Tqmyl04[];
  if (!sel.length) return;
  const ids = new Set(sel.map((x) => x.id));
  const arr = valRows.value;
  for (let i = arr.length - 1; i >= 0; i--) if (ids.has(arr[i].id)) arr.splice(i, 1);
  refreshCandHighlight();
}

/** 原 btnCopy_Click：克隆选中行，id 重发、nSeq 取下一个 */
function copySelected() {
  if (!props.editable) return;
  const sel = (valApi.value?.getSelectedRows() ?? []) as Tqmyl04[];
  if (!sel.length) return;
  const start = valRows.value.length;
  for (const item of sel) {
    const cloned = JSON.parse(JSON.stringify(item)) as Tqmyl04;
    cloned.id = NextStrId();
    cloned.nSeq = nextSeq();
    valRows.value.push(cloned);
  }
  requestAnimationFrame(() => {
    valApi.value?.deselectAll();
    valApi.value?.forEachNode((n: IRowNode, i: number) => {
      if (i >= start) n.setSelected(true);
    });
  });
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <!-- 原 stackPanel1（Dock Top）：4 钉中仅「复制选中行数据」Visible=true -->
    <div v-if="props.editable" class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" @click="copySelected">
        <IconCopy class="h-3 w-3" />复制选中行数据
      </Button>
    </div>

    <!-- 原 splitContainerControl1 左右 238/692≈34% -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <SplitterPanel v-if="props.editable" :size="34" :minSize="14" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="candColDefs" :row-data="candRows" :get-row-id="candRowId"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :suppress-column-virtualisation="true" :pagination="false" :animate-rows="false" :loading="loading"
            @grid-ready="onCandReady" @first-data-rendered="autoSizeOnFirstData" @cell-double-clicked="transferIn" />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="30" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="valColDefs" :row-data="valRows" :get-row-id="valRowId"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :suppress-column-virtualisation="true" :pagination="false" :animate-rows="false"
            @grid-ready="onValReady" @selection-changed="onValSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
        <!-- 原 flowLayoutPanel2 Dock Bottom + labelControl1（红字，原高 20；无选中行时显示静态「tips:」） -->
        <div class="flex h-5 shrink-0 items-center gap-1 border-t border-border/60 px-2">
          <span class="min-w-0 truncate text-xs text-red-600">{{ tipsText || "tips:" }}</span>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
