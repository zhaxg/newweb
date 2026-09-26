<script setup lang="ts">
/** 对应线上「交易账户」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/trading）
 *  已接入：carbonApi.getTradeAccounts（查询：分页 currentPage/pageSize + 企业名称/账户号模糊）
 *  已接入：账户记录（getTradeRecords → 详情 getTradeAccInfo）、资产划拨（tradeTransfer 写插桩）
 */
import AccountListPage from "../AccountListPage.vue";
</script>

<template>
  <AccountListPage variant="trading" />
</template>
