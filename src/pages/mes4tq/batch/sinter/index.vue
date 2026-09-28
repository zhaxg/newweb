<script setup lang="ts">
/**
 * 对应 TB0002 烧结配料计划（配料管理 · 附录 A3 版式 **L3 主从双表**）
 *
 * 底板：`BatchBoard`（四工序共用，只换入参——四道配料共用同一张表 `TPM_2010`）
 *
 * 接口：batchingApi.page / batchingApi.items / batchingApi.detail
 *
 * 演示要点：
 * 混匀料 + 熔剂 + 燃料 + 返矿 四类料——A3 原文。
 * 这页的配比是 TW0402 烧结投料实绩的**执行侧对照**：计划在这一边、
 * 实绩在那边，B4 定的「配料偏差率 ±2% 内算稳、±5% 外要追」就靠它算。
 * 返矿那一项占 16.5% 是真实回料比例，把返矿拿掉账就不平了。
 *
 * 待接入：规格书 B7 的「▶ 模拟配料执行」走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import BatchBoard from "../BatchBoard.vue";
</script>

<template>
  <BatchBoard process="sinter" code="TB0002" label="烧结配料" />
</template>
