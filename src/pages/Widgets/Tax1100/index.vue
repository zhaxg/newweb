<script setup lang="ts">
import { reactive, ref } from "vue";
import { IconCheck, IconPlus, IconRefresh, IconRobot, IconSearch, IconTrash } from "@tabler/icons-vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Select from "primevue/select";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

/** 对应 FrmTax1100（排班结果）：GlueNet.Widgets.ShiftGroup.FrmTax1100
 *  画面迁移，逻辑不迁移到 */

const { toast } = useToast();
const theme = makeHmxGridTheme();

interface Tax1100 {
  id: string;
  creator?: string;
  createTime?: string;
  lastModifier?: string;
  lastModifyTime?: string;
  cPlantId?: string;
  cLineNo?: string;
  cProcCd?: string;
  cWorkshop?: string;
  cMachineId?: string;
  dBegTime?: string;
  dEndTime?: string;
  cClassRate?: string;
  cClassGroup?: string;
  selected?: boolean;
}

const rows = ref<Tax1100[]>([]);
const querying = ref(false);

const input = reactive({
  cPlantId: "",
  cWorkshop: "",
  cMachineId: "",
  cLineNo: "",
  cProcCd: "",
  dates: null as Date[] | null,
});

// range 模式返回 [start, end]，拆给后端两个独立参数
function begTime() { return input.dates?.[0] ?? null; }
function endTime() { return input.dates?.[1] ?? null; }

const columnDefs: ColDef[] = [
  { colId: "cPlantId", field: "cPlantId", headerName: "工厂", width: 100 },
  { colId: "cLineNo", field: "cLineNo", headerName: "产线", width: 100 },
  { colId: "cProcCd", field: "cProcCd", headerName: "工序", width: 100 },
  { colId: "cWorkshop", field: "cWorkshop", headerName: "车间", width: 100 },
  { colId: "cMachineId", field: "cMachineId", headerName: "机台", width: 100 },
  { colId: "dBegTime", field: "dBegTime", headerName: "开始时间", width: 150 },
  { colId: "dEndTime", field: "dEndTime", headerName: "结束时间", width: 150 },
  { colId: "cClassRate", field: "cClassRate", headerName: "班次", width: 100 },
  { colId: "cClassGroup", field: "cClassGroup", headerName: "班组", width: 100 },
  { colId: "creator", field: "creator", headerName: "创建人", width: 100 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "lastModifier", field: "lastModifier", headerName: "修改人", width: 100 },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "修改时间", width: 150, flex: 1 },
];

function getRowId(p: GetRowIdParams) {
  return (p.data as Tax1100).id;
}

// ---------- 工具栏（逻辑不迁移，占位） ----------
async function onQuery() {
  querying.value = true;
  try {
    // TODO: 接入 IShiftAppService.QueryShiftResult(input)
    rows.value = [];
  } finally {
    querying.value = false;
  }
  toast("画面迁移：查询逻辑待接入", 2000, "warn");
}

function onAdd() {
  // TODO: 原窗体未绑定事件
  toast("画面迁移：添加逻辑待接入", 2000, "warn");
}

function onDelete() {
  // TODO: 原窗体未绑定事件
  toast("画面迁移：删除逻辑待接入", 2000, "warn");
}

function onSave() {
  // TODO: 原窗体未绑定事件
  toast("画面迁移：保存逻辑待接入", 2000, "warn");
}

function onAutoShift() {
  // TODO: 原窗体未绑定事件
  toast("画面迁移：自动排班逻辑待接入", 2000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：2行6列，第一行5个+1空，第二行时间段占2列 -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <!-- 第一行：5个下拉 + 1空 -->
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-7 shrink-0 text-xs text-muted-foreground">工厂</label>
          <Select v-model="input.cPlantId" :options="[]" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-7 shrink-0 text-xs text-muted-foreground">车间</label>
          <Select v-model="input.cWorkshop" :options="[]" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-7 shrink-0 text-xs text-muted-foreground">机台</label>
          <Select v-model="input.cMachineId" :options="[]" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-7 shrink-0 text-xs text-muted-foreground">产线</label>
          <Select v-model="input.cLineNo" :options="[]" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-7 shrink-0 text-xs text-muted-foreground">工序</label>
          <Select v-model="input.cProcCd" :options="[]" class="min-w-0 flex-1" />
        </div>
        <div />
        <!-- 第二行：时间段占2列 + 4空 -->
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-7 shrink-0 text-xs text-muted-foreground">时间</label>
          <DatePicker v-model="input.dates" selectionMode="range" :manualInput="false"
            date-format="yy-mm-dd" show-time hour-format="24" show-icon
            placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-4" />
      </div>
    </div>

    <!-- 所有操作按钮一行 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text size="small" class="whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3.5 w-3.5" />查询
      </Button>
      <Button text size="small" class="whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3.5 w-3.5" />添加
      </Button>
      <Button text size="small" severity="danger" class="whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3.5 w-3.5" />删除
      </Button>
      <Button text size="small" class="whitespace-nowrap" @click="onSave">
        <IconCheck class="h-3.5 w-3.5" />保存
      </Button>
      <Button text size="small" class="whitespace-nowrap" @click="onAutoShift">
        <IconRobot class="h-3.5 w-3.5" />自动排班
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">排班结果（{{ rows.length }}）</span>
    </div>

    <!-- 表格区 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="columnDefs"
        :default-col-def="hmxDefaultColDef" :row-data="rows" :get-row-id="getRowId" :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
        :pagination="false" :animate-rows="false" :loading="querying" :locale-text="AG_GRID_LOCALE_CN"
        @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
