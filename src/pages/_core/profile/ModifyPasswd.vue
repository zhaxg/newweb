<script setup lang="ts">
import { reactive, ref } from "vue";
import { IconKey, IconLock, IconShieldCheck } from "@tabler/icons-vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputPassword from "primevue/inputpassword";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";

import { adminApi } from "@/api/admin/request";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/composables/useToast";

/* 修改密码（移植 hmx_web modify-passwd.vue）：
   t-dialog/t-form → PrimeVue Dialog + 手动校验（规则同原：必填、6-20 位、两次一致）；
   业务/网络错误提示由 request.ts 拦截层统一 toast，此处 catch 仅保持弹窗不关闭。 */

const auth = useAuthStore();
const { toast } = useToast();

const visible = ref(false);
const submitting = ref(false);

const form = reactive({ oldPassword: "", newPassword: "", confirmPassword: "" });
const errors = reactive({ oldPassword: "", newPassword: "", confirmPassword: "" });

/* 三字段结构一致 → 配置化 v-for，图标按语义区分（原密码/新密码/确认） */
const fields = [
  { name: "oldPassword", label: "原密码", placeholder: "请输入原密码", icon: IconLock },
  { name: "newPassword", label: "新密码", placeholder: "6–20 位字符", icon: IconKey },
  { name: "confirmPassword", label: "确认新密码", placeholder: "请再次输入新密码", icon: IconShieldCheck },
] as const;

type FieldName = keyof typeof form & keyof typeof errors;

function openModal() {
  visible.value = true;
}

function pwdLenError(v: string) {
  return v.length < 6 || v.length > 20 ? "密码长度在6到20个字符之间" : "";
}

function fieldError(name: FieldName): string {
  const v = form[name];
  switch (name) {
    case "oldPassword":
      return !v ? "请输入原密码" : pwdLenError(v);
    case "newPassword":
      return !v ? "请输入新密码" : v === form.oldPassword ? "新密码不能与原密码相同" : pwdLenError(v);
    case "confirmPassword":
      return !v ? "请确认新密码" : v !== form.newPassword ? "两次输入密码不一致" : "";
  }
}

function validateField(name: FieldName) {
  errors[name] = fieldError(name);
}

/* 已报错的字段在输入时即时消除错误，未报错的仍等 blur（不打扰首次录入） */
function onInput(name: FieldName) {
  if (errors[name]) validateField(name);
}

function validate(): boolean {
  (Object.keys(errors) as FieldName[]).forEach(validateField);
  return !errors.oldPassword && !errors.newPassword && !errors.confirmPassword;
}

function reset() {
  form.oldPassword = "";
  form.newPassword = "";
  form.confirmPassword = "";
  errors.oldPassword = "";
  errors.newPassword = "";
  errors.confirmPassword = "";
}

async function handleSubmit() {
  if (!validate()) return;
  submitting.value = true;
  try {
    await adminApi.modifyPassword(auth.session?.userId, form.oldPassword, form.newPassword);
    toast("密码修改成功", 2000, "success");
    reset();
    visible.value = false;
  } catch {
    /* 拦截层已 toast 具体错误 */
  } finally {
    submitting.value = false;
  }
}

defineExpose({ openModal });
</script>

<template>
  <Dialog :visible="visible" modal header="修改密码" :style="{ width: 'min(24rem, calc(100vw - 2rem))' }"
    @update:visible="visible = $event">
    <p class="mb-4 text-xs leading-relaxed text-muted-foreground">为保障账号安全，建议定期更换密码。修改成功后请使用新密码重新登录。</p>
    <form @submit.prevent="handleSubmit">
      <div v-for="f in fields" :key="f.name" class="mb-3.5 last:mb-0">
        <label class="mb-1 block text-xs font-medium text-foreground">{{ f.label }}</label>
        <IconField>
          <InputIcon>
            <component :is="f.icon" />
          </InputIcon>
          <!-- autofocus 供 Dialog 打开时命中（否则回退聚焦关闭钮出现焦点圈）；InputPassword attrs 直通 input -->
          <InputPassword v-model="form[f.name]" variant="filled" fluid :invalid="!!errors[f.name]"
            :placeholder="f.placeholder" autocomplete="off" :autofocus="f.name === 'oldPassword'"
            @blur="validateField(f.name)" @update:model-value="onInput(f.name)" />
        </IconField>
        <!-- 固定高度占位：报错出现/消失不引起布局跳动 -->
        <p class="mt-0.5 h-4 text-xs leading-4 text-destructive">{{ errors[f.name] }}</p>
      </div>
    </form>
    <template #footer>
      <Button label="取消" variant="text" severity="secondary" size="small" :disabled="submitting"
        @click="visible = false" />
      <Button label="确认修改" size="small" :loading="submitting" @click="handleSubmit" />
    </template>
  </Dialog>
</template>
