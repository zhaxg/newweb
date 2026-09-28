<script setup lang="ts">
/**
 * 设备档案 H5（扫码落地的整屏页，路由见 `src/router/business.ts` 的 `eam/eq`）。
 *
 * 为什么单独一个组件而不是复用壳层里的页面：这条路由是 `meta.public`——**手机扫码时没有会话**，
 * 走 MainLayout 会被守卫弹去登录页，演示现场就会出现「扫出来了但要登录」。整屏深色 + 单列卡片流
 * 是附录 B5 对移动端的三条要求（单列、大按钮、深色），在电脑上看也是同一份代码，不做两套。
 *
 * 数据只取 `equipmentApi.scan(code)` 一个端点：它回的是**档案聚合**（设备 + 产线 + 子件 + 工单 +
 * 报警 + 文档），手机端一次请求就能把页面填满，不做二次查询。
 */
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { equipmentApi } from "@/api/equipment";
import type { EquipmentDetail } from "@/api/equipment/types";

const route = useRoute();
const code = String(route.query.code ?? "");
const data = ref<EquipmentDetail | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    data.value = code ? await equipmentApi.scan(code) : null;
  } catch {
    data.value = null;
  } finally {
    loading.value = false;
  }
});

/** 健康度分档：与看板、列表同一套阈值口径（<60 红、<80 黄，其余绿） */
const healthTone = computed(() => {
  const h = data.value?.eq.health ?? 0;
  return h < 60 ? "bg-red-500" : h < 80 ? "bg-amber-500" : "bg-emerald-500";
});

const statusTone = computed(() => {
  const s = data.value?.eq.status;
  if (s === "故障停机" || s === "报废") return "text-red-400";
  if (s === "检修") return "text-amber-400";
  return "text-emerald-400";
});

/** 三件最近工单 + 活动报警条数：手机是给现场的人看的，只给要用到的那几行 */
const recentOrders = computed(() =>
  (data.value?.workOrders ?? []).toSorted((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5),
);
const activeAlarms = computed(() => (data.value?.alarms ?? []).filter((a) => a.status !== "已关闭"));

function day(v: string): string {
  return v ? v.slice(0, 10) : "—";
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100">
    <div class="mx-auto flex max-w-md flex-col gap-3 px-4 py-5">
      <!-- 顶栏：设备名是唯一的「我在哪台设备前」确认物，所以字号最大、带型号 -->
      <header class="space-y-1">
        <div class="text-xs text-zinc-500">设备档案 · 扫码直链</div>
        <div v-if="data" class="text-base font-semibold">{{ data.eq.name }}</div>
        <div v-if="data" class="text-xs text-zinc-400">{{ data.eq.model }} · {{ data.eq.id }}</div>
      </header>

      <div v-if="loading" class="py-10 text-center text-sm text-zinc-500">正在读取档案…</div>

      <div v-else-if="!data" class="rounded-xl border border-dashed border-zinc-800 p-6 text-center">
        <div class="text-sm font-medium">这台设备没有登记</div>
        <p class="mt-1 text-xs text-zinc-500">
          {{
            code ? `扫码内容「${code}」不在台账里。` : "链接里没带设备编码。"
          }}请在设备台账（AE0001）或扫码查询页（AE0005）重新生成二维码。
        </p>
      </div>

      <template v-else>
        <!-- 状态 + 健康度：现场一眼判断「这台能不能碰」 -->
        <section class="rounded-xl bg-zinc-900 p-4">
          <div class="flex items-center justify-between">
            <span class="text-xs text-zinc-500">运行状态</span>
            <span class="text-sm font-medium" :class="statusTone">{{ data.eq.status }}</span>
          </div>
          <div class="mt-3 flex items-center justify-between">
            <span class="text-xs text-zinc-500">健康度</span>
            <span class="text-sm tabular-nums">{{ data.eq.health }}</span>
          </div>
          <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div class="h-full rounded-full" :class="healthTone" :style="{ width: `${data.eq.health}%` }" />
          </div>
          <dl class="mt-3 space-y-1.5 border-t border-zinc-800 pt-3 text-xs">
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-zinc-500">产线 / 位置</dt>
              <dd class="min-w-0 text-right">{{ data.line?.name ?? "—" }} · {{ data.eq.position }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-zinc-500">分级 / 厂商</dt>
              <dd>{{ data.eq.level }} 类 · {{ data.eq.vendor }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-zinc-500">投运 / 累计运行</dt>
              <dd class="tabular-nums">
                {{ day(data.eq.commissionedAt) }} · {{ data.eq.runHours.toLocaleString("zh-CN") }} h
              </dd>
            </div>
          </dl>
        </section>

        <!-- 结构树：子件是「这台下面还有什么」，手机端只展开一层就够现场用 -->
        <section v-if="data.children.length" class="rounded-xl bg-zinc-900 p-4">
          <div class="text-xs text-zinc-500">下级部件</div>
          <ul class="mt-2 space-y-2">
            <li v-for="c in data.children" :key="c.id" class="flex items-center gap-2">
              <span
                class="h-1.5 w-1.5 shrink-0 rounded-full"
                :class="c.health < 60 ? 'bg-red-500' : c.health < 80 ? 'bg-amber-500' : 'bg-emerald-500'"
              />
              <span class="min-w-0 flex-1 truncate text-sm">{{ c.name }}</span>
              <span class="shrink-0 text-xs text-zinc-500">{{ c.health }}</span>
            </li>
          </ul>
        </section>

        <!-- 活动报警：有就必须出现在工单前面，这是扫码最常见的动机 -->
        <section v-if="activeAlarms.length" class="rounded-xl bg-zinc-900 p-4">
          <div class="text-xs text-zinc-500">活动报警 {{ activeAlarms.length }} 条</div>
          <ul class="mt-2 space-y-2">
            <li v-for="a in activeAlarms.slice(0, 4)" :key="a.id" class="text-xs">
              <div class="flex items-baseline justify-between gap-2">
                <span class="min-w-0 flex-1 truncate text-red-400">{{ a.msg }}</span>
                <span class="shrink-0 text-zinc-500">{{ a.level }}</span>
              </div>
              <div class="mt-0.5 text-zinc-500">{{ a.pointId }} · 实测 {{ a.value }} · {{ a.occurredAt }}</div>
            </li>
          </ul>
        </section>

        <section class="rounded-xl bg-zinc-900 p-4">
          <div class="text-xs text-zinc-500">历史工单</div>
          <ul v-if="recentOrders.length" class="mt-2 space-y-2.5">
            <li v-for="w in recentOrders" :key="w.id" class="text-xs">
              <div class="flex items-baseline justify-between gap-2">
                <span class="min-w-0 flex-1 truncate">{{ w.title }}</span>
                <span class="shrink-0 text-zinc-500">{{ w.status }}</span>
              </div>
              <div class="mt-0.5 text-zinc-500">{{ w.id }} · {{ day(w.createdAt) }} · {{ w.assignee || "未派工" }}</div>
            </li>
          </ul>
          <div v-else class="mt-2 text-xs text-zinc-500">这台设备还没有维修工单记录。</div>
        </section>

        <section v-if="data.docs.length" class="rounded-xl bg-zinc-900 p-4">
          <div class="text-xs text-zinc-500">随机图纸 / SOP</div>
          <ul class="mt-2 space-y-1.5">
            <li v-for="d in data.docs" :key="d.id" class="truncate text-xs">{{ d.name }}</li>
          </ul>
        </section>

        <p class="px-1 pb-2 text-center text-xs text-zinc-600">红河谷钢铁事业部 · 设备管理部 · 演示数据</p>
      </template>
    </div>
  </div>
</template>
