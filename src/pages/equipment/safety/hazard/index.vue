<script setup lang="ts">
/** 对应 AC0002 隐患闭环（模块六 安全合规 · 附录 B5 版式 L1）
 *  接口：hazardApi.page（POST /eam/hazard/listPage）/ create（/hazard/create）/ rectify（/hazard/rectify）/ accept（/hazard/accept）
 *        + orgApi.assignees（责任人候选，行里存人名）+ exportRows("hazard")
 *  演示要点：**客户要的是「闭环可追溯」，不是状态字段**。所以表里带着整改填报人 / 验收人 / 验收时间三列，
 *        没走到那一步的行显示「—」——把 HZ-004 从「待整改」点到「已闭环」，这三列会当场长出来。
 *        本域没有 hazard/save，所以**只有「新增上报」没有「编辑」**：隐患不是可以反复改的台账，
 *        改了措施就等于换了一次整改，得走「整改填报」这个动作（它会写 rectifiedBy 留痕）。
 *  待接入：隐患图片上传（后端未提供，现场照片口径见 AM0005 移动端点检）。 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { exportRows, hazardApi, orgApi } from "@/api/equipment";
import { dashFmt, dayFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const LEVELS = ["一般", "较大", "重大"];
const STATUSES = ["待整改", "整改中", "待验收", "已闭环"];
const SOURCES = ["日常点检", "交接班检查", "专项检查", "特种设备月检", "5S 检查", "PHM 诊断建议", "员工上报"];

const { eqName, eqMap, ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const owners = ref<string[]>([]);

onMounted(async () => {
  try {
    owners.value = (await orgApi.assignees()) ?? [];
  } catch {
    /* 拦截层已 toast；拉不到就只是新增弹窗里没有责任人候选，输入框照常能填 */
  }
});

/** 名称表是后到的（AG Grid 的 valueFormatter 只在渲染时跑），到位后重查一次 */
watch(ready, (on) => {
  if (on) listRef.value?.reload();
});

const spec = computed<ListPageSpec>(() => {
  // 设备下拉：候选给人读的名字、落库送 eqId（valueMap 正/反各一份）
  const eqOptions = Object.entries(eqMap.value);
  const eqLabels = Object.fromEntries(eqOptions.map(([id, name]) => [id, name]));
  const idByLabel = Object.fromEntries(eqOptions.map(([id, name]) => [name, id]));
  return {
    code: "AC0002",
    queryLabelWidth: "w-20",
    query: [
      { key: "keyword", label: "隐患描述", kind: "input", placeholder: "编号或描述关键词" },
      { key: "level", label: "隐患级别", kind: "select", options: LEVELS, placeholder: "全部级别" },
      { key: "status", label: "闭环状态", kind: "select", options: STATUSES, placeholder: "全部状态" },
    ],
    columns: [
      { field: "id", headerName: "隐患编号", width: 96 },
      { field: "title", headerName: "隐患描述", minWidth: 220, flex: 1 },
      { field: "eqId", headerName: "所在设备", minWidth: 150, valueFormatter: (p) => eqName(p.value) },
      { field: "level", headerName: "级别", width: 76, cellRenderer: tagRenderer() },
      { field: "source", headerName: "发现来源", width: 120 },
      { field: "reportedAt", headerName: "上报日期", width: 106, valueFormatter: dayFmt },
      { field: "owner", headerName: "责任人", width: 92, valueFormatter: dashFmt },
      { field: "status", headerName: "状态", width: 92, cellRenderer: tagRenderer() },
      // 闭环留痕三列：客户问「谁改的、谁验的、什么时候关的」，答案要在同一行里
      { field: "rectifiedBy", headerName: "整改填报", width: 100, valueFormatter: dashFmt },
      { field: "acceptedBy", headerName: "验收人", width: 100, valueFormatter: dashFmt },
      { field: "closedAt", headerName: "闭环时间", width: 140, valueFormatter: dashFmt },
    ],
    actions: [
      { label: "详情", kind: "detail" },
      {
        label: "整改填报",
        kind: "form",
        title: "填写整改措施",
        shown: (r: any) => r.status === "待整改" || r.status === "整改中",
        fields: [
          { key: "measure", label: "整改措施", kind: "textarea", full: true, placeholder: "怎么改、改成什么样" },
          {
            key: "by",
            label: "整改填报人",
            kind: "select",
            options: owners.value,
            placeholder: "默认当前登录人",
          },
        ],
        run: (row, f) => hazardApi.rectify(row.id, String(f.measure ?? ""), f.by ? String(f.by) : undefined),
        okMsg: "整改措施已提交，等待验收",
      },
      {
        label: "验收闭环",
        kind: "run",
        shown: (r: any) => r.status === "待验收",
        run: (row) => hazardApi.accept(row.id),
        okMsg: "隐患已验收闭环",
      },
    ],
    toolbar: {
      add: true,
      acts: [{ label: "导出", okMsg: "导出任务已提交", refresh: false, run: (f) => exportRows("hazard", f) }],
    },
    detail: {
      sections: [
        {
          title: "隐患信息",
          fields: [
            { label: "隐患编号", from: "id" },
            { label: "所在设备", from: "eqId", map: eqLabels },
            { label: "隐患描述", from: "title" },
            { label: "级别", from: "level" },
            { label: "发现来源", from: "source" },
            { label: "上报日期", from: "reportedAt" },
            { label: "责任人", from: "owner" },
            { label: "当前状态", from: "status" },
          ],
        },
        {
          title: "整改与闭环",
          fields: [
            { label: "整改措施", from: "measure" },
            { label: "整改填报人", from: "rectifiedBy" },
            { label: "验收人", from: "acceptedBy" },
            { label: "闭环时间", from: "closedAt" },
          ],
        },
      ],
    },
    edit: {
      title: "上报隐患",
      fields: [
        { key: "title", label: "隐患描述", kind: "textarea", full: true, placeholder: "一句话说清部位与现象" },
        {
          key: "eqId",
          label: "所在设备",
          kind: "select",
          options: Object.values(eqLabels),
          valueMap: idByLabel,
          placeholder: "选择设备",
        },
        { key: "level", label: "隐患级别", kind: "select", options: LEVELS, initial: "一般" },
        { key: "source", label: "发现来源", kind: "select", options: SOURCES, initial: "日常点检" },
        { key: "owner", label: "责任人", kind: "select", options: owners.value, placeholder: "选择责任人" },
        { key: "measure", label: "拟定措施", kind: "textarea", full: true, placeholder: "打算怎么改" },
      ],
    },
    fetch: (q) => hazardApi.page(q),
    writeFn: (data) => hazardApi.create(data),
    summary: ({ total, rows }) => {
      const open = rows.filter((r: any) => r.status !== "已闭环").length;
      const major = rows.filter((r: any) => r.level === "重大" && r.status !== "已闭环").length;
      return `共 ${total} 条隐患 · 本页未闭环 ${open}${major ? "（含重大 ${major} 条）" : ""}`;
    },
  };
});
</script>

<template>
  <ListPage ref="listRef" :spec="spec" />
</template>
