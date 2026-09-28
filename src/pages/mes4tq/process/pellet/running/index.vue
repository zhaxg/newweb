<script setup lang="ts">
/**
 * 对应 TW0304 造球运行参数（球团工序 · 附录 A3 版式 **L5 实时监控盘**）
 *
 * 底板：`RunningBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：processParamApi.defs / current / history
 *
 * 演示要点：
 * 造球运行参数：造球机转速 / 筛分状态 / 烘干温度 / 竖炉焙烧温度 / 生球粒度。
 * 3 座竖炉可在表头切换；生球粒度是质量的前置指标，转速一变它跟着变。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import RunningBoard from "../../RunningBoard.vue";
</script>

<template>
  <RunningBoard process="pellet" code="TW0304" title="造球运行参数" />
</template>
