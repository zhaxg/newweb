<script setup lang="ts">
/** 对应线上「减排账户」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/reduction）
 *  已接入：carbonApi.getReductionAccounts（查询：分页 currentPage/pageSize + 企业名称/账户号模糊）
 *  已接入：账户记录（getReductionRecords → 详情 getReductionRecordDetail）
 *  待接入：导出（carbonApi.exportReductionList 端点已按线上路径占位，mock 回成功、不生成文件）
 *  待接入：子表导出（reductionExportList）
 */
import AccountListPage from "../AccountListPage.vue";
</script>

<template>
  <AccountListPage variant="reduction" />
</template>
