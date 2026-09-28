<script setup lang="ts">
/**
 * 工单详情弹窗（版式 L5：左基本信息 + 工单内容 + 领料子表，右 `steps[]` 时间轴）。
 *
 * 为什么单独一个组件、不塞进 `DetailDialog`：通用详情弹窗是「label/value 两段式」，
 * 而工单的核心是**状态机 + 留痕**——`steps[]` 每次流转一条，客户要的是「这张单走到哪了、谁干的」，
 * 这既不是表格也不是键值对。而且动作按钮必须**按当前状态出现**（待派工才给派工、待验证才给验证），
 * 通用弹窗没有动作区。附录 B4 第 5、7 幕（派工给张伟 → 接单 → 完工 → 验证通过）全在这里点。
 *
 * 状态推进一律调后端，页面不改 `wo`：`closeWorkOrder` 是全系统最重的一次副作用
 * （设备履历 +1、健康度回升、寿命件换新开始累计、关联报警自动关闭），
 * 前端自己翻状态就等于把这条演示主线演丢了。成功后 `emit("changed")` 让宿主重查列表。
 */
import { computed, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import { IconCheck, IconX } from "@tabler/icons-vue";
import { orgApi, sparePartApi, workOrderApi } from "@/api/equipment";
import type { WorkOrder } from "@/api/equipment/types";
import { useToast } from "@/composables/useToast";
import { applyResult } from "./rowActions";
import { useNameMaps } from "./nameMaps";
import { TAG_CLASS } from "./cells";

const props = defineProps<{ open: boolean; wo: WorkOrder | null }>();
const emit = defineEmits<{ "update:open": [value: boolean]; changed: [] }>();

const { toast } = useToast();
const { partName, eqName } = useNameMaps();
const busy = ref(false);

/* ── 动作区入参（派工选人、领料选备件）───────────────────────────────── */
const assignees = ref<string[]>([]);
const person = ref("");
const parts = ref<Array<{ label: string; value: string }>>([]);
const spId = ref("");
const qty = ref(1);
const hours = ref<number | undefined>(undefined);

watch(
  () => props.wo?.id,
  (id) => {
    person.value = "";
    spId.value = "";
    qty.value = 1;
    hours.value = id ? props.wo?.planHours : undefined;
  },
);

watch(
  () => props.open,
  async (on) => {
    if (!on || assignees.value.length) return;
    try {
      const [who, list] = await Promise.all([orgApi.assignees(), sparePartApi.list()]);
      assignees.value = who ?? [];
      parts.value = (list ?? []).map((p) => ({ label: `${p.id} ${p.name}`, value: p.id }));
    } catch {
      /* 拦截层已 toast；拉不到就只是动作区没候选 */
    }
  },
);

/**
 * 一次状态推进：调后端 → 成功才让宿主重查。
 * 页面**不本地翻状态**——`closeWorkOrder` 带着一串副作用（履历、健康度、寿命件、报警），
 * 前端自己改完再刷新会看到两套数字，演示里这就是「系统不可信」的开始。
 */
async function act(run: () => Promise<unknown>, okMsg: string) {
  if (busy.value) return;
  busy.value = true;
  let res: unknown;
  try {
    res = await run();
  } catch {
    busy.value = false;
    return;
  }
  busy.value = false;
  if (!applyResult(res, okMsg, toast)) return;
  emit("changed");
}

const canAssign = computed(() => props.wo?.status === "待派工");
const canAccept = computed(() => props.wo?.status === "已派工");
const canWork = computed(() => props.wo?.status === "执行中");
const canVerify = computed(() => props.wo?.status === "待验证");

/** 时间轴圆点：直接吃 `TAG_CLASS` 的词表，色相与列表里的状态标一致（同一状态两处不同色最掉分） */
function dotOf(status: string): string {
  const cls = TAG_CLASS[status] ?? "";
  if (cls.includes("emerald")) return "bg-emerald-500";
  if (cls.includes("sky")) return "bg-sky-500";
  if (cls.includes("amber")) return "bg-amber-500";
  if (cls.includes("red")) return "bg-red-500";
  return "bg-muted-foreground/50";
}
</script>

<template>
  <Dialog
    :visible="open"
    modal
    :header="wo ? `${wo.id} · ${wo.title}` : '工单详情'"
    :style="{ width: 'min(78rem, calc(100vw - 3rem))' }"
    @update:visible="emit('update:open', $event)"
  >
    <div v-if="wo" class="grid min-h-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <!-- 左：单头 + 内容 + 领料 -->
      <div class="min-w-0 space-y-4">
        <dl class="grid grid-cols-2 gap-x-6 gap-y-2">
          <div class="flex min-w-0 items-baseline gap-2">
            <dt class="shrink-0 text-xs text-muted-foreground">设备</dt>
            <dd class="min-w-0 text-body">{{ eqName(wo.eqId) }}</dd>
          </div>
          <div class="flex min-w-0 items-baseline gap-2">
            <dt class="shrink-0 text-xs text-muted-foreground">状态</dt>
            <dd class="min-w-0 text-body font-medium">{{ wo.status }}</dd>
          </div>
          <div class="flex min-w-0 items-baseline gap-2">
            <dt class="shrink-0 text-xs text-muted-foreground">来源</dt>
            <dd class="min-w-0 text-body">{{ wo.source }}</dd>
          </div>
          <div class="flex min-w-0 items-baseline gap-2">
            <dt class="shrink-0 text-xs text-muted-foreground">优先级</dt>
            <dd class="min-w-0 text-body">{{ wo.priority }}</dd>
          </div>
          <div class="flex min-w-0 items-baseline gap-2">
            <dt class="shrink-0 text-xs text-muted-foreground">责任人</dt>
            <dd class="min-w-0 text-body">{{ wo.assignee || "—" }}</dd>
          </div>
          <div class="flex min-w-0 items-baseline gap-2">
            <dt class="shrink-0 text-xs text-muted-foreground">工时（计划 / 实际）</dt>
            <dd class="min-w-0 text-body">{{ wo.planHours }} h / {{ wo.actualHours || 0 }} h</dd>
          </div>
          <div class="flex min-w-0 items-baseline gap-2">
            <dt class="shrink-0 text-xs text-muted-foreground">下达时间</dt>
            <dd class="min-w-0 text-body">{{ wo.createdAt }}</dd>
          </div>
          <div class="flex min-w-0 items-baseline gap-2">
            <dt class="shrink-0 text-xs text-muted-foreground">关闭时间</dt>
            <dd class="min-w-0 text-body">{{ wo.closedAt || "—" }}</dd>
          </div>
        </dl>

        <div>
          <div class="text-xs text-muted-foreground">工单内容</div>
          <p class="mt-1 text-body leading-relaxed">{{ wo.faultDesc || "—" }}</p>
        </div>

        <div v-if="wo.photos.length">
          <div class="text-xs text-muted-foreground">现场照片</div>
          <div class="mt-1.5 flex flex-wrap gap-1.5">
            <span
              v-for="(ph, i) in wo.photos"
              :key="i"
              class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
              >{{ ph }}</span
            >
          </div>
        </div>

        <!-- 领料子表：工单与库存的连边就在这几张行上 -->
        <div>
          <div class="text-xs text-muted-foreground">领用备件</div>
          <table v-if="wo.materials.length" class="mt-1.5 w-full border-collapse text-body">
            <thead>
              <tr class="text-left text-xs text-muted-foreground">
                <th class="py-1 pr-3 font-normal">备件</th>
                <th class="py-1 pr-3 font-normal">数量</th>
                <th class="py-1 font-normal">寿命序列号</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(m, i) in wo.materials" :key="i" class="border-t border-border/50">
                <td class="py-1 pr-3">{{ partName(m.spId) }}</td>
                <td class="py-1 pr-3">{{ m.qty }}</td>
                <td class="py-1">{{ m.lifeSerial || "—" }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="mt-1 text-body text-muted-foreground">尚未领料</div>
        </div>
      </div>

      <!-- 右：时间轴（steps 随每次流转追加，永不覆盖） -->
      <div class="min-w-0">
        <div class="text-xs text-muted-foreground">流转留痕</div>
        <ol class="mt-2 space-y-3.5 border-l border-border/60 pl-4">
          <li v-for="(s, i) in wo.steps" :key="i" class="relative">
            <span
              class="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background"
              :class="dotOf(s.status)"
            />
            <div class="flex min-w-0 items-baseline gap-2">
              <span class="text-body font-medium">{{ s.status }}</span>
              <span class="text-xs text-muted-foreground">{{ s.at }}</span>
            </div>
            <div class="text-xs text-muted-foreground">{{ s.by }} · {{ s.note }}</div>
          </li>
        </ol>
      </div>
    </div>
    <div v-else class="py-6 text-center text-body text-muted-foreground">工单不存在或已被刷新</div>

    <template #footer>
      <div class="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <template v-if="canAssign">
          <Select v-model="person" :options="assignees" placeholder="选择责任人" show-clear class="w-40 shrink-0" />
          <Button
            label="派工"
            variant="outlined"
            :disabled="!person"
            :loading="busy"
            @click="act(() => workOrderApi.assign(wo!.id, person), '已派工')"
          />
        </template>
        <Button
          v-if="canAccept"
          label="接单"
          variant="outlined"
          :loading="busy"
          @click="act(() => workOrderApi.accept(wo!.id), '已接单，工单进入执行中')"
        />
        <template v-if="canWork">
          <Select
            v-model="spId"
            :options="parts"
            option-label="label"
            option-value="value"
            placeholder="领用备件"
            class="w-56 shrink-0"
          />
          <div class="w-20 shrink-0">
            <InputNumber v-model="qty" :show-buttons="false" :min="1" fluid aria-label="领用数量" />
          </div>
          <Button
            label="领料"
            variant="outlined"
            :disabled="!spId"
            :loading="busy"
            @click="act(() => workOrderApi.issue(wo!.id, spId, qty ?? 1), '已领料并扣减库存')"
          />
          <div class="w-24 shrink-0">
            <InputNumber v-model="hours" :show-buttons="false" fluid aria-label="实际工时" />
          </div>
          <Button
            label="完工提交"
            variant="outlined"
            :loading="busy"
            @click="act(() => workOrderApi.submit(wo!.id, { actualHours: hours }), '已提交验证')"
          />
        </template>
        <template v-if="canVerify">
          <Button
            severity="secondary"
            variant="outlined"
            :loading="busy"
            @click="act(() => workOrderApi.verify(wo!.id, false), '已退回现场继续处理')"
          >
            <IconX class="h-3 w-3" />验证不通过
          </Button>
          <Button
            variant="filled"
            :loading="busy"
            @click="act(() => workOrderApi.verify(wo!.id, true), '验证通过，工单已关闭并回写设备履历')"
          >
            <IconCheck class="h-3 w-3" />验证通过
          </Button>
        </template>
        <Button label="关闭" variant="outlined" autofocus @click="emit('update:open', false)" />
      </div>
    </template>
  </Dialog>
</template>
