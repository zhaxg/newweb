<script setup lang="ts">
/**
 * 对应 TW0201 配煤仓变料管理（焦化工序 · 附录 A3 版式 **L2 左树右表**）
 *
 * 底板：`BinChangeBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：binChangeApi.page / binChangeApi.current
 *
 * 演示要点：
 * 10 个配煤仓的煤种变更/上料记录。配煤页的看点是**换煤种的频次与配比**：
 * 焦煤/肥煤/气煤/瘦煤/1/3焦煤 五个品种在十个仓上轮换，`nPercent` 那列就是当前配比。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import BinChangeBoard from "../../BinChangeBoard.vue";
</script>

<template>
  <BinChangeBoard process="coke" code="TW0201" />
</template>
