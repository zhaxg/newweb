<script setup lang="ts">
import { reactive, ref } from "vue";
import { IconCheck, IconPlus, IconRefresh, IconRobot, IconTrash } from "@tabler/icons-vue";
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

/** 对应原 QueryShiftResultInput 查询条件区 */
const input = reactive({
  cPlantId: "",
  cWorkshop: "",
  cMachineId: "",
  cLineNo: "",
  cProcCd: "",
  dBegTime: null as Date | null,
  dEndTime: null as Date | null,
});

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
    <!-- 查询条件区（对应原 dataLayoutControl1） -->
    <div class="shrink-0 border-b border-border/60 px-2 py-1.5">
      <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-8 shrink-0 text-xs text-muted-foreground">工厂</label>
          <Select v-model="input.cPlantId" :options="[]" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-8 shrink-0 text-xs text-muted-foreground">车间</label>
          <Select v-model="input.cWorkshop" :options="[]" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-8 shrink-0 text-xs text-muted-foreground">机台</label>
          <Select v-model="input.cMachineId" :options="[]" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-8 shrink-0 text-xs text-muted-foreground">产线</label>
          <Select v-model="input.cLineNo" :options="[]" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-8 shrink-0 text-xs text-muted-foreground">工序</label>
          <Select v-model="input.cProcCd" :options="[]" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-8 shrink-0 text-xs text-muted-foreground">时间</label>
          <DatePicker v-model="input.dBegTime" date-format="yy-mm-dd" show-time hour-format="24" :show-icon="false"
            placeholder="开始时间" class="min-w-0 flex-1" input-class="w-full" />
          <span class="shrink-0 text-xs text-muted-foreground">至</span>
          <DatePicker v-model="input.dEndTime" date-format="yy-mm-dd" show-time hour-format="24" :show-icon="false"
            placeholder="结束时间" class="min-w-0 flex-1" input-class="w-full" />
        </div>
      </div>
    </div>

    <!-- 工具栏（对应原 flowLayoutPanel1） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconRefresh class="h-3.5 w-3.5" />查询
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3.5 w-3.5" />添加
      </Button>
      <Button variant="outlined" size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3.5 w-3.5" />删除
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconCheck class="h-3.5 w-3.5" />保存
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAutoShift">
        <IconRobot class="h-3.5 w-3.5" />自动排班
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">排班结果（{{ rows.length }}）</span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="columnDefs"
        :default-col-def="hmxDefaultColDef" :row-data="rows" :get-row-id="getRowId" :row-selection="'single'"
        :pagination="false" :animate-rows="false" :loading="querying" :locale-text="AG_GRID_LOCALE_CN"
        @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
