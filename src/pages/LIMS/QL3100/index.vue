<script setup lang="ts">
/** 对应 FrmQL3100（检验委托接收）：DDH.Winforms.LIMS.Forms.FrmQL3100
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCheck, IconPlus, IconPrinter, IconSearch, IconTrash, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const testJobRows = ref<any[]>([]);
const sampleRows = ref<any[]>([]);
const querying = ref(false);
const testJobGridApi = ref<GridApi | null>(null);
const sampleGridApi = ref<GridApi | null>(null);

const input = reactive({
  lineCode: "", testNo: "", stove: "", sgSign: "",
  sgStd: "", orderNo: "", recheckFlag: "", batch: "",
  timeRange: null as Date[] | null,
});

// UCTestJob 列（56列）
const testJobColDefs: ColDef[] = [
  { field: "CStove", headerName: "炉号", width: 90 },
  { field: "CBatch", headerName: "批号", width: 90 },
  { field: "CInternalNo", headerName: "内部编号", width: 110 },
  { field: "CTestNo", headerName: "委托单号", width: 130 },
  { field: "NTestTimes", headerName: "试验次数", width: 80 },
  { field: "CRecheckFlag", headerName: "复验标记", width: 90 },
  { field: "CStatus", headerName: "状态", width: 80 },
  { field: "CLineCode", headerName: "产线", width: 70 },
  { field: "CSgSign", headerName: "钢种", width: 90 },
  { field: "CSgStd", headerName: "钢种标准", width: 110 },
  { field: "CDeliveryStateDesc", headerName: "交货状态", width: 100 },
  { field: "CCustStd", headerName: "加工用途", width: 100 },
  { field: "CStNo", headerName: "炉次号", width: 90 },
  { field: "CSpec", headerName: "规格", width: 110 },
  { field: "NThick", headerName: "厚度", width: 70 },
  { field: "NWth", headerName: "宽度", width: 70 },
  { field: "NLen", headerName: "长度", width: 70 },
  { field: "CAutoJudgeResult", headerName: "自动判定结果", width: 110 },
  { field: "CJudgeUser", headerName: "判定人", width: 90 },
  { field: "DJudgeTime", headerName: "判定时间", width: 140 },
  { field: "CJudgeResult", headerName: "最终判定结果", width: 110 },
  { field: "CJudgeRemark", headerName: "判定备注", width: 150 },
  { field: "DReceiveTime", headerName: "接收时间", width: 140 },
  { field: "DReceiveUser", headerName: "接收人", width: 90 },
  { field: "CConfirmUser", headerName: "成分确认人", width: 100 },
  { field: "CSendUser", headerName: "发送人", width: 90 },
  { field: "DConfirmTime", headerName: "成分确认时间", width: 140 },
  { field: "DSendTime", headerName: "发送时间", width: 140 },
  { field: "COrderNo", headerName: "订单号", width: 130 },
  { field: "OrderCustCName", headerName: "订货客户", width: 120 },
  { field: "CCustStdCode", headerName: "客户标准", width: 100 },
  { field: "CDelivyStatusCode", headerName: "交货状态", width: 90 },
  { field: "CCzpFlag", headerName: "重组批标记", width: 100 },
  { field: "CPrevTestNo", headerName: "前委托单号", width: 130 },
  { field: "Wgt", headerName: "吨位", width: 80 },
  { field: "Count", headerName: "数量", width: 70 },
  { field: "CJiaJi", headerName: "加急", width: 70 },
  { field: "CMatShape", headerName: "尺寸外形", width: 100 },
  { field: "CSpecialDesc", headerName: "特殊要求", width: 130 },
  { field: "CSpecialMarkHt", headerName: "技术要求特殊说明", width: 150 },
  { field: "CSpecialPackDesc", headerName: "特殊包装要求", width: 150 },
  { field: "CWarrantyDesc", headerName: "质保描述", width: 150 },
  { field: "CPStove", headerName: "母炉号", width: 90 },
  { field: "CMsc", headerName: "冶金规范码", width: 110 },
  { field: "CMscLineNo", headerName: "规范产线", width: 90 },
  { field: "CWholeBacklogCode", headerName: "全程工序", width: 100 },
  { field: "CDesignNo", headerName: "设计编号", width: 100 },
  { field: "CurrentItemCompleteFlag", headerName: "项目完成标记", width: 110 },
  { field: "NCastDivCode", headerName: "模连铸标识", width: 100 },
  { field: "CPlanRemark", headerName: "计划备注", width: 130 },
  { field: "WgtD", headerName: "D吨位", width: 80 },
  { field: "WgtP", headerName: "P吨位", width: 80 },
  { field: "CHeadFoot", headerName: "头部", width: 80 },
  { field: "CHeadFootStove", headerName: "头部炉号", width: 90 },
  { field: "CException", headerName: "异常", width: 80 },
];

// UCSampleRequires 列（36列）
const sampleColDefs: ColDef[] = [
  { field: "CTestItemTypeDesc", headerName: "试验项目类型描述", width: 130 },
  { field: "CTestItemName", headerName: "试验项目名称", width: 130 },
  { field: "NTestNum", headerName: "试验数量", width: 90 },
  { field: "NSampleNumRnd", headerName: "取样数量", width: 90 },
  { field: "CReplaceSampleCode", headerName: "替代样代码", width: 110 },
  { field: "CSamplePosDesc", headerName: "取样位置描述", width: 120 },
  { field: "CActualSamplePos", headerName: "实际取样位置", width: 120 },
  { field: "CSampleLenDesc", headerName: "取样长度描述", width: 120 },
  { field: "CTestDirectDesc", headerName: "试验方向描述", width: 120 },
  { field: "CWholeBacklogCode", headerName: "全程工序", width: 100 },
  { field: "CTestItemType", headerName: "试验项目类型", width: 110 },
  { field: "CTestPurposeDesc", headerName: "试验目的描述", width: 120 },
  { field: "CSampleLen", headerName: "取样长度", width: 90 },
  { field: "CTestCndCode", headerName: "试验条件", width: 100 },
  { field: "CFinishedPrdFlag", headerName: "成品标记", width: 90 },
  { field: "NRetestMulti", headerName: "复验倍数", width: 90 },
  { field: "CTestDirect", headerName: "试验方向", width: 90 },
  { field: "CSamplePos", headerName: "取样位置", width: 90 },
  { field: "CTestPurpose", headerName: "试验目的", width: 90 },
  { field: "CTestItem", headerName: "试验项目", width: 90 },
  { field: "CTestAdditionDesc", headerName: "补充描述", width: 130 },
  { field: "CTestNo", headerName: "委托单号", width: 130 },
  { field: "CCompleteFlag", headerName: "完成标记", width: 90 },
  { field: "DCompleteTime", headerName: "完成时间", width: 140 },
  { field: "CCompleteUser", headerName: "完成人", width: 90 },
  { field: "CJudgeResult", headerName: "判定结果", width: 90 },
  { field: "CJudgeRemark", headerName: "判定备注", width: 150 },
  { field: "NTestTimes", headerName: "试验次数", width: 80 },
  { field: "CNeedSend", headerName: "需发送", width: 80 },
  { field: "CCheckStatus", headerName: "检查状态", width: 90 },
  { field: "CCheckUser", headerName: "检查人", width: 90 },
  { field: "DCheckTime", headerName: "检查时间", width: 140 },
  { field: "CActualSamplePosDesc", headerName: "实际取样位置描述", width: 150 },
];

function onTestJobGridReady(e: GridReadyEvent) { testJobGridApi.value = e.api; }
function onSampleGridReady(e: GridReadyEvent) { sampleGridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    testJobRows.value = [];
    sampleRows.value = [];
    requestAnimationFrame(() => {
      testJobGridApi.value?.autoSizeAllColumns();
      sampleGridApi.value?.autoSizeAllColumns();
    });
  } finally {
    querying.value = false;
  }
}
function onAddItem() { toast("画面迁移：新增项目逻辑待接入", 2000, "warn"); }
function onDeleteItem() { toast("画面迁移：删除项目逻辑待接入", 2000, "warn"); }
function onReversePrint() { toast("画面迁移：标为未打印逻辑待接入", 2000, "warn"); }
function onChangeSamplePosition() { toast("画面迁移：修改取样位置逻辑待接入", 2000, "warn"); }
function onReceive() { toast("画面迁移：登记逻辑待接入", 2000, "warn"); }
function onCancelReceive() { toast("画面迁移：取消登记逻辑待接入", 2000, "warn"); }
function onPrint() { toast("画面迁移：打印逻辑待接入", 2000, "warn"); }
function onReject() { toast("画面迁移：拒收逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：8个条件 → 6列 grid -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线代码</label>
          <InputText v-model="input.lineCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">委托单号</label>
          <InputText v-model="input.testNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="input.stove" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.sgSign" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
          <InputText v-model="input.sgStd" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="input.orderNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">复验标记</label>
          <InputText v-model="input.recheckFlag" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
          <InputText v-model="input.batch" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-3 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
          <DatePicker v-model="input.timeRange" selection-mode="range" :manual-input="false"
            date-format="yy-mm-dd" show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 操作工具栏：9个按钮 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onAddItem">
        <IconPlus class="h-3 w-3" />新增项目
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteItem">
        <IconTrash class="h-3 w-3" />删除项目
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onReversePrint">
        <IconPrinter class="h-3 w-3" />标为未打印
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onChangeSamplePosition">
        <IconPlus class="h-3 w-3" />修改取样位置
      </Button>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onReceive">
        <IconCheck class="h-3 w-3" />登记
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onCancelReceive">
        <IconX class="h-3 w-3" />取消登记
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onPrint">
        <IconPrinter class="h-3 w-3" />打印
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onReject">
        <IconX class="h-3 w-3" />拒收
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">检验委托接收（{{ testJobRows.length }}）</span>
    </div>

    <!-- 嵌套 Splitter：左=时间选择，右上=检验委托，右下=取样要求 -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <!-- 左栏：时间范围（对应原 ucTimeRange1） -->
      <SplitterPanel :size="20" :minSize="12" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">时间范围</span>
        </div>
        <div class="flex flex-col gap-2 p-2">
          <DatePicker v-model="input.timeRange" selection-mode="range" :manual-input="false"
            date-format="yy-mm-dd" show-time hour-format="24" show-icon
            placeholder="开始 至 结束" class="w-full" />
        </div>
      </SplitterPanel>

      <!-- 右栏：上下分层 -->
      <SplitterPanel :minSize="40" class="flex flex-col">
        <Splitter class="min-h-0 flex-1" layout="vertical">
          <!-- 右上：检验委托（对应原 ucTestJob1，56列） -->
          <SplitterPanel :size="55" :minSize="30" class="flex flex-col">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">检验委托（{{ testJobRows.length }}）</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="testJobColDefs" :row-data="testJobRows"
                :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
                :suppress-column-virtualisation="true"
                :pagination="false" :animate-rows="false" :loading="querying"
                @grid-ready="onTestJobGridReady" @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>

          <!-- 右下：取样要求（对应原 ucSampleRequires1，36列） -->
          <SplitterPanel :minSize="25" class="flex flex-col">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">取样要求（{{ sampleRows.length }}）</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="sampleColDefs" :row-data="sampleRows"
                :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
                :suppress-column-virtualisation="true"
                :pagination="false" :animate-rows="false"
                @grid-ready="onSampleGridReady" @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
