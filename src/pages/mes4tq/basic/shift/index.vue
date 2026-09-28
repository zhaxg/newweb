<script setup lang="ts">
/**
 * 对应 TG0004 排班配置（基础配置 · 附录 A3 版式 **L1 + 四页签**）
 *
 * 接口：`shiftApi.teams` / `shifts` / `rules` / `page`
 *
 * 演示要点：**排班是「四班三运转」的一个完整闭环**——
 * 三个班组排不开三个班，所以钢厂用四个班组轮三个班次，每个人做 6 天休 24 小时。
 * 客户在别的系统里常看到「四班为什么只有三个班」这个问题，
 * 本页把班组（甲乙丙丁）、班次（A/B/C 三段钟点）、规则（四班三运转）、
 * 班表（14 天 × 3 班 = 42 行）摊在四个页签上，一屏答完。
 *
 * **生产日的班序是 A→B→C**（夜班 C 虽然钟点上最早，但它属于**前一个**生产日）——
 * 这是班表最容易错的地方：按自然日排会把 00:00-08:00 算到次日，
 * 日报就比月报少一个班。`data/model.ts` 的 `SHIFT_SPAN` 与此同源。
 *
 * 三个小页签（班组 4 行 / 班次 3 行 / 规则 2 行）的筛选在**前端做**：
 * 那么少的行数走服务端分页是把 2 行拆成一页再传一个来回，纯浪费。
 * 只有班表（42 行、可按日期与班次筛）才打 `POST listPage`。
 *
 * 待接入：排班规则编辑、手工调班（本域只查桩）。
 */
import { computed, ref } from "vue";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import ListPage from "../../ListPage.vue";
import { shiftApi } from "@/api/mes4tq";
import { dashFmt, numFmt, tagRenderer } from "../../cells";
import type { ListPageSpec } from "../../listTypes";

const activeTab = ref("schedule");

/**
 * 把「一次拉全量」的 GET 接口包成 `ListPage` 要的分页形状，并在**前端做关键字筛**。
 * 理由见文件头；小表的筛选本来就只在这一页用，走服务端是为筛 2 行搭一套路由。
 */
function allOf(getter: () => Promise<Array<Record<string, any>>>, fields: string[]) {
  return async (q: Record<string, any>) => {
    const rows = await getter();
    const kw = String(q.keyword ?? "")
      .trim()
      .toLowerCase();
    const kept = kw
      ? rows.filter((r) =>
          fields.some((f) =>
            String(r[f] ?? "")
              .toLowerCase()
              .includes(kw),
          ),
        )
      : rows;
    return { total: kept.length, rows: kept };
  };
}

/* ── 页签一：班组（甲/乙/丙/丁）─────────────────────────────── */

const teamsSpec = computed<ListPageSpec>(() => ({
  code: "TG0004",
  exportEntity: "teams",
  query: [{ key: "keyword", label: "班组", kind: "input", placeholder: "班组名 / 班长 / 岗位" }],
  columns: [
    { field: "teamId", headerName: "班组编码", width: 96, pinned: "left" },
    { field: "name", headerName: "班组", width: 96 },
    { field: "leaderName", headerName: "班长", width: 96 },
    { field: "postName", headerName: "班长岗位", width: 130 },
    { field: "members", headerName: "人数", width: 88, type: "numericColumn", valueFormatter: numFmt(0) },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  fetch: allOf(() => shiftApi.teams(), ["teamId", "name", "leaderName", "postName"]),
  summary: ({ total }) => `${total} 个班组 · 四班三运转`,
}));

/* ── 页签二：班次（A/B/C 三段钟点）─────────────────────────────── */

const shiftsSpec = computed<ListPageSpec>(() => ({
  code: "TG0004",
  exportEntity: "shifts",
  query: [{ key: "keyword", label: "班次", kind: "input", placeholder: "代码 / 名称 / 时段" }],
  columns: [
    { field: "code", headerName: "代码", width: 80, pinned: "left" },
    { field: "label", headerName: "班次", width: 110 },
    { field: "name", headerName: "名称", width: 96 },
    { field: "beginTime", headerName: "开始", width: 96 },
    { field: "endTime", headerName: "结束", width: 96 },
    { field: "seq", headerName: "生产日班序", width: 110 },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  fetch: allOf(() => shiftApi.shifts(), ["code", "name", "label"]),
  /* 「生产日班序」必须解释一句，否则客户看 C 班在最后会以为是按钟点排错了 */
  summary: () => "3 个班次 · 生产日班序 A→B→C，夜班 C 归属前一生产日",
}));

/* ── 页签三：排班规则 ──────────────────────────────────────────── */

const rulesSpec = computed<ListPageSpec>(() => ({
  code: "TG0004",
  exportEntity: "shift-rules",
  query: [{ key: "keyword", label: "规则", kind: "input", placeholder: "规则名 / 模式" }],
  columns: [
    { field: "name", headerName: "规则名称", width: 150, pinned: "left" },
    { field: "pattern", headerName: "模式", width: 130 },
    /* 班组 id 列表直接成列会显示 T-A,T-B…，前端按名翻一次 */
    {
      field: "teamIds",
      headerName: "适用班组",
      minWidth: 200,
      flex: 1,
      valueFormatter: (p) =>
        Array.isArray(p.value)
          ? p.value
              .map((t: string) => ({ "T-A": "甲班", "T-B": "乙班", "T-C": "丙班", "T-D": "丁班" })[t] ?? t)
              .join("、")
          : "—",
    },
    { field: "effectiveDate", headerName: "生效日期", width: 110 },
    { field: "remark", headerName: "说明", minWidth: 240, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  fetch: allOf(() => shiftApi.rules(), ["name", "pattern", "remark"]),
  summary: ({ total }) => `${total} 条排班规则`,
}));

/* ── 页签四：排班结果（走服务端分页与筛选）─────────────────────── */

const scheduleSpec = computed<ListPageSpec>(() => ({
  code: "TG0004",
  exportEntity: "schedule",
  query: [
    {
      key: "date",
      label: "生产日期",
      kind: "range",
      as: "date",
      /* 纯日期字段没有时分，`as: "date"` 让区间送 YYYY-MM-DD（见 listTypes 的说明） */
      placeholder: "生产日期",
    },
    { key: "shift", label: "班次", kind: "select", options: ["A", "B", "C"] },
    { key: "teamId", label: "班组", kind: "select", options: ["T-A", "T-B", "T-C", "T-D"] },
  ],
  columns: [
    { field: "date", headerName: "生产日期", width: 116, pinned: "left" },
    { field: "shift", headerName: "班次", width: 84, cellRenderer: (p: any) => shiftTag(p.value) },
    { field: "teamName", headerName: "班组", width: 96 },
    { field: "leader", headerName: "班长", width: 96 },
    { field: "memberCount", headerName: "人数", width: 84, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "ruleId", headerName: "排班规则", width: 110, valueFormatter: dashFmt },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  toolbar: { extraButtons: ["▶ 模拟调班"] },
  fetch: (q) => shiftApi.page(q),
  summary: ({ total }) => `${total} 个班次 · 近 14 天`,
}));

/** 班次色标：早/中/夜三段，颜色只为辨识不带好坏（夜班不是坏班，所以不给红） */
function shiftTag(v: unknown) {
  const map: Record<string, string> = {
    A: "text-sky-600 bg-sky-500/12 dark:text-sky-400",
    B: "text-amber-600 bg-amber-500/14 dark:text-amber-400",
    C: "text-violet-600 bg-violet-500/12 dark:text-violet-400",
  };
  const el = document.createElement("span");
  el.className = `inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${map[String(v)] ?? "text-muted-foreground bg-muted"}`;
  const code = String(v ?? "");
  el.textContent = code ? `${code} ${code === "A" ? "早班" : code === "B" ? "中班" : "夜班"}` : "—";
  return el;
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 四个数据区同属一屏，用页签分而不是上下堆：堆四张表客户会先看第一张就走 -->
    <Tabs v-model:value="activeTab" class="flex min-h-0 flex-1 flex-col">
      <TabList class="min-w-0 flex-1">
        <Tab value="schedule">排班结果</Tab>
        <Tab value="teams">班组</Tab>
        <Tab value="shifts">班次</Tab>
        <Tab value="rules">排班规则</Tab>
      </TabList>
      <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
        <TabPanel value="schedule" class="h-full">
          <ListPage :spec="scheduleSpec" />
        </TabPanel>
        <TabPanel value="teams" class="h-full">
          <ListPage :spec="teamsSpec" />
        </TabPanel>
        <TabPanel value="shifts" class="h-full">
          <ListPage :spec="shiftsSpec" />
        </TabPanel>
        <TabPanel value="rules" class="h-full">
          <ListPage :spec="rulesSpec" />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
