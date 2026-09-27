<script setup lang="ts">
/** 对应 EG0003 报警规则与分时电价（模块六 · 附录 B5 版式 L3 左右双列表）
 *  接口：alarmRuleApi.page/save/remove/toggle + priceTemplateApi.page/save/toggle
 *        + personApi.list（GET /ems/person/list，接收人候选）
 *  演示要点：**左边这 12 条规则就是整套报警链的发令枪**。EM0002 柜位越限、EC0002 通道掉线、
 *        EP0006 超能耗定额，判的都是这张表上的阈值与死区——它被 tick **现读**，
 *        所以把「转炉煤气柜位高限」从 88% 改成 82%，下一次刷新柜位就直接报警，
 *        不用重启、不用重算：这是演示「配置驱动」最省口舌的一招。
 *        死区（deadband）单独给一列是有理由的：没有它，柜位在阈值上下抖一拍就报一次，
 *        报警中心三秒被刷屏，客户第一个问题就会是「这系统报警太吵」。
 *        右边电价是**互斥生效**的：把 PT-002 设为生效，PT-001 自动落下——
 *        两个模板同时"生效"是电价页最丢人的错误，所以互斥做在端点里、不交给页面自觉。
 *        需量电价与申报需量两列直接进 EP0004 的力调电费，改这里、结算单跟着变。
 *  待接入：通知渠道的实际外发（短信/语音/站内信的真实网关），本域只做配置与站内展示。 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { alarmRuleApi, mediumApi, personApi, priceTemplateApi } from "@/api/energy";
import { boolRenderer, dashFmt, numFmt, qtyFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { mediumName, mediumMap, ready } = useNameMaps();

const KINDS = ["高限", "低限", "变化率", "通讯"];
const CHANNELS = ["站内", "短信", "语音", "邮件"];
const LEVEL_TEXT: Record<string, string> = { "1": "事故", "2": "重大", "3": "一般", "4": "提示", "5": "告知" };
const LEVEL_VALUE_MAP = Object.fromEntries(Object.entries(LEVEL_TEXT).map(([code, text]) => [text, code]));
const personNames = ref<string[]>([]);
/** 介质下拉同样显示中文名、送编码（行里 `mediaCode` 存的是编码） */
const mediaNames = ref<string[]>([]);
const mediaValueMap = ref<Record<string, string>>({});

onMounted(async () => {
  try {
    const [persons, media] = await Promise.all([personApi.list(), mediumApi.list()]);
    personNames.value = persons.map((p) => p.name);
    mediaNames.value = media.map((m) => m.name);
    mediaValueMap.value = Object.fromEntries(media.map((m) => [m.name, m.code]));
  } catch {
    /* 拦截层已 toast；候选空着下拉就是空的，比假造一批名字诚实 */
  }
});

/** 两张表各自的重查句柄（介质名是后到的，见下面 watch） */
const ruleList = ref<InstanceType<typeof ListPage> | null>(null);
const priceList = ref<InstanceType<typeof ListPage> | null>(null);

/** 介质名翻译表是后到的（valueFormatter 只在渲染时跑），到位后重查一次，别让客户看一屏 BFG */
watch(ready, (on) => {
  if (on) {
    ruleList.value?.reload();
    priceList.value?.reload();
  }
});

const ruleSpec = computed<ListPageSpec>(() => ({
  code: "EG0003",
  query: [
    { key: "keyword", label: "规则", kind: "input", placeholder: "名称 / 编号 / 计量点" },
    {
      key: "level",
      label: "级别",
      kind: "select",
      options: Object.values(LEVEL_TEXT),
      valueMap: LEVEL_VALUE_MAP,
      placeholder: "全部",
    },
    { key: "enabled", label: "状态", kind: "select", options: ["是", "否"], valueMap: { 是: "true", 否: "false" } },
  ],
  columns: [
    { field: "id", headerName: "编号", width: 92 },
    { field: "name", headerName: "规则名称", minWidth: 180, flex: 1 },
    { field: "mediaCode", headerName: "介质", width: 96, valueFormatter: (p) => mediumName(p.value) },
    { field: "kind", headerName: "判定", width: 84 },
    /**
     * 阈值与死区**不带单位后缀**，这是本列一个刻意的取舍：判定对象的量纲各不相同——
     * 柜位是百分比、母线电压是 kV、CCPP 出力是 MW、总管流量是 m³/h，而 `AlarmRule` 契约里
     * 没有单位字段（单位属于计量点，不属于规则）。硬给一列配一种单位就是假精确；
     * 读的人从「规则名称 + 判定 + 介质」三列已经能把量纲定住。
     */
    { field: "threshold", headerName: "阈值", minWidth: 96, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "deadband", headerName: "死区", minWidth: 78, type: "numericColumn", valueFormatter: qtyFmt },
    {
      field: "level",
      headerName: "级别",
      width: 78,
      valueFormatter: (p) => LEVEL_TEXT[String(p.value)] ?? dashFmt(p),
      cellRenderer: tagRenderer(),
    },
    { field: "receivers", headerName: "接收人", minWidth: 132, valueFormatter: (p) => joinList(p.value) },
    { field: "enabled", headerName: "启用", width: 72, cellRenderer: boolRenderer() },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    {
      label: "停用",
      kind: "run",
      shown: (r: any) => r.enabled,
      run: (r: any) => alarmRuleApi.toggle(r.id),
      okMsg: "规则已停用",
    },
    {
      label: "启用",
      kind: "run",
      shown: (r: any) => !r.enabled,
      run: (r: any) => alarmRuleApi.toggle(r.id),
      okMsg: "规则已启用",
    },
    { label: "删除", kind: "delete" },
  ],
  toolbar: { add: true },
  edit: {
    title: "报警规则",
    fields: [
      { key: "name", label: "规则名称", kind: "input", placeholder: "如 转炉煤气柜位高限" },
      {
        key: "mediaCode",
        label: "介质",
        kind: "select",
        options: mediaNames.value,
        valueMap: mediaValueMap.value,
      },
      { key: "pointId", label: "计量点编号", kind: "input", placeholder: "MP-00081" },
      { key: "kind", label: "判定类型", kind: "select", options: KINDS },
      { key: "threshold", label: "阈值", kind: "number" },
      { key: "deadband", label: "死区", kind: "number" },
      {
        key: "level",
        label: "报警级别",
        kind: "select",
        options: Object.values(LEVEL_TEXT),
        valueMap: LEVEL_VALUE_MAP,
      },
      { key: "receivers", label: "接收人", kind: "multi", options: personNames.value },
      { key: "channels", label: "通知渠道", kind: "multi", options: CHANNELS },
      { key: "enabled", label: "启用", kind: "bool" },
    ],
  },
  detail: {
    sections: [
      {
        title: "判定条件",
        fields: [
          { label: "规则编号", from: "id" },
          { label: "规则名称", from: "name" },
          { label: "介质", from: "mediaCode", map: mediumMap.value },
          { label: "计量点", from: "pointId" },
          { label: "判定类型", from: "kind" },
          { label: "阈值", from: "threshold" },
          { label: "死区", from: "deadband" },
        ],
      },
      {
        title: "通知",
        fields: [
          { label: "报警级别", from: "level", map: LEVEL_TEXT },
          { label: "接收人", from: "receivers" },
          { label: "通知渠道", from: "channels" },
          { label: "启用", from: "enabled", map: { true: "启用", false: "停用" } },
        ],
      },
    ],
  },
  fetch: (q) => alarmRuleApi.page(q),
  writeFn: (d) => alarmRuleApi.save(d),
  deleteFn: (id) => alarmRuleApi.remove(id),
  summary: ({ total }) => `共 ${total} 条规则 · 阈值改动下一次刷新即生效`,
}));

/** 数组列（接收人/渠道）→ 顿号串；DetailDialog 也吃这个形状 */
function joinList(v: unknown) {
  return Array.isArray(v) && v.length ? v.join("、") : "—";
}

const priceSpec = computed<ListPageSpec>(() => ({
  /** 一页两表：页面代号仍是 EG0003（一个菜单叶子一个代号，编码只发不废），
   *  导出实体名单独给——否则两张表的导出 toast 会念成同一个文件名。见 `listTypes.ts` 的 `exportEntity`。 */
  code: "EG0003",
  exportEntity: "priceTemplate",
  query: [{ key: "keyword", label: "模板", kind: "input", placeholder: "名称 / 生效月份" }],
  columns: [
    { field: "name", headerName: "电价模板", minWidth: 168, flex: 1 },
    { field: "effectiveMonth", headerName: "生效月", width: 92 },
    { field: "tiers", headerName: "尖/峰/平/谷 元·kWh", minWidth: 168, valueFormatter: tiersFmt },
    {
      field: "demandPrice",
      headerName: "需量电价",
      minWidth: 92,
      type: "numericColumn",
      valueFormatter: numFmt(0),
    },
    { field: "powerFactorAdj", headerName: "力调", width: 68, cellRenderer: boolRenderer() },
    {
      field: "enabled",
      headerName: "生效",
      width: 68,
      valueFormatter: (p) => (p.value ? "生效" : "停用"),
      cellRenderer: tagRenderer(),
    },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    {
      label: "设为生效",
      kind: "run",
      shown: (r: any) => !r.enabled,
      run: (r: any) => priceTemplateApi.toggle(r.id),
      okMsg: "模板已生效",
    },
    {
      label: "停用",
      kind: "run",
      shown: (r: any) => r.enabled,
      run: (r: any) => priceTemplateApi.toggle(r.id),
      okMsg: "模板已停用",
    },
  ],
  toolbar: { add: true },
  edit: {
    title: "分时电价模板",
    fields: [
      { key: "name", label: "模板名称", kind: "input", placeholder: "如 2027 年两部制" },
      { key: "effectiveMonth", label: "生效月份", kind: "input", placeholder: "YYYY-MM" },
      { key: "demandPrice", label: "需量电价", kind: "number", unit: "元/kVA·月" },
      { key: "demandKVA", label: "申报需量", kind: "number", unit: "kVA" },
      { key: "powerFactorAdj", label: "参与力调", kind: "bool" },
      { key: "pfTarget", label: "标准功率因数", kind: "number" },
    ],
  },
  detail: {
    sections: [
      {
        title: "模板与生效",
        fields: [
          { label: "模板名称", from: "name" },
          { label: "生效月份", from: "effectiveMonth" },
          { label: "当前生效", from: "enabled", map: { true: "是（EP0004 按这套算电费）", false: "否" } },
        ],
      },
      {
        title: "需量与力调",
        fields: [
          { label: "需量电价 元/kVA·月", from: "demandPrice" },
          { label: "申报需量 kVA", from: "demandKVA" },
          { label: "参与力调", from: "powerFactorAdj", map: { true: "是", false: "否" } },
          { label: "标准功率因数", from: "pfTarget" },
        ],
      },
    ],
  },
  fetch: (q) => priceTemplateApi.page(q),
  writeFn: (d) => priceTemplateApi.save(d),
  summary: ({ rows }) => {
    const on = rows.find((r: any) => r.enabled);
    return on ? `生效模板：${on.name}（${on.effectiveMonth} 起）` : "当前无生效模板（电费会算不出来）";
  },
}));

/**
 * 四段电价压成一列：`尖1.20 峰0.85 平0.55 谷0.32`。
 *
 * 为什么不做成四列：段数由模板决定（将来单一制就只有一段），四列会把"几段"这件事写进表结构；
 * 而一列串起来，读的人一眼看到的就是「这是一套分时方案」。
 */
function tiersFmt(p: { value: unknown }) {
  if (!Array.isArray(p.value)) return "—";
  return p.value.map((t: any) => `${t.tier}${Number(t.price).toFixed(2)}`).join(" ");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3 p-3 xl:flex-row xl:gap-4 xl:p-4">
    <section class="flex min-h-0 min-w-0 flex-1 flex-col rounded-md border border-border/60">
      <header class="shrink-0 border-b border-border/60 px-3 py-2 text-sm font-medium">报警规则</header>
      <div class="flex min-h-0 flex-1 flex-col">
        <ListPage ref="ruleList" :spec="ruleSpec" />
      </div>
    </section>
    <section class="flex min-h-0 w-full shrink-0 flex-col rounded-md border border-border/60 xl:w-[34rem]">
      <header class="shrink-0 border-b border-border/60 px-3 py-2 text-sm font-medium">分时电价模板</header>
      <div class="flex min-h-0 flex-1 flex-col">
        <ListPage ref="priceList" :spec="priceSpec" />
      </div>
    </section>
  </div>
</template>
