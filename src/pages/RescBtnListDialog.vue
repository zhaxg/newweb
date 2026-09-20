<script setup lang="ts">
import { ref, watch } from "vue";
import { Plus, RefreshCw, Save, Sparkles, Trash2 } from "@lucide/vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import { useToast } from "@/composables/useToast";
import { loadRescs, newRescId, saveRescs, type HmxRes } from "@/data/rescs";

const props = defineProps<{
  open: boolean;
  /** 目标节点，其 Widget 子资源在本对话框内维护 */
  node: HmxRes | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const { toast } = useToast();

/** 本地编辑副本，未保存关闭不生效 */
const items = ref<HmxRes[]>([]);
const selIdx = ref<number | null>(null);

function now(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function reload() {
  const node = props.node;
  if (!node) {
    items.value = [];
    selIdx.value = null;
    return;
  }
  items.value = loadRescs()
    .filter((r) => r.cPid === node.id && r.cRescType === "Widget")
    .map((r) => ({ ...r }));
  selIdx.value = null;
}

watch(
  () => props.open,
  (open) => {
    if (open) reload();
  },
);

function makeRow(partial: Pick<HmxRes, "cCode" | "cTitle" | "cResSubPath" | "cOrder">): HmxRes {
  return {
    id: newRescId(),
    cPid: props.node?.id ?? "0",
    cCode: partial.cCode,
    cTitle: partial.cTitle,
    cOrder: partial.cOrder,
    cResPath: "",
    cResSubPath: partial.cResSubPath,
    cQueryString: "",
    cEnable: "1",
    cRescType: "Widget",
    icon: "",
    creator: "admin",
    createTime: now(),
    lastModifier: "",
    lastModifyTime: "",
  };
}

function onAdd() {
  items.value.push(makeRow({ cCode: "", cTitle: "", cResSubPath: "", cOrder: String(items.value.length + 1) }));
  selIdx.value = items.value.length - 1;
}

/** 对应原「自动添加」：按 编码+01..05 补齐 查询/添加/编辑/删除/保存 五个功能点 */
function onAutoAdd() {
  const node = props.node;
  if (!node) return;
  const defs: Array<[string, string]> = [
    ["查询", "btn:query"],
    ["添加", "btn:add"],
    ["编辑", "btn:edit"],
    ["删除", "btn:delete"],
    ["保存", "btn:save"],
  ];
  defs.forEach(([title, subPath], i) => {
    const code = node.cCode + String(i + 1).padStart(2, "0");
    if (items.value.some((r) => r.cCode === code)) return;
    items.value.push(makeRow({ cCode: code, cTitle: title, cResSubPath: subPath, cOrder: String(items.value.length + 1) }));
  });
}

function onDelete() {
  if (selIdx.value === null) {
    toast("请先选择一条功能点");
    return;
  }
  items.value.splice(selIdx.value, 1);
  selIdx.value = null;
}

function onSave() {
  const node = props.node;
  if (!node) return;
  const full = loadRescs();
  const rest = full.filter((r) => !(r.cPid === node.id && r.cRescType === "Widget"));
  saveRescs([...rest, ...items.value.map((r) => ({ ...r }))]);
  toast(`操作成功：共[ ${items.value.length} ]条数据！`);
}
</script>

<template>
  <Dialog :visible="open" modal :header="`RBAC资源管理（按钮）— ${node?.cTitle ?? ''}`"
    :style="{ width: 'min(56rem, calc(100vw - 2rem))' }" @update:visible="emit('update:open', $event)">
    <!-- 对话框内工具栏 -->
    <div class="mb-2 flex items-center gap-1">
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="reload" label="查询">
        <template #icon>
          <RefreshCw class="h-3.5 w-3.5" />
        </template>
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onAdd" label="添加">
        <template #icon>
          <Plus class="h-3.5 w-3.5" />
        </template>
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onAutoAdd" label="自动添加">
        <template #icon>
          <Sparkles class="h-3.5 w-3.5" />
        </template>
      </Button>
      <Button text size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete" label="删除">
        <template #icon>
          <Trash2 class="h-3.5 w-3.5" />
        </template>
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onSave" label="保存">
        <template #icon>
          <Save class="h-3.5 w-3.5" />
        </template>
      </Button>
    </div>

    <!-- 行内编辑表格（保留 v-for 列表） -->
    <div class="min-h-0 overflow-auto rounded-md border border-border/60">
      <div class="sticky top-0 z-10 flex border-b border-border bg-[rgb(239,239,239)] dark:bg-[rgb(32,32,34)]"
        style="height: 28px">
        <div class="flex shrink-0 items-center border-r border-border px-2 text-xs font-medium" style="width: 48px">行号
        </div>
        <div class="flex shrink-0 items-center border-r border-border px-2 text-xs font-medium" style="width: 120px">编码
        </div>
        <div class="flex min-w-36 flex-1 items-center border-r border-border px-2 text-xs font-medium">名称</div>
        <div class="flex shrink-0 items-center border-r border-border px-2 text-xs font-medium" style="width: 140px">动作
        </div>
        <div class="flex shrink-0 items-center px-2 text-xs font-medium" style="width: 70px">排序</div>
      </div>
      <div v-for="(item, i) in items" :key="item.id"
        class="flex items-center border-b border-border/40 last:border-b-0 hover:bg-sidebar-accent/60"
        :class="i === selIdx && 'bg-[var(--data-grid-cell-selected-single-bg,rgb(191,219,254))] dark:bg-[var(--data-grid-cell-selected-single-bg,rgb(30,64,96))]'"
        style="height: 30px" @click="selIdx = i">
        <div class="flex shrink-0 items-center justify-center border-r border-border/60 text-[11px] text-muted-foreground"
          style="width: 48px">{{ i + 1 }}</div>
        <div class="flex shrink-0 items-center border-r border-border/60 px-1" style="width: 120px">
          <InputText v-model="item.cCode" placeholder="PP1201" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0 !px-1.5" />
        </div>
        <div class="flex min-w-36 flex-1 items-center border-r border-border/60 px-1">
          <InputText v-model="item.cTitle" placeholder="功能点名称" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0 !px-1.5" />
        </div>
        <div class="flex shrink-0 items-center border-r border-border/60 px-1" style="width: 140px">
          <InputText v-model="item.cResSubPath" placeholder="btn:xxx" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0 !px-1.5" />
        </div>
        <div class="flex shrink-0 items-center px-1" style="width: 70px">
          <InputText v-model="item.cOrder" type="number" min="0" class="w-full min-w-0 !px-1.5" />
        </div>
      </div>
      <div v-if="items.length === 0" class="px-4 py-8 text-center text-sm text-muted-foreground">暂无功能点，点击「添加」或「自动添加」</div>
    </div>

    <template #footer>
      <Button label="关闭" text @click="emit('update:open', false)" />
      <Button label="保存" raised @click="onSave" />
    </template>
  </Dialog>
</template>
