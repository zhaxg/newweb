/**
 * RouteMeta 的模块增强——路由 meta 字段的**唯一类型真源**。
 *
 * 为什么单独成文件：纯类型声明，与 index 的三阶段装配逻辑无关，是全 router 目录里最不常改的东西。
 * 消费方按这里的契约读写 meta：fromMenu（编译期写入）、guard（守卫读 public/loading）、
 * menuFromRoutes（投影读 hidden/icon/title）、loading（读 loading 开关）、useMenuQuery（读 qs）。
 *
 * ⚠️ 本文件**没有运行时导出**，靠 side-effect import 生效——`@/router/index` 顶部必须保留
 * `import "@/router/core/routeMeta"`。删掉那行，增强会静默失效：当前无 tsconfig、类型门槛暂停中
 * （见 AGENTS §3），失效不会被任何工具报出来。文件末尾的 `export {}` 也不能删——少了它本文件
 * 就是脚本而非模块，`declare module` 会从「增强」退化成「声明覆盖」，把 vue-router 的 RouteMeta 整个替换掉。
 */
declare module "vue-router" {
  interface RouteMeta {
    public?: boolean;
    requiresAuth?: boolean;
    pageId?: string;
    title?: string;
    /** iframe 叶子路由：承载的外链地址 */
    url?: string;
    /** 刷新白屏过渡遮罩开关：默认启用，置 false 的路由不显示（见 components/loading） */
    loading?: boolean;
    /** 菜单资源的 cQueryString（共用窗体按它区分行为，如 "ZG01,1" / "FUR" / JSON 串），页面经 useMenuQuery 读取 */
    qs?: string;
    /**
     * 归属布局：取值 = @/layouts/composables/layouts 注册表的 name（如 "blank"）；缺省 = 默认布局（壳层 MainLayout）。
     * @/router/index 按它把路由归位到对应布局父记录；后端动态路由不带此字段 → 一律进默认壳层。
     */
    layout?: string;
    /** true = 不进侧栏/顶栏菜单。菜单由路由表投影（@/layouts/composables/menuFromRoutes），本字段是唯一开关 */
    hidden?: boolean;
    /** 菜单图标名（tabler，经 lib/tablerIcons 解析） */
    icon?: string;
    /** 拒帧外链：菜单里可见，点击由 openPage 走 window.open 而不导航（直链落 403） */
    external?: boolean;
  }
}

/* oxlint-disable-next-line unicorn/require-module-specifiers --
   空导出不是为了导出什么，而是让本文件成为「模块」：只有模块里的 declare module 才是**增强**；
   脚本里的同名写法会退化成**声明覆盖**，把 vue-router 自带的 RouteMeta 整个替换掉。 */
export {};
