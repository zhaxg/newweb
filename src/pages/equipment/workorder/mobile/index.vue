<script setup lang="ts">
/** 对应 AW0004 工单执行·移动端（模块四 维修工单 · 附录 B4 第 5、7 幕 · 版式「移动端 H5」）
 *  接口：workOrderApi.page（POST /eam/workOrder/listPage）/ detail / accept（接单）/ issue（领料）
 *        / submit（完工提交，带工时与照片）/ verify（验证）
 *        + sparePartApi.list（备件候选）/ lifeRecordApi.page（按备件取可用寿命序列号）/ equipmentApi.list
 *  演示要点：**维修工全程只在手机上操作**——剧本第 5 幕「切 AW0004 接单、点领料」、
 *        第 7 幕「填工时 8h、传 3 张照片、完工提交」都在这里发生。四个动作对应状态机的四个格子：
 *        接单→执行中、填工时/拍照/领料→执行中的三件必填、完工提交→待验证、验证通过→已关闭。
 *        领料时**绑寿命序列号**是这一页独有的（PC 端只选备件），因为「新件上车、开始为这台设备累计小时」
 *        是现场动作，只有在移动端的语境里才讲得通——绑完去 AS0003 就能看到那条记录挂上了设备。
 *  已知偏差：附录写的是「路由白名单免登录的独立 H5」。这里不改平台路由层（那是全站边界），
 *        而是在页面内画一台**手机外框**：深色底、单列卡片流、大按钮、四步进度都在框内，
 *        演示效果一致，且不影响登录与菜单。真要独立免登录入口，需要另配 BlankLayout 路由。 */
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import { IconCameraPlus, IconCheck, IconHourglass, IconPackage, IconX } from "@tabler/icons-vue";
import { useToast } from "@/composables/useToast";
import { lifeRecordApi, sparePartApi, workOrderApi } from "@/api/equipment";
import type { LifeRecord, WorkOrder } from "@/api/equipment/types";
import { applyResult } from "../../rowActions";
import { useNameMaps } from "../../nameMaps";

const { toast } = useToast();
const { eqName } = useNameMaps();

const orders = ref<WorkOrder[]>([]);
const picked = ref<WorkOrder | null>(null);
const busy = ref(false);

const parts = ref<Array<{ label: string; value: string }>>([]);
const spId = ref("");
const qty = ref(1);
const serials = ref<string[]>([]);
const lifeSerial = ref("");
const hours = ref<number | null>(null);
/** 拍照在这个演示里没有真实文件服务，先攒一串本地文件名，完工时随 submit 一起送 */
const shots = ref<string[]>([]);

async function load(keepPicked = true) {
  const id = keepPicked ? picked.value?.id : undefined;
  const res = await workOrderApi.page({ currentPage: 1, pageSize: 50 });
  orders.value = (res?.rows ?? []).filter((w) => w.status !== "已关闭");
  if (!id) {
    picked.value = null;
    return;
  }
  try {
    picked.value = (await workOrderApi.detail(id)) ?? null;
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(async () => {
  try {
    const [list] = await Promise.all([sparePartApi.list(), load(false)]);
    parts.value = (list ?? []).map((p) => ({ label: `${p.id} ${p.name}`, value: p.id }));
  } catch {
    /* 拦截层已 toast */
  }
});

function openTicket(w: WorkOrder) {
  picked.value = w;
  hours.value = w.planHours;
  shots.value = [];
  spId.value = "";
  lifeSerial.value = "";
  qty.value = 1;
  serials.value = [];
}

async function pickPart() {
  lifeSerial.value = "";
  if (!spId.value) {
    serials.value = [];
    return;
  }
  try {
    const res = await lifeRecordApi.page({ spId: spId.value, currentPage: 1, pageSize: 30 });
    // 没在机器上、且没归档的才可能「新件上车」
    serials.value = (res?.rows ?? []).filter((r: LifeRecord) => !r.mountedEqId).map((r: LifeRecord) => r.serial);
  } catch {
    serials.value = [];
  }
}

/** 一次现场动作：调后端 → 重取本单（状态与 steps 都由 store 推进，页面不自己改） */
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
  await load();
}

function shoot() {
  const n = (picked.value?.photos.length ?? 0) + shots.value.length + 1;
  shots.value.push(`IMG-20260927-${String(n).padStart(3, "0")}.jpg`);
  toast(`已拍照 ${shots.value.length} 张`, 1600, "success");
}

/** 四步进度：完成与否全部从工单行现读，页面不另存一份「走到第几步」 */
const STEPS = [
  { key: "accept", label: "接单" },
  { key: "hours", label: "工时" },
  { key: "photo", label: "拍照" },
  { key: "material", label: "领料" },
] as const;

const stepDone = computed<Record<"accept" | "hours" | "photo" | "material", boolean>>(() => {
  const w = picked.value;
  return {
    accept: !!w && w.status !== "已派工" && w.status !== "待派工",
    hours: !!w && w.actualHours > 0,
    photo: !!w && w.photos.length > 0,
    material: !!w && w.materials.length > 0,
  };
});

const statusText = computed(() => picked.value?.status ?? "");
const isRunning = computed(() => statusText.value === "执行中");
const isWaiting = computed(() => statusText.value === "已派工");
const isVerifying = computed(() => statusText.value === "待验证");
const noWork = computed(() => statusText.value === "待派工");

/** 提交时把本地攒的照片并进去；工时没填就用计划工时（现场常是照着计划走的） */
function submit() {
  return workOrderApi.submit(picked.value!.id, {
    actualHours: hours.value ?? picked.value?.planHours,
    photos: shots.value.length ? [...shots.value] : undefined,
  });
}
</script>

<template>
  <div class="flex min-h-0 flex-1 items-center justify-center gap-6 overflow-y-auto bg-muted/30 p-6">
    <!-- 手机外框：深色 H5 屏（见文件头「已知偏差」） -->
    <div
      class="flex h-[720px] w-[380px] shrink-0 flex-col overflow-hidden rounded-[28px] border-[10px] border-zinc-800 bg-zinc-900 text-zinc-100 shadow-xl"
    >
      <div class="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-700/70 px-4">
        <span class="text-sm font-medium">设备维修 · 现场端</span>
        <span class="ml-auto text-xs text-zinc-400">{{ orders.length }} 张待办</span>
      </div>

      <!-- 工单列表（单列卡片流） -->
      <div v-if="!picked" class="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
        <button
          v-for="w in orders"
          :key="w.id"
          type="button"
          class="w-full rounded-xl border border-zinc-700/70 bg-zinc-800/70 p-3 text-left"
          @click="openTicket(w)"
        >
          <div class="flex min-w-0 items-center gap-2">
            <span class="truncate text-sm font-medium">{{ w.title }}</span>
            <span class="ml-auto shrink-0 text-xs text-zinc-400">{{ w.status }}</span>
          </div>
          <div class="mt-1 truncate text-xs text-zinc-400">{{ eqName(w.eqId) }}</div>
          <div class="mt-1.5 flex items-center gap-2 text-xs">
            <span :class="w.priority === '紧急' ? 'text-red-400' : 'text-zinc-400'">{{ w.priority }}</span>
            <span class="text-zinc-500">{{ w.source }}</span>
            <span class="ml-auto text-zinc-500">{{ w.id }}</span>
          </div>
        </button>
        <div v-if="!orders.length" class="px-2 py-10 text-center text-xs text-zinc-400">
          没有待办工单。到 PC 端报修或等报警转单，这里会实时出现。
        </div>
      </div>

      <!-- 单张工单的执行屏 -->
      <div v-else class="flex min-h-0 flex-1 flex-col">
        <div class="flex shrink-0 items-center gap-2 border-b border-zinc-700/70 px-3 py-2">
          <button type="button" class="text-xs text-zinc-300" @click="picked = null">‹ 待办</button>
          <span class="truncate text-sm font-medium">{{ picked.title }}</span>
          <span class="ml-auto shrink-0 text-xs text-zinc-400">{{ picked.status }}</span>
        </div>

        <!-- 四步进度 -->
        <div class="grid shrink-0 grid-cols-4 gap-1 border-b border-zinc-700/70 px-3 py-2.5 text-center">
          <div v-for="s in STEPS" :key="s.key" class="min-w-0">
            <div
              class="mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs"
              :class="stepDone[s.key] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'"
            >
              {{ stepDone[s.key] ? "✓" : "·" }}
            </div>
            <div class="mt-1 text-xs text-zinc-400">{{ s.label }}</div>
          </div>
        </div>

        <div class="min-h-0 flex-1 space-y-3.5 overflow-y-auto p-3">
          <div class="rounded-xl bg-zinc-800/70 p-3">
            <div class="text-xs text-zinc-400">{{ eqName(picked.eqId) }}</div>
            <p class="mt-1.5 text-body leading-relaxed">{{ picked.faultDesc || "—" }}</p>
          </div>

          <div v-if="noWork" class="rounded-xl bg-zinc-800/70 p-3 text-xs text-zinc-400">
            这张单还没派工，等调度在 PC 端派到人身上才会出现在你的待办里。
          </div>

          <div v-if="isWaiting" class="space-y-2.5">
            <div class="text-xs text-zinc-400">到达现场后接单，接单即开始计时。</div>
            <Button class="w-full" @click="act(() => workOrderApi.accept(picked!.id), '已接单，工单进入执行中')">
              <IconCheck class="h-4 w-4" />确认接单
            </Button>
          </div>

          <template v-if="isRunning">
            <div class="space-y-1.5 rounded-xl bg-zinc-800/70 p-3">
              <div class="text-xs text-zinc-400">实际工时</div>
              <div class="w-32">
                <InputNumber v-model="hours" :show-buttons="false" :min="0" fluid suffix=" h" />
              </div>
            </div>

            <div class="space-y-1.5 rounded-xl bg-zinc-800/70 p-3">
              <div class="flex min-w-0 items-center gap-2">
                <span class="text-xs text-zinc-400">现场照片</span>
                <span class="ml-auto text-xs text-zinc-500">{{ picked.photos.length + shots.length }} 张</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="(ph, i) in picked.photos"
                  :key="`s${i}`"
                  class="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-300"
                  >{{ ph }}</span
                >
                <span
                  v-for="(ph, i) in shots"
                  :key="`n${i}`"
                  class="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-400"
                  >{{ ph }}</span
                >
              </div>
              <Button severity="secondary" variant="outlined" class="w-full" @click="shoot">
                <IconCameraPlus class="h-4 w-4" />拍照
              </Button>
            </div>

            <div class="space-y-2 rounded-xl bg-zinc-800/70 p-3">
              <div class="text-xs text-zinc-400">领用备件</div>
              <Select
                v-model="spId"
                :options="parts"
                option-label="label"
                option-value="value"
                placeholder="选择备件"
                fluid
                class="w-full"
                @update:model-value="pickPart"
              />
              <div class="flex items-center gap-2">
                <div class="w-24 shrink-0">
                  <InputNumber v-model="qty" :show-buttons="false" :min="1" fluid />
                </div>
                <Select
                  v-model="lifeSerial"
                  :options="serials"
                  show-clear
                  placeholder="寿命序列号（考核件必填）"
                  class="min-w-0 flex-1"
                />
              </div>
              <Button
                severity="secondary"
                variant="outlined"
                class="w-full"
                :disabled="!spId"
                :loading="busy"
                @click="
                  act(() => workOrderApi.issue(picked!.id, spId, qty ?? 1, lifeSerial || undefined), '已领料并扣减库存')
                "
              >
                <IconPackage class="h-4 w-4" />领料
              </Button>
            </div>

            <Button class="w-full" :loading="busy" @click="act(submit, '已提交验证')">
              <IconHourglass class="h-4 w-4" />完工提交
            </Button>
          </template>

          <div v-if="isVerifying" class="space-y-2.5">
            <div class="rounded-xl bg-zinc-800/70 p-3 text-xs text-zinc-400">
              已提交，等主管验证。验证通过后设备履历、健康度与寿命台账会一起更新。
            </div>
            <Button
              class="w-full"
              :loading="busy"
              @click="act(() => workOrderApi.verify(picked!.id, true), '验证通过，工单已关闭')"
            >
              <IconCheck class="h-4 w-4" />验证通过
            </Button>
            <Button
              severity="secondary"
              variant="outlined"
              class="w-full"
              :loading="busy"
              @click="act(() => workOrderApi.verify(picked!.id, false), '已退回现场')"
            >
              <IconX class="h-4 w-4" />验证不通过
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧讲稿：演示时这块是给销售念的，不是给用户的说明文字 -->
    <div class="hidden w-72 shrink-0 space-y-2 text-xs text-muted-foreground xl:block">
      <div class="text-sm font-medium text-foreground">这一页在演示什么</div>
      <p>维修工只在手机上完成四步：接单 → 填工时 → 拍照 → 领料，提交后进入待验证。</p>
      <p>领料时绑定的寿命序列号会挂到这台设备并开始累计小时，去「寿命台账」可核对。</p>
      <p>验证通过与 PC 端是同一条状态机：关闭后设备履历 +1、健康度回升、关联报警自动关闭。</p>
    </div>
  </div>
</template>
