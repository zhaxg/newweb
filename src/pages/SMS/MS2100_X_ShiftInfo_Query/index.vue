<script setup lang="ts">
/** 对应 FrmMS2100_X_ShiftInfo_Query（炼钢工序生产班次信息）：DDH.Winforms.SMS.Forms.FrmMS2100_X_ShiftInfo_Query
 *  已接入：frmMS2100XShiftInfoQueryApi.query（查询：产线/机台/≤日期≤ 区间；Load 默认 昨日~明日+1、
 *            ShowLines 仅菜单产线 SelectedIndex=0；机台有值变更自动查询——照 ucMachine1_EditValueChanged）
 *          tPa1000Api.queryLines+queryMachine（产线只读显示 code-name，机台按产线过滤）
 *  待接入：班次/班组代码列原 ShiftNoFormatter/GroupNoFormatter 转义未迁，显示原始代码
 *  cQueryString：裸产线码（如 LG02，useMenuQuery.raw；非 JSON）
 *  列集：13 可见 + 17 隐藏（extract FrmMS2100_X_ShiftInfo_QueryDto；实体纠偏：CMachineCode→机台、DDate→班次日期、
 *        审计→最后更新人/最后更新时间）；原 gridView OptionsBehavior.Editable=false → 全列只读
 *  字段桥接：extract PascalCase → 后端 camelCase（bridge 双写） */
import { nextTick, onMounted, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { frmMS2100XShiftInfoQueryApi, tPa1000Api } from "@/api/mes4ddh/sms.swagger";

const { raw: qsRaw } = useMenuQuery();
const theme = makeHmxGridTheme();

/** extract 字段 PascalCase → 后端 JSON camelCase 桥接 */
function bridge(cols: ColDef[]): ColDef[] {
  return cols.map((c) => {
    if (!c.field) return c;
    const f = c.field;
    const ck = f.charAt(0).toLowerCase() + f.slice(1);
    return {
      ...c,
      valueGetter: (p: ValueGetterParams) => {
        const d = p.data as Record<string, unknown> | undefined;
        return d ? (d[ck] ?? d[f]) : undefined;
      },
      valueSetter: (p: ValueSetterParams) => {
        const d = p.data as Record<string, unknown> | undefined;
        if (!d) return false;
        d[ck] = p.newValue;
        d[f] = p.newValue;
        return true;
      },
    };
  });
}

const colDefs = ref<ColDef[]>(
  bridge([
    { field: "CLineCode", headerName: "产线", width: 110 },
    { field: "CLineName", headerName: "产线名称", width: 130 },
    { field: "CMachineCode", headerName: "机台", width: 110 },
    { field: "CMachineName", headerName: "机台名称", width: 130 },
    { field: "DDate", headerName: "班次日期", width: 120 },
    { field: "CShift", headerName: "班次", width: 90 },
    { field: "CGroup", headerName: "班组", width: 90 },
    { field: "CUserIdLuzhang", headerName: "炉长id", width: 110 },
    { field: "CUserNameLuzhang", headerName: "炉长姓名", width: 120 },
    { field: "CUserIdYicaoshou", headerName: "一操手id", width: 110 },
    { field: "CUserNameYicaoshou", headerName: "一操手姓名", width: 120 },
    { field: "Creator", headerName: "创建人", width: 112 },
    { field: "CreateTime", headerName: "创建时间", width: 150 },
    { field: "Id", headerName: "主键", width: 120, hide: true },
    { field: "CFactoryCode", headerName: "工厂", width: 120, hide: true },
    { field: "CFactoryName", headerName: "工厂名称", width: 120, hide: true },
    { field: "CProc", headerName: "工序", width: 120, hide: true },
    { field: "CProcName", headerName: "工序名称", width: 120, hide: true },
    { field: "CEnable", headerName: "启用", width: 90, hide: true },
    { field: "CBackup", headerName: "备注", width: 130, hide: true },
    { field: "CTimestamp", headerName: "时间戳", width: 150, hide: true },
    { field: "LastModifier", headerName: "最后更新人", width: 112, hide: true },
    { field: "LastModifyTime", headerName: "最后更新时间", width: 150, hide: true },
    { field: "CSw01", headerName: "备用字段1", width: 120, hide: true },
    { field: "CSw02", headerName: "备用字段2", width: 120, hide: true },
    { field: "CSw03", headerName: "备用字段3", width: 120, hide: true },
    { field: "CSw04", headerName: "备用字段4", width: 120, hide: true },
    { field: "CSw05", headerName: "备用字段5", width: 120, hide: true },
    { field: "CSw06", headerName: "备用字段6", width: 120, hide: true },
    { field: "Selected", headerName: "选择", width: 80, hide: true },
  ]),
);

const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>();

const lineCode = ref("");
const lineText = ref("");
const machineCode = ref<string | null>(null);
const machineOptions = ref<{ label: string; value: string }[]>([]);
function day(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}
/** 原 Load：deBegDate = Today-1、deEndDate = Today+1 */
const begDate = ref<Date>(day(-1));
const endDate = ref<Date>(day(1));

async function loadLines() {
  try {
    const list = (await tPa1000Api.queryLines()) ?? [];
    const map = new Map<string, string>();
    for (const r of list as Array<Record<string, unknown>>) {
      const code = (r.cCode ?? r.cLineCode ?? "") as string;
      if (code) map.set(code, (r.cName ?? r.cLineName ?? "") as string);
    }
    const n = map.get(lineCode.value);
    lineText.value = n ? `${lineCode.value}-${n}` : lineCode.value;
  } catch {
    lineText.value = lineCode.value;
    /* 拦截层已 toast */
  }
}

async function loadMachines() {
  try {
    const list = (await tPa1000Api.queryMachine(lineCode.value || null)) ?? [];
    machineOptions.value = (list as Array<Record<string, unknown>>)
      .filter((r) => r.cCode != null)
      .map((r) => ({ label: (r.cSimpName ?? r.cName ?? r.cCode) as string, value: r.cCode as string }));
  } catch {
    machineOptions.value = [];
    /* 拦截层已 toast */
  }
}

async function query() {
  querying.value = true;
  try {
    const mo = machineOptions.value.find((o) => o.value === machineCode.value);
    const list =
      (await frmMS2100XShiftInfoQueryApi.query({
        lineCode: lineCode.value,
        lineDesc: lineText.value,
        machineCode: machineCode.value ?? "",
        machineName: mo?.label ?? machineCode.value ?? "",
        begDate: begDate.value,
        endDate: endDate.value,
      })) ?? [];
    rows.value = Array.isArray(list) ? list : [];
    await nextTick();
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onMachineChange() {
  // 原 ucMachine1_EditValueChanged：空值不查，有值即查
  if (!machineCode.value) return;
  void query();
}

onMounted(async () => {
  // 原 Load：ucLine.ShowLines.Add(QueryString) → 仅菜单产线（裸码，非 JSON）
  lineCode.value = qsRaw && !qsRaw.startsWith("{") ? qsRaw : (qsRaw.split(",")[0] ?? "");
  await Promise.all([loadLines(), loadMachines()]);
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：产线/机台/日期 ≤日期≤ + 查询（顺序照 Controls.Add） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineText" disabled class="w-32 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">机台</label>
      <Select
        v-model="machineCode"
        :options="machineOptions"
        option-label="label"
        option-value="value"
        show-clear
        placeholder="请选择"
        class="w-36 shrink-0"
        @value-change="onMachineChange"
      />
      <label class="shrink-0 text-xs text-muted-foreground">日期</label>
      <DatePicker v-model="begDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">≤日期≤</label>
      <DatePicker v-model="endDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
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
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
