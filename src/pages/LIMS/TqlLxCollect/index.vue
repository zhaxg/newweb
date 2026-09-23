<script setup lang="ts">
/** 对应 FrmTqlLxCollect（力学信息）：DDH.Winforms.LIMS.Forms.FrmTqlLxCollect
 *  已接入：tqlLXCollectApi.queryTqlLxCollects（拉伸页签）/ queryTqlImpactCollects（冲击页签）
 *  待接入：弯曲信息页签（原 Designer 页签存在但内容为空、SelectedPageChanged 分支亦为空）
 *  偏差：无（原窗体无 SetCodeFormatterAsync，列显示原值；勾选 Selected 列由行选择 checkbox 承担） */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import {
  tqlLXCollectApi,
  TqlCFCollectNstatus,
  type FrmTqlLxCollectDto,
  type FrmTqlLxImpactCollectDto,
  type TimeRange,
} from "@/api/mes4ddh/lims.swagger";

const theme = makeHmxGridTheme();

/* ---------- 查询条件（原 bscQueryTqlLXCollectDto：默认 状态=正常，时间=今天-7 ~ 明天-1秒） ---------- */
function defaultRange(): Date[] {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  a.setDate(a.getDate() - 7);
  const b = new Date();
  b.setDate(b.getDate() + 1);
  b.setHours(0, 0, 0, 0);
  b.setSeconds(b.getSeconds() - 1); /* 今天 23:59:59（原 Now.AddDays(1).Date.AddSeconds(-1)） */
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

/* 状态候选 = AddEnum(typeof(TqlCFCollectNstatus)) 全量成员（移除 Failure 的代码被注释） */
const statusOptions = [
  { label: "处理失败", value: TqlCFCollectNstatus.Failure },
  { label: "正常", value: TqlCFCollectNstatus.Normal },
  { label: "失效", value: TqlCFCollectNstatus.Abnormal },
  { label: "待处理", value: TqlCFCollectNstatus.UnHandle },
  { label: "异常", value: TqlCFCollectNstatus.NStatusAbnormal },
];

const query = reactive({
  cTestNo: "",
  cTestItem: "",
  cSampleNo: "",
  nStatus: TqlCFCollectNstatus.Normal as TqlCFCollectNstatus | null,
  dates: defaultRange() as Date[] | null,
});

/* ---------- 页签（原 xtraTabControl1：拉伸 / 冲击 / 弯曲） ---------- */
const activeTab = ref<"lx" | "impact" | "bend">("lx");

const lxRows = ref<FrmTqlLxCollectDto[]>([]);
const lxLoading = ref(false);
const lxApi = ref<GridApi | null>(null);
const impactRows = ref<FrmTqlLxImpactCollectDto[]>([]);
const impactLoading = ref(false);
const impactApi = ref<GridApi | null>(null);
function onLxReady(e: GridReadyEvent) { lxApi.value = e.api; }
function onImpactReady(e: GridReadyEvent) { impactApi.value = e.api; }

/* ---------- 列（原 gridView1 / gridView2 按 VisibleIndex；Selected 由行选择承担） ---------- */
const lxColDefs: ColDef[] = [
    { field: "creator", headerName: "创建人", width: 99 },
    { field: "createTime", headerName: "创建时间", width: 112 },
    { field: "nOrder", headerName: "顺序号", width: 99 },
    { field: "stoveNo", headerName: "炉号", width: 86 },
    { field: "testNo", headerName: "代表样号", width: 112 },
    { field: "batchNo", headerName: "批次号", width: 99 },
    { field: "slabPieceNo", headerName: "板坯号", width: 99 },
    { field: "cTestNo", headerName: "试验编号", width: 112 },
    { field: "cTestItem", headerName: "试验项目号", width: 125 },
    { field: "cItemTable", headerName: "试验项目表名", width: 138 },
    { field: "cSampleNo", headerName: "试样编号", width: 112 },
    { field: "cOperatorName", headerName: "操作员姓名", width: 125 },
    { field: "nStatus", headerName: "状态", width: 86 },
    { field: "nCurOrder", headerName: "当前第几根", width: 125 },
    { field: "nTestCount", headerName: "当前试验编号下试样个数", width: 203 },
    { field: "nMaxLoad", headerName: "最大力", width: 99 },
    { field: "nMaxDistort", headerName: "抗拉压折弯强度", width: 151 },
    { field: "nMaxStrength", headerName: "抗拉强度", width: 112 },
    { field: "nYieLdUpLoad", headerName: "上屈服力", width: 112 },
    { field: "nYieLdUpStrength", headerName: "上屈服强度", width: 125 },
    { field: "nYieLdLoad", headerName: "屈服力", width: 99 },
    { field: "nYieLdStrength", headerName: "下屈服强度", width: 125 },
    { field: "nFpLoad", headerName: "规定非比例延伸力", width: 164 },
    { field: "nFpStrength", headerName: "规定非比例延伸强度", width: 177 },
    { field: "nFtLoad", headerName: "规定总延伸力", width: 138 },
    { field: "nFtStrength", headerName: "规定总延伸强度", width: 151 },
    { field: "nFinalLength", headerName: "断后标距", width: 112 },
    { field: "nFinalRate", headerName: "断后伸长率", width: 125 },
    { field: "nFinalShrink", headerName: "断面收缩率", width: 125 },
    { field: "nFinalDia", headerName: "断后直径", width: 112 },
    { field: "nFinalWidth", headerName: "断后宽度", width: 112 },
    { field: "nFinalThick", headerName: "断后厚度", width: 112 },
    { field: "nFinalBorder", headerName: "断后边量", width: 112 },
    { field: "nElasticity", headerName: "弹性模量", width: 112 },
    { field: "nDuration", headerName: "持续时间", width: 112 },
    { field: "nMaxSpeed", headerName: "加荷速度峰值", width: 138 },
    { field: "nTemperature", headerName: "试验温度", width: 112 },
    { field: "nHumidity", headerName: "试验湿度", width: 112 },
    { field: "cTestTime", headerName: "试验时间", width: 112 },
    { field: "nFinalPosition", headerName: "断裂位置", width: 112 },
    { field: "cFinalState", headerName: "断裂形态", width: 112 },
    { field: "cBendResult", headerName: "弯曲结果", width: 112 },
    { field: "nMotherLength", headerName: "母材长度", width: 112 },
    { field: "nMotherWeight", headerName: "母材重量", width: 112 },
    { field: "nOrgGaugeLength", headerName: "原始标距", width: 112 },
    { field: "nExtGaugeLength", headerName: "引伸计标距", width: 125 },
    { field: "nDia", headerName: "试样直径", width: 112 },
    { field: "nSpan", headerName: "跨距", width: 86 },
    { field: "nLength", headerName: "试样长度", width: 112 },
    { field: "nWidth", headerName: "试样宽度", width: 112 },
    { field: "nThickness", headerName: "试样厚度", width: 112 },
    { field: "nBorder", headerName: "试样边长", width: 112 },
    { field: "nOutDia", headerName: "试样外径", width: 112 },
    { field: "nInnerDia", headerName: "试样壁厚", width: 112 },
    { field: "nArea", headerName: "试样面积", width: 112 },
    { field: "cEquipCode", headerName: "设备编号", width: 112 },
    { field: "nMeasureRange", headerName: "试验机量程", width: 125 },
    { field: "cIdentifier", headerName: "标识", width: 86 },
    { field: "cCategory", headerName: "类型", width: 86 },
    { field: "nIsFinished", headerName: "是否完成本组所有试样标记", width: 216 },
    { field: "cTestId", headerName: "测试编号", width: 112 },
    { field: "cSaveFileName", headerName: "保存文件名", width: 125 },
    { field: "cCtrlMode", headerName: "控制模式", width: 112 },
    { field: "nDistanceBeforeTest", headerName: "测试前距离", width: 125 },
    { field: "nDistanceAfterTest", headerName: "测试后距离", width: 125 },
    { field: "nMaxGaugeLength", headerName: "最大量规长度", width: 138 },
    { field: "nMaxFinalLength", headerName: "最大最终长度", width: 138 },
    { field: "nWeightLenght1", headerName: "重量长度1", width: 125 },
    { field: "nWeightLenght2", headerName: "重量长度2", width: 125 },
    { field: "nWeightLenght3", headerName: "重量长度3", width: 125 },
    { field: "nWeightLenght4", headerName: "重量长度4", width: 125 },
    { field: "nWeightLenght5", headerName: "重量长度5", width: 125 },
    { field: "nTotalWeight", headerName: "总重量", width: 99 },
    { field: "nDiameter1", headerName: "直径1", width: 99 },
    { field: "nDiameter2", headerName: "直径2", width: 99 },
    { field: "nDiameter3", headerName: "直径3", width: 99 },
    { field: "nDiameter4", headerName: "直径4", width: 99 },
    { field: "nDiameter5", headerName: "直径5", width: 99 },
    { field: "cSampleInfo1", headerName: "样本信息1", width: 125 },
    { field: "cSampleInfo2", headerName: "样本信息2", width: 125 },
    { field: "cSampleInfo3", headerName: "样本信息3", width: 125 },
    { field: "cSampleInfo4", headerName: "样本信息4", width: 125 },
    { field: "cSampleInfo5", headerName: "样本信息5", width: 125 },
    { field: "cSampleInfo6", headerName: "样本信息6", width: 125 },
    { field: "cSampleInfo7", headerName: "样本信息7", width: 125 },
    { field: "cSampleInfo8", headerName: "样本信息8", width: 125 },
    { field: "cSampleInfo9", headerName: "样本信息9", width: 125 },
    { field: "cSampleInfo10", headerName: "样本信息10", width: 138 },
    { field: "cCurvePicture", headerName: "曲线图", width: 99 },
    { field: "cSendDevice", headerName: "发送设备", width: 112 },
    { field: "lastModifier", headerName: "最后修改人", width: 125 },
    { field: "lastModifyTime", headerName: "最后修改时间", width: 138 },
    { field: "id", headerName: "主键", width: 86, hide: true },
    { field: "cRemark", headerName: "消息内容", width: 112, hide: true },
];

const impactColDefs: ColDef[] = [
    { field: "creator", headerName: "创建人", width: 99 },
    { field: "createTime", headerName: "创建时间", width: 112 },
    { field: "nOrder", headerName: "消息排序号", width: 125 },
    { field: "stoveNo", headerName: "炉号", width: 86 },
    { field: "testNo", headerName: "代表样号", width: 112 },
    { field: "batchNo", headerName: "组批号", width: 99 },
    { field: "slabPieceNo", headerName: "板坯号", width: 99 },
    { field: "cSampleNo", headerName: "试样号", width: 99 },
    { field: "nStatus", headerName: "处理标记", width: 112 },
    { field: "cLength", headerName: "试样长度", width: 112 },
    { field: "cWidth", headerName: "试样宽度", width: 112 },
    { field: "cThickness", headerName: "试样厚度", width: 112 },
    { field: "cNotchDepth", headerName: "缺口深度mm", width: 138 },
    { field: "cNotchType", headerName: "缺口类型", width: 112 },
    { field: "cDirection", headerName: "试验方向", width: 112 },
    { field: "cEnergy1", headerName: "吸收功1[J]", width: 151 },
    { field: "cTemperature", headerName: "试验温度", width: 112 },
    { field: "cEnergy2", headerName: "吸收功2[J]", width: 151 },
    { field: "cEnergy3", headerName: "吸收功3[J]", width: 151 },
    { field: "cAveEnergy", headerName: "平均吸收功[J]", width: 164 },
    { field: "cSendDevice", headerName: "发送设备", width: 112 },
    { field: "lastModifier", headerName: "最后修改人", width: 125 },
    { field: "lastModifyTime", headerName: "最后修改时间", width: 138 },
    { field: "id", headerName: "主键", width: 86, hide: true },
    { field: "cRemark", headerName: "反馈结果", width: 112, hide: true },
];

/* ---------- DataBind：查询按钮与页签切换共用（原 btnQuery_Click / SelectedPageChanged） ---------- */
function inputDto() {
  return {
    cTestNo: query.cTestNo.trim(),
    cTestItem: query.cTestItem.trim(),
    cSampleNo: query.cSampleNo.trim(),
    nStatus: query.nStatus ?? undefined,
    timeRange: toTimeRange(query.dates),
  };
}
async function queryLx() {
  lxLoading.value = true;
  try {
    lxRows.value = (await tqlLXCollectApi.queryTqlLxCollects(inputDto())) ?? [];
    requestAnimationFrame(() => lxApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    lxLoading.value = false;
  }
}
async function queryImpact() {
  impactLoading.value = true;
  try {
    impactRows.value = (await tqlLXCollectApi.queryTqlImpactCollects(inputDto())) ?? [];
    requestAnimationFrame(() => impactApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    impactLoading.value = false;
  }
}
async function dataBind() {
  if (activeTab.value === "lx") await queryLx();
  else if (activeTab.value === "impact") await queryImpact();
  /* 弯曲页签：原 else 分支为空，不查询 */
}
function onQuery() {
  void dataBind();
}
/* 原 xtraTabControl1.SelectedPageChanged → 重新 DataBind */
function onTabChange() {
  void dataBind();
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 dataLayoutControl1，Dock=Top：试验编号/试验项目号/试样编号/状态/创建时间） -->
    <div class="shrink-0 border-b border-border/60 px-2 py-1.5">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">试验编号</label>
          <InputText v-model="query.cTestNo" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">试验项目号</label>
          <InputText v-model="query.cTestItem" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">试样编号</label>
          <InputText v-model="query.cSampleNo" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">状态</label>
          <Select v-model="query.nStatus" :options="statusOptions" option-label="label" option-value="value"
            show-clear class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">创建时间</label>
          <DatePicker v-model="query.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
            show-icon class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1：查询） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="lxLoading || impactLoading" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 页签（原 xtraTabControl1，Dock=Fill） -->
    <Tabs v-model:value="activeTab" class="min-h-0 flex-1 flex-col" @update:value="onTabChange">
      <div class="shrink-0 border-b border-border/60">
        <TabList class="min-w-0">
          <Tab value="lx">拉伸信息</Tab>
          <Tab value="impact">冲击信息</Tab>
          <Tab value="bend">弯曲信息</Tab>
        </TabList>
      </div>
      <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
        <TabPanel value="lx" class="h-full overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="lxColDefs" :row-data="lxRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :suppress-column-virtualisation="true" :pagination="false" :animate-rows="false" :loading="lxLoading"
            @grid-ready="onLxReady" @first-data-rendered="autoSizeOnFirstData" />
        </TabPanel>
        <TabPanel value="impact" class="h-full overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="impactColDefs" :row-data="impactRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :suppress-column-virtualisation="true" :pagination="false" :animate-rows="false" :loading="impactLoading"
            @grid-ready="onImpactReady" @first-data-rendered="autoSizeOnFirstData" />
        </TabPanel>
        <TabPanel value="bend" class="h-full overflow-auto">
          <!-- 原 Designer：xtraTabPage3 无子控件，DataBind else 分支为空 -->
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
