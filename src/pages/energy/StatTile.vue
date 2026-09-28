<script setup lang="ts">
/**
 * 一个数字卡：标题 + 读数 + 单位（+ 可选的副说明）。
 *
 * 为什么不直接用 PrimeVue 的 Card：监控页右栏是**一屏十二到十六个**这样的格子，
 * PrimeVue 卡有内距与投影，紧排的监控墙里投影看不见、内距又把行高撑开，
 * 结果是要滚两屏才看完柜位和放散——调度中心的屏是给人扫的，不是给人滚的。
 *
 * 颜色吃 `StatTone` 而不是页面自己判断：阈值在 `model.monitorStats()`，
 * 页面拿到什么色就画什么色（本域红线「只有 model 允许出现业务数字」的展示侧落地）。
 */
import type { StatTone } from "@/api/energy/types";
import { TONE_TEXT, emsPanelClass } from "./emsTheme";

const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    unit?: string;
    tone?: StatTone;
    /** 第二行的小字：「较昨日 +2.1%」这类，没有就不占行（卡片高度不齐比少一行说明更难看不成） */
    hint?: string;
    /** 强调档：大屏与 KPI 用的大号数字。普通监控页不给 */
    big?: boolean;
  }>(),
  { tone: "ok", unit: "", hint: "", big: false },
);
</script>

<template>
  <div :class="[emsPanelClass, 'px-2.5 py-2']">
    <div class="truncate text-xs text-muted-foreground">{{ props.label }}</div>
    <div :class="[props.big ? 'text-base' : 'text-sm', 'font-semibold tabular-nums', TONE_TEXT[props.tone]]">
      {{ props.value
      }}<span v-if="props.unit" class="ml-0.5 text-xs font-normal text-muted-foreground">{{ props.unit }}</span>
    </div>
    <div v-if="props.hint" class="truncate text-xs text-muted-foreground">{{ props.hint }}</div>
  </div>
</template>
