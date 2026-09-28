<script setup lang="ts">
/** 对应 AE0002 设备结构树（模块二 设备台账 · 附录 B5 版式 L2 树 + 详情）
 *  接口：equipmentApi.tree（GET /eam/equipment/tree，一次给全支自关联）
 *        + equipmentApi.detail（GET /eam/equipment/detail，选中节点的档案聚合）
 *  演示要点：**「一目了然」靠的是层级，不是列表**——轧机 → 主传动电机 → 电机轴承 这条链
 *        是主线剧本要现场展开的那一支（F4 精轧机 health 70、它的电机 61、电机轴承 55，
 *        越往下越红），点开最下面一层就能讲清「PHM 盯的为什么是轴承而不是整台轧机」。
 *        树的节点上直接带健康度色点：父节点的分数是它自己的，**不是子件的平均**
 *        （真实系统里母机和轴承各有各的测点，凑一个平均分反而没法解释）。
 *  待接入：无（层级调整走 AE0001 的「上级设备」字段，不在树上拖拽——拖拽要后端有排序与冲突校验）。 */
import { computed, onMounted, ref, watch } from "vue";
import Tree from "primevue/tree";
import Button from "primevue/button";
import { equipmentApi } from "@/api/equipment";
import type { EquipmentDetail } from "@/api/equipment/types";
import { useNameMaps } from "../../nameMaps";

/** PrimeVue Tree 的节点形状：`key` 是展开/选中的唯一依据，业务字段收在 `data` 里 */
type EqNode = { key: string; label: string; data: Record<string, any>; children: EqNode[] };

const { lineName } = useNameMaps();
const nodes = ref<EqNode[]>([]);
const expandedKeys = ref<Record<string, boolean>>({});
const selectedKey = ref<Record<string, any>>({});
const detail = ref<EquipmentDetail | null>(null);
const busy = ref(false);

/** 树端点的字段名与 Tree 的约定不同（`id` 而非 `key`），逐层补一次 key/children */
function toNodes(raw: any[]): EqNode[] {
  return (raw ?? []).map((n) => ({ key: String(n.id), label: n.label, data: n, children: toNodes(n.children ?? []) }));
}

/** 默认展开两层：顶层机组全开、它们的直接子件也开，第三层（轴承）留给演示时手点 */
function firstTwoLevels(list: EqNode[], depth = 0, out: Record<string, boolean> = {}) {
  for (const n of list) {
    if (depth < 2 && n.children.length) out[n.key] = true;
    firstTwoLevels(n.children, depth + 1, out);
  }
  return out;
}

function allKeys(list: EqNode[], out: Record<string, boolean> = {}) {
  for (const n of list) {
    if (n.children.length) out[n.key] = true;
    allKeys(n.children, out);
  }
  return out;
}

let allExpanded = false;
function toggleAll() {
  allExpanded = !allExpanded;
  expandedKeys.value = allExpanded ? allKeys(nodes.value) : firstTwoLevels(nodes.value);
}

async function openNode(key: string) {
  busy.value = true;
  try {
    detail.value = await equipmentApi.detail(key);
  } catch {
    detail.value = null;
  }
  busy.value = false;
}

onMounted(async () => {
  try {
    const tree = toNodes((await equipmentApi.tree()) ?? []);
    nodes.value = tree;
    expandedKeys.value = firstTwoLevels(tree);
    // 默认选中主线设备（F4 精轧机）：进页面第一眼就是一支有故事的树，而不是一片空白。
    // 只写 selectedKey，详情交给下面那个 watch——两处各拉一次会打两次 detail。
    const f4 = findNode(tree, "EQ-BR-F4-01") ?? tree[0];
    if (f4) selectedKey.value = { [f4.key]: true };
  } catch {
    /* 拦截层已 toast */
  }
});

function findNode(list: EqNode[], key: string): EqNode | null {
  for (const n of list) {
    if (n.key === key) return n;
    const hit = findNode(n.children, key);
    if (hit) return hit;
  }
  return null;
}

/** selection-mode=single 下 Tree 给的是「{key:true}」这张映射表，取最后一个键即当前选中 */
watch(selectedKey, (sel) => {
  const keys = Object.keys(sel).filter((k) => sel[k]);
  if (keys.length) void openNode(keys[keys.length - 1]);
});

const eq = computed(() => detail.value?.eq ?? null);

/** 面包屑：从根到当前节点，回答「这台轴承挂在哪条线的那台机子上」 */
const path = computed(() => {
  const key = eq.value?.id;
  if (!key) return [] as string[];
  const trail: string[] = [];
  const walk = (list: EqNode[], acc: string[]): boolean => {
    for (const n of list) {
      const cur = [...acc, n.label];
      if (n.key === key) {
        trail.push(...cur);
        return true;
      }
      if (walk(n.children, cur)) return true;
    }
    return false;
  };
  walk(nodes.value, []);
  return trail;
});

/** 子件里最差的那一台：结构树页要回答的是「往哪一层看」 */
const childRows = computed(() => detail.value?.children ?? []);
const worstChild = computed(() =>
  childRows.value.length ? childRows.value.reduce((m, c) => (c.health < m.health ? c : m)) : null,
);
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <!-- 左：结构树 -->
    <aside class="flex w-80 shrink-0 flex-col border-r border-border/60">
      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <span class="text-xs text-muted-foreground">设备结构</span>
        <Button variant="text" class="ml-auto shrink-0 whitespace-nowrap" @click="toggleAll"> 展开 / 收起 </Button>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <Tree
          v-model:expanded-keys="expandedKeys"
          v-model:selection-keys="selectedKey"
          selection-mode="single"
          :value="nodes"
        >
          <template #default="slotProps">
            <span class="flex min-w-0 items-center gap-2">
              <span
                class="h-1.5 w-1.5 shrink-0 rounded-full"
                :class="
                  slotProps.node.data.health < 60
                    ? 'bg-red-500'
                    : slotProps.node.data.health < 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                "
              />
              <span class="truncate text-body">{{ slotProps.node.label }}</span>
              <span class="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{{
                slotProps.node.data.health
              }}</span>
            </span>
          </template>
        </Tree>
        <div v-if="!nodes.length" class="px-3 py-6 text-xs text-muted-foreground">台账里还没有设备。</div>
      </div>
    </aside>

    <!-- 右：节点详情 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-3">
        <span class="truncate text-xs text-muted-foreground">{{ path.join(" › ") || "选中左侧节点看详情" }}</span>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div v-if="busy && !eq" class="text-xs text-muted-foreground">读取中…</div>
        <div v-else-if="!eq" class="text-xs text-muted-foreground">点一台设备，右侧出它的档案与下级部件。</div>

        <template v-else>
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 class="text-base font-medium">{{ eq.name }}</h2>
            <span class="text-body text-muted-foreground">{{ eq.model }}</span>
            <span class="text-xs text-muted-foreground">{{ eq.id }}</span>
          </div>

          <dl class="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-xs text-muted-foreground">所属产线</dt>
              <dd class="min-w-0 text-right text-body">{{ lineName(eq.lineId) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-xs text-muted-foreground">安装位置</dt>
              <dd class="min-w-0 truncate text-body">{{ eq.position }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-xs text-muted-foreground">ABC 分级</dt>
              <dd class="text-body">{{ eq.level }} 类</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-xs text-muted-foreground">运行状态</dt>
              <dd class="text-body">{{ eq.status }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-xs text-muted-foreground">供应商</dt>
              <dd class="min-w-0 truncate text-body">{{ eq.vendor }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-xs text-muted-foreground">投运日期</dt>
              <dd class="text-body tabular-nums">{{ eq.commissionedAt }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-xs text-muted-foreground">累计运行</dt>
              <dd class="text-body tabular-nums">{{ eq.runHours.toLocaleString("zh-CN") }} h</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-xs text-muted-foreground">健康度</dt>
              <dd class="text-body tabular-nums">{{ eq.health }} / 100</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-xs text-muted-foreground">上级设备</dt>
              <dd class="min-w-0 truncate text-body">
                {{ detail?.parent ? `${detail.parent.name}（${detail.parent.model}）` : "顶层设备" }}
              </dd>
            </div>
          </dl>

          <!-- 这一层的三块内容：都是「关于这台设备现在怎么样」，不是又一张台账表 -->
          <div class="mt-5 grid gap-5 lg:grid-cols-3">
            <section class="min-w-0 space-y-2 lg:col-span-1">
              <div class="text-sm font-medium">下级部件 {{ childRows.length }} 件</div>
              <ul v-if="childRows.length" class="space-y-1.5">
                <li v-for="c in childRows" :key="c.id" class="flex items-center gap-2">
                  <span
                    class="h-1.5 w-1.5 shrink-0 rounded-full"
                    :class="c.health < 60 ? 'bg-red-500' : c.health < 80 ? 'bg-amber-500' : 'bg-emerald-500'"
                  />
                  <span class="min-w-0 flex-1 truncate text-body">{{ c.name }}</span>
                  <span class="shrink-0 text-xs tabular-nums text-muted-foreground">{{ c.health }}</span>
                </li>
              </ul>
              <p v-else class="text-xs text-muted-foreground">这台设备下面没有再挂部件，是结构树的叶子。</p>
              <p v-if="worstChild" class="text-xs text-muted-foreground">
                这一层最差的是 <b>{{ worstChild.name }}</b
                >（{{ worstChild.health }}）——PHM 的测点就绑在这种件上。
              </p>
            </section>

            <section class="min-w-0 space-y-2">
              <div class="text-sm font-medium">测点 {{ detail?.points.length ?? 0 }} 个</div>
              <ul v-if="detail?.points.length" class="space-y-1.5">
                <li v-for="p in detail.points" :key="p.id" class="flex items-baseline gap-2 text-body">
                  <span class="min-w-0 flex-1 truncate"
                    >{{ p.name }} <span class="text-xs text-muted-foreground">{{ p.id }}</span></span
                  >
                  <span class="shrink-0 text-xs tabular-nums text-muted-foreground">{{ p.value }} {{ p.unit }}</span>
                  <span class="shrink-0 text-xs text-muted-foreground">{{ p.metricCode }}</span>
                </li>
              </ul>
              <p v-else class="text-xs text-muted-foreground">还没绑测点，这台设备只有人工点检。</p>
              <div class="text-sm font-medium">随机资料 {{ detail?.docs.length ?? 0 }} 份</div>
              <ul v-if="detail?.docs.length" class="space-y-1">
                <li v-for="d in detail.docs" :key="d.id" class="truncate text-xs text-muted-foreground">
                  {{ d.name }}
                </li>
              </ul>
            </section>

            <section class="min-w-0 space-y-2">
              <div class="text-sm font-medium">工单 {{ detail?.workOrders.length ?? 0 }} 张</div>
              <ul v-if="detail?.workOrders.length" class="space-y-1.5">
                <li v-for="w in detail.workOrders.slice(0, 5)" :key="w.id" class="text-xs">
                  <div class="flex items-baseline gap-2">
                    <span class="min-w-0 flex-1 truncate text-body">{{ w.title }}</span>
                    <span class="shrink-0 text-muted-foreground">{{ w.status }}</span>
                  </div>
                  <div class="text-muted-foreground">{{ w.id }} · {{ w.createdAt.slice(0, 10) }}</div>
                </li>
              </ul>
              <p v-else class="text-xs text-muted-foreground">这台设备还没有工单记录。</p>
              <div class="text-sm font-medium">报警 {{ detail?.alarms.length ?? 0 }} 条</div>
              <ul v-if="detail?.alarms.length" class="space-y-1">
                <li v-for="a in detail.alarms.slice(0, 3)" :key="a.id" class="truncate text-xs text-muted-foreground">
                  {{ a.level }} · {{ a.msg }}
                </li>
              </ul>
            </section>
          </div>

          <p class="mt-5 text-xs text-muted-foreground">
            层级要调整（比如把轴承改挂到别的电机下）就去设备主数据改「上级设备」，本页只读—— 树和台账共用同一份
            `parentId`，两处都能改迟早对不上。
          </p>
        </template>
      </div>
    </div>
  </div>
</template>
