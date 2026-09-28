<script setup lang="ts">
/**
 * 对应 TW0504 白灰运行参数（石灰工序 · 附录 A3 版式 **L5 实时监控盘**）
 *
 * 底板：`RunningBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：processParamApi.defs / current / history
 *
 * 演示要点：
 * 白灰运行参数：竖窑温度 / 燃气流量 / CaO 含量 / 活性度。
 * 2 座竖窑可切换；CaO 含量与活性度是**结果指标**、温度流量是**过程指标**，
 * 两者同屏是为了回答「结果偏了，是哪个过程没控住」。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import RunningBoard from "../../RunningBoard.vue";
</script>

<template>
  <RunningBoard process="lime" code="TW0504" title="白灰运行参数" />
</template>
