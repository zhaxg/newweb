<script setup lang="ts">
/**
 * 对应 TD0003 铁水运行信息汇总（大屏看板 · 附录 A3 版式 **L6 全屏大屏**）
 *
 * 底板：`ScreenBoard`（三张屏共用，只换 kind——三张屏版式完全一致，
 * 差别只在数据与那块工艺区域色，所以只有一份底板）
 *
 * 接口：boardApi.iron（数据，5s 轮询）· boardApi.shell（外壳，挂载取一次）
 *
 * 演示要点：
 * 今日铁次 / 已完成 / 在途 / 平均过磅温度 / 平均温降 / 走铸铁次数。
 * **铁水以铁次为基本单元**（B11 第 2 条），所以 KPI 是「铁次」不是「吨」；
 * 温度与温降取自 TM0003 的过磅台账——**与台账页同源**，两处对得上。
 * 去向里「铸铁」是少数（炼钢不接时的兜底），给 40% 会与现场对不上。
 *
 * 本页**只读**（本域只查桩）：屏上没有任何可点的操作。
 */
import ScreenBoard from "../ScreenBoard.vue";
</script>

<template>
  <ScreenBoard kind="iron" />
</template>
