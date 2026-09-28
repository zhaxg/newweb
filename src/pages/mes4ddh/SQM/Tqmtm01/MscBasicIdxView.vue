<script setup lang="ts">
/** UCMscBasicIdxTableEditView（基表数据明细）：动态列走 tableConfigApi.queryTableConfig（CProName 表头 / CValue{NSeq} 字段 / CVisible!=Y 隐藏 / 审计4列追加）
 *  行数据=idx.idxDetails（本地槽位行）；按钮 添加/删除/选择模板/保存为模板
 *  待接入：选择模板（IdXFormHelper→FrmSelectTableView 系列）与保存为模板（FrmSaveIdxData）留占位；
 *  偏差：TQMTMAC（成分表）原走专用 UCTqmtmacEditView，未迁——按槽位只读展示且不出添加/删除 */
import { ref, watch, shallowRef } from "vue";
import Button from "primevue/button";
import { IconPlus, IconTemplate, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { tableConfigApi, type TsTablePro, type TsTableSettingDto } from "@/api/mes4ddh/ddh.swagger";
import { TABLE_MAC, macTypedToSlot, type IdxRow, type MSCIdx } from "./mscVm";
import { useToast } from "@/composables/useToast";

const props = defineProps<{ idx: MSCIdx | null }>();
const emit = defineEmits<{ "data-changed": [] }>();
const { toast } = useToast();
const theme = makeHmxGridTheme();

const colDefs = ref<ColDef[]>([]);
const rows = shallowRef<Record<string, unknown>[]>([]);
const gridApi = ref<GridApi | null>(null);
const setting = ref<TsTableSettingDto | null>(null);
const configCache = new Map<string, TsTableSettingDto | null>();
const fitWidth = (name?: string | null) => Math.max((name ?? "").length * 13 + 60, 80);

function buildColumns(s: TsTableSettingDto) {
  const propsList = [...(s.tableColumnSettings ?? [])]
    .filter((p: TsTablePro) => p.nSeq != null)
    .sort((a: TsTablePro, b: TsTablePro) => (a.nSeq ?? 0) - (b.nSeq ?? 0));
  const valueCols: ColDef[] = propsList.map((p: TsTablePro) => ({
    field: `cValue${p.nSeq}`,
    headerName: p.cProName ?? "",
    width: fitWidth(p.cProName),
    hide: p.cVisible !== "Y",
    editable: p.cVisible === "Y" && !isMac(),
    cellEditor: p.nSourceType === 1 ? "agNumberCellEditor" : undefined,
  }));
  colDefs.value = [
    ...valueCols,
    { field: "creator", headerName: "创建人", width: 99, editable: false },
    { field: "createTime", headerName: "创建时间", width: 138, editable: false },
    { field: "lastModifier", headerName: "最后修改人", width: 125, editable: false },
    { field: "lastModifyTime", headerName: "最后修改时间", width: 138, editable: false },
  ];
}
const isMac = () => props.idx?.basicTableCode === TABLE_MAC;

async function reload() {
  const idx = props.idx;
  if (!idx) {
    rows.value = [];
    colDefs.value = [];
    return;
  }
  const code = idx.basicTableCode;
  if (!setting.value || setting.value.tableSetting?.cTbCode !== code) {
    if (!configCache.has(code)) {
      configCache.set(code, await tableConfigApi.queryTableConfig(code).catch(() => null));
    }
    setting.value = configCache.get(code) ?? null;
    if (setting.value?.tableSetting == null) {
      toast("表配置不能为空", 2500, "error");
      colDefs.value = [];
    } else {
      buildColumns(setting.value);
    }
  }
  const slots = [...idx.idxDetails.getTsTableVal()] as unknown as Record<string, unknown>[];
  if (isMac()) {
    // 成分表：强类型行转换为槽位形态一并只读展示（原走 UCTqmtmacEditView，未迁）
    for (const r of idx.idxDetails.getMacRows())
      slots.push((await macTypedToSlot(r)) as unknown as Record<string, unknown>);
    slots.push(...(idx.idxDetails.getMacSlots() as unknown as Record<string, unknown>[]));
  }
  rows.value = slots;
  requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
}

watch(() => props.idx, reload, { immediate: true });

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function onAdd() {
  const idx = props.idx;
  if (!idx || isMac()) return;
  idx.addIdxData();
  emit("data-changed");
  void reload();
}
function onDelete() {
  const idx = props.idx;
  const row = (gridApi.value?.getSelectedRows()[0] ?? null) as Record<string, unknown> | null;
  if (!idx || !row || isMac()) return;
  idx.removeIdxData(row as never);
  emit("data-changed");
  void reload();
}
defineExpose({ reload });
const placeholder = (name: string) => () =>
  toast(`${name}待接入：模板选择/保存走 FrmSaveIdxData 系列弹窗`, 2500, "warn");
</script>

<template>
  <div class="flex min-h-0 min-w-0 flex-col">
    <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <span class="text-xs font-medium text-muted-foreground">基表索引数据</span>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" :disabled="isMac()" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" :disabled="isMac()" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="placeholder('选择模板')">
        <IconTemplate class="h-3 w-3" />选择模板
      </Button>
      <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="placeholder('保存为模板')">
        <IconTemplate class="h-3 w-3" />保存为模板
      </Button>
      <span v-if="isMac()" class="ml-auto text-xs text-destructive">成分表专用编辑器未迁，只读展示</span>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :get-row-id="(p: any) => String(p.data.id)"
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        :pagination="false"
        :animate-rows="false"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
