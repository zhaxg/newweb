<script setup lang="ts">
/**
 * 对应 TW0305 球团开停机记录（球团工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`DowntimeBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：downtimeApi.page / downtimeApi.detail
 *
 * 演示要点：
 * 竖炉启停时间 / 原因 / 时长。
 * 统计卡按「计划 / 异常 / 作废」三拆——计划检修看计划、异常停机要追责、
 * 作废的记录留在表里但不进合计。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import DowntimeBoard from "../../DowntimeBoard.vue";
</script>

<template>
  <DowntimeBoard process="pellet" code="TW0305" />
</template>
