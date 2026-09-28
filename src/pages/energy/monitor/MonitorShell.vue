<script setup lang="ts">
/**
 * V2 监控页的共用外壳（EM0001~0004 四张画布页）：容器 + 顶栏 + 左画布右信息 + 3s 心跳。
 *
 * 版式来自规格书附录 B 的 V2：**左 70% 拓扑/曲线，右 30% 报警流与数字卡**。
 * 这四页的区别只在「画什么图元、右侧摆哪几张卡、顶部有哪几个剧本按钮」，
 * 骨架、深浅、刷新节奏、报警流一处都不该重复四遍——重复的那三份就是将来改不同步的那三份。
 *
 * ⚠️ **定时器在这里，不在 store**（AGENTS 点过 KeepAlive 缓存页后台轮询的问题）：
 * 组件卸载即清，缓存页停在后台不会继续替全站推进演示时钟。
 * 而且这里只负责「每隔 3 秒问页面一次要不要刷」，**推进时钟的动作仍是一个网络请求**
 * （页面在 `tick` 处理里调 `/ems/point/tick`）——本地起个 interval 就直接动 store 的话，
 * 页面看到的数与后端状态就会因为「哪个标签页在前台」而分叉。
 *
 * 在途保护交给页面（`busy`）：只有页面知道自己那批请求有没有回，
 * 外壳替它拦一拍只会让「按了没反应」变成查不出来的问题。
 *
 * **报警的「确认 / 转令」在外壳里接线**，页面只负责成功后重读自己的视图（`refresh`）。
 * 理由：这四页的报警流是同一个组件、同样的两个动作、同样的一句 toast，
 * 写到页面里就是四份会各自漂移的复制品；而它又必须在这一层（而不是 `AlarmStream`——
 * 那张纯展示的列表在大屏和首页也会用，不该有能力改状态机）。
 *
 * 深浅：跟随外壳主题（2026-09 起本域除大屏外全部如此）——面板走 `emsPanelClass`
 * 的 `bg-card`/`border-border`，token 挂在 `.dark` 上自动两档换肤，切主题即跟。
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import Button from "primevue/button";
import ToggleSwitch from "primevue/toggleswitch";
import AlarmStream from "../AlarmStream.vue";
import { alarmApi } from "@/api/energy";
import type { EnergyAlarm } from "@/api/energy/types";
import { useToast } from "@/composables/useToast";
import { emsPanelClass } from "../emsTheme";
import { applyResult } from "../rowActions";

const props = defineProps<{
  /** 页面代号，顶栏左侧（`EM0002`）；名称与它并排，代号是给实施人员看的 */
  code: string;
  name: string;
  /** 演示时钟，由视图 DTO 带回（**不读墙上时间**：全站一个钟，见 store 的 `nowStamp`） */
  stamp: string;
  alarms: EnergyAlarm[];
  /** 报警动作的在途态，只用来让「推进一拍」按钮转出彩 */
  busy?: boolean;
  /** 报警流面板标题；不传给足「活动报警」 */
  alarmTitle?: string;
}>();

const emit = defineEmits<{ refresh: []; tick: [] }>();

const { toast } = useToast();

const polling = defineModel<boolean>("polling", { default: true });

/** 心跳周期。写在这里而不是散在四个页面里——四页必须同拍，否则并排开两页就能看到数字不同步 */
const TICK_MS = 3000;

const actBusy = ref(false);
/** 确认/转令之后**不推进时钟**：处理一条报警不该让全厂柜位走一分钟，只把当前视图重读一遍 */
async function runAlarmAction(run: () => Promise<unknown>) {
  if (actBusy.value) return;
  actBusy.value = true;
  try {
    if (applyResult(await run(), "已处理", toast)) emit("refresh");
  } finally {
    actBusy.value = false;
  }
}
const ack = (id: string) => runAlarmAction(() => alarmApi.ack(id));
const toDispatch = (a: EnergyAlarm) => runAlarmAction(() => alarmApi.toDispatch(a.id));

let timer: number | null = null;
function reschedule() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  if (polling.value) timer = window.setInterval(() => emit("tick"), TICK_MS);
}

onMounted(reschedule);
watch(polling, reschedule);
onBeforeUnmount(() => {
  if (timer !== null) clearInterval(timer);
});
</script>

<template>
  <div :class="['flex min-h-0 flex-1 flex-col gap-2 p-2']">
    <header :class="[emsPanelClass, 'flex shrink-0 flex-wrap items-center gap-3 px-3 py-2']">
      <div class="flex min-w-0 items-baseline gap-2">
        <span class="text-xs tabular-nums text-muted-foreground">{{ props.code }}</span>
        <span class="truncate text-base font-semibold text-primary">{{ props.name }}</span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <slot name="tools" />
      </div>
      <div class="ml-auto flex items-center gap-2">
        <label class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ToggleSwitch v-model="polling" />
          实时刷新
        </label>
        <Button variant="outlined" :loading="props.busy" label="推进一拍" @click="emit('tick')" />
        <span class="text-xs tabular-nums text-muted-foreground">{{ props.stamp }}</span>
      </div>
    </header>

    <div class="flex min-h-0 flex-1 gap-2">
      <main class="flex min-w-0 flex-[7] flex-col gap-2">
        <slot />
      </main>
      <aside class="flex w-[30%] min-w-[19rem] shrink-0 flex-col gap-2">
        <slot name="tiles" />
        <AlarmStream :alarms="props.alarms" :title="props.alarmTitle" @ack="ack" @to-dispatch="toDispatch" />
      </aside>
    </div>
  </div>
</template>
