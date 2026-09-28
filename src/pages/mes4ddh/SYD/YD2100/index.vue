<script setup lang="ts">
/** 对应 FrmYD2100（已发货材料管理，菜单 cQueryString=ZG01-04）：DDH.Winforms.SYD.Forms.FrmYD2100
 *  已接入：tyd2000Api.queryStorage（默认 nStatus=Out 出库态，库区取菜单参数）
 *          + cPStorageApi.cancelXnfh（撤消成品出库，swagger 补；文案「是否确认撤消出库选中的材料？」）
 *          + tyd1000Api.queryRoom（库区下拉，原 kuqu1）
 *  待接入：无二级弹窗
 *  布局：查询区(13条件) → 工具栏(查询/撤消成品出库) → UCStorage 共享库存表(127列) */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconArrowBackUp, IconSearch } from "@tabler/icons-vue";
import type { GridApi } from "ag-grid-community";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  cPStorageApi,
  tyd1000Api,
  tyd2000Api,
  type StorageInputDto,
  type Tyd1000,
  type Tyd2000Dto,
} from "@/api/mes4ddh/syd.swagger";
import UcStorageGrid from "../_uc/UcStorageGrid.vue";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();

function defaultRange(): [Date, Date] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1);
  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);
  end.setSeconds(end.getSeconds() - 1);
  return [start, end];
}

const q = reactive({
  cStoreCode: menuQs || "",
  cBatchNo: "",
  cStackNo: "",
  cStove: "",
  cPieceNoSlab: "",
  cOrderNo: "",
  cSgCode: "",
  cSgStd: "",
  cSteelType: null as string | null,
  cDelivyStatusCode: null as string | null,
  customerName: "",
  cInboundNo: "",
  cPieceNo: "",
  thickRange: [null, null] as (string | null)[],
  wthRange: [null, null] as (string | null)[],
  lenRange: [null, null] as (string | null)[],
  proTime: defaultRange() as Date[] | null,
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
  return rows.value.filter((x) => (x as { selected?: boolean }).selected);
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
    storeOptions.value = list
      .filter((x) => x.cStoreCode != null)
      .map((x) => ({ label: x.cStoreDes ?? x.cStoreCode ?? "", value: x.cStoreCode! }));
  } catch {
    /* 拦截层已 toast */
  }
}

function buildInput(): StorageInputDto {
  return {
    storeCodeRange: menuQs ? [menuQs] : undefined,
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
    dProTime: q.proTime?.[0] && q.proTime?.[1] ? { min: isoDate(q.proTime[0]), max: isoDate(q.proTime[1]) } : undefined,
    cSteelType: q.cSteelType,
    cDelivyStatusCode: q.cDelivyStatusCode,
    customerName: q.customerName || null,
    cInboundNo: q.cInboundNo || null,
    cPieceNo: q.cPieceNo || null,
  };
}

/* btnQuery → QueryStorage（原固定 NStatus=Out） */
async function onQuery() {
  if (!q.cStoreCode) {
    toast("请选择库区", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    const list = ((await tyd2000Api.queryStorage(buildInput())) ?? []) as Tyd2000Dto[];
    rows.value = list;
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
    if (!list.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnCancelCk 撤消成品出库 → CancelXnfh */
async function onCancelCk() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择后再操作", 2000, "warn");
    return;
  }
  if (new Set(selected.map((x) => x.cStoreCode)).size > 1) {
    toast("请选择同一库区的数据进行操作", 2500, "warn");
    return;
  }
  if (!window.confirm("是否确认撤消出库选中的材料？")) return;
  querying.value = true;
  try {
    await cPStorageApi.cancelXnfh(selected.map((x) => x.cPieceNo!).filter(Boolean));
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

onMounted(() => {
  void loadStores().then(() => onQuery());
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
          v-model="q.proTime"
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

    <!-- 工具栏（原 stackPanel1：查询 / 撤消成品出库） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelCk">
        <IconArrowBackUp class="h-3 w-3" />撤消成品出库
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">已发货材料（{{ rows.length }}）</span>
    </div>

    <!-- UCStorage 共享库存表 -->
    <UcStorageGrid :rows="rows" :loading="querying" @ready="onReady" />
  </div>
</template>
