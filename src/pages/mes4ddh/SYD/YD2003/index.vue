<script setup lang="ts">
/** 对应 FrmYD2003（库内材料管理；子类覆盖 InitSlabTransferColumns）：DDH.Winforms.SYD.Forms.FrmYD2003
 *  菜单（1 个，cQueryString={StoreCodes,Actions,CTarStoreCodes}）：炼钢一厂库业务管理>库内材料管理 YD2000
 *  已接入（原 FrmYD2000 基类事件）：tyd2000Api.queryStorage（查询，必选库区）
 *          + cPStorageApi.xnfh（成品出库，文案「是否确认出库选中的材料？」）
 *          + storageApi.outStorage + tyd2000Api.setStackNum（退库，[在库]校验）
 *          + tyd2000Api.addProRemark（添加生产备注，内联 prompt 复刻 MemoEdit 对话框）
 *          + tyd2000Api.setStackNum（更新层号）/ setTypes（更新分类）/ zh（手工照核）
 *  待接入（二级弹窗，按 skill 默认占位）：倒垛 FrmYD2000DD、转库 FrmYD2000ZK、图形化倒垛 FrmKanban(→kanBanRKDD)、
 *          创建调拨单/成品入库/成品退库 FrmYD2000DB / FrmYD2000CP、质保书三件 FrmYD2000ZBS、
 *          指定钢板分类 FrmYD2000Type、标签打印（XtraReport 模板 + AddPrintLog）
 *  按钮显隐：按菜单 cQueryString.Actions 白名单（原 SetQueryString：不在名单里的按钮隐藏）
 *  列集偏差：原 InitSlabTransferColumns 只显示调拨相关子集，web 侧按 UCStorage 全量 127 列呈现（可右键列面板收起），
 *          列集变体待 UCStorage.Init* 列清单补提取后收口
 *  布局：查询区(13条件) → 工具栏(stackPanel1，18 按钮按 Actions 过滤) → UCStorage 共享库存表 */
import { computed, onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import {
  IconArrowBackUp,
  IconBox,
  IconDeviceFloppy,
  IconFileExport,
  IconFileImport,
  IconGridDots,
  IconPackage,
  IconPencil,
  IconPlus,
  IconPrinter,
  IconRefresh,
  IconSearch,
  IconStack2,
  IconTag,
  IconTypography,
  IconX,
} from "@tabler/icons-vue";
import type { GridApi } from "ag-grid-community";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  cPStorageApi,
  InventoryStatusEnum,
  StorageInOutTypeEnum,
  storageApi,
  tyd1000Api,
  tyd2000Api,
  type StorageInOutDto,
  type StoragePosition,
  type StorageInputDto,
  type TimeRange,
  type Tyd1000,
  type Tyd2000Dto,
} from "@/api/mes4ddh/syd.swagger";
import UcStorageGrid from "../_uc/UcStorageGrid.vue";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const { raw: menuQs, json: qsJson } = useMenuQuery();

interface QueryDto {
  StoreCodes?: string[];
  Actions?: string[];
  CTarStoreCodes?: string[];
}
const menu = computed<QueryDto>(() => ({
  StoreCodes: Array.isArray(qsJson.StoreCodes) ? (qsJson.StoreCodes as string[]) : [],
  Actions: Array.isArray(qsJson.Actions) ? (qsJson.Actions as string[]) : [],
  CTarStoreCodes: Array.isArray(qsJson.CTarStoreCodes) ? (qsJson.CTarStoreCodes as string[]) : [],
}));

/* 按钮白名单（原 SetQueryString：不在 Actions 里的按钮隐藏） */
function allowed(name: string): boolean {
  return menu.value.Actions?.includes(name) ?? false;
}
const V = computed(() => ({
  query: true, // btnQuery 恒显（原未参与隐藏循环里的显式逻辑外，查询总是可用）
  stack: allowed("btnStack"),
  type: allowed("btnType"),
  dd: allowed("btnDD"),
  zk: allowed("btnZK"),
  dd2: allowed("btnDD2"),
  db: allowed("btnDB"),
  addCPK: allowed("btnAddCPK"),
  addTK: allowed("btnAddTK"),
  ck: allowed("btnCk"),
  addRemark: allowed("btnAddRemark"),
  tk: allowed("btnTK"),
  zh: allowed("btnZh"),
  zbs: allowed("btnZBS"),
  zbsTs: allowed("btnZBSTs"),
  zbsGc: allowed("btnZBSGc"),
  setType: allowed("btnSetType"),
  label: allowed("btnLabel"),
}));

function defaultRange(): [Date, Date] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1);
  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setHours(23, 59, 59, 0);
  return [start, end];
}

const q = reactive({
  cStoreCode: menu.value.StoreCodes?.length === 1 ? menu.value.StoreCodes[0]! : "",
  cBatchNo: "",
  cStackNo: "",
  cStove: "",
  cPieceNoSlab: "",
  cOrderNo: "",
  cSgCode: "",
  cSgStd: "",
  cSteelType: "",
  cDelivyStatusCode: "",
  customerName: "",
  cInboundNo: "",
  cPieceNo: "",
  thickRange: [null, null] as (string | null)[],
  wthRange: [null, null] as (string | null)[],
  lenRange: [null, null] as (string | null)[],
  proDates: defaultRange() as Date[] | null,
});

const storeOptions = ref<{ label: string; value: string }[]>([]);
const rows = ref<Tyd2000Dto[]>([]);
const querying = ref(false);
const api = ref<GridApi | null>(null);

function onReady(a: GridApi) {
  api.value = a;
}

function selectedRows(): Tyd2000Dto[] {
  const byGrid = (api.value?.getSelectedRows() ?? []) as Tyd2000Dto[];
  if (byGrid.length) return byGrid;
  return rows.value.filter((x) => x.selected);
}
function focusRow(): Tyd2000Dto | null {
  return (api.value?.getSelectedNodes()[0]?.data as Tyd2000Dto | undefined) ?? null;
}
function decimalRange(pair: (string | null)[]) {
  const min = pair[0] != null && pair[0] !== "" ? Number(pair[0]) : null;
  const max = pair[1] != null && pair[1] !== "" ? Number(pair[1]) : null;
  if (min == null && max == null) return undefined;
  return { min: min ?? undefined, max: max ?? undefined };
}
function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function loadStores() {
  try {
    const list = ((await tyd1000Api.queryRoom("")) ?? []) as Tyd1000[];
    let opts = list
      .filter((x) => x.cStoreCode != null)
      .map((x) => ({ label: x.cStoreDes ?? x.cStoreCode ?? "", value: x.cStoreCode! }));
    if (menu.value.StoreCodes?.length) opts = opts.filter((o) => menu.value.StoreCodes!.includes(o.value));
    storeOptions.value = opts;
    if (menu.value.StoreCodes?.length === 1) q.cStoreCode = menu.value.StoreCodes[0]!;
  } catch {
    /* 拦截层已 toast */
  }
}

function buildInput(): StorageInputDto {
  return {
    storeCodeRange: menu.value.StoreCodes?.length ? menu.value.StoreCodes : undefined,
    cStoreCode: q.cStoreCode || null,
    cBatchNo: q.cBatchNo || null,
    cStackNo: q.cStackNo || null,
    cStove: q.cStove || null,
    cPieceNoSlab: q.cPieceNoSlab || null,
    cOrderNo: q.cOrderNo || null,
    cSgCode: q.cSgCode || null,
    cSgStd: q.cSgStd || null,
    nThick: decimalRange(q.thickRange),
    nWth: decimalRange(q.wthRange),
    nLen: decimalRange(q.lenRange),
    dProTime:
      q.proDates?.[0] && q.proDates?.[1]
        ? ({ min: isoDate(q.proDates[0]), max: isoDate(q.proDates[1]) } as TimeRange)
        : undefined,
    cSteelType: q.cSteelType || null,
    cDelivyStatusCode: q.cDelivyStatusCode || null,
    customerName: q.customerName || null,
    cInboundNo: q.cInboundNo || null,
    cPieceNo: q.cPieceNo || null,
  };
}

/* btnQuery → QueryStorage（原：库区必填） */
async function onQuery() {
  if (!q.cStoreCode) {
    toast("请选择库区", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    rows.value = ((await tyd2000Api.queryStorage(buildInput())) ?? []) as Tyd2000Dto[];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
    if (!rows.value.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function requireSelectedSameStore(): Tyd2000Dto[] | null {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择后再操作", 2000, "warn");
    return null;
  }
  if (new Set(selected.map((w) => w.cStoreCode)).size > 1) {
    toast("请选择同一库区的数据进行操作", 2500, "warn");
    return null;
  }
  return selected;
}

/* btnCk 成品出库 → Xnfh */
async function onCk() {
  const selected = requireSelectedSameStore();
  if (!selected) return;
  if (selected.some((l) => l.nStatus !== InventoryStatusEnum.Normal)) {
    toast("请选择在库材料操作！", 2500, "warn");
    return;
  }
  if (!window.confirm("是否确认出库选中的材料？")) return;
  querying.value = true;
  try {
    await cPStorageApi.xnfh(selected.map((x) => x.id!).filter(Boolean));
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnTK 退库 → OutStorage(TKCK) + SetStackNum */
async function onTk() {
  const selected = selectedRows().filter((w) => w.nStatus === InventoryStatusEnum.Normal);
  if (!selected.length) {
    toast("请选择[在库]的材料再操作", 2500, "warn");
    return;
  }
  const pieceNos = selected.map((l) => l.cPieceNo!).filter(Boolean);
  if (!window.confirm(`确认退库?数量${selected.length}?${"\n"}${pieceNos.join("\n")}`)) return;
  querying.value = true;
  try {
    const dto: StorageInOutDto = {
      cStoreCode: q.cStoreCode || null,
      inOutTime: new Date().toISOString(),
      inOutTypeEnum: StorageInOutTypeEnum.TKCK,
      pieceNos,
    };
    await storageApi.outStorage(dto);
    const positions: StoragePosition[] = [
      ...new Map(selected.map((l) => [`${l.cStoreCode}|${l.cStackNo}`, l])).values(),
    ].map((l) => ({ cStore: l.cStoreCode ?? null, cStackNo: l.cStackNo ?? null }));
    await tyd2000Api.setStackNum(positions);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnAddRemark 添加生产备注 → AddProRemark（内联 prompt 复刻 MemoEdit 对话框） */
async function onAddRemark() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择后再操作", 2000, "warn");
    return;
  }
  const old = [...new Set(selected.map((w) => w.cProRemark).filter((r) => r))].join(";");
  const text = window.prompt(`正在修改${selected.length}件材料的生产备注`, old ? old + ";" : "");
  if (text == null) return;
  querying.value = true;
  try {
    await tyd2000Api.addProRemark(
      selected.map((l) => ({
        id: l.id,
        cPieceNo: l.cPieceNo,
        cProRemark: text,
      })) as never,
    );
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnStack 更新层号 → SetStackNum */
async function onStack() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择材料再操作", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    const positions: StoragePosition[] = [
      ...new Map(selected.map((w) => [`${w.cStoreCode}|${w.cStackNo}`, w])).values(),
    ].map((w) => ({ cStore: w.cStoreCode ?? null, cStackNo: w.cStackNo ?? null }));
    await tyd2000Api.setStackNum(positions);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnType 更新分类 → SetTypes */
async function onType() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择材料再操作", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    await tyd2000Api.setTypes(selected.map((x) => x.cPieceNo!).filter(Boolean));
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnZh 手工照核 → Zh */
async function onZh() {
  const selected = selectedRows().filter((w) => w.nStatus === InventoryStatusEnum.Normal);
  if (!selected.length) {
    toast("请选择[在库]的材料再操作", 2500, "warn");
    return;
  }
  if (!window.confirm(`是否确认手工照核勾选的${selected.length}条材料？`)) return;
  querying.value = true;
  try {
    await tyd2000Api.zh(selected.map((x) => x.cPieceNo!).filter(Boolean));
    toast("照核成功！", 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* ---------- 二级弹窗占位（原 ShowDialog，按 skill 默认占位） ---------- */
function placeholder(name: string) {
  toast(`${name}（二级弹窗）待接入`, 2500, "warn");
}

function onDD() {
  const s = requireSelectedSameStore();
  if (!s) return;
  placeholder("倒垛 FrmYD2000DD");
}
function onZk() {
  const s = requireSelectedSameStore();
  if (!s) return;
  placeholder("转库 FrmYD2000ZK");
}
function onDd2() {
  const s = requireSelectedSameStore();
  if (!s) return;
  placeholder("图形化倒垛 FrmKanban → kanBanRKDD");
}
function onDB() {
  const s = requireSelectedSameStore();
  if (!s) return;
  placeholder("创建调拨单 FrmYD2000DB");
}
function onAddCpk() {
  const s = requireSelectedSameStore();
  if (!s) return;
  if (s.some((l) => l.nStatus !== InventoryStatusEnum.NotIn)) {
    toast("材料已入库，不允许重复操作", 2500, "warn");
    return;
  }
  placeholder("成品入库 FrmYD2000CP");
}
function onAddTk() {
  const s = requireSelectedSameStore();
  if (!s) return;
  if (s.some((l) => l.nStatus !== InventoryStatusEnum.Normal)) {
    toast("材料不在库，不允许操作", 2500, "warn");
    return;
  }
  if (!q.cStoreCode) {
    toast("请选择库区", 2000, "warn");
    return;
  }
  placeholder("成品退库 FrmYD2000CP");
}
function zbsGuard(): Tyd2000Dto[] | null {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择材料再操作", 2000, "warn");
    return null;
  }
  if (new Set(selected.map((x) => x.cCusName)).size > 1) {
    toast("请选择同一个客户操作！", 2500, "warn");
    return null;
  }
  if (new Set(selected.map((x) => x.cSgStd)).size > 1) {
    toast("请选择同一个标准的材料操作！", 2500, "warn");
    return null;
  }
  if (new Set(selected.map((x) => x.cSgCode)).size > 1) {
    toast("请选择同一个钢种的材料操作！", 2500, "warn");
    return null;
  }
  return selected;
}
function onZbs() {
  if (!zbsGuard()) return;
  placeholder("标准质保书 FrmYD2000ZBS(0)");
}
function onZbsTs() {
  if (!zbsGuard()) return;
  placeholder("探伤质保书 FrmYD2000ZBS(1)");
}
function onZbsGc() {
  if (!zbsGuard()) return;
  placeholder("公差质保书 FrmYD2000ZBS(2)");
}
function onSetType() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请勾选后再操作", 2500, "warn");
    return;
  }
  placeholder("指定钢板分类 FrmYD2000Type");
}
function onLabel() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择材料再操作", 2000, "warn");
    return;
  }
  if (new Set(selected.map((x) => x.cLineCode)).size > 1) {
    toast("请选择同一条产线库存操作", 2500, "warn");
    return;
  }
  placeholder("标签打印（XtraReport 模板 + AddPrintLog）");
}

onMounted(() => {
  void loadStores().then(() => {
    if (q.cStoreCode) void onQuery();
  });
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl1：13 条件） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">库区</label>
        <Select
          v-model="q.cStoreCode"
          :options="storeOptions"
          option-label="label"
          option-value="value"
          show-clear
          filter
          placeholder="选择库区"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="q.cBatchNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">垛位号</label>
        <InputText v-model="q.cStackNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="q.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="q.cPieceNoSlab" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
        <InputText v-model="q.cInboundNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="q.cOrderNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="q.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="q.cSgStd" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢类</label>
        <InputText v-model="q.cSteelType" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">交货状态</label>
        <InputText v-model="q.cDelivyStatusCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">客户名称</label>
        <InputText v-model="q.customerName" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">产出时间</label>
        <DatePicker
          v-model="q.proDates"
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1：18 按钮，按菜单 Actions 白名单显隐） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button v-if="V.stack" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onStack">
        <IconStack2 class="h-3 w-3" />更新层号
      </Button>
      <Button v-if="V.type" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onType">
        <IconTypography class="h-3 w-3" />更新分类
      </Button>
      <Button v-if="V.dd" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDD">
        <IconGridDots class="h-3 w-3" />倒垛
      </Button>
      <Button v-if="V.zk" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onZk">
        <IconArrowBackUp class="h-3 w-3" />转库
      </Button>
      <Button v-if="V.dd2" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDd2">
        <IconGridDots class="h-3 w-3" />图形化倒垛
      </Button>
      <Button v-if="V.db" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDB">
        <IconFileExport class="h-3 w-3" />创建调拨单
      </Button>
      <Button v-if="V.addCPK" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddCpk">
        <IconPackage class="h-3 w-3" />成品入库
      </Button>
      <Button v-if="V.addTK" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddTk">
        <IconBox class="h-3 w-3" />成品退库
      </Button>
      <Button v-if="V.ck" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCk">
        <IconFileImport class="h-3 w-3" />成品出库
      </Button>
      <Button v-if="V.addRemark" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddRemark">
        <IconPencil class="h-3 w-3" />添加生产备注
      </Button>
      <Button v-if="V.tk" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onTk">
        <IconArrowBackUp class="h-3 w-3" />退库
      </Button>
      <Button v-if="V.zh" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onZh">
        <IconDeviceFloppy class="h-3 w-3" />手工照核
      </Button>
      <Button v-if="V.zbs" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onZbs">标准质保书</Button>
      <Button v-if="V.zbsTs" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onZbsTs">探伤质保书</Button>
      <Button v-if="V.zbsGc" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onZbsGc">公差质保书</Button>
      <Button v-if="V.setType" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSetType">
        <IconTypography class="h-3 w-3" />指定钢板分类
      </Button>
      <Button v-if="V.label" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onLabel">
        <IconTag class="h-3 w-3" />标签打印
      </Button>
      <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ rows.length }} 行</span>
      <Button variant="outlined" class="ml-1 shrink-0 whitespace-nowrap" aria-label="刷新" @click="onQuery">
        <IconRefresh class="h-3 w-3" />
      </Button>
    </div>

    <!-- UCStorage 共享库存表 -->
    <UcStorageGrid :rows="rows" :loading="querying" @ready="onReady" />
  </div>
</template>
