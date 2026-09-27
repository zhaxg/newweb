<script setup lang="ts">
/** 对应 EC0004 计量仪表台账（模块一 · 附录 B5 版式 L1 列表 + 状态灯）
 *  接口：instrumentApi.page/save/verify/fault（POST /ems/instrument/*）+ meterPointApi.list
 *  演示要点：**强检是法定动作，不是资产管理**——能源结算点用的表超期未检，
 *        那个月的账在审计上就站不住。所以这页的「检定」不是改个日期字段：
 *        mock 里它同时做三件事——上次检定日记今天、下次按周期推、**状态当场重算**（正常/临期/超期），
 *        超期的表还会在装配时被 `scanVerifyDeadlines()` 扫出来发一条级别 4 报警（EM0005 有行、大屏角标非零）。
 *        「报故障」是双向的：置故障后该点数据待复核并报警，再点一次按检定日恢复回原状态——
 *        故障和超期是两件事，恢复时不能把人从故障里"检"出来，也不能把超期"修"成正常。
 *        下次检定日**留空即按台账上的强检周期自己推算**：周期口径只允许住在 EC0004 这一处，
 *        让页面去猜这个日期等于把强检周期搬出账本，改周期时就会有两处不同步。
 *  待接入：检定证书附件上传（真实系统要留证书号，本演示只留登记痕迹）。 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { instrumentApi, meterPointApi } from "@/api/energy";
import type { MeterPoint } from "@/api/energy/types";
import { boolRenderer, dashFmt, tagRenderer, unitFmt } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready } = useNameMaps();

const listRef = ref<InstanceType<typeof ListPage> | null>(null);

const TYPES = [
  "电磁流量计",
  "孔板流量计",
  "涡街流量计",
  "超声波流量计",
  "电能表",
  "无功补偿表",
  "温度变送器",
  "压力变送器",
];
const STATUSES = ["正常", "临期", "超期", "故障"];

/** 计量点 id → 名称（台账行只有 `pointId`，而"哪块表"是客户唯一会读的一列） */
const pointMap = ref<Record<string, string>>({});
onMounted(() => {
  meterPointApi
    .list()
    .then((rows) => {
      const m: Record<string, string> = {};
      for (const p of rows ?? []) m[p.id] = (p as MeterPoint).name;
      pointMap.value = m;
      void listRef.value?.reload();
    })
    .catch(() => {
      /* 拉不到就显示表号，表号本身可查 */
    });
});

/** 翻译表是后到的，到位后重查一次（介质/单元名列同理） */
watch(ready, (on) => {
  if (on) void listRef.value?.reload();
});

const spec = computed<ListPageSpec>(() => ({
  code: "EC0004",
  queryLabelWidth: "w-20",
  query: [
    { key: "keyword", label: "仪表", kind: "input", placeholder: "台账号 / 名称 / 安装位置" },
    { key: "status", label: "检定状态", kind: "select", options: STATUSES, placeholder: "全部" },
    {
      key: "forcedVerify",
      label: "强检目录",
      kind: "select",
      options: ["是", "否"],
      valueMap: { 是: "true", 否: "false" },
      placeholder: "全部",
    },
  ],
  columns: [
    { field: "id", headerName: "台账号", width: 116 },
    { field: "name", headerName: "仪表名称", minWidth: 150, flex: 1 },
    { field: "type", headerName: "型号类别", minWidth: 130 },
    {
      field: "pointId",
      headerName: "对应计量点",
      minWidth: 170,
      valueFormatter: (p) => pointMap.value[String(p.value ?? "")] ?? String(p.value ?? "—"),
    },
    { field: "rangeVal", headerName: "量程", width: 120, valueFormatter: dashFmt },
    { field: "installPos", headerName: "安装位置", minWidth: 150, valueFormatter: dashFmt },
    {
      field: "verifyCycleDays",
      headerName: "检定周期",
      width: 96,
      type: "numericColumn",
      valueFormatter: unitFmt(" 天"),
    },
    { field: "lastVerifyAt", headerName: "上次检定", width: 112, valueFormatter: dashFmt },
    { field: "nextVerifyAt", headerName: "下次检定", width: 112, valueFormatter: dashFmt },
    { field: "forcedVerify", headerName: "强检", width: 76, cellRenderer: boolRenderer() },
    { field: "status", headerName: "状态", width: 88, cellRenderer: tagRenderer() },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    {
      label: "检定",
      kind: "form",
      title: "检定登记",
      fields: [{ key: "nextDate", label: "下次检定日", kind: "date", placeholder: "留空 = 按台账周期推算" }],
      run: (r: any, f: Record<string, any>) => instrumentApi.verify(r.id, f.nextDate ? String(f.nextDate) : undefined),
    },
    /**
     * 故障是**双向按钮**：文案随状态换（`shown` 两条互斥），
     * 因为"报故障"和"解除故障"在业务上是两个动作，挤成一个「切换故障」客户看不出点了会怎样。
     */
    {
      label: "报故障",
      kind: "run",
      shown: (r: any) => r.status !== "故障",
      confirm: "登记该表故障？对应计量点的数据将标记为待复核，并发一条级别 3 报警。",
      run: (r: any) => instrumentApi.fault(r.id),
    },
    {
      label: "解除故障",
      kind: "run",
      shown: (r: any) => r.status === "故障",
      run: (r: any) => instrumentApi.fault(r.id),
    },
  ],
  toolbar: {
    add: true,
    acts: [
      {
        label: "▶ 扫描检定到期",
        confirm: "重新扫描全部仪表的检定有效期？超期的会各自发一条提示级报警。",
        run: () => instrumentApi.scan(),
      },
    ],
  },
  edit: {
    title: "计量仪表",
    /**
     * 表单里**没有「状态」栏**：状态是上次检定日 + 周期推算出来的结果（`verifyStatusOf`），
     * 手填一个"正常"会让超期表在台账上显示正常——这正是本域要避免的页间矛盾（报警中心说超期、台账说正常）。
     */
    fields: [
      { key: "name", label: "仪表名称", kind: "input", placeholder: "如 1#转炉氧气总管孔板" },
      { key: "type", label: "型号类别", kind: "select", options: TYPES },
      {
        key: "pointId",
        label: "对应计量点",
        kind: "select",
        options: Object.values(pointMap.value),
        valueMap: Object.fromEntries(Object.entries(pointMap.value).map(([id, n]) => [n, id])),
      },
      { key: "installPos", label: "安装位置", kind: "input", placeholder: "如 氧气总管 DN300 后" },
      { key: "rangeVal", label: "量程", kind: "input", placeholder: "如 0~12000 m³/h" },
      { key: "verifyCycleDays", label: "检定周期", kind: "number", unit: "天" },
      { key: "lastVerifyAt", label: "上次检定日", kind: "date" },
      { key: "forcedVerify", label: "进强检目录", kind: "bool" },
    ],
  },
  detail: {
    sections: [
      {
        title: "表计身份",
        fields: [
          { label: "台账号", from: "id" },
          { label: "仪表名称", from: "name" },
          { label: "型号类别", from: "type" },
          { label: "对应计量点", from: "pointId", map: pointMap.value },
          { label: "量程", from: "rangeVal" },
          { label: "安装位置", from: "installPos" },
        ],
      },
      {
        title: "检定与状态",
        fields: [
          { label: "检定周期", from: "verifyCycleDays", suffix: " 天" },
          { label: "上次检定", from: "lastVerifyAt" },
          { label: "下次检定", from: "nextVerifyAt" },
          { label: "当前状态", from: "status" },
          {
            label: "强检目录",
            from: "forcedVerify",
            map: { true: "是（结算用表，超期即影响账的可信度）", false: "否" },
          },
        ],
      },
    ],
  },
  fetch: (q) => instrumentApi.page(q),
  writeFn: (d) => instrumentApi.save(d),
  /**
   * 顶部报的是**四态分布**：这页要被追问的是「有没有超期的表」，
   * 一个「共 N 条」回答不了。超期/临期非零时，演示就该顺势去 EM0005 看那条报警。
   */
  summary: ({ total, rows }) => {
    const n = (s: string) => rows.filter((r: any) => r.status === s).length;
    return `共 ${total} 台 · 正常 ${n("正常")} · 临期 ${n("临期")} · 超期 ${n("超期")} · 故障 ${n("故障")}`;
  },
}));

/**
 * 台账**没有删除按钮**（不是忘了做）：仪表的台账号是检定记录的键，
 * 删掉一行就等于把它的强检历史一起抹了——审计要问的是「这块表去年检过没有」，
 * 而不是「它为什么不在表上了」。要停表用「报故障」，报废归设备管理域管。
 */
</script>

<template>
  <ListPage ref="listRef" :spec="spec" />
</template>
