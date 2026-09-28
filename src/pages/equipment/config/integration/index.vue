<script setup lang="ts">
/** 对应 AG0001 集成接口管理（模块七 · 附录 B5 版式 L1）
 *  接口：integrationApi.page（POST /eam/integration/listPage）· sync（POST /eam/integration/sync）
 *  演示要点：**这页存在的唯一理由是回答客户那句"你们不是要孤立地上一套系统吧"**。
 *        注册表里六条接口把 MES（设备主数据）、ERP（工单成本回传/采购订单）、HR（人员组织）、
 *        LIMS（油液化验）、能源管控各自的协议与频次摆出来，客户一眼看到边界在哪。
 *        「立即同步」是真的会动的按钮：`store.syncIntegration` 把 `lastAt` 推到当前、状态改回成功，
 *        所以点完 IF-005（能源管控，种子里那条是"失败"）当场由红转绿——**开放性这件事要能被点一下证明**。
 *        IF-006 例外：它在种子里是"未启用"，`syncIntegration` 对它的处理是**保持未启用**，
 *        页面也因此不给它「立即同步」按钮。留一条没启用的接口比六条全绿更真：
 *        客户现场永远有几个"接口做好了但对方还没上"的情况，全绿反而像摆拍。
 *  待接入：调用日志明细与失败重传（后端只提供最近一次状态/时间，没有逐次日志表，不编数据）。 */
import ListPage from "../../ListPage.vue";
import { integrationApi } from "@/api/equipment";
import { dashFmt, tagRenderer } from "../../cells";
import type { ListPageSpec } from "../../listTypes";

const TARGETS = ["MES", "ERP", "HR", "LIMS", "能源管控"];
const PROTOCOLS = ["REST", "Webservice", "MQ"];
const STATUSES = ["成功", "失败", "未启用"];

const spec: ListPageSpec = {
  code: "AG0001",
  query: [
    { key: "keyword", label: "接口", kind: "input", placeholder: "接口名称" },
    { key: "target", label: "对端系统", kind: "select", options: TARGETS, placeholder: "全部系统" },
    { key: "protocol", label: "协议", kind: "select", options: PROTOCOLS, placeholder: "全部协议" },
    { key: "lastStatus", label: "最近状态", kind: "select", options: STATUSES, placeholder: "全部" },
  ],
  columns: [
    { field: "id", headerName: "接口编号", width: 96 },
    { field: "name", headerName: "接口名称", minWidth: 240, flex: 1 },
    { field: "target", headerName: "对端系统", width: 110 },
    { field: "protocol", headerName: "协议", width: 104 },
    { field: "frequency", headerName: "调度频次", width: 130 },
    { field: "lastStatus", headerName: "最近状态", width: 100, cellRenderer: tagRenderer() },
    { field: "lastAt", headerName: "最近调用时间", width: 160, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    {
      label: "立即同步",
      kind: "run",
      shown: (r: any) => r.lastStatus !== "未启用",
      run: (row) => integrationApi.sync(row.id),
      okMsg: "同步任务已执行",
    },
  ],
  detail: {
    sections: [
      {
        title: "接口注册",
        fields: [
          { label: "接口编号", from: "id" },
          { label: "接口名称", from: "name" },
          { label: "对端系统", from: "target" },
          { label: "协议", from: "protocol" },
          { label: "调度频次", from: "frequency" },
        ],
      },
      {
        title: "运行情况",
        fields: [
          { label: "最近状态", from: "lastStatus" },
          { label: "最近调用时间", from: "lastAt" },
        ],
      },
    ],
  },
  fetch: (q) => integrationApi.page(q),
  summary: ({ total, rows }) => {
    const bad = rows.filter((r: any) => r.lastStatus === "失败").length;
    const off = rows.filter((r: any) => r.lastStatus === "未启用").length;
    return `共 ${total} 条接口 · 本页失败 ${bad} · 未启用 ${off}`;
  },
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
