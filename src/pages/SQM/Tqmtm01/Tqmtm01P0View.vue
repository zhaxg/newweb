<script setup lang="ts">
/** UCMscTqmtmp0EditView（试验项目标准）：左候选 TestSubItem（按节点试验项目过滤）→ >> → 右已选 Tqmtmp0（21列）
 *  已接入：testItemApi.querySubItems（InitItems 过滤规则：种类非空按等值；项目代码非空匹配「空或等值」）；行级增删走 MSCTestItemNode.addIdxData/removeIdxData
 *  待接入：从模板选择/保存为模板（FrmSaveIdxData）、公式列 FormulaEdit → FrmFormulaEditor（点击公式单元格提示）；
 *  偏差：TargetValue/DisplayText 的行级字典下拉（ValueKvs/DisplayKvs）退化为文本单元格 */
import { ref, shallowRef, watch } from "vue";
import Button from "primevue/button";
import { IconChevronLeft, IconChevronRight, IconTemplate } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, CellValueChangedEvent, CellClickedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { testItemApi, type TestSubItem, EqualsFlag, DecideMode } from "@/api/mes4ddh/sqm.swagger";
import { type IdxRow, type MSCTestItemNode } from "./mscVm";
import { useToast } from "@/composables/useToast";

const props = defineProps<{ node: MSCTestItemNode | null }>();
const emit = defineEmits<{ "data-changed": [] }>();
const { toast } = useToast();
const theme = makeHmxGridTheme();

const candidates = shallowRef<TestSubItem[]>([]);
const selected = shallowRef<IdxRow[]>([]);
const leftApi = ref<GridApi | null>(null);
const rightApi = ref<GridApi | null>(null);
const title = ref("试验子项要求");

const ENUM_NAME = (m: Record<number, string>) => (p: { value: unknown }) =>
  p.value == null ? "" : (m[Number(p.value)] ?? String(p.value));

const leftAddCol: ColDef = {
  colId: "xfer-in",
  headerName: ">>",
  width: 52,
  minWidth: 52,
  maxWidth: 52,
  sortable: false,
  filter: false,
  editable: false,
  onCellClicked: (p) => addRow(p.data as TestSubItem),
  onCellDoubleClicked: (p) => addRow(p.data as TestSubItem),
};
const rightRemoveCol: ColDef = {
  colId: "xfer-out",
  headerName: "<<",
  width: 52,
  minWidth: 52,
  maxWidth: 52,
  sortable: false,
  filter: false,
  editable: false,
  onCellClicked: (p) => removeRow(p.data as IdxRow),
  onCellDoubleClicked: (p) => removeRow(p.data as IdxRow),
};

const candColDefs: ColDef[] = [
  { field: "testSubItemCode", headerName: "试验子项目代码", width: 151 },
  { field: "testSubItemName", headerName: "试验子项目名称", width: 151 },
  { field: "dlDxFlag", headerName: "定量定性标识", width: 138 },
  { field: "unit", headerName: "单位", width: 86 },
  leftAddCol,
  { field: "testItemType", headerName: "试验项目种类", width: 120, hide: true },
  { field: "testItemTypeDesc", headerName: "试验项目种类说明", width: 150, hide: true },
  { field: "testItemCode", headerName: "试验项目代码", width: 130, hide: true },
  { field: "testItemName", headerName: "试验项目名称", width: 150, hide: true },
  { field: "other1", headerName: "试验子项目描述", width: 151, hide: true },
  { field: "other2", headerName: "值来源", width: 99, hide: true },
  { field: "other3", headerName: "显示名称来源", width: 125, hide: true },
  { field: "other4", headerName: "试验子项目英文名称", width: 164, hide: true },
  { field: "other5", headerName: "精度", width: 86, hide: true },
  { field: "other6", headerName: "预留6", width: 86, hide: true },
  { field: "other7", headerName: "预留7", width: 86, hide: true },
  { field: "other8", headerName: "预留8", width: 86, hide: true },
  { field: "tableCode", headerName: "表代码", width: 112, hide: true },
  { field: "id", headerName: "主键", width: 86, hide: true },
];

const selColDefs: ColDef[] = [
  rightRemoveCol,
  { field: "seqNo", headerName: "序号", width: 86, editable: true },
  { field: "minThick", headerName: "厚/高/径/边最小值", width: 164, editable: true },
  { field: "maxThick", headerName: "厚/高/径/边最大值", width: 164, editable: true },
  { field: "minWidth", headerName: "宽度最小值", width: 125, editable: true },
  { field: "maxWidth", headerName: "宽度最大值", width: 125, editable: true },
  { field: "testSubItemCode", headerName: "试验子项目代码", width: 151 },
  { field: "testSubItemName", headerName: "试验子项目名称", width: 151 },
  { field: "displayText", headerName: "项目说明", width: 112, editable: true },
  { field: "valueMin", headerName: "检验标准下限", width: 138, editable: true },
  { field: "interval", headerName: "开闭区间", width: 112, editable: false, valueFormatter: ENUM_NAME({ 1: "Default", 2: "LeftOpen", 4: "RightOpen", 6: "Open" }) },
  { field: "valueMax", headerName: "检验标准上限", width: 138, editable: true },
  { field: "targetValue", headerName: "目标值", width: 112, editable: true },
  { colId: "formula", field: "formula", headerName: "计算公式/验证条件", width: 177, editable: false },
  { field: "decideMode", headerName: "判定模式", width: 112, editable: false, valueFormatter: ENUM_NAME(Object.fromEntries(Object.entries(DecideMode).map(([k, v]) => [v, k]))) },
  { field: "decimals", headerName: "小数位数", width: 112, editable: true },
  { field: "itemAccuracy", headerName: "精度", width: 99, editable: true },
  { field: "testSubItemUnit", headerName: "试验子项目单位", width: 151 },
  { field: "testSubItemEName", headerName: "试验子项目英文名称", width: 164 },
  { field: "testItemDlDx", headerName: "定量定性标识", width: 138 },
  { field: "remark", headerName: "备注", width: 86, editable: true },
  { field: "idxNo", headerName: "索引号", width: 99, hide: true },
  { field: "testItemType", headerName: "试验项目种类", width: 120, hide: true },
  { field: "testItemTypeDesc", headerName: "试验项目种类说明", width: 150, hide: true },
  { field: "testItemCode", headerName: "试验项目代码", width: 130, hide: true },
  { field: "testItemName", headerName: "试验项目名称", width: 150, hide: true },
  { field: "archiveFlag", headerName: "归档标记", width: 112, hide: true },
  { field: "version", headerName: "版次", width: 86, hide: true },
  { field: "factoryId", headerName: "制造厂别", width: 112, hide: true },
  { field: "tableCode", headerName: "表代码", width: 112, hide: true },
  { field: "id", headerName: "主键", width: 86, hide: true },
];

function refresh() {
  const node = props.node;
  selected.value = node ? [...node.idxDetails.getP0()] : [];
  title.value = node ? `${node.idxData.testItemName ?? ""}要求` : "试验子项要求";
}
watch(() => props.node, refresh, { immediate: true });

async function loadCandidates() {
  const node = props.node;
  if (!node) {
    candidates.value = [];
    return;
  }
  try {
    const list = (await testItemApi.querySubItems()) ?? [];
    const type = node.idxData.testItemType;
    const code = node.idxData.testItemCode;
    let items: TestSubItem[] = list;
    if (type) items = items.filter((x) => x.testItemType === type);
    if (code) items = items.filter((x) => !x.testItemCode || x.testItemCode === code);
    candidates.value = items;
  } catch {
    /* 拦截层已 toast */
  }
}
watch(() => props.node, () => void loadCandidates(), { immediate: true });

/** 原 Add(TestSubItem)：父节点试验项目信息 + 子项信息 → Tqmtmp0 行 */
function addRow(item: TestSubItem) {
  const node = props.node;
  if (!item || !node) return;
  const data = node.idxData;
  const row = node.addIdxData();
  row.testItemCode = data.testItemCode;
  row.testItemDlDx = item.dlDxFlag;
  row.testItemName = data.testItemName;
  row.testItemType = data.testItemType;
  row.testItemTypeDesc = data.testItemTypeDesc;
  row.testSubItemCode = item.testSubItemCode;
  row.testSubItemName = item.testSubItemName;
  row.displayText = item.testSubItemName;
  row.testSubItemUnit = item.unit;
  row.testSubItemEName = item.other4;
  row.interval = EqualsFlag.Default;
  row.decideMode = DecideMode.Mode1;
  row.itemAccuracy = item.other5;
  emit("data-changed");
  refresh();
}
function removeRow(row: IdxRow) {
  const node = props.node;
  if (!node || !row) return;
  node.removeIdxData(row);
  emit("data-changed");
  refresh();
}
/** 原 GridView2_CellValueChanged：Decimals ↔ ItemAccuracy=10^-Decimals（改精度清 Decimals） */
function onValueChanged(e: CellValueChangedEvent<IdxRow>) {
  const row = e.data;
  if (!row) return;
  if (e.colDef.field === "decimals") {
    const v = e.newValue as number | null | undefined;
    row.itemAccuracy = v == null ? null : Math.pow(10, -Number(v));
  }
  if (e.colDef.field === "itemAccuracy") {
    row.decimals = null;
  }
}
/** 原 FormulaEdit_ButtonClick → FrmFormulaEditor（未迁，占位提示） */
function onCellClicked(e: CellClickedEvent<IdxRow>) {
  if (e.colDef.colId === "formula") {
    toast("公式编辑器待接入：原 FrmFormulaEditor", 2500, "warn");
  }
}
function onGridReady(which: "l" | "r") {
  return (e: GridReadyEvent) => {
    if (which === "l") leftApi.value = e.api;
    else rightApi.value = e.api;
  };
}
const placeholder = (name: string) => () => toast(`${name}待接入：走 FrmSaveIdxData 模板弹窗`, 2500, "warn");
defineExpose({ refresh });
</script>

<template>
  <div class="flex min-h-0 min-w-0 flex-col">
    <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <span class="text-xs font-medium text-muted-foreground">试验项目标准</span>
      <span class="mx-1 h-4 w-px bg-border" />
      <span class="ml-auto" />
      <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="placeholder('从模板选择')">
        <IconTemplate class="h-3 w-3" />从模板选择
      </Button>
      <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="placeholder('保存为模板')">
        <IconTemplate class="h-3 w-3" />保存为模板
      </Button>
    </div>
    <div class="grid min-h-0 flex-1 grid-cols-[2fr_4px_5fr] overflow-hidden">
      <div class="flex min-h-0 min-w-0 flex-col">
        <div class="flex h-7 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs text-muted-foreground">添加试验子项目</span>
          <IconChevronRight class="ml-auto h-3 w-3 text-muted-foreground" />
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="candColDefs" :row-data="candidates"
            :get-row-id="(p: any) => String(p.data.id ?? p.data.testSubItemCode)"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            :pagination="false" @grid-ready="onGridReady('l')" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </div>
      <div class="bg-border" />
      <div class="flex min-h-0 min-w-0 flex-col">
        <div class="flex h-7 shrink-0 items-center border-b border-border/60 px-2">
          <IconChevronLeft class="mr-auto h-3 w-3 text-muted-foreground" />
          <span class="text-xs text-muted-foreground">{{ title }}</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="selColDefs" :row-data="selected"
            :get-row-id="(p: any) => String(p.data.id)"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            :pagination="false" @grid-ready="onGridReady('r')" @first-data-rendered="autoSizeOnFirstData"
            @cell-value-changed="onValueChanged" @cell-clicked="onCellClicked" />
        </div>
      </div>
    </div>
  </div>
</template>
