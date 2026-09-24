<script setup lang="ts">
/** 库位图模板设计（原 DDH.Winforms.SYD.Forms.FrmYD1010Design）：路由 /map-designer?map=<id>
 *  布局照 Designer：ribbonControl1(Top) → stackPanel1 工具栏(Top)
 *                → gridControl1 垛位位置(Dock.Left) + splitterControl1 → spreadsheetControl1(Dock.Fill)
 *  原窗体用 SpreadsheetControl 读写 xlsx（TemplateByte）；web 侧无 xlsx 等价设施
 *  → 以 Univer 表格承接，模板存 workbook JSON（localStorage mapStore，与 YD1010Map 列表页同源）。
 *  表格数据：map.cTemplateData 有值回填，否则用 zhb_sample.json 样例；垛位位置样例 stk_map_sample.json。
 *  行为映射：刷新=QueryMapData / 初始化位置信息=QueryManyStacks / 自动匹配位置=GetUsedRange 比对
 *          / 设置位置=Selection→焦点行 / 清除位置=Selected 行 / 保存=SaveMap / 美化=SetDefaultStyle
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import {
  IconDeviceFloppy,
  IconLocation,
  IconRefresh,
  IconTrash,
  IconWand,
  IconX,
} from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams, GridApi, GridReadyEvent, RowClickedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import type { IWorkbookData } from "@univerjs/core";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { attachUniverTheme, detachUniverTheme } from "@/composables/useUniverTheme";
import type { Tyd1003 } from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";
import { ensureUniver } from "./loadUniver";
import { buildZhbWorkbook } from "./buildWorkbook";
import { getMap, saveMapDesign, type StoreMapRow } from "./mapStore";
import stkMapSample from "./stk_map_sample.json";

/** 左表样例：temp/ddh_rmes/stk-map.csv（GBK→JSON），374 行库区/垛位/位置 */
type StkRow = {
  selected: boolean;
  id: string;
  cpId: string | null;
  cStoreCode: string;
  cArer: string;
  nRow: number | null;
  nCol: number | null;
  cRange: string | null;
  cName: string | null;
};

const route = useRoute();
const router = useRouter();
const { toast } = useToast();
const theme = makeHmxGridTheme();

const mapId = computed(() => {
  const m = route.query.map;
  return typeof m === "string" ? m : "";
});

const map = ref<StoreMapRow | null>(null);
const loading = ref(true);
const saving = ref(false);

/** 原 checkEdit1 / checkEdit2，构造时均 Checked = true */
const showGridlines = ref(true);
const showHeadings = ref(true);

/** 原 textEdit1（labelControl1「坐标」旁，只读，回显表格当前选区 A1） */
const selRef = ref("");

const positions = ref<Tyd1003[]>([]);
const posApi = ref<GridApi | null>(null);
const focusPos = ref<Tyd1003 | null>(null);

/* 垛位位置列（Designer：colSelected/colCStoreCode/colCArer/colNRow/colNCol/colCRange，
   中文列头取实体 Tyd1003 的 [LDisplay]）。colSelected 不再出列（页面要求去掉选择列），
   data.selected 仍由行选择回写（ui-rules §7）；库区号隐藏（右键列面板仍可唤出）。 */
const posCols = ref<ColDef[]>([
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", hide: true },
  { colId: "cArer", field: "cArer", headerName: "垛位/区域", width: 110 },
  { colId: "nRow", field: "nRow", headerName: "行号", width: 70 },
  { colId: "nCol", field: "nCol", headerName: "列号", width: 70 },
  { colId: "cRange", field: "cRange", headerName: "位置", width: 90, flex: 1 },
]);

function getPosRowId(p: GetRowIdParams<Tyd1003>) {
  return String(p.data?.id ?? "");
}

/* ---------------- 样例 / 持久化 ---------------- */

/** 垛位位置表恒取样例（参照数据，不落 localStorage） */
function loadStkSample(): Tyd1003[] {
  return (stkMapSample as StkRow[]).map((r) => ({ ...r, cpId: null }));
}

/** 原 btnInit_Click：QueryManyStacks(ListStoreCode) → 只带 库区号 + 垛位号 的空位置行 */
function buildInitPositions(): Tyd1003[] {
  return (stkMapSample as StkRow[]).map((r, i) => ({
    selected: false,
    id: `${mapId.value}_stk_${i + 1}`,
    cpId: mapId.value,
    cStoreCode: r.cStoreCode,
    cArer: r.cArer,
    nRow: null,
    nCol: null,
    cRange: "",
    cName: null,
  }));
}

/** 表格初值：已存模板 JSON 优先，否则 zhb 样例 */
function resolveWorkbook(): Partial<IWorkbookData> {
  const raw = map.value?.cTemplateData;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<IWorkbookData>;
      if (parsed?.sheets && parsed.sheetOrder?.length) return parsed;
    } catch {
      /* 模板损坏 → 落样例 */
    }
  }
  return buildZhbWorkbook();
}

/* ---------------- Univer 表格（原 spreadsheetControl1） ---------------- */

/** { univer, univerAPI } 由 createUniver 返回；类型放宽避免强绑 facade */
let univerInst: any = null;
let univerApi: any = null;
let selectionSub: { dispose?: () => void } | null = null;
const sheetReady = ref(false);
const sheetError = ref("");
/** 建表时声明的行列头尺寸，供「标题」开关还原（Univer 无隐藏行列头的运行时开关） */
let headRowWidth = 40;
let headColHeight = 24;

function getSheet(): any {
  return univerApi?.getActiveWorkbook?.()?.getActiveSheet?.() ?? null;
}

/** 等容器有实际高度后再挂 Univer（flex 布局首帧可能仍是 0） */
function waitForSize(el: HTMLElement, min = 200, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const start = performance.now();
    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.height >= min && rect.width >= 200) return resolve(true);
      if (performance.now() - start > timeoutMs) return resolve(rect.height > 40);
      requestAnimationFrame(check);
    };
    check();
  });
}

/** 浮动/单元格图片链（原 ribbon 的「图片」菜单）——按需注册，缺包不致命 */
async function drawingPlugins(): Promise<unknown[]> {
  const plugins: unknown[] = [];
  const push = async (loader: () => Promise<Record<string, unknown>>, name: string) => {
    try {
      const ctor = (await loader())[name];
      if (typeof ctor === "function") plugins.push(ctor);
    } catch {
      /* optional */
    }
  };
  await push(() => import("@univerjs/drawing"), "UniverDrawingPlugin");
  await push(() => import("@univerjs/docs-drawing"), "UniverDocsDrawingPlugin");
  await push(() => import("@univerjs/sheets-drawing"), "UniverSheetsDrawingPlugin");
  await push(() => import("@univerjs/drawing-ui"), "UniverDrawingUIPlugin");
  await push(() => import("@univerjs/sheets-drawing-ui"), "UniverSheetsDrawingUIPlugin");
  return plugins;
}

async function mountUniver(container: HTMLElement) {
  container.innerHTML = "";
  const { createUniver, LocaleType, UniverInstanceType } = (await import("@univerjs/presets")) as any;
  const core = (await import("@univerjs/preset-sheets-core")) as any;
  const locale = {
    ...(await import("@univerjs/preset-sheets-core/locales/zh-CN")).default,
    ...(await import("@univerjs/drawing-ui/locale/zh-CN")).default,
    ...(await import("@univerjs/sheets-drawing-ui/locale/zh-CN")).default,
  };
  const plugins = await drawingPlugins();

  const created = createUniver({
    locale: LocaleType.ZH_CN,
    locales: { [LocaleType.ZH_CN]: locale },
    presets: [
      core.UniverSheetsCorePreset({
        container,
        header: true,
        toolbar: true,
        /* collapsed：页签 + 当前页工具条，对应原 DevExpress Spreadsheet ribbon */
        ribbonType: "collapsed",
        footer: false,
        formulaBar: false,
        disableAutoFocus: true,
      }),
    ],
    ...(plugins.length ? { plugins: plugins as never } : {}),
  });
  univerInst = created.univer;
  univerApi = created.univerAPI;
  attachUniverTheme(univerApi);

  const data = resolveWorkbook();
  const first = data.sheetOrder?.[0];
  const cfg = first ? (data.sheets as Record<string, any>)?.[first] : null;
  /* 建表声明的行列头尺寸，供「标题」开关还原；模板存的是归零态则回落默认 */
  headRowWidth = cfg?.rowHeader?.width || 40;
  headColHeight = cfg?.columnHeader?.height || 24;

  created.univer.createUnit(UniverInstanceType.UNIVER_SHEET, data as any);
  await new Promise((r) => setTimeout(r, 80));

  const wb = univerApi.getActiveWorkbook?.();
  selectionSub = wb?.onSelectionChange?.(() => onSheetSelectionChange()) ?? null;

  /* 原构造函数 checkEdit1/checkEdit2 均 Checked = true，建表后按开关态落一次 */
  const sheet = getSheet();
  if (sheet) {
    sheet.setHiddenGridlines?.(!showGridlines.value);
    sheet.setRowHeaderWidth?.(showHeadings.value ? headRowWidth : 0);
    sheet.setColumnHeaderHeight?.(showHeadings.value ? headColHeight : 0);
  }
}

function disposeUniver() {
  try {
    selectionSub?.dispose?.();
  } catch {
    /* ignore */
  }
  selectionSub = null;
  detachUniverTheme(univerApi);
  try {
    univerInst?.dispose?.();
  } catch {
    /* ignore */
  }
  univerInst = null;
  univerApi = null;
  sheetReady.value = false;
}

async function initUniver() {
  sheetError.value = "";
  sheetReady.value = false;
  const container = document.getElementById("yd1010-univer");
  if (!container) {
    sheetError.value = "未找到表格容器";
    return;
  }
  try {
    await ensureUniver();
    disposeUniver();
    /* 先等 Splitter/flex 算完高度，再 createUnit，避免 canvas 0×0 */
    await waitForSize(container);
    await mountUniver(container);
    sheetReady.value = !!container.querySelector("canvas");
    if (!sheetReady.value) throw new Error("表格未渲染");
  } catch (error) {
    console.error("[MapDesignPage] Univer init failed:", error);
    sheetError.value = error instanceof Error ? error.message : String(error);
    sheetReady.value = false;
  }
}

/* ---------------- 表格 ↔ 左表 选区联动 ---------------- */

function a1(row0: number, col0: number): string {
  let n = col0 + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return `${s}${row0 + 1}`;
}

/** 原 spreadsheetControl1_SelectionChanged(sender != null)：坐标回显 + 反查左表行并选中 */
function onSheetSelectionChange() {
  const range = getSheet()?.getActiveRange?.();
  if (!range) return;
  selRef.value = range.getA1Notation?.() ?? "";
  if (!selRef.value) return;

  const hit = positions.value.find((p) => p.cRange === selRef.value);
  if (!hit || !posApi.value) return;
  posApi.value.forEachNode((node) => node.setSelected(node.data?.id === hit.id));
  focusPos.value = hit;
}

/** 原 gridView1_FocusedRowChanged：左表焦点行 → 表格选区 */
function onPosFocus(row: Tyd1003 | null) {
  focusPos.value = row;
  const ref = row?.cRange;
  if (!ref) return;
  const sheet = getSheet();
  if (!sheet) return;
  try {
    sheet.setActiveRange(sheet.getRange(ref));
    selRef.value = ref;
  } catch {
    /* 位置串非法，忽略 */
  }
}

function onPosReady(e: GridReadyEvent) {
  posApi.value = e.api;
}

/** 回读行选择并回写 data.selected（全站行选择约定） */
function onPosSelection() {
  const api = posApi.value;
  if (!api) return;
  const picked = api.getSelectedRows() as Tyd1003[];
  const ids = new Set(picked.map((r) => r.id));
  for (const p of positions.value) p.selected = ids.has(p.id);
  /* 焦点行以点击行为准（原 gridView1.GetFocusedRow）；仅当它已不在选中集时回退首行 */
  if (!focusPos.value || !ids.has(focusPos.value.id)) focusPos.value = picked[0] ?? null;
}

function onPosClick(e: RowClickedEvent) {
  onPosFocus((e.data as Tyd1003) ?? null);
}

function bestFit() {
  requestAnimationFrame(() => posApi.value?.autoSizeAllColumns());
}

/* ---------------- 工具栏（原 stackPanel1） ---------------- */

/** btnRefresh_Click：重取模板 + 垛位位置 */
async function onRefresh() {
  await loadMap();
}

/** btnInit_Click：按库区垛位重建空位置行 */
function onInitPositions() {
  positions.value = buildInitPositions();
  focusPos.value = null;
  bestFit();
  toast(`已初始化 ${positions.value.length} 条位置`, 2000, "success");
}

/** btnMatchPosition_Click：按垛位号在表格已用区域内比对，只填空位置 */
function onAutoMatch() {
  const sheet = getSheet();
  if (!sheet) {
    toast("表格尚未就绪", 2000, "warn");
    return;
  }
  const empties = positions.value.filter((p) => !p.cRange);
  if (!empties.length) {
    toast("没有待匹配的空位置", 2000, "warn");
    return;
  }
  if (!window.confirm("确认匹配位置信息？只匹配仅为空位置的信息")) return;

  /* 原 WS.GetUsedRange().FirstOrDefault(w => w.Value.TextValue == CArer) */
  const index = new Map<string, { ref: string; row: number; col: number }>();
  const used = sheet.getDataRange();
  const values: string[][] = used?.getDisplayValues?.() ?? [];
  const r0 = used?.getRow?.() ?? 0;
  const c0 = used?.getColumn?.() ?? 0;
  values.forEach((line, r) =>
    line.forEach((text, c) => {
      const key = String(text ?? "").trim();
      if (key && !index.has(key)) index.set(key, { ref: a1(r0 + r, c0 + c), row: r0 + r, col: c0 + c });
    }),
  );

  let count = 0;
  for (const p of empties) {
    const hit = index.get((p.cArer ?? "").trim());
    if (!hit) continue;
    p.cRange = hit.ref;
    p.nRow = hit.row;
    p.nCol = hit.col;
    count++;
  }
  posApi.value?.refreshCells({ force: true });
  bestFit();
  toast(`共匹配${count}个位置信息`, 2500, "success");
}

/** btnSetPosition_Click：表格当前选区写入左表焦点行 */
function onSetPosition() {
  const sheet = getSheet();
  const row = focusPos.value;
  if (!sheet) {
    toast("表格尚未就绪", 2000, "warn");
    return;
  }
  if (!row) {
    toast("请先在左侧选择位置行，再在表格中选中单元格", 2500, "warn");
    return;
  }
  const active = sheet.getActiveRange?.();
  if (!active) {
    toast("请先在表格中选中单元格", 2500, "warn");
    return;
  }
  /* 原 btnSetPosition_Click 取 RightColumnIndex；样例数据（B14 → nCol=1）证明存的是左列索引，
     与 btnMatchPosition 的 LeftColumnIndex 一致，故此处取左列，避免多列选区写偏列号 */
  row.nRow = active.getRow();
  row.nCol = active.getColumn();
  row.cRange = active.getA1Notation();
  selRef.value = row.cRange ?? "";
  posApi.value?.refreshCells({ force: true });
  toast(`已设置位置 ${selRef.value}`, 1500, "success");
}

/** btnClearPostion_Click：清除勾选行的位置 */
function onClearPosition() {
  const picked = (posApi.value?.getSelectedRows() ?? []) as Tyd1003[];
  if (!picked.length) {
    toast("请先勾选要清除的位置行", 2000, "warn");
    return;
  }
  if (!window.confirm("确认清除所选位置信息？")) return;
  for (const p of picked) {
    p.nRow = null;
    p.nCol = null;
    p.cRange = "";
  }
  posApi.value?.refreshCells({ force: true });
  bestFit();
}

/** btnSave_Click：只存 sheet（Univer workbook JSON）——垛位位置恒为样例，不落库 */
function onSave() {
  if (!map.value) return;
  saving.value = true;
  try {
    const snapshot = univerApi?.getActiveWorkbook?.()?.save?.();
    if (!snapshot) {
      toast("表格尚未就绪", 2000, "warn");
      return;
    }
    const ok = saveMapDesign(map.value.id!, JSON.stringify(snapshot));
    toast(ok ? "已保存" : "保存失败", 2000, ok ? "success" : "error");
  } finally {
    saving.value = false;
  }
}

/** btnPreView_Click：对每个选中区域 SetDefaultStyle()（还原默认样式） */
function onBeautify() {
  const ranges = getSheet()?.getSelection?.()?.getActiveRangeList?.() ?? [];
  if (!ranges.length) {
    toast("请先在表格中选中单元格", 2000, "warn");
    return;
  }
  for (const r of ranges) r.clearFormat?.();
  toast("完成，请继续调整", 2000, "success");
}

/** checkEdit1_CheckedChanged：ShowGridlines */
function onToggleGridlines() {
  getSheet()?.setHiddenGridlines?.(!showGridlines.value);
}

/** checkEdit2_CheckedChanged：ShowHeadings
 *  Univer 无行列头显隐的运行时开关（rowHeader.hidden 只在建表时生效），
 *  以 setRowHeaderWidth / setColumnHeaderHeight 归零等效隐藏。 */
function onToggleHeadings() {
  const sheet = getSheet();
  if (!sheet) return;
  sheet.setRowHeaderWidth?.(showHeadings.value ? headRowWidth : 0);
  sheet.setColumnHeaderHeight?.(showHeadings.value ? headColHeight : 0);
}

function onClose() {
  window.close();
  setTimeout(() => {
    if (!window.closed) void router.push("/");
  }, 120);
}

/* ---------------- 装载 ---------------- */

async function loadMap() {
  loading.value = true;
  try {
    if (!mapId.value) {
      toast("缺少 map 参数", 2500, "warn");
      return;
    }
    map.value = getMap(mapId.value);
    if (!map.value) {
      toast("未找到库位图", 3000, "warn");
      return;
    }
    /* 垛位位置表恒取样例（参照数据，不进 localStorage）；
       右侧表格另走 resolveWorkbook()：存档优先，无存档落 zhb 样例 */
    positions.value = loadStkSample().map((p) => ({ ...p, cpId: mapId.value, selected: false }));
    await initUniver();
    bestFit();
  } catch (e) {
    console.error(e);
    toast("设计器初始化失败", 3000, "error");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadMap();
});
onBeforeUnmount(disposeUniver);
</script>

<template>
  <!-- 必须 flex flex-col：否则 Splitter 的 flex-1 无效，内容区高度塌成工具栏一行 -->
  <div class="flex h-full w-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
    <!-- 工具栏（原 stackPanel1）：窗标题靠左，操作整组靠右；末两位 保存(实色主色) / 关闭(实色红) -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <span class="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
        {{ map ? `${map.cName}-库位图模板设计` : "库位图模板设计" }}
      </span>

      <div class="ml-auto flex shrink-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onRefresh">
          <IconRefresh class="h-3 w-3" />刷新
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onInitPositions">
          <IconLocation class="h-3 w-3" />初始化位置信息
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAutoMatch">
          <IconWand class="h-3 w-3" />自动匹配位置
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :disabled="!sheetReady" @click="onSetPosition">
          设置位置
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onClearPosition">
          <IconTrash class="h-3 w-3" />清除位置
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onBeautify">美化</Button>

        <!-- 原 checkEdit1 网格线 / checkEdit2 列头 -->
        <Checkbox v-model="showGridlines" binary inputId="mapShowGrid" class="ml-2" @update:model-value="onToggleGridlines" />
        <label for="mapShowGrid" class="shrink-0 text-xs text-muted-foreground">网格线</label>
        <Checkbox v-model="showHeadings" binary inputId="mapShowHead" @update:model-value="onToggleHeadings" />
        <label for="mapShowHead" class="shrink-0 text-xs text-muted-foreground">标题</label>

        <!-- 原 labelControl1「坐标」+ textEdit1（只读） -->
        <label class="ml-2 shrink-0 text-xs text-muted-foreground">坐标</label>
        <InputText v-model="selRef" readonly class="w-28 shrink-0" />

        <Button severity="primary" class="ml-2 shrink-0 whitespace-nowrap" :loading="saving" @click="onSave">
          <IconDeviceFloppy class="h-3 w-3" />保存
        </Button>
        <Button severity="danger" class="shrink-0 whitespace-nowrap" @click="onClose">
          <IconX class="h-3 w-3" />关闭
        </Button>
      </div>
    </div>

    <!-- 左右分栏（原 gridControl1 Dock.Left + splitterControl1 + spreadsheetControl1 Dock.Fill） -->
    <Splitter :gutter-size="5" class="min-h-0 w-full flex-1">
      <SplitterPanel :size="30" :minSize="18" class="flex min-h-0 flex-col overflow-hidden">
        <!-- 单页让步：ui-rules §6 纯标题分区头默认 h-8，此处放宽到 h-10，
             因右侧 Univer ribbon 行高实测 40px，h-8 会让两栏内容起始行差 8px -->
        <div class="flex h-10 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">垛位位置</span>
          <span class="ml-auto text-xs text-muted-foreground">{{ positions.length }}</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="posCols"
            :default-col-def="hmxDefaultColDef"
            :row-data="positions"
            :get-row-id="getPosRowId"
            :row-selection="{ mode: 'multiRow', checkboxes: false, headerCheckbox: false, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :pagination="false"
            :animate-rows="false"
            :locale-text="AG_GRID_LOCALE_CN"
            @grid-ready="onPosReady"
            @selection-changed="onPosSelection"
            @row-clicked="onPosClick"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="70" :minSize="40" class="flex min-h-0 flex-col overflow-hidden">
        <div class="relative min-h-0 w-full flex-1 overflow-hidden">
          <div
            v-if="loading || !sheetReady"
            class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-background px-4 text-center text-sm text-muted-foreground"
          >
            <span>{{ sheetError ? "表格初始化失败：" + sheetError : "正在加载表格设计器…" }}</span>
            <button v-if="sheetError" type="button" class="text-xs text-primary" @click="initUniver">重试</button>
          </div>
          <div id="yd1010-univer" class="absolute inset-0 h-full w-full" />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<style scoped>
/* PrimeVue 5 主题把横向 gutter 钉死 1px（gutter-size prop 只落到 handle 内联样式），
   这里按 gutter-size=8 把 gutter 与 ::before 热区一并撑开 */
:deep(.p-splitter-gutter[data-orientation="horizontal"]) {
  width: 5px;
}
:deep(.p-splitter-gutter[data-orientation="horizontal"])::before {
  width: 5px;
}
</style>
