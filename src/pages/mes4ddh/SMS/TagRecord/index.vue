<script setup lang="ts">
/** 对应 FrmTagRecord（自动化点位采集记录查询 / 菜单 cCode=MS1051）：DDH.Winforms.SMS.Forms.Tag.FrmTagRecord
 *  已接入：frmTagRecordApi.getTagRecordInfo（查询：≤采集时间≤ 区间 + 自动化点位；
 *          Load 默认 当前-1小时 ~ 当前+1小时——照 FrmTagRecord_Load）
 *  待接入：无
 *  cQueryString：无（种子为空）
 *  列集：4 可见 + 18 隐藏（extract TbTagRecordViewDto；实体纠偏：CValue→点位值（extract 全局字典串名为
 *        「试验结果」）、DTime→采集时间、审计→最后更新人/最后更新时间）；原 gridView OptionsBehavior.Editable=false
 *        → 全列只读
 *  字段桥接：extract PascalCase → 后端 camelCase（bridge 双写） */
import { nextTick, onMounted, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { frmTagRecordApi } from "@/api/mes4ddh/sms.swagger";

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
    { field: "CSmnsTag", headerName: "自动化点位", width: 170 },
    { field: "CTagNm", headerName: "点位描述", width: 150 },
    { field: "CValue", headerName: "点位值", width: 130 },
    { field: "DTime", headerName: "采集时间", width: 170 },
    { field: "Id", headerName: "主键", width: 120, hide: true },
    { field: "CMesTag", headerName: "MES点位", width: 130, hide: true },
    { field: "DDate", headerName: "日期", width: 120, hide: true },
    { field: "CShift", headerName: "班次", width: 90, hide: true },
    { field: "CTeam", headerName: "班组", width: 90, hide: true },
    { field: "CBackup", headerName: "备注", width: 130, hide: true },
    { field: "CTimestamp", headerName: "时间戳", width: 150, hide: true },
    { field: "Creator", headerName: "创建人", width: 112, hide: true },
    { field: "CreateTime", headerName: "创建时间", width: 150, hide: true },
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

function hour(offset: number) {
  const d = new Date();
  d.setHours(d.getHours() + offset, 0, 0, 0);
  return d;
}
/** 原 Load：deBegTime = Now-1h、deEndTime = Now+1h（yyyy-MM-dd HH:mm:ss） */
const begTime = ref<Date>(hour(-1));
const endTime = ref<Date>(hour(1));
const plcPoint = ref("");

async function query() {
  querying.value = true;
  try {
    const list =
      (await frmTagRecordApi.getTagRecordInfo({
        begTime: begTime.value,
        endTime: endTime.value,
        plcTag: plcPoint.value,
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

onMounted(() => {
  // 原 Load 仅设置默认时间，不自动查询
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：时间 ≤采集时间≤ 时间 / 自动化点位 + 查询（顺序照 Controls.Add：deBegTime→≤采集时间≤→deEndTime→自动化点位→txt→btn） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <DatePicker
        v-model="begTime"
        :manual-input="false"
        date-format="yy-mm-dd HH:mm:ss"
        show-time
        hour-format="24"
        show-icon
        class="shrink-0"
      />
      <label class="shrink-0 text-xs text-muted-foreground">≤采集时间≤</label>
      <DatePicker
        v-model="endTime"
        :manual-input="false"
        date-format="yy-mm-dd HH:mm:ss"
        show-time
        hour-format="24"
        show-icon
        class="shrink-0"
      />
      <label class="shrink-0 text-xs text-muted-foreground">自动化点位</label>
      <InputText v-model="plcPoint" placeholder="自动化点位" class="w-40 shrink-0" />
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
