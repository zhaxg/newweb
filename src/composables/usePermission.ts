/**
 * 按钮级权限指令 v-hp —— 移植自 hmx_web 的 usePermission.ts，数据源换成本仓库的
 * permissionStore（后端 getUserRescList 平铺资源表 + pageId→资源行 反查表）。
 *
 * 用法：`<Button v-hp="'btnAdd'" @click="add">新增</Button>`；一个元素认多个编码写 `v-hp="['btnEdit','btnSave']"`。
 * 编码即资源表里该页面子级（cResType=Widget 界面元素）的 cCode，资源管理页可维护。
 *
 * 判定口径（与参考实现一致，宁可放行不可误杀）：未加载资源 / 该页无资源行 / 该页没登记按钮
 * → 一律显示；登记了按钮则必须命中才显示。
 *
 * 只在元素挂载时判一次（同参考实现）。路由内固定的按钮够用；若按钮要随异步数据切换显隐，
 * 改用 `permStore.hasPermission(code, pageId)` 包一层 computed。
 */
import type { App, Plugin } from "vue";
/* 取实例走叶桥不 import index——与 request 同一条防环边界：只有 main.ts 与 router 自身 import index */
import { getRouter } from "@/router/bridge";
import { usePermissionStore } from "@/stores/permissionStore";

/** 当前路由的 pageId（取不到 = 静态路由，不参与资源权限） */
function currentPageId(): string | undefined {
  const pageId = getRouter().currentRoute.value.meta.pageId;
  return typeof pageId === "string" ? pageId : undefined;
}

export const hmxPermissionPlugin: Plugin = {
  install(app: App) {
    app.directive("hp", {
      mounted(el: HTMLElement, binding) {
        if (!binding.value) return;
        if (usePermissionStore().hasPermission(binding.value, currentPageId())) return;
        el.remove();
      },
    });
  },
};
