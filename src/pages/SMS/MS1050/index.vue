<script setup lang="ts">
/** 对应 FrmMS1050（钢种代码维护 / 菜单 cCode=MS1052）：DDH.Winforms.SMS.Forms.FrmMS1050
 *  已接入：frmMS1050FullApi.queryTms1050（Load 自动查询，Name=轧制产线选中编码）/
 *          frmMS1050FullApi.deleteTms1050（删除：行校验 → 确认「确定删除该钢种信息吗？」→ 删除 → 重查 + 「删除成功」；
 *            catch 由拦截层 toast，不重复弹错）
 *  待接入：添加 → FrmMS1050_Edit 二级弹窗占位（弹窗内 GetLines + addTms1050/updateTms1050 与
 *            「钢种不能为空！/代码不能为空！/该钢种代码已经存在！」校验随弹窗接入）；
 *          编辑 → FrmMS1050_Edit 占位（前置「请先选择要编辑的记录」照抄）
 *  cQueryString：JSON {LineCode, ZGLineCodeInfo:["编码-描述", ...]}（useMenuQuery；ZGLineCodeInfo 缺省时下拉为空，
 *    原 C# 直接反序列化会 NRE，web 做空值兜底不弹错）
 *  列集：9 可见 + 14 隐藏（extract FrmMS1050ViewDto；实体纠偏：CZgLineCode→轧制产线编码、CCode→代码、
 *        审计→最后更新人/最后更新时间、CLineCode→产线编码、CCcmCode→铸机编码）
 *  字段桥接：extract PascalCase → 后端 camelCase（bridge 双写） */
import { nextTick, onMounted, ref } from "vue";
import Button from "primevue/button";
import Select from "primevue/select";
import { IconPlus, IconSearch, IconTrash, IconPencil } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  SelectionChangedEvent,
  ValueGetterParams,
  ValueSetterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { frmMS1050FullApi } from "@/api/mes4ddh/sms.swagger";

const { toast } = useToast();
const { json: qsJson } = useMenuQuery();
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
    { field: "CZgLineCode", headerName: "轧制产线编码", width: 130 },
    { field: "CZgLineName", headerName: "轧制产线名称", width: 130 },
    { field: "CCode", headerName: "代码", width: 120 },
    { field: "CSgCode", headerName: "钢种", width: 130 },
    { field: "CEnable", headerName: "启用", width: 80 },
    { field: "Creator", headerName: "创建人", width: 112 },
    { field: "CreateTime", headerName: "创建时间", width: 150 },
    { field: "LastModifier", headerName: "最后更新人", width: 112 },
    { field: "LastModifyTime", headerName: "最后更新时间", width: 150 },
    { field: "Id", headerName: "主键", width: 120, hide: true },
    { field: "CLineCode", headerName: "产线编码", width: 120, hide: true },
    { field: "CLineName", headerName: "产线名称", width: 120, hide: true },
    { field: "CCcmCode", headerName: "铸机编码", width: 120, hide: true },
    { field: "CCcmName", headerName: "铸机名称", width: 120, hide: true },
    { field: "CBackup", headerName: "备注", width: 130, hide: true },
    { field: "CTimestamp", headerName: "时间戳", width: 150, hide: true },
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
const selected = ref<any | null>(null);

/** 轧制产线候选：ZGLineCodeInfo = ["编码-描述"] → Value=编码 / Description=描述，SelectedIndex=0 */
const zgOptions = ref<{ label: string; value: string }[]>([]);
const zgLine = ref<string | null>(null);

function parseZgOptions() {
  const info = (qsJson as { ZGLineCodeInfo?: unknown }).ZGLineCodeInfo;
  if (!Array.isArray(info)) {
    zgOptions.value = [];
    return;
  }
  zgOptions.value = info
    .map((x) => String(x ?? ""))
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf("-");
      return i > 0 ? { value: s.slice(0, i), label: s.slice(i + 1) } : { value: s, label: s };
    });
}

async function query() {
  querying.value = true;
  try {
    const list = (await frmMS1050FullApi.queryTms1050({ name: zgLine.value ?? null })) ?? [];
    rows.value = Array.isArray(list) ? list : [];
    selected.value = null;
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
function onSelectionChanged(e: SelectionChangedEvent) {
  selected.value = e.api.getSelectedRows()[0] ?? null;
}

/** btnAdd_Click：FrmMS1050_Edit 弹窗占位（含 addTms1050；C# 返回 OK 才重查+「添加成功」） */
function onAdd() {
  toast("FrmMS1050_Edit：二级弹窗待接入（addTms1050）", 2500, "warn");
}

/** btnEdit_Click：无行 → ShowWarning「请先选择要编辑的记录」；否则弹窗占位（updateTms1050） */
function onEdit() {
  if (!selected.value) {
    toast("请先选择要编辑的记录", 2500, "warn");
    return;
  }
  toast("FrmMS1050_Edit：二级弹窗待接入（updateTms1050）", 2500, "warn");
}

/** btnRemove_Click：无行 → 「请选择要删除的信息」；确认 → DeleteTms1050 → 重查 + 「删除成功」 */
async function onRemove() {
  const row = selected.value;
  if (!row) {
    toast("请选择要删除的信息", 2500, "warn");
    return;
  }
  if (!window.confirm("确定删除该钢种信息吗？")) return;
  querying.value = true;
  try {
    await frmMS1050FullApi.deleteTms1050(String(row.id ?? row.Id ?? ""));
    await query();
    toast("删除成功", 2000, "success");
  } catch {
    /* 拦截层已 toast（原 C# catch 的「删除失败：{ex}」由统一拦截层覆盖，不重复弹错） */
  } finally {
    querying.value = false;
  }
}

onMounted(async () => {
  parseZgOptions();
  // 原 SelectedIndex = 0
  if (zgOptions.value.length) zgLine.value = zgOptions.value[0].value;
  // 原 Load：填充下拉后立即查询
  await query();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：轧制产线 + 查询/添加/编辑/删除（顺序照 Controls.Add；Load 末尾自动查询一次） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">轧制产线</label>
      <Select
        v-model="zgLine"
        :options="zgOptions"
        option-label="label"
        option-value="value"
        show-clear
        placeholder="请选择"
        class="w-36 shrink-0"
        @value-change="query"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onRemove">
        <IconTrash class="h-3 w-3" />删除
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
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
