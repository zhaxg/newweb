<script setup lang="ts">
/**
 * 对应 TW0606 休风实绩（高炉工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`DowntimeBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：downtimeApi.page / downtimeApi.detail
 *
 * 演示要点：
 * 休风开始 / 结束 / 原因 / 时长 / 复风情况。
 * **休风不等于停炉**——高炉还热着待复风，这是高炉与烧结停机在业务上的关键差别，
 * 所以这页标题叫「休风」而其余两页叫「开停机」。B7 的「模拟休风」落点在 2#高炉。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import DowntimeBoard from "../../DowntimeBoard.vue";
</script>

<template>
  <DowntimeBoard process="blast" code="TW0606" kind="休风实绩" />
</template>
