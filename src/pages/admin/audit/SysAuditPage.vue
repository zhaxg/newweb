<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { IconRotate, IconSearch } from "@tabler/icons-vue";

import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { loadAuditLogs, ACTIONS, MODULES, type AuditLog } from "@/data/auditLogs";


const theme = makeHmxGridTheme();

const rows = ref<AuditLog[]>([]);

/* 筛选草稿 + 已应用条件（Select 用 null 表示全部；日期草稿为 Date，查询时转 YYYY-MM-DD 字符串） */
const fUser = ref("");
const fAction = ref<string | null>(null);
const fModule = ref<string | null>(null);
const fResult = ref<string | null>(null);
const fStart = ref<Date | null>(null);
const fEnd = ref<Date | null>(null);
const aUser = ref("");
const aAction = ref<string | null>(null);
const aModule = ref<string | null>(null);
const aResult = ref<string | null>(null);
const aStart = ref("");
const aEnd = ref("");

function toDateStr(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const filtered = computed(() => {
  const user = aUser.value.trim().toLowerCase();
  return rows.value.filter((r) => {
    if (user && !r.userName.toLowerCase().includes(user) && !r.userId.toLowerCase().includes(user)) return false;
    if (aAction.value && r.action !== aAction.value) return false;
    if (aModule.value && r.module !== aModule.value) return false;
    if (aResult.value && r.result !== aResult.value) return false;
    if (aStart.value && r.time < `${aStart.value} 00:00:00`) return false;
    if (aEnd.value && r.time > `${aEnd.value} 23:59:59`) return false;
    return true;
  });
});

const actionOptions = ACTIONS.map((a) => ({ label: a, value: a }));
const moduleOptions = MODULES.map((m) => ({ label: m, value: m }));
const resultOptions = [
  { label: "成功", value: "成功" },
  { label: "失败", value: "失败" },
];

const columnDefs: ColDef[] = [
  { colId: "time", field: "time", headerName: "时间", width: 150 },
  { colId: "userName", field: "userName", headerName: "用户", width: 90 },
  { colId: "action", field: "action", headerName: "操作", width: 70 },
  { colId: "module", field: "module", headerName: "模块", width: 100 },
  { colId: "target", field: "target", headerName: "目标", width: 220 },
  { colId: "ip", field: "ip", headerName: "IP", width: 110 },
  {
    colId: "result",
    field: "result",
    headerName: "结果",
    width: 70,
    cellClass: (p) => (p.value === "成功" ? "audit-result-ok" : p.value === "失败" ? "audit-result-fail" : ""),
  },
  { colId: "detail", field: "detail", headerName: "详情", width: 240, flex: 1 },
];

function getRowId(p: GetRowIdParams) {
  return (p.data as AuditLog).id;
}

function onQuery() {
  aUser.value = fUser.value;
  aAction.value = fAction.value;
  aModule.value = fModule.value;
  aResult.value = fResult.value;
  aStart.value = toDateStr(fStart.value);
  aEnd.value = toDateStr(fEnd.value);
}

function onReset() {
  fUser.value = "";
  fAction.value = null;
  fModule.value = null;
  fResult.value = null;
  fStart.value = null;
  fEnd.value = null;
  onQuery();
}

onMounted(() => {
  rows.value = loadAuditLogs();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 筛选工具栏 -->
    <div class="flex h-9 shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-2">
      <InputText v-model="fUser" placeholder="用户" autocapitalize="off" spellcheck="false" class="w-28 shrink-0" />
      <Select v-model="fAction" :options="actionOptions" option-label="label" option-value="value" placeholder="操作：全部"
        show-clear class="w-36 shrink-0" />
      <Select v-model="fModule" :options="moduleOptions" option-label="label" option-value="value" placeholder="模块：全部"
        show-clear class="w-36 shrink-0" />
      <Select v-model="fResult" :options="resultOptions" option-label="label" option-value="value" placeholder="结果：全部"
        show-clear class="w-32 shrink-0" />
      <DatePicker v-model="fStart" date-format="yy-mm-dd" :show-icon="false" placeholder="开始日期" class="w-30 shrink-0" />
      <span class="text-xs text-muted-foreground">至</span>
      <DatePicker v-model="fEnd" date-format="yy-mm-dd" :show-icon="false" placeholder="结束日期" class="w-30 shrink-0" />
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconSearch class="h-3.5 w-3.5" />查询
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onReset">
        <IconRotate class="h-3.5 w-3.5" />重置
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">共 {{ filtered.length }} 条</span>
    </div>

    <!-- 日志表格 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="columnDefs"
        :default-col-def="hmxDefaultColDef" :row-data="filtered" :get-row-id="getRowId" :row-selection="'single'"
        :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN"
        @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>

<style scoped>
.hmx-ag-grid :deep(.audit-result-ok) {
  color: var(--success);
  font-weight: 500;
}

.hmx-ag-grid :deep(.audit-result-fail) {
  color: var(--destructive);
  font-weight: 500;
}
</style>
