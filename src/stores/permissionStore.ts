/**
 * 当前用户的动态菜单/路由状态（mock 后端下发的菜单树 = 侧栏渲染与路由注册的同一数据源）。
 * 注册/移除路由记录本身由 router/index.ts 负责，本 store 只持有数据与 loaded 标志。
 */
import { ref } from "vue";
import { defineStore } from "pinia";
import type { HmxMenuNode } from "@/data/hmxMenu";
import { fetchUserMenuTree } from "@/api/menuApi";

export const usePermissionStore = defineStore("permission", () => {
  const loaded = ref(false);
  const menuTree = ref<HmxMenuNode[]>([]);

  /** 拉取菜单树并置 loaded；失败时保持 loaded=false 由守卫兜底登出 */
  async function loadForUser(userId: string): Promise<HmxMenuNode[]> {
    const tree = await fetchUserMenuTree(userId);
    menuTree.value = tree;
    loaded.value = true;
    return tree;
  }

  function reset() {
    loaded.value = false;
    menuTree.value = [];
  }

  return { loaded, menuTree, loadForUser, reset };
});
