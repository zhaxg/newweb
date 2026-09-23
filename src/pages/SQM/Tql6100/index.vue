<script setup lang="ts">
/** 对应 FrmTql6100（中厚板质量异常汇总）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTql6100
 *  已接入：tql6100Api.getTql6100Dtos（原 DataBind / DtoQueryTql6100{TimeRange,CStoveNo,CPieceNo}）
 *  待接入：图片查看/上传（FTP+FrmTql6001，校验「请先选择一条记录」照抄后 toast；保存回写 tql1050Api.addImages 已在 lims.swagger，本页因 FTP 仍占位）
 *        下载图片（勾选校验「请勾选需要下载的项」照抄后 toast，FTP 下载占位）
 *        导出数据与图片（XtraReport/图片 Excel 导出占位）
 *  结构：原 stackPanel1 单行（时间范围+UCTimeRange | 炉号 | 材料号 | 查询 | 图片查看/上传 | 下载图片 | 导出数据与图片）→ 一条 flex h-9 strip
 *  列：extract 40 可见 + Id hide；Selected → 行选择勾选列承担；字段 camelCase；中文列头按 Tql6100Dto LDisplay
 *  Load 默认 today-3 ~ today+1 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import { IconDownload, IconFileExport, IconSearch, IconUpload } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { tql6100Api, type TimeRange } from "@/api/mes4ddh/sqm.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

/* ---------- 时间（原 FrmTql6100_Load：TimeRange(今天-3, 今天+1)） ---------- */
function defaultRange(): Date[] {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  a.setDate(a.getDate() - 3);
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  b.setDate(b.getDate() + 1);
  return [a, b];
}
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2 || !dates[0] || !dates[1]) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

const input = reactive({
  timeRange: defaultRange() as Date[] | null,
  stoveNo: "",
  slabNo: "",
});

/* ---------- 列按 extract VisibleIndex（Selected 由行选择 checkbox 承担；camelCase 字段） ---------- */
const colDefs: ColDef[] = [
  { field: "dTime", headerName: "日期", width: 112 },
  { field: "hasFile", headerName: "是否已上传", width: 112 },
  { field: "cStoveNo", headerName: "炼钢炉号", width: 112 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  { field: "cPieceNoSlab", headerName: "板坯号", width: 112 },
  { field: "nThickSlab", headerName: "钢坯厚", width: 100 },
  { field: "nWidthSlab", headerName: "钢坯宽", width: 100 },
  { field: "nLenSlab", headerName: "钢坯长", width: 100 },
  { field: "dTimeJL", headerName: "精炼时间", width: 138 },
  { field: "dTimeKJ", headerName: "开浇时间", width: 138 },
  { field: "dFurTime", headerName: "装炉时间", width: 138 },
  { field: "cFurType", headerName: "装炉类型（冷/热）", width: 151 },
  { field: "cPieceNo", headerName: "子板号", width: 112 },
  { field: "cInboundNo", headerName: "入库标识", width: 112 },
  { field: "nThickPlate", headerName: "钢板厚", width: 100 },
  { field: "nWidthPlate", headerName: "钢板宽", width: 100 },
  { field: "nLenPlate", headerName: "钢板长", width: 100 },
  { field: "cTolType", headerName: "公差类型", width: 112 },
  { field: "cTrimFlag", headerName: "切割方式", width: 112 },
  { field: "cZrDw", headerName: "责任单位", width: 112 },
  { field: "cDefectType", headerName: "缺陷类型", width: 112 },
  { field: "cDefectPosition", headerName: "缺陷位置", width: 112 },
  { field: "cDefectDesc", headerName: "缺陷描述", width: 138 },
  { field: "cLgReason", headerName: "炼钢原因分析", width: 151 },
  { field: "cZgReason", headerName: "中厚板原因分析", width: 151 },
  { field: "dRollTime", headerName: "轧制时间", width: 138 },
  { field: "dJyTime", headerName: "检验时间", width: 138 },
  { field: "cResult", headerName: "判定结果", width: 112 },
  { field: "cSurfaceCategory", headerName: "判定分类", width: 106 },
  { field: "cPutPos", headerName: "摆放位置", width: 112 },
  { field: "cZgGroup", headerName: "中厚板班组", width: 112 },
  { field: "cUser", headerName: "检查员", width: 100 },
  { field: "cLgGroup", headerName: "炼钢班组", width: 112 },
  { field: "dHandleTime", headerName: "已处理时间", width: 138 },
  { field: "cHandleResult", headerName: "处理结果判定", width: 138 },
  { field: "cGroup", headerName: "班组", width: 100 },
  { field: "cUser2", headerName: "检查员", width: 100 },
  { field: "cInPos", headerName: "入库摆放位置", width: 138 },
  { field: "cRemark", headerName: "备注", width: 125 },
  { field: "id", headerName: "主键", width: 86, hide: true },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/* ---------- 查询（原 btnQuery_Click → DataBind → getTql6100Dtos） ---------- */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tql6100Api.getTql6100Dtos({
      timeRange: toTimeRange(input.timeRange),
      cStoveNo: input.stoveNo.trim(),
      cPieceNo: input.slabNo.trim(),
    })) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* ---------- 待接入：图片查看/上传（原 btnUploadFile_Click：焦点行校验后 FTP+FrmTql6001） ---------- */
function onUploadFile() {
  const selected = gridApi.value?.getSelectedRows() ?? [];
  const focused = selected[0] ?? rows.value[0];
  if (!focused) {
    toast("请先选择一条记录", 2000, "warn");
    return;
  }
  toast("图片查看/上传（FTP+FrmTql6001）待接入", 2000, "warn");
}

/* ---------- 待接入：下载图片（原 btnDownload_Click：勾选校验照抄） ---------- */
function onDownload() {
  const selected = (gridApi.value?.getSelectedRows() ?? []) as any[];
  if (selected.length === 0) {
    toast("请勾选需要下载的项", 2000, "warn");
    return;
  }
  toast("下载图片（FTP）待接入", 2000, "warn");
}

/* ---------- 待接入：导出数据与图片（原 simpleButton1_Click → XtraReport 图片 Excel） ---------- */
function onExport() {
  toast("导出数据与图片（图片 Excel）待接入", 2000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 原 stackPanel1 单行 Dock=Top：时间范围/炉号/材料号 + 4 按钮同 strip（h-9 硬规则） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
      <DatePicker v-model="input.timeRange" selection-mode="range" :manual-input="false"
        date-format="yy-mm-dd" show-time hour-format="24" show-icon class="w-72 shrink-0" />
      <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
      <InputText v-model="input.stoveNo" class="w-36 shrink-0" />
      <label class="w-16 shrink-0 text-xs text-muted-foreground">材料号</label>
      <InputText v-model="input.slabNo" class="w-36 shrink-0" />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onUploadFile">
        <IconUpload class="h-3 w-3" />图片查看/上传
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDownload">
        <IconDownload class="h-3 w-3" />下载图片
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onExport">
        <IconFileExport class="h-3 w-3" />导出数据与图片
      </Button>
      <span class="ml-auto shrink-0 text-xs text-muted-foreground">质量异常汇总（{{ rows.length }}）</span>
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
