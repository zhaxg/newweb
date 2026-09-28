<script setup lang="ts">
/**
 * ECharts 薄包装：动态 import + 自适应尺寸 + 深浅主题跟随。
 *
 * 三条都是**必须**的，不是锦上添花：
 *
 * 1. **`import("echarts")` 放在挂载时而不是静态 import**（AGENTS §4 懒加载红线）。
 *    echarts 解压后 60MB、打进 bundle 是几百 KB 级，而它只有总览/监测/分析这几页在用。
 *    静态引入会让它进共享 chunk、跟着**每个**业务页一起下；类型用 `import type` 是无害的（编译期擦除）。
 * 2. **ResizeObserver**：本域页面大量用 `Splitter`/页签切换，容器尺寸在挂载之后还会变。
 *    echarts 只在 init 时量一次画布，不重算就会看到「拖动分栏后图表只画了一半」——
 *    这是演示现场最容易被客户抓到的破绽之一。
 *    但回调**必须带尺寸量级守卫**：`resize()` 自己会改 canvas 样式、进而可能再改容器尺寸，
 *    不成环守卫就会被浏览器判成 "ResizeObserver loop completed with undelivered notifications"
 *    并从 `window.onerror` 冒出来（看着像页面崩了）。见下面 `lastW/lastH`。
 * 3. **主题翻转时重建实例**：echarts 的 theme 只能在 `init` 时给，`setOption` 换不了底色/轴线颜色。
 *    外壳有深浅两档（见 `stores/settingsStore`），图表若固定浅色，深色下就是一块白斑。
 *
 * 页面只给 `option`，不碰实例；数据更新走 `setOption(notMerge)`——本域的图是**整段重算**
 * （健康度趋势、寿命排行、KPI 曲线都是重查一次换一批），留着旧 series 做增量反而会有脏点。
 */
import { onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import type { EChartsOption } from "echarts";

const props = defineProps<{
  option: EChartsOption;
  /** 容器高度：给 class 的页面（如卡片墙）可省略 */
  height?: string;
}>();

const el = shallowRef<HTMLElement | null>(null);
const inst = shallowRef<import("echarts").ECharts | null>(null);
let ro: ResizeObserver | null = null;
let mo: MutationObserver | null = null;
let disposed = false;
/** 上一次真正 resize 过的容器尺寸（整数），用于把 ResizeObserver 的回环掐在第二圈 */
let lastW = -1;
let lastH = -1;

const isDark = () => document.documentElement.classList.contains("dark");

async function boot() {
  const node = el.value;
  if (!node) return;
  const echarts = await import("echarts");
  // await 期间页面可能已经卸载（懒加载 chunk 首次要下载），此时不能再建实例
  if (disposed || !el.value) return;
  inst.value = echarts.init(node, isDark() ? "dark" : undefined, { renderer: "canvas" });
  inst.value.setOption(props.option, { notMerge: true });
  lastW = Math.round(node.clientWidth);
  lastH = Math.round(node.clientHeight);
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentRect;
      if (!box) return;
      const w = Math.round(box.width);
      const h = Math.round(box.height);
      // **只在尺寸真的变了才 resize**：`resize()` 会按容器重设 canvas 的样式宽高，
      // 在 flex 容器里这一下又可能把容器尺寸改动零点几像素，于是「观察 → resize → 又观察」成环，
      // 浏览器就在下一帧抛 "ResizeObserver loop completed with undelivered notifications"
      // （经 window error 冒到 globalError，看着像页面崩了）。量级守卫让第二圈直接原地退出。
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      inst.value?.resize();
    });
    ro.observe(node);
  }
  mo = new MutationObserver(() => {
    if (!inst.value) return;
    inst.value.dispose();
    inst.value = null;
    void boot();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}

/**
 * `option` 换引用即重画。**不做 deep watch**：本域的更新一律是「重查一次 → computed 产出整个新 option」，
 * 深比较要在每次 500ms 的实时刷新里逐点比对上千个数据点，白烧 CPU。
 * 页面若原地 mutate option 数组是不会触发的——这是有意的约定，改数据就换对象。
 */
watch(
  () => props.option,
  (opt) => inst.value?.setOption(opt, { notMerge: true }),
);

onMounted(boot);

onBeforeUnmount(() => {
  disposed = true;
  ro?.disconnect();
  mo?.disconnect();
  inst.value?.dispose();
  inst.value = null;
});
</script>

<template>
  <div ref="el" :style="height ? { height } : undefined" class="w-full min-h-0 flex-1" />
</template>
