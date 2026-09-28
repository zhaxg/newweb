<script setup lang="ts">
/** 对应 AC0003 特种设备台账（模块六 安全合规 · 附录 B5 版式 L1）
 *  接口：specialApi.page（POST /eam/special/listPage）/ save（/special/save）/ inspect（/special/inspect）
 *        + exportRows("special")
 *  演示要点：**这是安监条线的法务红线**——锅炉、压力容器、起重机械、电梯按期定期检验是强制义务，
 *        漏检被查到就是罚停。所以页面把「距下次检验」做成最显眼的一列：临期黄、超期红。
 *        **黄/红不是页面用日历算的**：`/special/listPage` 每行带回 `daysLeft` 与 `deadlineState`，
 *        分档阈值和报警扫描共用一个 `warnDays`（见 `mock/equipment/store.ts` 的 `deadlineOf`）。
 *        这套页面自己的今天就是演示日 2026-09-27，若前端 `Date.now()` 现算，过几天整表颜色会和
 *        报警中心、大屏待办对不上。登记一次检验（`inspect`）会把到期日按检验周期外推，
 *        颜色当场退回去，同时 `scanDeadlines` 生成的那条到期报警也就有了交代。
 *  待接入：检验机构报告附件上传（后端未提供，与 AC0004 同一处占位）。 */
import { computed, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { exportRows, specialApi } from "@/api/equipment";
import { dayFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const TYPES = ["起重机械", "压力容器", "锅炉", "电梯", "场内专用车辆"];
const STATUSES = ["在用", "停用", "待检"];

const { eqName, eqMap, ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

watch(ready, (on) => {
  if (on) listRef.value?.reload();
});

/** 到期文案：0 天说「今天到期」，超期说「已超期 n 天」，客户听不出「-12 天后」这种系统话术 */
function deadlineText(d: unknown) {
  const n = Number(d);
  if (!Number.isFinite(n)) return "—";
  if (n < 0) return `已超期 ${-n} 天`;
  if (n === 0) return "今天到期";
  return `${n} 天后`;
}

const spec = computed<ListPageSpec>(() => {
  const eqLabels = eqMap.value;
  const idByLabel = Object.fromEntries(Object.entries(eqLabels).map(([id, name]) => [name, id]));
  return {
    code: "AC0003",
    queryLabelWidth: "w-20",
    query: [
      { key: "keyword", label: "设备名称", kind: "input", placeholder: "名称或使用登记证号" },
      { key: "type", label: "设备类别", kind: "select", options: TYPES, placeholder: "全部类别" },
      { key: "status", label: "使用状态", kind: "select", options: STATUSES, placeholder: "全部状态" },
    ],
    columns: [
      { field: "id", headerName: "登记编号", width: 96 },
      { field: "name", headerName: "设备名称", minWidth: 200, flex: 1 },
      { field: "type", headerName: "设备类别", width: 110 },
      { field: "regNo", headerName: "使用登记证号", width: 168 },
      {
        field: "eqId",
        headerName: "对应设备台账",
        minWidth: 160,
        valueFormatter: (p) => (p.value ? eqName(p.value) : "—"),
      },
      { field: "inspectCycleMonths", headerName: "检验周期", width: 96, valueFormatter: (p) => `${p.value ?? "—"} 月` },
      { field: "nextInspectAt", headerName: "下次检验", width: 110, valueFormatter: dayFmt },
      {
        colId: "deadline",
        headerName: "距下次检验",
        width: 122,
        sortable: false,
        valueGetter: (p) => deadlineText(p.data.daysLeft),
        cellClass: (p: any) =>
          p.data.deadlineState === "超期"
            ? "text-red-600 font-medium dark:text-red-400"
            : p.data.deadlineState === "临期"
              ? "text-amber-600 font-medium dark:text-amber-400"
              : "",
      },
      { field: "status", headerName: "使用状态", width: 92, cellRenderer: tagRenderer() },
    ],
    actions: [
      { label: "详情", kind: "detail" },
      { label: "编辑", kind: "edit" },
      {
        label: "登记检验",
        kind: "form",
        title: "登记本次定期检验",
        fields: [
          {
            key: "nextInspectAt",
            label: "下次检验日期",
            kind: "date",
            initial: "",
            placeholder: "留空即按检验周期自动外推",
          },
        ],
        run: (row, f) => specialApi.inspect(row.id, String(f.nextInspectAt ?? "")),
        okMsg: "检验已登记，下次到期日与预警随之更新",
      },
    ],
    toolbar: {
      add: true,
      acts: [{ label: "导出", okMsg: "导出任务已提交", refresh: false, run: (f) => exportRows("special", f) }],
    },
    detail: {
      sections: [
        {
          title: "使用登记",
          fields: [
            { label: "登记编号", from: "id" },
            { label: "设备名称", from: "name" },
            { label: "设备类别", from: "type" },
            { label: "使用登记证号", from: "regNo" },
            { label: "对应设备台账", from: "eqId", map: eqLabels },
            { label: "使用状态", from: "status" },
          ],
        },
        {
          title: "定期检验",
          fields: [
            { label: "检验周期", from: "inspectCycleMonths", suffix: " 个月" },
            { label: "下次检验日期", from: "nextInspectAt" },
            { label: "到期分档", from: "deadlineState" },
            { label: "距下次检验", from: "daysLeft", suffix: " 天（负数为已超期）" },
          ],
        },
      ],
    },
    edit: {
      title: "特种设备登记",
      fields: [
        { key: "name", label: "设备名称", kind: "input", full: true, placeholder: "如 压缩空气储罐 A" },
        { key: "type", label: "设备类别", kind: "select", options: TYPES, initial: "压力容器" },
        { key: "regNo", label: "使用登记证号", kind: "input", placeholder: "容-2016-4402-1105" },
        {
          key: "eqId",
          label: "对应设备台账",
          kind: "select",
          options: Object.values(eqLabels),
          valueMap: idByLabel,
          placeholder: "可选，关联到设备台账",
        },
        { key: "inspectCycleMonths", label: "检验周期", kind: "number", unit: "月", initial: 24 },
        { key: "nextInspectAt", label: "下次检验日期", kind: "date" },
        { key: "status", label: "使用状态", kind: "select", options: STATUSES, initial: "在用" },
      ],
    },
    fetch: (q) => specialApi.page(q),
    writeFn: (data) => specialApi.save(data),
    summary: ({ total, rows }) => {
      const near = rows.filter((r: any) => r.deadlineState === "临期").length;
      const over = rows.filter((r: any) => r.deadlineState === "超期").length;
      return `共 ${total} 台 · 本页临期 ${near} · 超期 ${over}（临期与超期已各生成一条到期提醒报警）`;
    },
  };
});
</script>

<template>
  <ListPage ref="listRef" :spec="spec" />
</template>
