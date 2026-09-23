<script setup lang="ts">
import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { tmp2000Api, type InputTmp2000Dto, type QueryCptTmp2010Dto } from "@/api/mes4ddh/smp.swagger";

/** 对应 FrmSD2030（中厚板未提料订单查询）：DDH.Winforms.SMP.Forms.FrmSD2030
 *  已接入：tmp2000Api.getTmp2010（查询）
 *  布局：查询区(dataLayoutControl 6 项) → 查询(stackPanel2) → 单表 Fill
 *  产线为 HiddenItems；查询 CLineCode 取菜单 cQueryString（原 C# BindData）；ribbon barButtonItem 忽略；
 *  列集按 extract（可见31+隐藏2=33）；原 Designer 无创建人等审计列；
 *  原 Selected 勾选列由 AG Grid row-selection 复选框呈现（ui-rules §7），原列以 hide:true 保留在列面板
 *  不迁：原表单级 textEdit2（游离死控件，非查询条件）——
 *    ① 不在 dataLayoutControl1.Controls.Add 里（该项只有 6 个）；
 *    ② 其 layoutControlItem2 未挂进 Root.Items 也不在 layoutControlGroup1.Items，不参与布局；
 *    ③ layoutControlItem2 无 .Text（无标签）、textEdit2 无 DataBindings；
 *    ④ FrmSD2030.cs 逻辑与查询 DTO InputTmp2000Dto 均未引用。
 *    它 Location(290,76) 正压在查询区行上，若照迁会渲染成「条件区多了个没标签的格子」 */

const { raw: menuQs } = useMenuQuery();
const theme = makeHmxGridTheme();
const rows = ref<QueryCptTmp2010Dto[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

function day(y: number, m: number, d: number) {
  return new Date(y, m, d);
}
const now = new Date();

/* 原 dataLayoutControl 查询区 6 项（产线为 HiddenItems，故 hidden 渲染保留在列位） */
const input = reactive({
  cOrderNo: "",
  cSgCode: "",
  cOrderCustCname: "",
  dBegin: day(now.getFullYear(), now.getMonth(), 1),
  dEnd: day(now.getFullYear(), now.getMonth(), now.getDate()),
  cLineCode: "",
});

const colDefs: ColDef[] = [
        { field: "selected", headerName: "选择", hide: true },
      { field: "cOrderCustCname", headerName: "客户", width: 150 },
      { field: "cOrderNo", headerName: "编号", width: 150 },
      { field: "cSteelType", headerName: "品名", width: 150 },
      { field: "cSgCode", headerName: "钢种", width: 150 },
      { field: "nThick", headerName: "板厚", width: 150 },
      { field: "nThickMin", headerName: "板厚下限", width: 150 },
      { field: "nThickMax", headerName: "板厚上限", width: 150 },
      { field: "nWidth", headerName: "板宽下限", width: 150 },
      { field: "nWidthMax", headerName: "板宽上限", width: 150 },
      { field: "nWidthWgt", headerName: "边部宽度余量", width: 150 },
      { field: "nLenMin", headerName: "板长下限", width: 150 },
      { field: "nLenMax", headerName: "板长上限", width: 150 },
      { field: "cDelivyStatusDesc", headerName: "交货状态", width: 150 },
      { field: "nNum", headerName: "签订件数", width: 150 },
      { field: "nWgt", headerName: "总量（吨）", width: 150 },
      { field: "cTrimFlagDesc", headerName: "切边方式", width: 150 },
      { field: "cOverstepBl", headerName: "短溢装比例", width: 150 },
      { field: "cDelivyQtyFlag", headerName: "计重方式", width: 150 },
      { field: "cTol", headerName: "公差", width: 150 },
      { field: "cFlawDesc", headerName: "探伤等级", width: 150 },
      { field: "cSgStd", headerName: "执行标准", width: 150 },
      { field: "cConNo", headerName: "用户合同号", width: 150 },
      { field: "dJhqTime", headerName: "交期", width: 150 },
      { field: "cDelivyAddress", headerName: "流向", width: 150 },
      { field: "cSpecialMarkGy", headerName: "性能", width: 150 },
      { field: "nWtMin", headerName: "单重min", width: 150 },
      { field: "nWtMax", headerName: "单重max", width: 150 },
      { field: "cSpec", headerName: "订单规格", width: 150 },
      { field: "cConRemark", headerName: "合同特殊要求", width: 150 },
      { field: "cInboundNo", headerName: "入库标识", width: 150 },
      { field: "cTrimFlag", headerName: "切边方式", width: 100, hide: true },
      { field: "id", headerName: "主键", width: 100, hide: true },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function buildInput(): InputTmp2000Dto {
  return {
    cOrderNo: input.cOrderNo || null,
    cSgCode: input.cSgCode || null,
    cOrderCustCname: input.cOrderCustCname || null,
    dBegin: input.dBegin?.toISOString() ?? null,
    dEnd: input.dEnd?.toISOString() ?? null,
    cLineCode: menuQs || null,
  };
}

/* btnS 查询 → GetTmp2010 */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tmp2000Api.getTmp2010(buildInput())) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 dataLayoutControl 6 项：订单号/钢种/订货客户/开始时间/截止时间/产线(hidden)） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.cSgCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订货客户</label>
          <InputText v-model="input.cOrderCustCname" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">开始时间</label>
          <DatePicker v-model="input.dBegin" date-format="yy-mm-dd" show-icon class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">截止时间</label>
          <DatePicker v-model="input.dEnd" date-format="yy-mm-dd" show-icon class="min-w-0 flex-1" />
        </div>
        <div class="hidden min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
          <InputText v-model="input.cLineCode" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 查询按钮（原 stackPanel2） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 数据表格（原 gridControl1 Dock.Fill） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
        :suppress-column-virtualisation="true"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
