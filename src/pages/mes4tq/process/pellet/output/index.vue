<script setup lang="ts">
/**
 * 对应 TW0303 球团收料实绩（球团工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`OutputBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：outputApi.page / outputApi.detail
 *
 * 演示要点：
 * 球团收料实绩：毛产量 / 质量 / 粒度 / 内返矿。
 * 球团矿是**连续生产**的（B11 第 4 条：以时间为相对点累积，班为单位），
 * 所以按班汇总比按天汇总更贴近现场。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import OutputBoard from "../../OutputBoard.vue";
</script>

<template>
  <OutputBoard process="pellet" code="TW0303" />
</template>
