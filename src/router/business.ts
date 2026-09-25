import { defineAsyncComponent } from "vue";
import type { RouteRecordRaw } from "vue-router";
import IframePage from "@/layouts/pages/IframePage.vue";

/**
 * 业务层路由：业务组自行维护的显式静态路由，新增业务页只改本文件，不动框架层 index.ts。
 * 系统内置路由（登录 / 首页 / 403 / 404）见 @/router/builtin。
 *
 * 每条路由在定义时用 meta.layout 自标注归属（"blank" = 整屏页挂 BlankLayout，缺省 = 壳层页挂 MainLayout），
 * index.ts 按该字段识别并挂到对应父路由。菜单由路由表投影（@/layouts/composables/menuFromRoutes），meta.hidden 的记录不进菜单。
 * 会进菜单的业务页一般不写这里 —— 由后端资源下发、守卫动态注册，才受权限管控（登出即移除、越权落 403）。
 * 例外是下面的「帮助文档」：静态外链菜单，与账号权限无关，登录后恒可见。
 *
 * 本文件承载业务功能（非框架必需），组件一律懒加载分包，重型依赖（Univer 等）不进主 chunk。
 */
export const businessRoutes: RouteRecordRaw[] = [
  /* 帮助文档：一级菜单。子级两种外链形态 ——
     iframe 内嵌（component = IframePage，地址挂 meta.url，站内页签承载）；
     跳浏览器新标签（meta.external，redirect 落 403，菜单点击由 openPage 走 window.open）。
     pageId = 完整路径（父段/子段）；icon 走 tabler 基名（见 lib/tablerIcons）。 */
  {
    path: "help",
    meta: { title: "帮助文档", icon: "Books" },
    children: [
      {
        path: "vue",
        name: "page:help/vue",
        redirect: { name: "forbidden" },
        meta: {
          title: "VUE开发手册",
          icon: "FileCode",
          url: "https://cn.vuejs.org/guide/quick-start.html",
          external: true,
          hidden: true,
        },
      },
      {
        path: "tailwind",
        name: "page:help/tailwind",
        component: IframePage,
        meta: { pageId: "help/tailwind", title: "tailwind文档", icon: "Wind", url: "https://tailwindcss.com/docs" },
      },
      {
        path: "primevue",
        name: "page:help/primevue",
        component: IframePage,
        meta: { pageId: "help/primevue", title: "primevue文档", icon: "Blocks", url: "https://primevue.dev/listbox/" },
      },
      {
        path: "ag-grid",
        name: "page:help/ag-grid",
        redirect: { name: "forbidden" },
        meta: {
          title: "ag-grid文档",
          icon: "Table",
          url: "https://www.ag-grid.com/vue-data-grid/getting-started/",
          external: true,
        },
      },
    ],
  },
  /* 打印模板设计器：TS2120 列表页新窗打开 */
  {
    path: "print-designer",
    name: "print-designer",
    component: defineAsyncComponent(() => import("@/pages/Widgets/XtraReportTemplateManager/PrintDesignPage.vue")),
    meta: { layout: "blank", title: "打印模板设计", loading: false, hidden: true },
  },
  /* 库位图设计：YD1010Map 新窗；Univer 按需加载 */
  {
    path: "map-designer",
    name: "map-designer",
    component: defineAsyncComponent(() => import("@/pages/SYD/YD1010Map/MapDesignPage.vue")),
    meta: { layout: "blank", title: "库位图设计", loading: false, hidden: true },
  },
];
