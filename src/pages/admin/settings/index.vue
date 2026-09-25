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

type FieldKind = "text" | "number" | "switch";
interface FieldDef {
  key: keyof SystemSettingInfo;
  label: string;
  kind: FieldKind;
  ph?: string;
}
interface FieldGroup {
  title: string;
  fields: FieldDef[];
}

const groups: FieldGroup[] = [
  {
    title: "产品信息",
    fields: [
      { key: "productName", label: "产品名称", kind: "text", ph: "请输入产品名称" },
      { key: "productVersion", label: "产品版本", kind: "text", ph: "请输入产品版本" },
      { key: "customer", label: "客户", kind: "text", ph: "请输入客户" },
      { key: "telephone", label: "联系电话", kind: "text", ph: "请输入联系电话" },
      { key: "copyRight", label: "版权信息", kind: "text", ph: "请输入版权信息" },
    ],
  },
  {
    title: "路径与报表",
    fields: [
      { key: "imageFolder", label: "图片文件夹", kind: "text", ph: "请输入图片文件夹" },
      { key: "defaultLogFolder", label: "默认日志文件夹", kind: "text", ph: "请输入默认日志文件夹" },
    ],
  },
  {
    title: "运行参数",
    fields: [
      { key: "retainLogDays", label: "日志保留天数(天)", kind: "number" },
      { key: "checkAutoUpdateInterval", label: "自动更新检测间隔(分钟)", kind: "number" },
      { key: "timeoutOfLogin", label: "登录超时时间(分钟)", kind: "number" },
    ],
  },
  {
    title: "功能开关",
    fields: [
      { key: "syncClientTime", label: "同步客户端时间", kind: "switch" },
      { key: "enableNotifications", label: "启用通知", kind: "switch" },
      { key: "forceToUseDateBaseServerTime", label: "强制使用数据库服务器时间", kind: "switch" },
      { key: "allowAdminUseNormalModule", label: "允许管理员使用普通模块", kind: "switch" },
      { key: "allowNormalUseSystemModule", label: "允许普通用户使用系统模块", kind: "switch" },
      { key: "allowAddUserWithSystemManager", label: "允许系统管理员添加用户", kind: "switch" },
    ],
  },
  {
    title: "环境标识",
    fields: [
      { key: "dataBaseSignkey", label: "数据库标识名", kind: "text", ph: "如：生产环境 / 测试环境" },
      { key: "serverSignKey", label: "服务器标识名", kind: "text", ph: "如：生产环境 / 测试环境" },
    ],
  },
];
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="btnQuery">
        <IconRefresh class="h-3 w-3" />加载
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="saving" @click="btnSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">系统设置</span>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-5 py-6">
      <div class="mx-auto flex w-full max-w-5xl flex-col gap-7">
        <section v-for="g in groups" :key="g.title">
          <div class="flex items-center gap-2">
            <span class="h-3.5 w-0.5 rounded-full bg-primary/70" />
            <h3 class="text-sm font-semibold text-foreground">{{ g.title }}</h3>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-x-10 gap-y-1">
            <div v-for="f in g.fields" :key="f.key" class="flex min-w-0 items-center gap-3 py-1.5">
              <label class="min-w-0 flex-1 truncate text-xs text-muted-foreground" :title="f.label">{{
                f.label
              }}</label>
              <ToggleSwitch
                v-if="f.kind === 'switch'"
                :model-value="formData[f.key] as unknown as boolean"
                @update:model-value="formData[f.key] = $event as never"
              />
              <InputNumber
                v-else-if="f.kind === 'number'"
                :model-value="formData[f.key] as unknown as number"
                :min="0"
                :show-buttons="false"
                :use-grouping="false"
                class="w-full min-w-0 flex-1"
                @update:model-value="formData[f.key] = ($event ?? 0) as never"
              />
              <InputText
                v-else
                :model-value="formData[f.key] as unknown as string"
                :placeholder="f.ph"
                autocapitalize="off"
                spellcheck="false"
                class="min-w-0 flex-1"
                @update:model-value="formData[f.key] = $event as never"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
