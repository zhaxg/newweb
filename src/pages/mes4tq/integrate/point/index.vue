<script setup lang="ts">
/**
 * 对应 TI0001 采集点位配置（系统集成 · 附录 A3 版式 **L1 + 分区统计卡**）
 *
 * 接口：`collectPointApi.page`（POST /tqmes/collectPoint/listPage）
 *       `collectPointApi.byArea`（GET /tqmes/collectPoint/byArea → 统计卡）
 *
 * 演示要点：**这一屏回答「我厂里的东西你怎么接进来」**——
 * 统计卡上的 16579 个点分属 7 套真实自控系统（西屋 Ovation FDDI、施耐德 MBE、
 * 和利时 OPC、浙大中控非标 TCP），客户拿自己的点表来核对时得认得出这些名字。
 *
 * **两个数要分清**：统计卡显示的 `点位总数` 是 B1 给的**该分区总点数**（4263 / 5000 / 3300…），
 * 而表里的行是**铺出来的样本点**（47 个）。全铺 16000 多个点只会拖慢菜单，
 * 所以表头写「样本点位」、统计卡写「点位总数」——两个数混在一起会让客户
 * 以为只接进来 47 个点。
 *
 * 地址列是这一页的可信度所在：OPC 走 `ns=1;s=` 的命名空间、MBE 走 `%MW100` 的
 * modicon 寄存器编址、FDDI/TCP 走 IP:Port——**编得像真地址，客户才愿意拿它去核**。
 *
 * 待接入：点位新增/启停、上下限改定（本域只查桩）。
 */
import { computed, onMounted, ref } from "vue";
import ListPage from "../../ListPage.vue";
import { collectPointApi } from "@/api/mes4tq";
import { boolRenderer, dashFmt, numFmt, tagRenderer } from "../../cells";
import type { ListPageSpec } from "../../listTypes";

/** 统计卡：分区总数取自 `byArea`，是 B1 的原值（见文件头「两个数要分清」） */
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const spec = computed<ListPageSpec>(() => ({
  code: "TI0001",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "点位号 / 点位名 / 地址" },
    {
      key: "area",
      label: "自控分区",
      kind: "select",
      options: areaOptions.value,
      placeholder: "全部",
    },
    {
      key: "protocol",
      label: "协议",
      kind: "select",
      options: ["FDDI", "MBE", "MB+", "OPC-DA", "OPC-UA", "非标TCP"],
      placeholder: "全部",
    },
    { key: "dataType", label: "类型", kind: "select", options: ["AI", "DI"], placeholder: "全部" },
  ],
  columns: [
    { field: "id", headerName: "点位号", width: 130, pinned: "left" },
    { field: "pointName", headerName: "点位名称", minWidth: 190, flex: 1 },
    { field: "area", headerName: "自控分区", width: 130, cellRenderer: tagRenderer() },
    { field: "dataType", headerName: "类型", width: 76, cellRenderer: tagRenderer() },
    { field: "protocol", headerName: "协议", width: 104 },
    /* 地址列不截断：客户要拿它去核对现场点表，截断就没法核了 */
    { field: "address", headerName: "地址", minWidth: 240, valueFormatter: dashFmt },
    { field: "lowerLimit", headerName: "下限", width: 92, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "upperLimit", headerName: "上限", width: 92, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "unit", headerName: "单位", width: 84, valueFormatter: dashFmt },
    { field: "enabled", headerName: "启用", width: 78, cellRenderer: boolRenderer() },
    { field: "description", headerName: "说明", minWidth: 220, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  toolbar: { extraButtons: ["▶ 模拟通道中断"] },
  fetch: (q) => collectPointApi.page(q),
  summary: ({ total }) => `样本点位 ${total} 条 · 点位总数见上方统计卡`,
}));

const areaOptions = ref<string[]>([]);

onMounted(async () => {
  try {
    const areas = await collectPointApi.byArea();
    const total = areas.reduce((s, a) => s + a.total, 0);
    const protocols = new Set(areas.map((a) => a.protocol));
    cards.value = [
      { label: "点位总数（B1 全厂）", value: total.toLocaleString("zh-CN"), sub: "来自各自控系统点表" },
      { label: "自控系统分区", value: areas.length, sub: "Ovation / 施耐德 / 和利时 / 中控" },
      { label: "接入协议种类", value: protocols.size, sub: [...protocols].join(" · ") },
      { label: "样本点位（下表）", value: areas.reduce((s, a) => s + a.sampled, 0), sub: "全铺会拖慢菜单，只铺样本" },
    ];
    areaOptions.value = areas.map((a) => a.area);
  } catch {
    /* 拦截层已 toast；统计卡空着不影响表格 */
  }
});
</script>

<template>
  <ListPage :spec="spec" :stat-cards="cards" />
</template>
