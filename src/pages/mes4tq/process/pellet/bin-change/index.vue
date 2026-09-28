<script setup lang="ts">
/**
 * 对应 TW0301 竖炉料仓变料（球团工序 · 附录 A3 版式 **L2 左树右表**）
 *
 * 底板：`BinChangeBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：binChangeApi.page / binChangeApi.current
 *
 * 演示要点：
 * 竖炉料仓变料：精粉/膨润土/返矿三种料的仓间切换。
 * 膨润土是**粘结剂**，配比错了球团强度就垮，所以这页的 `nPercent` 是工艺上真要看的列。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import BinChangeBoard from "../../BinChangeBoard.vue";
</script>

<template>
  <BinChangeBoard process="pellet" code="TW0301" />
</template>
