<script setup lang="ts">
/** 对应 EG0002 用能单元维护（模块六 · 附录 B5 版式 L2 树 + L1 列表）
 *  接口：unitApi.tree（GET /ems/unit/tree，平铺节点、按 path 深度优先）
 *        + unitApi.page / save / move（POST /ems/unit/listPage·save·move）
 *  演示要点：**这棵树就是整套系统的归集口径**。EP0002 实绩、EP0003 平衡表、EP0004 结算单、
 *        EP0006 重点设备全部按「厂→工序→设备→功能件」四层往上传，
 *        所以讲能源管理必先讲这张树：客户问「我的吨钢能耗为什么和贵司演示对不上」，
 *        九成的答案是归集层级不同，而不是算法不同。
 *        树的层级与 `path` 同源（`/1/5/4` 这种同级序号链），右侧列表跟着选中节点走，
 *        点「炼钢厂」就只看它名下的单元——**左右两pane是同一份数据的两只眼睛**。
 *        「上移/下移/下沉/上浮」是真的会动的按钮：换父级只改 `parentId/level/path`、
 *        **id 不动**（id 一动，挂在它名下的计量点、重点设备、实绩行全变孤儿），
 *        而厂级及以上不允许换父级——那会把定额表的归集口径捅漏，页面给的是拒绝而不是假成功。
 *  待接入：拖拽换父级（现用上移/下移/下沉/上浮四个按钮替代，语义一致且不需要冲突校验）。 */
import { computed, onMounted, ref, watch } from "vue";
import Tree from "primevue/tree";
import Button from "primevue/button";
import ListPage from "../../ListPage.vue";
import { unitApi } from "@/api/energy";
import type { UsingUnit } from "@/api/energy/types";
import { boolRenderer, dashFmt, levelFmt, mediaCodesFmt } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

/** PrimeVue Tree 的节点形状：`key` 是展开/选中的唯一依据，业务字段收在 `data` 里 */
type UnitNode = { key: string; label: string; data: UsingUnit; children: UnitNode[] };

const { mediumMap, unitMap, ready } = useNameMaps();

/** 平铺 → 嵌套：树端点回的是排好序的平铺节点（`UsingUnit` 不带 children 字段，见 mock 端注释） */
function toNodes(flat: UsingUnit[], rootId?: string): UnitNode[] {
  const byParent = new Map<string | null, UsingUnit[]>();
  for (const u of flat) {
    const pid = u.parentId ?? null;
    (byParent.get(pid) ?? byParent.set(pid, []).get(pid)!).push(u);
  }
  const build = (pid: string | null): UnitNode[] =>
    (byParent.get(pid) ?? []).map((u) => ({
      key: u.id,
      label: u.name,
      data: u,
      children: build(u.id),
    }));
  if (!rootId) return build(null);
  const root = flat.find((u) => u.id === rootId);
  if (!root) return [];
  return [{ key: root.id, label: root.name, data: root, children: build(root.id) }];
}

const nodes = ref<UnitNode[]>([]);
const expandedKeys = ref<Record<string, boolean>>({});
const selectedKeys = ref<Record<string, boolean>>({});
const picked = ref<UsingUnit | null>(null);
/** 右侧列表跟着选中的单元走：只列它的**直接下级**；没选就是全量 */
const onlyChildrenOf = ref("");

/** 默认展开两层（公司 + 厂），第三层留给演示时手点 */
function openLevels(list: UnitNode[], depth = 0, out: Record<string, boolean> = {}) {
  for (const n of list) {
    if (depth < 2 && n.children.length) out[n.key] = true;
    openLevels(n.children, depth + 1, out);
  }
  return out;
}

function allKeys(list: UnitNode[], out: Record<string, boolean> = {}) {
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

const listRef = ref<InstanceType<typeof ListPage> | null>(null);
/** 树端点回的是**排好序的平铺节点**，右表与面包屑都从它取（几十条，不分页捞） */
const flat = ref<UsingUnit[]>([]);

/** 介质名是 nameMaps 后到的（valueFormatter 只在渲染时跑），到位后重查一次，别让客户看一屏 BFG */
watch(ready, (on) => {
  if (on) listRef.value?.reload();
});

watch(selectedKeys, (sel) => {
  const keys = Object.keys(sel).filter((k) => sel[k]);
  if (!keys.length) return;
  const id = keys[keys.length - 1];
  const hit = flat.value.find((u) => u.id === id) ?? null;
  picked.value = hit;
  onlyChildrenOf.value = hit ? hit.id : "";
  void listRef.value?.reload();
});

async function loadTree(first = false) {
  try {
    flat.value = (await unitApi.tree()) ?? [];
  } catch {
    return; // 拦截层已 toast；树留着上一次的样子，比清成一片空白有用
  }
  nodes.value = toNodes(flat.value);
  if (!first) {
    /* 只把选中节点换成最新那一份（改名、上移/下沉之后 level 与 path 都变了），
       **不动 selectedKeys**：它按 id 存，重拉后还是同一棵树上的同一个键；改它会让 watch 再查一次列表，
       而 ListPage 刚查过——两次查询之间表格会闪。 */
    const id = picked.value?.id;
    if (id) picked.value = flat.value.find((u) => u.id === id) ?? picked.value;
    return;
  }
  expandedKeys.value = openLevels(nodes.value);
  /* 默认选中「炼钢厂」：进页面第一眼是一棵有数据、有定额、有报警的厂级节点，
     而不是一片空白——钢铁 EMS 讲演的中心就是转炉与煤气柜。 */
  const steel = flat.value.find((u) => u.name.includes("炼钢")) ?? flat.value[1] ?? flat.value[0];
  if (steel) selectedKeys.value = { [steel.id]: true };
}

onMounted(() => void loadTree(true));

/** 层级文案：查询下拉与详情共用一份，两页两处写法一致 */
const LEVEL_TEXT: Record<string, string> = { "1": "1 级", "2": "2 级", "3": "3 级", "4": "4 级" };
const LEVEL_VALUE_MAP = Object.fromEntries(Object.entries(LEVEL_TEXT).map(([code, text]) => [text, code]));

/**
 * 介质候选。行里存的是编码（`mediaCodes: ["BFG"]`），下拉与筛选都要给人读中文名，
 * 所以 options 是名字、`valueMap` 是「名字 → 编码」的反查表（ListPage 送参时翻、FormDialog 回填时再翻回来）。
 */
const mediaNames = computed(() => Object.values(mediumMap.value));
const mediaValueMap = computed(() => Object.fromEntries(Object.entries(mediumMap.value).map(([c, n]) => [n, c])));

const spec = computed<ListPageSpec>(() => ({
  code: "EG0002",
  query: [
    { key: "keyword", label: "单元", kind: "input", placeholder: "名称 / 编号" },
    {
      key: "level",
      label: "层级",
      kind: "select",
      options: Object.values(LEVEL_TEXT),
      valueMap: LEVEL_VALUE_MAP,
      placeholder: "全部",
    },
    {
      key: "mediaCode",
      label: "介质",
      kind: "select",
      options: mediaNames.value,
      valueMap: mediaValueMap.value,
      placeholder: "全部",
    },
  ],
  columns: [
    { field: "id", headerName: "单元编号", width: 130 },
    { field: "name", headerName: "单元名称", minWidth: 160, flex: 1 },
    { field: "level", headerName: "层级", width: 84, valueFormatter: levelFmt },
    { field: "mediaCodes", headerName: "涉及介质", minWidth: 168, valueFormatter: mediaCodesFmt(mediumMap.value) },
    { field: "isCostCenter", headerName: "成本中心", width: 92, cellRenderer: boolRenderer() },
    { field: "order", headerName: "同级次序", width: 92, type: "numericColumn" },
    { field: "note", headerName: "备注", minWidth: 140, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    /** 新增下级：把选中节点当父级带进表单，树编辑最常见的下一步动作不该让人去翻译 id */
    { label: "新增下级", kind: "edit", shown: (r: any) => r.level < 4 },
    { label: "上移", kind: "run", run: (r: any) => unitApi.move({ id: r.id, dir: "up" }), okMsg: "次序已调整" },
    { label: "下移", kind: "run", run: (r: any) => unitApi.move({ id: r.id, dir: "down" }), okMsg: "次序已调整" },
    {
      label: "下沉",
      kind: "run",
      shown: (r: any) => r.level > 2,
      run: (r: any) => unitApi.move({ id: r.id, dir: "in" }),
      okMsg: "层级已调整",
    },
    {
      label: "上浮",
      kind: "run",
      shown: (r: any) => r.level > 2,
      run: (r: any) => unitApi.move({ id: r.id, dir: "out" }),
      okMsg: "层级已调整",
    },
  ],
  toolbar: { add: true },
  edit: {
    title: "用能单元",
    /**
     * 表单里**没有「层级」和「上级」两栏**，是刻意的：层级由挂在谁下面唯一决定（`saveUnit` 按父级 +1 推出），
     * 让人手填一个和位置不一致的数字，就等于制造一棵自己都不认的树；
     * 要改层级用行上的「下沉 / 上浮」——那条路径会连 `path` 一起重排，子孙的归集口径跟着走。
     */
    fields: [
      { key: "name", label: "单元名称", kind: "input", placeholder: "如 1#转炉" },
      {
        key: "mediaCodes",
        label: "涉及介质",
        kind: "multi",
        options: mediaNames.value,
        valueMap: mediaValueMap.value,
      },
      { key: "isCostCenter", label: "作为成本中心结算", kind: "bool" },
      { key: "note", label: "备注", kind: "textarea", full: true },
    ],
  },
  detail: {
    sections: [
      {
        title: "单元身份",
        fields: [
          { label: "单元编号", from: "id" },
          { label: "单元名称", from: "name" },
          { label: "层级", from: "level", map: LEVEL_TEXT },
          { label: "上级单元", from: "parentId", map: unitMap.value },
          { label: "归集路径", from: "path" },
        ],
      },
      {
        title: "归集与结算",
        fields: [
          { label: "涉及介质", from: "mediaCodes" },
          { label: "作为成本中心", from: "isCostCenter", map: { true: "是（EP0004 按此层出结算单）", false: "否" } },
          { label: "同级次序", from: "order" },
          { label: "备注", from: "note" },
        ],
      },
    ],
  },
  /** 选中节点后只看它的**直接下级**（数据几十条，前端按 parentId 收一次即可，不必为此分页捞全量） */
  fetch: (q) => unitApi.page(onlyChildrenOf.value ? { ...q, parentId: onlyChildrenOf.value } : q),
  writeFn: (d) => unitApi.save(withParent(d)),
  summary: ({ total, rows }) =>
    onlyChildrenOf.value
      ? `${picked.value?.name ?? ""} 名下 ${total} 个下级 · 本页 ${rows.length} 行`
      : `共 ${total} 个用能单元 · 层级即归集口径`,
}));

/** 新增 = 挂在**当前选中节点**下；这样不会出现「父级选到自己子孙下面」这种要把整棵树重算一遍的环 */
function withParent(d: Record<string, any>) {
  if (d.id || !picked.value) return d;
  return { ...d, parentId: picked.value.id };
}
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <!-- 左：四级用能单元树 -->
    <aside class="flex w-80 shrink-0 flex-col border-r border-border/60">
      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <span class="text-xs text-muted-foreground">用能单元</span>
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
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ slotProps.node.data.level }} 级</span>
            </span>
          </template>
        </Tree>
        <div v-if="!nodes.length" class="px-3 py-6 text-xs text-muted-foreground">还没有用能单元。</div>
      </div>
      <div class="shrink-0 border-t border-border/60 px-2 py-1.5 text-xs text-muted-foreground">
        {{ picked ? `已选：${picked.name}（${picked.id}）` : "点节点，右侧只看它的直接下级" }}
      </div>
    </aside>

    <!-- 右：单元列表（同一份数据的两只眼睛）。@changed 让写操作后左树跟着重拉——
         `loadTree` 的形参只有「是否首次」，事件不带参即 false，走的是「只换选中节点、不动 selectedKeys」那条支路 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <ListPage ref="listRef" :spec="spec" @changed="loadTree" />
    </div>
  </div>
</template>
