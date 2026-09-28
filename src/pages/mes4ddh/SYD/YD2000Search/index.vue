<script setup lang="ts">
/** 对应 FrmYD2000Search（材料履历查询，菜单代码 YD4000）：DDH.Winforms.SYD.Forms.FrmYD2000Search
 *  已接入：tyd2000Api.queryStorageRecord（主表查询）+ queryRecords(pieceNo)（主行变化拉履历子表）
 *  待接入：无二级弹窗
 *  布局：查询区(5条件+查询) → 上下Splitter：上=库存(Tyd2000Dto 72可见+8 hide) | 下=履历(Tyd2000Record 77可见+10 hide) */
import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { tyd2000Api, type Tyd2000Dto, type Tyd2000Record } from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* 主表（原 gridView1，Tyd2000Dto 72 可见 + 8 hide） */
const mainColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cStove", headerName: "炉号", width: 110 },
  { field: "cPieceNo", headerName: "件次号", width: 150 },
  { field: "cSgCode", headerName: "钢种", width: 110 },
  { field: "cSgStd", headerName: "执行标准", width: 130 },
  { field: "cSpec", headerName: "规格", width: 140 },
  { field: "nWgt", headerName: "实重", width: 100 },
  { field: "cOrderNo", headerName: "订单号", width: 150 },
  { field: "ccusName", headerName: "客户名称", width: 150 },
  { field: "cStoreCode", headerName: "库区号", width: 120 },
  { field: "cStackNo", headerName: "垛位号", width: 110 },
  { field: "cInboundNo", headerName: "入库标识", width: 120 },
  { field: "cStackNum", headerName: "层号", width: 80 },
  { field: "cDelivyAddress", headerName: "流向", width: 130 },
  { field: "nStatus", headerName: "库存状态", width: 110 },
  { field: "cCutFlag", headerName: "切边方式", width: 110 },
  { field: "nThick", headerName: "厚度", width: 90 },
  { field: "nWth", headerName: "宽度", width: 90 },
  { field: "nLen", headerName: "长度", width: 90 },
  { field: "nNum", headerName: "支数", width: 90 },
  { field: "cLineCode", headerName: "产线", width: 100 },
  { field: "dProTime", headerName: "产出时间", width: 170 },
  { field: "cProUser", headerName: "产出人", width: 110 },
  { field: "cShiftNo", headerName: "产出班次", width: 110 },
  { field: "cGroupNo", headerName: "产出班组", width: 110 },
  { field: "dInTime", headerName: "入库时间", width: 170 },
  { field: "cInUser", headerName: "入库人", width: 110 },
  { field: "cSourceStoreCode", headerName: "原库区号", width: 120 },
  { field: "cSourceStackNo", headerName: "原垛位号", width: 120 },
  { field: "cSourceStackNum", headerName: "原层号", width: 100 },
  { field: "cIsHot", headerName: "热送区分", width: 110 },
  { field: "cProRemark", headerName: "生产备注", width: 150 },
  { field: "nCastDivCode", headerName: "模连铸标识", width: 130 },
  { field: "cLockedLine", headerName: "占用产线", width: 110 },
  { field: "cLockedPlan", headerName: "占用计划", width: 130 },
  { field: "cMatType", headerName: "产品大类", width: 110 },
  { field: "cSteelType", headerName: "钢类", width: 100 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 110 },
  { field: "cCustStdCode", headerName: "加工用途代码", width: 140 },
  { field: "cBatchNo", headerName: "批号", width: 120 },
  { field: "cOrderNoLast", headerName: "原始订单号", width: 150 },
  { field: "cDestination", headerName: "去向", width: 120 },
  { field: "cHotNo", headerName: "退火炉回号", width: 130 },
  { field: "cSlabType", headerName: "坯类", width: 100 },
  { field: "cPieceNoSlab", headerName: "板坯号", width: 140 },
  { field: "nQmStatus", headerName: "质量状态", width: 110 },
  { field: "nLockReason", headerName: "质量封锁原因", width: 140 },
  { field: "nQmLevel", headerName: "质量等级", width: 110 },
  { field: "cIsSurface", headerName: "是否表检", width: 110 },
  { field: "cSurfaceResult", headerName: "表检结果", width: 110 },
  { field: "cSurfaceDefectCode", headerName: "表面缺陷代码", width: 150 },
  { field: "cSurfaceDesc", headerName: "表检描述", width: 150 },
  { field: "cSurfaceUser", headerName: "表面判定人", width: 130 },
  { field: "dSurfaceTime", headerName: "表面判定时间", width: 170 },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 140 },
  { field: "cDefectDefectCode", headerName: "探伤判定缺陷代码", width: 170 },
  { field: "cDefectDefectMark", headerName: "探伤判定缺陷描述", width: 170 },
  { field: "cDefectUser", headerName: "表面判定人", width: 130 },
  { field: "dDefectTime", headerName: "表面判定时间", width: 170 },
  { field: "cComplexDecideCode", headerName: "综判结果", width: 110 },
  { field: "cComplexDesc", headerName: "综判描述", width: 150 },
  { field: "cComplexUser", headerName: "综判人", width: 110 },
  { field: "dComplexTime", headerName: "综判时间", width: 170 },
  { field: "cQmHandleCode", headerName: "处置结果", width: 110 },
  { field: "cQmHandleDesc", headerName: "处置注释", width: 150 },
  { field: "cQmHandleUser", headerName: "处置人", width: 110 },
  { field: "dQmHandleTime", headerName: "处置时间", width: 170 },
  { field: "cSampleLotNo", headerName: "试批号", width: 130 },
  { field: "cSampleLotNoPre", headerName: "前试批号", width: 130 },
  { field: "cPrintCode", headerName: "喷号", width: 130 },
  { field: "cProdCode", headerName: "品名", width: 110 },
  { field: "cWgtToler", headerName: "公差等级", width: 110 },
  { field: "cDetectDefectLevel", headerName: "探伤等级", width: 110, flex: 1 },
  /* 隐藏列 */
  { field: "cProc", headerName: "工序代码", hide: true },
  { field: "cMachine", headerName: "机台号", hide: true },
  { field: "cStrandNo", headerName: "流号", hide: true },
  { field: "cPlanId", headerName: "计划号", hide: true },
  { field: "cConNo", headerName: "合同号", hide: true },
  { field: "cMatCode", headerName: "物料编码", hide: true },
  { field: "nCalWgt", headerName: "理重", hide: true },
]);

/* 子表（原 gridView2，Tyd2000Record 77 可见 + 10 hide） */
const recColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cRecordRemark", headerName: "履历备注", width: 200 },
  { field: "creator", headerName: "创建人", width: 100 },
  { field: "createTime", headerName: "创建时间", width: 170 },
  { field: "cStove", headerName: "炉号", width: 110 },
  { field: "cPieceNo", headerName: "件次号", width: 150 },
  { field: "cOrderNo", headerName: "订单号", width: 150 },
  { field: "ccusName", headerName: "客户名称", width: 150 },
  { field: "cSgCode", headerName: "钢种", width: 110 },
  { field: "cSgStd", headerName: "执行标准", width: 130 },
  { field: "nThick", headerName: "厚度", width: 90 },
  { field: "nWth", headerName: "宽度", width: 90 },
  { field: "nLen", headerName: "长度", width: 90 },
  { field: "cSpec", headerName: "规格", width: 140 },
  { field: "nNum", headerName: "支数", width: 90 },
  { field: "nCalWgt", headerName: "理重", width: 100 },
  { field: "nWgt", headerName: "实重", width: 100 },
  { field: "dProTime", headerName: "产出时间", width: 170 },
  { field: "cProUser", headerName: "产出人", width: 110 },
  { field: "cShiftNo", headerName: "产出班次", width: 110 },
  { field: "cGroupNo", headerName: "产出班组", width: 110 },
  { field: "dInTime", headerName: "入库时间", width: 170 },
  { field: "cInUser", headerName: "入库人", width: 110 },
  { field: "cStoreCode", headerName: "库区号", width: 120 },
  { field: "cStackNo", headerName: "垛位号", width: 110 },
  { field: "cStackNum", headerName: "层号", width: 80 },
  { field: "cSourceStoreCode", headerName: "原库区号", width: 120 },
  { field: "cSourceStackNo", headerName: "原垛位号", width: 120 },
  { field: "cSourceStackNum", headerName: "原层号", width: 100 },
  { field: "nStatus", headerName: "库存状态", width: 110 },
  { field: "cIsHot", headerName: "热送区分", width: 110 },
  { field: "cProRemark", headerName: "生产备注", width: 150 },
  { field: "nCastDivCode", headerName: "模连铸标识", width: 130 },
  { field: "cLockedLine", headerName: "占用产线", width: 110 },
  { field: "cLockedPlan", headerName: "占用计划", width: 130 },
  { field: "cMatType", headerName: "产品大类", width: 110 },
  { field: "cSteelType", headerName: "钢类", width: 100 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 110 },
  { field: "cCustStdCode", headerName: "加工用途代码", width: 140 },
  { field: "cBatchNo", headerName: "批号", width: 120 },
  { field: "cOrderNoLast", headerName: "原始订单号", width: 150 },
  { field: "cDestination", headerName: "去向", width: 120 },
  { field: "cHotNo", headerName: "退火炉回号", width: 130 },
  { field: "cSlabType", headerName: "坯类", width: 100 },
  { field: "cPieceNoSlab", headerName: "板坯号", width: 140 },
  { field: "cPrintCode", headerName: "喷印号", width: 130 },
  { field: "cProdCode", headerName: "品名", width: 110 },
  { field: "nQmStatus", headerName: "质量状态", width: 110 },
  { field: "nLockReason", headerName: "质量封锁原因", width: 140 },
  { field: "nQmLevel", headerName: "质量等级", width: 110 },
  { field: "cIsSurface", headerName: "是否表检", width: 110 },
  { field: "cSurfaceResult", headerName: "表检结果", width: 110 },
  { field: "cSurfaceDefectCode", headerName: "表面缺陷代码", width: 150 },
  { field: "cSurfaceDesc", headerName: "表检描述", width: 150 },
  { field: "cSurfaceUser", headerName: "表面判定人", width: 130 },
  { field: "dSurfaceTime", headerName: "表面判定时间", width: 170 },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 140 },
  { field: "cDefectDefectCode", headerName: "探伤判定缺陷代码", width: 170 },
  { field: "cDefectDefectMark", headerName: "探伤判定缺陷描述", width: 170 },
  { field: "cDefectUser", headerName: "探伤判定人", width: 130 },
  { field: "dDefectTime", headerName: "探伤判定时间", width: 170 },
  { field: "cComplexDecideCode", headerName: "综判结果", width: 110 },
  { field: "cComplexDesc", headerName: "综判描述", width: 150 },
  { field: "cComplexUser", headerName: "综判人", width: 110 },
  { field: "dComplexTime", headerName: "综判时间", width: 170 },
  { field: "cQmHandleCode", headerName: "处置结果", width: 110 },
  { field: "cQmHandleDesc", headerName: "处置注释", width: 150 },
  { field: "cQmHandleUser", headerName: "处置人", width: 110 },
  { field: "dQmHandleTime", headerName: "处置时间", width: 170 },
  { field: "cSampleLotNo", headerName: "试批号", width: 130 },
  { field: "cSampleLotNoPre", headerName: "前试批号", width: 130 },
  { field: "cDetectDefectLevel", headerName: "探伤等级", width: 110 },
  { field: "cCutFlag", headerName: "切边方式", width: 110 },
  { field: "cInboundNo", headerName: "入库标识", width: 120 },
  { field: "cDelivyAddress", headerName: "流向", width: 130 },
  { field: "cWgtToler", headerName: "重量偏差等级", width: 140 },
  { field: "dTimestamp", headerName: "时间戳", width: 140 },
  { field: "cBilletTypeCode", headerName: "铸坯标识", width: 120, flex: 1 },
  /* 隐藏列 */
  { field: "id", headerName: "主键", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cLineCode", headerName: "产线", hide: true },
  { field: "cProc", headerName: "工序代码", hide: true },
  { field: "cMachine", headerName: "机台号", hide: true },
  { field: "cPlanNo", headerName: "计划号", hide: true },
  { field: "cConNo", headerName: "合同号", hide: true },
  { field: "cMatCode", headerName: "物料编码", hide: true },
]);

const q = reactive({ cStove: "", cBatchNo: "", cPieceNo: "", cInboundNo: "", pieceNos: "" });

const rows = ref<Tyd2000Dto[]>([]);
const records = ref<Tyd2000Record[]>([]);
const querying = ref(false);
const mainApi = ref<GridApi | null>(null);
const recApi = ref<GridApi | null>(null);

function onMainReady(e: GridReadyEvent) {
  mainApi.value = e.api;
}
function onRecReady(e: GridReadyEvent) {
  recApi.value = e.api;
}

/* btnQuery → QueryStorageRecord */
async function onQuery() {
  querying.value = true;
  try {
    const list = ((await tyd2000Api.queryStorageRecord({
      cStove: q.cStove || null,
      cBatchNo: q.cBatchNo || null,
      cPieceNo: q.cPieceNo || null,
      cInboundNo: q.cInboundNo || null,
      // 批量材料号（原 txtPieceNos 多行）
      cPieceNos: q.pieceNos ? q.pieceNos.split(/[\s,，;；]+/).filter(Boolean) : null,
    })) ?? []) as Tyd2000Dto[];
    rows.value = list;
    records.value = [];
    mainApi.value?.setGridOption("rowData", list);
    recApi.value?.setGridOption("rowData", []);
    requestAnimationFrame(() => mainApi.value?.autoSizeAllColumns());
    if (!list.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 主行变化 → QueryRecords(pieceNo) */
async function onMainSelectionChanged() {
  const row = (mainApi.value?.getSelectedNodes()[0]?.data as Tyd2000Dto | undefined) ?? null;
  if (!row?.cPieceNo) {
    records.value = [];
    recApi.value?.setGridOption("rowData", []);
    return;
  }
  try {
    const list = ((await tyd2000Api.queryRecords(row.cPieceNo)) ?? []) as Tyd2000Record[];
    records.value = list;
    recApi.value?.setGridOption("rowData", list);
    requestAnimationFrame(() => recApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl1：5 条件） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="q.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="q.cBatchNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">材料号</label>
        <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
        <InputText v-model="q.cInboundNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批量材料号</label>
        <InputText v-model="q.pieceNos" class="min-w-0 flex-1" placeholder="空格/逗号分隔" @keydown.enter="onQuery" />
      </div>
      <div class="flex items-center">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>

    <!-- 上下分栏（原 SplitterControl：上=库存 / 下=履历） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="55" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">库存材料</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="mainColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="rows"
            :locale-text="AG_GRID_LOCALE_CN"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onMainReady"
            @selection-changed="onMainSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="45" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">材料履历（{{ records.length }}）</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="recColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="records"
            :locale-text="AG_GRID_LOCALE_CN"
            :pagination="false"
            :animate-rows="false"
            @grid-ready="onRecReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
