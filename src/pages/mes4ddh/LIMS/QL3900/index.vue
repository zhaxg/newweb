<script setup lang="ts">
/** 对应 FrmQL3900（取样作业计划）：DDH.Winforms.LIMS.Forms.FrmQL3900
 *  布局：dataLayoutControl1（生产时间 UCTimeRange + 批号/组批号/炉号/板坯号 + 钢种/执行标准/代表样编号，8 项）
 *       → stackPanel1（h-9：查询/查询取样板/添加取样实绩/删除取样实绩/生成新代表样/取消新代表样号/重组样/取消重组样
 *          + 右侧 labelControl1 统计）→ gridControl2/gvPlanDetail（Tql3900ItemDto，单表，无 SplitContainer）
 *  已接入：tql3900Api.queryQyPlan（btnQuery：查询 + 取样备注计算 + 统计）
 *         testJobApi.getShowedQy + hR3000Api.testIsNeedQY（btnTest 查询取样板，原仅 system 用户可见）
 *         tql3900Api.addQySj（btnAddQySj）/ cancelQySj（btnDelQySj）
 *         tql3900Api.addNewSampleTest（btnNewAdd）/ cancelNewSampleTest（btnCancelAdd）
 *         qZ5000Api.addReSamplePlan（btnCZ 重组样）/ removeReSamplePlan（btnDelCZ 取消重组样）
 *  待接入：右键「查看履历」（原 SetPopupMenuForRecord → FrmYD2000Record 二级弹窗，未连带迁移）
 *  偏差：产线走菜单 cQueryString（useMenuQuery 首段，缺省 ZG01），不硬编码；
 *         原 CSameTestNo 列 AllowCellMerge + CellMerge 只放行该列——AG Grid 无等价单元格合并，未复刻；
 *         原表脚 CustomSummary「取样批次=N」（HashSet 去重计数）以底部横条呈现（同 HR9070 先例）；
 *         原 FrmConfirmValueDialog（指定原因 / 取样时间 / 取样母板数量）按 QL4000 先例以页内单字段 Dialog 复刻 */
import { computed, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import {
  IconArrowBackUp,
  IconFlask,
  IconPlus,
  IconSearch,
  IconStar,
  IconTrash,
  IconTransform,
  IconX,
} from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { CellClassParams, ColDef, GridApi, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { useAuthStore } from "@/stores/authStore";
import {
  qZ5000Api,
  tql3900Api,
  testJobApi,
  type TimeRange,
  type Tql3900InputDto,
  type Tql3900ItemDto,
} from "@/api/mes4ddh/lims.swagger";
import { hR3000Api } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();
const auth = useAuthStore();
const { parts: menuQs } = useMenuQuery();

/** 原 _lineCode = QueryString（多个产线共用本窗体） */
const lineCode = menuQs[0] ?? "ZG01";
/** 原构造里 btnTest.Visible = (UserId == "system") */
const isSystemUser = computed(() => auth.session?.userId === "system");

/* ---------- 时间（原 ucTimeRange，默认 [今天, 明天) 照 C# Load） ---------- */
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
const rows = shallowRef<Tql3900ItemDto[]>([]);
const querying = ref(false);
const working = ref(false);
const api = ref<GridApi | null>(null);
/** 原 gvPlanDetail.GetFocusedRow()：单选行点击即聚焦 */
const current = ref<Tql3900ItemDto | null>(null);

function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
function onSelectionChanged(e: SelectionChangedEvent) {
  current.value = (e.api.getSelectedNodes()[0]?.data as Tql3900ItemDto | undefined) ?? null;
}

const isY = (v: unknown) => String(v ?? "") === "Y";
const notEmpty = (v: string | null | undefined) => v != null && String(v) !== "";

/* 原 FormatRules：CSameTestNo / IsQY 在 IsQY=Y 时绿底；CIsQy=Y 深青；StatusStr=已轧制 青色 */
function cellSameTestNo(p: CellClassParams) {
  return isY((p.data as Tql3900ItemDto | undefined)?.isQY) ? "qy-mark" : "qy-bold";
}
function cellIsQy(p: CellClassParams) {
  return isY(p.value) ? "qy-mark" : "";
}
function cellCIsQy(p: CellClassParams) {
  return isY(p.value) ? "qy-dark" : "";
}
function cellStatusStr(p: CellClassParams) {
  return String(p.value ?? "") === "已轧制" ? "qy-rolled" : "";
}

/** 列集与顺序照 Designer 的 VisibleIndex；隐藏列以 hide 收着 */
const colDefs = ref<ColDef[]>([
  { colId: "cSameTestNo", field: "cSameTestNo", headerName: "原代表样编号", width: 125, cellClass: cellSameTestNo },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 86 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "头侧件次号", width: 112 },
  { colId: "cZpNo", field: "cZpNo", headerName: "组批号", width: 99, cellClass: "qy-bold" },
  { colId: "statusStr", field: "statusStr", headerName: "材料状态", width: 99, cellClass: cellStatusStr },
  { colId: "zZTime", field: "zZTime", headerName: "轧制时间", width: 112 },
  { colId: "cSgSign", field: "cSgSign", headerName: "钢种", width: 86 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 86 },
  { colId: "nWth", field: "nWth", headerName: "宽度", width: 86 },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 86 },
  { colId: "cIsQy", field: "cIsQy", headerName: "原取样板标记", width: 125, cellClass: cellCIsQy },
  { colId: "cQyRemark", field: "cQyRemark", headerName: "取样备注", width: 112 },
  { colId: "isQY", field: "isQY", headerName: "是否取样", width: 99, cellClass: cellIsQy },
  { colId: "time", field: "time", headerName: "发送时刻", width: 112 },
  { colId: "cRemark", field: "cRemark", headerName: "反馈结果", width: 112 },
  { colId: "cQyPlateSJ", field: "cQyPlateSJ", headerName: "取样实绩板", width: 112 },
  { colId: "sampleLth", field: "sampleLth", headerName: "取样长度", width: 99 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 99 },
  { colId: "cZpType", field: "cZpType", headerName: "组批分类", width: 99 },
  { colId: "nWgt", field: "nWgt", headerName: "坯重", width: 86 },
  { colId: "nNum", field: "nNum", headerName: "提货件数", width: 99 },
  { colId: "nInteval", field: "nInteval", headerName: "取样间隔", width: 99 },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 138 },
  { colId: "cSpecialDesc", field: "cSpecialDesc", headerName: "特殊要求", width: 99 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 99 },
  { colId: "nOrder", field: "nOrder", headerName: "消息排序号", width: 112 },
  { colId: "nStatus", field: "nStatus", headerName: "处理标记", width: 99, hide: true },
]);

/* ---------- 原 LoadData 的「取样备注」计算（A-Z 序号 + 常规/Z 向标记） ---------- */
function fillQyRemark(data: Tql3900ItemDto[]) {
  const groups = new Map<string, Tql3900ItemDto[]>();
  for (const r of data) {
    const key = String(r.cOldSameTestNo ?? "");
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  for (const item of data) {
    const sg = String(item.cSgSign ?? "");
    const isZ = sg.includes("Z");
    const isZ15 = sg.includes("Z15");
    const is235 = sg.includes("235");
    const sameTestNos = groups.get(String(item.cOldSameTestNo ?? "")) ?? [];
    const index = sameTestNos.filter((l) => isY(l.cIsQy)).indexOf(item);
    if (!isY(item.cIsQy)) continue;
    /* 常规取样数量：235 钢种或单块固定取 2 个，其余 1 个 */
    const count1 = is235 || sameTestNos.length === 1 ? 2 : 1;
    /* Z 向取样数：Z15 最多两块，其他 Z 向钢种每块都有 */
    const zFlag = isZ ? (isZ15 ? index < 2 : true) : false;
    if (index <= abc.length - 1) {
      item.cQyRemark = `${abc[index]}-${count1}*[1/4 常规]`;
      if (zFlag) item.cQyRemark += " [1/2 Z向]";
    }
  }
}

/* ---------- labelControl1 统计 ---------- */
const statsText = ref("");
/** 原 CustomSummary：CSameTestNo 去重计数（HashSet） */
const batchCount = computed(
  () => new Set(rows.value.map((l) => String(l.cSameTestNo ?? "")).filter((s) => s !== "")).size,
);

function computeStats(data: Tql3900ItemDto[]) {
  const batch = new Set(data.map((l) => String(l.cSameTestNo ?? ""))).size;
  const pairNum = new Map<string, number>();
  for (const l of data) pairNum.set(`${l.cSameTestNo}\u0000${l.nNum}`, l.nNum ?? 0);
  let planNum = 0;
  for (const v of pairNum.values()) planNum += v;
  const actualNum = data.filter((l) => notEmpty(l.cQyPlateSJ)).length;
  statsText.value = `总计划取样批次:${batch}，总计划取样数量：${planNum}，实际取样数量${actualNum}，总板坯数${data.length}`;
}

/* ---------- 页内单字段 Dialog（原 FrmConfirmValueDialog） ---------- */
type ValueMode = "text" | "time" | "number";
interface ValueResult {
  text: string;
  time: Date | null;
  num: number;
}
const vdlg = reactive({
  open: false,
  title: "",
  label: "",
  mode: "text" as ValueMode,
  text: "",
  time: null as Date | null,
  num: 2,
});
let vdlgResolve: ((r: ValueResult | null) => void) | null = null;
function askValue(
  title: string,
  label: string,
  mode: ValueMode,
  def: Partial<ValueResult>,
): Promise<ValueResult | null> {
  return new Promise((resolve) => {
    vdlgResolve = resolve;
    vdlg.title = title;
    vdlg.label = label;
    vdlg.mode = mode;
    vdlg.text = def.text ?? "";
    vdlg.time = mode === "time" ? (def.time ?? new Date()) : null;
    vdlg.num = def.num ?? 2;
    vdlg.open = true;
  });
}
function vdlgOk() {
  vdlg.open = false;
  vdlgResolve?.({ text: vdlg.text, time: vdlg.time, num: vdlg.num });
  vdlgResolve = null;
}
function vdlgCancel() {
  vdlg.open = false;
  vdlgResolve?.(null);
  vdlgResolve = null;
}
/** 右上角关闭也按「取消」结算，避免调用方 await 悬挂 */
function vdlgVisible(v: boolean) {
  vdlg.open = v;
  if (!v) vdlgCancel();
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

/* ---------- ShowMsg（btnTest 调试信息） ---------- */
const msgOpen = ref(false);
const msgText = ref("");
/* ---------- btnQuery ---------- */
async function loadData() {
  working.value = true;
  try {
    const data = (await tql3900Api.queryQyPlan(buildInput())) ?? [];
    fillQyRemark(data);
    rows.value = data;
    current.value = null;
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

/** 原各处理器开头的 GetFocusedRow 空判定，提示逐字照抄 */
function needRow(msg: string): Tql3900ItemDto | null {
  if (!current.value) {
    toast(msg, 2000, "warn");
    return null;
  }
  return current.value;
}

/* ---------- btnTest（查询取样板：原仅 system 可见） ---------- */
async function onTest() {
  const row = needRow("请选择取样批次后查看");
  if (!row) return;
  working.value = true;
  try {
    const data = (await testJobApi.getShowedQy(row.cPieceNo ?? undefined)) ?? [];
    const str = data
      .map(
        (w) =>
          `${w.cStove ?? ""} ${w.cSampBatchNo ?? ""} ${w.cBatchNo ?? ""}-${w.nOrder ?? ""} ${w.cPieceNo ?? ""} ${w.isQy ?? ""}`,
      )
      .join("\n");
    const str2 = await hR3000Api.testIsNeedQY(
      row.cBatchNo ?? undefined,
      Math.trunc(row.nOrder ?? 0),
      row.cPieceNo ?? undefined,
    );
    msgText.value = `${str}\n${String(str2)}`;
    msgOpen.value = true;
  } catch {
    /* 拦截层已 toast */
  } finally {
    working.value = false;
  }
}

/* ---------- btnNewAdd（生成新代表样） ---------- */
async function onNewAdd() {
  const row = needRow("请选择后再操作");
  if (!row) return;
  if (String(row.cSameTestNo ?? "").includes("CZ")) {
    toast("重组样，不允许操作", 2000, "warn");
    return;
  }
  if (notEmpty(row.cSameTestNoNew)) {
    toast("已是新代表样，不能重复操作", 2000, "warn");
    return;
  }
  if (isY(row.cSendStatus)) {
    toast("已送样，不允许操作", 2000, "warn");
    return;
  }
  const res = await askValue(`${row.cZpNo} 生成新代表样，请输入原因`, "指定原因", "text", { text: row.cRemark ?? "" });
  if (!res) return;
  working.value = true;
  try {
    await tql3900Api.addNewSampleTest({ ...row, cRemark: res.text });
    await loadData();
  } catch {
    /* 拦截层已 toast */
  } finally {
    working.value = false;
  }
}

/* ---------- btnCancelAdd（取消新代表样号） ---------- */
async function onCancelAdd() {
  const row = needRow("请选择后再操作");
  if (!row) return;
  if (String(row.cSameTestNo ?? "").includes("CZ")) {
    toast("重组样，不允许操作", 2000, "warn");
    return;
  }
  if (!notEmpty(row.cSameTestNoNew)) {
    toast("没有新代表样，不需要操作", 2000, "warn");
    return;
  }
  if (isY(row.cSendStatus)) {
    toast("已送样，不允许操作", 2000, "warn");
    return;
  }
  if (!(await askConfirm("确认取消？"))) return;
  working.value = true;
  try {
    await tql3900Api.cancelNewSampleTest(row);
    await loadData();
  } catch {
    /* 拦截层已 toast */
  } finally {
    working.value = false;
  }
}

/* ---------- btnAddQySj（添加取样实绩） ---------- */
async function onAddQySj() {
  const row = needRow("请选择取样板后再操作");
  if (!row) return;
  if (String(row.cSameTestNo ?? "").includes("CZ")) {
    toast("已重组样，不允许操作", 2000, "warn");
    return;
  }
  if (notEmpty(row.cQyPlateSJ)) {
    toast("已取样，不允许重复操作", 2000, "warn");
    return;
  }
  const res = await askValue(`${row.cZpNo} 添加取样实绩`, "取样时间", "time", { time: new Date() });
  if (!res) return;
  if (res.time == null) {
    toast("请选择取样时间", 2000, "warn");
    return;
  }
  working.value = true;
  try {
    await tql3900Api.addQySj({ ...row, time: isoLocal(res.time) });
    await loadData();
  } catch {
    /* 拦截层已 toast */
  } finally {
    working.value = false;
  }
}

/* ---------- btnDelQySj（删除取样实绩） ---------- */
async function onDelQySj() {
  const row = needRow("请选择后再操作");
  if (!row) return;
  if (String(row.cSameTestNo ?? "").includes("CZ")) {
    toast("已重组样，不允许操作", 2000, "warn");
    return;
  }
  if (!notEmpty(row.cQyPlateSJ)) {
    toast("未取样，不需要操作", 2000, "warn");
    return;
  }
  if (isY(row.cSendStatus)) {
    toast("已送样，不允许操作", 2000, "warn");
    return;
  }
  if (!(await askConfirm("确认删除取样实绩？，删除后不能恢复！"))) return;
  working.value = true;
  try {
    await tql3900Api.cancelQySj(row);
    await loadData();
  } catch {
    /* 拦截层已 toast */
  } finally {
    working.value = false;
  }
}

/* ---------- btnCZ（重组样） ---------- */
async function onCz() {
  const row = needRow("请选择取样批次后重组");
  if (!row) return;
  if (String(row.cSameTestNo ?? "").includes("CZ")) {
    toast("已是重组样，不允许操作", 2000, "warn");
    return;
  }
  const res = await askValue(`${row.cSameTestNo}重组样`, "取样母板数量", "number", { num: 2 });
  if (!res) return;
  const czNum = Math.trunc(Number(res.num) || 0);
  working.value = true;
  try {
    const rlt = await qZ5000Api.addReSamplePlan({
      testNo: row.cSameTestNo ?? undefined,
      czNum: czNum < 1 ? 1 : czNum,
    });
    if (rlt?.success === true) {
      toast("重组成功", 2000, "success");
      await loadData();
      return;
    }
    toast(`重组失败\n${rlt?.message ?? ""}`, 3000, "error");
  } catch {
    /* 拦截层已 toast */
  } finally {
    working.value = false;
  }
}

/* ---------- btnDelCZ（取消重组样） ---------- */
async function onDelCz() {
  const row = needRow("请选择取消重组的批次");
  if (!row) return;
  if (!String(row.cSameTestNo ?? "").includes("CZ")) {
    toast("不是重组样，不允许操作", 2000, "warn");
    return;
  }
  if (isY(row.cSendStatus)) {
    toast("已发送检验任务，不允许操作", 2000, "warn");
    return;
  }
  if (isY(row.isQY)) {
    toast("已取样，不允许操作", 2000, "warn");
    return;
  }
  if (!(await askConfirm(`确定取消重组样${row.cSameTestNo}`))) return;
  working.value = true;
  try {
    await qZ5000Api.removeReSamplePlan(row.cSameTestNo ?? undefined);
    await loadData();
  } catch {
    /* 拦截层已 toast */
  } finally {
    working.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1 8 项，生产时间为 UCTimeRange） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">生产时间</label>
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

    <!-- stackPanel1：8 个按钮（原 Controls.Add 顺序）+ 右侧 labelControl1 统计 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button
        v-if="isSystemUser"
        variant="outlined"
        class="shrink-0 whitespace-nowrap"
        :loading="working"
        @click="onTest"
      >
        <IconFlask class="h-3 w-3" />查询取样板
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
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="working" @click="onNewAdd">
        <IconStar class="h-3 w-3" />生成新代表样
      </Button>
      <Button
        variant="outlined"
        severity="danger"
        class="shrink-0 whitespace-nowrap"
        :loading="working"
        @click="onCancelAdd"
      >
        <IconX class="h-3 w-3" />取消新代表样号
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="working" @click="onCz">
        <IconTransform class="h-3 w-3" />重组样
      </Button>
      <Button
        variant="outlined"
        severity="danger"
        class="shrink-0 whitespace-nowrap"
        :loading="working"
        @click="onDelCz"
      >
        <IconArrowBackUp class="h-3 w-3" />取消重组样
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
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        :pagination="false"
        :animate-rows="false"
        :loading="working"
        @grid-ready="onReady"
        @selection-changed="onSelectionChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <!-- 原 gvPlanDetail 表脚 CustomSummary（CSameTestNo 去重计数） -->
    <div class="flex h-7 shrink-0 items-center gap-2 border-t border-border/60 px-3">
      <span class="text-xs text-muted-foreground">取样批次={{ batchCount }}</span>
    </div>

    <!-- 单字段录入（原 FrmConfirmValueDialog） -->
    <Dialog
      :visible="vdlg.open"
      modal
      :header="vdlg.title"
      :style="{ width: 'min(28rem, calc(100vw - 2rem))' }"
      @update:visible="vdlgVisible"
    >
      <div class="flex flex-col gap-2">
        <label class="text-xs text-muted-foreground">{{ vdlg.label }}</label>
        <InputText v-if="vdlg.mode === 'text'" v-model="vdlg.text" autofocus class="w-full" @keyup.enter="vdlgOk" />
        <DatePicker
          v-else-if="vdlg.mode === 'time'"
          v-model="vdlg.time"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          autofocus
          class="w-full"
          placeholder="取样时间"
        />
        <InputNumber v-else v-model="vdlg.num" :min="1" :show-buttons="false" autofocus fluid class="w-full" />
      </div>
      <template #footer>
        <Button label="取消" variant="outlined" @click="vdlgCancel" />
        <Button label="确定" variant="outlined" @click="vdlgOk" />
      </template>
    </Dialog>

    <!-- 确认（原 MsgBox.ShowYesNo） -->
    <Dialog
      :visible="cdlg.open"
      modal
      header="确认"
      :style="{ width: 'min(32rem, calc(100vw - 2rem))' }"
      @update:visible="
        cdlg.open = $event;
        $event || cdlgDone(false);
      "
    >
      <p class="text-xs whitespace-pre-wrap">{{ cdlg.msg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="cdlgDone(false)" />
        <Button label="确定" variant="outlined" autofocus @click="cdlgDone(true)" />
      </template>
    </Dialog>

    <!-- ShowMsg（btnTest 调试输出） -->
    <Dialog
      :visible="msgOpen"
      modal
      header="查询取样板"
      :style="{ width: 'min(46rem, calc(100vw - 2rem))' }"
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
/* 原 FormatRules：绿底（已取样）、深青底（取样板标记）、青色底（已轧制） */
:deep(.qy-mark) {
  background-color: rgba(0, 128, 0, 0.28) !important;
}
:deep(.qy-dark) {
  background-color: rgba(0, 139, 139, 0.55) !important;
  font-weight: 700;
}
:deep(.qy-rolled) {
  background-color: rgba(128, 255, 255, 0.55) !important;
  font-weight: 700;
}
:deep(.qy-bold) {
  font-weight: 700;
}
</style>
