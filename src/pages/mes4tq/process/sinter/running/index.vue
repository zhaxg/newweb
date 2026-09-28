<script setup lang="ts">
/**
 * 对应 TW0404 烧结运行参数（烧结工序 · 附录 A3 版式 **L5 实时监控盘**）
 *
 * 底板：`RunningBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：processParamApi.defs / current / history
 *
 * 演示要点：
 * 烧结运行参数：机速 / 主抽负压 / 风箱温度 / 主抽电流 / 点火温度 / 返矿率。
 * 2 台烧结机可切换；负压是最灵敏的指标——堵料它先掉。
 * **B7 的「▶ 模拟烧结波动」落点就在主抽负压这一项**，演示时点它，整屏标红。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import RunningBoard from "../../RunningBoard.vue";
</script>

<template>
  <RunningBoard process="sinter" code="TW0404" title="烧结运行参数" />
</template>
