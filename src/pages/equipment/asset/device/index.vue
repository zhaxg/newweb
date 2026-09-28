<script setup lang="ts">
/** 对应 AE0001 设备主数据（模块二 设备台账 · 附录 B4 第 1 幕 · 版式 L1 列表 + 行内二维码）
 *  接口：equipmentApi.page（POST /eam/equipment/listPage）/ save（/save，有 id 即改）
 *        + lineApi.list / equipmentApi.list（产线与上级设备候选、外键翻译，见 ../../nameMaps.ts）
 *        + exportRows("equipment")
 *  演示要点：**台账是整套系统的入口**，第 1 幕就在这一页——行上的「二维码」画出这台设备的
 *        H5 档案直链二维码，手机扫码即开免登录档案页（`/eam/eq?code=`，见 ../../EqArchiveH5.vue）。
 *        不套 `ListPage`：它的行内动作只有 detail/edit/delete/form/run/link/stub 七种语义，
 *        「弹一个自定义的二维码面板」塞不进这套声明（见 ../../listTypes.ts 文件头「不为它们留钩子」），
 *        所以本页自带表格与三个弹窗（详情 / 表单 / 二维码），CRUD 直接复用 FormDialog + DetailDialog。
 *  待接入：删除（后端 `/eam/equipment/remove` 未提供——设备有履历，真实系统也不允许从台账直接删）。 */
import { computed, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconRotateClockwise, IconSearch } from "@tabler/icons-vue";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { equipmentApi, exportRows, lineApi } from "@/api/equipment";
import type { Equipment, Line } from "@/api/equipment/types";
import Pager from "../../Pager.vue";
import DetailDialog from "../../DetailDialog.vue";
import FormDialog from "../../FormDialog.vue";
import QrPanel from "../../QrPanel.vue";
import { actionRenderer, applyResult } from "../../rowActions";
import { dashFmt, dayFmt, healthBarRenderer, numFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import { h5ArchiveUrl } from "../../h5Url";
import { toDay } from "../../dateField";
import type { DetailSection, EditField } from "../../listTypes";

const LEVELS = ["A", "B", "C"];
const STATUSES = ["运行", "备用", "检修", "故障停机", "报废"];

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { lineName, ready } = useNameMaps();

const lines = ref<Line[]>([]);
const allEq = ref<Equipment[]>([]);

/* ── 查询条件 ─────────────────────────────────────────────────────────── */
const keyword = ref("");
const lineId = ref("");
const level = ref("");
const status = ref("");
const range = ref<Date[] | null>(null);

const rows = ref<Equipment[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const querying = ref(false);

async function query() {
  if (querying.value) return;
  querying.value = true;
  try {
    const q: Record<string, any> = { currentPage: page.value, pageSize: pageSize.value };
    if (keyword.value.trim()) q.keyword = keyword.value.trim();
    // 下拉显示产线名、送的是编码：mock 的 eq() 按 lineId 精确匹配
    const hitLine = lines.value.find((l) => l.name === lineId.value);
    if (hitLine) q.lineId = hitLine.id;
    if (level.value) q.level = level.value;
    if (status.value) q.status = status.value;
    // 投运日期是 `YYYY-MM-DD` 列，所以区间也只送日期（dayRange 按字典序比）
    if (range.value?.[0]) q.startTime = toDay(range.value[0]);
    if (range.value?.[1]) q.endTime = toDay(range.value[1]);
    const res = await equipmentApi.page(q);
    rows.value = res?.rows ?? [];
    total.value = res?.total ?? rows.value.length;
  } catch {
    /* 拦截层已 toast */
  }
  querying.value = false;
}

function reset() {
  keyword.value = "";
  lineId.value = "";
  level.value = "";
  status.value = "";
  range.value = null;
  page.value = 1;
  void query();
}

function search() {
  page.value = 1;
  void query();
}

function onPage(p: number, size: number) {
  page.value = p;
  pageSize.value = size;
  void query();
}

onMounted(async () => {
  await query();
  try {
    const [ls, es] = await Promise.all([lineApi.list(), equipmentApi.list()]);
    lines.value = ls ?? [];
    allEq.value = es ?? [];
  } catch {
    /* 拦截层已 toast；候选拉不到时新增表单的下拉是空的，比整页报错好排查 */
  }
});

/** 名称表后到（产线列要翻译），到位后重查一次，别让客户看一屏 LN-BR01 */
watch(ready, (on) => {
  if (on) void query();
});

const summary = computed(() => {
  const a = rows.value.filter((r) => r.level === "A").length;
  const stop = rows.value.filter((r) => r.status === "故障停机").length;
  const low = rows.value.filter((r) => r.health < 60).length;
  return `共 ${total.value} 台 · 本页 A 类 ${a} · 故障停机 ${stop} · 健康度低于 60 的 ${low}`;
});

/* ── 弹窗：详情 / 新增编辑 / 二维码 ─────────────────────────────────────── */
const detailOpen = ref(false);
const detailRow = ref<Record<string, any> | null>(null);

const formOpen = ref(false);
const formRow = ref<Record<string, any> | null>(null);

const qrOpen = ref(false);
const qrCode = ref("");

function openDetail(row: Equipment) {
  detailRow.value = { ...row, lineId: lineName(row.lineId) };
  detailOpen.value = true;
}

function openEdit(row: Equipment | null) {
  formRow.value = row ? { ...row } : null;
  formOpen.value = true;
}

function openQr(row: Equipment) {
  qrCode.value = row.id;
  qrOpen.value = true;
}

/** 上级设备候选：排除自己，否则改parentId 会把自己挂到自己下面，结构树当场成环 */
const parentOptions = computed(() =>
  allEq.value.filter((e) => e.id !== formRow.value?.id).map((e) => `${e.name}（${e.model}）`),
);
const parentValueMap = computed(() =>
  Object.fromEntries(
    allEq.value.filter((e) => e.id !== formRow.value?.id).map((e) => [`${e.name}（${e.model}）`, e.id]),
  ),
);

const editFields = computed<EditField[]>(() => [
  { key: "name", label: "设备名称", kind: "input", placeholder: "如：F4 精轧机" },
  { key: "model", label: "规格型号", kind: "input", placeholder: "如：F4-Φ1700" },
  {
    key: "lineId",
    label: "所属产线",
    kind: "select",
    options: lines.value.map((l) => l.name),
    valueMap: Object.fromEntries(lines.value.map((l) => [l.name, l.id])),
    placeholder: "选产线",
  },
  { key: "level", label: "ABC 分级", kind: "select", options: LEVELS },
  { key: "status", label: "运行状态", kind: "select", options: STATUSES },
  { key: "vendor", label: "供应商", kind: "input", placeholder: "如：西门子VAI" },
  { key: "position", label: "安装位置", kind: "input", placeholder: "如：精轧跨 F4 机架", full: true },
  { key: "commissionedAt", label: "投运日期", kind: "date", placeholder: "投运日期" },
  { key: "runHours", label: "累计运行", kind: "number", unit: "h", initial: 0 },
  { key: "health", label: "健康度", kind: "number", unit: "/100", initial: 90 },
  {
    key: "parentId",
    label: "上级设备",
    kind: "select",
    options: parentOptions.value,
    valueMap: parentValueMap.value,
    placeholder: "不填即顶层设备",
  },
]);

const detailSections = computed<DetailSection[]>(() => [
  {
    title: "基本信息",
    fields: [
      { label: "设备编码", from: "id" },
      { label: "设备名称", from: "name" },
      { label: "规格型号", from: "model" },
      { label: "所属产线", from: "lineId" },
      { label: "安装位置", from: "position" },
      {
        label: "ABC 分级",
        from: "level",
        map: { A: "A 类（关键设备）", B: "B 类（重要设备）", C: "C 类（一般设备）" },
      },
    ],
  },
  {
    title: "运行与厂商",
    fields: [
      { label: "运行状态", from: "status" },
      { label: "供应商", from: "vendor" },
      { label: "投运日期", from: "commissionedAt" },
      { label: "累计运行", from: "runHours", suffix: " h" },
      { label: "健康度", from: "health", suffix: " / 100" },
      { label: "扫码内容", from: "qrCode" },
    ],
  },
]);

const colDefs = computed<ColDef[]>(() => [
  { field: "id", headerName: "设备编码", width: 128 },
  { field: "name", headerName: "设备名称", minWidth: 150, flex: 1 },
  { field: "model", headerName: "规格型号", minWidth: 130, width: 160 },
  { field: "lineId", headerName: "所属产线", minWidth: 120, width: 140, valueFormatter: (p) => lineName(p.value) },
  { field: "position", headerName: "安装位置", minWidth: 150 },
  { field: "level", headerName: "分级", width: 76, sortable: false, cellRenderer: tagRenderer() },
  { field: "status", headerName: "状态", width: 96, sortable: false, cellRenderer: tagRenderer() },
  { field: "health", headerName: "健康度", width: 132, sortable: false, cellRenderer: healthBarRenderer() },
  { field: "vendor", headerName: "供应商", minWidth: 110, width: 130 },
  { field: "commissionedAt", headerName: "投运日期", width: 108, valueFormatter: dayFmt },
  { field: "runHours", headerName: "累计运行 h", width: 112, valueFormatter: numFmt() },
  {
    colId: "actions",
    headerName: "操作",
    width: 148,
    sortable: false,
    pinned: "left",
    cellRenderer: actionRenderer([
      { label: "详情", onClick: (row) => openDetail(row as Equipment) },
      { label: "编辑", onClick: (row) => openEdit(row as Equipment) },
      { label: "二维码", onClick: (row) => openQr(row as Equipment) },
    ]),
  },
]);

function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}

async function doExport() {
  applyResult(await exportRows("equipment"), "导出任务已提交", toast);
}

/** 扫码内容就是设备编码；在新标签打开同一条 H5 直链，演示时不用手机也能看到档案页 */
function openArchive() {
  if (qrCode.value) window.open(h5ArchiveUrl(qrCode.value), "_blank");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（5 个条件，日期范围占两格，正好一行 grid-cols-6） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">关键词</label>
          <InputText
            v-model="keyword"
            placeholder="编码 / 名称 / 型号 / 位置"
            class="min-w-0 flex-1"
            @keydown.enter="search()"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
          <Select
            v-model="lineId"
            :options="lines.map((l) => l.name)"
            show-clear
            placeholder="全部产线"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">分级</label>
          <Select v-model="level" :options="LEVELS" show-clear placeholder="A/B/C" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">状态</label>
          <Select v-model="status" :options="STATUSES" show-clear placeholder="全部状态" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">投运日期</label>
          <DatePicker
            v-model="range"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-icon
            placeholder="投运区间"
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- 工具栏 h-9：按钮靠左、统计靠右 -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="reset">
        <IconRotateClockwise class="h-3 w-3" />重置
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="search()">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button class="shrink-0 whitespace-nowrap" @click="openEdit(null)"> 新增 </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="doExport"> 导出 </Button>
      <span class="ml-auto text-xs text-muted-foreground">{{ summary }}</span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden px-1 py-1">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        @first-data-rendered="onFirstData"
        @row-dblclick="openDetail($event.data as Equipment)"
      />
    </div>

    <Pager :total="total" :page="page" :page-size="pageSize" @change="onPage" />

    <DetailDialog v-model:open="detailOpen" title="设备档案" :sections="detailSections" :data="detailRow" />

    <FormDialog
      v-model:open="formOpen"
      :title="formRow ? '编辑设备主数据' : '新增设备主数据'"
      :fields="editFields"
      :row="formRow"
      :submit="(p) => equipmentApi.save(p)"
      ok-msg="设备主数据已保存"
      @done="query()"
    />

    <!-- 二维码弹窗：客户当场用手机扫，是第 1 幕的高潮，所以把地址也摆出来（同一台机器才可点） -->
    <Dialog
      :visible="qrOpen"
      modal
      header="设备二维码 · 扫码开档案"
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="qrOpen = $event"
    >
      <div class="space-y-3 py-1">
        <QrPanel :code="qrCode" />
        <p class="text-xs text-muted-foreground">
          打印张贴到设备上后，现场人员用手机扫码即打开该设备的档案页（免登录、整屏深色）。
          演示环境与电脑同网段的手机可直接扫；扫码内容由设备编码生成，改不了别的设备。
        </p>
      </div>
      <template #footer>
        <Button label="关闭" variant="outlined" @click="qrOpen = false" />
        <Button label="在本机打开档案页" autofocus @click="openArchive" />
      </template>
    </Dialog>
  </div>
</template>
