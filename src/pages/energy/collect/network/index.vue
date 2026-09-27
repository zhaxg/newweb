<script setup lang="ts">
/** 对应 EC0001 计量网络配置（模块一 · 附录 B5 版式 L2 树 + L1 列表）
 *  接口：unitApi.tree（GET /ems/unit/tree）+ meterPointApi.list/page/save/remove
 *  演示要点：**能源账的每一粒数据都要有一个物理出处**，这页就是那个出处。
 *        左树是归集口径（与 EG0002 同一棵树、同一个 `path`），叶子挂的是计量点；
 *        右表跟着选中的**整棵子树**走——点「炼钢厂」要看见转炉、连铸、公辅所有表，
 *        所以 mock 吃的是 `subtreeOf` 而不是 `unitId`（点只挂在最末级，精确匹配厂级恒为 0 行）。
 *        「结算点」这个标记是强检依据：勾上它就进了 EC0003 的异常扫描范围与 EC0004 的强检台账，
 *        所以这页改一个勾，后两页的行数会跟着变——这是「采集与质量是一条链」最直观的演示。
 *        删除有守卫：挂着报警规则或已绑仪表的点删不掉（宁可拒绝，也不留一张缺角的网络图）。
 *  待接入：点的量程上下限（EC0003 的量程越界判据现走 model 的倍率，不读点上的量程字段）。 */
import { computed, onMounted, ref, watch } from "vue";
import Tree from "primevue/tree";
import Button from "primevue/button";
import ListPage from "../../ListPage.vue";
import { meterPointApi, unitApi } from "@/api/energy";
import type { MeterPoint, UsingUnit } from "@/api/energy/types";
import { boolRenderer, dashFmt, levelFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

type PointNode = { key: string; label: string; data: UsingUnit; children: PointNode[] };

const { mediumName, unitName, channelName, mediumMap, unitMap, channelMap, ready } = useNameMaps();

/** 点表整份捞一次：树上的挂点数与右表的行数必须来自同一批点，各查一遍就会差一行 */
const points = ref<MeterPoint[]>([]);
const nodes = ref<PointNode[]>([]);
const expandedKeys = ref<Record<string, boolean>>({});
const selectedKeys = ref<Record<string, boolean>>({});
const picked = ref<UsingUnit | null>(null);
const subtreeOf = ref("");
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

function toNodes(flat: UsingUnit[]): PointNode[] {
  const byParent = new Map<string | null, UsingUnit[]>();
  for (const u of flat) {
    const pid = u.parentId ?? null;
    (byParent.get(pid) ?? byParent.set(pid, []).get(pid)!).push(u);
  }
  const build = (pid: string | null): PointNode[] =>
    (byParent.get(pid) ?? []).map((u) => ({ key: u.id, label: u.name, data: u, children: build(u.id) }));
  return build(null);
}

/** 默认展开两层（公司 + 厂），第三层留给演示时手点 */
function openLevels(list: PointNode[], depth = 0, out: Record<string, boolean> = {}) {
  for (const n of list) {
    if (depth < 2 && n.children.length) out[n.key] = true;
    openLevels(n.children, depth + 1, out);
  }
  return out;
}

function allKeys(list: PointNode[], out: Record<string, boolean> = {}) {
  for (const n of list) {
    if (!n.children.length) continue;
    out[n.key] = true;
    allKeys(n.children, out);
  }
  return out;
}

let allExpanded = false;
function toggleAll() {
  allExpanded = !allExpanded;
  expandedKeys.value = allExpanded ? allKeys(nodes.value) : openLevels(nodes.value);
}

/** 直接挂在该单元上的点数（**不含子孙**：树上的数字要和点进去看到的直接层对得上） */
const directCount = computed(() => {
  const m: Record<string, number> = {};
  for (const p of points.value) m[p.unitId] = (m[p.unitId] ?? 0) + 1;
  return m;
});

/** 子树合计，给底部那行提示用（客户想知道的是「这个厂一共有多少表」） */
function subtreeCount(rootId: string) {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const u of unitFlat.value) {
      if (u.parentId && ids.has(u.parentId) && !ids.has(u.id)) {
        ids.add(u.id);
        grew = true;
      }
    }
  }
  return points.value.filter((p) => ids.has(p.unitId)).length;
}

const unitFlat = ref<UsingUnit[]>([]);

async function loadTree(first = false) {
  try {
    const [flat, pts] = await Promise.all([unitApi.tree(), meterPointApi.list()]);
    unitFlat.value = flat ?? [];
    points.value = pts ?? [];
  } catch {
    return; // 拦截层已 toast；树留着上一次的样子，比清成一片空白有用
  }
  nodes.value = toNodes(unitFlat.value);
  if (first) {
    expandedKeys.value = openLevels(nodes.value);
    /* 默认选中「发电厂」：EMS 的采集链在能源中心最密（关口表、CCPP、水处理），
       进页面第一眼就是一张几十行的点表，而不是一片空白。 */
    const power = unitFlat.value.find((u) => u.name.includes("发电")) ?? unitFlat.value[1] ?? unitFlat.value[0];
    if (power) selectedKeys.value = { [power.id]: true };
    return;
  }
  const id = picked.value?.id;
  if (id) picked.value = unitFlat.value.find((u) => u.id === id) ?? picked.value;
}

watch(selectedKeys, (sel) => {
  const keys = Object.keys(sel).filter((k) => sel[k]);
  if (!keys.length) return;
  const hit = unitFlat.value.find((u) => u.id === keys[keys.length - 1]) ?? null;
  picked.value = hit;
  subtreeOf.value = hit ? hit.id : "";
  void listRef.value?.reload();
});

/** 介质/单元/通道/点名都是后到的翻译表，到位后重查一次，别让客户看一屏 BFG 和 MP-00007 */
watch(ready, (on) => {
  if (on) listRef.value?.reload();
});

onMounted(() => void loadTree(true));

const MEDIA_OPTIONS = computed(() => Object.values(mediumMap.value));
const MEDIA_VALUE_MAP = computed(() => Object.fromEntries(Object.entries(mediumMap.value).map(([c, n]) => [n, c])));

const DATA_KINDS = ["累计量", "瞬时值", "状态量"];
const DIRECTIONS = ["购入", "自产", "转换", "消耗", "回收", "损失", "外供"];
const ACCURACIES = ["0.05", "0.0S", "0.5S", "0.5", "1.0", "2.0", "2.5"];
const YES_NO = ["是", "否"];
const BOOL_MAP = { 是: "true", 否: "false" };

/**
 * 写表单里的三个外键一律**中文名下拉**（options 是名字、valueMap 反查 id）：
 * 让客户去填 `EU-0412`、`CH-007` 是这套演示最不该出现的输入体验，
 * 而 mock 的 `saveMeterPoint` 会校验单元与通道**必须存在**，填错当场被拒。
 */
const spec = computed<ListPageSpec>(() => ({
  code: "EC0001",
  queryLabelWidth: "w-20",
  query: [
    { key: "keyword", label: "计量点", kind: "input", placeholder: "表号 / 名称 / 精度" },
    {
      key: "mediaCode",
      label: "介质",
      kind: "select",
      options: MEDIA_OPTIONS.value,
      valueMap: MEDIA_VALUE_MAP.value,
      placeholder: "全部",
    },
    {
      key: "channelId",
      label: "通道",
      kind: "select",
      options: Object.values(channelMap.value),
      valueMap: Object.fromEntries(Object.entries(channelMap.value).map(([id, n]) => [n, id])),
      placeholder: "全部",
    },
    { key: "dataKind", label: "数据类型", kind: "select", options: DATA_KINDS, placeholder: "全部" },
    {
      key: "isSettlement",
      label: "结算点",
      kind: "select",
      options: YES_NO,
      valueMap: BOOL_MAP,
      placeholder: "全部",
    },
  ],
  columns: [
    { field: "id", headerName: "表号", width: 108 },
    { field: "name", headerName: "计量点名称", minWidth: 190, flex: 1 },
    { field: "mediaCode", headerName: "介质", minWidth: 104, valueFormatter: (p) => mediumName(p.value) },
    { field: "unitId", headerName: "所属单元", minWidth: 130, valueFormatter: (p) => unitName(p.value) },
    { field: "level", headerName: "层级", width: 78, valueFormatter: levelFmt },
    { field: "dataKind", headerName: "数据类型", width: 92, cellRenderer: tagRenderer({ 累计量: "", 瞬时值: "" }) },
    { field: "accuracy", headerName: "精度", width: 78 },
    {
      field: "direction",
      headerName: "归集方向",
      width: 96,
      cellRenderer: tagRenderer(),
      valueFormatter: (p) => (p.value ? String(p.value) : "—"),
    },
    { field: "isSettlement", headerName: "结算点", width: 84, cellRenderer: boolRenderer() },
    { field: "channelId", headerName: "采集通道", minWidth: 140, valueFormatter: (p) => channelName(p.value) },
    { field: "instId", headerName: "关联仪表", width: 116, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
  ],
  toolbar: { add: true },
  edit: {
    title: "计量点",
    /**
     * 表单里**没有「层级」栏**：`level` 由挂在哪个单元下唯一决定（`saveMeterPoint` 按父级取），
     * 让人手填一个和位置不一致的数字，等于造出树上找不到、账上归不上的一条点。
     */
    fields: [
      { key: "name", label: "计量点名称", kind: "input", placeholder: "如 1#转炉氧气总管" },
      {
        key: "mediaCode",
        label: "介质",
        kind: "select",
        options: MEDIA_OPTIONS.value,
        valueMap: MEDIA_VALUE_MAP.value,
      },
      {
        key: "unitId",
        label: "所属用能单元",
        kind: "select",
        options: Object.values(unitMap.value),
        valueMap: Object.fromEntries(Object.entries(unitMap.value).map(([id, n]) => [n, id])),
      },
      {
        key: "channelId",
        label: "采集通道",
        kind: "select",
        options: Object.values(channelMap.value),
        valueMap: Object.fromEntries(Object.entries(channelMap.value).map(([id, n]) => [n, id])),
      },
      { key: "dataKind", label: "数据类型", kind: "select", options: DATA_KINDS },
      { key: "accuracy", label: "精度等级", kind: "select", options: ACCURACIES },
      { key: "direction", label: "归集方向", kind: "select", options: DIRECTIONS },
      { key: "isSettlement", label: "作为结算点（进强检目录）", kind: "bool" },
    ],
  },
  detail: {
    sections: [
      {
        title: "计量点身份",
        fields: [
          { label: "表号", from: "id" },
          { label: "名称", from: "name" },
          { label: "介质", from: "mediaCode", map: mediumMap.value },
          { label: "所属用能单元", from: "unitId", map: unitMap.value },
          { label: "计量体系级别", from: "level", map: { 1: "1 级", 2: "2 级", 3: "3 级", 4: "4 级" } },
        ],
      },
      {
        title: "采集与归集",
        fields: [
          { label: "采集通道", from: "channelId", map: channelMap.value },
          { label: "数据类型", from: "dataKind" },
          { label: "精度等级", from: "accuracy" },
          { label: "定额归集方向", from: "direction" },
          {
            label: "结算点",
            from: "isSettlement",
            map: { true: "是（进 EC0003 异常扫描与 EC0004 强检台账）", false: "否" },
          },
          { label: "关联仪表", from: "instId" },
        ],
      },
    ],
  },
  fetch: (q) => meterPointApi.page(subtreeOf.value ? { ...q, subtreeOf: subtreeOf.value } : q),
  writeFn: (d) => meterPointApi.save(withUnit(d)),
  deleteFn: (id) => meterPointApi.remove(id),
  /** 结算点数是 EC0003/EC0004 的输入，所以这里把它和总数一起报出来，改完勾一眼就能看出影响 */
  summary: ({ total, rows }) =>
    subtreeOf.value
      ? `${picked.value?.name ?? ""} 子树 ${subtreeCount(subtreeOf.value)} 个计量点 · 本页 ${rows.length} 行 · 结算点 ${rows.filter((r: any) => r.isSettlement).length}`
      : `共 ${total} 个计量点 · 点一个单元只看它子树上的表`,
}));

/** 新增 = 挂在当前选中单元下（没选就交给 mock 校验——它会拒「单元不存在」） */
function withUnit(d: Record<string, any>) {
  if (d.id || !picked.value || d.unitId) return d;
  return { ...d, unitId: picked.value.id };
}
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <!-- 左：用能单元树（与 EG0002 同一份 path，节点后缀是它直接挂的表计数） -->
    <aside class="flex w-80 shrink-0 flex-col border-r border-border/60">
      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <span class="text-xs text-muted-foreground">计量网络</span>
        <Button variant="text" class="ml-auto shrink-0 whitespace-nowrap" @click="toggleAll"> 展开 / 收起 </Button>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <Tree
          v-model:expanded-keys="expandedKeys"
          v-model:selection-keys="selectedKeys"
          selection-mode="single"
          :value="nodes"
        >
          <template #default="slotProps">
            <span class="flex min-w-0 items-center gap-2">
              <span class="truncate text-body">{{ slotProps.node.label }}</span>
              <span class="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                {{ directCount[slotProps.node.key] ?? 0 }}
              </span>
            </span>
          </template>
        </Tree>
        <div v-if="!nodes.length" class="px-3 py-6 text-xs text-muted-foreground">还没有用能单元。</div>
      </div>
      <div class="shrink-0 border-t border-border/60 px-2 py-1.5 text-xs text-muted-foreground">
        {{ picked ? `已选：${picked.name} · 子树 ${subtreeCount(picked.id)} 表` : "点节点，右侧只看它子树上的表" }}
      </div>
    </aside>

    <!-- 右：计量点表。@changed 让新增/改通道/删点之后树上的挂点数与结算点合计跟着重算 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <ListPage ref="listRef" :spec="spec" @changed="loadTree" />
    </div>
  </div>
</template>
