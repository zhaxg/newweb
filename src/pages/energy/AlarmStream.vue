<script setup lang="ts">
/**
 * 报警流：监控页右栏那一列活动报警（EM0001~0004 共用，EM0005 的看板也复用它画每一桶的头几条）。
 *
 * 三条讲究：
 * 1. **级别措辞不在这里发明**。`1..5` 翻成「事故/重大/一般/提示/告知」走 `cells.ALARM_LEVEL_NAME`，
 *    与 AG Grid 的 `valueFormatter` 用的是同一张表；颜色走 `cells.tagClass(词)`。
 *    加一个级别而没配颜色，两张表在同一个文件里，一眼就能看见。
 * 2. **红闪只给未确认的最高级那几条**（活动 + 级别 ≤2）。整列都闪等于没有重点，
 *    而且值班室的屏一直闪会被投诉——真出事故时看不出哪条是新来的。
 * 3. **动作只有「确认」和「转调度令」**，都在页面里落到 `alarmApi`。
 *    这里不 import 接口层：一张纯展示的列表组件不该有能力改状态机，
 *    否则它在别处（大屏、首页）被复用时，那些页也会出现本不该有的按钮。
 */
import type { EnergyAlarm } from "@/api/energy/types";
import { ALARM_LEVEL_NAME, tagClass } from "./cells";
import { emsHeaderTextClass, emsPanelClass } from "./emsTheme";

const props = defineProps<{
  alarms: EnergyAlarm[];
  /** 面板标题；监控四页都是「活动报警」，EM0005 的分桶卡传级别名 */
  title?: string;
}>();

const emit = defineEmits<{ ack: [id: string]; toDispatch: [alarm: EnergyAlarm] }>();

/** 活动 + 重大及以上：这几条才闪 */
const flash = (a: EnergyAlarm) => a.status === "活动" && a.level <= 2;

/** 只取时间里的 `HH:mm`——同一屏里日期是同一个（演示时钟），留着它每行都浪费八个字符 */
const hhmm = (t: string) => t.slice(11, 16);

const levelName = (lv: number) => ALARM_LEVEL_NAME[String(lv)] ?? String(lv);
</script>

<template>
  <section :class="[emsPanelClass, 'flex min-h-0 flex-1 flex-col']">
    <div class="flex shrink-0 items-center gap-2 border-b border-white/10 px-2.5 py-1.5">
      <span :class="emsHeaderTextClass">{{ props.title ?? "活动报警" }}</span>
      <span class="ml-auto text-xs tabular-nums text-muted-foreground">{{ props.alarms.length }}</span>
    </div>
    <ul class="min-h-0 flex-1 overflow-y-auto">
      <li
        v-for="a in props.alarms"
        :key="a.id"
        class="flex items-start gap-2 border-b border-white/5 px-2.5 py-1.5"
        :class="flash(a) ? 'animate-pulse bg-[#EF4444]/10' : ''"
      >
        <span :class="tagClass(levelName(a.level))">{{ levelName(a.level) }}</span>
        <div class="min-w-0 flex-1">
          <div class="truncate text-body text-foreground" :title="a.message">{{ a.message }}</div>
          <div class="truncate text-xs text-muted-foreground">
            {{ hhmm(a.time) }} · {{ a.type }} · {{ a.status }}<template v-if="a.ackBy"> · {{ a.ackBy }}</template>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button
            v-if="a.status === '活动'"
            class="rounded border border-white/15 px-1.5 py-0.5 text-xs text-foreground hover:bg-white/10"
            type="button"
            @click="emit('ack', a.id)"
          >
            确认
          </button>
          <button
            v-if="a.status === '活动' || a.status === '已确认'"
            class="rounded border border-[#38BDF8]/50 px-1.5 py-0.5 text-xs text-sky-400 hover:bg-[#38BDF8]/12"
            type="button"
            @click="emit('toDispatch', a)"
          >
            转令
          </button>
        </div>
      </li>
      <li v-if="!props.alarms.length" class="px-3 py-6 text-center text-xs text-muted-foreground">
        当前没有活动报警。
      </li>
    </ul>
  </section>
</template>
