<script setup lang="ts">
/** 对应 FrmSS4000（钢卷生产实绩表）：DDH.Winforms.SHR.Forms.StripSteel.FrmSS4000
 *  已接入：e1000Api.queryTiE4000List
 *  待接入：无
 *  偏差：查询条件按 ui-rules §6 与按钮同行、以 placeholder 代替原 LabelControl；
 *        默认时间范围取原 uctimeRange1._Load 的「本月1日 ~ 次日」 */

import { ref } from "vue";

import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { e1000Api, type TiE4000, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const rows = ref<TiE4000[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

const keyword = ref("");
const dates = ref<Date[] | null>(defaultRange());

/* 时间范围默认值（原 uctimeRange1._Load：本月1日 ~ 次日） */
function defaultRange(): Date[] {
  const now = new Date();
  return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)];
}
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}

const colDefs: ColDef[] = [
  { field: "nOrder", headerName: "消息排序号", width: 125 },
  { field: "planId", headerName: "计划提料号", width: 125 },
  { field: "heatNo", headerName: "炉次号", width: 112 },
  { field: "slabNo", headerName: "板坯号", width: 112 },
  { field: "coilNo", headerName: "钢卷号", width: 112 },
  { field: "plantCode", headerName: "机组代码", width: 112 },
  { field: "sgId", headerName: "钢种序号", width: 112 },
  { field: "steelGrade", headerName: "钢种名称", width: 112 },
  { field: "sgFamily", headerName: "钢族序号", width: 112 },
  { field: "completeStatus", headerName: "钢卷状态", width: 112 },
  { field: "coilType", headerName: "钢卷类型", width: 112 },
  { field: "groupName", headerName: "班组", width: 112 },
  { field: "shiftName", headerName: "班次", width: 112 },
  { field: "fceNo", headerName: "加热炉号", width: 112 },
  { field: "fceRow", headerName: "加热炉列", width: 112 },
  { field: "extractTemp", headerName: "出炉实际温度", width: 138 },
  { field: "rmPass", headerName: "粗轧道次", width: 112 },
  { field: "rmthkAim", headerName: "粗轧中间坯目标厚度", width: 177 },
  { field: "cthkAim", headerName: "成品目标厚度", width: 138 },
  { field: "cthkAct", headerName: "成品实际厚度", width: 138 },
  { field: "cwidAim", headerName: "成品目标宽度", width: 138 },
  { field: "cwidAct", headerName: "成品实绩宽度", width: 138 },
  { field: "fmtempAim", headerName: "精轧目标温度", width: 138 },
  { field: "fmtempAct", headerName: "精轧实测温度", width: 138 },
  { field: "ccrnAim", headerName: "成品目标凸度", width: 138 },
  { field: "ccrnAct", headerName: "成品实测凸度", width: 138 },
  { field: "cflatAim", headerName: "成品目标平直度", width: 151 },
  { field: "cflatAct", headerName: "成品实测平直度", width: 151 },
  { field: "cwedgeAim", headerName: "成品目标楔形", width: 138 },
  { field: "cwedgeAct", headerName: "成品实测楔形", width: 138 },
  { field: "ctAim", headerName: "卷取目标温度", width: 138 },
  { field: "ctAct", headerName: "卷取实测温度", width: 138 },
  { field: "dcNo", headerName: "卷取机号", width: 112 },
  { field: "coilLength", headerName: "钢卷理论长度", width: 138 },
  { field: "calcWeight", headerName: "钢卷理论重量", width: 138 },
  { field: "chargeTime", headerName: "入炉时刻", width: 112 },
  { field: "extractTime", headerName: "出炉时刻", width: 112 },
  { field: "rmputime", headerName: "进入粗轧时刻，粗轧第一道次咬钢", width: 255 },
  { field: "rmdotime", headerName: "离开粗轧时刻，粗轧最后一道次抛钢", width: 268 },
  { field: "f1putime", headerName: "f1咬钢时刻", width: 112 },
  { field: "f7dotime", headerName: "f7抛钢时刻", width: 112 },
  { field: "dcputime", headerName: "卷取开始时刻", width: 138 },
  { field: "dcdotime", headerName: "卷取结束时刻", width: 138 },
  { field: "completeTime", headerName: "轧制完成时刻", width: 138 },
  { field: "coilboxUseflag", headerName: "热卷箱使用标记", width: 151 },
  { field: "coolingMode", headerName: "冷却模式", width: 112 },
  { field: "rmEntrytemp", headerName: "粗轧入口温度", width: 138 },
  { field: "rmExtemp", headerName: "粗轧出口温度", width: 138 },
  { field: "rmExwidth", headerName: "粗轧出口宽度", width: 138 },
  { field: "fmEntrytemp", headerName: "精轧入口温度", width: 138 },
  { field: "frIndep1", headerName: "立辊1道次实绩轧制力", width: 177 },
  { field: "frIndep2", headerName: "立辊3道次实绩轧制力", width: 177 },
  { field: "frIndep3", headerName: "立辊5道次实绩轧制力", width: 177 },
  { field: "frIndep4", headerName: "立辊7道次实绩轧制力", width: 177 },
  { field: "frIndrmp1", headerName: "粗轧1道次实绩轧制力", width: 177 },
  { field: "frIndrmp2", headerName: "粗轧2道次实绩轧制力", width: 177 },
  { field: "frIndrmp3", headerName: "粗轧3道次实绩轧制力", width: 177 },
  { field: "frIndrmp4", headerName: "粗轧4道次实绩轧制力", width: 177 },
  { field: "frIndrmp5", headerName: "粗轧5道次实绩轧制力", width: 177 },
  { field: "frIndrmp6", headerName: "粗轧6道次实绩轧制力", width: 177 },
  { field: "frIndrmp7", headerName: "粗轧7道次实绩轧制力", width: 177 },
  { field: "frIndf1", headerName: "f1实绩轧制力", width: 125 },
  { field: "frIndf2", headerName: "f2实绩轧制力", width: 125 },
  { field: "frIndf3", headerName: "f3实绩轧制力", width: 125 },
  { field: "frIndf4", headerName: "f4实绩轧制力", width: 125 },
  { field: "frIndf5", headerName: "f5实绩轧制力", width: 125 },
  { field: "frIndf6", headerName: "f6实绩轧制力", width: 125 },
  { field: "frIndf7", headerName: "f7实绩轧制力", width: 125 },
  { field: "fbIndf1", headerName: "f1实绩弯辊力", width: 125 },
  { field: "fbIndf2", headerName: "f2实绩弯辊力", width: 125 },
  { field: "fbIndf3", headerName: "f3实绩弯辊力", width: 125 },
  { field: "fbIndf4", headerName: "f4实绩弯辊力", width: 125 },
  { field: "fbIndf5", headerName: "f5实绩弯辊力", width: 125 },
  { field: "fbIndf6", headerName: "f6实绩弯辊力", width: 125 },
  { field: "fbIndf7", headerName: "f7实绩弯辊力", width: 125 },
  { field: "id", headerName: "主键", width: 112, hide: true },
  { field: "creator", headerName: "创建人", width: 112, hide: true },
  { field: "createTime", headerName: "创建时间", width: 112, hide: true },
  { field: "lastModifier", headerName: "最后修改人", width: 125, hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138, hide: true },
  { field: "readTime", headerName: "读取时间", width: 112, hide: true },
  { field: "readStatus", headerName: "读取状态", width: 112, hide: true },
  { field: "selected", headerName: "选择", width: 112, hide: true },
];

async function onQuery() {
  querying.value = true;
  try {
    rows.value =
      (await e1000Api.queryTiE4000List({
        planKeyword: keyword.value,
        timeRange: toTimeRange(dates.value),
      })) ?? [];
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
    <!-- 查询区（原 stackPanel1：label + textEdit1 + uctimeRange1 + btnQuery）；ui-rules §6 条件与按钮同行、用 placeholder -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
            <InputText v-model="keyword" placeholder="炉次号" class="w-40" @keydown.enter="onQuery" />
      <DatePicker v-model="dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd" show-time
        hour-format="24" show-icon placeholder="日期" class="w-80" />
      <Button variant="outlined" :loading="querying" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows" :pagination="false"
        @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
