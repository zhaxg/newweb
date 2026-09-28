<script setup lang="ts">
/** 对应 FrmTI1200（加热炉能耗实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1200
 *  已接入：tI1200Api.getL2me12s（查询）；systemKeyValueApi.querySysKvItemList（班次 A0000:SHIFT / 班组 A0000:GROUP 下拉运行时灌值，
 *          对应 Designer 里 comShiftNum/comShiftGroup 的 AccessibleName 约定）
 *  待接入：无
 *  偏差：默认时间范围照 C# Load 的 [今天-7天, 今天+1天]；原 Designer 声明了流量/压力/Spare1-15 等列但返回 DTO 无对应字段，
 *        按规则仍以 hide 收着（与原画面一致，值为空）；「发送时间范围」标签按 ui-rules 缩短为「发送时间」以整页统一 w-16。*/

import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Select from "primevue/select";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { systemKeyValueApi, type HmxKv } from "@/api/admin/request";
import { tI1200Api, type DtoTdaZb037Query, type Ti1200Dto } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const rows = shallowRef<Ti1200Dto[]>([]);
const loading = ref(false);
const gridApi = ref<GridApi | null>(null);

/* ---------- 时间（原 ucTimeRange1，默认 [今天-7, 今天+1]） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const now = new Date();
  const beg = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  beg.setDate(beg.getDate() - 7);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  end.setDate(end.getDate() + 1);
  return [beg, end];
}

/* ---------- 下拉候选（原 comShiftNum / comShiftGroup，运行时按 KV 组灌值） ---------- */
interface KvOption {
  label: string;
  value: string;
}
function toOptions(list: HmxKv[]): KvOption[] {
  return (list ?? []).map((k) => ({ label: k.cName ?? k.cCode ?? "", value: k.cCode ?? "" }));
}
const shiftOptions = ref<KvOption[]>([]);
const groupOptions = ref<KvOption[]>([]);
const input = reactive({
  shiftNum: null as string | null,
  teamGroup: null as string | null,
  dates: defaultRange() as Date[] | null,
});

/* ---------- 主表列（Ti1200Dto，隐藏列以 hide 收着） ---------- */
const colDefs = ref<ColDef[]>([
  { field: "time", headerName: "发送时刻", minWidth: 150 },
  { field: "gasConsumption1", headerName: "煤气累计消耗1", minWidth: 120 },
  { field: "gasConsumption2", headerName: "煤气累计消耗2", minWidth: 120 },
  { field: "n2Consumption1", headerName: "氮气累计消耗1", minWidth: 120 },
  { field: "n2Consumption2", headerName: "氮气累计消耗2", minWidth: 120 },
  { field: "steamConsumption1", headerName: "蒸汽累计消耗1", minWidth: 120 },
  { field: "steamConsumption2", headerName: "蒸汽累计消耗2", minWidth: 120 },
  { field: "shift", headerName: "班次", minWidth: 80 },
  { field: "turn", headerName: "班组", minWidth: 80 },
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "n2Flow1", headerName: "氮气流量1", hide: true },
  { field: "n2Pressure1", headerName: "氮气压力1", hide: true },
  { field: "gasFlow1", headerName: "煤气流量1", hide: true },
  { field: "gasPressure1", headerName: "煤气压力1", hide: true },
  { field: "steamFlow1", headerName: "蒸汽流量1", hide: true },
  { field: "steamPressure1", headerName: "蒸汽压力1", hide: true },
  { field: "n2Flow2", headerName: "氮气流量2", hide: true },
  { field: "n2Pressure2", headerName: "氮气压力2", hide: true },
  { field: "gasFlow2", headerName: "煤气流量2", hide: true },
  { field: "gasPressure2", headerName: "煤气压力2", hide: true },
  { field: "steamFlow2", headerName: "蒸汽流量2", hide: true },
  { field: "steamPressure2", headerName: "蒸汽压力2", hide: true },
  { field: "spare1", headerName: "预留", hide: true },
  { field: "spare2", headerName: "预留", hide: true },
  { field: "spare3", headerName: "预留（炉前称重）", hide: true },
  { field: "spare4", headerName: "照核长度", hide: true },
  { field: "spare5", headerName: "照核宽度", hide: true },
  { field: "spare6", headerName: "照核厚度", hide: true },
  { field: "spare7", headerName: "预留7", hide: true },
  { field: "spare8", headerName: "预留8", hide: true },
  { field: "spare9", headerName: "预留9", hide: true },
  { field: "spare10", headerName: "预留10", hide: true },
  { field: "spare11", headerName: "预留11", hide: true },
  { field: "spare12", headerName: "预留12", hide: true },
  { field: "spare13", headerName: "预留13", hide: true },
  { field: "spare14", headerName: "预留14", hide: true },
  { field: "spare15", headerName: "预留15", hide: true },
]);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

async function onQuery() {
  loading.value = true;
  try {
    const dates = input.dates;
    const dto: DtoTdaZb037Query = {
      timeRange:
        dates && dates.length >= 2 ? { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) } : undefined,
      shiftNum: input.shiftNum || null,
      teamGroup: input.teamGroup || null,
    };
    rows.value = (await tI1200Api.getL2me12s(dto)) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    const [shift, group] = await Promise.all([
      systemKeyValueApi.querySysKvItemList("A0000:SHIFT"),
      systemKeyValueApi.querySysKvItemList("A0000:GROUP"),
    ]);
    shiftOptions.value = toOptions(shift);
    groupOptions.value = toOptions(group);
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">班次</label>
        <Select
          v-model="input.shiftNum"
          :options="shiftOptions"
          option-label="label"
          option-value="value"
          :show-clear="true"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">班组</label>
        <Select
          v-model="input.teamGroup"
          :options="groupOptions"
          option-label="label"
          option-value="value"
          :show-clear="true"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">发送时间</label>
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
      <div class="flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onQuery">
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
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true }"
        :loading="loading"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
