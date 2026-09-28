<script setup lang="ts">
/** 对应 FrmYD2000Record（出入库记录查询，多菜单共用 cQueryString=库区号）：DDH.Winforms.SYD.Forms.FrmYD2000Record
 *  已接入：storageRecordApi.querySlabReocrds（swagger 补，IStorageRecordService.QuerySlabReocrds
 *          → /dDH.Service.SYD.Services/storageRecord/querySlabReocrds）
 *          + tyd1000Api.queryRoom（库区下拉，原 kuqu1.ShowStoreCodes=[QueryString]）
 *          默认时间 = 昨天 ~ 今天（原 Load），库区默认取菜单参数
 *  待接入：右键「记录」弹出菜单（原 SetPopupMenuForRecord，按件次号，占位）
 *  布局：查询区(10条件) → 工具栏(查询) → 单表(SlabRecordViewItemDto 26可见 + 6 hide) */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import RangeInput from "@/components/common/RangeInput.vue";
import Select from "primevue/select";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  storageRecordApi,
  tyd1000Api,
  type QueryInOrOutInputDto,
  type SlabRecordViewItemDto,
  type Tyd1000,
} from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: menuQs } = useMenuQuery();

function defaultRange(): [Date, Date] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  end.setSeconds(end.getSeconds() - 1);
  return [start, end];
}

const colDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cBusinsStr", headerName: "出入库类型", width: 130 },
  { field: "dTime", headerName: "时间", width: 170 },
  { field: "cUser", headerName: "操作人", width: 110 },
  { field: "cStackNo", headerName: "垛位号", width: 110 },
  { field: "cStackNum", headerName: "层号", width: 80 },
  { field: "cStove", headerName: "炉号", width: 110 },
  { field: "cPieceNo", headerName: "头侧件次号", width: 150 },
  { field: "cSgCode", headerName: "钢种", width: 110 },
  { field: "nThick", headerName: "坯厚", width: 90 },
  { field: "nWth", headerName: "宽度", width: 90 },
  { field: "nLen", headerName: "坯长", width: 90 },
  { field: "nNum", headerName: "提货件数", width: 110 },
  { field: "nWgt", headerName: "坯重", width: 100 },
  { field: "nZzThick", headerName: "轧制厚度", width: 110 },
  { field: "cStoreCode", headerName: "库区号", width: 120 },
  { field: "cLineCode", headerName: "产线", width: 100 },
  { field: "cSpec", headerName: "规格", width: 130 },
  { field: "cOrderNo", headerName: "订单号", width: 150 },
  { field: "cSourceStoreCode", headerName: "原库区号", width: 120 },
  { field: "cSourceStackNo", headerName: "原垛位号", width: 120 },
  { field: "cSourceStackNum", headerName: "原层号", width: 100 },
  { field: "cSgStd", headerName: "执行标准", width: 130 },
  { field: "cType", headerName: "类型", width: 100 },
  { field: "cBusNo", headerName: "业务主键", width: 140 },
  { field: "cIsDisable", headerName: "作废标记", width: 100, flex: 1 },
  { field: "nProType", headerName: "库存类型", width: 100 },
  /* 隐藏列 */
  { field: "id", headerName: "主键", hide: true },
  { field: "nLenMin", headerName: "长度下限", hide: true },
  { field: "nLenMax", headerName: "长度上限", hide: true },
  { field: "nBusinsType", headerName: "业务类型", hide: true },
  { field: "cShiftNo", headerName: "结果录入班次", hide: true },
  { field: "cGroupNo", headerName: "结果录入班组", hide: true },
]);

const q = reactive({
  cStoreCode: menuQs || "",
  cStove: "",
  cPieceNo: "",
  cOrderNo: "",
  cSgCode: "",
  cSgStd: "",
  thickMin: null as number | null,
  thickMax: null as number | null,
  wthMin: null as number | null,
  wthMax: null as number | null,
  lenMin: null as number | null,
  lenMax: null as number | null,
  dates: defaultRange() as Date[] | null,
});

const storeOptions = ref<{ label: string; value: string }[]>([]);
const rows = ref<SlabRecordViewItemDto[]>([]);
const querying = ref(false);
const api = ref<GridApi | null>(null);

function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

/** 原 UCDecimalRange.Value → DecimalRange{min,max}；两端皆空则整条条件不传 */
function numRange(min: number | null, max: number | null) {
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

/* btnQuery → QuerySlabReocrds */
async function onQuery() {
  querying.value = true;
  try {
    const input: QueryInOrOutInputDto = {
      cStoreCode: q.cStoreCode || null,
      cStove: q.cStove || null,
      cPieceNo: q.cPieceNo || null,
      cOrderNo: q.cOrderNo || null,
      cSgCode: q.cSgCode || null,
      cSgStd: q.cSgStd || null,
      nThick: numRange(q.thickMin, q.thickMax),
      nWth: numRange(q.wthMin, q.wthMax),
      nLen: numRange(q.lenMin, q.lenMax),
      dTime: q.dates?.[0] && q.dates?.[1] ? { min: isoDate(q.dates[0]), max: isoDate(q.dates[1]) } : undefined,
    };
    const list = ((await storageRecordApi.querySlabReocrds(input)) ?? []) as SlabRecordViewItemDto[];
    rows.value = list;
    api.value?.setGridOption("rowData", list);
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
    if (!list.length) toast("无符合条件的数据", 2000, "info");
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
    <!-- 查询区（原 dataLayoutControl1：10 条件） -->
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="q.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">厚度</label>
        <RangeInput
          v-model:min="q.thickMin"
          v-model:max="q.thickMax"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">宽度</label>
        <RangeInput
          v-model:min="q.wthMin"
          v-model:max="q.wthMax"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">长度</label>
        <RangeInput
          v-model:min="q.lenMin"
          v-model:max="q.lenMax"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">出入库时间</label>
        <DatePicker
          v-model="q.dates"
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
      <div class="flex items-center">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>

    <!-- 单表（原 gridControl1 Dock.Fill） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :default-col-def="hmxDefaultColDef"
        :row-data="rows"
        :locale-text="AG_GRID_LOCALE_CN"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
