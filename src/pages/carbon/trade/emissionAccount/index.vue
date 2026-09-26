<script setup lang="ts">
/** 对应线上「碳排账户」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/emission）
 *  已接入：carbonApi.getEmissionAccounts（查询：分页 currentPage/pageSize + 企业名称/账户号模糊）
 *  已接入：账户记录（getEmissionRecords → 详情 getEmissionRecordDetail）
 */
import AccountListPage from "../../AccountListPage.vue";
</script>

<template>
  <AccountListPage variant="emission" />
</template>
