<script setup lang="ts">
/** 对应 FrmSS2000（轧制计划）：DDH.Winforms.SHR.Forms.StripSteel.FrmSS2000
 *  已接入：e1000Api.queryTiE2000List
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
import { e1000Api, type TiE2000, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const rows = ref<TiE2000[]>([]);
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
  { field: "planId", headerName: "计划提料号", width: 125 },
  { field: "customerOrdNo", headerName: "用户订单号", width: 125 },
  { field: "nOrder", headerName: "消息排序号", width: 125 },
  { field: "planDate", headerName: "计划日期", width: 112 },
  { field: "nPlanOrder", headerName: "计划日期内的计划排序号", width: 203 },
  { field: "sendTime", headerName: "发送时间", width: 112 },
  { field: "operateFlag", headerName: "操作标识", width: 112 },
  { field: "planCount", headerName: "计划块数", width: 112 },
  { field: "customerCode", headerName: "用户代码", width: 112 },
  { field: "steelGrade", headerName: "材质代码", width: 112 },
  { field: "cthkAim", headerName: "目标成品厚度", width: 138 },
  { field: "cwidAim", headerName: "目标成品宽度", width: 138 },
  { field: "prodType", headerName: "成品类型", width: 112 },
  { field: "hwHeight", headerName: "花纹板高度", width: 125 },
  { field: "sthk", headerName: "板坯厚度", width: 112 },
  { field: "swid", headerName: "板坯宽度", width: 112 },
  { field: "slng", headerName: "板坯长度", width: 112 },
  { field: "swet", headerName: "板坯重量", width: 112 },
  { field: "hotFlag", headerName: "热坯标记", width: 112 },
  { field: "shortFlag", headerName: "短坯标记", width: 112 },
  { field: "extTempAim", headerName: "目标出炉温度", width: 138 },
  { field: "rdtAim", headerName: "粗轧出口目标温度", width: 164 },
  { field: "rmthkAim", headerName: "粗轧目标厚度", width: 138 },
  { field: "rmwidAim", headerName: "粗轧目标宽度", width: 138 },
  { field: "rmPass", headerName: "粗轧道次", width: 112 },
  { field: "rmPassMin", headerName: "粗轧使用最小道次轧制标记", width: 216 },
  { field: "targetWidthAdjust", headerName: "粗轧缩颈补偿值", width: 151 },
  { field: "cutMode", headerName: "飞剪剪切方式：0", width: 151 },
  { field: "fetAim", headerName: "精轧入口目标温度", width: 164 },
  { field: "fdtAim", headerName: "精轧目标温度", width: 138 },
  { field: "ctAim", headerName: "卷取目标温度", width: 138 },
  { field: "crownAim", headerName: "目标凸度", width: 112 },
  { field: "flatnessAim", headerName: "目标平直度", width: 125 },
  { field: "wedgeAim", headerName: "目标楔形", width: 112 },
  { field: "fmthkalt", headerName: "精轧厚度紧急变更值", width: 177 },
  { field: "fmtmpalt", headerName: "精轧温度紧急变更值", width: 177 },
  { field: "coilboxFlag", headerName: "热卷箱使用标记", width: 151 },
  { field: "ctcCtMode", headerName: "CTC控制方式", width: 112 },
  { field: "heathdtail", headerName: "CTC热头热尾标志", width: 138 },
  { field: "hotheadlng", headerName: "CTC热头长度", width: 112 },
  { field: "hottaillng", headerName: "CTC热尾长度", width: 112 },
  { field: "hotheadtmp", headerName: "CTC热头温升", width: 112 },
  { field: "hottailtmp", headerName: "CTC热尾温升", width: 112 },
  { field: "dryheadlng", headerName: "CTC干头长度", width: 112 },
  { field: "drytaillng", headerName: "CTC干尾长度", width: 112 },
  { field: "coolrattgt", headerName: "上下喷水阀比例", width: 151 },
  { field: "cthkTolup", headerName: "目标成品厚度上公差", width: 177 },
  { field: "cthkTollow", headerName: "目标成品厚度下公差", width: 177 },
  { field: "cwidTolup", headerName: "目标成品宽度上公差", width: 177 },
  { field: "cwidTollow", headerName: "目标成品宽度下公差", width: 177 },
  { field: "crownTolup", headerName: "目标凸度上公差", width: 151 },
  { field: "crownTollow", headerName: "目标凸度下公差", width: 151 },
  { field: "flatnessTolup", headerName: "目标平直度上公差", width: 164 },
  { field: "flatnessTollow", headerName: "目标平直度下公差", width: 164 },
  { field: "wedgeTolup", headerName: "目标楔形上公差", width: 151 },
  { field: "wedgeTollow", headerName: "目标楔形下公差", width: 151 },
  { field: "fdtTolup", headerName: "精轧目标温度上公差", width: 177 },
  { field: "fdtTollow", headerName: "精轧目标温度下公差", width: 177 },
  { field: "ctTolup", headerName: "卷取目标温度上公差", width: 177 },
  { field: "ctTollow", headerName: "卷取目标温度下公差", width: 177 },
  { field: "rdtTolup", headerName: "粗轧出口目标温度上公差", width: 203 },
  { field: "rdtTollow", headerName: "粗轧出口目标温度下公差", width: 203 },
  { field: "fetTolup", headerName: "精轧入口目标温度上公差", width: 203 },
  { field: "fetTollow", headerName: "精轧入口目标温度下公差", width: 203 },
  { field: "itaim", headerName: "CTC中间温度目标值", width: 151 },
  { field: "itaimpostol", headerName: "CTC中间温度上公差", width: 151 },
  { field: "itaimnegtol", headerName: "CTC中间温度下公差", width: 151 },
  { field: "crnalt", headerName: "精轧凸度紧急变更值", width: 177 },
  { field: "ferriteRollFlag", headerName: "铁素体轧制标记", width: 151 },
  { field: "fmStdTemp", headerName: "精轧机组间中间温度", width: 177 },
  { field: "headtransitionlng", headerName: "CTC头部过渡段长度", width: 151 },
  { field: "tailtransitionlng", headerName: "CTC尾部过渡段长度", width: 151 },
  { field: "fnfcoolrateaim", headerName: "CTC前段冷却速率", width: 138 },
  { field: "fndcoolrateaim", headerName: "CTC后段冷却速率", width: 138 },
  { field: "airCoolTime", headerName: "CTC空冷时间", width: 112 },
  { field: "reqDivQuench", headerName: "双相或者三相钢轧制标识", width: 203 },
  { field: "id", headerName: "主键", width: 112, hide: true },
  { field: "creator", headerName: "创建人", width: 112, hide: true },
  { field: "createTime", headerName: "创建时间", width: 112, hide: true },
  { field: "lastModifier", headerName: "最后修改人", width: 125, hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138, hide: true },
  { field: "readTime", headerName: "读取时间", width: 112, hide: true },
  { field: "readStatus", headerName: "读取状态", width: 112, hide: true },
  { field: "standby1", headerName: "备用字段1", width: 112, hide: true },
  { field: "standby2", headerName: "备用字段2", width: 112, hide: true },
  { field: "standby3", headerName: "备用字段3", width: 112, hide: true },
  { field: "standby4", headerName: "备用字段4", width: 112, hide: true },
  { field: "standby5", headerName: "备用字段5", width: 112, hide: true },
  { field: "selected", headerName: "选择", width: 112, hide: true },
];

async function onQuery() {
  querying.value = true;
  try {
    rows.value =
      (await e1000Api.queryTiE2000List({
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
            <InputText v-model="keyword" placeholder="计划提料号" class="w-40" @keydown.enter="onQuery" />
      <DatePicker v-model="dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd" show-time
        hour-format="24" show-icon placeholder="计划日期" class="w-80" />
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
