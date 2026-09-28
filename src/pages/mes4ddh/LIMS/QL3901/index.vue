<script setup lang="ts">
/** 对应 FrmQL3901（重组样取样计划）：DDH.Winforms.LIMS.Forms.FrmQL3901
 *  布局：dataLayoutControl1（重组样时间 UCTimeRange + 批号/组批号/炉号/板坯号 + 钢种/执行标准/代表样编号，8 项）
 *       → stackPanel1（h-9：查询/添加取样实绩/删除取样实绩/发送检验委托/取消发送，无 labelControl1）
 *       → gridControl2/gvPlanDetail（Tql3900FYItemDto，单表，Designer 无 SplitContainer → 不做主子表分栏）
 *  已接入：tql3900Api.queryFYPlan（btnQuery）
 *         tql3900Api.addFYQySj（btnAddQySj：逐条顺序提交，失败累积）
 *         tql3900Api.cancelFYQySj（btnDelQySj）
 *         tql3900Api.sendFYSamp（btnSendJY）
 *         tql3900Api.cancelSendFYSamp（btnCancelSend）
 *         tyd1000Api.queryRoom（原 FrmQL3901_Load → colCStore.SetCodeFormatterAsync<StoreFormatter>：cStoreCode→cStoreDes）
 *  待接入：右键「查看履历」（原 SetPopupMenuForRecord → FrmYD2000Record 二级弹窗，未连带迁移）
 *  偏差：产线走菜单 cQueryString（useMenuQuery 首段，缺省 ZG01），不硬编码；
 *         原 colSelected（Selected 布尔勾选列，Fixed=Left）按 ui-rules §5.3 用 AG Grid 原生 multiRow 勾选列复刻，
 *           不另造 checkbox 列；原 data.Where(l => l.Selected) 改读 getSelectedRows()；
 *         原 WaitDialog.RaiseBusy 逐条进度（正在发送送样 i/n）以按钮 loading 呈现，不复刻进度文案；
 *         原 MsgBox 多行失败清单以页内信息 Dialog 呈现；
 *         原 FrmConfirmValueDialog（取样时间）按 QL4000 先例以页内单字段 Dialog 复刻 */
import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import { IconArrowBackUp, IconPlus, IconSearch, IconSend, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { tql3900Api, type TimeRange, type Tql3900FYItemDto, type Tql3900InputDto } from "@/api/mes4ddh/lims.swagger";
import { tyd1000Api, type Tyd1000 } from "@/api/mes4ddh/syd.swagger";

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

/* ---------- 查询条件（bscInput = Tql3900InputDto） ---------- */
const input = reactive({
  dates: defaultRange() as Date[] | null,
  cBatchNo: "",
  cZpBatchNo: "",
  cStove: "",
  cPieceNo: "",
  cSgCode: "",
  cSgStd: "",
  cSameTestNo: "",
});
function buildInput(): Tql3900InputDto {
  return {
    cLineCode: lineCode,
    cBatchNo: input.cBatchNo.trim() || undefined,
    cZpBatchNo: input.cZpBatchNo.trim() || undefined,
    cStove: input.cStove.trim() || undefined,
    cPieceNo: input.cPieceNo.trim() || undefined,
    cSgCode: input.cSgCode.trim() || undefined,
    cSgStd: input.cSgStd.trim() || undefined,
    cSameTestNo: input.cSameTestNo.trim() || undefined,
    timeRange: toTimeRange(input.dates),
  };
}

/* ---------- 表格 ---------- */
const rows = shallowRef<Tql3900FYItemDto[]>([]);
const querying = ref(false);
const working = ref(false);
const api = ref<GridApi | null>(null);

function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
/** 原 data.Where(l => l.Selected == true) */
function selectedRows(): Tql3900FYItemDto[] {
  return (api.value?.getSelectedRows() ?? []) as Tql3900FYItemDto[];
}

const isY = (v: unknown) => String(v ?? "") === "Y";
const hasTime = (v: string | null | undefined) => v != null && String(v) !== "";

/* ---------- 库区（原 colCStore.SetCodeFormatterAsync<StoreFormatter>） ---------- */
const storeMap = ref(new Map<string, string>());
function storeFmt(p: ValueFormatterParams) {
  const code = String(p.value ?? "");
  return storeMap.value.get(code) ?? code;
}
async function loadStores() {
  try {
    const rooms = (await tyd1000Api.queryRoom(undefined)) ?? [];
    const m = new Map<string, string>();
    for (const r of rooms as Tyd1000[]) {
      const code = String(r.cStoreCode ?? "");
      if (code !== "") m.set(code, String(r.cStoreDes || r.cStoreCode || ""));
    }
    storeMap.value = m;
    api.value?.refreshCells({ force: true });
  } catch {
    /* 拦截层已 toast */
  }
}

/* 原 FormatRules：CQYStatus="已取样" 绿底；CSendStatus="Y" 绿底加粗。原 colCZpNo 单元格字体加粗 */
function cellQyStatus(p: { value: unknown }) {
  return String(p.value ?? "") === "已取样" ? "fy-mark" : "";
}
function cellSendStatus(p: { value: unknown }) {
  return isY(p.value) ? "fy-mark fy-bold" : "";
}

/** 列集与顺序照 Designer 的 VisibleIndex；隐藏列以 hide 收着 */
const colDefs = ref<ColDef[]>([
  { colId: "cSameTestNoNew", field: "cSameTestNoNew", headerName: "新代表样编号", width: 138 },
  { colId: "cSameTestNo", field: "cSameTestNo", headerName: "原代表样编号", width: 125 },
  { colId: "cZpNo", field: "cZpNo", headerName: "组批号", width: 99, cellClass: "fy-bold" },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "头侧件次号", width: 112 },
  { colId: "cQYStatus", field: "cQYStatus", headerName: "取样标记", width: 99, cellClass: cellQyStatus },
  { colId: "cSendStatus", field: "cSendStatus", headerName: "送样状态", width: 99, cellClass: cellSendStatus },
  { colId: "cSgSign", field: "cSgSign", headerName: "钢种", width: 86 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 86 },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 86 },
  { colId: "nWth", field: "nWth", headerName: "宽度", width: 86 },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 86 },
  { colId: "cQyUser", field: "cQyUser", headerName: "取样人", width: 99 },
  { colId: "dQyTime", field: "dQyTime", headerName: "取样时间", width: 140 },
  { colId: "cSendUser", field: "cSendUser", headerName: "发送人", width: 99 },
  { colId: "dSendTime", field: "dSendTime", headerName: "发送时间", width: 140 },
  { colId: "cStore", field: "cStore", headerName: "库区", width: 99, valueFormatter: storeFmt },
  { colId: "nStatus", field: "nStatus", headerName: "处理标记", width: 99 },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 99 },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 86 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 99, hide: true },
  { colId: "nOrder", field: "nOrder", headerName: "消息排序号", width: 112, hide: true },
]);

/* ---------- 页内取样时间 Dialog（原 FrmConfirmValueDialog + DateEdit） ---------- */
const tdlg = reactive({ open: false, title: "", time: new Date() as Date | null });
let tdlgResolve: ((r: Date | null) => void) | null = null;
function askQyTime(title: string): Promise<Date | null> {
  return new Promise((resolve) => {
    tdlgResolve = resolve;
    tdlg.title = title;
    tdlg.time = new Date();
    tdlg.open = true;
  });
}
function tdlgOk() {
  tdlg.open = false;
  tdlgResolve?.(tdlg.time);
  tdlgResolve = null;
}
function tdlgCancel() {
  tdlg.open = false;
  tdlgResolve?.(null);
  tdlgResolve = null;
}
/** 右上角关闭也按「取消」结算，避免调用方 await 悬挂 */
function tdlgVisible(v: boolean) {
  tdlg.open = v;
  if (!v) tdlgCancel();
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
    rows.value = (await tql3900Api.queryFYPlan(buildInput())) ?? [];
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

/** 原逐条 try/catch 累积：ex.GetBaseException()?.Message ?? ex.Message */
function errText(e: unknown): string {
  const err = e as { message?: string } | undefined;
  return String(err?.message ?? e ?? "");
}
/** 原 GroupBy(w => w.CSameTestNoNew).Count() */
function distinctNewTestNo(data: Tql3900FYItemDto[]): number {
  return new Set(data.map((l) => String(l.cSameTestNoNew ?? ""))).size;
}

/* ---------- btnAddQySj（添加取样实绩） ---------- */
async function onAddQySj() {
  const data = selectedRows().filter((l) => !isY(l.cSendStatus) && !hasTime(l.dQyTime));
  if (data.length === 0) {
    toast("请勾选未取样且未送样的板后再操作", 2000, "warn");
    return;
  }
  const title = `添加取样实绩,数量${data.length}，${data.map((w) => w.cPieceNo ?? "").join(";")}`;
  const qyTime = await askQyTime(title);
  if (qyTime === null) return;
  working.value = true;
  const errs: string[] = [];
  for (const current of data) {
    try {
      await tql3900Api.addFYQySj({ ...current, dQyTime: isoLocal(qyTime) });
    } catch (e) {
      errs.push(`${current.cPieceNo ?? ""}`, errText(e));
    }
  }
  if (errs.length > 0) showMessage(`以下板操作失败\n${errs.join("\n")}`);
  else toast(`操作成功,数量${data.length}`, 2000, "success");
  await loadData();
}

/* ---------- btnDelQySj（删除取样实绩） ---------- */
async function onDelQySj() {
  const data = selectedRows().filter((l) => !isY(l.cSendStatus) && hasTime(l.dQyTime));
  if (data.length === 0) {
    toast("请勾选已取样且未送样的板后再操作", 2000, "warn");
    return;
  }
  if (!(await askConfirm(`确认删除取样实绩,数量${data.length}？，删除后不能恢复！`))) return;
  working.value = true;
  const errs: string[] = [];
  for (const item of data) {
    try {
      await tql3900Api.cancelFYQySj(item);
    } catch (e) {
      errs.push(`${item.cPieceNo ?? ""}`, errText(e));
    }
  }
  await loadData();
  if (errs.length > 0) showMessage(`以下板操作失败\n${errs.join("\n")}`);
  else toast(`操作成功,数量${data.length}`, 2000, "success");
}

/* ---------- btnSendJY（发送检验委托） ---------- */
async function onSendJy() {
  const picked = selectedRows().filter((l) => hasTime(l.dQyTime) && !isY(l.cSendStatus));
  if (picked.length === 0) {
    toast("需送样数目为0，请勾选已取样且未送样的进行操作", 2000, "warn");
    return;
  }
  const all = picked.filter((w) => !isY(w.cSendStatus));
  if (!(await askConfirm(`确定发送送样？委托数量${distinctNewTestNo(all)}样本数量${all.length}`))) return;
  working.value = true;
  const errs: string[] = [];
  for (const item of all) {
    try {
      await tql3900Api.sendFYSamp(item);
    } catch (e) {
      errs.push(errText(e));
    }
  }
  await loadData();
  if (errs.length > 0) showMessage(errs.join("\n"));
}

/* ---------- btnCancelSend（取消发送） ---------- */
async function onCancelSend() {
  const picked = selectedRows().filter((l) => isY(l.cSendStatus));
  if (picked.length === 0) {
    toast("需取消送样数目为0，请勾选已送样的进行取消", 2000, "warn");
    return;
  }
  const all = picked.filter((w) => isY(w.cSendStatus));
  if (!(await askConfirm(`确定取消送样？委托数量${distinctNewTestNo(all)}样本数量${all.length}`))) return;
  working.value = true;
  const errs: string[] = [];
  for (const item of all) {
    try {
      await tql3900Api.cancelSendFYSamp(item);
    } catch (e) {
      errs.push(`${item.cPieceNo ?? ""} ${errText(e)}`);
    }
  }
  await loadData();
  if (errs.length > 0) showMessage(errs.join("\n"));
}

onMounted(() => {
  void loadStores();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1 8 项，重组样时间为 UCTimeRange） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">重组样时间</label>
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批号</label>
        <InputText v-model="input.cZpBatchNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">代表样编号</label>
        <InputText v-model="input.cSameTestNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
    </div>

    <!-- stackPanel1：5 个按钮（原 Controls.Add 顺序） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="working" @click="onAddQySj">
        <IconPlus class="h-3 w-3" />添加取样实绩
      </Button>
      <Button
        variant="outlined"
        severity="danger"
        class="shrink-0 whitespace-nowrap"
        :loading="working"
        @click="onDelQySj"
      >
        <IconTrash class="h-3 w-3" />删除取样实绩
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

    <!-- 取样时间（原 FrmConfirmValueDialog + DateEdit） -->
    <Dialog
      :visible="tdlg.open"
      modal
      :header="tdlg.title"
      :style="{ width: 'min(30rem, calc(100vw - 2rem))' }"
      @update:visible="tdlgVisible"
    >
      <div class="flex flex-col gap-2">
        <label class="text-xs text-muted-foreground">取样时间</label>
        <DatePicker
          v-model="tdlg.time"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          autofocus
          fluid
          placeholder="取样时间"
        />
      </div>
      <template #footer>
        <Button label="取消" variant="outlined" @click="tdlgCancel" />
        <Button label="确定" variant="outlined" @click="tdlgOk" />
      </template>
    </Dialog>

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
/* 原 FormatRules：绿底（已取样 / 已送样），送样状态另有加粗 */
:deep(.fy-mark) {
  background-color: rgba(0, 128, 0, 0.28) !important;
}
:deep(.fy-bold) {
  font-weight: 700;
}
</style>
