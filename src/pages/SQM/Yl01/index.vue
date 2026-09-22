<script setup lang="ts">
/** 对应 FrmYl01（炼钢工艺要点）：DDH.Winforms.SQM.Forms.Tqmyl.FrmYl01
 *  画面迁移，逻辑不迁移到
 *  布局：条件区 5 项 → 工具栏 8 按钮 → 上下分栏(53/47)
 *    上栏 = 左右分栏(73/27)：左 UCYl01 主表(Tqmyl01) / 右 UCTqmyl02 钢种标准(Tqmyl02)
 *    下栏 = UCProcValueTables 页签（原静态页签仅「产前准备」，工序页签由数据运行时 Add，第二阶段接入）
 *           页签内 UCIndexValueEditView：左右分栏(34/66) 候选(YlgyTemplate) >> / << 指标明细(Tqmyl04) + tips 栏
 *  UCIndexValueEditView 工具栏原 4 按钮仅「复制选中行数据」可见（二冷水/从炼钢工艺卡复制/从其他工序复制 Visible=false，不渲染） */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconCheck, IconCopy, IconPencil, IconPlus, IconSearch, IconSettings, IconTrash, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/** NValidFlag：0 未生效 / 1 已生效 */
const validFmt = (p: ValueFormatterParams) => (p.value == null ? "" : Number(p.value) === 1 ? "已生效" : "未生效");
/** NInterval 系列：开闭区间显示串 */
const intervalFmt = (p: ValueFormatterParams) =>
  (({ 1: "≤E≤", 2: "＜E≤", 4: "≤E＜", 6: "＜E＜" }) as Record<string, string>)[String(p.value)] ?? "";

/** 原 cboxValidFlag 为 ImageComboBoxEdit，选项运行时填充；画面态给全部/未生效/已生效 */
const validOptions = [
  { label: "全部", value: null as number | null },
  { label: "未生效", value: 0 },
  { label: "已生效", value: 1 },
];

const input = reactive({
  cCode: "",
  cName: "",
  sgSign: "",
  sgStd: "",
  nValidFlag: null as number | null,
});

const querying = ref(false);
const activeTab = ref("pre");

const rows = ref<any[]>([]);
const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

/* ---------- 上栏右侧：钢种标准（UCTqmyl02） ---------- */
const gzRows = ref<any[]>([]);
/* ---------- 下栏「产前准备」：候选 / 指标明细（UCIndexValueEditView） ---------- */
const candRows = ref<any[]>([]);
const ivRows = ref<any[]>([]);

/** 行转移按钮列（原 Unbound 列 ">>" / "<<"，Width=30；列头菜单按钮占宽故给 52），仅画面占位 */
function xferCol(dir: "in" | "out"): ColDef {
  const caption = dir === "in" ? ">>" : "<<";
  return { colId: `xfer-${dir}`, headerName: caption, width: 52, minWidth: 52, sortable: false, resizable: false, filter: false, cellRenderer: () => caption };
}

/** Designer 未给列宽；按列头字数给宽（表头含筛选/列菜单图标，留 60px），转移列除外 */
function fitWidth(cols: ColDef[]): ColDef[] {
  return cols.map((c) =>
    c.colId?.startsWith("xfer-") ? c : { ...c, width: Math.max(c.width ?? 0, (c.headerName ?? "").length * 13 + 60) },
  );
}

/* 主表：UCYl01 gridView1 → Tqmyl01，VisibleIndex 0~9 */
const masterColDefs: ColDef[] = fitWidth([
  { field: "CCode", headerName: "编码", width: 120 },
  { field: "CName", headerName: "名称", width: 180 },
  { field: "SgSignDesc", headerName: "钢种标准", width: 120 },
  { field: "CPlanRouteDesc", headerName: "工艺路径描述", width: 150 },
  { field: "NValidFlag", headerName: "生效标记", width: 90, valueFormatter: validFmt },
  { field: "CLineCode", headerName: "产线", width: 80 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "LastModifier", headerName: "最后更新人", width: 100 },
  { field: "LastModifyTime", headerName: "最后更新时间", width: 140 },
  { field: "Id", headerName: "主键", width: 150, hide: true },
  { field: "CPlanRouteCode", headerName: "工艺路径代码", width: 110, hide: true },
  { field: "CStNo", headerName: "炼钢工艺卡", width: 100, hide: true },
  { field: "CPreRemark", headerName: "产前准备", width: 140, hide: true },
  { field: "Selected", headerName: "选择", width: 70, hide: true },
]);

/* 钢种标准：UCTqmyl02 gridView1 → Tqmyl02 */
const gzColDefs: ColDef[] = fitWidth([
  { field: "CSgSign", headerName: "钢种牌号", width: 120 },
  { field: "CSgStd", headerName: "执行标准", width: 140 },
  { field: "Id", headerName: "主键", width: 150, hide: true },
  { field: "Creator", headerName: "创建人", width: 90, hide: true },
  { field: "CreateTime", headerName: "创建时间", width: 140, hide: true },
  { field: "LastModifier", headerName: "最后修改人", width: 100, hide: true },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { field: "CTqmyl01Id", headerName: "冶炼工艺要点ID", width: 150, hide: true },
  { field: "CGyCode", headerName: "冶炼工艺要点编号", width: 130, hide: true },
  { field: "Selected", headerName: "选择", width: 70, hide: true },
]);

/* 候选：UCIndexValueEditView gridView1 → YlgyTemplate */
const candColDefs: ColDef[] = fitWidth([
  { field: "Code", headerName: "编码", width: 110 },
  { field: "Name", headerName: "名称", width: 130 },
  xferCol("in"),
]);

/* 指标明细：UCIndexValueEditView gridView2 → Tqmyl04，VisibleIndex 0~24 */
const ivColDefs: ColDef[] = fitWidth([
  xferCol("out"),
  { field: "CCode", headerName: "指标代码", width: 110 },
  { field: "CName", headerName: "指标名称", width: 140 },
  { field: "NSeq", headerName: "顺序号", width: 80 },
  { field: "CUnit", headerName: "单位", width: 70 },
  { field: "NTargetValue", headerName: "目标值", width: 90 },
  { field: "NMinValue", headerName: "最小值", width: 90 },
  { field: "NInterval", headerName: "开闭区间", width: 90, valueFormatter: intervalFmt },
  { field: "NMaxValue", headerName: "最大值", width: 90 },
  { field: "CTextValue", headerName: "文本值", width: 110 },
  { field: "NAccuracy", headerName: "小数位数", width: 90 },
  { field: "NAlarmMin", headerName: "报警下限", width: 90 },
  { field: "NIntervalAlarm", headerName: "开闭区间", width: 90, valueFormatter: intervalFmt },
  { field: "NAlarmMax", headerName: "报警上限", width: 90 },
  { field: "NAlarmLv", headerName: "报警等级", width: 90 },
  { field: "CIngotCode", headerName: "锭坯型", width: 90 },
  { field: "CSgSign", headerName: "钢种", width: 90 },
  { field: "CSgStd", headerName: "标准", width: 110 },
  { field: "CMachine", headerName: "机台", width: 90 },
  { field: "CNextProc", headerName: "下道工序", width: 100 },
  { field: "CLineCode", headerName: "产线", width: 80 },
  { field: "NThickMin", headerName: "厚度下限", width: 90 },
  { field: "NThickMax", headerName: "厚度上限", width: 90 },
  { field: "NWidthMin", headerName: "宽度下限", width: 90 },
  { field: "NWidthMax", headerName: "宽度上限", width: 90 },
  { field: "Id", headerName: "主键", width: 150, hide: true },
  { field: "CTqmyl01Id", headerName: "冶炼工艺要点ID", width: 150, hide: true },
  { field: "CTqmyl01Code", headerName: "冶炼工艺要点编号", width: 130, hide: true },
  { field: "CProc", headerName: "作业工序", width: 100, hide: true },
  { field: "NProcSeq", headerName: "作业工序顺序号", width: 120, hide: true },
  { field: "CTqmyl03Id", headerName: "TQMYL03", width: 140, hide: true },
  { field: "CClass", headerName: "指标分类", width: 100, hide: true },
  { field: "CClassDesc", headerName: "指标分类描述", width: 120, hide: true },
  { field: "NValueType", headerName: "值类型", width: 90, hide: true },
  { field: "NMinValueYellow", headerName: "黄色报警下限", width: 110, hide: true },
  { field: "NIntervalYellow", headerName: "开闭区间", width: 90, hide: true, valueFormatter: intervalFmt },
  { field: "NMaxValueYellow", headerName: "黄色报警上限", width: 110, hide: true },
  { field: "NDurationYellow", headerName: "黄色报警持续时间", width: 130, hide: true },
  { field: "NMinValueOrange", headerName: "橙色报警下限", width: 110, hide: true },
  { field: "NIntervalOrange", headerName: "开闭区间", width: 90, hide: true, valueFormatter: intervalFmt },
  { field: "NMaxValueOrange", headerName: "橙色报警上限", width: 110, hide: true },
  { field: "NDurationOrange", headerName: "橙色报警持续时间", width: 130, hide: true },
  { field: "NMinValueRed", headerName: "红色报警下限", width: 110, hide: true },
  { field: "NIntervalRed", headerName: "开闭区间", width: 90, hide: true, valueFormatter: intervalFmt },
  { field: "NMaxValueRed", headerName: "红色报警上限", width: 110, hide: true },
  { field: "NDurationRed", headerName: "红色报警持续时间", width: 130, hide: true },
  { field: "Selected", headerName: "选择", width: 70, hide: true },
  { field: "NUpperPercent", headerName: "上偏差%", width: 90, hide: true },
  { field: "NLowerPercent", headerName: "下偏差%", width: 90, hide: true },
  { field: "CIsJudge", headerName: "是否判定", width: 90, hide: true },
  { field: "CIsPrint", headerName: "是否打印", width: 90, hide: true },
  { field: "CFormula", headerName: "计算公式", width: 120, hide: true },
  { field: "CJudgeFormula", headerName: "判定公式", width: 120, hide: true },
]);

function resizeAll() { requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns()); }

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    gzRows.value = [];
    candRows.value = [];
    ivRows.value = [];
    resizeAll();
  } finally {
    querying.value = false;
  }
}
function onAdd() { toast("画面迁移：添加（FrmYl01Edit）逻辑待接入", 2000, "warn"); }
function onEdit() { toast("画面迁移：编辑（FrmYl01Edit）逻辑待接入", 2000, "warn"); }
function onCopy() { toast("画面迁移：复制（FrmYl01Edit）逻辑待接入", 2000, "warn"); }
function onEnable() { toast("画面迁移：生效逻辑待接入", 2000, "warn"); }
function onDisable() { toast("画面迁移：禁用逻辑待接入", 2000, "warn"); }
function onItemConfig() { toast("画面迁移：指标属性配置逻辑待接入", 2000, "warn"); }
function onAlarmConfig() { toast("画面迁移：指标报警配置逻辑待接入", 2000, "warn"); }
/* UCTqmyl02 工具栏 */
function onGzAdd() { toast("画面迁移：钢种标准添加（UCSelectNKGZ 选择器）逻辑待接入", 2000, "warn"); }
function onGzRemove() { toast("画面迁移：钢种标准删除逻辑待接入", 2000, "warn"); }
/* UCIndexValueEditView 工具栏 */
function onCopyRow() { toast("画面迁移：复制选中行数据逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区：dataLayoutControl1 单行 5 项（编号/名称/钢种/标准/生效状态） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-2 py-1.5">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">编号</label>
        <InputText v-model="input.cCode" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">名称</label>
        <InputText v-model="input.cName" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.sgSign" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">标准</label>
        <InputText v-model="input.sgStd" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">生效状态</label>
        <Select v-model="input.nValidFlag" :options="validOptions" option-label="label" :show-clear="false"
          class="min-w-0 flex-1" />
      </div>
    </div>

    <!-- 操作工具栏：stackPanel1 八按钮，顺序照原 -->
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
      <Button text class="shrink-0 whitespace-nowrap" @click="onEnable">
        <IconCheck class="h-3 w-3" />生效
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDisable">
        <IconX class="h-3 w-3" />禁用
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onItemConfig">
        <IconSettings class="h-3 w-3" />指标属性配置
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAlarmConfig">
        <IconSettings class="h-3 w-3" />指标报警配置
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">炼钢工艺要点（{{ rows.length }}）</span>
    </div>

    <!-- 上下主子表：splitContainerControl1（原 SplitterPosition 281/531） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <!-- 上栏：左右分栏 splitContainerControl2（原 813/1109） -->
      <SplitterPanel :size="53" :minSize="22" class="flex flex-col overflow-hidden">
        <Splitter class="min-h-0 flex-1">
          <!-- 左：UCYl01 主表 -->
          <SplitterPanel :size="73" :minSize="30" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">炼钢工艺要点</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="masterColDefs" :row-data="rows"
                :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
                :suppress-column-virtualisation="true"
                :pagination="false" :animate-rows="false" :loading="querying"
                @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>

          <!-- 右：UCTqmyl02 钢种标准（条件行 + 工具栏 + 表格） -->
          <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center gap-1.5 border-b border-border/60 px-2">
              <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种标准</label>
              <InputText readonly placeholder="选择钢种标准" class="min-w-0 flex-1" />
            </div>
            <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
              <Button text class="shrink-0 whitespace-nowrap" @click="onGzAdd">
                <IconPlus class="h-3 w-3" />添加
              </Button>
              <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onGzRemove">
                <IconTrash class="h-3 w-3" />删除
              </Button>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="gzColDefs" :row-data="gzRows"
                :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
                :suppress-column-virtualisation="true"
                :pagination="false" :animate-rows="false" @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>

      <!-- 下栏：UCProcValueTables 页签（原静态页签仅「产前准备」） -->
      <SplitterPanel :size="47" :minSize="22" class="flex flex-col overflow-hidden">
        <Tabs v-model:value="activeTab" class="min-h-0 flex-1 flex-col">
          <div class="flex shrink-0 items-center border-b border-border/60">
            <TabList class="min-w-0 flex-1">
              <Tab value="pre">产前准备</Tab>
            </TabList>
          </div>
          <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
            <!-- UCIndexValueEditView：工具栏 + 左右分栏 34/66 -->
            <TabPanel value="pre" class="h-full overflow-hidden">
              <div class="flex h-full flex-col">
                <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                  <Button text class="shrink-0 whitespace-nowrap" @click="onCopyRow">
                    <IconCopy class="h-3 w-3" />复制选中行数据
                  </Button>
                </div>
                <Splitter class="min-h-0 flex-1">
                  <!-- 左：候选指标模板 YlgyTemplate -->
                  <SplitterPanel :size="34" :minSize="16" class="flex flex-col overflow-hidden">
                    <div class="min-h-0 flex-1 overflow-hidden">
                      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                        :default-col-def="hmxDefaultColDef" :column-defs="candColDefs" :row-data="candRows"
                        :suppress-column-virtualisation="true"
                        :pagination="false" :animate-rows="false" @first-data-rendered="autoSizeOnFirstData" />
                    </div>
                  </SplitterPanel>
                  <!-- 右：指标明细 Tqmyl04 + 底部 tips 栏（flowLayoutPanel2） -->
                  <SplitterPanel :minSize="30" class="flex flex-col overflow-hidden">
                    <div class="min-h-0 flex-1 overflow-hidden">
                      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                        :default-col-def="hmxDefaultColDef" :column-defs="ivColDefs" :row-data="ivRows"
                        :suppress-column-virtualisation="true"
                        :pagination="false" :animate-rows="false" @first-data-rendered="autoSizeOnFirstData" />
                    </div>
                    <div class="flex h-5 shrink-0 items-center border-t border-border/60 px-2">
                      <span class="text-xs text-muted-foreground">tips:</span>
                    </div>
                  </SplitterPanel>
                </Splitter>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
