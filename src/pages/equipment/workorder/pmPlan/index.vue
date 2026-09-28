<script setup lang="ts">
/** 对应 AW0001 预防性维护计划（模块四 维修工单 · 附录 B5 版式 L1 · 剧本外彩蛋）
 *  接口：pmPlanApi.page（POST /eam/pmPlan/listPage）/ save（/save，有 id 即改）
 *        / toggle（/toggle 启停）/ fire（/fire，按规则生成工单，回 WorkOrder）
 *        + orgApi.assignees（GET /eam/org/assignees，责任人候选）+ equipmentApi.list（外键翻译）+ exportRows("pmPlan")
 *  演示要点：**PM 是工单的第二个入口**（另一个是报警转单），而且它是**规则生成**而不是人手建单——
 *        周期型按天、计数型按运行小时（`tickRunHours` 每推进一次工时就把 `nextIn` 减下去，减到 0 自动成单）。
 *        演示时不能干等计数器归零，所以行内给「▶ 触发」：立刻按本行规则生成一张 `source:"PM计划"` 的工单，
 *        客户当场看到「计划 → 工单」这条链，去 AW0003 能找到刚生成的那张单。
 *        生成的是**待派工**工单（`createWorkOrder` 没给 assignee 就是这个态），后续流转与报修单完全同一条状态机。
 *  待接入：无。 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { exportRows, orgApi, pmPlanApi } from "@/api/equipment";
import { boolRenderer, dashFmt, numFmt, unitFmt } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const CYCLES = ["日", "周", "月", "季度", "计数器"];

const { eqName, eqMap, ready } = useNameMaps();
const assignees = ref<string[]>([]);
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

onMounted(async () => {
  try {
    assignees.value = (await orgApi.assignees()) ?? [];
  } catch {
    /* 拦截层已 toast；拉不到就只是编辑弹窗里没有责任人候选 */
  }
});

/** 名称表是后到的（AG Grid 的 valueFormatter 只在渲染时跑），到位后重查一次，别让客户看一屏 EQ-012 */
watch(ready, (on) => {
  if (on) listRef.value?.reload();
});

const spec = computed<ListPageSpec>(() => {
  // 下拉给人读设备名、落库送 eqId：valueMap 就是这张反查表（FormDialog 提交时翻过去、回填时翻回来）
  const eqOptions = Object.entries(eqMap.value);
  return {
    code: "AW0001",
    query: [
      { key: "keyword", label: "关键词", kind: "input", placeholder: "计划名称" },
      { key: "cycleType", label: "周期类型", kind: "select", options: CYCLES, placeholder: "全部周期" },
      {
        key: "enabled",
        label: "启用状态",
        kind: "select",
        options: ["启用", "停用"],
        valueMap: { 启用: "true", 停用: "false" },
        placeholder: "全部",
      },
    ],
    columns: [
      { field: "id", headerName: "计划编号", width: 100 },
      { field: "name", headerName: "计划名称", minWidth: 180, flex: 1 },
      { field: "eqId", headerName: "适用设备", minWidth: 160, valueFormatter: (p) => eqName(p.value) },
      { field: "cycleType", headerName: "周期类型", width: 96 },
      { field: "cycleValue", headerName: "周期值", width: 84, valueFormatter: numFmt() },
      {
        // 计数器的余量是「运行小时」、周期型的余量是「天」，同一个数字两种单位，所以按行现算
        colId: "nextIn",
        headerName: "距下次触发",
        width: 118,
        valueGetter: (p) => p.data.nextIn,
        valueFormatter: (p) =>
          p.value === null || p.value === undefined ? "—" : unitFmt(p.data.cycleType === "计数器" ? " h" : " 天")(p),
        cellClass: (p: any) => (Number(p.value) <= 7 ? "text-amber-600 font-medium dark:text-amber-400" : ""),
      },
      { field: "owner", headerName: "责任人", width: 90, valueFormatter: dashFmt },
      { field: "lastAt", headerName: "上次触发", width: 116, valueFormatter: dashFmt },
      { field: "enabled", headerName: "启用", width: 84, cellRenderer: boolRenderer("启用", "停用") },
    ],
    actions: [
      { label: "详情", kind: "detail" },
      { label: "编辑", kind: "edit" },
      {
        label: "手动触发",
        kind: "run",
        title: "按本行规则生成维护工单",
        okMsg: "已生成预防性维护工单",
        run: (r) => pmPlanApi.fire(String(r.id)),
      },
      {
        label: "停用",
        kind: "run",
        shown: (r) => r.enabled === true,
        okMsg: "计划已停用",
        run: (r) => pmPlanApi.toggle(String(r.id), false),
      },
      {
        label: "启用",
        kind: "run",
        shown: (r) => r.enabled !== true,
        okMsg: "计划已启用",
        run: (r) => pmPlanApi.toggle(String(r.id), true),
      },
    ],
    toolbar: {
      add: true,
      acts: [{ label: "导出", okMsg: "导出任务已提交", refresh: false, run: (f) => exportRows("pmPlan", f) }],
    },
    detail: {
      sections: [
        {
          title: "计划信息",
          fields: [
            { label: "计划编号", from: "id" },
            { label: "计划名称", from: "name" },
            { label: "适用设备", from: "eqId", map: eqMap.value },
            { label: "责任人", from: "owner" },
            { label: "启用状态", from: "enabled", map: { true: "启用", false: "停用" } },
          ],
        },
        {
          title: "触发规则",
          fields: [
            { label: "周期类型", from: "cycleType" },
            { label: "周期值", from: "cycleValue" },
            { label: "计数器基准运行小时", from: "baseRunHours", suffix: " h" },
            { label: "距下次触发", from: "nextIn" },
            { label: "上次触发日", from: "lastAt" },
          ],
        },
      ],
    },
    edit: {
      title: "预防性维护计划",
      fields: [
        { key: "name", label: "计划名称", kind: "input", placeholder: "如：轧机主减速机月保", full: true },
        {
          key: "eqId",
          label: "适用设备",
          kind: "select",
          options: eqOptions.map(([id, name]) => name),
          valueMap: Object.fromEntries(eqOptions.map(([id, name]) => [name, id])),
        },
        { key: "owner", label: "责任人", kind: "select", options: assignees.value },
        { key: "cycleType", label: "周期类型", kind: "select", options: CYCLES },
        { key: "cycleValue", label: "周期值", kind: "number", placeholder: "每几个周期触发" },
        { key: "nextIn", label: "距下次触发", kind: "number", unit: "日 / h", initial: 30 },
        { key: "baseRunHours", label: "计数器基准", kind: "number", unit: "h" },
        { key: "enabled", label: "启用", kind: "bool", initial: true },
      ],
    },
    fetch: (q) => pmPlanApi.page(q),
    writeFn: (d) => pmPlanApi.save(d),
    summary: ({ total, rows }) => {
      const due = rows.filter((r) => Number(r.nextIn) <= 7).length;
      const on = rows.filter((r) => r.enabled === true).length;
      return `共 ${total} 条计划 · 本页启用 ${on} · 七日内到期 ${due}（到期自动生成工单）`;
    },
  };
});
</script>

<template>
  <ListPage ref="listRef" :spec="spec" />
</template>
