<script setup lang="ts">
import { ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { useToast } from "@/composables/useToast";
import { loadRoleOptions, loadUserRoles, saveUserRoles, type RoleOption } from "@/data/users";

const props = defineProps<{
  open: boolean;
  userId: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const { toast } = useToast();

const unassigned = ref<RoleOption[]>([]);
const assigned = ref<RoleOption[]>([]);

// 打开时从存储初始化，关闭丢弃未保存改动
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    const roles = loadRoleOptions();
    const ids = new Set(loadUserRoles()[props.userId] ?? []);
    unassigned.value = roles.filter((r) => !ids.has(r.id));
    assigned.value = roles.filter((r) => ids.has(r.id));
  },
);

function moveToAssigned(role: RoleOption) {
  unassigned.value = unassigned.value.filter((r) => r.id !== role.id);
  if (!assigned.value.some((r) => r.id === role.id)) assigned.value = [...assigned.value, role];
}

function moveToUnassigned(role: RoleOption) {
  assigned.value = assigned.value.filter((r) => r.id !== role.id);
  if (!unassigned.value.some((r) => r.id === role.id)) unassigned.value = [...unassigned.value, role];
}

function onConfirm() {
  const map = loadUserRoles();
  map[props.userId] = assigned.value.map((r) => r.id);
  saveUserRoles(map);
  emit("update:open", false);
  toast("保存成功");
}
</script>

<template>
  <Dialog :visible="open" modal :header="`用户[${userId}]角色编辑 ---双击数据行操作---`"
    :style="{ width: 'min(48rem, calc(100vw - 2rem))' }" @update:visible="emit('update:open', $event)">
    <div class="flex min-w-0 overflow-hidden rounded-md border border-border/60">
        <!-- 左：所有角色列表 -->
        <div class="min-w-0 basis-[53%] border-r border-border">
          <div class="border-b border-border/60 bg-[rgb(239,239,239)] px-2 py-1.5 text-xs font-medium dark:bg-[rgb(32,32,34)]">所有角色列表（双击分配）</div>
          <div class="flex border-b border-border/60 bg-[rgb(239,239,239)] dark:bg-[rgb(32,32,34)]" style="height: 28px">
            <div class="flex min-w-0 flex-1 items-center overflow-hidden border-r border-border px-2 text-xs font-medium whitespace-nowrap">角色名称</div>
            <div class="flex w-48 shrink-0 items-center overflow-hidden px-2 text-xs font-medium whitespace-nowrap">角色描述</div>
          </div>
          <div class="h-72 overflow-y-auto">
            <div
              v-for="role in unassigned"
              :key="role.id"
              class="flex cursor-default items-center border-b border-border/40 hover:bg-sidebar-accent/60"
              style="height: 28px"
              @dblclick="moveToAssigned(role)"
            >
              <div class="flex min-w-0 flex-1 items-center overflow-hidden border-r border-border/60 px-2 text-xs whitespace-nowrap">
                <span class="min-w-0 truncate">{{ role.cRoleName }}</span>
              </div>
              <div class="flex w-48 shrink-0 items-center overflow-hidden px-2 text-xs whitespace-nowrap">
                <span class="min-w-0 truncate" :class="!role.cDescription && 'italic text-muted-foreground/60'">{{ role.cDescription || "NULL" }}</span>
              </div>
            </div>
            <div v-if="unassigned.length === 0" class="px-3 py-6 text-center text-xs text-muted-foreground">没有可分配的角色</div>
          </div>
        </div>

        <!-- 右：当前用户角色 -->
        <div class="min-w-0 basis-[47%]">
          <div class="border-b border-border/60 bg-[rgb(239,239,239)] px-2 py-1.5 text-xs font-medium dark:bg-[rgb(32,32,34)]">当前用户[{{ userId }}]角色（双击移除）</div>
          <div class="flex border-b border-border/60 bg-[rgb(239,239,239)] dark:bg-[rgb(32,32,34)]" style="height: 28px">
            <div class="flex min-w-0 flex-1 items-center overflow-hidden border-r border-border px-2 text-xs font-medium whitespace-nowrap">角色名称</div>
            <div class="flex w-40 shrink-0 items-center overflow-hidden px-2 text-xs font-medium whitespace-nowrap">角色描述</div>
          </div>
          <div class="h-72 overflow-y-auto">
            <div
              v-for="role in assigned"
              :key="role.id"
              class="flex cursor-default items-center border-b border-border/40 hover:bg-sidebar-accent/60"
              style="height: 28px"
              @dblclick="moveToUnassigned(role)"
            >
              <div class="flex min-w-0 flex-1 items-center overflow-hidden border-r border-border/60 px-2 text-xs whitespace-nowrap">
                <span class="min-w-0 truncate">{{ role.cRoleName }}</span>
              </div>
              <div class="flex w-40 shrink-0 items-center overflow-hidden px-2 text-xs whitespace-nowrap">
                <span class="min-w-0 truncate" :class="!role.cDescription && 'italic text-muted-foreground/60'">{{ role.cDescription || "NULL" }}</span>
              </div>
            </div>
            <div v-if="assigned.length === 0" class="px-3 py-6 text-center text-xs text-muted-foreground">该用户尚未分配角色</div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="取消" variant="outlined" @click="emit('update:open', false)" />
        <Button label="确定" variant="outlined" autofocus @click="onConfirm" />
      </template>
  </Dialog>
</template>
