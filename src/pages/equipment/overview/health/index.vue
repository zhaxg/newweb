<script setup lang="ts">
/** 对应 AO0002 设备健康看板（模块一 总览 · 附录 B5 版式 L3：厂区/产线两级热力网格）
 *  接口：overviewApi.health（GET /eam/overview/health）· equipmentApi.detail（下钻取单设备档案聚合）
 *  演示要点：**这是给厂长看的那一屏**——不是一张表，是"哪个车间、哪台设备正在往下掉"。
 *        产线一组一组排，每台设备一个色块，色块上只有名字和健康度分（分档颜色由后端 `buckets` 给，
 *        和 AM0004 的诊断、AE0001 台账里的健康度是同一套口径，不会出现"这页绿、那页黄"）。
 *        点色块下钻到**设备档案**（与结构树、H5 扫码共用 `equipmentApi.detail` 那一个聚合端点）：
 *        基本信息 + 活动报警 + 最近生命周期事件，讲完这一段再决定要不要去开台账页查修改。
 *        这块屏是**会变的**：主线剧本每扣一次健康度（报警转工单、PHM 判定、点检异常），
 *        色块颜色当场换一档——所以演示时要当着客户的面点一次「刷新」。
 *  已知偏差：真实看板有厂区 GIS 底图，这里用「产线分组 + 色块」代替，不画一张假地图。
 *  待接入：色块趋势迷你折线（后端每台设备只回当前分，不回近况序列）。 */
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { IconExternalLink, IconRotateClockwise } from "@tabler/icons-vue";
import { useRouter } from "vue-router";
import { equipmentApi, overviewApi } from "@/api/equipment";
import type { EquipmentDetail, HealthBoard } from "@/api/equipment/types";

const LEVEL_COLOR = (h: number) =>
  h >= 90
    ? "var(--color-green-500, #22c55e)"
    : h >= 80
      ? "var(--color-lime-500, #84cc16)"
      : h >= 70
        ? "var(--color-amber-500, #f59e0b)"
        : h >= 60
          ? "var(--color-orange-500, #f97316)"
          : "var(--color-red-500, #ef4444)";

const router = useRouter();
const board = ref<HealthBoard | null>(null);
const loading = ref(false);

const detailOpen = ref(false);
const detail = ref<EquipmentDetail | null>(null);
const detailBusy = ref(false);

async function load() {
  loading.value = true;
  try {
    board.value = await overviewApi.health();
  } catch {
    /* 拦截层已 toast */
  }
  loading.value = false;
}

onMounted(load);

async function openDevice(id: string) {
  detailBusy.value = true;
  detailOpen.value = true;
  try {
    detail.value = await equipmentApi.detail(id);
  } catch {
    detailOpen.value = false;
    return;
  }
  detailBusy.value = false;
}

const totals = computed(() => {
  const lines = board.value?.lines ?? [];
  const devices = lines.flatMap((l) => l.devices);
  const worst = devices.length ? devices.reduce((a, b) => (b.health < a.health ? b : a)) : null;
  return { lines: lines.length, devices: devices.length, worst };
});

/** 按厂区聚合（炼铁 / 炼钢 / 轧钢 …）：厂长问的是"哪个厂区最差"，不是哪条线 */
const grouped = computed(() => {
  const byArea = new Map<string, HealthBoard["lines"][number][]>();
  for (const l of board.value?.lines ?? []) {
    const list = byArea.get(l.area) ?? [];
    list.push(l);
    byArea.set(l.area, list);
  }
  return [...byArea.entries()];
});

const goArchive = () => router.push("/equipment/asset/device");
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="load">
        <IconRotateClockwise class="h-3 w-3" />刷新
      </Button>
      <!-- 图例直接吃后端的 buckets：颜色和台数与色块同源，不会出现两处口径不一致 -->
      <div class="flex min-w-0 items-center gap-3">
        <span v-for="b in board?.buckets" :key="b.label" class="flex min-w-0 items-center gap-1.5 text-xs">
          <span class="h-2.5 w-2.5 shrink-0 rounded-sm" :style="{ background: b.color }" />
          <span class="whitespace-nowrap">{{ b.label }}</span>
          <span class="text-muted-foreground">{{ b.count }} 台</span>
        </span>
      </div>
      <span class="ml-auto whitespace-nowrap text-xs text-muted-foreground">
        {{ totals.lines }} 条产线 · {{ totals.devices }} 台设备<template v-if="totals.worst">
          · 最低 <b class="font-medium">{{ totals.worst.name }}</b> {{ totals.worst.health }} 分</template
        >
      </span>
    </div>

    <div class="min-h-0 flex-1 overflow-auto p-3">
      <div v-if="!board" class="text-body text-muted-foreground">看板数据还没有取回来（点「刷新」重试）</div>

      <div v-for="[area, lines] in grouped" :key="area" class="mb-5 min-w-0">
        <div class="mb-2 text-sm font-medium">{{ area }}厂区</div>
        <div v-for="l in lines" :key="l.id" class="mb-3 min-w-0 rounded-md border border-border/60">
          <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-3">
            <span class="truncate text-body font-medium">{{ l.name }}</span>
            <span class="shrink-0 text-xs text-muted-foreground">{{ l.devices.length }} 台</span>
            <span class="ml-auto shrink-0 text-xs text-muted-foreground">
              平均健康度
              <b class="text-sm font-medium" :style="{ color: LEVEL_COLOR(l.avgHealth) }">{{ l.avgHealth }}</b>
            </span>
          </div>
          <div class="grid grid-cols-4 gap-1.5 p-2 sm:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
            <button
              v-for="d in l.devices"
              :key="d.id"
              type="button"
              class="min-w-0 rounded px-1.5 py-1.5 text-left text-white"
              :style="{ background: LEVEL_COLOR(d.health) }"
              :title="`${d.id} ${d.name}（${d.model}）· ${d.status} · ${d.health} 分`"
              @click="openDevice(d.id)"
            >
              <div class="truncate text-xs leading-tight">{{ d.name }}</div>
              <div class="text-xs leading-tight opacity-90">{{ d.health }}</div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 下钻：单设备档案（与结构树 / H5 扫码同一个聚合端点） -->
    <Dialog v-model:visible="detailOpen" modal header="设备档案" :style="{ width: 'min(46rem, calc(100vw - 2rem))' }">
      <div v-if="!detail" class="py-3 text-body text-muted-foreground">档案加载中…</div>
      <div v-else class="min-w-0 space-y-4 py-1">
        <div class="min-w-0 space-y-1.5">
          <div class="text-sm font-medium">{{ detail.eq.name }}（{{ detail.eq.model }}）</div>
          <div class="text-xs text-muted-foreground">
            {{ detail.eq.id }} · {{ detail.line?.name ?? "未归属产线" }} · {{ detail.eq.position || "—" }}
          </div>
          <div class="flex min-w-0 items-center gap-2">
            <span class="w-16 shrink-0 text-xs text-muted-foreground">健康度</span>
            <div class="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full"
                :style="{ width: `${detail.eq.health}%`, background: LEVEL_COLOR(detail.eq.health) }"
              />
            </div>
            <span class="shrink-0 text-body font-medium">{{ detail.eq.health }}</span>
          </div>
        </div>

        <div class="min-w-0">
          <div class="mb-1 text-sm font-medium">
            活动报警（{{ detail.alarms.filter((a) => a.status === "活动").length }}）
          </div>
          <ul class="max-h-40 space-y-1 overflow-auto">
            <li v-for="a in detail.alarms.slice(0, 8)" :key="a.id" class="flex min-w-0 items-center gap-2 text-body">
              <span class="shrink-0 text-xs text-muted-foreground">{{ a.occurredAt }}</span>
              <span class="truncate">{{ a.msg }}</span>
              <span
                class="ml-auto shrink-0 rounded px-1.5 py-0.5 text-xs"
                :class="
                  a.level === '紧急' || a.level === '报警'
                    ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                "
              >
                {{ a.level }}
              </span>
            </li>
            <li v-if="!detail.alarms.length" class="text-body text-muted-foreground">这台设备没有报警记录</li>
          </ul>
        </div>

        <div class="min-w-0">
          <div class="mb-1 text-sm font-medium">最近生命周期事件</div>
          <ul class="max-h-40 space-y-1 overflow-auto">
            <li v-for="(e, i) in detail.events.slice(-6).reverse()" :key="i" class="flex min-w-0 gap-2 text-body">
              <span class="shrink-0 text-xs text-muted-foreground">{{ e.at }}</span>
              <span class="shrink-0 text-xs">{{ e.type }}</span>
              <span class="min-w-0 flex-1 truncate">{{ e.note }}</span>
            </li>
            <li v-if="!detail.events.length" class="text-body text-muted-foreground">还没有生命周期事件</li>
          </ul>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <Button variant="outlined" label="关闭" @click="detailOpen = false" />
          <Button label="在设备台账中查看" autofocus @click="goArchive()">
            <IconExternalLink class="h-3 w-3" />
          </Button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
