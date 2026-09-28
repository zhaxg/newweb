<script setup lang="ts">
/** 对应 FrmMS2101（炉次撤销记录，一炼钢/总厂共用 cQueryString={LineCode}）：DDH.Winforms.SMS.Forms.FrmMS2101
 *  已接入：frmMS2101Api.query（btnQuery_Click → lineCode、≤日期≤ 区间；默认 today-3 ~ today+3）
 *  列集：extract 9 可见 + 18 隐藏（hide:true）
 *  待接入：无 */
import { onMounted, onBeforeUnmount, reactive, ref, shallowRef, nextTick } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Textarea from "primevue/textarea";
import { IconSearch } from "@tabler/icons-vue";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

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

import { frmMS2101Api } from "@/api/mes4ddh/sms.swagger";

const { json: menuJson } = useMenuQuery();
const qs = menuJson as { LineCode?: string };
const lineCode = qs.LineCode ?? "";

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

function day(offset: number) {
  const t = new Date();
  t.setDate(t.getDate() + offset);
  return t;
}
const q = reactive({ beg: day(-3), end: day(3) });

const colDefs = ref<ColDef[]>(
  bridge([
    { field: "CLineDesc", headerName: "产线描述", width: 80 },
    { field: "CMachineDesc", headerName: "机台描述", width: 80 },
    { field: "CPono", headerName: "制造命令号", width: 93 },
    { field: "CStoveNo", headerName: "炉号", width: 64 },
    { field: "CReason", headerName: "强制原因", width: 80 },
    { field: "CSgCode", headerName: "钢种", width: 64 },
    { field: "CSgStd", headerName: "执行标准", width: 80 },
    { field: "Creator", headerName: "创建人", width: 67 },
    { field: "CreateTime", headerName: "创建时间", width: 80 },
    { field: "Id", headerName: "主键", width: 64, hide: true },
    { field: "CLineCode", headerName: "产线", width: 64, hide: true },
    { field: "CMachineCode", headerName: "机台编码", width: 80, hide: true },
    { field: "CMachineStationCode", headerName: "机台工位编码", width: 106, hide: true },
    { field: "CMachineStationDesc", headerName: "机台工位描述", width: 106, hide: true },
    { field: "CGsId", headerName: "钢水id", width: 64, hide: true },
    { field: "CEnable", headerName: "启用", width: 64, hide: true },
    { field: "CBackup", headerName: "备注", width: 64, hide: true },
    { field: "CTimestamp", headerName: "时间戳", width: 67, hide: true },
    { field: "LastModifier", headerName: "最后修改人", width: 93, hide: true },
    { field: "LastModifyTime", headerName: "最后修改时间", width: 106, hide: true },
    { field: "CSw01", headerName: "备用字段1", width: 87, hide: true },
    { field: "CSw02", headerName: "备用字段2", width: 87, hide: true },
    { field: "CSw03", headerName: "备用字段3", width: 87, hide: true },
    { field: "CSw04", headerName: "备用字段4", width: 87, hide: true },
    { field: "CSw05", headerName: "备用字段5", width: 87, hide: true },
    { field: "CSw06", headerName: "备用字段6", width: 87, hide: true },
    { field: "Selected", headerName: "选择", width: 64, hide: true },
  ]),
);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

async function onQuery() {
  querying.value = true;
  try {
    const list = (await frmMS2101Api.query({ lineCode: lineCode || undefined, begDate: q.beg, endDate: q.end })) ?? [];
    rows.value = Array.isArray(list) ? list : [];
    await nextTick();
    gridApi.value?.autoSizeAllColumns();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineCode" disabled class="w-24 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">时间范围</label>
      <DatePicker v-model="q.beg" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">≤日期≤</label>
      <DatePicker v-model="q.end" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
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
        :row-selection="{
          mode: 'multiRow',
          checkboxes: true,
          headerCheckbox: true,
          enableClickSelection: true,
          enableSelectionWithoutKeys: true,
        }"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
