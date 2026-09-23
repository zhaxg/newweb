<script setup lang="ts">
/** 对应 FrmTqmtd10（执行标准管理）：DDH.Winforms.SQM.Forms.Tqmtd.FrmTqmtd10
 *  画面迁移，逻辑不迁移到
 *  上下主子表（ucTqmtdView1）+ 下栏 XtraTabControl 四页签（成分/性能/取样/其他），
 *  前三页签为「候选 >> / 已选 <<」左右双栏（UCTqmtd13/11/12EditView）
 *  QM3005~QM3008 共用本窗体，原系统以 QueryString 作产线参数 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import SelectButton from "primevue/selectbutton";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCheck, IconCopy, IconList, IconPencil, IconPlus, IconRefresh, IconSearch, IconTrash, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/** ValidFlag：0 未生效 / 1 已生效（原 NStatusImageComboBoxEdit 两项） */
const validFmt = (p: ValueFormatterParams) => (p.value == null ? "" : Number(p.value) === 1 ? "已生效" : "未生效");
const yesNoFmt = (p: ValueFormatterParams) => (p.value == null ? "" : Number(p.value) === 1 ? "是" : "否");
/** EqualsFlag 开闭区间显示串，与原 [LDisplay] 一致 */
const intervalFmt = (p: ValueFormatterParams) =>
  (({ 1: "≤E≤", 2: "＜E≤", 4: "≤E＜", 6: "＜E＜" }) as Record<string, string>)[String(p.value)] ?? "";

const statusOptions = [
  { label: "未生效", value: 0 },
  { label: "已生效", value: 1 },
];

const input = reactive({ sgStd: "", sgSign: "", nStatus: null as number | null });
const querying = ref(false);
/** 原 xtraTabControl1 四页签（成分/性能/取样/其他，默认「成分」）
 *  → SelectButton 切换，不引 Tabs（ui-rules §6 模式切换页签） */
const tabModes = ["成分", "性能", "取样", "其他"];
const activeTab = ref(tabModes[0]);

const rows = ref<any[]>([]);
const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

/* ---------- 下栏三页签：左=候选字典、右=已选明细（画面态，数据一律空；
 *  原左候选 OptionsFind.AlwaysVisible 查找栏按需求裁撤，不迁 quick-filter） ---------- */
const cfLeftRows = ref<any[]>([]);
const cfRows = ref<any[]>([]);
const xnLeftRows = ref<any[]>([]);
const xnRows = ref<any[]>([]);
const qyLeftRows = ref<any[]>([]);
const qyRows = ref<any[]>([]);

/** 行转移按钮列（原 Unbound 列 ">>" / "<<"），仅画面占位 */
function xferCol(dir: "in" | "out"): ColDef {
  const caption = dir === "in" ? ">>" : "<<";
  return { colId: `xfer-${dir}`, headerName: caption, width: 52, minWidth: 52, sortable: false, resizable: false, filter: false, cellRenderer: () => caption };
}

/* 主表：UCTqmtd10View gridView1，按 VisibleIndex 0~15；Id/内控钢种原为隐藏列 */
const masterColDefs: ColDef[] = [
  { field: "CStd", headerName: "标准", width: 120 },
  { field: "CGbStlGrd", headerName: "钢种", width: 90 },
  { field: "CStlGrdClass", headerName: "钢种大类", width: 90 },
  { field: "NStatus", headerName: "状态", width: 80, valueFormatter: validFmt },
  { field: "CProdClass", headerName: "产品大类", width: 90 },
  { field: "CProdCode", headerName: "品名代码", width: 90 },
  { field: "CDelivyStatusCode", headerName: "交货状态代码", width: 110 },
  { field: "CProcessPurposeCode", headerName: "加工用途代码", width: 110 },
  { field: "CCustCode", headerName: "客户代码", width: 90 },
  { field: "CRemark", headerName: "备注", width: 140 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "CCheckUser", headerName: "审核人", width: 90 },
  { field: "DCheckTime", headerName: "审核时间", width: 140 },
  { field: "LastModifier", headerName: "最后修改人", width: 100 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140 },
  { field: "Id", headerName: "主键", width: 150, hide: true },
  { field: "CNkStlGrd", headerName: "内控钢种", width: 100, hide: true },
];

/* 成分-候选：HmxKv（gridView1，原 OptionsFind 查找栏已裁撤） */
const cfLeftColDefs: ColDef[] = [
  { field: "CCode", headerName: "编码", width: 90 },
  { field: "CName", headerName: "组名", width: 90 },
  xferCol("in"),
  { field: "Id", headerName: "主键", width: 150, hide: true },
  { field: "CDesc", headerName: "描述", width: 120, hide: true },
  { field: "CEnable", headerName: "启用", width: 70, hide: true },
  { field: "CGroup", headerName: "分组", width: 90, hide: true },
  { field: "COrder", headerName: "排序", width: 70, hide: true },
  { field: "CPid", headerName: "父编码", width: 120, hide: true },
  { field: "CSw01", headerName: "扩展1", width: 90, hide: true },
  { field: "CSw02", headerName: "扩展2", width: 90, hide: true },
  { field: "CSw03", headerName: "扩展3", width: 90, hide: true },
  { field: "CSw04", headerName: "扩展4", width: 90, hide: true },
  { field: "CSw05", headerName: "扩展5", width: 90, hide: true },
  { field: "CValue", headerName: "扩展值", width: 90, hide: true },
  { field: "Selected", headerName: "Selected", width: 90, hide: true },
];

/* 成分-已选：Tqmtd13（gridView2） */
const cfColDefs: ColDef[] = [
  xferCol("out"),
  { field: "CItem", headerName: "元素代码", width: 90 },
  { field: "CItemName", headerName: "元素名称", width: 90 },
  { field: "CUnit", headerName: "单位", width: 70 },
  { field: "NDecimalPlaces", headerName: "小数位数", width: 90 },
  { field: "NMinValue", headerName: "最小值", width: 90 },
  { field: "NValueInterval", headerName: "开闭区间", width: 90, valueFormatter: intervalFmt },
  { field: "NMaxValue", headerName: "最大值", width: 90 },
  { field: "NTargetValue", headerName: "目标值", width: 90 },
  { field: "CIsJudge", headerName: "是否判定", width: 90, valueFormatter: yesNoFmt },
  { field: "CIsPrint", headerName: "是否打印", width: 90, valueFormatter: yesNoFmt },
  { field: "CFormula", headerName: "计算公式", width: 120 },
  { field: "NThickMin", headerName: "厚高径最小", width: 100 },
  { field: "NThickInterval", headerName: "厚高径开闭区间", width: 120, valueFormatter: intervalFmt },
  { field: "NThickMax", headerName: "厚高径最大", width: 100 },
  { field: "CJudgeFormula", headerName: "判定公式", width: 120 },
  { field: "CRemark", headerName: "备注", width: 140 },
  { field: "Id", headerName: "主键", width: 150, hide: true },
  { field: "CTqmtd10Id", headerName: "TQMTD10.ID", width: 150, hide: true },
  { field: "NWidthMin", headerName: "宽度最小", width: 90, hide: true },
  { field: "NWidthInterval", headerName: "宽度开闭区间", width: 120, hide: true },
  { field: "NWidthMax", headerName: "宽度最大", width: 90, hide: true },
  { field: "NLengthMin", headerName: "长度最小", width: 90, hide: true },
  { field: "NLengthInterval", headerName: "长度开闭区间", width: 120, hide: true },
  { field: "NLengthMax", headerName: "长度最大", width: 90, hide: true },
  { field: "NTestTemperature", headerName: "试验温度", width: 90, hide: true },
  { field: "CTestCondition", headerName: "试验条件", width: 100, hide: true },
  { field: "Selected", headerName: "Selected", width: 90, hide: true },
];

/* 性能-候选：TestSubItem（gridView1） */
const xnLeftColDefs: ColDef[] = [
  { field: "TestSubItemCode", headerName: "代码", width: 90 },
  { field: "TestSubItemName", headerName: "名称", width: 110 },
  xferCol("in"),
  { field: "TestItemType", headerName: "试验项目种类", width: 110, hide: true },
  { field: "TestItemTypeDesc", headerName: "试验项目种类说明", width: 140, hide: true },
  { field: "TestItemCode", headerName: "试验项目代码", width: 110, hide: true },
  { field: "TestItemName", headerName: "试验项目名称", width: 110, hide: true },
  { field: "DlDxFlag", headerName: "定量定性标识", width: 110, hide: true },
  { field: "Unit", headerName: "单位", width: 70, hide: true },
  { field: "Other1", headerName: "试验子项目描述", width: 130, hide: true },
  { field: "Other2", headerName: "值来源", width: 90, hide: true },
  { field: "Other3", headerName: "显示名称来源", width: 110, hide: true },
  { field: "Other4", headerName: "试验子项目英文名称", width: 150, hide: true },
  { field: "Other5", headerName: "精度", width: 70, hide: true },
  { field: "Other6", headerName: "预留6", width: 80, hide: true },
  { field: "Other7", headerName: "预留7", width: 80, hide: true },
  { field: "Other8", headerName: "预留8", width: 80, hide: true },
  { field: "Seq", headerName: "录入排序", width: 90, hide: true },
  { field: "TableCode", headerName: "TableCode", width: 110, hide: true },
  { field: "Id", headerName: "Id", width: 150, hide: true },
];

/* 性能-已选：Tqmtd11（gridView2） */
const xnColDefs: ColDef[] = [
  xferCol("out"),
  { field: "CTestSubItemName", headerName: "试验子项目名称", width: 130 },
  { field: "CUnit", headerName: "单位", width: 70 },
  { field: "CCtrlMode", headerName: "管控模式", width: 90 },
  { field: "NMinValue", headerName: "最小值", width: 90 },
  { field: "NValueInterval", headerName: "开闭区间", width: 90, valueFormatter: intervalFmt },
  { field: "NMaxValue", headerName: "最大值", width: 90 },
  { field: "CTargetValue", headerName: "目标值", width: 90 },
  { field: "NMinValueNk", headerName: "内控最小值", width: 100 },
  { field: "NValueIntervalNk", headerName: "内控开闭区间", width: 110, valueFormatter: intervalFmt },
  { field: "NMaxValueNk", headerName: "内控最大值", width: 100 },
  { field: "CIsJudge", headerName: "是否判定", width: 90, valueFormatter: yesNoFmt },
  { field: "CIsPrint", headerName: "是否打印", width: 90, valueFormatter: yesNoFmt },
  { field: "CFormula", headerName: "计算公式", width: 120 },
  { field: "DecimalPlaces", headerName: "小数位数", width: 90 },
  { field: "NAccuracy", headerName: "精确到", width: 80 },
  { field: "NTestTemperature", headerName: "试验温度", width: 90 },
  { field: "CTestCondition", headerName: "试验条件", width: 100 },
  { field: "CJudgeFormula", headerName: "判定公式", width: 120 },
  { field: "NThickMin", headerName: "厚高径最小", width: 100 },
  { field: "NThickInterval", headerName: "厚高径开闭区间", width: 120, valueFormatter: intervalFmt },
  { field: "NThickMax", headerName: "厚高径最大", width: 100 },
  { field: "CRemark", headerName: "备注", width: 140 },
  { field: "Id", headerName: "主键", width: 150, hide: true },
  { field: "CTqmtd10Id", headerName: "TQMTD10.ID", width: 150, hide: true },
  { field: "CTestItemType", headerName: "试验项目大类", width: 110, hide: true },
  { field: "CTestItemTypeDesc", headerName: "试验项目大类描述", width: 140, hide: true },
  { field: "CTestSubItem", headerName: "试验子项目", width: 100, hide: true },
  { field: "NWidthMin", headerName: "宽度最小", width: 90, hide: true },
  { field: "NWidthInterval", headerName: "宽度开闭区间", width: 120, hide: true },
  { field: "NWidthMax", headerName: "宽度最大", width: 90, hide: true },
  { field: "NLengthMin", headerName: "长度最小", width: 90, hide: true },
  { field: "NLengthInterval", headerName: "长度开闭区间", width: 120, hide: true },
  { field: "NLengthMax", headerName: "长度最大", width: 90, hide: true },
  { field: "Selected", headerName: "Selected", width: 90, hide: true },
];

/* 取样-候选：TestItemDto（gridView1） */
const qyLeftColDefs: ColDef[] = [
  { field: "TestItemCode", headerName: "代码", width: 90 },
  { field: "TestItemName", headerName: "名称", width: 110 },
  xferCol("in"),
  { field: "TestItemType", headerName: "试验项目种类", width: 110, hide: true },
  { field: "TestItemTypeDesc", headerName: "试验项目种类说明", width: 140, hide: true },
  { field: "TestItemEName", headerName: "试验项目英文名称", width: 150, hide: true },
  { field: "LabGrp", headerName: "实验室录入分组", width: 130, hide: true },
  { field: "TestItemTypePos", headerName: "项目种类列印位置", width: 150, hide: true },
  { field: "TestItemTypeGrp", headerName: "项目种类分组说明", width: 140, hide: true },
  { field: "TestItemTypeGrpEn", headerName: "项目种类分组说明英文", width: 170, hide: true },
];

/* 取样-已选：Tqmtd12（gridView2） */
const qyColDefs: ColDef[] = [
  xferCol("out"),
  { field: "CTestItemName", headerName: "试验项目名称", width: 120 },
  { field: "CSmpThick", headerName: "取样规格", width: 90 },
  { field: "CSmpLength", headerName: "取样长度", width: 90 },
  { field: "CSmpWay", headerName: "取样方法", width: 90 },
  { field: "NTestNum", headerName: "试验组数", width: 90 },
  { field: "CSmpCount", headerName: "取样数量", width: 90 },
  { field: "CSmpCountRe", headerName: "复验倍数", width: 90 },
  { field: "CSmpUnit", headerName: "数量单位", width: 90 },
  { field: "NSmpWgt", headerName: "取样重量kg", width: 110 },
  { field: "CSmpPosition", headerName: "取样部位", width: 90 },
  { field: "CTestWay", headerName: "试验方法", width: 90 },
  { field: "CReamrk", headerName: "备注", width: 140 },
  { field: "Id", headerName: "Id", width: 150, hide: true },
  { field: "CTqmtd10Id", headerName: "TQMTD10.ID", width: 150, hide: true },
  { field: "CTestItemType", headerName: "试验项目种类", width: 110, hide: true },
  { field: "CTestItemTypeDesc", headerName: "试验项目种类说明", width: 140, hide: true },
  { field: "CTestItem", headerName: "试验项目代码", width: 110, hide: true },
  { field: "Selected", headerName: "Selected", width: 90, hide: true },
];

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}
function onAdd() { toast("画面迁移：添加逻辑待接入", 2000, "warn"); }
function onEdit() { toast("画面迁移：编辑逻辑待接入", 2000, "warn"); }
function onCopy() { toast("画面迁移：复制逻辑待接入", 2000, "warn"); }
function onDelete() { toast("画面迁移：删除逻辑待接入", 2000, "warn"); }
function onCheck() { toast("画面迁移：审核生效逻辑待接入", 2000, "warn"); }
function onDisable() { toast("画面迁移：禁用逻辑待接入", 2000, "warn"); }
function onQueryRecord() { toast("画面迁移：修改履历逻辑待接入", 2000, "warn"); }
function onUpdateTestItem() { toast("画面迁移：更新检验项目逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：dataLayoutControl1 单行三条件 → 6列 grid -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">标准</label>
          <InputText v-model="input.sgStd" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.sgSign" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">状态</label>
          <Select v-model="input.nStatus" :options="statusOptions" option-label="label" option-value="value" show-clear
            placeholder="全部" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 操作工具栏：stackPanel1 九按钮，顺序照原 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCopy">
        <IconCopy class="h-3 w-3" />复制
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCheck">
        <IconCheck class="h-3 w-3" />审核生效
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDisable">
        <IconX class="h-3 w-3" />禁用
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onQueryRecord">
        <IconList class="h-3 w-3" />修改履历
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onUpdateTestItem">
        <IconRefresh class="h-3 w-3" />更新检验项目
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">执行标准管理（{{ rows.length }}）</span>
    </div>

    <!-- 上下主子表：UCTqmtdView splitContainerControl1（原 SplitterPosition 279/567） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="49" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="masterColDefs" :row-data="rows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :suppress-column-virtualisation="true"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="25" class="flex flex-col overflow-hidden">
        <!-- xtraTabControl1：成分 / 性能 / 取样 / 其他（原默认选中「成分」）
             → SelectButton 切换（ui-rules §6：页签下各为同一对左右双表，模式切换不引 Tabs） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <SelectButton v-model="activeTab" :options="tabModes" class="shrink-0" />
        </div>

        <div class="min-h-0 flex-1 overflow-hidden">
          <!-- 成分：UCTqmtd13EditView（左候选 253/943） -->
          <div v-if="activeTab === tabModes[0]" class="h-full overflow-hidden">
            <Splitter class="h-full min-h-0">
              <SplitterPanel :size="27" :minSize="14" class="flex flex-col overflow-hidden">
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="cfLeftColDefs" :row-data="cfLeftRows"
                    :suppress-column-virtualisation="true"
                    :pagination="false" :animate-rows="false" @first-data-rendered="autoSizeOnFirstData" />
                </div>
              </SplitterPanel>
              <SplitterPanel :minSize="30" class="flex flex-col overflow-hidden">
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="cfColDefs" :row-data="cfRows"
                    :suppress-column-virtualisation="true"
                    :pagination="false" :animate-rows="false" @first-data-rendered="autoSizeOnFirstData" />
                </div>
              </SplitterPanel>
            </Splitter>
          </div>

          <!-- 性能：UCTqmtd11EditView（左候选 311/943） -->
          <div v-else-if="activeTab === tabModes[1]" class="h-full overflow-hidden">
            <Splitter class="h-full min-h-0">
              <SplitterPanel :size="33" :minSize="14" class="flex flex-col overflow-hidden">
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="xnLeftColDefs" :row-data="xnLeftRows"
                    :suppress-column-virtualisation="true"
                    :pagination="false" :animate-rows="false" @first-data-rendered="autoSizeOnFirstData" />
                </div>
              </SplitterPanel>
              <SplitterPanel :minSize="30" class="flex flex-col overflow-hidden">
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="xnColDefs" :row-data="xnRows"
                    :suppress-column-virtualisation="true"
                    :pagination="false" :animate-rows="false" @first-data-rendered="autoSizeOnFirstData" />
                </div>
              </SplitterPanel>
            </Splitter>
          </div>

          <!-- 取样：UCTqmtd12EditView（左候选 253/943） -->
          <div v-else-if="activeTab === tabModes[2]" class="h-full overflow-hidden">
            <Splitter class="h-full min-h-0">
              <SplitterPanel :size="27" :minSize="14" class="flex flex-col overflow-hidden">
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="qyLeftColDefs" :row-data="qyLeftRows"
                    :suppress-column-virtualisation="true"
                    :pagination="false" :animate-rows="false" @first-data-rendered="autoSizeOnFirstData" />
                </div>
              </SplitterPanel>
              <SplitterPanel :minSize="30" class="flex flex-col overflow-hidden">
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="qyColDefs" :row-data="qyRows"
                    :suppress-column-virtualisation="true"
                    :pagination="false" :animate-rows="false" @first-data-rendered="autoSizeOnFirstData" />
                </div>
              </SplitterPanel>
            </Splitter>
          </div>

          <!-- 其他：xtraTabPage4 原为空页签 -->
          <div v-else class="h-full overflow-auto">
            <div class="p-3 text-xs text-muted-foreground">暂无内容</div>
          </div>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
