<script setup lang="ts">
/** UCMscTqmtmt1EditView（试验项目要求）：左候选 TestItemDto（常驻搜索）→ >> → 右已选 Tqmtmt1（52列）→ << 移除
 *  已接入：testItemApi.queryTestItems；querySysKvItemList(A0100:QM45/QMQL) 取样位置/取样长度码表联动回填
 *  待接入：从模板选择/保存为模板（FrmSaveIdxData）占位；>> << 为原 GridDataMoveHelper 的 unbound 列（colId xfer-in/out） */
import { onMounted, ref, shallowRef, watch } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconChevronLeft, IconChevronRight, IconTemplate } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { testItemApi, type TestItemDto, YesNo, CertiReq } from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { NextStrId } from "@/lib/yitIdHelper";
import { type IdxRow, type Tqmtmt1Idx } from "./mscVm";
import { useToast } from "@/composables/useToast";

const props = defineProps<{ idx: Tqmtmt1Idx | null }>();
const emit = defineEmits<{ "data-changed": [] }>();
const { toast } = useToast();
const theme = makeHmxGridTheme();

const candidates = shallowRef<TestItemDto[]>([]);
const selected = shallowRef<IdxRow[]>([]);
const leftApi = ref<GridApi | null>(null);
const rightApi = ref<GridApi | null>(null);
const quickFilter = ref("");
const kv45 = ref(new Map<string, string>());
const kvql = ref(new Map<string, string>());

const leftAddCol: ColDef = {
  colId: "xfer-in",
  headerName: ">>",
  width: 52,
  minWidth: 52,
  maxWidth: 52,
  sortable: false,
  filter: false,
  editable: false,
  onCellClicked: (p) => addRow(p.data as TestItemDto),
  onCellDoubleClicked: (p) => addRow(p.data as TestItemDto),
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
  { field: "testItemName", headerName: "试验项目名称", width: 150 },
  { field: "testItemCode", headerName: "试验项目代码", width: 130 },
  { field: "testItemTypeDesc", headerName: "试验项目种类说明", width: 150 },
  { field: "testItemType", headerName: "试验项目种类", width: 120 },
  leftAddCol,
];
const kvFmt = (get: () => Map<string, string>) => (p: { value: unknown }) => get().get(String(p.value ?? "")) ?? String(p.value ?? "");
const selColDefs: ColDef[] = [
  rightRemoveCol,
  { field: "diaFrom", headerName: "外径起", width: 96 },
  { field: "diaTo", headerName: "外径止", width: 96 },
  { field: "indmFrom", headerName: "内径起", width: 96 },
  { field: "indmTo", headerName: "内径止", width: 96 },
  { field: "thickMin", headerName: "厚度(外径)下限", width: 130 },
  { field: "thickMax", headerName: "厚度(外径)上限", width: 130 },
  { field: "widthMin", headerName: "宽度下限", width: 104 },
  { field: "widthMax", headerName: "宽度上限", width: 104 },
  { field: "lengthMin", headerName: "最小长度", width: 99 },
  { field: "lengthMax", headerName: "最大长度1", width: 104 },
  { field: "testItemType", headerName: "试验项目种类", width: 120 },
  { field: "testItemTypeDesc", headerName: "试验项目种类说明", width: 150 },
  { field: "testItemCode", headerName: "试验项目代码", width: 130 },
  { field: "testItemName", headerName: "试验项目名称", width: 150 },
  { field: "testNum", headerName: "试验项目组数", width: 125 },
  { field: "sampleNumRnd", headerName: "取样个数", width: 112, editable: true },
  { field: "samplePosCode", headerName: "取样位置代码", width: 138, editable: true },
  { field: "samplePos", headerName: "取样位置", width: 112, valueFormatter: kvFmt(() => kv45.value) },
  { field: "sampleLen", headerName: "取样长度", width: 112, editable: true },
  { field: "sampleLenDesc", headerName: "取样长度说明", width: 138, valueFormatter: kvFmt(() => kvql.value) },
  { field: "retestMulti", headerName: "复验倍数", width: 99 },
  { field: "replaceSampleCode", headerName: "代样指示", width: 125 },
  { field: "certiIndicate", headerName: "是否列印", width: 99, editable: true },
  { field: "certiItemNum", headerName: "列印项目组数", width: 138, editable: true },
  { field: "certiItemCode", headerName: "列印项目代码", width: 138 },
  { field: "certiItemCdesc", headerName: "列印项目中文描述", width: 164 },
  { field: "certiItemEdesc", headerName: "列印项目英文描述", width: 164 },
  { field: "certiItemReq", headerName: "列印项目要求", width: 138 },
  { field: "extItem3", headerName: "过程成品标识", width: 138 },
  { field: "remark", headerName: "备注", width: 86, editable: true },
  { field: "printSortCode", headerName: "列印分类", width: 112 },
  { field: "queryTableIdxNo", headerName: "试验子项索引", width: 138 },
  { field: "stdTestValue", headerName: "试验标准值", width: 125 },
  { field: "testPurposeCode", headerName: "试验目的代码", width: 138 },
  { field: "testPurpose", headerName: "试验目的说明", width: 138 },
  { field: "testUnitCode", headerName: "试验项目单位代码", width: 164 },
  { field: "testDirectCode", headerName: "试验方向代码", width: 138 },
  { field: "testDirect", headerName: "试验方向", width: 112 },
  { field: "testCndCode", headerName: "试验条件代码", width: 138 },
  { field: "testCnd", headerName: "试验条件描述", width: 138 },
  { field: "sampleProcReqCode", headerName: "试样加工要求代码", width: 164 },
  { field: "sampleProcReq", headerName: "试样加工要求", width: 138 },
  { field: "retestReqCode", headerName: "复验要求代码", width: 125 },
  { field: "retestReq", headerName: "复验要求", width: 112 },
  { field: "meltExamineFlag", headerName: "熔检指示", width: 112 },
  { field: "tensHeatYesno", headerName: "拉伸试验是否热处理", width: 164 },
  { field: "tensHeatReportYesno", headerName: "拉伸热处理工艺是否报出", width: 190 },
  { field: "heatReport", headerName: "热处理报告(扁钢是否发送项目标记)", width: 240 },
  { field: "testAdditionDesc", headerName: "试验补充说明", width: 151 },
  { field: "sampleReqCode", headerName: "取样要求代码", width: 138 },
  { field: "sampleReq", headerName: "取样要求", width: 112 },
  // 隐藏列（原 Designer 未排 VisibleIndex）
  { field: "idxNo", headerName: "索引号", width: 99, hide: true },
  { field: "seqNo", headerName: "序号", width: 86, hide: true },
  { field: "pchJudgeReq", headerName: "理化判定要求(精密字段，用于成品成分判定)", width: 240, hide: true },
  { field: "formNo", headerName: "画面代号", width: 112, hide: true },
  { field: "version", headerName: "版次", width: 86, hide: true },
  { field: "archiveFlag", headerName: "归档标记", width: 112, hide: true },
  { field: "factoryId", headerName: "制造厂别", width: 112, hide: true },
  { field: "tableCode", headerName: "表代码", width: 112, hide: true },
  { field: "id", headerName: "主键", width: 86, hide: true },
];

function refresh() {
  selected.value = props.idx ? [...props.idx.idxDetails.getT1()] : [];
}
watch(() => props.idx, refresh, { immediate: true });
watch(quickFilter, (v) => leftApi.value?.setGridOption("quickFilterText", v));

onMounted(async () => {
  try {
    candidates.value = (await testItemApi.queryTestItems()) ?? [];
  } catch {
    /* 拦截层已 toast */
  }
  try {
    const [a, b] = await Promise.all([
      systemKeyValueApi.querySysKvItemList("A0100:QM45"),
      systemKeyValueApi.querySysKvItemList("A0100:QMQL"),
    ]);
    kv45.value = new Map((a ?? []).filter((x) => x.cCode).map((x) => [x.cCode as string, x.cName ?? ""]));
    kvql.value = new Map((b ?? []).filter((x) => x.cCode).map((x) => [x.cCode as string, x.cName ?? ""]));
  } catch {
    /* 拦截层已 toast */
  }
});

/** 原 OnAdd(TestItemDto)：按候选行实例化 Tqmtmt1 并 Idx.AddIdxData（SeqNo 取已有最大+10，按种类排序） */
function addRow(item: TestItemDto) {
  const idx = props.idx;
  if (!item || !idx) return;
  const exists = idx.idxDetails.getT1();
  const maxSeq = exists.reduce((m, r) => Math.max(m, r.seqNo ?? 0), 0);
  const row: IdxRow = {
    id: NextStrId(),
    tableCode: "TQMTMT1",
    testItemCode: item.testItemCode,
    testItemName: item.testItemName,
    testItemType: item.testItemType,
    testItemTypeDesc: item.testItemTypeDesc,
    certiItemEdesc: item.testItemEName,
    certiIndicate: YesNo.Y,
    certiItemReq: CertiReq.A,
    replaceSampleCode: "0",
    seqNo: maxSeq + 10,
  } as IdxRow;
  idx.addIdxDataItem(row);
  emit("data-changed");
  refresh();
}
/** 原 OnRemove(Tqmtmt1) */
function removeRow(row: IdxRow) {
  if (!props.idx || !row) return;
  props.idx.removeIdxData(row);
  emit("data-changed");
  refresh();
}
function onRightChanged() {
  // 单元格编辑后的码表回填（原 GridView2_CellValueChanged）
  for (const r of selected.value) {
    if (r.samplePosCode != null) r.samplePos = kv45.value.get(String(r.samplePosCode)) ?? r.samplePos;
    if (r.sampleLen != null) r.sampleLenDesc = kvql.value.get(String(r.sampleLen)) ?? r.sampleLenDesc;
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
      <span class="text-xs font-medium text-muted-foreground">试验项目要求</span>
      <span class="mx-1 h-4 w-px bg-border" />
      <InputText v-model="quickFilter" placeholder="搜索" class="w-40" />
      <span class="ml-auto" />
      <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="placeholder('从模板选择')">
        <IconTemplate class="h-3 w-3" />从模板选择
      </Button>
      <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="placeholder('保存为模板')">
        <IconTemplate class="h-3 w-3" />保存为模板
      </Button>
    </div>
    <div class="grid min-h-0 flex-1 grid-cols-[3fr_4px_5fr] overflow-hidden">
      <div class="flex min-h-0 min-w-0 flex-col">
        <div class="flex h-7 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs text-muted-foreground">添加试验项目</span>
          <IconChevronRight class="ml-auto h-3 w-3 text-muted-foreground" />
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="candColDefs" :row-data="candidates"
            :get-row-id="(p: any) => String(p.data.id ?? p.data.testItemCode)"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            :pagination="false" @grid-ready="onGridReady('l')" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </div>
      <div class="bg-border" />
      <div class="flex min-h-0 min-w-0 flex-col">
        <div class="flex h-7 shrink-0 items-center border-b border-border/60 px-2">
          <IconChevronLeft class="mr-auto h-3 w-3 text-muted-foreground" />
          <span class="text-xs text-muted-foreground">已选试验项目要求</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="selColDefs" :row-data="selected"
            :get-row-id="(p: any) => String(p.data.id)"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            :pagination="false" @grid-ready="onGridReady('r')" @first-data-rendered="autoSizeOnFirstData"
            @cell-value-changed="onRightChanged" />
        </div>
      </div>
    </div>
  </div>
</template>
