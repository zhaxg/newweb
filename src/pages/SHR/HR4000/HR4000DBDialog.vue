<script setup lang="ts">
/** 对应 FrmHR4000DB（装车调拨入库）：DDH.Winforms.SHR.Forms.FrmHR4000DB（ShowDialog 二级弹窗）
 *  已接入：tyd1000Api.queryRoom（目标库区描述）/ tyd1100Api.tyd1100Query（车辆下拉）/ tyd2020Api.createCPRKDB
 *  待接入：无
 *  偏差：原 ucStoreTar 为 GridLookUpEdit 只读（ValueMember=CStoreCode、DisplayMember=CStoreDes），
 *        web 用只读 Select 呈现，选项来自 queryRoom，缺项时回落库区代码；
 *        原 comCar 为可输入下拉，web 用 editable Select 等价 */

import { computed, onMounted, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { tyd1000Api, tyd1100Api, tyd2020Api } from "@/api/mes4ddh/syd.swagger";
import type { Thr4000Dto } from "@/api/mes4ddh/shr.swagger";

const props = defineProps<{
  visible: boolean;
  rows: Thr4000Dto[];
  storeCode: string;
}>();
const emit = defineEmits<{
  "update:visible": [v: boolean];
  ok: [];
}>();

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* 目标库区（原 ucStoreTar 只读 + kuqu1.LoadedLookUpEditAsync → QueryRoom） */
const storeOptions = ref<{ label: string; value: string }[]>([]);
const storeValue = computed(() => props.storeCode);
const shownStore = computed(() => {
  const hit = storeOptions.value.find((x) => x.value === props.storeCode);
  return hit ? [{ label: hit.label, value: hit.value }] : [{ label: props.storeCode, value: props.storeCode }];
});

/* 车辆信息（原 comCar：Tyd1100Query → CCarNo，可输入） */
const carOptions = ref<{ label: string; value: string }[]>([]);
const carValue = ref("");

/* 备注（原 textEdit2） */
const remark = ref("");

const rows = ref<Thr4000Dto[]>([]);
const gridApi = ref<GridApi | null>(null);

const colDefs: ColDef[] = [
  { field: "selected", headerName: "选择", width: 150, hide: true },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "cInboundNo", headerName: "入库标识", width: 150 },
  { field: "cBatchNo", headerName: "批号", width: 150 },
  { field: "cStove", headerName: "炉号", width: 150 },
  { field: "cPieceNo", headerName: "件次号", width: 150 },
  { field: "cSgCode", headerName: "钢种", width: 150 },
  { field: "cSgStd", headerName: "执行标准", width: 150 },
  { field: "cSpec", headerName: "规格", width: 150 },
  { field: "cTrimFlag", headerName: "切边方式", width: 150 },
  { field: "nThick", headerName: "厚度", width: 150 },
  { field: "nWidth", headerName: "宽度", width: 150 },
  { field: "nLen", headerName: "长度", width: 150 },
  { field: "nQua", headerName: "支数", width: 150 },
  { field: "nWgt", headerName: "重量", width: 150 },
  { field: "nCalWgt", headerName: "理重", width: 150 },
  { field: "cOrderNo", headerName: "提料计划号", width: 150 },
  { field: "nOrderThick", headerName: "订货厚", width: 150 },
  { field: "nOrderWidth", headerName: "订货宽", width: 150 },
  { field: "cOrderLenType", headerName: "合同长度类型", width: 150 },
  { field: "nOrderLen", headerName: "订货长mm", width: 150 },
  { field: "nOrderLenMin", headerName: "订单长", width: 150 },
  { field: "nOrderLenMax", headerName: "订单长2", width: 150 },
  { field: "cMatCode", headerName: "物料编码", width: 150 },
  { field: "cMatName", headerName: "物料描述", width: 150 },
  { field: "cEngMinThick", headerName: "厚度下偏差", width: 150 },
  { field: "cEngMaxThick", headerName: "厚度上偏差", width: 150 },
  { field: "cEngMinWidth", headerName: "宽度下偏差", width: 150 },
  { field: "cEngMaxWidth", headerName: "宽度上偏差", width: 150 },
  { field: "cEngMinLen", headerName: "长度下偏差", width: 150 },
  { field: "cEngMaxLen", headerName: "长度上偏差", width: 150 },
  { field: "cCustCode", headerName: "客户编码", width: 150 },
  { field: "cCustName", headerName: "客户名称", width: 150 },
  { field: "dDeliveryDate", headerName: "交货日期", width: 150 },
  { field: "dOrdDate", headerName: "订单日期", width: 150 },
  { field: "cSpecReqText", headerName: "客户特殊要求", width: 150 },
  { field: "cConNo", headerName: "合同号", width: 150 },
  { field: "cSteelType", headerName: "钢种大类", width: 150 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 150 },
  { field: "cCustStdCode", headerName: "加工用途代码", width: 150 },
  { field: "cOrderCustCname", headerName: "客户名称", width: 150 },
  { field: "cConsigneeCustCname", headerName: "收货客户中文名称", width: 164 },
  { field: "cPieceNoSlab", headerName: "板坯号", width: 150 },
  { field: "cSgCodeSlab", headerName: "钢坯钢种", width: 150 },
  { field: "cSgStdSlab", headerName: "坯料执行标准", width: 150 },
  { field: "cSpecSlab", headerName: "坯料规格", width: 150 },
  { field: "nThickSlab", headerName: "坯料厚度", width: 150 },
  { field: "nWidthSlab", headerName: "坯料宽度", width: 150 },
  { field: "nLenSlab", headerName: "坯料长度", width: 150 },
  { field: "cSurfaceResult", headerName: "表检结果", width: 150 },
  { field: "nQuaSlab", headerName: "钢坯总支数", width: 150 },
  { field: "nWgtSlab", headerName: "坯重", width: 150 },
  { field: "cMatCodeSlab", headerName: "坯料物料编码", width: 150 },
  { field: "cMatNameSlab", headerName: "坯料物料名称", width: 150 },
  { field: "nFurType", headerName: "装炉方式", width: 150 },
  { field: "cFurCode", headerName: "加热炉编号", width: 150 },
  { field: "cRollCode", headerName: "轧机编号", width: 150 },
  { field: "dFinish", headerName: "完成时间", width: 150 },
  { field: "cFinishShift", headerName: "完成班次", width: 150 },
  { field: "cFinishGroup", headerName: "完成班组", width: 150 },
  { field: "cFinishEmp", headerName: "轧制完成人", width: 150 },
  { field: "cConfirmStatus", headerName: "收料状态", width: 150 },
  { field: "cConfirmShift", headerName: "收料班次", width: 150 },
  { field: "cConfirmGroup", headerName: "收料班组", width: 150 },
  { field: "cConfirmEmp", headerName: "收料人", width: 150 },
  { field: "dConfirm", headerName: "收料时间", width: 150 },
  { field: "dSurfaceTime", headerName: "表检时间", width: 150 },
  { field: "cSurfaceUser", headerName: "表检人", width: 150 },
  { field: "cSurfaceRemark", headerName: "缺陷描述", width: 150 },
  { field: "cRespDept", headerName: "责任部门", width: 150 },
  { field: "cFaceHandleAdvice", headerName: "处置意见", width: 150 },
  { field: "cSampleLotNo", headerName: "试批号", width: 150 },
  { field: "cSampleLotNoSlab", headerName: "坯料试批号", width: 150 },
  { field: "cQmHandleDesc", headerName: "处置注释", width: 150 },
  { field: "nStatus", headerName: "状态", width: 150 },
  { field: "cStoreCode", headerName: "库房", width: 150 },
  { field: "cStackNo", headerName: "垛位号", width: 150 },
  { field: "cStackNum", headerName: "层号", width: 150 },
  { field: "cFlawDesc", headerName: "探伤等级", width: 150 },
  { field: "cDelivyAddress", headerName: "流向", width: 150 },
  { field: "cProdCode", headerName: "品名代码", width: 150 },
  { field: "cWgtToler", headerName: "重量偏差等级", width: 150 },
  { field: "lastPrintTime", headerName: "最后打印时间", width: 150 },
  { field: "id", headerName: "thr3010 id", width: 112, hide: true },
  { field: "creator", headerName: "创建人", width: 112, hide: true },
  { field: "lastModifier", headerName: "最后修改人", width: 125, hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138, hide: true },
  { field: "cPlanId", headerName: "日计划主键", width: 125, hide: true },
  { field: "cZpId", headerName: "thr3000主键", width: 112, hide: true },
  { field: "cMxId", headerName: "THR3010主键", width: 112, hide: true },
  { field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { field: "cSlCode", headerName: "剪切线代码", width: 125, hide: true },
  { field: "cLengthType", headerName: "长度类型", width: 112, hide: true },
  { field: "nLenMin", headerName: "长度下限", width: 112, hide: true },
  { field: "nLenMax", headerName: "长度上限", width: 112, hide: true },
  { field: "cPrint", headerName: "喷印完成标记", width: 138, hide: true },
  { field: "lastPrintUser", headerName: "最后打印人", width: 125, hide: true },
  { field: "printCount", headerName: "打印次数", width: 112, hide: true },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
  /* 原构造：thr4000BindingSource.DataSource = dtos（入参均已 Selected=true），勾选态全选 */
  e.api.forEachNode((node) => node.setSelected(true, true));
}

const confirming = ref(false);
const submitting = ref(false);

/* 原 btnOK_Click：库区校验 → 数据校验 → 确认「确认创建调拨单？数量N」→ CreateCPRKDB → 关闭 */
function askCreate() {
  if (!props.storeCode) {
    toast("请选择调拨库区后再操作", 2000, "warn");
    return;
  }
  if (!gridApi.value || !gridApi.value.getSelectedRows().length) {
    toast("请选择数据后再操作", 2000, "warn");
    return;
  }
  confirming.value = true;
}

async function doCreate() {
  const sel = (gridApi.value?.getSelectedRows() ?? []) as Thr4000Dto[];
  submitting.value = true;
  try {
    await tyd2020Api.createCPRKDB({
      cStore: props.storeCode,
      carNo: carValue.value || undefined,
      remark: remark.value || undefined,
      pieceNos: sel.map((x) => x.cPieceNo).filter((x): x is string => !!x),
    });
    confirming.value = false;
    emit("update:visible", false);
    emit("ok");
  } catch {
    /* 拦截层已 toast */
  } finally {
    submitting.value = false;
  }
}

const confirmMsg = computed(() => `确认创建调拨单？数量${gridApi.value?.getSelectedRows().length ?? 0}`);

watch(
  () => props.visible,
  async (v) => {
    if (!v) return;
    rows.value = [...props.rows];
    remark.value = "";
    carValue.value = "";
    try {
      const stores = (await tyd1000Api.queryRoom()) ?? [];
      storeOptions.value = stores
        .filter((x) => x.cStoreCode)
        .map((x) => ({ label: x.cStoreDes ?? x.cStoreCode ?? "", value: x.cStoreCode ?? "" }));
    } catch {
      /* 拦截层已 toast */
    }
    try {
      const cars = (await tyd1100Api.tyd1100Query()) ?? [];
      carOptions.value = cars.filter((x) => x.cCarNo).map((x) => ({ label: x.cCarNo ?? "", value: x.cCarNo ?? "" }));
    } catch {
      /* 拦截层已 toast */
    }
  },
);

onMounted(() => {
  rows.value = [...props.rows];
});
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="装车调拨入库"
    :style="{ width: 'min(72rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:visible', $event)"
  >
    <!-- 顶部字段（原 stackPanel1：目标库区只读 + 车辆信息 + 备注） -->
    <div class="mb-2 grid grid-cols-3 items-center gap-x-3 gap-y-1.5">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">目标库区</label>
        <Select :model-value="storeValue" :options="shownStore" disabled class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">车辆信息</label>
        <Select
          v-model="carValue"
          :options="carOptions"
          :filter="true"
          editable
          placeholder="车辆信息"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">备注</label>
        <InputText v-model="remark" class="min-w-0 flex-1" />
      </div>
    </div>

    <!-- 待调拨数据（原 gridControl1 / Thr4000Dto 入参行，勾选后创建调拨单） -->
    <div class="h-[24rem] overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableSelectionWithoutKeys: true }"
        :animate-rows="false"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:visible', false)" />
      <Button label="创建调拨单" variant="outlined" @click="askCreate" />
    </template>
  </Dialog>

  <!-- 确认（对应原 MsgBox.ShowYesNo($"确认创建调拨单？数量{data.Count}")） -->
  <Dialog
    :visible="confirming"
    modal
    header="确认"
    :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
    @update:visible="confirming = $event"
  >
    <p class="text-xs">{{ confirmMsg }}</p>
    <template #footer>
      <Button label="取消" variant="outlined" @click="confirming = false" />
      <Button label="确定" variant="outlined" :loading="submitting" @click="doCreate" />
    </template>
  </Dialog>
</template>
