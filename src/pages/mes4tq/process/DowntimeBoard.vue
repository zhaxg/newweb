<script setup lang="ts">
/**
 * 「开停机 / 休风记录」L1 **共享底板**——TW0305/TW0405/TW0606 三页共用
 * （球团开停机、烧结开停机、高炉休风），换 `process` 一个入参。
 *
 * 数据源 TPP_1050，三页读的是同一张表，**差别只有工序与叙事**：
 * 烧结叫「开停机」、球团叫「开停机」、高炉叫「休风」——休风是高炉特有的说法
 * （停风不等于停炉，高炉还热着待复风），所以标题随入参走。
 *
 * **计划停机与异常停机的颜色必须分开**：计划检修是可预期的、是要看计划的，
 * 异常停机是要追责的——`cells.ts` 的 `TAG_CLASS` 已按此配色
 * （计划停机蓝 / 异常停机红），本底板只负责把词写对。
 *
 * **`status=N`（作废）的行留在表里**：作废的记录在真实系统里也查得到，
 * 看不见就等于没有审计。统计卡单独给作废计数，不让它混进合计。
 *
 * **本底板只读**：没有编辑、没有删除（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../ListPage.vue";
import { downtimeApi, processApi } from "@/api/mes4tq";
import { codeFmt, dashFmt, dayFmt, numFmt, tagRenderer } from "../cells";
import { useNameMaps } from "../nameMaps";
import type { ListPageSpec } from "../listTypes";

const props = defineProps<{
  /** 工序键：pellet / sinter / blast */
  process: string;
  /** 页面代号（资源表 cCode） */
  code: string;
  /** 页内称呼：「开停机记录」或「休风实绩」 */
  kind?: string;
}>();

const { ready, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const unitOptions = ref<string[]>([]);
const unitValueMap = ref<Record<string, string>>({});

const spec = computed<ListPageSpec>(() => ({
  code: props.code,
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "机组 / 原因 / 备注" },
    {
      key: "unitId",
      label: "机组",
      kind: "select",
      options: unitOptions.value,
      valueMap: unitValueMap.value,
      placeholder: "全部",
    },
    { key: "type", label: "停机类型", kind: "select", options: ["计划停机", "异常停机", "其他"], placeholder: "全部" },
    {
      key: "reason",
      label: "原因归属",
      kind: "select",
      options: ["内部原因", "外部原因", "其他"],
      placeholder: "全部",
    },
    {
      key: "status",
      label: "记录状态",
      kind: "select",
      options: ["有效", "作废"],
      valueMap: { 有效: "Y", 作废: "N" },
      placeholder: "全部",
    },
    { key: "startTime", label: "停机日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "startTime", headerName: "开始时间", width: 150, pinned: "left" },
    { field: "endTime", headerName: "结束时间", width: 150 },
    { field: "unitId", headerName: "机组", width: 120, valueFormatter: codeFmt(unitMap.value) },
    { field: "minutes", headerName: "时长 min", width: 106, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "type", headerName: "停机类型", width: 108, cellRenderer: tagRenderer() },
    { field: "reason", headerName: "原因归属", width: 108, cellRenderer: tagRenderer() },
    {
      field: "process",
      headerName: "工序",
      width: 104,
      valueFormatter: (p) => processName.value[String(p.value)] ?? p.value,
    },
    { field: "status", headerName: "记录状态", width: 96, cellRenderer: tagRenderer() },
    { field: "remark", headerName: "说明", minWidth: 200, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "运行参数", kind: "link", to: `/tqmes/process/${props.process}/running` },
  ],
  toolbar: { extraButtons: ["▶ 模拟休风"] },
  fetch: (q) => downtimeApi.page({ ...q, process: props.process }),
  summary: ({ total, rows }) => {
    const bad = rows.filter((r: any) => r.type === "异常停机" && r.status === "Y").length;
    return bad ? `本页 ${total} 条 · 异常停机 ${bad} 条` : `共 ${total} 条`;
  },
}));

const processName = ref<Record<string, string>>({});

async function loadOptions() {
  try {
    const [units, procs] = await Promise.all([processApi.units(props.process), processApi.list()]);
    unitOptions.value = units.map((u) => u.name);
    unitValueMap.value = Object.fromEntries(units.map((u) => [u.name, u.id]));
    for (const p of procs) processName.value[p.code] = p.name;
  } catch {
    /* 拦截层已 toast */
  }
}

/**
 * 统计卡。
 *
 * **只统计 `status=Y` 的行**：作废的停机时长不能进合计，否则「这个月停了 12 小时」
 * 里混着已经撤销的记录，而客户月末对账时正是拿这个数去比计划停机率的。
 */
async function loadCards() {
  try {
    const res = await downtimeApi.page({ process: props.process, pageSize: 500 });
    const rows = res.rows;
    const valid = rows.filter((r) => r.status === "Y");
    const totalMin = valid.reduce((s, r) => s + Number(r.minutes ?? 0), 0);
    const plan = valid.filter((r) => r.type === "计划停机").length;
    const abnormal = valid.filter((r) => r.type === "异常停机").length;
    const voided = rows.length - valid.length;
    cards.value = [
      {
        label: props.kind === "休风实绩" ? "累计休风" : "累计停机",
        value: `${Math.round(totalMin / 60)} h`,
        sub: `有效记录 ${valid.length} 条`,
      },
      { label: props.kind === "休风实绩" ? "计划休风" : "计划停机", value: plan, sub: "可预期、看计划" },
      { label: props.kind === "休风实绩" ? "非计划休风" : "异常停机", value: abnormal, sub: "要追责的那一类" },
      { label: "作废记录", value: voided, sub: "留在表里、不进合计" },
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
