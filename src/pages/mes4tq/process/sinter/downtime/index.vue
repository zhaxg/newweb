<script setup lang="ts">
/**
 * 对应 TW0405 烧结开停机记录（烧结工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`DowntimeBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：downtimeApi.page / downtimeApi.detail
 *
 * 演示要点：
 * 烧结机启停时间 / 原因 / 计划检修。
 * `TR0003` 的「作业率」从这张表取停机时长做分母，所以作废行的处理口径
 * 必须与统计页一致（都只算 `status=Y`）。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import DowntimeBoard from "../../DowntimeBoard.vue";
</script>

<template>
  <DowntimeBoard process="sinter" code="TW0405" />
</template>
