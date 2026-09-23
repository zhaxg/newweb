<script setup lang="ts">
/** 对应 FrmHR3800（修磨作业，菜单 cQueryString=库区号）：DDH.Winforms.SHR.Forms.FrmHR3800
 *  已接入：hR3800Api.querySlab（在制品材料）+ queryThr3800s（修磨日志，swagger 补整个 Api）
 *          + tyd1000Api.queryRoom（库区下拉，原 kuqu1）、默认产出时间 = 前2天 ~ 后7天
 *  待接入：修磨按钮 → FrmHR3800_Add（二级弹窗，占位；其保存方法 hR3800Api.addThr3800 已补进 swagger）
 *        右侧 gridView3（Designer 声明但未挂 GridControl，属设计器遗留）未迁
 *  布局：上下Splitter(609/…≈47%)：
 *        上=groupControl1「在制品材料」[dataLayout 查询条件 + stackPanel1(查询/修磨) + grid(35可见)]
 *        下=groupControl2「修磨日志」[stackPanel2(时间范围+查询) + grid(29可见)] */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch, IconTools } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { hR3800Api, type DtoQueryThr3800SlabInfo, type Thr3800, type TimeRange } from "@/api/mes4ddh/shr.swagger";
import { tyd1000Api, type Tyd1000, type Tyd2000Dto } from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: menuQs } = useMenuQuery();

/* 修磨结果字典（原 AddEnum<SurFaceResultEnum>） */
const RESULT_OPTIONS = [
  { label: "待检", value: 0 },
  { label: "合格", value: 10 },
  { label: "不合格", value: 20 },
  { label: "让步放行", value: 30 },
];

function defaultRange(): [Date, Date] {
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 2);
  const end = new Date(); end.setDate(end.getDate() + 7); end.setHours(23, 59, 59, 0);
  return [start, end];
}

/* 主表（原 gridView1，Tyd2000Dto 35 可见 + 33 hide） */
const slabColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cLineCode", headerName: "产线", width: 100 },
  { field: "cOrderNo", headerName: "订单号", width: 150 },
  { field: "cInboundNo", headerName: "入库标识", width: 120 },
  { field: "cBatchNo", headerName: "批号", width: 120 },
  { field: "cStove", headerName: "炉号", width: 110 },
  { field: "cPieceNo", headerName: "件次号", width: 150 },
  { field: "cPieceNoSlab", headerName: "板坯号", width: 150 },
  { field: "cSgCode", headerName: "钢种", width: 110 },
  { field: "cPrintCode", headerName: "喷号", width: 130 },
  { field: "cSgStd", headerName: "执行标准", width: 130 },
  { field: "cSpec", headerName: "规格", width: 140 },
  { field: "nThick", headerName: "厚度", width: 90 },
  { field: "nWth", headerName: "宽度", width: 90 },
  { field: "nLen", headerName: "长度", width: 90 },
  { field: "nNum", headerName: "支数", width: 90 },
  { field: "cCutFlag", headerName: "切边方式", width: 110 },
  { field: "cWgtToler", headerName: "公差", width: 90 },
  { field: "nCalWgt", headerName: "理重", width: 100 },
  { field: "nWgt", headerName: "实重", width: 100 },
  { field: "cIsSurface", headerName: "是否表检", width: 110 },
  { field: "cSurfaceResult", headerName: "表检结果", width: 110 },
  { field: "cSurfaceDesc", headerName: "表检描述", width: 150 },
  { field: "cSurfaceDefectCode", headerName: "表面缺陷代码", width: 160 },
  { field: "cSurfaceUser", headerName: "表面判定人", width: 130 },
  { field: "dSurfaceTime", headerName: "表面判定时间", width: 170 },
  { field: "dProTime", headerName: "产出时间", width: 170 },
  { field: "cProUser", headerName: "产出人", width: 110 },
  { field: "cShiftNo", headerName: "产出班次", width: 110 },
  { field: "cGroupNo", headerName: "产出班组", width: 110 },
  { field: "dInTime", headerName: "入库时间", width: 170 },
  { field: "cInUser", headerName: "入库人", width: 110 },
  { field: "cStoreCode", headerName: "库区号", width: 130 },
  { field: "cStackNo", headerName: "垛位号", width: 120 },
  { field: "cStackNum", headerName: "层号", width: 90 },
  { field: "cProRemark", headerName: "生产备注", width: 150, flex: 1 },
  /* 隐藏列 */
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cProc", headerName: "工序代码", hide: true },
  { field: "cMachine", headerName: "机台号", hide: true },
  { field: "cPlanId", headerName: "计划号", hide: true },
  { field: "cConNo", headerName: "合同号", hide: true },
  { field: "cMatCode", headerName: "物料编码", hide: true },
  { field: "nProType", headerName: "库存分类", hide: true },
  { field: "cTol", headerName: "公差", hide: true },
  { field: "cSourceStoreCode", headerName: "原库区号", hide: true },
  { field: "cSourceStackNo", headerName: "原垛位号", hide: true },
  { field: "cSourceStackNum", headerName: "原层号", hide: true },
  { field: "nStatus", headerName: "库存状态", hide: true },
  { field: "cIsHot", headerName: "热送区分", hide: true },
  { field: "nCastDivCode", headerName: "模连铸标识", hide: true },
  { field: "cLockedLine", headerName: "占用产线", hide: true },
  { field: "cLockedPlan", headerName: "占用计划", hide: true },
  { field: "cMatType", headerName: "产品大类", hide: true },
  { field: "cProdCode", headerName: "品名", hide: true },
  { field: "cSteelType", headerName: "钢类", hide: true },
  { field: "cDelivyStatusCode", headerName: "交货状态", hide: true },
  { field: "cCustStdCode", headerName: "加工用途代码", hide: true },
  { field: "cOrderNoLast", headerName: "原始订单号", hide: true },
  { field: "cDestination", headerName: "去向", hide: true },
  { field: "cHotNo", headerName: "退火炉回号", hide: true },
  { field: "cSlabType", headerName: "坯类", hide: true },
]);

/* 日志表（原 gridView2，Thr3800 29 可见 + 2 hide） */
const logColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "creator", headerName: "创建人", width: 100 },
  { field: "createTime", headerName: "创建时间", width: 170 },
  { field: "cPieceNo", headerName: "件次号", width: 150 },
  { field: "cSgCode", headerName: "修磨钢种", width: 120 },
  { field: "nThick", headerName: "修磨厚度", width: 120 },
  { field: "nWidth", headerName: "修磨宽度", width: 120 },
  { field: "nLen", headerName: "修磨长度", width: 120 },
  { field: "cSpec", headerName: "修磨规格", width: 140 },
  { field: "nWgt", headerName: "修磨重量", width: 120 },
  { field: "cSurfaceDesc", headerName: "修磨原因", width: 150 },
  { field: "cTol", headerName: "公差", width: 90 },
  { field: "cTrimFlag", headerName: "切边方式", width: 110 },
  { field: "cInboundNo", headerName: "入库标识", width: 120 },
  { field: "nResult", headerName: "修磨结果", width: 110 },
  { field: "cSurfaceRemark", headerName: "缺陷描述", width: 150 },
  { field: "nThickBefore", headerName: "原厚度", width: 110 },
  { field: "nWidthBefore", headerName: "原宽度", width: 110 },
  { field: "nLenBefore", headerName: "原长度", width: 110 },
  { field: "cSpecBefore", headerName: "原规格", width: 140 },
  { field: "nWgtBefore", headerName: "原重量", width: 110 },
  { field: "cSgCodeBefore", headerName: "原钢种", width: 120 },
  { field: "cSurfaceDescBefore", headerName: "原修磨原因", width: 150 },
  { field: "nResultBefore", headerName: "原修磨结果", width: 130 },
  { field: "lastModifier", headerName: "最后修改人", width: 120 },
  { field: "cSurfaceRemarkBefore", headerName: "原缺陷描述", width: 150 },
  { field: "cTolBefore", headerName: "原公差", width: 100 },
  { field: "cTrimFlagBefore", headerName: "原切边方式", width: 130 },
  { field: "cInboundNoBefore", headerName: "原入库标识", width: 140 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 170, flex: 1 },
  { field: "id", headerName: "主键", hide: true },
]);

/* 查询条件（原 dataLayoutControl1 + bscQuerySlab） */
const q = reactive({
  cPieceNo: "",
  cPieceNoSlab: "",
  cSgCode: "",
  nResult: null as number | null,
  cStoreCode: menuQs || "",
  proDates: defaultRange() as Date[] | null,
  logDates: defaultRange() as Date[] | null,
});

const storeOptions = ref<{ label: string; value: string }[]>([]);
const slabs = ref<Tyd2000Dto[]>([]);
const logs = ref<Thr3800[]>([]);
const querying = ref(false);
const slabApi = ref<GridApi | null>(null);
const logApi = ref<GridApi | null>(null);

function onSlabReady(e: GridReadyEvent) { slabApi.value = e.api; }
function onLogReady(e: GridReadyEvent) { logApi.value = e.api; }

function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function loadStores() {
  try {
    const list = ((await tyd1000Api.queryRoom("")) ?? []) as Tyd1000[];
    storeOptions.value = list.filter((x) => x.cStoreCode != null)
      .map((x) => ({ label: x.cStoreDes ?? x.cStoreCode ?? "", value: x.cStoreCode! }));
  } catch { /* 拦截层已 toast */ }
}

function buildSlabQuery(): DtoQueryThr3800SlabInfo {
  return {
    cPieceNo: q.cPieceNo || null,
    cPieceNoSlab: q.cPieceNoSlab || null,
    cSgCode: q.cSgCode || null,
    nResult: q.nResult,
    cStoreCode: q.cStoreCode || null,
    dProTime: q.proDates?.[0] && q.proDates?.[1]
      ? { min: isoDate(q.proDates[0]), max: isoDate(q.proDates[1]) }
      : undefined,
  };
}

/* DataBind → QuerySlab */
async function onQueryStore() {
  querying.value = true;
  try {
    slabs.value = ((await hR3800Api.querySlab(buildSlabQuery())) ?? []) as Tyd2000Dto[];
    slabApi.value?.setGridOption("rowData", slabs.value);
    requestAnimationFrame(() => slabApi.value?.autoSizeAllColumns());
    if (!slabs.value.length) toast("无符合条件的数据", 2000, "info");
  } catch { /* 拦截层已 toast */ } finally { querying.value = false; }
}

/* DataBindXM → QueryThr3800s(TimeRange) */
async function onQueryLog() {
  querying.value = true;
  try {
    const tr: TimeRange | undefined = q.logDates?.[0] && q.logDates?.[1]
      ? { min: isoDate(q.logDates[0]), max: isoDate(q.logDates[1]) }
      : undefined;
    logs.value = ((await hR3800Api.queryThr3800s(tr)) ?? []) as Thr3800[];
    logApi.value?.setGridOption("rowData", logs.value);
    requestAnimationFrame(() => logApi.value?.autoSizeAllColumns());
  } catch { /* 拦截层已 toast */ } finally { querying.value = false; }
}

function focusSlab(): Tyd2000Dto | null {
  return (slabApi.value?.getSelectedNodes()[0]?.data as Tyd2000Dto | undefined) ?? null;
}

/* btnAdd 修磨 → FrmHR3800_Add（占位；入参按原代码预填当前行） */
function onAdd() {
  const current = focusSlab();
  if (!slabs.value.length || !current) { toast("请选择要修磨的材料", 2000, "warn"); return; }
  toast("修磨录入弹窗（FrmHR3800_Add）待接入，保存走 hR3800Api.addThr3800", 2500, "warn");
}

onMounted(() => {
  void loadStores().then(() => { void onQueryStore(); void onQueryLog(); });
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 上下分栏（原 splitContainerControl1 Orientation=Vertical SplitterPosition=609） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <!-- 在制品材料 -->
      <SplitterPanel :size="55" :minSize="30" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">在制品材料</span>
        </div>

        <!-- 查询条件（原 dataLayoutControl1 + bscQuerySlab） -->
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-14 shrink-0 text-xs text-muted-foreground">件次号</label>
            <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQueryStore" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-14 shrink-0 text-xs text-muted-foreground">板坯号</label>
            <InputText v-model="q.cPieceNoSlab" class="min-w-0 flex-1" @keydown.enter="onQueryStore" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-12 shrink-0 text-xs text-muted-foreground">钢种</label>
            <InputText v-model="q.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQueryStore" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">修磨结果</label>
            <Select v-model="q.nResult" :options="RESULT_OPTIONS" option-label="label" option-value="value" show-clear
              placeholder="全部" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-12 shrink-0 text-xs text-muted-foreground">库区</label>
            <Select v-model="q.cStoreCode" :options="storeOptions" option-label="label" option-value="value" show-clear
              filter placeholder="选择库区" class="min-w-0 flex-1" />
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-14 shrink-0 text-xs text-muted-foreground">产出时间</label>
            <DatePicker v-model="q.proDates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
              show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
          </div>
        </div>

        <!-- 工具栏（原 stackPanel1：查询 / 修磨） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQueryStore">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
            <IconTools class="h-3 w-3" />修磨
          </Button>
          <span class="ml-auto text-xs text-muted-foreground">材料（{{ slabs.length }}）</span>
        </div>

        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="slabColDefs"
            :default-col-def="hmxDefaultColDef" :row-data="slabs" :locale-text="AG_GRID_LOCALE_CN"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onSlabReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <!-- 修磨日志 -->
      <SplitterPanel :size="45" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">修磨日志</span>
        </div>
        <!-- 工具栏（原 stackPanel2：时间范围 + 查询） -->
        <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <label class="shrink-0 text-xs text-muted-foreground">时间范围</label>
          <DatePicker v-model="q.logDates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
            show-time hour-format="24" show-icon placeholder="开始 至 结束" class="w-80 shrink-0" />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQueryLog">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <span class="ml-auto text-xs text-muted-foreground">日志（{{ logs.length }}）</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="logColDefs"
            :default-col-def="hmxDefaultColDef" :row-data="logs" :locale-text="AG_GRID_LOCALE_CN"
            :pagination="false" :animate-rows="false"
            @grid-ready="onLogReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
