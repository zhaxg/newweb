<script setup lang="ts">
import { ref } from "vue";

const props = withDefaults(
  defineProps<{
    /** 左栏初始宽度百分比 */
    initial?: number;
    /** 左栏最小宽度百分比 */
    min?: number;
    /** 左栏最大宽度百分比 */
    max?: number;
  }>(),
  { initial: 35, min: 15, max: 70 },
);

const rootEl = ref<HTMLElement | null>(null);
const ratio = ref(props.initial);
const dragging = ref(false);

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  dragging.value = true;
  const move = (e: PointerEvent) => {
    const rect = rootEl.value?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    ratio.value = Math.min(props.max, Math.max(props.min, pct));
  };
  const up = () => {
    dragging.value = false;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function reset() {
  ratio.value = props.initial;
}
</script>

<template>
  <div ref="rootEl" class="flex min-h-0 flex-1" :class="dragging && 'select-none'">
    <div class="flex min-h-0 min-w-0 shrink-0 flex-col" :style="{ width: `${ratio}%` }">
      <slot name="left" />
    </div>
    <div
      class="w-[5px] shrink-0 cursor-col-resize border-x border-border/60 bg-transparent hover:bg-primary/30"
      :class="dragging && 'bg-primary/40'"
      data-splitter
      @pointerdown="onPointerDown"
      @dblclick="reset"
    />
    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <slot name="right" />
    </div>
  </div>
</template>
