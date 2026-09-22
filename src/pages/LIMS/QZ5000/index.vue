<script setup lang="ts">
/** 对应 FrmQZ5000（中厚板检验委托判定）：DDH.Winforms.LIMS.Forms.FrmQZ5000
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCheck, IconFlask, IconPlus, IconRefresh, IconSearch, IconSend, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const remark = ref("");

const colDefs: ColDef[] = [
  { field: "Name", headerName: "名称", width: 150 },
  { field: "Value", headerName: "元素值", width: 120 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "LastModifier", headerName: "最后修改人", width: 100 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140 },
];

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}
function onRelease() { toast("画面迁移：判放行逻辑待接入", 2000, "warn"); }
function onQualify() { toast("画面迁移：判合格逻辑待接入", 2000, "warn"); }
function onUnqualify() { toast("画面迁移：判不合逻辑待接入", 2000, "warn"); }
function onLabRecheck() { toast("画面迁移：实验室复验逻辑待接入", 2000, "warn"); }
function onQMRecheck() { toast("画面迁移：质检复验逻辑待接入", 2000, "warn"); }
function onAutoJudge() { toast("画面迁移：自动判定逻辑待接入", 2000, "warn"); }
function onReSample() { toast("画面迁移：重组样逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：查询 + 判定备注 + 7个判定按钮 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <label class="ml-3 shrink-0 text-xs text-muted-foreground">判定备注</label>
      <InputText v-model="remark" class="w-48 shrink-0" placeholder="判定备注" />
      <span class="mx-1 h-4 w-px bg-border" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onRelease">
        <IconSend class="h-3 w-3" />判放行
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onQualify">
        <IconCheck class="h-3 w-3" />判合格
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onUnqualify">
        <IconX class="h-3 w-3" />判不合
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onLabRecheck">
        <IconFlask class="h-3 w-3" />实验室复验
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onQMRecheck">
        <IconFlask class="h-3 w-3" />质检复验
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAutoJudge">
        <IconRefresh class="h-3 w-3" />自动判定
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onReSample">
        <IconPlus class="h-3 w-3" />重组样
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">中厚板检验委托判定（{{ rows.length }}）</span>
    </div>

    <!-- 左右主子表：左=检验委托查看器，右=Tab详情 -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <!-- 左：检验委托查看器（对应原 ucTestJobViewer1） -->
      <SplitterPanel :size="15" :minSize="10" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">检验委托</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :suppress-column-virtualisation="true"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <!-- 右：详情 Tab（对应原 xtraTabControl1） -->
      <SplitterPanel :minSize="30" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">检验详情</span>
        </div>
        <div class="flex min-h-0 flex-1 items-center justify-center bg-muted/30">
          <p class="text-xs text-muted-foreground">选择左侧委托查看检验详情</p>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
