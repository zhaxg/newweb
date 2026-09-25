<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import FlowBg from "./FlowBg.vue";
import LoginCard from "./LoginCard.vue";
import hgA from "@/assets/login/HG-A.jpg";
import hgB from "@/assets/login/HG-B.jpg";
import hgC from "@/assets/login/HG-C.jpg";
import hgD from "@/assets/login/HG-D.jpg";
import hgE from "@/assets/login/HG-E.jpg";
import hgF from "@/assets/login/HG-F.jpg";

/* 淡色流光底 + 大卡片轮播图 + 右侧悬浮亚克力登录小卡（LoginCard） */

const backgrounds = [hgA, hgB, hgC, hgD, hgE, hgF];
// 末尾克隆首图实现无缝循环：滑到克隆图后无动画跳回 0
const slides = [...backgrounds, backgrounds[0]];
const bgIndex = ref(0);
const slideAnimate = ref(true);
let bgTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  bgTimer = setInterval(() => {
    if (bgIndex.value < backgrounds.length) bgIndex.value++;
  }, 8000);
});
onBeforeUnmount(() => clearInterval(bgTimer));

function onSlideEnd(e: TransitionEvent) {
  if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
  if (bgIndex.value === backgrounds.length) {
    slideAnimate.value = false;
    bgIndex.value = 0;
    /* 双层 rAF：transitionend 在本帧样式重算后才派发，单层 rAF 会在下一帧重算前
       就把动画恢复，"无动画跳回 0"从未真正过帧 → 反被当成 6→0 的 transform 过渡倒放 */
    requestAnimationFrame(() => requestAnimationFrame(() => (slideAnimate.value = true)));
  }
}
</script>

<template>
  <div class="fixed inset-0 overflow-hidden">
    <!-- 流光渐变底 + 漂移光斑（可复用层，见 FlowBg.vue） -->
    <FlowBg />

    <!-- 居中大卡片：轮播图背景 -->
    <div class="absolute inset-0 flex items-center justify-center p-4">
      <div
        class="relative h-[min(40rem,88vh)] w-[min(66rem,94vw)] overflow-hidden rounded-2xl border border-white/60 shadow-[0_24px_64px_rgba(15,40,80,0.25)] dark:border-white/10 max-md:h-full max-md:w-full max-md:rounded-none max-md:border-0 max-md:shadow-none"
      >
        <!-- 左右滑动轮播轨道（移动端隐藏，只留登录小卡） -->
        <div class="absolute inset-0 overflow-hidden max-md:hidden">
          <div
            class="flex h-full transition-transform duration-700 ease-out"
            :class="{ 'transition-none': !slideAnimate }"
            :style="{ width: `${slides.length * 100}%`, transform: `translateX(-${(bgIndex * 100) / slides.length}%)` }"
            @transitionend="onSlideEnd"
          >
            <img
              v-for="(src, i) in slides"
              :key="i"
              :src="src"
              alt=""
              draggable="false"
              class="h-full flex-1 basis-0 object-cover"
            />
          </div>
        </div>
        <div class="absolute inset-0 bg-white/5 dark:bg-black/40 max-md:hidden"></div>

        <LoginCard />
      </div>
    </div>
  </div>
</template>
