<script setup lang="ts">
/** 对应 EC0003 数据质量与补录（模块一 · 附录 B5 版式 L6 状态流 + 后果展示）
 *  接口：qualityApi.page/gen/fill/check/invalid（POST /ems/quality/*）
 *  演示要点：**「数据可信吗」是能源管理系统被问得最多的一句话**，这页是给那句话准备的回答。
 *        「▶生成当日异常」按四类判据（量程越界 / 恒值死数 / 突变跳 / 平衡互斥超差）开单，
 *        每张单同时**发一条级别 3「数据异常」报警**——所以按完这个按钮要去 EM0005 看一眼，
 *        两处必须同时多行，否则「质量事件驱动报警」这句话就是嘴上说说。
 *        状态机是**四态单向**：待补录 → 已补录 → 已校核（→ 写实绩），作废只能在校核前。
 *        「补录取前后均值」这件事页面上要有一个数能对应上，所以建议值由 mock 按该点日均给、
 *        表单初值就是它（`initial: suggestValue`），改不改都留痕 `fillBy / fillAt`。
 *        **只有校核通过才进账**（写一条 `source:"补录"` 的日实绩）——未校核的数据不能上账，
 *        这是整条质量链的门；校核同时把该点未关闭的数据异常报警一起关掉。
 *  待接入：平衡互斥超差的自动比对（`upperPoints` 已在契约里，判据现走 model 的倍率注入）。 */
import { computed, onMounted, ref } from "vue";
import ListPage from "../../ListPage.vue";
import { meterPointApi, qualityApi } from "@/api/energy";
import type { MeterPoint } from "@/api/energy/types";
import { dashFmt, qtyFmt, tagRenderer } from "../../cells";
import type { ListPageSpec } from "../../listTypes";

const RULES = ["量程越界", "恒值死数", "突变跳", "平衡互斥超差"];
const STATUSES = ["待补录", "已补录", "已校核", "作废"];

const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/**
 * 计量点 id → 名称。工单行里只有 `pointId`（真实后端的工单表不会冗余点名），
 * 而这一列是**客户唯一会读的列**，所以整份捞一次测点表：
 * 一次 `GET /ems/meterPoint/list`，换来 EC0003/EC0004 两页都不用摆一屏 `MP-00007`。
 */
const pointMap = ref<Record<string, string>>({});
onMounted(() => {
  meterPointApi
    .list()
    .then((rows) => {
      const m: Record<string, string> = {};
      for (const p of rows ?? []) m[p.id] = (p as MeterPoint).name;
      pointMap.value = m;
      /* AG Grid 的 valueFormatter 只在渲染时跑，翻译表是后到的——不重查就有一屏表号 */
      void listRef.value?.reload();
    })
    .catch(() => {
      /* 拉不到就显示表号：表号本身唯一、可查，比整页报错强 */
    });
});

const spec = computed<ListPageSpec>(() => ({
  code: "EC0003",
  queryLabelWidth: "w-20",
  query: [
    { key: "keyword", label: "工单", kind: "input", placeholder: "工单号 / 表号" },
    { key: "rule", label: "判据", kind: "select", options: RULES, placeholder: "全部" },
    { key: "status", label: "状态", kind: "select", options: STATUSES, placeholder: "全部" },
    { key: "date", label: "数据日期", kind: "date", as: "date" },
  ],
  columns: [
    { field: "id", headerName: "工单号", width: 150 },
    { field: "date", headerName: "数据日期", width: 108, valueFormatter: dashFmt },
    {
      field: "pointId",
      headerName: "计量点",
      minWidth: 190,
      flex: 1,
      valueFormatter: (p) => pointMap.value[String(p.value ?? "")] ?? String(p.value ?? "—"),
    },
    { field: "rule", headerName: "判据", width: 130 },
    { field: "rawValue", headerName: "原始值", minWidth: 104, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "suggestValue", headerName: "建议值", minWidth: 104, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "deviation", headerName: "偏差", width: 84 },
    { field: "fillValue", headerName: "补录值", minWidth: 104, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "fillBy", headerName: "补录人", width: 84, valueFormatter: dashFmt },
    { field: "checkBy", headerName: "校核人", width: 84, valueFormatter: dashFmt },
    { field: "status", headerName: "状态", width: 96, cellRenderer: tagRenderer() },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    /**
     * 补录弹窗的初值就是**建议值**：现场十有八九直接确认建议值，
     * 每次都要人重新想一个数，这页就成了给演示添堵的页。改过的值一律留痕（补录人/时间）。
     *
     * 字段 `key` 用 `suggestValue` 而不是 `value`：`FormDialog` 的初值取自**行上的同名字段**
     * （`row[f.key] ?? f.initial`），所以借建议值那个键就能白得一个"默认填好、可以改"的输入框，
     * 不必在 spec 里写 `initial`（spec 是 computed、拿不到当前行）。
     */
    {
      label: "补录",
      kind: "form",
      title: "数据补录",
      shown: (r: any) => r.status === "待补录",
      fields: [{ key: "suggestValue", label: "补录值", kind: "number" }],
      run: (r: any, f: Record<string, any>) => qualityApi.fill(r.id, Number(f.suggestValue)),
    },
    {
      label: "校核",
      kind: "run",
      shown: (r: any) => r.status === "已补录",
      confirm: "校核通过？补录值将写入该日实绩（来源标记为「补录」），并关闭该计量点的数据异常报警。",
      run: (r: any) => qualityApi.check(r.id),
    },
    {
      label: "作废",
      kind: "form",
      title: "工单作废",
      shown: (r: any) => r.status !== "已校核" && r.status !== "作废",
      fields: [{ key: "reason", label: "作废原因", kind: "textarea", full: true }],
      run: (r: any, f: Record<string, any>) => qualityApi.invalid(r.id, String(f.reason ?? "")),
    },
  ],
  toolbar: {
    acts: [
      {
        label: "▶ 生成当日异常",
        fields: [{ key: "date", label: "数据日期", kind: "date", withTime: false }],
        run: (f) => qualityApi.gen(f.date ? String(f.date) : undefined),
      },
    ],
  },
  detail: {
    sections: [
      {
        title: "异常事实",
        fields: [
          { label: "工单号", from: "id" },
          { label: "数据日期", from: "date" },
          { label: "计量点", from: "pointId", map: pointMap.value },
          { label: "判据", from: "rule" },
          { label: "原始值", from: "rawValue" },
          { label: "建议值（该点日均）", from: "suggestValue" },
          { label: "偏差", from: "deviation" },
        ],
      },
      {
        title: "处置留痕",
        fields: [
          { label: "当前状态", from: "status" },
          { label: "补录值", from: "fillValue" },
          { label: "补录人", from: "fillBy" },
          { label: "补录时间", from: "fillAt" },
          { label: "校核人", from: "checkBy" },
          { label: "校核时间", from: "checkAt" },
        ],
      },
    ],
  },
  fetch: (q) => qualityApi.page(q),
  /**
   * 顶部提示报的是**状态分布**而不是「共 N 条」：
   * 这页要回答的是「今天还有几张单子压在手里」，待补录的张数才是那句话的答案。
   */
  summary: ({ total, rows }) => {
    const wait = rows.filter((r: any) => r.status === "待补录").length;
    const filled = rows.filter((r: any) => r.status === "已补录").length;
    const checked = rows.filter((r: any) => r.status === "已校核").length;
    return `共 ${total} 张 · 待补录 ${wait} · 待校核 ${filled} · 已入账 ${checked}`;
  },
}));
</script>

<template>
  <ListPage ref="listRef" :spec="spec" />
</template>
