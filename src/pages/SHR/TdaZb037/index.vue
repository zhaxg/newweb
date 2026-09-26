<script setup lang="ts">
/** 对应 FrmTdaZb037（精益水能耗）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTdaZb037
 *  已接入：tdaZb037Api.queryTdaZb037；班次/班组下拉为原 ImageComboBoxEdit AccessibleName 的 KV 字典（A0000:SHIFT / A0000:GROUP，运行时灌值，走 systemKeyValueApi.getSysKvListByGroup）
 *  待接入：无
 *  偏差：默认时间范围照原 Load 为 [今天-6天, 今天+1天]；查询回填后按原 ViewControl_Completed 清空班次/班组选择；
 *        原窗体无查询前校验、无行双击事件，故未设；数据发送时间原 DisplayFormat "G"，后端返回本地时间串直接展示 */

import { onMounted, ref } from "vue";
import { systemKeyValueApi } from "@/api/admin/request";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Select from "primevue/select";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { tdaZb037Api, type TdaZb037, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const rows = ref<TdaZb037[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

/* ---------- 时间范围（原 ucTimeRange1_Load：[今天-6天, 今天+1天]） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ];
}
const dates = ref<Date[] | null>(defaultRange());
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}

/* ---------- 班次/班组下拉（原 comShiftNum/comTeamGroup，KV 字典 A0000:SHIFT / A0000:GROUP） ---------- */
const shiftOptions = ref<{ label: string; value: string }[]>([]);
const groupOptions = ref<{ label: string; value: string }[]>([]);
const shiftNum = ref<string | null>(null);
const teamGroup = ref<string | null>(null);
const byOrder = (a: { cOrder?: string | null }, b: { cOrder?: string | null }) =>
  String(a.cOrder ?? "").localeCompare(String(b.cOrder ?? ""));
const toOpt = (x: { cCode?: string | null; cName?: string | null }) => ({
  label: x.cName ?? x.cCode ?? "",
  value: x.cCode ?? "",
});
onMounted(async () => {
  try {
    const [shifts, groups] = await Promise.all([
      systemKeyValueApi.getSysKvListByGroup("A0000:SHIFT"),
      systemKeyValueApi.getSysKvListByGroup("A0000:GROUP"),
    ]);
    shiftOptions.value = [...(shifts ?? [])].sort(byOrder).map(toOpt);
    groupOptions.value = [...(groups ?? [])].sort(byOrder).map(toOpt);
  } catch {
    /* 拦截层已 toast */
  }
});

/* ---------- 表格（原 gridView1 / TdaZb037，列集与 Designer 一一对应） ---------- */
const colDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", minWidth: 56, type: "booleanColumn" },
  { colId: "sendTime", field: "sendTime", headerName: "数据发送时间", minWidth: 112 },
  {
    colId: "water1ac",
    field: "water1ac",
    headerName: "综合泵房补充深井水上日累计流量",
    minWidth: 60,
    type: "numericColumn",
  },
  {
    colId: "water2ac",
    field: "water2ac",
    headerName: "综合泵房补充库水上日累计流量",
    minWidth: 60,
    type: "numericColumn",
  },
  {
    colId: "water3ac",
    field: "water3ac",
    headerName: "综合泵房补充中水上日累计流量",
    minWidth: 60,
    type: "numericColumn",
  },
  {
    colId: "water4ac",
    field: "water4ac",
    headerName: "ACC泵房补充深井水上日累计流量",
    minWidth: 60,
    type: "numericColumn",
  },
  {
    colId: "water5ac",
    field: "water5ac",
    headerName: "ACC泵房补充库水上日累计流量",
    minWidth: 60,
    type: "numericColumn",
  },
  {
    colId: "water6ac",
    field: "water6ac",
    headerName: "ACC泵房补充中水上日累计流量",
    minWidth: 60,
    type: "numericColumn",
  },
  { colId: "shiftNum", field: "shiftNum", headerName: "班次", minWidth: 60 },
  { colId: "teamGroup", field: "teamGroup", headerName: "班组", minWidth: 60 },
  { colId: "id", field: "id", headerName: "主键ID（GUID）", minWidth: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "记录创建时间", minWidth: 112, hide: true },
  { colId: "updateTime", field: "updateTime", headerName: "记录更新时间", minWidth: 112, hide: true },
];

async function query() {
  loading.value = true;
  try {
    rows.value =
      (await tdaZb037Api.queryTdaZb037({
        timeRange: toTimeRange(dates.value),
        shiftNum: shiftNum.value,
        teamGroup: teamGroup.value,
      })) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
    /* 原 ViewControl_Completed：回填后清空班次/班组选择 */
    shiftNum.value = null;
    teamGroup.value = null;
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 stackPanel1：发送时间 + 班次 + 班组 + 查询） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">发送时间</label>
        <DatePicker
          v-model="dates"
          selection-mode="range"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          placeholder="开始 至 结束"
          class="min-w-0 flex-1"
          @keydown.enter="query"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">班次</label>
        <Select
          v-model="shiftNum"
          :options="shiftOptions"
          option-label="label"
          option-value="value"
          show-clear
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">班组</label>
        <Select
          v-model="teamGroup"
          :options="groupOptions"
          option-label="label"
          option-value="value"
          show-clear
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1">
        <Button variant="outlined" :loading="loading" class="shrink-0 whitespace-nowrap" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
        :loading="loading"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
