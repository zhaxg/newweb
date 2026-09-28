<script setup lang="ts">
/**
 * 对应 TW0402 烧结投料实绩（烧结工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`InputBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：inputApi.page / inputApi.detail
 *
 * 演示要点：
 * 烧结投料实绩：混匀料 / 熔剂 / 燃料的投入量 + 质量。
 * 三种料的配比就是 TB0002 烧结配料计划的执行侧——计划在那边、实绩在这边，
 * 偏差率是 B4 定的口径（±2% 内算稳、±5% 外要追）。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import InputBoard from "../../InputBoard.vue";
</script>

<template>
  <InputBoard process="sinter" code="TW0402" />
</template>
