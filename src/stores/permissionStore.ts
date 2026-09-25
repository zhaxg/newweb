/**
 * 当前用户的动态资源状态（后端下发的资源表 = 路由注册的同一数据源）。
 * mock 与真实模式同走 auth/getUserRescList（groupId=VITE_ROUTER_NAMESPACE），链路一致。
 *
 * 本 store 只持有「加载标志 + 原始资源」：
 * - 路由记录的组装与注册由 router/index.ts 负责（登录后 / 退出两阶段）；
 * - 菜单不存在这里，真源是路由表本身，见 @/layouts/composables/menuFromRoutes 的 menuTree 投影；
 * - resources 是按钮级权限（v-hp）的数据源，见 @/composables/usePermission。
 */
import { ref } from "vue";
import { defineStore } from "pinia";
import type { MenuResNode } from "@/api/common/menuRescTree";
import { RbacRescType } from "@/api/admin/enums";
import type { HmxRes } from "@/api/admin/types";
import { fetchUserMenuTreeFromServer } from "@/api/common/menuRescTree";

export const usePermissionStore = defineStore("permission", () => {
  const loaded = ref(false);
  /** getUserRescList 全量资源（菜单+按钮 Widget…），供按钮级权限消费 */
  const resources = ref<HmxRes[]>([]);
  /** pageId → 该页资源行 id（拼树时顺手落的反查表；v-hp 按路由找回页面行取按钮子级） */
  const pageIdToRescId = ref<Map<string, string>>(new Map());

  /** 拉取后端归一化资源树；返回值交给守卫适配成路由记录。失败保持 loaded=false 由守卫兜底登出 */
  async function loadForUser(): Promise<MenuResNode[]> {
    const res = await fetchUserMenuTreeFromServer();
    resources.value = res.resources;
    pageIdToRescId.value = res.pageIdToRescId;
    loaded.value = true;
    return res.tree;
  }

  /**
   * 按钮级权限判定（v-hp 指令的实现，见 @/composables/usePermission）：
   * 按当前页 pageId 找回它的资源行 → 取其 cPid 子级中的界面元素（cResType=Widget）→ 比对 cCode。
   * 三道兜底默认放行：未加载（登录前）、该页无资源行、该页没登记任何按钮。
   */
  function hasPermission(codes: string | string[], pageId?: string): boolean {
    if (!loaded.value) return true;
    const rescId = pageId ? pageIdToRescId.value.get(pageId) : undefined;
    if (!rescId) return true;
    const want = Array.isArray(codes) ? codes : [codes];
    const btns = resources.value.filter((r) => r.cPid === rescId && r.cResType === RbacRescType.Widget);
    if (!btns.length) return true;
    return want.some((code) => btns.some((b) => b.cCode === code));
  }

  function reset() {
    loaded.value = false;
    resources.value = [];
    pageIdToRescId.value = new Map();
  }

  return { loaded, resources, pageIdToRescId, loadForUser, hasPermission, reset };
});
