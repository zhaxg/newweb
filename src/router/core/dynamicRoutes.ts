/**
 * 动态路由的完整生命周期：阶段二挂接（registerUserRoutes）+ 阶段三移除（resetUserRoutes）
 * 与两者之间的状态（removeUserRoutes）。路由表的**组装**（静态骨架、布局父记录）仍在 @/router/index。
 * 命名取 AGENTS 通篇的「动态路由」；函数名保留 User——它们管的是当前登录会话的那批路由。
 *
 * 为什么单独成模块、而不是并进 index：守卫（core/guard）要用这两个函数，而 guard 若 import index
 * 就是 router → guard → index 的反向环。放在这里，guard 与 index 都只依赖本模块，无环。
 *
 * 引用约束：⛔ **router 内部模块**（现消费方：@/router/index、core/guard）。
 * `src/router/` 整体对外零消费方——权限与动态路由的清理已由守卫在「落到 /login」时就地接管
 * （见 guard.ts 的 public 分支），登出方（MainLayout）与认证失败方（api/_core/request）
 * 都只负责导航到 /login。request 要的 router 实例也改为注入（见其 setAuthFailureHandler），
 * 原先为破环而设的 core/bridge.ts 已删除。
 *
 * 为什么 router 与 layoutName 都是参数而不是 import 进来：两者分别住在 @/router/index 与
 * @/layouts/composables/layouts，而 layouts 静态引入 MainLayout.vue——import 任一都会造回边
 * （前者 router → guard → index；后者 layouts → MainLayout → router）。
 * 故由 index 装配时绑定后经守卫注入，本模块对两者零依赖。
 */
import type { RouteRecordRaw, Router } from "vue-router";
import { setUserMenuRoutes } from "@/layouts/composables/menuFromRoutes";
import { homeRoute } from "@/router/builtin";

/* 阶段二挂接时记录各 addRoute 返回的移除回调；由 resetUserRoutes 整体执行
   （触发点是守卫的 public 分支——落到 /login 即清理，见 guard.ts） */
let removeUserRoutes: (() => void)[] = [];

/** 内部：由 registerUserRoutes 交来移除回调（addRoute 返回值） */
function trackUserRoutes(removers: (() => void)[]): void {
  removeUserRoutes = removers;
}

/* ── home 归属（依赖倒置：业务组用一行资源顶掉内置首页，getUserRescList 契约不动）──
   约定：资源树里的**一级叶子 pageId "home"** 即该会话的首页；没有则内置 homeRoute 兜底。
   锚点全走 name/path/pageId "home"（固定页签 page-home、顶栏 HOME_NODE、登录后 redirect /home），
   所以接管记录只改 name、meta 保留资源行的 title/icon。 */
const HOME = "home";

function withHomeOwnership(records: RouteRecordRaw[]): RouteRecordRaw[] {
  const i = records.findIndex((r) => r.meta?.pageId === HOME);
  // 兜底路径：内置 home 放数组首位，保持「菜单首位是首页」的既有观感
  if (i < 0) return [homeRoute, ...records];
  const owned = [...records];
  owned[i] = { ...owned[i], name: HOME } as RouteRecordRaw;
  return owned;
}

/**
 * 阶段二 · 登录后：后端资源适配出的记录挂进指定布局父记录。
 * records 由 @/router/core/fromMenu 从 menuRescTree 的菜单树转换而来（文件夹 = 无 component 的
 * 分组记录，叶子 = 页面记录）；home 归属在 withHomeOwnership 里就地定夺（见其注释）。
 * addRoute 返回各自的移除回调，交给阶段三清理。
 * 幂等起点：先 resetUserRoutes()，重复调用不会叠加。
 *
 * router 与 layoutName 都是参数而非 import：两者分别住在 index 与 layouts 注册表，
 * import 任一都会造回边（见文件头）。由 index 装配时绑定后经守卫注入。
 */
export function registerUserRoutes(router: Router, layoutName: string, records: RouteRecordRaw[]): void {
  resetUserRoutes();
  const owned = withHomeOwnership(records);
  /* 按 meta.layout 归位 —— **不能只看顶层记录**：动态树里页面常常嵌在文件夹 children 下
     （toRouteRecords 把文件夹编成带 children 的分组记录），文件夹自己不带 layout，
     只按顶层分桶的话整棵子树会跟着文件夹进壳层 —— 领导驾驶舱（meta.layout="blank"）
     实测就因此 matched 首项是 shell，页面被侧栏/顶栏包住。
     所以：**整屏叶子先从父记录里摘出来**，按「前缀 + 自身路径」拼出完整路径后单独挂到它的布局父记录；
     剩下的（含文件夹）按 layoutName 挂默认布局。父记录 path 都是 "/"，完整路径挂上去仍是 /carbon/leadership。
     菜单走的是**原始嵌套树**（setUserMenuRoutes(owned)），分桶只影响路由注册 —— 摘掉它不影响侧栏里
     「碳资产 ▾ 领导驾驶舱」的层级，而它点击时本就走 openPage 的 window.open（meta.blank），不会用到壳层里的那条。 */
  const hoisted: RouteRecordRaw[] = [];
  const roots: RouteRecordRaw[] = [];

  const walk = (list: RouteRecordRaw[], prefix: string, into: RouteRecordRaw[]): void => {
    for (const record of list) {
      const abs = prefix ? `${prefix}/${record.path}` : record.path;
      const layout = record.meta?.layout as string | undefined;
      if (layout && layout !== layoutName) {
        hoisted.push({ ...record, path: abs, children: undefined });
        continue;
      }
      const kids = "children" in record && record.children?.length ? record.children : null;
      if (kids) {
        const copy = { ...record, children: [] as RouteRecordRaw[] } as RouteRecordRaw;
        walk(kids, abs, (copy as { children: RouteRecordRaw[] }).children);
        const kids2 = (copy as { children: RouteRecordRaw[] }).children;
        // 子项全被摘走的空文件夹不注册：没内容既不渲染也不该出现在路由表里
        if (kids2.length) into.push(copy);
      } else {
        into.push(record);
      }
    }
  };
  walk(owned, "", roots);

  const plan: Array<{ layout: string; record: RouteRecordRaw }> = [
    ...roots.map((record) => ({ layout: layoutName, record })),
    ...hoisted.map((record) => ({ layout: (record.meta?.layout as string) || layoutName, record })),
  ];
  trackUserRoutes(plan.map(({ layout, record }) => router.addRoute(layout, record)));
  /* 菜单用原始嵌套树：整屏叶子只是不注册进壳层，它在菜单里的位置不变 */
  setUserMenuRoutes(owned);
}

/** 阶段三：动态路由整体移除，菜单回落到只剩静态骨架。幂等（空表重复调用无副作用）。 */
export function resetUserRoutes(): void {
  for (const remove of removeUserRoutes) remove();
  removeUserRoutes = [];
  setUserMenuRoutes([]);
}
