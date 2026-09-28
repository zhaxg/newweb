<script setup lang="ts">
/** 对应 AW0002 故障报修（模块四 维修工单 · 附录 B5 版式 L1 的「表单 + 列表」双栏变体）
 *  接口：workOrderApi.create（POST /eam/workOrder/create，`source:"故障报修"`）
 *        workOrderApi.page（/listPage，本页固定只查报修来源）/ assign（/assign，派工）
 *        + equipmentApi.list（设备候选，见 ../../nameMaps.ts）/ orgApi.assignees（责任人候选）
 *  演示要点：**这一页是工单的第一个入口，也是一线岗位唯一需要学的屏**。
 *        操作工只填四样：哪台设备、什么问题、多急、派给谁（可以不派）。
 *        「不派」就是 `待派工`、「派了」直接进 `已派工`——状态由**有没有责任人**决定，
 *        这一步在 store 的 `createWorkOrder` 里，页面不自己判（见 ../../WoDialog.vue 的同一约定）。
 *        另一半价值是**它证明了转单不是唯一路径**：报警页转出来的单来源是「报警转单」，
 *        人工报的单来源是「故障报修」，两条入口进的却是同一张工单、同一条状态机。
 *  待接入：报修拍照（现场图片上传需接真实文件服务，演示不依赖）。 */
import { computed, onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import { IconSend } from "@tabler/icons-vue";
import { useToast } from "@/composables/useToast";
import { equipmentApi, orgApi, workOrderApi } from "@/api/equipment";
import ListPage from "../../ListPage.vue";
import { applyResult } from "../../rowActions";
import { dashFmt, numFmt, tagRenderer } from "../../cells";
import type { ListPageSpec } from "../../listTypes";

const PRIORITIES = ["紧急", "高", "中", "低"];
const STATUSES = ["待派工", "已派工", "执行中", "待验证", "已关闭"];

const { toast } = useToast();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/** 设备候选：报修要选得出「哪一台」，所以带型号 */
const equips = ref<Array<{ label: string; value: string }>>([]);
const assignees = ref<string[]>([]);

onMounted(async () => {
  try {
    const [eq, who] = await Promise.all([equipmentApi.list(), orgApi.assignees()]);
    equips.value = (eq ?? []).map((e) => ({ label: `${e.name}（${e.model}）`, value: e.id }));
    assignees.value = who ?? [];
  } catch {
    /* 拦截层已 toast */
  }
});

/* ── 报修表单 ─────────────────────────────────────────────────────────── */
const form = reactive<{
  eqId: string;
  priority: string;
  planHours: number | null;
  assignee: string;
  title: string;
  faultDesc: string;
}>({
  eqId: "",
  priority: "中",
  planHours: 4,
  assignee: "",
  title: "",
  faultDesc: "",
});
const busy = ref(false);

async function submit() {
  if (busy.value) return;
  if (!form.eqId) {
    toast("请先选择报修设备", 2000, "warn");
    return;
  }
  if (!form.faultDesc.trim()) {
    toast("请描述故障现象", 2000, "warn");
    return;
  }
  busy.value = true;
  let res: unknown;
  try {
    res = await workOrderApi.create({
      eqId: form.eqId,
      // 标题留空时按「设备名 + 故障报修」补，操作工少填一格；mock 里也有兜底
      title: form.title.trim() || `${eqLabel(form.eqId)} 故障报修`,
      faultDesc: form.faultDesc.trim(),
      priority: form.priority as "紧急" | "高" | "中" | "低",
      source: "故障报修",
      assignee: form.assignee || undefined,
      planHours: form.planHours ?? 4,
    });
  } catch {
    busy.value = false;
    return;
  }
  busy.value = false;
  if (!applyResult(res, "报修已提交", toast)) return;
  form.faultDesc = "";
  form.title = "";
  form.assignee = "";
  listRef.value?.reload();
}

function eqLabel(id: string): string {
  return equips.value.find((e) => e.value === id)?.label ?? id;
}

/** 候选是运行时拉的，所以 spec 写成 computed：责任人到货后「派工」表单里的下拉自然有选项 */
const spec = computed<ListPageSpec>(() => ({
  code: "AW0002",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "工单号 / 现象描述" },
    { key: "status", label: "状态", kind: "select", options: STATUSES, placeholder: "全部状态" },
  ],
  columns: [
    { field: "id", headerName: "工单号", width: 128 },
    { field: "title", headerName: "报修内容", minWidth: 180, flex: 1 },
    { field: "priority", headerName: "优先级", width: 88, sortable: false, cellRenderer: tagRenderer() },
    { field: "status", headerName: "状态", width: 96, sortable: false, cellRenderer: tagRenderer() },
    { field: "assignee", headerName: "责任人", width: 88, valueFormatter: dashFmt },
    { field: "planHours", headerName: "计划工时", width: 96, valueFormatter: numFmt() },
    { field: "createdAt", headerName: "报修时间", width: 158 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    {
      label: "派工",
      kind: "form",
      title: "派工",
      shown: (r) => r.status === "待派工",
      okMsg: "派工完成",
      fields: [{ key: "assignee", label: "责任人", kind: "select", options: assignees.value, full: true }],
      run: (r, f) => workOrderApi.assign(String(r.id), String(f.assignee ?? "")),
    },
  ],
  detail: {
    sections: [
      {
        title: "报修信息",
        fields: [
          { label: "工单号", from: "id" },
          { label: "报修内容", from: "title" },
          { label: "优先级", from: "priority" },
          { label: "当前状态", from: "status" },
          { label: "责任人", from: "assignee" },
          { label: "报修时间", from: "createdAt" },
        ],
      },
      { title: "故障现象", fields: [{ label: "现场描述", from: "faultDesc" }] },
    ],
  },
  fetch: (q) => workOrderApi.page({ ...q, source: "故障报修" }),
  summary: ({ total, rows }) => {
    const wait = rows.filter((r) => r.status === "待派工").length;
    return `共 ${total} 条报修 · 本页待派工 ${wait} · 派工时留空即为「待派工」，由调度在工单管理继续分派`;
  },
}));
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <!-- 左：报修登记（一线岗位只看这一块） -->
    <aside class="flex w-80 shrink-0 flex-col border-r border-border/60">
      <div class="flex h-9 shrink-0 items-center border-b border-border/60 px-3">
        <span class="text-xs text-muted-foreground">故障报修登记</span>
      </div>
      <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <div class="space-y-1">
          <label class="text-xs text-muted-foreground">报修设备</label>
          <Select
            v-model="form.eqId"
            :options="equips"
            option-label="label"
            option-value="value"
            placeholder="选择设备"
            fluid
          />
        </div>
        <div class="space-y-1">
          <label class="text-xs text-muted-foreground">故障现象</label>
          <Textarea v-model="form.faultDesc" rows="5" fluid placeholder="现象、发生时间、已做处置" />
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-3">
          <div class="space-y-1">
            <label class="text-xs text-muted-foreground">优先级</label>
            <Select v-model="form.priority" :options="PRIORITIES" fluid />
          </div>
          <div class="space-y-1">
            <label class="text-xs text-muted-foreground">预计工时</label>
            <InputNumber v-model="form.planHours" :show-buttons="false" fluid suffix=" h" />
          </div>
        </div>
        <div class="space-y-1">
          <label class="text-xs text-muted-foreground">直接派给（可留空）</label>
          <Select v-model="form.assignee" :options="assignees" show-clear placeholder="留空由调度派工" fluid />
        </div>
        <div class="space-y-1">
          <label class="text-xs text-muted-foreground">工单标题（可留空）</label>
          <InputText v-model="form.title" fluid placeholder="留空按设备名自动生成" />
        </div>
      </div>
      <div class="shrink-0 border-t border-border/60 p-3">
        <Button class="w-full" :loading="busy" @click="submit"> <IconSend class="h-3 w-3" />提交报修 </Button>
      </div>
    </aside>

    <!-- 右：本页报修工单（复用 L1 骨架，只查故障报修来源） -->
    <div class="flex min-w-0 flex-1 flex-col">
      <ListPage ref="listRef" :spec="spec" />
    </div>
  </div>
</template>
