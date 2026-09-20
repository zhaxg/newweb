<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import { useToast } from "@/composables/useToast";
import { loadAllUsersLite, loadUserRoles, saveUserRoles, type HmxRole, type UserRowLite } from "@/data/roles";

const props = defineProps<{
  open: boolean;
  role: HmxRole | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const { toast } = useToast();

const allUsers = ref<UserRowLite[]>([]);
/** 当前编辑中的角色成员 userId 集合（右侧列表） */
const memberIds = ref<Set<string>>(new Set());
const leftKeyword = ref("");

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    const roleId = props.role?.id;
    const userRoles = loadUserRoles();
    allUsers.value = loadAllUsersLite();
    memberIds.value = new Set(roleId ? allUsers.value.filter((u) => (userRoles[u.id] ?? []).includes(roleId)).map((u) => u.id) : []);
    leftKeyword.value = "";
  },
);

const leftUsers = computed(() => {
  const kw = leftKeyword.value.trim().toLowerCase();
  return allUsers.value.filter((u) => !memberIds.value.has(u.id) && (!kw || u.cUserName.toLowerCase().includes(kw) || u.id.toLowerCase().includes(kw)));
});

const rightUsers = computed(() => allUsers.value.filter((u) => memberIds.value.has(u.id)));

function addUser(user: UserRowLite) {
  if (memberIds.value.has(user.id)) return;
  memberIds.value = new Set([...memberIds.value, user.id]);
}

function removeUser(user: UserRowLite) {
  const next = new Set(memberIds.value);
  next.delete(user.id);
  memberIds.value = next;
}

/** 确定：重写 erp.user_roles 中该角色的成员集合，其余角色的授权保持不变 */
function onConfirm() {
  const role = props.role;
  if (!role) return;
  const userRoles = loadUserRoles();
  for (const u of allUsers.value) {
    const list = userRoles[u.id] ?? [];
    const has = list.includes(role.id);
    const should = memberIds.value.has(u.id);
    if (should && !has) userRoles[u.id] = [...list, role.id];
    else if (!should && has) userRoles[u.id] = list.filter((x) => x !== role.id);
  }
  saveUserRoles(userRoles);
  emit("update:open", false);
  toast("保存成功！");
}
</script>

<template>
  <Dialog :visible="open" modal :header="`角色[${role?.cRoleName}]对应的用户列表`"
    :style="{ width: 'min(48rem, calc(100vw - 2rem))' }" @update:visible="emit('update:open', $event)">
    <div class="flex min-w-0 gap-3">
        <!-- 左：未分配该角色的用户 -->
        <div class="flex w-[42%] min-w-0 flex-col rounded-md border border-border/60">
          <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2 text-xs font-medium">所有用户列表</div>
          <div class="shrink-0 p-1.5">
            <InputText v-model="leftKeyword" placeholder="关键字" autofocus maxlength="100" autocapitalize="off" spellcheck="false" class="w-full min-w-0" />
          </div>
          <div class="flex h-7 shrink-0 items-center border-b border-border bg-[rgb(239,239,239)] text-xs font-medium dark:bg-[rgb(32,32,34)]">
            <span class="w-28 shrink-0 border-r border-border px-2">用户编码(UserId)</span>
            <span class="min-w-0 flex-1 px-2">用户名称</span>
          </div>
          <div class="min-h-0 max-h-[46vh] flex-1 overflow-y-auto">
            <div
              v-for="u in leftUsers"
              :key="u.id"
              class="flex h-7 cursor-default items-center border-b border-border/40 text-xs hover:bg-sidebar-accent/60"
              title="双击加入右侧角色成员"
              @dblclick="addUser(u)"
            >
              <span class="w-28 shrink-0 truncate border-r border-border/60 px-2">{{ u.id }}</span>
              <span class="min-w-0 flex-1 truncate px-2">{{ u.cUserName }}</span>
            </div>
            <div v-if="leftUsers.length === 0" class="px-2 py-6 text-center text-xs text-muted-foreground">暂无可添加的用户</div>
          </div>
        </div>

        <!-- 右：该角色的成员 -->
        <div class="flex min-w-0 flex-1 flex-col rounded-md border border-border/60">
          <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2 text-xs font-medium">角色[{{ role?.cRoleName }}]对应的用户列表</div>
          <div class="h-[34px] shrink-0" />
          <div class="flex h-7 shrink-0 items-center border-b border-border bg-[rgb(239,239,239)] text-xs font-medium dark:bg-[rgb(32,32,34)]">
            <span class="w-28 shrink-0 border-r border-border px-2">用户编码(UserId)</span>
            <span class="min-w-0 flex-1 px-2">用户名称</span>
          </div>
          <div class="min-h-0 max-h-[46vh] flex-1 overflow-y-auto">
            <div
              v-for="u in rightUsers"
              :key="u.id"
              class="flex h-7 cursor-default items-center border-b border-border/40 text-xs hover:bg-sidebar-accent/60"
              title="双击移出角色"
              @dblclick="removeUser(u)"
            >
              <span class="w-28 shrink-0 truncate border-r border-border/60 px-2">{{ u.id }}</span>
              <span class="min-w-0 flex-1 truncate px-2">{{ u.cUserName }}</span>
            </div>
            <div v-if="rightUsers.length === 0" class="px-2 py-6 text-center text-xs text-muted-foreground">该角色暂无成员，双击左侧用户加入</div>
          </div>
        </div>
      </div>

      <div class="text-xs text-muted-foreground">提示：双击左侧行加入角色，双击右侧行移出角色。</div>

      <template #footer>
        <Button label="取消" text @click="emit('update:open', false)" />
        <Button label="确定" raised @click="onConfirm" />
      </template>
  </Dialog>
</template>
