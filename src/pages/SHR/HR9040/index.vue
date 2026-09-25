<script setup lang="ts">
/** 对应 FrmHR9040（预矫直实绩）：DDH.Winforms.SHR.Forms.FrmHR9040
 *  已接入：hR9000Api.queryTiL2me08s
 *  偏差：无 */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hR9000Api, type DtoQueryL2, type TiL2me08Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

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
  slabNo: "",
  cBatchOrder: "",
  dates: monthRange() as Date[] | null,
});

/* ---------- 表格（gridView1 / TiL2me08Dto） ---------- */
const rows = shallowRef<TiL2me08Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 150 },
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 150 },
  { colId: "totalPass", field: "totalPass", headerName: "矫直总次数", width: 150 },
  { colId: "cBilletTypeCode", field: "cBilletTypeCode", headerName: "铸坯标识", width: 150 },
  { colId: "currPass", field: "currPass", headerName: "矫直当前次数", width: 150 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 150 },
  { colId: "entryTime", field: "entryTime", headerName: "进入时间", width: 150 },
  { colId: "endTime", field: "endTime", headerName: "结束时间", width: 150 },
  { colId: "entryTemp", field: "entryTemp", headerName: "钢板温度", width: 150 },
  { colId: "levelerSpeed", field: "levelerSpeed", headerName: "矫直速度", width: 150 },
  { colId: "bitSpeed", field: "bitSpeed", headerName: "咬入速度", width: 150 },
  { colId: "entryGap", field: "entryGap", headerName: "入口辊缝", width: 150 },
  { colId: "exitGap", field: "exitGap", headerName: "出口辊缝", width: 150 },
  { colId: "entrySideRollGap", field: "entrySideRollGap", headerName: "入口边辊高度", width: 150 },
  { colId: "exitSideRollGap", field: "exitSideRollGap", headerName: "出口边辊高度", width: 150 },
  { colId: "tilt1", field: "tilt1", headerName: "倾斜量", width: 150 },
  { colId: "tilt2", field: "tilt2", headerName: "倾动量", width: 150 },
  { colId: "l2Force", field: "l2Force", headerName: "矫直力", width: 150 },
  { colId: "bendPosition", field: "bendPosition", headerName: "弯辊量", width: 150 },
  { colId: "torqueMotor", field: "torqueMotor", headerName: "扭矩", width: 150 },
  { colId: "emptyFlag", field: "emptyFlag", headerName: "是否空过", width: 150 },
  { colId: "spare", field: "spare", headerName: "预留", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },
];

async function query() {
  loading.value = true;
  try {
    const dto: DtoQueryL2 = {
      dRange: toTimeRange(input.dates),
      slabNo: input.slabNo.trim() || null,
      cBatchOrder: input.cBatchOrder.trim() || null,
    };
    rows.value = (await hR9000Api.queryTiL2me08s(dto)) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.slabNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批号</label>
        <InputText v-model="input.cBatchOrder" class="min-w-0 flex-1" @keydown.enter="query" />
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
      <div class="col-span-2 flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
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
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
