<script setup lang="ts">
/** 对应 EC0002 采集通道管理（模块一 · 附录 B5 版式 L6 状态流 + 后果展示）
 *  接口：channelApi.page/save/remove/break/flap/restore（POST /ems/channel/*）
 *  演示要点：**这一页是整套系统「可信度」的开关**，也是 8 幕剧本之前的一场热身。
 *        「▶模拟中断」不是把状态改红就完事：mock 里它连着四件事——
 *        通道置离线 → 该站所名下所有计量点的实时读数变空（EC0005 当场显示断点，不是补一个 0）
 *        → 该 单元×介质×方向 元组的**当日实绩置缺失**（EP0002 出现「缺失」行）
 *        → 发一条级别 3「通讯中断」报警（EM0005 报警中心多一行）。
 *        「一键复归」把这条链**倒着走一遍**：回填缺失实绩、把待补传条数清零、关报警。
 *        所以这一页必须和别的页同时看——只在本页变色、别页毫无反应的演示，客户会当成贴图。
 *        中断只在**该元组的点全断**时才标缺失（30 个点断 1 个不该让整个节点上账变空），
 *        判据与 `pointCount` 同源，见 store 的 `commBreak`。
 *  待接入：通道的物理链路信息（网关 IP、波特率）——契约里没这些字段，等真实后端补。 */
import { computed, onMounted, ref } from "vue";
import ListPage from "../../ListPage.vue";
import { channelApi, personApi } from "@/api/energy";
import { boolRenderer, dashFmt, numFmt, tagRenderer } from "../../cells";
import type { ListPageSpec } from "../../listTypes";

const PROTOCOLS = ["OPC UA", "Modbus TCP", "IEC 60870-5-104", "DL/T645", "S7"];
const STATUSES = ["在线", "通讯异常", "离线"];
const YES_NO = ["是", "否"];
const BOOL_MAP = { 是: "true", 否: "false" };

/**
 * 责任人候选走 `GET /ems/person/list`，**不在页面写死名单**：
 * 这批人同时是报警接收人、补录人、校核人、调度签发人（energy.md B3），
 * 页面各抄一份就可能出现「通道责任人」和「报警接收人」是两批人——本域唯一红线意义上的页间矛盾。
 */
const owners = ref<string[]>([]);
onMounted(() => {
  personApi
    .list()
    .then((rows) => {
      owners.value = (rows ?? []).map((p) => p.name);
    })
    .catch(() => {
      /* 拉不到就留空候选：新增通道会被 mock 的 `saveChannel` 拒「请填责任人」，
         宁可可复现地拒绝，也不让页面偷偷换一批写死的名字进账。 */
    });
});

const spec = computed<ListPageSpec>(() => ({
  code: "EC0002",
  queryLabelWidth: "w-20",
  query: [
    { key: "keyword", label: "通道", kind: "input", placeholder: "编号 / 站所 / 责任人" },
    { key: "protocol", label: "规约", kind: "select", options: PROTOCOLS, placeholder: "全部" },
    { key: "status", label: "状态", kind: "select", options: STATUSES, placeholder: "全部" },
    {
      key: "cacheMode",
      label: "断点续传",
      kind: "select",
      options: YES_NO,
      valueMap: BOOL_MAP,
      placeholder: "全部",
    },
  ],
  columns: [
    { field: "id", headerName: "通道编号", width: 108 },
    { field: "stationName", headerName: "无人值守站所", minWidth: 168, flex: 1 },
    { field: "protocol", headerName: "通讯规约", minWidth: 150 },
    { field: "pointCount", headerName: "挂点", width: 78, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "status", headerName: "状态", width: 100, cellRenderer: tagRenderer() },
    { field: "heartbeatAt", headerName: "最后心跳", minWidth: 150, valueFormatter: dashFmt },
    {
      field: "pendingUpload",
      headerName: "待补传",
      width: 92,
      type: "numericColumn",
      valueFormatter: numFmt(0),
    },
    { field: "cacheMode", headerName: "断点续传", width: 92, cellRenderer: boolRenderer() },
    { field: "owner", headerName: "责任人", width: 88 },
    { field: "note", headerName: "备注", minWidth: 150, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    /** 中断与抖动都是**可复归**的演示动作，所以给二次确认：客户点了要知道发生了什么 */
    {
      label: "▶模拟中断",
      kind: "run",
      shown: (r: any) => r.status !== "离线",
      confirm: "中断该站所通讯？关联计量点读数将变空、当日实绩置缺失并触发级别 3 报警。",
      run: (r: any) => channelApi.break(r.id),
    },
    {
      label: "▶瞬间抖动",
      kind: "run",
      shown: (r: any) => r.status === "在线",
      run: (r: any) => channelApi.flap(r.id),
    },
    {
      label: "复归",
      kind: "run",
      shown: (r: any) => r.status !== "在线",
      run: (r: any) => channelApi.restore(),
    },
    { label: "删除", kind: "delete", shown: (r: any) => !r.pointCount },
  ],
  toolbar: {
    add: true,
    acts: [
      {
        label: "一键复归全部中断",
        confirm: "复归所有非在线通道？中断期间的缺失实绩将按应有值回填。",
        run: () => channelApi.restore(),
      },
    ],
  },
  edit: {
    title: "采集通道",
    /**
     * 表单里**没有「挂点数」和「状态」**：前者由 EC0001 的测点表反推（`syncChannelPointCounts`），
     * 后者是采集链的运行事实、只能由中断/复归动作改。
     * 手填这两个字段的结果就是页面与 EC0001 树上的数不一致，本域不允许。
     */
    fields: [
      { key: "stationName", label: "站所名称", kind: "input", placeholder: "如 110kV 北区变电站" },
      { key: "protocol", label: "通讯规约", kind: "select", options: PROTOCOLS },
      { key: "owner", label: "责任人", kind: "select", options: owners.value },
      { key: "cacheMode", label: "边缘网关断点续传", kind: "bool" },
      { key: "note", label: "备注", kind: "textarea", full: true },
    ],
  },
  detail: {
    sections: [
      {
        title: "通道身份",
        fields: [
          { label: "通道编号", from: "id" },
          { label: "站所名称", from: "stationName" },
          { label: "通讯规约", from: "protocol" },
          { label: "责任人", from: "owner" },
        ],
      },
      {
        title: "运行态",
        fields: [
          { label: "当前状态", from: "status" },
          { label: "最后心跳", from: "heartbeatAt" },
          { label: "挂接计量点", from: "pointCount", suffix: " 个" },
          { label: "待补传条数", from: "pendingUpload", suffix: " 条" },
          { label: "断点续传", from: "cacheMode", map: { true: "开启（恢复后自动补传）", false: "关闭" } },
          { label: "备注", from: "note" },
        ],
      },
    ],
  },
  fetch: (q) => channelApi.page(q),
  writeFn: (d) => channelApi.save(d),
  deleteFn: (id) => channelApi.remove(id),
  /**
   * 顶部提示报的是**全站通道状态分布 + 在途待补传**，不是「共 N 条」：
   * 这页要回答的第一问是「采集链现在好不好」，而待补传条数是「恢复回填」这件事的证据，
   * 归零才算复干净。（`summary` 只吃当前页数据，通道总数在页内一页放得下，够用。）
   */
  summary: ({ total, rows }) => {
    const on = rows.filter((r: any) => r.status === "在线").length;
    const bad = rows.filter((r: any) => r.status === "通讯异常").length;
    const off = rows.filter((r: any) => r.status === "离线").length;
    const pending = rows.reduce((a: number, r: any) => a + (Number(r.pendingUpload) || 0), 0);
    return `共 ${total} 路 · 在线 ${on} · 异常 ${bad} · 离线 ${off} · 待补传 ${pending} 条`;
  },
}));
</script>

<template>
  <ListPage :spec="spec" />
</template>
