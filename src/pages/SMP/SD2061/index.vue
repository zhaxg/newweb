<script setup lang="ts">
import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import { IconSearch, IconCheck, IconFileText } from "@tabler/icons-vue";
import RangeInput from "@/components/common/RangeInput.vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

/** 对应 FrmSD2061（中厚板成品资源调配）：DDH.Winforms.SMP.Forms.FrmSD2061
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

const { toast } = useToast();
const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const input = reactive({
  CStackNo: "",
  COrderNo: "",
  CSettleCust: "",
  CConsignee: "",
  CSgCode: "",
  CPieceNo: "",
  CStove: "",
  NThickMin: null as number | null,
  NThickMax: null as number | null,
  CSgStd: "",
  CCutFlag: "",
  CWgtToler: "",
  NWthMin: null as number | null,
  NWthMax: null as number | null,
  NLenMin: null as number | null,
  NLenMax: null as number | null,
  CInboundNo: "",
  CDetectDefectLevel: "",
  DProTime: null as Date[] | null,
});

const settleCust = ref<string | null>(null);
const settleCustOptions = ref<{ label: string; value: string }[]>([]);

const cutFlagOptions = [
  { label: "双边", value: "双边" },
  { label: "单边", value: "单边" },
  { label: "毛边", value: "毛边" },
];

const yesNoFmt = (p: ValueFormatterParams) => (p.value === 1 ? "是" : "否");
const qmFmt = (p: ValueFormatterParams) => {
  const map: Record<number, string> = { 0: "合格", 1: "不合格", 2: "待检" };
  return map[p.value as number] ?? String(p.value ?? "");
};

const colDefs: ColDef[] = [
  { field: "CInboundNo", headerName: "入库单号", width: 130 },
  { field: "CComplexDecideCode", headerName: "综判结果", width: 100 },
  { field: "CStackNo", headerName: "垛位号", width: 100 },
  { field: "CStackNum", headerName: "层号", width: 70 },
  { field: "CConsignee", headerName: "订货单位", width: 120 },
  { field: "CSettleCust", headerName: "结算单位", width: 120 },
  { field: "CPieceNo", headerName: "头侧件次号", width: 120 },
  { field: "CProdClass", headerName: "钢板分类", width: 90 },
  { field: "CStove", headerName: "炉号", width: 90 },
  { field: "CSgCode", headerName: "钢种", width: 90 },
  { field: "CSpec", headerName: "规格", width: 120 },
  { field: "CSgStd", headerName: "钢种标准", width: 110 },
  { field: "CProdCode", headerName: "产品代码", width: 100 },
  { field: "NWgt", headerName: "理重", width: 80 },
  { field: "NNum", headerName: "件数", width: 70 },
  { field: "NThick", headerName: "厚度", width: 70 },
  { field: "NWth", headerName: "宽度", width: 70 },
  { field: "NLen", headerName: "长度", width: 70 },
  { field: "COrderNo", headerName: "订单号", width: 130 },
  { field: "NQmStatus", headerName: "质量状态", width: 90, valueFormatter: qmFmt },
  { field: "NLockReason", headerName: "质量封锁原因", width: 120 },
  { field: "CWgtToler", headerName: "重量偏差等级", width: 110 },
  { field: "CCutFlag", headerName: "切边方式", width: 90 },
  { field: "CDetectDefectLevel", headerName: "探伤等级", width: 90 },
  { field: "CSpecialMarkGy", headerName: "特殊标记工艺", width: 120 },
  { field: "CDelivyStatusCode", headerName: "交货状态", width: 90 },
  { field: "CDelivyAddress", headerName: "交货地址", width: 130 },
  { field: "NStatus", headerName: "状态", width: 70, valueFormatter: yesNoFmt },
  { field: "CProRemark", headerName: "生产备注", width: 120 },
  { field: "DProTime", headerName: "产出时间", width: 150 },
  { field: "NQmLevel", headerName: "质量等级", width: 90 },
  { field: "CDetectResultCode", headerName: "探伤判定结果", width: 110 },
  { field: "CSurfaceResult", headerName: "表检结果", width: 90 },
  { field: "CStoreCode", headerName: "库区号", width: 90 },
  { field: "CSaleEmp", headerName: "销售员", width: 90 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "LastModifier", headerName: "最后修改人", width: 100 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140 },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
  toast("画面迁移：查询逻辑待接入", 2000, "warn");
}

function onAllocation() {
  toast("画面迁移：确认调配逻辑待接入", 2000, "warn");
}

function onOrderTemplate() {
  toast("画面迁移：生成现货订单逻辑待接入", 2000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：3行6列 -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">垛位号</label>
          <InputText v-model="input.CStackNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="input.COrderNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订货单位</label>
          <InputText v-model="input.CConsignee" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.CSgCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="input.CStove" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
          <InputText v-model="input.CPieceNo" class="min-w-0 flex-1" />
        </div>

        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">长度</label>
          <RangeInput v-model:min="input.NLenMin" v-model:max="input.NLenMax"
            :min-fraction-digits="1" :max-fraction-digits="1" show-buttons class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">宽度</label>
          <RangeInput v-model:min="input.NWthMin" v-model:max="input.NWthMax"
            :min-fraction-digits="1" :max-fraction-digits="1" show-buttons class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">厚度</label>
          <RangeInput v-model:min="input.NThickMin" v-model:max="input.NThickMax"
            :min-fraction-digits="1" :max-fraction-digits="2" show-buttons class="min-w-0 flex-1" />
        </div>

        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
          <InputText v-model="input.CSgStd" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">切边方式</label>
          <Select v-model="input.CCutFlag" :options="cutFlagOptions" option-label="label" option-value="value" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">公差</label>
          <InputText v-model="input.CWgtToler" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">探伤等级</label>
          <InputText v-model="input.CDetectDefectLevel" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产出时间</label>
          <DatePicker v-model="input.DProTime" selection-mode="range" :manual-input="false"
            date-format="yy-mm-dd" show-time hour-format="24" show-icon placeholder="开始 至 结束"
            class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 工具栏：查询 | 结算单位 | 确认调配 | 生成现货订单 -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="flex-1" />
      <label class="shrink-0 text-xs text-muted-foreground">结算单位：</label>
      <Select v-model="settleCust" :options="settleCustOptions" option-label="label" option-value="value"
        filter show-clear placeholder="请选择" class="w-64 shrink-0" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onAllocation">
        <IconCheck class="h-3 w-3" />确认调配
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onOrderTemplate">
        <IconFileText class="h-3 w-3" />生成现货订单
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
