<script setup lang="ts">
/**
 * 对应 TW0604 高炉运行参数（高炉工序 · 附录 A3 版式 **L5 实时监控盘**）
 *
 * 底板：`RunningBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：processParamApi.defs / current / history
 *
 * 演示要点：
 * 高炉运行参数：热风温度 / 热风压力 / 透气性指数 / 料线 / 炉顶温度 / 炉顶压力 / 风量。
 * 3 座高炉可切换；**透气性指数是高炉的总阀门**——它掉了，其它都要跟着调。
 * **B7 的「▶ 模拟高炉波动」落点就在透气指数这一项**（3#高炉是主演，见 B9 种子）。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import RunningBoard from "../../RunningBoard.vue";
</script>

<template>
  <RunningBoard process="blast" code="TW0604" title="高炉运行参数" />
</template>
