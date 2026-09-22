<script setup lang="ts">
/** 对应 FrmTqmhr01（加热轧制工艺(New)）：DDH.Winforms.Forms.FrmTqmhr01
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import RangeInput from "@/components/common/RangeInput.vue";
import { IconFileImport, IconSearch } from "@tabler/icons-vue";
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

const input = reactive({
  Gytype: "",
  Season: "",
  Widthlow: null as number | null,
  Widthup: null as number | null,
});

const gytypeOptions = [
  { label: "常规", value: "常规" },
  { label: "特殊", value: "特殊" },
];
const seasonOptions = [
  { label: "春", value: "春" },
  { label: "夏", value: "夏" },
  { label: "秋", value: "秋" },
  { label: "冬", value: "冬" },
];

const colDefs: ColDef[] = [
  { field: "Steelgrade", headerName: "钢种", width: 120 },
  { field: "Thicklow", headerName: "厚度下限", width: 100 },
  { field: "Thickup", headerName: "厚度上限", width: 100 },
  { field: "Widthlow", headerName: "宽度下限", width: 100 },
  { field: "Widthup", headerName: "宽度上限", width: 100 },
  { field: "Season", headerName: "季节", width: 70 },
  { field: "Gytype", headerName: "工艺分类", width: 90 },
  { field: "Hot1low", headerName: "加热1段温度下限", width: 130 },
  { field: "Hot1up", headerName: "加热1段温度上限", width: 130 },
  { field: "Hot2low", headerName: "加热2段温度下限", width: 130 },
  { field: "Hot2up", headerName: "加热2段温度上限", width: 130 },
  { field: "Sf1low", headerName: "均热段1下限", width: 110 },
  { field: "Sf1up", headerName: "均热段1上限", width: 110 },
  { field: "Sf2low", headerName: "均热段2下限", width: 110 },
  { field: "Sf2up", headerName: "均热段2上限", width: 110 },
  { field: "Lasthour", headerName: "最小时长系数", width: 110 },
  { field: "Coldtotalhour", headerName: "冷坯总时长系数", width: 120 },
  { field: "Hottotalhour", headerName: "热坯总时长系数", width: 120 },
  { field: "Rmstarttemp", headerName: "粗轧开轧温度", width: 110 },
  { field: "Waitslabthick", headerName: "待坯厚度", width: 90 },
  { field: "Waitslabtemp", headerName: "待坯温度", width: 90 },
  { field: "Frmtempstd", headerName: "精轧终轧目标温度", width: 130 },
  { field: "Frmtemplow", headerName: "精轧终轧温度下限", width: 130 },
  { field: "Frmtempup", headerName: "精轧终轧温度上限", width: 130 },
  { field: "Acctempstd", headerName: "ACC返红目标温度", width: 130 },
  { field: "Acctemplow", headerName: "ACC返红温度下限", width: 130 },
  { field: "Acctempup", headerName: "ACC返红温度上限", width: 130 },
  { field: "Stacking", headerName: "钢板是否堆垛", width: 110 },
  { field: "Spare1", headerName: "是否探伤", width: 90 },
  { field: "Spare2", headerName: "是否热处理", width: 100 },
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
function onImport() { toast("画面迁移：导入逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：4个条件 → 6列 grid（1行） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">工艺类型</label>
          <Select v-model="input.Gytype" :options="gytypeOptions" option-label="label" option-value="value" class="min-w-0 flex-1" show-clear />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">季节</label>
          <Select v-model="input.Season" :options="seasonOptions" option-label="label" option-value="value" class="min-w-0 flex-1" show-clear />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">宽度范围</label>
          <RangeInput v-model:min="input.Widthlow" v-model:max="input.Widthup"
            :min-fraction-digits="1" :max-fraction-digits="1" show-buttons class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 操作工具栏 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onImport">
        <IconFileImport class="h-3 w-3" />导入
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">加热轧制工艺（{{ rows.length }}）</span>
    </div>

    <!-- 数据表格 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
        :suppress-column-virtualisation="true"
        :pagination="false" :animate-rows="false" :loading="querying"
        @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
