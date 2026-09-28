<script setup lang="ts">
/** 对应 AS0003 备件寿命台账（模块五 备品备件 · 附录 B4 第 8 幕）
 *  接口：lifeRecordApi.page（POST /eam/lifeRecord/listPage）+ sparePartApi/equipmentApi 名称表（GET /list）
 *  演示要点：**「临期黄、超期红」不是页面自己 `if (used > limit*0.9)` 算出来的**——
 *        状态由 store 的 `refreshLifeStatus` 按系统参数 `nearRatio` 现算并写回，
 *        到期扫描还会为每一条临期/超期生成一条报警（AM0003 的同一套规则）。
 *        所以本页读 `status` 而不是自己判阈值：改参数、跑一次运行小时，这里的颜色和大屏、报警中心同步变。
 *        进度条列是纯展示派生量（`usedHours ÷ lifeLimitHours`），不落库。
 *  待接入：更换/下机归档不在此页——那要走工单闭环（AW0003），由 `closeWorkOrder` 写「已更换」，
 *        这里给个「已更换」状态就够了，页面自带一个「更换」按钮反而会把主线演示拆散。 */
import { computed, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { exportRows, lifeRecordApi } from "@/api/equipment";
import { dashFmt, dayFmt, ratioBarRenderer, tagRenderer, unitFmt } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { partName, eqName, partMap, eqMap, ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/** 备件名与设备名是后到的（AG Grid 的 valueFormatter 只在渲染时跑），到位后重查一次 */
watch(ready, (on) => {
  if (on) listRef.value?.reload();
});

const STATUSES = ["正常", "临期", "超期", "已更换", "已折算"];

const spec = computed<ListPageSpec>(() => ({
  code: "AS0003",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "序列号 / 责任人" },
    { key: "status", label: "寿命状态", kind: "select", options: STATUSES, placeholder: "全部状态" },
    { key: "spId", label: "备件", kind: "input", placeholder: "备件编号，如 SP-0005" },
  ],
  columns: [
    { field: "serial", headerName: "寿命序列号", width: 124 },
    { field: "spId", headerName: "备件", minWidth: 160, flex: 1, valueFormatter: (p) => partName(p.value) },
    { field: "holder", headerName: "责任人", width: 88 },
    {
      field: "mountedEqId",
      headerName: "挂载设备",
      minWidth: 175,
      valueFormatter: (p) => (p.value ? eqName(p.value) : "未挂载"),
    },
    { field: "mountedAt", headerName: "上机日期", width: 108, valueFormatter: dayFmt },
    { field: "usedHours", headerName: "已使用", width: 96, valueFormatter: unitFmt(" h") },
    { field: "lifeLimitHours", headerName: "寿命限期", width: 96, valueFormatter: unitFmt(" h") },
    {
      colId: "ratio",
      headerName: "寿命占用",
      width: 150,
      sortable: true,
      valueGetter: (p) => (p.data ? p.data.usedHours / p.data.lifeLimitHours : 0),
      cellRenderer: ratioBarRenderer(),
    },
    { field: "status", headerName: "状态", width: 88, sortable: false, cellRenderer: tagRenderer() },
    { field: "replacedAt", headerName: "更换日期", width: 108, valueFormatter: dashFmt },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  toolbar: {
    acts: [{ label: "导出", okMsg: "导出任务已提交", refresh: false, run: (f) => exportRows("lifeRecord", f) }],
  },
  detail: {
    sections: [
      {
        title: "实物与责任",
        fields: [
          { label: "寿命序列号", from: "serial" },
          { label: "备件", from: "spId", map: partMap.value },
          { label: "责任人", from: "holder" },
          { label: "挂载设备", from: "mountedEqId", map: eqMap.value },
          { label: "上机日期", from: "mountedAt" },
        ],
      },
      {
        title: "寿命与考核",
        fields: [
          { label: "已使用小时", from: "usedHours", suffix: " h" },
          { label: "寿命限期", from: "lifeLimitHours", suffix: " h" },
          { label: "寿命状态", from: "status" },
          { label: "更换日期", from: "replacedAt" },
        ],
      },
    ],
  },
  fetch: (q) => lifeRecordApi.page(q),
  summary: ({ total, rows }) => {
    const near = rows.filter((r) => r.status === "临期").length;
    const over = rows.filter((r) => r.status === "超期").length;
    return `共 ${total} 条寿命记录 · 本页临期 ${near} · 超期 ${over}（临期/超期已各生成一条到期提醒报警）`;
  },
}));
</script>

<template>
  <ListPage ref="listRef" :spec="spec" />
</template>
