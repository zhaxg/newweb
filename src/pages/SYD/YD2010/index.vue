<script setup lang="ts">
/** 对应 FrmYD2010（下线入库，11 个菜单共用 cQueryString={CLineCode,CStoreCode,NProType,CMachineCode,CTarStoreCodes}）：
 *  DDH.Winforms.SYD.Forms.FrmYD2010
 *  已接入：tyd2000Api.queryNotInStorage（查询）+ addProRemark（添加生产备注）
 *          + storageApi.outStorage + tyd2000Api.setStackNum（退库，含原状态校验与提示）
 *          + tms3000Api.delSjByPieceNo（删除坯料）/ setException / cancelException（标记/取消异常坯）
 *          + tms9001Api.cancelMathPlanAndZp（取消匹配订单，swagger 新建 sms 域）
 *  待接入：① 入库 → FrmYD2010RK / FrmYD2010RKTransfer（二级弹窗，按产线分流）
 *          ② 图形化入库 → FrmKanban + tyd2000Api.kanBanRKDDNew1（二级弹窗，占位）
 *          ③ 板坯导入入库 → 原 ImportDataHelper Excel 导入（web 无 xlsx 设施）
 *          ④ 坯料补录 → FrmMS9003；坯料修改 → FrmMS9002；创建调拨单 → FrmYD2000DB（二级弹窗，占位）
 *  按钮显隐：按菜单参数 NProType 分流（P=板坯/R=棒材/C=成品），原 Load 里对 R/C 隐藏图形化/导入/补录/匹配/删除/修改等
 *  布局：查询区(dataLayoutControl1：产出时间/炉号/件次号/库存状态/入口材料号)
 *        → 工具栏(stackPanel2：13 按钮) → UCStorage 共享库存表(127列) */
import { computed, onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import {
  IconArrowBackUp, IconBox, IconCubeUnfolded, IconEraser, IconFileImport, IconGridDots,
  IconPencil, IconPlus, IconRefresh, IconSearch, IconStack2, IconTriangleInverted, IconX,
} from "@tabler/icons-vue";
import type { GridApi } from "ag-grid-community";
import { useMenuQuery } from "@/lib/menuQuery";
import { systemKeyValueApi } from "@/api/admin/request";
import {
  InventoryStatusEnum, NProTypeEnum, StorageInOutTypeEnum,
  tyd2000Api, tyd1000Api,
  type QueryNotInStorageDto, type StorageInOutDto, type StoragePosition, type TimeRange, type Tyd1000, type Tyd2000Dto,
} from "@/api/mes4ddh/syd.swagger";
import { storageApi } from "@/api/mes4ddh/syd.swagger";
import { tms3000Api, tms9001Api } from "@/api/mes4ddh/sms.swagger";
import UcStorageGrid from "../_uc/UcStorageGrid.vue";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const { raw: menuQs, json: qsJson } = useMenuQuery();

interface Params {
  CLineCode?: string;
  CStoreCode?: string;
  NProType?: number;
  CMachineCode?: string;
  CTarStoreCodes?: string[];
}
const param = computed<Params>(() => {
  const raw = menuQs;
  if (raw.startsWith("{")) {
    try {
      const o = JSON.parse(raw) as Params;
      return {
        CLineCode: typeof o.CLineCode === "string" ? o.CLineCode : undefined,
        CStoreCode: typeof o.CStoreCode === "string" ? o.CStoreCode : undefined,
        NProType: typeof o.NProType === "number" ? o.NProType : undefined,
        CMachineCode: typeof o.CMachineCode === "string" ? o.CMachineCode : undefined,
        CTarStoreCodes: Array.isArray(o.CTarStoreCodes) ? o.CTarStoreCodes : [],
      };
    } catch { /* 坏 JSON 按空处理 */ }
  }
  return {};
});

/* 原 Load：NProType 分流的按钮显隐 */
const nProType = computed(() => param.value.NProType);
const isSlab = computed(() => nProType.value === NProTypeEnum.P);
const isPlate = computed(() => nProType.value === NProTypeEnum.R);
const isP4 = computed(() => nProType.value === NProTypeEnum.C);
/* R/C 分类隐藏（原 Load） */
const hideForPlate = computed(() => isPlate.value || isP4.value);
const hideDB = computed(() => isP4.value);

const STATUS_OPTIONS = [
  { label: "待入库", value: InventoryStatusEnum.NotIn },
  { label: "在库", value: InventoryStatusEnum.Normal },
  { label: "锁定", value: InventoryStatusEnum.Locked },
  { label: "消耗锁定", value: InventoryStatusEnum.ConsumeLocked },
  { label: "在制", value: InventoryStatusEnum.Ing },
  { label: "装车", value: InventoryStatusEnum.ZC },
  { label: "消耗", value: InventoryStatusEnum.Consume },
  { label: "出库", value: InventoryStatusEnum.Out },
];

function defaultRange(): [Date, Date] {
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 1);
  const end = new Date(); end.setDate(end.getDate() + 1); end.setHours(23, 59, 59, 0);
  return [start, end];
}

const q = reactive({
  proDates: defaultRange() as Date[] | null,
  cStove: "",
  cPieceNo: "",
  cPieceNoSlab: "",
  nStatus: InventoryStatusEnum.NotIn as number | null,
});

const rows = ref<Tyd2000Dto[]>([]);
const querying = ref(false);
const api = ref<GridApi | null>(null);
const exceptionOptions = ref<{ label: string; value: string }[]>([]);

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

function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/* btnQuery → QueryNotInStorage */
async function onQuery() {
  if (!param.value.CStoreCode) {
    toast("界面参数注入错误,{ITEM1:产线，ITEM2:库区,ITEM3:库存分类,ITEM4:铸机编码}", 3000, "warn");
    return;
  }
  querying.value = true;
  try {
    const input: QueryNotInStorageDto = {
      dProTime: q.proDates?.[0] && q.proDates?.[1]
        ? { min: isoDate(q.proDates[0]), max: isoDate(q.proDates[1]) } as TimeRange
        : undefined,
      cStove: q.cStove.trim() || null,
      cPieceNo: q.cPieceNo.trim() || null,
      cPieceNoSlab: q.cPieceNoSlab.trim() || null,
      nProType: param.value.NProType ?? null,
      nStatus: q.nStatus ?? null,
      cLineCode: param.value.CLineCode ?? null,
      cStoreCode: param.value.CStoreCode ?? null,
    };
    rows.value = ((await tyd2000Api.queryNotInStorage(input)) ?? []) as Tyd2000Dto[];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
    if (!rows.value.length) toast("无符合条件的数据", 2000, "info");
  } catch { /* 拦截层已 toast */ } finally { querying.value = false; }
}

/* btnInStorage 入库 → FrmYD2010RK / FrmYD2010RKTransfer（按产线分流，占位） */
function onInStorage() {
  const selected = selectedRows().filter((w) => w.nStatus === InventoryStatusEnum.NotIn);
  if (!selected.length) { toast("请选择[待入库]的材料再操作", 2500, "warn"); return; }
  if (!param.value.CStoreCode) { toast("未设置入库库区，不能操作", 2500, "warn"); return; }
  const isLg1 = param.value.CLineCode === "LG01";
  toast(isLg1
    ? "转运入库弹窗（FrmYD2010RKTransfer）待接入"
    : "入库弹窗（FrmYD2010RK）待接入", 2500, "warn");
}

/* btnRk2 图形化入库 → FrmKanban + KanBanRKDDNew1（占位） */
function onRk2() {
  const selected = selectedRows().filter((w) => w.nStatus === InventoryStatusEnum.NotIn);
  if (!selected.length) { toast("请选择[待入库]的材料再操作", 2500, "warn"); return; }
  if (!param.value.CStoreCode) { toast("未设置入库库区，不能操作", 2500, "warn"); return; }
  toast("图形化入库看板（FrmKanban → kanBanRKDDNew1）待接入", 2500, "warn");
}

/* btnTK 退库 → OutStorage(TKCK) + SetStackNum */
async function onTk() {
  const selected = selectedRows().filter((w) => w.nStatus === InventoryStatusEnum.Normal);
  if (!selected.length) { toast("请选择[在库]的材料再操作", 2500, "warn"); return; }
  const pieceNos = selected.map((l) => l.cPieceNo!).filter(Boolean);
  if (!window.confirm(`确认退库?${"\n"}库区${param.value.CStoreCode}${"\n"}数量${selected.length}?${"\n"}${pieceNos.join("\n")}`)) return;
  querying.value = true;
  try {
    const dto: StorageInOutDto = {
      cStoreCode: param.value.CStoreCode ?? null,
      inOutTime: new Date().toISOString(),
      inOutTypeEnum: StorageInOutTypeEnum.TKCK,
      pieceNos,
    };
    await storageApi.outStorage(dto);
    const positions: StoragePosition[] = [...new Map(
      selected.map((l) => [`${l.cStoreCode}|${l.cStackNo}`, l]),
    ).values()].map((l) => ({ cStore: param.value.CStoreCode ?? null, cStackNo: l.cStackNo ?? null }));
    await tyd2000Api.setStackNum(positions);
    await onQuery();
  } catch { /* 拦截层已 toast */ } finally { querying.value = false; }
}

/* simpleButton1 板坯导入入库 → 原 Excel 导入（web 无 xlsx 设施） */
function onImportSlab() {
  toast("板坯导入入库（原 Excel 导入，web 无 xlsx 解析设施）待接入", 2500, "warn");
}

/* btnSetException 标记异常 → KV 弹窗 + SetException（用 prompt 复刻 FrmConfirmValueDialog） */
async function onSetException() {
  const selected = selectedRows();
  if (selected.some((w) => w.nStatus !== InventoryStatusEnum.NotIn)) {
    toast("只能对[待入库]的坯料设置异常坯", 2500, "warn");
    return;
  }
  if (!selected.length) { toast("请先选择坯料", 2000, "warn"); return; }
  try {
    if (!exceptionOptions.value.length) {
      const list = (await systemKeyValueApi.querySysKvItemList("A0000:SLAB_EXCEPTION")) ?? [];
      exceptionOptions.value = list
        .filter((x) => x.cCode != null)
        .map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode! }));
    }
  } catch { /* 拦截层已 toast */ }
  const choices = exceptionOptions.value.map((o, i) => `${i + 1}. ${o.label}`).join("\n");
  const picked = window.prompt(`选择异常坯类型：\n${choices || "(字典为空)"}`);
  if (picked == null) return;
  const idx = Number(picked) - 1;
  const chosen = exceptionOptions.value[idx];
  if (!chosen) { toast("请选择异常坯类型后再确认", 2500, "warn"); return; }
  querying.value = true;
  try {
    await tms3000Api.setException({
      pieceNos: selected.map((l) => l.cPieceNo!).filter(Boolean),
      exceptionType: chosen.value,
    });
    await onQuery();
  } catch { /* 拦截层已 toast */ } finally { querying.value = false; }
}

/* btnSetCancelException 取消标记异常 → CancelException */
async function onCancelException() {
  const storages = selectedRows();
  if (!storages.length) { toast("请选择后再操作", 2000, "warn"); return; }
  if (storages.some((l) => l.cBilletTypeCode !== "Y")) { toast("请选择异常坯后再操作", 2500, "warn"); return; }
  if (storages.some((w) => w.nStatus !== InventoryStatusEnum.NotIn)) { toast("只能对[待入库]的坯料取消异常坯", 2500, "warn"); return; }
  if (storages.some((l) => l.cOrderNo)) { toast("已匹配订单，不允许操作", 2500, "warn"); return; }
  if (!window.confirm("确认取消？")) return;
  querying.value = true;
  try {
    await tms3000Api.cancelException({ pieceNos: storages.map((l) => l.cPieceNo!).filter(Boolean) });
    await onQuery();
  } catch { /* 拦截层已 toast */ } finally { querying.value = false; }
}

/* btnSLRK 坯料补录 → FrmMS9003（占位） */
function onSlrk() {
  const current = focusRow();
  if (!current) { toast("请选择任意要补录的炉次实绩信息", 2500, "warn"); return; }
  toast("坯料补录弹窗（FrmMS9003）待接入", 2500, "warn");
}

/* btnCancelOrder 取消匹配订单 → KV 原因 + CancelMathPlanAndZp */
async function onCancelOrder() {
  const storages = selectedRows().filter((w) => w.cOrderNo);
  if (!storages.length) { toast("请选择已匹配的材料", 2500, "warn"); return; }
  const error = [InventoryStatusEnum.ConsumeLocked, InventoryStatusEnum.Consume];
  if (storages.some((w) => error.includes(w.nStatus as InventoryStatusEnum))) {
    toast("已投料生产，不允许操作", 2500, "warn");
    return;
  }
  try {
    const list = (await systemKeyValueApi.querySysKvItemList("A0000:CANCEL_MATCH_REASON")) ?? [];
    const opts = list.filter((x) => x.cCode != null)
      .map((x) => ({ cCode: x.cCode!, cName: x.cName ?? x.cCode! }));
    const choices = opts.map((o, i) => `${i + 1}. ${o.cName}`).join("\n");
    const picked = window.prompt(`取消${storages.length}支,请选择取消原因：\n${choices || "(字典为空)"}`);
    if (picked == null) return;
    const chosen = opts[Number(picked) - 1];
    if (!chosen) { toast("请选择取消原因", 2500, "warn"); return; }
    querying.value = true;
    await tms9001Api.cancelMathPlanAndZp({
      cPieceNo: storages.map((w) => w.cPieceNo!).filter(Boolean).join(","),
    } as never);
    await onQuery();
  } catch { /* 拦截层已 toast */ } finally { querying.value = false; }
}

/* btnDeleteSJ 删除坯料 → DelSjByPieceNo */
async function onDeleteSJ() {
  const storages = selectedRows();
  if (!storages.length) { toast("请勾选要删除的材料", 2500, "warn"); return; }
  const error = [InventoryStatusEnum.ConsumeLocked, InventoryStatusEnum.Consume];
  if (storages.some((w) => error.includes(w.nStatus as InventoryStatusEnum))) { toast("已投料生产，不允许操作", 2500, "warn"); return; }
  if (storages.some((l) => l.cOrderNo)) { toast("已匹配订单，不允许操作", 2500, "warn"); return; }
  if (!window.confirm(`确认删除实绩？数量${storages.length}`)) return;
  querying.value = true;
  try {
    await tms3000Api.delSjByPieceNo(storages.map((w) => w.cPieceNo!).filter(Boolean));
    await onQuery();
  } catch { /* 拦截层已 toast */ } finally { querying.value = false; }
}

/* btnAddRemark 添加生产备注 → 内联 prompt 复刻 MemoEdit 对话框 + AddProRemark */
async function onAddRemark() {
  const selected = rows.value.filter((x) => x.selected);
  const fromGrid = (api.value?.getSelectedRows() ?? []) as Tyd2000Dto[];
  const use = fromGrid.length ? fromGrid : selected;
  if (!use.length) { toast("请选择后再操作", 2000, "warn"); return; }
  const oldRemark = [...new Set(use.map((w) => w.cProRemark).filter((r) => r))].join(";");
  const text = window.prompt(`正在修改${use.length}件材料的生产备注`, oldRemark ? oldRemark + ";" : "");
  if (text == null) return;
  querying.value = true;
  try {
    await tyd2000Api.addProRemark(use.map((l) => ({
      id: l.id, cPieceNo: l.cPieceNo, cProRemark: text,
    })) as never);
    await onQuery();
  } catch { /* 拦截层已 toast */ } finally { querying.value = false; }
}

/* btnUpdate 坯料修改 → FrmMS9002（占位） */
function onUpdate() {
  const current = focusRow();
  if (!current) { toast("请选择要修改的的材料", 2500, "warn"); return; }
  if (current.nStatus !== InventoryStatusEnum.NotIn && current.nStatus !== InventoryStatusEnum.Normal) {
    toast("库存状态错误，不允许修改", 2500, "warn");
    return;
  }
  if (current.cOrderNo) {
    if (!window.confirm("坯料已挂单，修改定尺后系统自动脱挂订单，确认继续操作？\r\n修改其他不受影响")) return;
  }
  toast("坯料修改弹窗（FrmMS9002）待接入", 2500, "warn");
}

/* btnDB 创建调拨单 → FrmYD2000DB（占位） */
function onDB() {
  const selected = selectedRows();
  if (!selected.length) { toast("请选择后再操作", 2000, "warn"); return; }
  if (new Set(selected.map((w) => w.cStoreCode)).size > 1) {
    toast("请选择同一库区的数据进行操作", 2500, "warn");
    return;
  }
  toast("创建调拨单弹窗（FrmYD2000DB）待接入", 2500, "warn");
}

onMounted(() => { void onQuery(); });
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl1：产出时间 / 炉号 / 件次号 / 库存状态 / 入口材料号） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">产出时间</label>
        <DatePicker v-model="q.proDates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="q.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">库存状态</label>
        <Select v-model="q.nStatus" :options="STATUS_OPTIONS" option-label="label" option-value="value" show-clear
          placeholder="全部" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">入口材料号</label>
        <InputText v-model="q.cPieceNoSlab" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel2，13 按钮；R/C 分类按原 Load 隐藏） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onInStorage">
        <IconBox class="h-3 w-3" />入库
      </Button>
      <Button v-if="!hideForPlate" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onRk2">
        <IconGridDots class="h-3 w-3" />图形化入库
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onTk">
        <IconArrowBackUp class="h-3 w-3" />退库
      </Button>
      <Button v-if="!hideForPlate" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onImportSlab">
        <IconFileImport class="h-3 w-3" />板坯导入入库
      </Button>
      <Button v-if="!hideForPlate" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSetException">
        <IconTriangleInverted class="h-3 w-3" />标记异常
      </Button>
      <Button v-if="!hideForPlate" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelException">
        <IconX class="h-3 w-3" />取消标记异常
      </Button>
      <Button v-if="!hideForPlate" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSlrk">
        <IconPlus class="h-3 w-3" />坯料补录
      </Button>
      <Button v-if="!hideForPlate" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelOrder">
        <IconEraser class="h-3 w-3" />取消匹配订单
      </Button>
      <Button v-if="!hideForPlate" variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteSJ">
        <IconX class="h-3 w-3" />删除坯料
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddRemark">
        <IconPencil class="h-3 w-3" />添加生产备注
      </Button>
      <Button v-if="!hideForPlate" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onUpdate">
        <IconCubeUnfolded class="h-3 w-3" />坯料修改
      </Button>
      <Button v-if="!hideDB" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDB">
        <IconStack2 class="h-3 w-3" />创建调拨单
      </Button>
      <span class="ml-auto shrink-0 text-xs text-muted-foreground">
        {{ rows.length }} 行<span v-if="isSlab"> · 板坯</span><span v-else-if="isPlate"> · 棒材</span><span v-else-if="isP4"> · 成品</span>
      </span>
      <Button variant="outlined" class="ml-1 shrink-0 whitespace-nowrap" aria-label="刷新" @click="onQuery">
        <IconRefresh class="h-3 w-3" />
      </Button>
    </div>

    <!-- UCStorage 共享库存表 -->
    <UcStorageGrid :rows="rows" :loading="querying" @ready="onReady" />
  </div>
</template>
