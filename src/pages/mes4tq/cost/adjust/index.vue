<script setup lang="ts">
/** 对应 TC0003 成本调差记录（成本归集 · 附录 A3 版式 **L1 列表页**）
 *
 *  接口：`costAdjustApi.page`（POST /tqmes/costAdjust/listPage）
 *
 *  演示要点：**三个数相减就是差额，行上算得出来**——
 *  `diffAmount = afterAmount - beforeAmount`，所以三列都给、不只给差额。
 *  客户拿计算器按一遍能对上，而**对不上就说明调差记录本身有问题**。
 *
 *  **调差原因必须具体**（数据层给了六种：合同价补差、汇率浮动、计量误差回补、
 *  能源单价调整、税率变动、供应商返利）——给一句「调整」等于没说：
 *  调差是审计要过的环节，原因栏空着或写「原因」是不能入库的。
 *  所以「原因」列给 `flex: 1` 的宽度，把它读完整。
 *
 *  **与 S6 月结状态机联动**：只有「已锁定」之后的月份才有调差记录
 *  （S6：数据收集中 → 计算中 → 已计算 → 已审核 → 已锁定 → 已调差）。
 *  还在「计算中」的月份出现调差记录，是时序矛盾。
 *
 *  待接入：调差录入、审核（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { costAdjustApi } from "@/api/mes4tq";
import { codeFmt, moneyFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const periods = ref<string[]>([]);
const itemOptions = ref<string[]>([]);

const spec = computed<ListPageSpec>(() => ({
  code: "TC0003",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "项代码 / 项名 / 原因 / 调差人" },
    { key: "period", label: "账期", kind: "select", options: periods.value, placeholder: "全部" },
    { key: "itemNo", label: "成本项", kind: "select", options: itemOptions.value, placeholder: "全部" },
    {
      key: "unitId",
      label: "机组",
      kind: "select",
      options: ["1#高炉", "2#高炉", "3#高炉", "1#烧结机", "2#烧结机"],
      valueMap: {
        "1#高炉": "GL01-01",
        "2#高炉": "GL01-02",
        "3#高炉": "GL01-03",
        "1#烧结机": "SJ01-01",
        "2#烧结机": "SJ01-02",
      },
      placeholder: "全部",
    },
    { key: "minDiff", label: "调差额≥", kind: "input", placeholder: "元（可负）" },
  ],
  columns: [
    { field: "period", headerName: "账期", width: 96, pinned: "left" },
    { field: "unitId", headerName: "机组", width: 120, valueFormatter: codeFmt(unitMap.value) },
    { field: "itemNo", headerName: "项代码", width: 104 },
    { field: "itemName", headerName: "成本项", minWidth: 170, flex: 1 },
    /* 三个数并列：差额是它们相减得来的，**能当场验算**才是审计能接受的形状 */
    { field: "beforeAmount", headerName: "调整前 元", width: 150, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "afterAmount", headerName: "调整后 元", width: 150, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "diffAmount", headerName: "调差额 元", width: 150, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "operator", headerName: "调差人", width: 96 },
    { field: "auditUser", headerName: "审核人", width: 96 },
    { field: "adjustTime", headerName: "调差时间", width: 166 },
    { field: "status", headerName: "状态", width: 104, cellRenderer: tagRenderer() },
    /* 原因列给足宽度：审计要读完整的一句话（「合同价补差：月初采购价与结算价差 3%」） */
    { field: "reason", headerName: "调差原因", minWidth: 280, flex: 2 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "成本分析", kind: "link", to: "/tqmes/cost/analysis" },
  ],
  toolbar: { extraButtons: ["▶ 模拟月末调差"] },
  fetch: (q) => costAdjustApi.page(q),
  summary: ({ total, rows }) => {
    const net = rows.reduce((s, r) => s + Number(r.diffAmount ?? 0), 0);
    return `共 ${total} 条 · 净调差 ¥${Math.round(net).toLocaleString("zh-CN")}`;
  },
}));

async function loadAll() {
  try {
    const all = await costAdjustApi.page({ pageSize: 500 });
    periods.value = [...new Set(all.rows.map((r) => r.period))].toReversed();
    itemOptions.value = [...new Set(all.rows.map((r) => r.itemName))];

    const rows = all.rows;
    const up = rows.filter((r) => Number(r.diffAmount) > 0).length;
    const down = rows.filter((r) => Number(r.diffAmount) < 0).length;
    cards.value = [
      { label: "调差记录", value: rows.length, sub: `${periods.value.length} 个账期` },
      { label: "调增 / 调减", value: `${up} / ${down}`, sub: "两个方向都有才是真账" },
      {
        label: "净调差",
        value: `¥${Math.round(rows.reduce((s, r) => s + r.diffAmount, 0)).toLocaleString("zh-CN")}`,
        sub: "Σ(调整后 − 调整前)",
      },
      { label: "涉及成本项", value: new Set(rows.map((r) => r.itemNo)).size, sub: "仅已锁定后的账期" },
    ];
    listRef.value?.reload();
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

onMounted(() => void loadAll());
</script>

<template>
  <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
</template>
