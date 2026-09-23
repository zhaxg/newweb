<script setup lang="ts">
/** 对应 FrmMS3100（自动化点位数据曲线图，cQueryString={PlantCode,LineCode}）：DDH.Winforms.SMS.Forms.FrmMS3100
 *  已接入：frmMS3100Api.queryTagInfo（btnQuery 点位查询/原 DataBind；入参 LineCode/LineName/MachineCode/MachineName）
 *          + frmMS3100Api.queryLineChartDatas（btnQueryLineChart→LineChartDataBind；校验与文案照抄 .cs：
 *            时间范围>12小时「由于数据量较大，时间范围请勿大于12小时！」→ 取值间隔非数「取值间隔输入有误！」→
 *            ≤0「取值间隔必须大于0！」→ 无勾选点位「请选择PLC点位进行操作！」；入参 [{TimeRange{Min,Max}, Points[], TimeInterval, IsPopup:false, MachineCode}]）
 *  待接入：机台下拉候选——原 UCMachine.RefreshData → ITpa1000AppService.QueryMachine 未生成（同 MP2030/MP2050），Select 暂空候选
 *  结构：stackPanel1（产线|机台|时间范围|取值间隔(S)|查询点位|刷新曲线图）→ 左右 Splitter（SplitterPosition=598≈50%）：
 *       Panel1 groupControl1「点位信息」网格 / Panel2 groupControl2「曲线图」；取值间隔候选 1/10/30/60/120 默认 60（原 comValueJG.Items）
 *  列集：点位表 extract 4 可见（Selected 选择列→row-selection 复选框，原列 hide:true 保留，对应原 AllowSyncRowStateToCheckboxSelection）+ 31 隐藏（hide:true）
 *  偏差：原 DevExpress ChartControl 折线图 → 「曲线图」面板内数据表（时间/点位/数值，按批约可表格化）；
 *        qs 解析失败文案按 FrmTagQueryStringDto 照抄（无「MES程序版本」句，与 MS22xx/MS3000 文案本就不同）
 *  字段桥接：后端 JSON camelCase → 回填 toPascal 首字母还原 */
import { onMounted, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";

import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { frmMS3100Api } from "@/api/mes4ddh/sms.swagger";

const { toast } = useToast();
const { raw: menuQs, json: menuJson } = useMenuQuery();
const qsFormat = JSON.stringify({ PlantCode: null, LineCode: null });
const qs = menuJson as { PlantCode?: string; LineCode?: string };

const theme = makeHmxGridTheme();
const tagApi = ref<GridApi | null>(null);
const chartApi = ref<GridApi | null>(null);
const queryTagsLoading = ref(false);
const queryChartLoading = ref(false);

const lineCode = ref(String(qs.LineCode ?? ""));
// 原 ucMachine1：RefreshData(QueryMachine) 候选未生成 → 空候选（同 MP2030/MP2050）
const machineCode = ref<string | null>(null);
const machineOptions = ref<{ label: string; value: string }[]>([]);
// 原 ucTimeRange1.Value = TimeRange(now-30min, now)（秒清零）
const start = new Date();
start.setSeconds(0);
const timeRange = ref<Date[] | null>([new Date(start.getTime() - 30 * 60000), start]);
// 原 comValueJG.Items = 1/10/30/60/120，默认 60
const intervalOptions = [1, 10, 30, 60, 120].map((n) => ({ label: String(n), value: n }));
const interval = ref(intervalOptions[3]);

type Row = Record<string, unknown>;
const tagRows = shallowRef<Row[]>([]);
const chartRows = shallowRef<Row[]>([]);

const tagCols = ref<ColDef[]>([      { field: "Selected", headerName: "选择", hide: true },
      { field: "CTagNm", headerName: "点位描述", width: 112 },
      { field: "CMachineName", headerName: "机台名称", width: 112 },
      { field: "CSmnsTag", headerName: "自动化点位", width: 125 },
      { field: "Id", headerName: "主键", width: 86, hide: true },
      { field: "CFactoryCode", headerName: "工厂", width: 86, hide: true },
      { field: "CFactoryName", headerName: "工厂名称", width: 112, hide: true },
      { field: "CLineCode", headerName: "产线", width: 86, hide: true },
      { field: "CLineName", headerName: "产线名称", width: 112, hide: true },
      { field: "CMachineCode", headerName: "机台编码", width: 112, hide: true },
      { field: "CStationNo", headerName: "站点编码", width: 112, hide: true },
      { field: "CStationDesc", headerName: "站点描述", width: 112, hide: true },
      { field: "CMesTag", headerName: "MES点位", width: 125, hide: true },
      { field: "CTagType", headerName: "点位类型", width: 112, hide: true },
      { field: "CTagUsage", headerName: "点位用途", width: 112, hide: true },
      { field: "CValueStyle", headerName: "数据类型", width: 112, hide: true },
      { field: "CFunction", headerName: "点位功能", width: 112, hide: true },
      { field: "CTableField", headerName: "存储位置", width: 112, hide: true },
      { field: "NEnable", headerName: "是否启用", width: 112, hide: true },
      { field: "CUnit", headerName: "单片钢坯", width: 112, hide: true },
      { field: "NCovMom", headerName: "倍率", width: 86, hide: true },
      { field: "NDecimals", headerName: "修约", width: 86, hide: true },
      { field: "NAddRecord", headerName: "是否记录日志", width: 138, hide: true },
      { field: "CBackup", headerName: "备注", width: 86, hide: true },
      { field: "CTimestamp", headerName: "时间戳", width: 99, hide: true },
      { field: "Creator", headerName: "创建人", width: 99, hide: true },
      { field: "CreateTime", headerName: "创建时间", width: 112, hide: true },
      { field: "LastModifier", headerName: "最后修改人", width: 125, hide: true },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 138, hide: true },
      { field: "CSw01", headerName: "备用字段1", width: 125, hide: true },
      { field: "CSw02", headerName: "备用字段2", width: 125, hide: true },
      { field: "CSw03", headerName: "备用字段3", width: 125, hide: true },
      { field: "CSw04", headerName: "备用字段4", width: 125, hide: true },
      { field: "CSw05", headerName: "备用字段5", width: 125, hide: true },
      { field: "CSw06", headerName: "备用字段6", width: 125, hide: true }]);
// Selected = 勾选标记列（原 CheckEdit + AllowSyncRowStateToCheckboxSelection）：
// ui-rules §7——原列 hide:true 保留，勾选由 row-selection 复选框呈现，曲线查询读勾选行

// 曲线数据表（批约：曲线图可表格化；列=时间/点位/数值，数据来自 MS3100Dto.Title+ValueList）
const chartCols: ColDef[] = [
  { field: "Time", headerName: "时间", width: 180, valueFormatter: (p: ValueFormatterParams) => String(p.value ?? "").replace("T", " ").slice(0, 19) },
  { field: "Title", headerName: "点位", width: 220 },
  { field: "Value", headerName: "数值", width: 120 },
];

/** 后端 JSON 为 camelCase（首字母小写），extract 列为 PascalCase——回填时首字母还原 */
function toPascal(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) out[k ? k[0].toUpperCase() + k.slice(1) : k] = v;
  return out;
}
function toPascalRows(list: unknown): Row[] {
  return (Array.isArray(list) ? (list as Row[]) : []).map(toPascal);
}

// 原 DataBind（btnQuery_Click / ucMachine 变更）
async function onQueryTags() {
  queryTagsLoading.value = true;
  try {
    const list =
      (await frmMS3100Api.queryTagInfo({
        LineCode: lineCode.value,
        LineName: lineCode.value, // 原 ucLine1.Text；菜单仅注入编码，暂同编码
        MachineCode: machineCode.value ?? "",
        MachineName: machineCode.value ?? "",
      })) ?? [];
    tagRows.value = toPascalRows(list);
    /* 原 AllowSyncRowStateToCheckboxSelection=true：勾选态由 Selected 字段回灌 */
    requestAnimationFrame(() => {
      tagApi.value?.forEachNode((node) => node.setSelected(!!(node.data as Row).Selected));
      tagApi.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    queryTagsLoading.value = false;
  }
}

// 原 LineChartDataBind（btnQueryLineChart_Click）——校验顺序与文案照抄 .cs
async function onQueryChart() {
  const [min, max] = timeRange.value ?? [];
  if (!min || !max) {
    toast("请选择时间范围！", 2000, "warn");
    return;
  }
  if (max.getTime() - min.getTime() > 12 * 3600 * 1000) {
    toast("由于数据量较大，时间范围请勿大于12小时！", 3000, "warn");
    return;
  }
  const ti = Number(interval.value?.value); // 原 GetInt(comValueJG.Text)：解析失败 → 「取值间隔输入有误！」
  if (Number.isNaN(ti)) {
    toast("取值间隔输入有误！", 2000, "warn");
    return;
  }
  if (ti <= 0) {
    toast("取值间隔必须大于0！", 2000, "warn");
    return;
  }
  const points = (tagApi.value?.getSelectedRows() ?? [])
    .map((r) => String((r as Row).CSmnsTag ?? ""));
  if (!points.length) {
    toast("请选择PLC点位进行操作！", 2000, "warn");
    return;
  }
  queryChartLoading.value = true;
  try {
    const list =
      (await frmMS3100Api.queryLineChartDatas([
        { TimeRange: { Min: min, Max: max }, Points: points, TimeInterval: ti, IsPopup: false, MachineCode: machineCode.value ?? "" },
      ])) ?? [];
    // 原 chartControl1.Series：每个 MS3100Dto.Title 一条折线 → 表格化为 时间/点位/数值 行
    const rows: Row[] = [];
    for (const s of (Array.isArray(list) ? list : []) as Row[]) {
      const title = String(s.Title ?? s.title ?? "");
      const vals = (s.ValueList ?? s.valueList) as Row[] | undefined;
      for (const v of vals ?? []) rows.push({ Time: v.Time ?? v.time, Title: title, Value: v.NValue ?? v.nValue });
    }
    chartRows.value = rows;
    requestAnimationFrame(() => chartApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    queryChartLoading.value = false;
  }
}

function onTagReady(e: GridReadyEvent) {
  tagApi.value = e.api;
}
function onChartReady(e: GridReadyEvent) {
  chartApi.value = e.api;
}

onMounted(() => {
  if (!menuQs) {
    toast(`界面必须配置注入参数，请联系管理员！\r\n界面注入参数格式为：'${qsFormat}'`, 5000, "error");
  } else if (menuQs.startsWith("{") && !Object.keys(menuJson).length) {
    toast(`界面参数错误应为:${qsFormat}`, 4000, "error");
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：产线/机台/时间范围/取值间隔(S)/查询点位/刷新曲线图） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineCode" disabled class="w-24 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">机台</label>
      <Select v-model="machineCode" :options="machineOptions" option-label="label" option-value="value" show-clear
        placeholder="请选择" class="w-36 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">时间范围</label>
      <DatePicker v-model="timeRange" selection-mode="range" :manual-input="false" date-format="yy-mm-dd" show-time
        hour-format="24" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">取值间隔(S)</label>
      <Select v-model="interval" :options="intervalOptions" option-label="label" option-value="value"
        class="w-24 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="queryTagsLoading" @click="onQueryTags">
        <IconSearch class="h-3 w-3" />查询点位
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="queryChartLoading" @click="onQueryChart">
        刷新曲线图
      </Button>
    </div>

    <!-- 左右分栏（原 splitContainerControl1 左右 SplitterPosition=598≈50%：Panel1=groupControl1 点位信息 / Panel2=groupControl2 曲线图） -->
    <Splitter layout="horizontal" class="min-h-0 flex-1">
      <SplitterPanel :size="50" :minSize="15" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">点位信息</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="tagCols" :row-data="tagRows" :pagination="false"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :loading="queryTagsLoading" @grid-ready="onTagReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="50" :minSize="15" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="ml-auto text-xs font-medium text-muted-foreground">曲线图（数据表）</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="chartCols" :row-data="chartRows" :pagination="false"
            :loading="queryChartLoading" @grid-ready="onChartReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
