/**
 * 当前用户的动态菜单/路由状态（后端下发的菜单树 = 侧栏渲染与路由注册的同一数据源）。
 * mock 与真实模式同走 auth/getUserRescList（groupId=VITE_ROUTER_NAMESPACE），链路一致。
 * 注册/移除路由记录本身由 router/index.ts 负责，本 store 只持有数据与 loaded 标志。
 */
import { ref } from "vue";
import { defineStore } from "pinia";
import type { HmxMenuNode } from "@/api/common/menuApi";
import type { HmxRes } from "@/api/admin/types";
import { fetchUserMenuTreeFromServer } from "@/api/common/menuApi";
import { mergeStaticMenu } from "@/router/staticRoutes";

export const usePermissionStore = defineStore("permission", () => {
  const loaded = ref(false);
  const menuTree = ref<HmxMenuNode[]>([]);
  /** getUserRescList 全量资源（菜单+按钮 Widget…），供按钮级权限消费 */
  const resources = ref<HmxRes[]>([]);

  /** 拉取菜单树并拼接静态路由（前端内置、不受权限管控）→ 最终菜单；失败保持 loaded=false 由守卫兜底登出 */
  async function loadForUser(): Promise<HmxMenuNode[]> {
    const res = await fetchUserMenuTreeFromServer();
    const tree = mergeStaticMenu(res.tree);
    resources.value = res.resources;
    menuTree.value = tree;
    loaded.value = true;
    return tree;
  }

  function reset() {
    loaded.value = false;
    menuTree.value = [];
    resources.value = [];
  }

  return { loaded, menuTree, resources, loadForUser, reset };
});
