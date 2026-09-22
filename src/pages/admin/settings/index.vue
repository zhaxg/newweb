<script setup lang="ts">
/** 对应 FrmSetting（settings）：HmxWinForms.Forms.Admin.Settings.FrmSetting
 *  画面迁移，逻辑不迁移到 */

import { onMounted, ref } from "vue";
import { IconDeviceFloppy, IconRefresh } from "@tabler/icons-vue";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import ToggleSwitch from "primevue/toggleswitch";
import { useToast } from "@/composables/useToast";
import { systemKeyValueApi } from "@/api/admin/request";
import type { SystemSettingInfo } from "@/api/admin/types";

const { toast } = useToast();

const formData = ref<SystemSettingInfo>({
  syncClientTime: false,
  isDemoModel: false,
  allowAdminUseNormalModule: false,
  allowNormalUseSystemModule: false,
  retainLogDays: 0,
  checkAutoUpdateInterval: 0,
  forceToUseDateBaseServerTime: false,
  timeoutOfLogin: 0,
  allowShowTopBanner: false,
  enableCustomSkins: false,
  enableNotifications: false,
  allowAddUserWithSystemManager: false,
});
const loading = ref(false);
const saving = ref(false);

async function btnQuery() {
  if (loading.value) return;
  loading.value = true;
  try {
    const settings = await systemKeyValueApi.querySystemSettingInfosV2();
    formData.value = settings ?? formData.value;
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

async function btnSave() {
  if (saving.value) return;
  saving.value = true;
  try {
    await systemKeyValueApi.saveSystemSettingInfosV2({ ...formData.value });
    toast("已提交", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

onMounted(btnQuery);

const textFields: [string, keyof SystemSettingInfo, string][] = [
  ["报表基础地址", "reportBaseAddress", "请输入报表基础地址"],
  ["产品版本", "productVersion", "请输入产品版本"],
  ["数据库签名密钥", "dataBaseSignkey", "请输入数据库签名密钥"],
  ["服务器签名密钥", "serverSignKey", "请输入服务器签名密钥"],
  ["产品名称", "productName", "请输入产品名称"],
  ["版权信息", "copyRight", "请输入版权信息"],
  ["客户", "customer", "请输入客户"],
  ["联系电话", "telephone", "请输入联系电话"],
  ["同步客户端时间", "syncClientTime", ""],
  ["图片文件夹", "imageFolder", "请输入图片文件夹"],
  ["演示模式", "isDemoModel", ""],
  ["允许管理员使用普通模块", "allowAdminUseNormalModule", ""],
  ["允许普通用户使用系统模块", "allowNormalUseSystemModule", ""],
  ["默认日志文件夹", "defaultLogFolder", "请输入默认日志文件夹"],
  ["日志保留天数", "retainLogDays", ""],
  ["自动更新检测间隔", "checkAutoUpdateInterval", "请输入自动更新检测间隔(分钟)"],
  ["强制使用数据库服务器时间", "forceToUseDateBaseServerTime", ""],
  ["登录超时时间(分钟)", "timeoutOfLogin", "请输入登录超时时间"],
  ["显示顶部横幅", "allowShowTopBanner", ""],
  ["启用自定义皮肤", "enableCustomSkins", ""],
  ["启用通知", "enableNotifications", ""],
  ["允许系统管理员添加用户", "allowAddUserWithSystemManager", ""],
];

function isSwitch(key: keyof SystemSettingInfo): boolean {
  return typeof formData.value[key] === "boolean";
}

function isNumber(key: keyof SystemSettingInfo): boolean {
  return typeof formData.value[key] === "number";
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" :loading="loading" @click="btnQuery">
        <IconRefresh class="h-3.5 w-3.5" />加载
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" :loading="saving" @click="btnSave">
        <IconDeviceFloppy class="h-3.5 w-3.5" />保存
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">系统设置</span>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-5 py-6">
      <div class="mx-auto grid max-w-4xl grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        <div v-for="[label, key, ph] in textFields" :key="key" class="flex min-w-0 items-center justify-between gap-3">
          <label class="shrink-0 text-xs font-medium text-muted-foreground">{{ label }}</label>
          <ToggleSwitch v-if="isSwitch(key)"
            :model-value="formData[key] as unknown as boolean"
            @update:model-value="formData[key] = $event as never" />
          <InputNumber v-else-if="isNumber(key)" :model-value="formData[key] as unknown as number" :min="0"
            :show-buttons="false" :use-grouping="false" class="w-40 shrink-0"
            @update:model-value="formData[key] = ($event ?? 0) as never" />
          <InputText v-else :model-value="formData[key] as unknown as string" :placeholder="ph" autocapitalize="off"
            spellcheck="false" class="w-56 min-w-0 shrink-0"
            @update:model-value="formData[key] = $event as never" />
        </div>
      </div>
    </div>
  </div>
</template>
