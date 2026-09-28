<script setup lang="ts">
/**
 * 对应 TW0401 烧结料仓变料（烧结工序 · 附录 A3 版式 **L2 左树右表**）
 *
 * 底板：`BinChangeBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：binChangeApi.page / binChangeApi.current + tankStockApi.page
 *
 * 演示要点：
 * 烧结料仓变料：混匀料/石灰石/焦粉/返矿四个配料仓。
 * 右表可切到**槽存**页签（TPA_1043）——变料是「换了什么」，槽存是「还剩多少」，
 * 客户问「换完够不够烧一班」时要看的是后者。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import BinChangeBoard from "../../BinChangeBoard.vue";
</script>

<template>
  <BinChangeBoard process="sinter" code="TW0401" />
</template>
