<script setup lang="ts">
/** 对应 FrmQL3910（取样实绩）：DDH.Winforms.LIMS.Forms.FrmQL3910
 *  布局：dataLayoutControl1（取样时间 UCTimeRange + 炉号/组批号/板坯号 + 钢种/执行标准/发送状态 ImageComboBoxEdit + 批号，8 项）
 *       → stackPanel1（h-9：查询/发送检验委托/取消发送 + 右侧 labelControl1 绿字统计）
 *       → gridControl2/gvPlanDetail（Tql3900ItemDetailSJDto，单表，Designer 无 SplitContainer → 不做主子表分栏）
 *  已接入：tql3900Api.queryQl3900（btnQuery：查询 + 早/中/晚班统计）
 *         tql3900Api.createSamp（btnSendJY：逐条顺序送样，失败累积）
 *         tql3900Api.cancelSamp（btnCancelSend：逐条顺序取消）
 *  待接入：右键「查看履历」（原 SetPopupMenuForRecord → FrmYD2000Record 二级弹窗，未连带迁移）
 *  偏差：产线走菜单 cQueryString（useMenuQuery 首段，缺省 ZG01），不硬编码；
 *         原 colSelected（Selected 布尔勾选列，Fixed=Left）按 ui-rules §5.3 用 AG Grid 原生 multiRow 勾选列复刻，
 *           不另造 checkbox 列；原 data.Where(l => l.Selected) 改读 getSelectedRows()；
 *         原 colCSameTestNo/colCZpNo 的 Fixed=Left 迁为 AG Grid pinned:"left"；
 *         原 WaitDialog.RaiseBusy 逐条进度（正在发送送样 i/n）以按钮 loading 呈现，不复刻进度文案；
 *         原 MsgBox 多行失败清单以页内信息 Dialog 呈现 */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconArrowBackUp, IconSearch, IconSend } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { CellClassParams, ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { tql3900Api, type Tql3900InputDto, type Tql3900ItemDetailSJDto } from "@/api/mes4ddh/lims.swagger";
import { YesNoDefault, type TimeRange } from "@/api/mes4ddh/syd.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();
const { parts: menuQs } = useMenuQuery();

/** 原 _lineCode = QueryString */
const lineCode = menuQs[0] ?? "ZG01";

/* ---------- 时间（原 ucTimeRange 绑定 bscInput.TimeRange） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
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

/* ---------- 查询条件（bscInput = Tql3900InputDto；CSendStatus 默认 YesNoDefault.Default=全部） ---------- */
const sendStatusOptions = [
  { label: "否", value: YesNoDefault.N },
  { label: "是", value: YesNoDefault.Y },
  { label: "全部", value: YesNoDefault.Default },
];
const input = reactive({
  dates: defaultRange() as Date[] | null,
  cStove: "",
  cZpBatchNo: "",
  cPieceNo: "",
  cSgCode: "",
  cSgStd: "",
  cSendStatus: YesNoDefault.Default as YesNoDefault,
  cBatchNo: "",
});
function buildInput(): Tql3900InputDto {
  return {
    cLineCode: lineCode,
    cStove: input.cStove.trim() || undefined,
    cZpBatchNo: input.cZpBatchNo.trim() || undefined,
    cPieceNo: input.cPieceNo.trim() || undefined,
    cSgCode: input.cSgCode.trim() || undefined,
    cSgStd: input.cSgStd.trim() || undefined,
    cBatchNo: input.cBatchNo.trim() || undefined,
    cSendStatus: input.cSendStatus,
    timeRange: toTimeRange(input.dates),
  };
}

/* ---------- 表格 ---------- */
const rows = shallowRef<Tql3900ItemDetailSJDto[]>([]);
const querying = ref(false);
const working = ref(false);
const api = ref<GridApi | null>(null);

function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
/** 原 data.Where(l => l.Selected == true) */
function selectedRows(): Tql3900ItemDetailSJDto[] {
  return (api.value?.getSelectedRows() ?? []) as Tql3900ItemDetailSJDto[];
}

const isY = (v: unknown) => String(v ?? "") === "Y";
/** 原 FormatRules：CSendStatus == "Y" 绿底 */
function cellSendStatus(p: CellClassParams) {
  return isY(p.value) ? "sj-mark" : "";
}

/** 列集与顺序照 Designer 的 VisibleIndex（0 为 Selected 勾选列→原生行选择）；隐藏列以 hide 收着 */
const colDefs = ref<ColDef[]>([
  { colId: "cSameTestNo", field: "cSameTestNo", headerName: "原代表样编号", width: 125, pinned: "left" },
  { colId: "cZpNo", field: "cZpNo", headerName: "组批号", width: 99, pinned: "left" },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 86 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "头侧件次号", width: 112 },
  { colId: "cQyPlateSJ", field: "cQyPlateSJ", headerName: "取样实绩板", width: 112 },
  { colId: "time", field: "time", headerName: "发送时刻", width: 140 },
  { colId: "sampleLth", field: "sampleLth", headerName: "取样长度", width: 99 },
  { colId: "cSgSign", field: "cSgSign", headerName: "钢种", width: 86 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "dSendTime", field: "dSendTime", headerName: "发送时间", width: 140 },
  { colId: "cSendUser", field: "cSendUser", headerName: "发送人", width: 99 },
  { colId: "cSendStatus", field: "cSendStatus", headerName: "送样状态", width: 99, cellClass: cellSendStatus },
  { colId: "cZpType", field: "cZpType", headerName: "组批分类", width: 99 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 99 },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 86 },
  { colId: "nWth", field: "nWth", headerName: "宽度", width: 86 },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 86 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态", width: 112 },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 138 },
  { colId: "cSpecialDesc", field: "cSpecialDesc", headerName: "特殊要求", width: 99 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 99 },
  { colId: "nOrder", field: "nOrder", headerName: "消息排序号", width: 112 },
  { colId: "isQY", field: "isQY", headerName: "是否取样", width: 99, hide: true },
]);

/* ---------- labelControl1 统计（原 const text） ---------- */
const statsText = ref("");
function hourOf(v: string | null | undefined): number | null {
  if (v == null || String(v) === "") return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.getHours();
}
function distinctTestNo(data: Tql3900ItemDetailSJDto[], keep: (l: Tql3900ItemDetailSJDto) => boolean): number {
  const set = new Set<string>();
  for (const l of data) if (keep(l)) set.add(String(l.cSameTestNo ?? ""));
  return set.size;
}
function computeStats(data: Tql3900ItemDetailSJDto[]) {
  const total = distinctTestNo(data, (l) => isY(l.isQY));
  const early = distinctTestNo(data, (l) => between(hourOf(l.time), 0, 8));
  const middle = distinctTestNo(data, (l) => between(hourOf(l.time), 8, 16));
  const late = distinctTestNo(data, (l) => between(hourOf(l.time), 16, 24));
  statsText.value = `总取样批次:${total}，早班取样${early}，中班取样：${middle}，晚班取样${late}，总板坯数量${data.length}`;
}
function between(hour: number | null, min: number, max: number): boolean {
  return hour != null && hour >= min && hour < max;
}

/* ---------- 确认框（原 MsgBox.ShowYesNo） ---------- */
const cdlg = reactive({ open: false, msg: "" });
let cdlgResolve: ((yes: boolean) => void) | null = null;
function askConfirm(msg: string): Promise<boolean> {
  return new Promise((resolve) => {
    cdlgResolve = resolve;
    cdlg.msg = msg;
    cdlg.open = true;
  });
}
function cdlgDone(yes: boolean) {
  cdlg.open = false;
  cdlgResolve?.(yes);
  cdlgResolve = null;
}
function cdlgVisible(v: boolean) {
  cdlg.open = v;
  if (!v) cdlgDone(false);
}

/* ---------- 信息框（原 MsgBox.Show 多行失败清单） ---------- */
const msgOpen = ref(false);
const msgText = ref("");
function showMessage(text: string) {
  msgText.value = text;
  msgOpen.value = true;
}

/* ---------- btnQuery ---------- */
async function loadData() {
  working.value = true;
  try {
    const data = (await tql3900Api.queryQl3900(buildInput())) ?? [];
    rows.value = data;
    computeStats(data);
  } catch {
    /* 拦截层已 toast */
  } finally {
    working.value = false;
  }
}
async function onQuery() {
  querying.value = true;
  try {
    await loadData();
  } finally {
    querying.value = false;
  }
}

/** 原 ex.GetBaseException()?.Message ?? ex.Message */
function errText(e: unknown): string {
  const err = e as { message?: string } | undefined;
  return String(err?.message ?? e ?? "");
}

/* ---------- btnSendJY（发送检验委托） ---------- */
async function onSendJy() {
  const selected = selectedRows();
  const all = selected.filter((w) => !isY(w.cSendStatus));
  if (all.length === 0) {
    toast("需送样数目为0", 2000, "warn");
    return;
  }
  if (!(await askConfirm(`确定发送送样？数量${all.length}`))) return;
  working.value = true;
  const errs: string[] = [];
  for (const item of all) {
    try {
      await tql3900Api.createSamp(item);
    } catch (e) {
      errs.push(`${item.cPieceNo ?? ""} ${errText(e)}`);
    }
  }
  if (errs.length > 0) showMessage(errs.join("\n"));
  await loadData();
}

/* ---------- btnCancelSend（取消发送） ---------- */
async function onCancelSend() {
  const selected = selectedRows();
  const all = selected.filter((w) => isY(w.cSendStatus));
  if (all.length === 0) {
    toast("需取消送样数目为0", 2000, "warn");
    return;
  }
  if (!(await askConfirm(`确定取消送样？数量${all.length}`))) return;
  working.value = true;
  const errs: string[] = [];
  for (const item of all) {
    try {
      await tql3900Api.cancelSamp(item);
    } catch (e) {
      errs.push(`${item.cPieceNo ?? ""} ${errText(e)}`);
    }
  }
  if (errs.length > 0) showMessage(errs.join("\n"));
  await loadData();
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1 8 项，取样时间为 UCTimeRange，发送状态为 ImageComboBoxEdit） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">取样时间</label>
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批号</label>
        <InputText v-model="input.cZpBatchNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">发送状态</label>
        <Select
          v-model="input.cSendStatus"
          :options="sendStatusOptions"
          option-label="label"
          option-value="value"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
    </div>

    <!-- stackPanel1：3 个按钮（原 Controls.Add 顺序）+ 右侧 labelControl1 统计 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="working" @click="onSendJy">
        <IconSend class="h-3 w-3" />发送检验委托
      </Button>
      <Button
        variant="outlined"
        severity="danger"
        class="shrink-0 whitespace-nowrap"
        :loading="working"
        @click="onCancelSend"
      >
        <IconArrowBackUp class="h-3 w-3" />取消发送
      </Button>
      <span class="ml-auto shrink-0 truncate text-xs font-medium text-success">{{ statsText }}</span>
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
        :pagination="false"
        :animate-rows="false"
        :loading="working"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <!-- 确认（原 MsgBox.ShowYesNo） -->
    <Dialog
      :visible="cdlg.open"
      modal
      header="确认"
      :style="{ width: 'min(34rem, calc(100vw - 2rem))' }"
      @update:visible="cdlgVisible"
    >
      <p class="text-xs whitespace-pre-wrap">{{ cdlg.msg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="cdlgDone(false)" />
        <Button label="确定" variant="outlined" autofocus @click="cdlgDone(true)" />
      </template>
    </Dialog>

    <!-- 失败清单（原 MsgBox.Show） -->
    <Dialog
      :visible="msgOpen"
      modal
      header="提示"
      :style="{ width: 'min(42rem, calc(100vw - 2rem))' }"
      @update:visible="msgOpen = $event"
    >
      <p class="max-h-96 overflow-auto text-body whitespace-pre-wrap">{{ msgText }}</p>
      <template #footer>
        <Button label="关闭" variant="outlined" autofocus @click="msgOpen = false" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* 原 FormatRules：送样状态=Y 绿底 */
:deep(.sj-mark) {
  background-color: rgba(0, 128, 0, 0.28) !important;
}
</style>
