<script setup lang="ts">
/** 对应 FrmHR9200（在产物料跟踪）：DDH.Winforms.SHR.Forms.FrmHR9200
 *  已接入：hR9000Api.queryZpSlabs；hR4200Api.queryTiL2me04s/05s/06s/11s/02s/01s/08s/14s/09s/15s/16s/17s/18s/19s/12s、
 *          queryTiP48j01s/02s/031s/04s/05s/06s/07s/09s；hR4000Api.queryPrintSjs；
 *          bxcomMessageApi.sendMEL02 / sendMEL204 / send8JP401_2 / send8JP403；bxcomTestApi.demo_ReceivedByBxcom
 *  待接入：「轧制实绩」页签行双击原开 FrmHR9201 二级弹窗（画面未迁移，占位提示）
 *  偏差：原页签栏在左侧（XtraTabControl HeaderLocation=Left），PrimeVue Tabs 页签在顶部，24 页签横向滚动；
 *          切边方式/异常原因/位置等代码列显示原值（原运行时 formatter 为 KeyValueFormatters.CUTFLAG /
 *          EnumCodeConverter<TiL2me01Reject*Enum>，swagger 无对应枚举可照抄，不自行编候选值）；
 *          「模拟二级消息」原为 DropDownButton+PopupMenu，改 Button+Menu popup；
 *          原页签头滚轮切换页签未实现（纯操作便利）；ShowLoadingPanel 改 grid loading；
 *          产线取菜单参数 meta.qs（原 QueryString），主表 Selected 列为数据勾选标记列，非行选择 checkbox */

import { reactive, ref, watch } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Menu from "primevue/menu";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import {
  IconArrowBarDown,
  IconArrowBarUp,
  IconFlask,
  IconScissors,
  IconSearch,
  IconSend,
  IconTrash,
} from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  hR4000Api,
  hR4200Api,
  hR9000Api,
  type DtoQueryL2,
  type DtoThr3010,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";
import { bxcomMessageApi, bxcomTestApi } from "@/api/mes4ddh/ddh.swagger";
import { mainColDefs, tabGridDefs } from "./colDefs";

const theme = makeHmxGridTheme();
const { toast } = useToast();
/* 产线：原 cLineCode = QueryString（菜单资源 cQueryString → meta.qs） */
const { raw: lineCode } = useMenuQuery();

/* ---------- 查询条件（DataLayoutControl / dtoQueryThr3000） ---------- */
const pad2 = (n: number) => String(n).padStart(2, "0");
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
/* 原 Load：默认本月首日至月末最后一秒 */
function defaultRange(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
    new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  ];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

const input = reactive({
  cOrderNo: "",
  cBatchNo: "",
  cStove: "",
  slabNo: "",
  plateNo: "",
  dates: defaultRange() as Date[] | null,
});

/* ---------- 主表（gridView1 / DtoThr3010，焦点行驱动页签查询） ---------- */
const mainRows = ref<DtoThr3010[]>([]);
const mainLoading = ref(false);
const mainApi = ref<GridApi | null>(null);
const currentRow = ref<DtoThr3010 | null>(null);
function onMainReady(e: GridReadyEvent) {
  mainApi.value = e.api;
}
function onMainSelectionChanged() {
  const rows = mainApi.value?.getSelectedRows() as DtoThr3010[] | undefined;
  currentRow.value = rows?.[0] ?? null;
  void loadActiveTab();
}

async function onQuery() {
  mainLoading.value = true;
  try {
    mainRows.value =
      (await hR9000Api.queryZpSlabs({
        cLineCode: lineCode || undefined,
        cOrderNo: input.cOrderNo.trim() || undefined,
        cBatchNo: input.cBatchNo.trim() || undefined,
        cStove: input.cStove.trim() || undefined,
        slabNo: input.slabNo.trim() || undefined,
        plateNo: input.plateNo.trim() || undefined,
        dCreateTimeRange: toTimeRange(input.dates),
      })) ?? [];
    currentRow.value = null;
    tabRows.value = tabGridDefs.map(() => []);
    requestAnimationFrame(() => mainApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    mainLoading.value = false;
  }
}

/* ---------- 页签区（24 个独立内容页签，每页一张实绩表） ---------- */
const activeTab = ref("0");
const tabRows = ref<Record<string, unknown>[][]>(tabGridDefs.map(() => []));
const tabLoading = ref<boolean[]>(tabGridDefs.map(() => false));
const tabApis: (GridApi | null)[] = tabGridDefs.map(() => null);
function onTabReady(i: number, e: GridReadyEvent) {
  tabApis[i] = e.api;
}

/* 原 xtraTabControl1_SelectedPageChanged 的查询入参（部分页签整包替换 dto，逐条照抄） */
function baseL2(r: DtoThr3010): DtoQueryL2 {
  return {
    planNo: r.cOrderNo,
    slabNo: r.cPieceNo,
    inPlateNo: r.cPlateNo,
    plateNo: r.cPlateNo,
    cPrintCode: r.cPrintCode,
    cBatchNo: r.cBatchNo,
  };
}
const tabLoaders: ((r: DtoThr3010) => Promise<unknown>)[] = [
  (r) => hR4200Api.queryTiL2me04s(baseL2(r)), // 上辊道实绩
  (r) => hR4200Api.queryTiL2me05s({ ...baseL2(r), slabNo: r.cPrintCode }), // 照核记录（原以喷印号查板坯号）
  (r) => hR4200Api.queryTiL2me06s(baseL2(r)), // 装炉实绩
  (r) => hR4200Api.queryTiL2me11s(baseL2(r)), // 加热实绩
  (r) => hR4200Api.queryTiL2me02s(baseL2(r)), // 轧制实绩
  (r) => hR4200Api.queryTiL2me01s(baseL2(r)), // 轧制异常实绩
  (r) => hR4200Api.queryTiL2me08s(baseL2(r)), // 预矫直实绩
  (r) => hR4200Api.queryTiL2me14s(baseL2(r)), // ACC超快冷实绩
  (r) => hR4200Api.queryTiL2me09s(baseL2(r)), // 热矫直实绩
  (r) => hR4200Api.queryTiP48j01s(baseL2(r)), // 切头剪CS实绩
  (r) => hR4200Api.queryTiP48j02s({ cBatchOrder: r.cBatchOrder }), // 双边剪DSS实绩（原整包换组批号）
  (r) => hR4200Api.queryTiP48j031s(baseL2(r)), // 定尺剪实绩
  (r) => hR4200Api.queryTiP48j04s({ slabNo: r.cPieceNo, cBatchNo: r.cBatchNo }), // 取大样实绩（原整包换入参）
  (r) => hR4200Api.queryTiP48j05s(baseL2(r)), // 超声波探伤UST实绩
  (r) => hR4200Api.queryTiL2me15s(baseL2(r)), // 照核实绩
  (r) => hR4200Api.queryTiL2me16s(baseL2(r)), // 测厚仪测量曲线1
  (r) => hR4200Api.queryTiL2me17s(baseL2(r)), // 测厚仪测量曲线2
  (r) => hR4200Api.queryTiL2me18s(baseL2(r)), // 平直度仪测量实绩
  (r) => hR4200Api.queryTiL2me19s(baseL2(r)), // 终轧温度曲线实绩
  (r) => hR4200Api.queryTiL2me12s(baseL2(r)), // 能耗实绩
  (r) => hR4200Api.queryTiP48j06s(baseL2(r)), // 剪切PDI请求
  (r) => hR4200Api.queryTiP48j07s(baseL2(r)), // 钢板下线请求
  (r) => hR4200Api.queryTiP48j09s(baseL2(r)), // 轮廓仪测量实绩
  (r) => hR4000Api.queryPrintSjs({ cBatchNo: r.cBatchNo, cPieceNoSlab: r.cPieceNo }), // 剪切实绩
];

async function loadTab(i: number) {
  const row = currentRow.value;
  if (!row) {
    tabRows.value[i] = [];
    return;
  }
  tabLoading.value[i] = true;
  try {
    tabRows.value[i] = ((await tabLoaders[i](row)) as Record<string, unknown>[] | null) ?? [];
    requestAnimationFrame(() => tabApis[i]?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    tabLoading.value[i] = false;
  }
}
function loadActiveTab() {
  return loadTab(Number(activeTab.value));
}
watch(activeTab, () => void loadActiveTab());

/* 原 gridControl10_DoubleClick → FrmHR9201 二级弹窗（待接入） */
const ROLLING_TAB = 4;
function onTabRowDbl(i: number) {
  if (i !== ROLLING_TAB) return;
  if (!currentRow.value) return;
  toast("FrmHR9201 轧制实绩明细画面待接入", 2000, "warn");
}

/* ---------- ShowYesNo 受控确认 ---------- */
const confirmOpen = ref(false);
const confirmMsg = ref("");
let confirmAction: (() => Promise<void>) | null = null;
function askConfirm(msg: string, action: () => Promise<void>) {
  confirmMsg.value = msg;
  confirmAction = action;
  confirmOpen.value = true;
}
async function onConfirmOk() {
  confirmOpen.value = false;
  const act = confirmAction;
  confirmAction = null;
  if (act) await act();
}

/* ---------- L2 发送按钮（台账逐条对应，中文提示逐字照抄） ---------- */
function requireRow(exclaim: boolean): DtoThr3010 | null {
  if (!currentRow.value) {
    toast(exclaim ? "请选择后再操作!" : "请选择后再操作", 2000, "warn");
    return null;
  }
  return currentRow.value;
}
async function sendAndToast(run: () => Promise<unknown>) {
  try {
    await run();
    toast("发送成功", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}
function onSendZz() {
  const row = requireRow(true);
  if (!row) return;
  askConfirm(`确认手动下发板坯${row.cPieceNo}[轧制计划]至L2?`, () =>
    sendAndToast(() => bxcomMessageApi.sendMEL02(row.cPieceNo ?? undefined)),
  );
}
function onDel() {
  const row = requireRow(true);
  if (!row) return;
  askConfirm(`确认${row.cPieceNo}删除板坯L2轧制计划？`, () =>
    sendAndToast(() => bxcomMessageApi.sendMEL204(row.cPieceNo ?? undefined)),
  );
}
function onSendJq() {
  const row = requireRow(true);
  if (!row) return;
  askConfirm(`确认手动下发板坯${row.cPieceNo}[剪切计划]至L2`, () =>
    sendAndToast(() => bxcomMessageApi.send8JP401_2(row.cPieceNo ?? undefined)),
  );
}
function onUp() {
  const row = requireRow(true);
  if (!row) return;
  askConfirm(`确认板坯${row.cPieceNo}[上线]至L2`, () =>
    sendAndToast(() => bxcomMessageApi.send8JP403({ pieceNo: row.cPieceNo, upOrDown: "1", position: "0" })),
  );
}
function onEnd() {
  const row = requireRow(true);
  if (!row) return;
  askConfirm(`确认手动下发板坯${row.cPieceNo}[下线]至L2`, () =>
    sendAndToast(() => bxcomMessageApi.send8JP403({ pieceNo: row.cPieceNo, upOrDown: "0", position: "0" })),
  );
}

/* ---------- 模拟二级消息（原 AddDemoButtons：DicMsg 弹单 → demo_ReceivedByBxcom） ---------- */
const demoMenu = ref<InstanceType<typeof Menu> | null>(null);
/* 原 FrmHR9200.DicMsg，文案逐字照抄（含「-〉」原字符） */
const DEMO_MSGS: [string, string][] = [
  ["L2ME05", "L2->PMS钢坯号照核"],
  ["L2ME15", "板坯照核实绩"],
  ["L2ME04", "L2->PMS上辊道实绩"],
  ["L2ME06", "L2->PMS装炉实绩"],
  ["L2ME11", "HT->MES加热实绩电文"],
  ["L2ME02", "L2->PMS轧制生产实绩"],
  ["L2ME08", "L2->PMS预矫直实绩"],
  ["L2ME09", "L2->PMS热矫直实绩"],
  ["L2ME14", "L2->ACC超快冷实绩"],
  ["P48J01", "L2-〉PMS切头剪CS"],
  ["P48J02", "L2-〉PMS双边剪DSS实绩信息"],
  ["P48J03", "L2-〉PMS定尺剪DS实绩信息"],
  ["L2ME01", "L2->PMS轧制计划异常实绩（删除、吊销、轧废、甩坯）"],
  ["P48J06", "L2-〉PMS剪切PDI请求"],
  ["P48J07", "L2-〉PMS钢板下线请求"],
  ["L2ME03", "L2->PMS轧辊实绩值"],
  ["L2ME12", "HT->MES能耗实绩电文"],
  ["P48J04", "L2-〉PMS剪切线取大样实绩信息"],
  ["P48J05", "L2-〉PMS超声波探伤UST实绩信"],
  ["P48J09", "L2->PMS轮廓仪测量实绩"],
  ["L2ME16", "测厚仪测量曲线1"],
  ["L2ME17", "测厚仪测量曲线2"],
  ["L2ME18", "平直度仪测量实绩"],
  ["L2ME19", "终轧温度曲线实绩"],
];
const demoItems = DEMO_MSGS.map(([key, label]) => ({
  label,
  command: () => onDemo(key, label),
}));
function onDemo(key: string, label: string) {
  const row = requireRow(false);
  if (!row) return;
  askConfirm(`请确保在测试环境中，确认测试接收二级消息${row.cPieceNo} [${key}-${label}]?`, async () => {
    try {
      await bxcomTestApi.demo_ReceivedByBxcom({ ...row, id: key });
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（DataLayoutControl：提料计划号/批号/炉号/板坯号/钢板号 + 创建时间区间） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">提料计划号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.slabNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢板号</label>
        <InputText v-model="input.plateNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">创建时间</label>
        <DatePicker
          v-model="input.dates"
          selection-mode="range"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          placeholder="开始 至 结束"
          class="min-w-0 flex-1"
        />
      </div>
    </div>

    <!-- 工具栏（stackPanel1 原序：查询/轧制计划下发L2/删除L2轧制计划/剪切计划下发L2/钢板上线发送L2/钢板下线发送L2/模拟二级消息；组标题「计划材料明细」靠右） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="mainLoading" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSendZz">
        <IconSend class="h-3 w-3" />轧制计划下发L2
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDel">
        <IconTrash class="h-3 w-3" />删除L2轧制计划
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSendJq">
        <IconScissors class="h-3 w-3" />剪切计划下发L2
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onUp">
        <IconArrowBarUp class="h-3 w-3" />钢板上线发送L2
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEnd">
        <IconArrowBarDown class="h-3 w-3" />钢板下线发送L2
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="demoMenu?.toggle($event)">
        <IconFlask class="h-3 w-3" />模拟二级消息
      </Button>
      <span class="ml-auto text-xs font-medium text-muted-foreground">计划材料明细</span>
    </div>

    <!-- 上下分栏（splitContainerControl1：SplitterPosition 409/930 → 主表约 44%） -->
    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="44" :min-size="20" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="mainColDefs"
            :row-data="mainRows"
            :row-selection="{ mode: 'singleRow', enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="mainLoading"
            @grid-ready="onMainReady"
            @selection-changed="onMainSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="56" :min-size="20" class="flex flex-col overflow-hidden">
        <!-- 原页签在左侧，PrimeVue Tabs 在顶部（已知偏差） -->
        <Tabs v-model:value="activeTab" class="flex h-full min-h-0 flex-col">
          <TabList class="shrink-0">
            <Tab v-for="(t, i) in tabGridDefs" :key="i" :value="String(i)">{{ t.title }}</Tab>
          </TabList>
          <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
            <TabPanel v-for="(t, i) in tabGridDefs" :key="i" :value="String(i)" class="h-full overflow-hidden !p-0">
              <AgGridVue
                v-if="activeTab === String(i)"
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="t.colDefs"
                :row-data="tabRows[i]"
                :pagination="false"
                :animate-rows="false"
                :loading="tabLoading[i]"
                @grid-ready="(e) => onTabReady(i, e)"
                @row-double-clicked="onTabRowDbl(i)"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </SplitterPanel>
    </Splitter>

    <Menu ref="demoMenu" :model="demoItems" popup class="w-72" />

    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" autofocus @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>
