<script setup lang="ts">
/** 对应 FrmYD2000Zhb（中厚板原料统计）：DDH.Winforms.SYD.Forms.FrmYD2000Zhb
 *  已接入：btnQuery_Click → tyd2000Api.queryZhbSlabHz(熔炼号 txtPiece.Text)（标量入参走 params）
 *          gridView1_FocusedRowObjectChanged → 取该行 ZhbSlabHzDto.Tyd2000Dtos 直接作为明细数据源（无二次请求）
 *  待接入：无
 *  偏差：切边方式原为 KeyValueFormatters.CUTFLAG 换算，web 侧显示原值；
 *  gridView1/gridView2 的 ShowFooter 汇总行（合计支数/重量、件次号计数）改为各表底部 h-7 横条呈现；
 *  原 SplitContainerControl 左右分栏（SplitterPosition=670/1750）以 Splitter 38%/62% 等效；
 *  Designer 中声明但未加入 Controls 的 kuqu1（库区）、bscInput 未迁移；
 *  明细列 PLAN_* 前缀字段（剪切计划规格/轧制厚宽长/订单号1-6/套切长度1-6）按 JSON 首字母小写规则取
 *  pLAN_* 键，syd.swagger.ts 的 Tyd2000Dto 未声明这些字段，故 colDefs 直接以字符串 field 绑定 */

import { computed, ref, shallowRef } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { tyd2000Api, type Tyd2000Dto, type ZhbSlabHzDto } from "@/api/mes4ddh/syd.swagger";

const theme = makeHmxGridTheme();

/* ---------- 查询条件（原 txtPiece，标签「熔炼号」；Load 不自动查询） ---------- */
const pieceNo = ref("");

/* ---------- 主表（gridControl1 / gridView1 / ZhbSlabHzDto） ---------- */
const masterRows = shallowRef<ZhbSlabHzDto[]>([]);
const detailRows = shallowRef<Tyd2000Dto[]>([]);
const loading = ref(false);
const api1 = ref<GridApi | null>(null);
const api2 = ref<GridApi | null>(null);
function onReady1(e: GridReadyEvent) {
  api1.value = e.api;
}
function onReady2(e: GridReadyEvent) {
  api2.value = e.api;
}

const masterColDefs: ColDef[] = [
  { colId: "cType", field: "cType", headerName: "类型", width: 150 },
  { colId: "nNum", field: "nNum", headerName: "总支数", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "总重量", width: 150 },
];

const detailColDefs: ColDef[] = [
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 150 },
  { colId: "nProType", field: "nProType", headerName: "库存分类", width: 150 },
  { colId: "cPrintCode", field: "cPrintCode", headerName: "喷号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "nKSgCode", field: "nKSgCode", headerName: "国标钢种", width: 150 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 150 },
  { colId: "nWth", field: "nWth", headerName: "宽度", width: 150 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 150 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "实重", width: 150 },
  { colId: "dInTime", field: "dInTime", headerName: "入库时间", width: 150 },
  { colId: "cInUser", field: "cInUser", headerName: "入库人", width: 150 },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", width: 150 },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 150 },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 150 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 150 },
  { colId: "nQmStatus", field: "nQmStatus", headerName: "质量状态", width: 150 },
  { colId: "nLockReason", field: "nLockReason", headerName: "质量封锁原因", width: 150 },
  { colId: "nQmLevel", field: "nQmLevel", headerName: "质量等级", width: 150 },
  { colId: "cSurfaceResult", field: "cSurfaceResult", headerName: "表检结果", width: 150 },
  { colId: "cCutFlag", field: "cCutFlag", headerName: "切边方式", width: 150 },
  { colId: "cPlanTime", field: "cPlanTime", headerName: "计划日期", width: 150 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 150 },
  { colId: "cBilletTypeCode", field: "cBilletTypeCode", headerName: "铸坯标识", width: 150 },
  { colId: "pLAN_CSpec", field: "pLAN_CSpec", headerName: "剪切计划规格", width: 150 },
  { colId: "pLAN_NThickPlan", field: "pLAN_NThickPlan", headerName: "轧制厚", width: 150 },
  { colId: "pLAN_NWidthPlan", field: "pLAN_NWidthPlan", headerName: "轧制宽", width: 150 },
  { colId: "pLAN_NLlCleanLen", field: "pLAN_NLlCleanLen", headerName: "轧制长", width: 150 },
  { colId: "cOrderCustCname", field: "cOrderCustCname", headerName: "订货客户中文名称", width: 150 },
  { colId: "pLAN_COrderNo1", field: "pLAN_COrderNo1", headerName: "订单号1", width: 150 },
  { colId: "pLAN_COrderNo2", field: "pLAN_COrderNo2", headerName: "订单号2", width: 150 },
  { colId: "pLAN_COrderNo3", field: "pLAN_COrderNo3", headerName: "订单号3", width: 150 },
  { colId: "pLAN_COrderNo4", field: "pLAN_COrderNo4", headerName: "订单号4", width: 150 },
  { colId: "pLAN_COrderNo5", field: "pLAN_COrderNo5", headerName: "订单号5", width: 150 },
  { colId: "pLAN_COrderNo6", field: "pLAN_COrderNo6", headerName: "订单号6", width: 150 },
  { colId: "pLAN_NLenPlan1", field: "pLAN_NLenPlan1", headerName: "套切长度1", width: 150 },
  { colId: "pLAN_NLenPlan2", field: "pLAN_NLenPlan2", headerName: "套切长度2", width: 150 },
  { colId: "pLAN_NLenPlan3", field: "pLAN_NLenPlan3", headerName: "套切长度3", width: 150 },
  { colId: "pLAN_NLenPlan4", field: "pLAN_NLenPlan4", headerName: "套切长度4", width: 150 },
  { colId: "pLAN_NLenPlan5", field: "pLAN_NLenPlan5", headerName: "套切长度5", width: 150 },
  { colId: "pLAN_NLenPlan6", field: "pLAN_NLenPlan6", headerName: "套切长度6", width: 150 },
  { colId: "nBoarCleanLen", field: "nBoarCleanLen", headerName: "母板净长", width: 150 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 150 },
  { colId: "nDbc", field: "nDbc", headerName: "倍尺", width: 150 },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150, hide: true },
  { colId: "dProTime", field: "dProTime", headerName: "产出时间", width: 150, hide: true },
  { colId: "cProUser", field: "cProUser", headerName: "产出人", width: 150, hide: true },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "产出班次", width: 150, hide: true },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "产出班组", width: 150, hide: true },
  { colId: "cSourceStoreCode", field: "cSourceStoreCode", headerName: "原库区号", width: 150, hide: true },
  { colId: "cSourceStackNo", field: "cSourceStackNo", headerName: "原垛位号", width: 150, hide: true },
  { colId: "cSourceStackNum", field: "cSourceStackNum", headerName: "原层号", width: 150, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "库存状态", width: 150, hide: true },
  { colId: "cIsHot", field: "cIsHot", headerName: "热送区分", width: 150, hide: true },
  { colId: "nCastDivCode", field: "nCastDivCode", headerName: "模连铸标识", width: 150, hide: true },
  { colId: "cLockedLine", field: "cLockedLine", headerName: "占用产线", width: 150, hide: true },
  { colId: "cLockedPlan", field: "cLockedPlan", headerName: "占用计划", width: 150, hide: true },
  { colId: "cMatType", field: "cMatType", headerName: "产品大类", width: 150, hide: true },
  { colId: "cProdCode", field: "cProdCode", headerName: "品名", width: 150, hide: true },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢类", width: 150, hide: true },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态", width: 150, hide: true },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 150, hide: true },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150, hide: true },
  { colId: "cOrderNoLast", field: "cOrderNoLast", headerName: "原始订单号", width: 150, hide: true },
  { colId: "cDestination", field: "cDestination", headerName: "去向", width: 150, hide: true },
  { colId: "cHotNo", field: "cHotNo", headerName: "退火炉回号", width: 150, hide: true },
  { colId: "cSlabType", field: "cSlabType", headerName: "坯类", width: 150, hide: true },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 150, hide: true },
  { colId: "cIsSurface", field: "cIsSurface", headerName: "是否表检", width: 150, hide: true },
  { colId: "cSurfaceDefectCode", field: "cSurfaceDefectCode", headerName: "表面缺陷代码", width: 150, hide: true },
  { colId: "cSurfaceDesc", field: "cSurfaceDesc", headerName: "表检描述", width: 150, hide: true },
  { colId: "cSurfaceUser", field: "cSurfaceUser", headerName: "表面判定人", width: 150, hide: true },
  { colId: "dSurfaceTime", field: "dSurfaceTime", headerName: "表面判定时间", width: 150, hide: true },
  { colId: "cDetectResultCode", field: "cDetectResultCode", headerName: "探伤判定结果", width: 150, hide: true },
  { colId: "cDetectDefectLevel", field: "cDetectDefectLevel", headerName: "探伤等级", width: 150, hide: true },
  { colId: "cDefectDefectCode", field: "cDefectDefectCode", headerName: "探伤判定缺陷代码", width: 150, hide: true },
  { colId: "cDefectDefectMark", field: "cDefectDefectMark", headerName: "探伤判定缺陷描述", width: 150, hide: true },
  { colId: "cDefectUser", field: "cDefectUser", headerName: "表面判定人", width: 150, hide: true },
  { colId: "dDefectTime", field: "dDefectTime", headerName: "表面判定时间", width: 150, hide: true },
  { colId: "cComplexDecideCode", field: "cComplexDecideCode", headerName: "综判结果", width: 150, hide: true },
  { colId: "cComplexDesc", field: "cComplexDesc", headerName: "综判描述", width: 150, hide: true },
  { colId: "cComplexUser", field: "cComplexUser", headerName: "综判人", width: 150, hide: true },
  { colId: "dComplexTime", field: "dComplexTime", headerName: "综判时间", width: 150, hide: true },
  { colId: "cQmHandleCode", field: "cQmHandleCode", headerName: "处置结果", width: 150, hide: true },
  { colId: "cQmHandleDesc", field: "cQmHandleDesc", headerName: "处置注释", width: 150, hide: true },
  { colId: "cQmHandleUser", field: "cQmHandleUser", headerName: "处置人", width: 150, hide: true },
  { colId: "dQmHandleTime", field: "dQmHandleTime", headerName: "处置时间", width: 150, hide: true },
  { colId: "cSampleLotNo", field: "cSampleLotNo", headerName: "试批号", width: 150, hide: true },
  { colId: "cSampleLotNoPre", field: "cSampleLotNoPre", headerName: "前试批号", width: 150, hide: true },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 150, hide: true },
  { colId: "cWgtToler", field: "cWgtToler", headerName: "公差等级", width: 150, hide: true },
  { colId: "cSpecialMarkGy", field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 150, hide: true },
];

/* ---------- 页脚汇总（原 ShowFooter + Summary） ---------- */
function fmt(v: number, digits: number) {
  return String(Number(v.toFixed(digits)));
}
const masterNumSum = computed(() =>
  fmt(
    masterRows.value.reduce((s, r) => s + (r.nNum ?? 0), 0),
    2,
  ),
);
const masterWgtSum = computed(() =>
  fmt(
    masterRows.value.reduce((s, r) => s + (r.nWgt ?? 0), 0),
    2,
  ),
);
const detailCount = computed(() => detailRows.value.length);
const detailNumSum = computed(() =>
  fmt(
    detailRows.value.reduce((s, r) => s + (r.nNum ?? 0), 0),
    2,
  ),
);
const detailWgtSum = computed(() =>
  fmt(
    detailRows.value.reduce((s, r) => s + (r.nWgt ?? 0), 0),
    3,
  ),
);

/* ---------- gridView1_FocusedRowObjectChanged（web 侧以单选行变更等效） ---------- */
function onMasterSelectionChanged() {
  const item = api1.value?.getSelectedNodes()[0]?.data as ZhbSlabHzDto | undefined;
  /* 原逻辑：item == null 直接 return，保留上次明细 */
  if (!item) return;
  detailRows.value = item.tyd2000Dtos ?? [];
  requestAnimationFrame(() => api2.value?.autoSizeAllColumns());
}

/* 原 GridView 换数据源后焦点落到首行并触发 FocusedRowObjectChanged */
function selectFirstMaster() {
  let first = true;
  api1.value?.forEachNode((n) => {
    if (first) {
      n.setSelected(true, false);
      first = false;
    }
  });
}

/* ---------- btnQuery_Click ---------- */
async function query() {
  loading.value = true;
  try {
    masterRows.value = (await tyd2000Api.queryZhbSlabHz(pieceNo.value)) ?? [];
    /* 明细直接取首行的 Tyd2000Dtos 子集合（原逻辑由焦点行事件驱动） */
    detailRows.value = masterRows.value[0]?.tyd2000Dtos ?? [];
    requestAnimationFrame(() => {
      api1.value?.autoSizeAllColumns();
      api2.value?.autoSizeAllColumns();
      if (masterRows.value.length) selectFirstMaster();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="pieceNo" placeholder="熔炼号" class="w-44 shrink-0" @keydown.enter="query" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>
    <Splitter class="min-h-0 flex-1">
      <SplitterPanel :size="38" :min-size="20" class="flex min-h-0 flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :default-col-def="hmxDefaultColDef"
            :column-defs="masterColDefs"
            :row-data="masterRows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="loading"
            @grid-ready="onReady1"
            @selection-changed="onMasterSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
        <div class="flex h-7 shrink-0 items-center gap-2 border-t border-border/60 px-3">
          <span class="text-xs text-muted-foreground">合计支数：{{ masterNumSum }}</span>
          <span class="text-xs text-muted-foreground">合计重量：{{ masterWgtSum }}</span>
        </div>
      </SplitterPanel>
      <SplitterPanel :size="62" :min-size="20" class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">材料明细</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :default-col-def="hmxDefaultColDef"
            :column-defs="detailColDefs"
            :row-data="detailRows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="loading"
            @grid-ready="onReady2"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
        <div class="flex h-7 shrink-0 items-center gap-2 border-t border-border/60 px-3">
          <span class="text-xs text-muted-foreground">件数：{{ detailCount }}</span>
          <span class="text-xs text-muted-foreground">合计支数：{{ detailNumSum }}</span>
          <span class="text-xs text-muted-foreground">合计重量：{{ detailWgtSum }}</span>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
