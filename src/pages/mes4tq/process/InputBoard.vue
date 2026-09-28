<script setup lang="ts">
/**
 * 「投料实绩」L1 **共享底板**——TW0103/TW0202/TW0302/TW0402/TW0502/TW0602
 * 六个工序页共用，只换 `process` 一个入参。
 *
 * 同一批数据的六个工序切片（真实表 TPP_2100），所以底板只有一份。
 *
 * **这一页的全部价值在三列上**（规格书 B11「库后消耗在 MES」）：
 * - `dataType`：0 人工补录 / 1 采集 / 2 调账——客户问「这个数哪来的」，答案就在这列；
 * - `dataStatus`：0 正常 / 1 作废——**作废的行看得见、但不进合计**（见 `routes/work.ts`
 *   的 `byBatch`），作废看不见就等于没做审计；
 * - `bizState`：0 未记账 / 1 已记账——月结对账时按它切。
 *
 * `wetWeight`/`dryWeight`/`h2o` 三者自洽：`dry = wet / (1 + h2o/100)`。
 * 列上算得出来，客户拿计算器一按就知道数是不是随手编的。
 *
 * **本底板只读**：没有编辑、没有删除（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../ListPage.vue";
import { inputApi, materialApi, processApi } from "@/api/mes4tq";
import { codeFmt, dashFmt, dayFmt, numFmt, qtyFmt, tagRenderer } from "../cells";
import { useNameMaps } from "../nameMaps";
import type { ListPageSpec } from "../listTypes";

const props = defineProps<{
  /** 工序键：raw / coke / pellet / sinter / lime / blast */
  process: string;
  /** 页面代号（资源表 cCode） */
  code: string;
}>();

const { ready, materialMap, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/** 统计卡：本页最要紧的三个数都与 `dataType`/`dataStatus` 有关 */
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const unitOptions = ref<string[]>([]);
const unitValueMap = ref<Record<string, string>>({});
const materialOptions = ref<string[]>([]);
const materialValueMap = ref<Record<string, string>>({});

const spec = computed<ListPageSpec>(() => ({
  code: props.code,
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "物料 / 批次 / 料仓 / 炉号" },
    {
      key: "unitId",
      label: "机组",
      kind: "select",
      options: unitOptions.value,
      valueMap: unitValueMap.value,
      placeholder: "全部",
    },
    {
      key: "materialId",
      label: "物料",
      kind: "select",
      options: materialOptions.value,
      valueMap: materialValueMap.value,
      placeholder: "全部",
    },
    { key: "shift", label: "班次", kind: "select", options: ["A", "B", "C"], placeholder: "全部" },
    { key: "team", label: "班组", kind: "select", options: ["T-A", "T-B", "T-C", "T-D"], placeholder: "全部" },
    {
      key: "dataType",
      label: "数据来源",
      kind: "select",
      options: ["人工", "采集", "调账"],
      valueMap: { 人工: "0", 采集: "1", 调账: "2" },
      placeholder: "全部",
    },
    {
      key: "dataStatus",
      label: "数据状态",
      kind: "select",
      options: ["正常", "作废", "已上传"],
      valueMap: { 正常: "0", 作废: "1", 已上传: "2" },
      placeholder: "全部",
    },
    { key: "inputTime", label: "投料日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "inputTime", headerName: "投料时间", width: 150, pinned: "left" },
    { field: "unitId", headerName: "机组", width: 120, valueFormatter: codeFmt(unitMap.value) },
    { field: "materialId", headerName: "物料", width: 128, valueFormatter: codeFmt(materialMap.value) },
    { field: "lbId", headerName: "料仓", width: 126, valueFormatter: dashFmt },
    { field: "batchNo", headerName: "批次号", width: 148, valueFormatter: dashFmt },
    { field: "stoveNo", headerName: "炉号", width: 80, valueFormatter: dashFmt },
    { field: "glBatch", headerName: "料批", width: 80, valueFormatter: (p) => (p.value ? `第${p.value}批` : "—") },
    { field: "wetWeight", headerName: "湿重 t", width: 110, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "dryWeight", headerName: "干重 t", width: 110, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "h2o", headerName: "水分 %", width: 92, type: "numericColumn", valueFormatter: numFmt(2) },
    {
      field: "weighMode",
      headerName: "称量",
      width: 84,
      valueFormatter: (p) => ({ 1: "实重", 2: "理重" })[Number(p.value)] ?? "—",
    },
    {
      field: "shift",
      headerName: "班次",
      width: 76,
      valueFormatter: (p) => ({ A: "A 早班", B: "B 中班", C: "C 夜班" })[String(p.value)] ?? p.value,
    },
    { field: "team", headerName: "班组", width: 84, valueFormatter: dashFmt },
    /* 三列状态是这一页的核心，所以都上色标（`cells.ts` 的 `TAG_CLASS` 已配好词色） */
    { field: "dataType", headerName: "数据来源", width: 96, cellRenderer: tagRenderer() },
    { field: "dataStatus", headerName: "数据状态", width: 96, cellRenderer: tagRenderer() },
    { field: "bizState", headerName: "记账", width: 84, cellRenderer: tagRenderer() },
    { field: "remark", headerName: "备注", minWidth: 160, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "质量明细", kind: "link", to: "/tqmes/process/stat/bin-change" },
  ],
  toolbar: { extraButtons: ["▶ 模拟投料"] },
  fetch: (q) => inputApi.page({ ...q, process: props.process }),
  summary: ({ total, rows }) => {
    const voided = rows.filter((r: any) => Number(r.dataStatus) === 1).length;
    return voided ? `本页 ${total} 条 · 作废 ${voided} 条（不进合计）` : `共 ${total} 条`;
  },
}));

async function loadOptions() {
  try {
    const [units, mats] = await Promise.all([processApi.units(props.process), materialApi.list()]);
    unitOptions.value = units.map((u) => u.name);
    unitValueMap.value = Object.fromEntries(units.map((u) => [u.name, u.id]));
    materialOptions.value = mats.map((m) => m.name);
    materialValueMap.value = Object.fromEntries(mats.map((m) => [m.name, m.id]));
  } catch {
    /* 拦截层已 toast */
  }
}

/** 统计卡：本页最要紧的是「作废了几条、还没记账几条」——月结时会来查这两个数 */
async function loadCards() {
  try {
    const res = await inputApi.page({ process: props.process, pageSize: 500 });
    const rows = res.rows;
    const wet = rows.reduce((s, r) => s + (Number(r.dataStatus) === 1 ? 0 : r.wetWeight), 0);
    const voided = rows.filter((r) => Number(r.dataStatus) === 1).length;
    const unposted = rows.filter((r) => Number(r.bizState ?? 0) === 0).length;
    const manual = rows.filter((r) => Number(r.dataType) === 0).length;
    cards.value = [
      {
        label: "有效投料合计（干重）",
        value: `${Math.round(rows.reduce((s, r) => s + (Number(r.dataStatus) === 1 ? 0 : r.dryWeight), 0)).toLocaleString("zh-CN")} t`,
        sub: "作废行已剔除",
      },
      { label: "湿重合计", value: `${Math.round(wet).toLocaleString("zh-CN")} t`, sub: "与干重差的量就是水分" },
      { label: "作废行", value: voided, sub: "看得见、不算进合计" },
      { label: "未记账 / 人工补录", value: `${unposted} / ${manual}`, sub: "月结前要清零" },
    ];
  } catch {
    /* 拦截层已 toast；统计卡空着不影响表格 */
  }
}

/* 名称表晚到时重查（AG Grid 只在渲染时跑 valueFormatter） */
watch(
  ready,
  (v) => {
    if (v) listRef.value?.reload();
  },
  { once: true },
);

onMounted(() => {
  void loadOptions();
  void loadCards();
});
</script>

<template>
  <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
</template>
