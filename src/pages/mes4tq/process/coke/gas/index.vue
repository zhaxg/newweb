<script setup lang="ts">
/**
 * 对应 TW0206 煤气净化运行（焦化工序 · 附录 A3 版式 **L5 实时监控盘**）
 *
 * 底板：`RunningBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：processParamApi.defs / current / history
 *
 * 演示要点：
 * 煤气净化系统运行参数（温 / 压 / 流量）。
 * 出口温度、吸力、煤气流量、含苯量、洗涤泵电流五项；**含苯量是环保指标**，
 * 超了要报警——这是焦化唯一的环保口径，演示时客户会专门问。
 * 参数套 key 是 `coke-gas`（与 TW0204 的 `coke-oven` 是两套）。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import RunningBoard from "../../RunningBoard.vue";
</script>

<template>
  <RunningBoard process="coke" code="TW0206" title="煤气净化运行" paramKey="coke-gas" />
</template>
