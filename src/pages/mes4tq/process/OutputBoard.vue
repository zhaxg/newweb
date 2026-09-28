<script setup lang="ts">
/**
 * 「收料实绩」L1 **共享底板**——TW0104/TW0303/TW0403/TW0503/TW0603
 * 五个工序页共用，只换 `process` 一个入参（焦化没有独立的收料页，
 * 它的产出走「焦炭质量与产量」TW0205，所以这一组是 5 不是 6）。
 *
 * 数据源 TPP_2200，与投料表**同族**：`ProductionOutput extends ProductionInput`，
 * 只多三处高炉专属字段——这三列就是这一页与 `InputBoard` 的全部差别：
 * - `direction`：铁水去向 0=炼钢 / 1=铸铁（**只有高炉有值**，别的工序这列全是 —）；
 * - `ctk`：出铁口 1/2/3 号；
 * - `testNo`：检验委托单号，点它能追到 TQ0002 的委托单。
 *
 * `stoveNo` 在产出侧是**必填**（B2 的契约如此），所以这列不留空值兜底。
 *
 * **本底板只读**：没有编辑、没有删除（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../ListPage.vue";
import { materialApi, outputApi, processApi } from "@/api/mes4tq";
import { codeFmt, dashFmt, numFmt, qtyFmt, tagRenderer } from "../cells";
import { useNameMaps } from "../nameMaps";
import type { ListPageSpec } from "../listTypes";

const props = defineProps<{
  /** 工序键：raw / pellet / sinter / lime / blast */
  process: string;
  /** 页面代号（资源表 cCode） */
  code: string;
}>();

const { ready, materialMap, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const unitOptions = ref<string[]>([]);
const unitValueMap = ref<Record<string, string>>({});
const materialOptions = ref<string[]>([]);
const materialValueMap = ref<Record<string, string>>({});

const spec = computed<ListPageSpec>(() => ({
  code: props.code,
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "物料 / 批次 / 炉号 / 检验单" },
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
      label: "产物",
      kind: "select",
      options: materialOptions.value,
      valueMap: materialValueMap.value,
      placeholder: "全部",
    },
    { key: "shift", label: "班次", kind: "select", options: ["A", "B", "C"], placeholder: "全部" },
    {
      key: "dataStatus",
      label: "数据状态",
      kind: "select",
      options: ["正常", "作废", "已上传"],
      valueMap: { 正常: "0", 作废: "1", 已上传: "2" },
      placeholder: "全部",
    },
    /* 铁水去向只在高炉有值，但放出来不会让别的工序变空——列上全是「—」时自然读不出筛选意义 */
    {
      key: "direction",
      label: "铁水去向",
      kind: "select",
      options: ["炼钢", "铸铁"],
      valueMap: { 炼钢: "0", 铸铁: "1" },
      placeholder: "全部",
    },
    { key: "outputTime", label: "收料日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "outputTime", headerName: "收料时间", width: 150, pinned: "left" },
    { field: "unitId", headerName: "机组", width: 120, valueFormatter: codeFmt(unitMap.value) },
    { field: "materialId", headerName: "产物", width: 126, valueFormatter: codeFmt(materialMap.value) },
    /* 产出侧 `stoveNo` 非可选，所以不给 dashFmt 兜底——真有空值就该露出破绽让人修 */
    { field: "stoveNo", headerName: "炉号", width: 80 },
    { field: "batchNo", headerName: "批次号", width: 148, valueFormatter: dashFmt },
    { field: "wetWeight", headerName: "湿重 t", width: 110, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "dryWeight", headerName: "干重 t", width: 110, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "h2o", headerName: "水分 %", width: 92, type: "numericColumn", valueFormatter: numFmt(2) },
    { field: "ctk", headerName: "出铁口", width: 90, valueFormatter: dashFmt },
    {
      field: "direction",
      headerName: "铁水去向",
      width: 100,
      valueFormatter: (p) => ({ 0: "炼钢", 1: "铸铁" })[Number(p.value)] ?? "—",
    },
    { field: "testNo", headerName: "检验委托单", width: 150, valueFormatter: dashFmt },
    {
      field: "shift",
      headerName: "班次",
      width: 76,
      valueFormatter: (p) => ({ A: "A 早班", B: "B 中班", C: "C 夜班" })[String(p.value)] ?? p.value,
    },
    { field: "team", headerName: "班组", width: 84, valueFormatter: dashFmt },
    { field: "dataType", headerName: "数据来源", width: 96, cellRenderer: tagRenderer() },
    { field: "dataStatus", headerName: "数据状态", width: 96, cellRenderer: tagRenderer() },
    { field: "bizState", headerName: "记账", width: 84, cellRenderer: tagRenderer() },
    { field: "remark", headerName: "备注", minWidth: 160, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "检验委托", kind: "link", to: "/tqmes/quality/order" },
  ],
  toolbar: { extraButtons: ["▶ 模拟产出"] },
  fetch: (q) => outputApi.page({ ...q, process: props.process }),
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

/** 统计卡：产出侧最要紧的是「合格品产量」与「有几条带检验单」——TR 的合格品率从这里来 */
async function loadCards() {
  try {
    const res = await outputApi.page({ process: props.process, pageSize: 500 });
    const rows = res.rows;
    const valid = rows.filter((r) => Number(r.dataStatus) !== 1);
    const dry = valid.reduce((s, r) => s + r.dryWeight, 0);
    const tested = rows.filter((r) => r.testNo).length;
    const direction = props.process === "blast" ? rows.filter((r) => Number(r.direction) === 1).length : 0;
    cards.value = [
      { label: "产出合计（干重）", value: `${Math.round(dry).toLocaleString("zh-CN")} t`, sub: "作废行已剔除" },
      { label: "有效记录", value: valid.length, sub: `总 ${rows.length} 条` },
      { label: "带检验委托单", value: tested, sub: "可追到 TQ0002" },
      ...(props.process === "blast"
        ? [{ label: "走铸铁的铁次", value: direction, sub: "其余走炼钢 0" }]
        : [{ label: "作废行", value: rows.length - valid.length, sub: "看得见、不算进合计" }]),
    ];
  } catch {
    /* 拦截层已 toast */
  }
}

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
