<script setup lang="ts">
/** 对应 FrmTI1010（加热实绩明细）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1010
 *  已接入：tI1010Api.queryTi1010（原 Svc<ITI1010AppService>.Proxy.QueryTi1010(DtoTi1010Query)）
 *  查询条件（原 dataLayoutControl 11 个 LayoutControlItem）：销售合同 / 客户 / 组批号 / 板坯号 / 牌号 /
 *    计划号 / 班次(TiShiftNoEnum 早中夜) / 班组(甲乙丙=a b c) / 装炉时间(UCTimeRange) /
 *    订货厚(UCDecimalRange) / 订货宽(UCDecimalRange)
 *  列：75 可见 + CreateTime hide；列序列头对齐 Designer VisibleIndex；
 *    原 Selected 勾选列以 hide:true 保留，勾选由 AG Grid row-selection 复选框呈现（ui-rules §7）
 *  查询标签宽度全页统一 w-16（ui-rules §6 查询条件区）；原「销售合同号」「装炉时间范围」按整齐划一缩短为 4 字 */

import { ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import RangeInput from "@/components/common/RangeInput.vue";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { tI1010Api, type DtoTi1010Query, type Ti1010Dto } from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();

function startOfDay(offset: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
}

/* 班次：TiShiftNoEnum（早/中/夜，AddEnum(..., true) 允许空 → show-clear）
 * 班组：TiShiftGroupEnum（甲/乙/丙 = a/b/c，原 Load 手工 Add 三项） */
const shiftOptions = [
  { label: "早", value: 1 },
  { label: "中", value: 2 },
  { label: "夜", value: 3 },
];
const shiftGroupOptions = [
  { label: "甲", value: "a" },
  { label: "乙", value: "b" },
  { label: "丙", value: "c" },
];

/* 查询条件（原 bscTi1010QueryDto；Load: TimeRange = 今天 00:00 ~ 明天 00:00） */
const query = ref({
  cSaleCon: "",
  cCustName: "",
  cZpNo: "",
  cSlabNo: "",
  cCardNo: "",
  cPlanNo: "",
  cShiftNo: null as number | null,
  cShiftGroup: null as string | null,
  dates: [startOfDay(0), startOfDay(1)] as Date[] | null,
  thickMin: null as number | null,
  thickMax: null as number | null,
  widthMin: null as number | null,
  widthMax: null as number | null,
});

const rows = ref<Ti1010Dto[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

/* 列按 Designer VisibleIndex（含 Selected）；CreateTime 以 hide: true 迁入 */
const rawCols: ColDef[] = [
  { field: "selected", headerName: "选择", width: 112 },
  { field: "cCustName", headerName: "客户", width: 112 },
  { field: "cSaleCon", headerName: "销售合同号", width: 112 },
  { field: "cInboundNo", headerName: "入库标识", width: 112 },
  { field: "cTqCon1", headerName: "套切合同1", width: 112 },
  { field: "nWidthTq1", headerName: "套切宽度1", width: 112 },
  { field: "nLenTq1", headerName: "套切长度1", width: 112 },
  { field: "cStoreposNo1", headerName: "库位标识1", width: 112 },
  { field: "cTqCon2", headerName: "套切合同2", width: 112 },
  { field: "nWidthTq2", headerName: "套切宽度2", width: 112 },
  { field: "nLenTq2", headerName: "套切长度2", width: 112 },
  { field: "cStoreposNo2", headerName: "库位标识2", width: 112 },
  { field: "cTqCon3", headerName: "套切合同3", width: 112 },
  { field: "nWidthTq3", headerName: "套切宽度3", width: 112 },
  { field: "nLenTq3", headerName: "套切长度3", width: 112 },
  { field: "cStoreposNo3", headerName: "库位标识3", width: 112 },
  { field: "cTqCon4", headerName: "套切合同4", width: 112 },
  { field: "nWidthTq4", headerName: "套切宽度4", width: 112 },
  { field: "nLenTq4", headerName: "套切长度4", width: 112 },
  { field: "cStoreposNo4", headerName: "库位标识4", width: 112 },
  { field: "cZpNo", headerName: "组批号", width: 112 },
  { field: "cSlabNo", headerName: "板坯号", width: 112 },
  { field: "cCardNo", headerName: "牌号", width: 112 },
  { field: "cDelivyAddress", headerName: "流向", width: 112 },
  { field: "cTrimFlag", headerName: "切边标识", width: 112 },
  { field: "nSlabThick", headerName: "坯厚mm", width: 112 },
  { field: "nSlabWidth", headerName: "坯宽mm", width: 112 },
  { field: "nSlabLen", headerName: "坯长mm", width: 112 },
  { field: "nPlanSlabWgt", headerName: "计划坯重", width: 112 },
  { field: "nSlabWgt", headerName: "坯重", width: 112 },
  { field: "nStoveWgt", headerName: "炉前称重", width: 112 },
  { field: "nOrderThick", headerName: "订货厚mm", width: 112 },
  { field: "nOrderWidth", headerName: "订货宽mm", width: 112 },
  { field: "cOrderWidth2", headerName: "订单宽度2", width: 112 },
  { field: "nOrderLen", headerName: "订货长mm", width: 112 },
  { field: "cOrderLen2", headerName: "订单长度2", width: 112 },
  { field: "cTol", headerName: "公差", width: 112 },
  { field: "nBc", headerName: "倍尺", width: 112 },
  { field: "cPlanNo", headerName: "计划号", width: 112 },
  { field: "dProductTime", headerName: "生产时刻", width: 112 },
  { field: "dOutTime", headerName: "抽出时刻", width: 112 },
  { field: "cAuthor", headerName: "责任者", width: 112 },
  { field: "cCrewCode", headerName: "机组代码", width: 112 },
  { field: "dFurTime", headerName: "装炉时刻", width: 112 },
  { field: "cFurCode", headerName: "加热炉号", width: 112 },
  { field: "cPassNo", headerName: "道号", width: 112 },
  { field: "nFurTemp", headerName: "装炉前温度", width: 112 },
  { field: "cFurShiftNo", headerName: "入炉班次", width: 112 },
  { field: "cFurShiftGroup", headerName: "入炉班组", width: 112 },
  { field: "nOutPlateAvgTemp", headerName: "出钢时板坯均热度", width: 112 },
  { field: "nOutPlateCenterTemp", headerName: "出钢时板坯中心热度", width: 112 },
  { field: "nOutAvgTemp", headerName: "抽出平均温度", width: 112 },
  { field: "dInStoveTime", headerName: "在炉内时间(min)", width: 112 },
  { field: "dOutStoveTime", headerName: "出炉时刻", width: 112 },
  { field: "cProdCode", headerName: "品名", width: 112 },
  { field: "dYrSlabEvenHeatTemp", headerName: "预热段入口的板坯均热温度", width: 112 },
  { field: "dYrSlabAvgTemp", headerName: "预热段入口的平均板坯温度", width: 112 },
  { field: "dYrSlabCenterTemp", headerName: "预热段入口的板坯中心温度", width: 112 },
  { field: "dYrAvgTemp", headerName: "在预热段时的平均温度", width: 112 },
  { field: "dYrInStoveTime", headerName: "预热段在炉时间(min)", width: 112 },
  { field: "dHeatRkSlabAvgTemp1", headerName: "加热段1入口板坯平均温度", width: 112 },
  { field: "dHeatSlabFaceTemp1", headerName: "加热段1入口板坯表面温度", width: 112 },
  { field: "dHeatSlabCenterTemp1", headerName: "加热段1入口板坯中心温度", width: 112 },
  { field: "dHeatSlabAvgTemp1", headerName: "在加热段1时的平均温度", width: 112 },
  { field: "dHeatInStoveTime1", headerName: "加热段1在炉时段(min)", width: 112 },
  { field: "dHeatRkSlabAvgTemp2", headerName: "加热段2入口板坯平均温度", width: 112 },
  { field: "dHeatSlabCenterTemp2", headerName: "加热段2入口板坯中心温度", width: 112 },
  { field: "dHeatSlabFaceTemp2", headerName: "加热段2入口板坯表面温度", width: 112 },
  { field: "dHeatSlabAvgTemp2", headerName: "在加热段2时的平均温度", width: 112 },
  { field: "dHeatInStoveTime2", headerName: "加热段2在炉时段(min)", width: 112 },
  { field: "dHeatAvgTemp", headerName: "均热段时的平均温度", width: 112 },
  { field: "dHeatInStoveTime", headerName: "均热段在炉时段(min)", width: 112 },
  { field: "dEvenHeatAvgTemp", headerName: "均热段入口板坯平均温度", width: 112 },
  { field: "dEvenHeatCenterTemp", headerName: "均热段入口板坯中心温度", width: 112 },
  { field: "dEvenHeatFaceTemp", headerName: "均热段入口板坯表面温度", width: 112 },
  { field: "createTime", headerName: "创建时间", width: 112, hide: true },
];
/** Selected（选择）列 = 原勾选列（AllowSyncRowStateToCheckboxSelection）：ui-rules §7 以 hide:true 隐藏，勾选由 row-selection 复选框承担 */
const colDefs = ref<ColDef[]>(rawCols.map((c) => (c.field === "selected" ? { ...c, hide: true } : c)));

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

async function onQuery() {
  querying.value = true;
  try {
    const q = query.value;
    const dto: DtoTi1010Query = {
      timeRange: {
        min: q.dates?.[0]?.toISOString() ?? null,
        max: q.dates?.[1]?.toISOString() ?? null,
      },
      cSaleCon: q.cSaleCon || null,
      cCustName: q.cCustName || null,
      cZpNo: q.cZpNo || null,
      cSlabNo: q.cSlabNo || null,
      cCardNo: q.cCardNo || null,
      cPlanNo: q.cPlanNo || null,
      cShiftNo: q.cShiftNo,
      cShiftGroup: q.cShiftGroup,
      nOrderThick: { min: q.thickMin, max: q.thickMax },
      nOrderWidth: { min: q.widthMin, max: q.widthMax },
    };
    rows.value = (await tI1010Api.queryTi1010(dto)) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
    if (!rows.value.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1：11 个 LayoutControlItem，grid-cols-6 两行） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">销售合同</label>
        <InputText v-model="query.cSaleCon" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">客户</label>
        <InputText v-model="query.cCustName" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批号</label>
        <InputText v-model="query.cZpNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="query.cSlabNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">牌号</label>
        <InputText v-model="query.cCardNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">计划号</label>
        <InputText v-model="query.cPlanNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">班次</label>
        <Select
          v-model="query.cShiftNo"
          :options="shiftOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">班组</label>
        <Select
          v-model="query.cShiftGroup"
          :options="shiftGroupOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">装炉时间</label>
        <DatePicker
          v-model="query.dates"
          selection-mode="range"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-icon
          placeholder="开始 至 结束"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订货厚</label>
        <RangeInput v-model:min="query.thickMin" v-model:max="query.thickMax" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订货宽</label>
        <RangeInput v-model:min="query.widthMin" v-model:max="query.widthMax" class="min-w-0 flex-1" />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1 内 btnQuery 查询） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 主表（gridControl1 / gridView1，绑定实体 Ti1010Dto） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :pagination="false"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{
          mode: 'multiRow',
          checkboxes: true,
          headerCheckbox: true,
          enableClickSelection: true,
          enableSelectionWithoutKeys: true,
        }"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
