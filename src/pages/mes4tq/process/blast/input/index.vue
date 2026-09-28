<script setup lang="ts">
/**
 * 对应 TW0602 高炉投料实绩（高炉工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`InputBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：inputApi.page / inputApi.detail / inputApi.byBatch
 *
 * 演示要点：
 * 高炉投料实绩：料批管理 / 矿批重 / 焦批重 / 喷煤量。
 * 高炉以**料批**为基本单元（B11 第 5 条），所以「按料批汇总」比逐行明细更常用；
 * `glBatch` 列是第几批，`dataType`/`dataStatus` 回答「哪来的、算不算」。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import InputBoard from "../../InputBoard.vue";
</script>

<template>
  <InputBoard process="blast" code="TW0602" />
</template>
