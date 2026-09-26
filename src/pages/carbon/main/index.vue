<script setup lang="ts">
/** 对应线上「主账户」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/main）
 *  已接入：carbonApi.getMainAccounts（查询：分页 currentPage/pageSize + 企业名称/账户号模糊）
 *  待接入：导出（carbonApi.exportMainList 端点已按线上路径占位，mock 回成功、不生成文件）
 */
import AccountListPage from "../AccountListPage.vue";
</script>

<template>
  <AccountListPage variant="main" />
</template>
