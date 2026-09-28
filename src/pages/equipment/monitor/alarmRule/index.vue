<script setup lang="ts">
/** 对应 AM0003 报警规则（模块三 状态监测 · 附录 B5 版式 L1）
 *  接口：alarmRuleApi.page（POST /eam/alarmRule/listPage）/ save（/alarmRule/save）/ remove（/alarmRule/remove）
 *        + pointApi.page（GET 全量测点，把 `pointId` 翻成「设备 · 指标」并做新增候选）+ exportRows("alarmRule")
 *  演示要点：**三级阈值（预警 / 报警 / 停机）是这套 PHM 的分级判定入口**，AM0002 的曲线颜色、
 *        AO0001 大屏的警报条、AS0003 的寿命临期提醒全都读它，所以这页改一个数，别处立刻跟着变。
 *        mock 侧对**倒挂的阈值**（warn ≥ alarm 之类）的处理是「存下但自动停用并回明原因」——
 *        这比让客户在现场演示时输出一组反的阈值然后看到一条看不懂的报警更有说服力，
 *        所以页面把这个规则写进弹窗提示里，而不是等被拒了才发现。
 *        通知渠道用多选（站内 / App / 短信）：这是数组字段，FormDialog 里给它单独的 `multi` 控件
 *        （用 select 会把数组写成字符串，列表页 join 就散了）。
 *  待接入：无。 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { alarmRuleApi, exportRows, pointApi } from "@/api/equipment";
import type { SensorPoint } from "@/api/equipment/types";
import { boolRenderer, numFmt } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const CHANNELS = ["站内", "App", "短信"];

const { eqName, ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const points = ref<SensorPoint[]>([]);

/** 测点编号 → 人读的「设备名 · 指标（单位）」：规则表里只有 `PT-xxx`，客户看不出这条管的是哪台设备的什么 */
const pointLabel = (id: unknown) => {
  const p = points.value.find((x) => x.id === id);
  return p ? `${eqName(p.eqId)} · ${p.name}（${p.unit}）` : String(id ?? "—");
};

const pointMap = computed<Record<string, string>>(() =>
  Object.fromEntries(points.value.map((p) => [p.id, pointLabel(p.id)])),
);

async function loadPoints() {
  try {
    const res = await pointApi.page({ currentPage: 1, pageSize: 500 });
    points.value = res?.rows ?? [];
  } catch {
    /* 拦截层已 toast；拉不到就退回显示测点编号 */
  }
}

onMounted(loadPoints);

/** 两张表（设备名、测点）都是后到的，到位后重查一次，别让客户看一屏 PT-BRF401 */
watch(ready, (on) => {
  if (on) void loadPoints().then(() => listRef.value?.reload());
});

const spec = computed<ListPageSpec>(() => {
  const labels = pointMap.value;
  const valueMap = Object.fromEntries(Object.entries(labels).map(([id, name]) => [name, id]));
  return {
    code: "AM0003",
    queryLabelWidth: "w-20",
    query: [
      { key: "keyword", label: "测点编号", kind: "input", placeholder: "如 PT-BRF401" },
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
      { field: "id", headerName: "规则编号", width: 100 },
      { field: "pointId", headerName: "生效测点", minWidth: 220, flex: 1, valueFormatter: (p) => pointLabel(p.value) },
      { field: "warn", headerName: "预警", width: 84, valueFormatter: numFmt(1) },
      { field: "alarm", headerName: "报警", width: 84, valueFormatter: numFmt(1) },
      { field: "trip", headerName: "停机", width: 84, valueFormatter: numFmt(1) },
      {
        colId: "channels",
        headerName: "通知渠道",
        width: 150,
        sortable: false,
        valueGetter: (p) => (p.data.channels ?? []).join(" / ") || "—",
      },
      { field: "enabled", headerName: "启用", width: 84, cellRenderer: boolRenderer("启用", "停用") },
    ],
    actions: [
      { label: "详情", kind: "detail" },
      { label: "编辑", kind: "edit" },
      { label: "删除", kind: "delete" },
    ],
    toolbar: {
      add: true,
      acts: [
        {
          label: "导出",
          okMsg: "导出任务已提交",
          refresh: false,
          run: (f) => exportRows("alarmRule", f),
        },
      ],
    },
    detail: {
      sections: [
        {
          title: "分级阈值",
          fields: [
            { label: "规则编号", from: "id" },
            { label: "生效测点", from: "pointId", map: labels },
            { label: "预警阈值", from: "warn" },
            { label: "报警阈值", from: "alarm" },
            { label: "停机阈值", from: "trip" },
            { label: "启用", from: "enabled", map: { true: "启用", false: "停用" } },
          ],
        },
      ],
    },
    edit: {
      title: "报警规则",
      fields: [
        {
          key: "pointId",
          label: "生效测点",
          kind: "select",
          options: Object.values(labels),
          valueMap,
          placeholder: "选择测点",
          full: true,
        },
        { key: "warn", label: "预警阈值", kind: "number", placeholder: "低于此值不报" },
        { key: "alarm", label: "报警阈值", kind: "number", placeholder: "必须大于预警" },
        { key: "trip", label: "停机阈值", kind: "number", placeholder: "必须大于报警" },
        { key: "channels", label: "通知渠道", kind: "multi", options: CHANNELS, initial: ["站内"] },
        { key: "enabled", label: "启用", kind: "bool", initial: true },
      ],
    },
    fetch: (q) => alarmRuleApi.page(q),
    writeFn: (data) => alarmRuleApi.save(data),
    deleteFn: (id) => alarmRuleApi.remove(id),
    summary: ({ total, rows }) => {
      const off = rows.filter((r: any) => !r.enabled).length;
      return `共 ${total} 条规则 · 本页停用 ${off}${off ? "（阈值倒挂的规则会被自动停用）" : ""}`;
    },
  };
});
</script>

<template>
  <ListPage ref="listRef" :spec="spec" />
</template>
