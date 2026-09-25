import type { Component } from "vue";
import MainLayout from "@/layouts/MainLayout.vue";
import BlankLayout from "@/layouts/BlankLayout.vue";

/**
 * 布局注册表：壳层 / 整屏等「布局父记录」的唯一真源。
 *
 * 加一种布局 = 往这里注册一条；`router/index` 循环生成父路由、按 `meta.layout` 把 children 归位，
 * 不必再改 index。`meta.layout` 的取值即这里的 `name`；缺省归 `default` 那个（壳层）。
 *
 * 为什么是「共享父记录」而非每条路由自带 component 包一层布局：同一布局的所有页面必须复用
 * 同一个父组件实例——MainLayout 里的侧栏 / TabBar / KeepAlive 靠「父组件跨子路由导航不重挂载」
 * 才保得住状态。若各页自带布局，导航时整块 chrome 会重挂载，缓存与侧栏态全丢。
 */
export interface LayoutDef {
  /** 父路由 name，同时是路由 `meta.layout` 的取值 */
  name: string;
  component: Component;
  /** `meta.layout` 缺省时归入此布局（约定有且仅有一个 default；后端动态路由也挂这里） */
  default?: boolean;
}

export const layouts: LayoutDef[] = [
  { name: "shell", component: MainLayout, default: true },
  { name: "blank", component: BlankLayout },
];

/** 默认布局名：`meta.layout` 未指定的静态页、以及登录后动态注册的后端路由都挂这里 */
export const defaultLayoutName = layouts.find((l) => l.default)?.name ?? layouts[0].name;
