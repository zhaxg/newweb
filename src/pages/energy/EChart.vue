<script setup lang="ts">
/**
 * ECharts 薄包装：动态 import + 自适应尺寸 + 深浅主题跟随（+ 固定深色豁免）。
 *
 * 前三条都是**必须**的，不是锦上添花：
 *
 * 1. **`import("echarts")` 放在挂载时而不是静态 import**（AGENTS §4 懒加载红线）。
 *    echarts 解压后 60MB、打进 bundle 是几百 KB 级，而它只有总览/监测/分析这几页在用。
 *    静态引入会让它进共享 chunk、跟着**每个**业务页一起下；类型用 `import type` 是无害的（编译期擦除）。
 * 2. **ResizeObserver**：本域页面大量用 `Splitter`/页签切换，容器尺寸在挂载之后还会变。
 *    echarts 只在 init 时量一次画布，不重算就会看到「拖动分栏后图表只画了一半」——
 *    这是演示现场最容易被客户抓到的破绽之一。
 * 3. **主题翻转时重建实例**：echarts 的 theme 只能在 `init` 时给，`setOption` 换不了底色/轴线颜色。
 *    外壳有深浅两档（见 `stores/settingsStore`），图表若固定浅色，深色下就是一块白斑。
 *
 * **第四条是本域独有的 `forceDark` 分支**：目前**只有大屏 EO0001**（新页签整屏打开，
 * 调度中心常年不开灯，规格书附录 B）是固定深色，其余能源页 2026-09 起全部跟随外壳主题。
 * 大屏此时第 3 条纪律反过来成立——根元素的 `dark` class 量的是**外壳**主题而不是这块区域的
 * 真色：用户在浅色外壳里看深色大屏，靠根元素判断会 init 出浅色实例（深色底上一块浅灰画布），
 * 外壳一切浅色还会触发重建、把本来画对的深色图变成白斑。所以 `forceDark` 时：直接
 * `init(node, "dark")`、**不订阅主题翻转、不重建实例**。轴/网格线的数据侧配色由页面用
 * `emsChartAxis(true)` 对齐，两边各管一半（实例底色归这里，线条颜色归页面 option）。
 *
 * 页面只给 `option`，不碰实例；数据更新走 `setOption(notMerge)`——本域的图是**整段重算**
 * （柜位曲线、负荷预测、KPI 趋势都是重查一次换一批），留着旧 series 做增量反而会有脏点。
 */
import { onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import type { EChartsOption } from "echarts";

const props = defineProps<{
  option: EChartsOption;
  /** 容器高度：给 class 的页面（如卡片墙）可省略 */
  height?: string;
  /**
   * 固定深色：见文件头第四条。给 `true` 的页面（监控/大屏）主题态在挂载时就定死，
   * 挂载后改这个 prop 不生效——它是**页面属性**而不是运行态，没有页面会在会话中途改自己的深浅。
   */
  forceDark?: boolean;
}>();

const el = shallowRef<HTMLElement | null>(null);
const inst = shallowRef<import("echarts").ECharts | null>(null);
let ro: ResizeObserver | null = null;
let mo: MutationObserver | null = null;
let disposed = false;

/** 深浅判定：forceDark 优先，否则读外壳根元素 */
const wantDark = () => props.forceDark === true || document.documentElement.classList.contains("dark");

async function boot() {
  const node = el.value;
  if (!node) return;
  const echarts = await import("echarts");
  // await 期间页面可能已经卸载（懒加载 chunk 首次要下载），此时不能再建实例
  if (disposed || !el.value) return;
  inst.value = echarts.init(node, wantDark() ? "dark" : undefined, { renderer: "canvas" });
  inst.value.setOption(props.option, { notMerge: true });
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => inst.value?.resize());
    ro.observe(node);
  }
  // 固定深色区不订阅翻转：订阅了也只会把画对的深色实例拆掉重建成浅色（见文件头第四条）
  if (props.forceDark !== true) {
    mo = new MutationObserver(() => {
      if (!inst.value) return;
      inst.value.dispose();
      inst.value = null;
      void boot();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
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
