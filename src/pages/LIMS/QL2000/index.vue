<script setup lang="ts">
/** 对应 FrmQL2000（炉次成分录入）：DDH.Winforms.LIMS.Forms.FrmQL2000
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { ref } from "vue";
import Button from "primevue/button";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCheck, IconPlus, IconQrcode, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const stoveRows = ref<any[]>([]);
const cfRows = ref<any[]>([]);
const querying = ref(false);
const stoveGridApi = ref<GridApi | null>(null);
const cfGridApi = ref<GridApi | null>(null);

// 左栏：炉次信息（UCStoveInfo，按 VisibleIndex）
const stoveColDefs: ColDef[] = [
  { field: "CPoNo", headerName: "制造命令号", width: 130 },
  { field: "CStove", headerName: "炉号", width: 90 },
  { field: "CPStove", headerName: "母炉号", width: 90 },
  { field: "CSgSign", headerName: "钢种", width: 90 },
  { field: "CSgStd", headerName: "钢种标准", width: 110 },
  { field: "CStNo", headerName: "炉次号", width: 90 },
  { field: "COrderNo", headerName: "订单号", width: 130 },
  { field: "COrderTsyq", headerName: "合同特殊要求", width: 130 },
  { field: "CLineCode", headerName: "产线", width: 70 },
  { field: "CMachine", headerName: "机台", width: 80 },
  { field: "CRouteCode", headerName: "精炼路径", width: 90 },
  { field: "NThick", headerName: "厚度", width: 70 },
  { field: "NWth", headerName: "宽度", width: 70 },
  { field: "NLen", headerName: "长度", width: 70 },
  { field: "NPlanWgt", headerName: "计划出钢重量", width: 110 },
  { field: "CSpec", headerName: "规格", width: 110 },
  { field: "CIngotCode", headerName: "锭坯型", width: 80 },
  { field: "RecheckFlag", headerName: "复验标记", width: 90 },
  { field: "CJudgeResult", headerName: "最终判定结果", width: 110 },
  { field: "CJudgeRemark", headerName: "判定备注", width: 150 },
  { field: "CJudgeUser", headerName: "判定人", width: 90 },
  { field: "DJudgeTime", headerName: "判定时间", width: 140 },
  { field: "DProdTime", headerName: "生产时间", width: 140 },
  { field: "CConfirmUser", headerName: "成分确认人", width: 100 },
  { field: "DConfirmTime", headerName: "成分确认时间", width: 140 },
];

// 右下栏：成分结果（UCCfResult，按 VisibleIndex）
const cfColDefs: ColDef[] = [
  { field: "CSampleNo", headerName: "试样号", width: 100 },
  { field: "CName", headerName: "名称", width: 120 },
  { field: "CGw", headerName: "工位", width: 70 },
  { field: "ValueDisplay", headerName: "检验结果", width: 100 },
  { field: "CStove", headerName: "炉号", width: 90 },
  { field: "StdRange", headerName: "标准范围", width: 110 },
  { field: "CSendUser", headerName: "发送人", width: 90 },
  { field: "CFormula", headerName: "公式", width: 150 },
  { field: "DSendTime", headerName: "发送时间", width: 140 },
  { field: "StdAccuracy", headerName: "小数位数", width: 90 },
  { field: "CJudgeResult", headerName: "判定结果", width: 90 },
  { field: "NValue", headerName: "原始结果", width: 100 },
  { field: "CJudgeRemark", headerName: "判定备注", width: 150 },
  { field: "IsJudge", headerName: "是否判定", width: 90 },
  { field: "CRecheckFlag", headerName: "复验标记", width: 90 },
  { field: "CFinalFlag", headerName: "是否最终样", width: 100 },
  { field: "CTestUser", headerName: "检验人", width: 90 },
  { field: "DTestTime", headerName: "检验时间", width: 140 },
  { field: "DJudgeTime", headerName: "判定时间", width: 140 },
  { field: "CCode", headerName: "编码", width: 110 },
  { field: "CJudgeFlag", headerName: "判定标记", width: 90 },
  { field: "Accuracy", headerName: "精度", width: 70 },
  { field: "MainRange", headerName: "内控范围", width: 110 },
  { field: "SpeRange", headerName: "特殊范围", width: 110 },
  { field: "CCtrlFlag", headerName: "控制标记", width: 90 },
  { field: "IsPrint", headerName: "是否打印", width: 90 },
];

function onStoveGridReady(e: GridReadyEvent) { stoveGridApi.value = e.api; }
function onCfGridReady(e: GridReadyEvent) { cfGridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    stoveRows.value = [];
    cfRows.value = [];
    requestAnimationFrame(() => {
      stoveGridApi.value?.autoSizeAllColumns();
      cfGridApi.value?.autoSizeAllColumns();
    });
  } finally {
    querying.value = false;
  }
}
function onConfirm() { toast("画面迁移：炉次成分确认逻辑待接入", 2000, "warn"); }
function onAddCfDelegate() { toast("画面迁移：新增检验委托逻辑待接入", 2000, "warn"); }
function onSetFinalSample() { toast("画面迁移：指定最终样逻辑待接入", 2000, "warn"); }
function onAddSample() { toast("画面迁移：新增试样逻辑待接入", 2000, "warn"); }
function onToggleQrcode() { toast("画面迁移：显示/隐藏二维码逻辑待接入", 2000, "warn"); }
function onCfQuery() { toast("画面迁移：成分查询逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 顶部工具栏：6个按钮，无查询条件 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onConfirm">
        <IconCheck class="h-3 w-3" />炉次成分确认
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAddCfDelegate">
        <IconPlus class="h-3 w-3" />新增炉次成分检验委托
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onSetFinalSample">
        <IconCheck class="h-3 w-3" />指定最终样
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAddSample">
        <IconPlus class="h-3 w-3" />新增试样
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onToggleQrcode">
        <IconQrcode class="h-3 w-3" />显示/隐藏二维码
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">炉次成分录入（{{ stoveRows.length }}）</span>
    </div>

    <!-- 嵌套双层 Splitter -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <!-- 左栏：炉次信息（对应原 ucStoveInfo1） -->
      <SplitterPanel :size="45" :minSize="25" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">炉次信息</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="stoveColDefs" :row-data="stoveRows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :suppress-column-virtualisation="true"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onStoveGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <!-- 右栏：上下分层 -->
      <SplitterPanel :minSize="30" class="flex flex-col">
        <Splitter class="min-h-0 flex-1" layout="vertical">
          <!-- 右上：二维码（对应原 barCodeControl1） -->
          <SplitterPanel :size="35" :minSize="15" class="flex flex-col">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">二维码</span>
            </div>
            <div class="flex min-h-0 flex-1 items-center justify-center bg-muted/30">
              <p class="text-xs text-muted-foreground">选择左侧炉次显示二维码</p>
            </div>
          </SplitterPanel>

          <!-- 右下：成分结果（对应原 ucCfResult1） -->
          <SplitterPanel :minSize="25" class="flex flex-col">
            <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">成分结果</span>
              <span class="flex-1" />
              <Button text class="shrink-0 whitespace-nowrap" @click="onCfQuery">
                <IconSearch class="h-3 w-3" />查询
              </Button>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="cfColDefs" :row-data="cfRows"
                :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
                :suppress-column-virtualisation="true"
                :pagination="false" :animate-rows="false"
                @grid-ready="onCfGridReady" @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
