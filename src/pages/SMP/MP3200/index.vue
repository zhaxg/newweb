<script setup lang="ts">
/** 对应 FrmMP3200（装炉称重明细报表）：DDH.Winforms.SMP.Forms.FrmMP3200
 *  已接入：tmp2000Api.getCptSlabNo（查询：钢种 + 时间区间；Load 默认 昨日00:00 ~ 明日23:59:59——照 FrmMP3200_Load）
 *  待接入：打印（btnPrint_Click：勾选校验文案照抄「请勾选打印的数据！」→ 选中行组装
 *            CptSlabNoDto（NWgt=0 时取 NCalWgt）→ XtraReportPrinter.PrintPreview 模板
 *            9f46e69a0606466793a2e811fea41930，报表打印未在 web 侧接入，选中校验后 toast 占位）
 *  cQueryString：无（种子为空）
 *  列集：9 列全可见 / 0 隐藏（extract QueryCptSlabNoDto；Selected 选择列为打印勾选，VisibleIndex=0，
 *    原 AllowSyncRowStateToCheckboxSelection 由该勾选列承担选行）；txtDs/txtDe 为 Designer 声明但未挂载的
 *    孤儿字段（原窗体不可见），按 extract 输入基线保留隐藏渲染
 *  字段桥接：extract PascalCase → 后端 camelCase（bridge 双写） */
import { nextTick, onMounted, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconPrinter, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { tmp2000Api } from "@/api/mes4ddh/smp.swagger";

const { toast } = useToast();
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
    // 原 VisibleIndex=0 的 Selected 打印勾选列（AllowSyncRowStateToCheckboxSelection）
    { colId: "Selected", field: "Selected", headerName: "选择", width: 70, minWidth: 60, cellRenderer: "agCheckboxCellRenderer", editable: true, sortable: false, filter: false },
    { field: "DWeighTime", headerName: "称重时间", width: 170 },
    { field: "CSlabNo", headerName: "铸坯号", width: 150 },
    { field: "NWgt", headerName: "炉前称重", width: 130 },
    { field: "NCalWgt", headerName: "理重", width: 130 },
    { field: "CSgCode", headerName: "钢种", width: 120 },
    { field: "NThick", headerName: "坯厚", width: 110 },
    { field: "NWth", headerName: "坯宽", width: 110 },
    { field: "NLen", headerName: "坯长", width: 110 },
  ]),
);

const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>();

/** 原 Load：dtS = 昨天 00:00、dtE = 明天 23:59:59（DateEdit 格式 G） */
function dayStart(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}
function dayEnd(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(23, 59, 59, 0);
  return d;
}
const dtS = ref<Date>(dayStart(-1));
const dtE = ref<Date>(dayEnd(1));
const sgCode = ref("");
/** txtDs/txtDe：Designer 声明的 DateTimeOffsetEdit 未加入任何容器（原窗体不可见），按基线保留隐藏渲染 */
const txtDs = ref<Date | null>(null);
const txtDe = ref<Date | null>(null);

async function query() {
  querying.value = true;
  try {
    const list =
      (await tmp2000Api.getCptSlabNo({ cSgCode: sgCode.value || null, dBegin: dtS.value, dEnd: dtE.value })) ?? [];
    rows.value = Array.isArray(list) ? list : [];
    await nextTick();
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function gv(r: Record<string, unknown>, f: string) {
  const ck = f.charAt(0).toLowerCase() + f.slice(1);
  return r[ck] ?? r[f];
}

/** btnPrint_Click：勾选校验文案照抄；选中行组装（NWgt=0 → NCalWgt）后报表打印占位 */
function onPrint() {
  const selected = (rows.value as Array<Record<string, unknown>>).filter((x) => Boolean(gv(x, "Selected")));
  if (selected.length <= 0) {
    toast("请勾选打印的数据！", 2500, "warn");
    return;
  }
  // 原 payload：NWgt === 0 ? NCalWgt : NWgt（打印接入时按此映射）
  toast("打印：XtraReportPrinter 模板 9f46e69a0606466793a2e811fea41930 待接入", 3000, "warn");
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
    <!-- stackPanel1：时间 起 ~ 止 / 钢种 + 查询/打印（顺序照 Controls.Add） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">时间</label>
      <DatePicker v-model="dtS" :manual-input="false" date-format="yy-mm-dd HH:mm:ss" show-time hour-format="24"
        show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">~</label>
      <DatePicker v-model="dtE" :manual-input="false" date-format="yy-mm-dd HH:mm:ss" show-time hour-format="24"
        show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">钢种</label>
      <InputText v-model="sgCode" placeholder="钢种" class="w-32 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onPrint">
        <IconPrinter class="h-3 w-3" />打印
      </Button>
      <!-- 孤儿字段：原 Designer 声明未挂载 → 隐藏保留（基线：extract 输入控件 5 个） -->
      <DatePicker v-model="txtDs" disabled class="hidden" />
      <DatePicker v-model="txtDe" disabled class="hidden" />
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows" :pagination="false"
        :loading="querying" @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
