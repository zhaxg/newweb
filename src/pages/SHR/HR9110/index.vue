<script setup lang="ts">
/** 对应 FrmHR9110（定尺剪实绩）：DDH.Winforms.SHR.Forms.FrmHR9110
 *  已接入：hR4200Api.queryTiP48j031s / hR4000Api.addSj（手动同步：勾选行逐条下发剪切实绩）
 *  偏差：入口钢板号输入框原窗体未绑定查询条件（保留原样，不参与查询）；shift枚举列显示原值 */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconRefresh, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { hR4000Api, hR4200Api, type DtoQueryL2, type TiP48j031, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();

/* ---------- 时间（原 ucTimeRange，默认本月） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function monthRange(): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  last.setSeconds(last.getSeconds() - 1);
  return [first, last];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 查询条件（DtoQueryL2） ---------- */
const input = reactive({
  planNo: "",
  slabNo: "",
  plateNo: "",
  cBatchNo: "",
  inPlateNo: "",
  dates: monthRange() as Date[] | null,
});

/* ---------- 表格（gridView1 / TiP48j031，勾选=Selected 同步） ---------- */
const rows = shallowRef<TiP48j031[]>([]);
const loading = ref(false);
const syncing = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 150 },
  { colId: "inPlateNo", field: "inPlateNo", headerName: "入口钢板号", width: 150 },
  { colId: "tPlateNo", field: "tPlateNo", headerName: "头侧板号", width: 150 },
  { colId: "bestSurface", field: "bestSurface", headerName: "好面朝向", width: 150 },
  { colId: "dsTemp", field: "dsTemp", headerName: "剪切温度", width: 150 },
  { colId: "operatorId", field: "operatorId", headerName: "操作者", width: 150 },
  { colId: "slCode", field: "slCode", headerName: "剪切线代码", width: 150 },
  { colId: "dsTime", field: "dsTime", headerName: "CS剪切时间", width: 150 },
  { colId: "tPlateThk", field: "tPlateThk", headerName: "头侧板厚度", width: 150 },
  { colId: "tPlateWth", field: "tPlateWth", headerName: "头侧板宽度", width: 150 },
  { colId: "tPlateLth", field: "tPlateLth", headerName: "头侧板长度", width: 150 },
  { colId: "tPlateWgt", field: "tPlateWgt", headerName: "头侧板重量", width: 150 },
  { colId: "tOrdNum", field: "tOrdNum", headerName: "头侧合同数", width: 150 },
  { colId: "tPartMark", field: "tPartMark", headerName: "头侧取板记号", width: 150 },
  { colId: "tProductSum", field: "tProductSum", headerName: "头侧成品板总数", width: 150 },
  { colId: "tTdsLth", field: "tTdsLth", headerName: "头侧剪切长度(头部)", width: 150 },
  { colId: "tBdsLth", field: "tBdsLth", headerName: "头侧剪切长度(尾部)", width: 150 },
  { colId: "tLthMark", field: "tLthMark", headerName: "头侧是否余长标记", width: 150 },
  { colId: "bPlateNo", field: "bPlateNo", headerName: "尾侧板号", width: 150 },
  { colId: "bPlateThk", field: "bPlateThk", headerName: "尾侧板厚度", width: 150 },
  { colId: "bPlateWth", field: "bPlateWth", headerName: "尾侧板宽度", width: 150 },
  { colId: "bPlateLth", field: "bPlateLth", headerName: "尾侧板长度", width: 150 },
  { colId: "bPlateWgt", field: "bPlateWgt", headerName: "尾侧板重量", width: 150 },
  { colId: "bOrdNum", field: "bOrdNum", headerName: "尾侧合同数", width: 150 },
  { colId: "bPartMark", field: "bPartMark", headerName: "尾侧取板记号", width: 150 },
  { colId: "bProductSum", field: "bProductSum", headerName: "尾侧成品板总数", width: 150 },
  { colId: "bLthMark", field: "bLthMark", headerName: "尾侧是否余长标记", width: 150 },
  { colId: "reserved0", field: "reserved0", headerName: "头侧板成品毛长", width: 150 },
  { colId: "reserved1", field: "reserved1", headerName: "切边标记（2两切4四切）", width: 150 },
  { colId: "reserved2", field: "reserved2", headerName: "喷印完成标记", width: 150 },
  { colId: "reserved3", field: "reserved3", headerName: "预留3", width: 150 },
  { colId: "cropCutLenTop", field: "cropCutLenTop", headerName: "CROP", width: 150 },
  { colId: "cropCutLenBottom", field: "cropCutLenBottom", headerName: "CROP", width: 150 },
  { colId: "shiftNo", field: "shiftNo", headerName: "班次", width: 150 },
  { colId: "shiftGroup", field: "shiftGroup", headerName: "班组", width: 150 },
  { colId: "actMaxWth", field: "actMaxWth", headerName: "头侧宽度最大值（仪表)", width: 150 },
  { colId: "actMinWth", field: "actMinWth", headerName: "头侧宽度最小值（仪表)", width: 150 },
  { colId: "actAveWth", field: "actAveWth", headerName: "头侧宽度最平均值（仪表)", width: 150 },
  { colId: "dHandle", field: "dHandle", headerName: "处理时间", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "状态", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
];

async function query() {
  loading.value = true;
  try {
    const dto: DtoQueryL2 = {
      dRange: toTimeRange(input.dates),
      planNo: input.planNo.trim() || null,
      slabNo: input.slabNo.trim() || null,
      plateNo: input.plateNo.trim() || null,
      cBatchNo: input.cBatchNo.trim() || null,
    };
    rows.value = (await hR4200Api.queryTiP48j031s(dto)) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

/** 原 btnTb_Click：勾选行逐条 AddSj */
async function btnTb() {
  const selected = (api.value?.getSelectedRows() as TiP48j031[] | undefined) ?? [];
  if (rows.value.length === 0 || selected.length === 0) return;
  syncing.value = true;
  try {
    for (const item of selected) await hR4000Api.addSj(item);
    toast("同步成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    syncing.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">计划号</label>
        <InputText v-model="input.planNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.slabNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢板号</label>
        <InputText v-model="input.plateNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">入口钢板号</label>
        <InputText v-model="input.inPlateNo" class="min-w-0 flex-1" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">作业时间</label>
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
      <div class="col-span-3 flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="syncing" @click="btnTb">
          <IconRefresh class="h-3 w-3" />手动同步
        </Button>
      </div>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'multiRow', checkboxes: true }"
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
