import { authApi } from "@/api/admin/request";
import { RbacRescType } from "@/api/admin/enums";
import type { HmxRes } from "@/api/admin/types";

/**
 * 后端资源 → 语义资源树（本模块职责：只懂后端契约、把资源洗成树，不是后端接口本身）。
 *
 * 真正的后端接口是 authApi.getUserRescList；本文件是它到路由层之间的「菜单资源树」适配器。
 * 全链路三层，各管一段、类型互不串味：
 *   ① 本文件 menuRescTree：authApi 的平铺 HmxRes → 归一化语义树 MenuResNode（唯一读后端字段处）；
 *   ② router/core/fromMenu：MenuResNode → RouteRecordRaw（路由编译：iframe/blank 策略、组件解析、pageId 命名都在这）；
 *   ③ menuFromRoutes     ：RouteRecordRaw → HmxMenuNode（渲染投影，在 layouts/composables/，菜单真源是路由表）。
 * 本层只把后端那套 cXxx 字段翻译成前端语义字段，不决定「怎么注册成路由」——那是 ② 的事。
 */
export interface MenuResNode {
  /** 资源主键（后端 id）：文件夹无 page 时作路径段回落 */
  id: string;
  /** 菜单显示名（「编码-名称」，无编码则仅名称） */
  label: string;
  icon?: string;
  /** cResPath 原文（资源路由段，跨环境稳定）；文件夹无 page 时按它取路径段 */
  path?: string;
  /** 可导航叶子的完整 pageId（祖先 cResPath 链拼接，如 "admin/user"）；纯文件夹为 undefined */
  page?: string;
  /** 组件地址（cResSubPath），供 fromMenu 在 import.meta.glob 里解析组件；外链为 undefined */
  src?: string;
  /** http 外链原文（iframe 承载与 blank 新标签共用；普通页面无） */
  url?: string;
  /** cQueryString，共用窗体多菜单运行参数（透传 RouteMeta.qs，页面经 useMenuQuery 读） */
  query?: string;
  children?: MenuResNode[];
}

/* ── 后端契约：auth/getUserRescList（groupId = VITE_ROUTER_NAMESPACE，rescType 不传取全部）──
   返回 id/cPid 自关联平铺资源表；菜单（cResType=Menu）过滤后转 MenuResNode 树，
   按钮（Widget）等其余类型原样随 resources 返回，留作按钮级权限数据源。
   pageIdToRescId 是拼树时顺手落的反查表（pageId → 该页资源行 id）：按钮权限要按
   当前路由的 meta.pageId 找回它的资源行再取 cPid 子级，而 pageId 的推导规则只在本文件有。 */
export async function fetchUserMenuTreeFromServer(): Promise<{
  tree: MenuResNode[];
  resources: HmxRes[];
  pageIdToRescId: Map<string, string>;
}> {
  const resources = await authApi.getUserRescList({
    groupId: import.meta.env.VITE_ROUTER_NAMESPACE ?? "TDWEB",
  });
  const menus = (resources ?? []).filter((r) => r.cResType === RbacRescType.Menu);
  const roots = menus.filter((r) => !r.cPid).sort(byOrder);
  // 首页是 builtin 静态路由（homeRoute），不在动态资源树里，避免与静态注册重复
  const pageIdToRescId = new Map<string, string>();
  const firstOwner = new Map<string, { id: string; label: string }>();
  const clashes: Array<{ page: string; a: { id: string; label: string }; b: { id: string; label: string } }> = [];
  const tree = roots.map((r) => toNode(r, menus, "", pageIdToRescId, firstOwner, clashes));
  if (clashes.length) {
    // 后端只承诺主键唯一，拼出的 pageId 没有；路由/页签/KeepAlive 全以 pageId 为身份，
    // 撞名会静默互相覆盖（addRoute 同名后者赢）→ 显式点名：资源表要唯一的是 cResPath 链，不是 id。
    const detail = clashes
      .map((c) => `「${c.a.label}」(id=${c.a.id}) vs 「${c.b.label}」(id=${c.b.id}) → /${c.page}`)
      .join("\n");
    console.warn(`[menuRescTree] ${clashes.length} 个 pageId 被不同资源行重复，路由/缓存/页签将互相覆盖：\n${detail}`);
  }
  return { tree, resources: resources ?? [], pageIdToRescId };
}

/** cOrder 契约为字符串，按字符串比较排序（对齐后端行为，如 "010"<"020"<"140"） */
function byOrder(a: HmxRes, b: HmxRes): number {
  const oa = a.cOrder ?? "";
  const ob = b.cOrder ?? "";
  return oa < ob ? -1 : oa > ob ? 1 : 0;
}

/** prefix = 祖先 cResPath 链（如 "admin"）；叶子 pageId = 完整路径（如 "admin/user"）→ 路由 /admin/user。
 *  唯一性后端只承诺主键 id，不承诺拼出的全路径（不同行可填相同 cResPath）→ 撞名由调用处查重点名。
 *  缺 cResPath 时该段回落资源 id。
 *  外链只填 url + page（是否 iframe/blank 交由 fromMenu 按主机判定），本层不做路由策略。
 *  凡拼出 pageId 的资源行（叶子页面 + 外链）都登记进 pageIdMap，供按钮权限按路由反查资源行。 */
function toNode(
  res: HmxRes,
  all: HmxRes[],
  prefix: string,
  pageIdMap: Map<string, string>,
  firstOwner: Map<string, { id: string; label: string }>,
  clashes: Array<{ page: string; a: { id: string; label: string }; b: { id: string; label: string } }>,
): MenuResNode {
  const seg = res.cResPath && res.cResPath !== "_blank" ? res.cResPath : (res.id ?? "");
  const full = prefix ? `${prefix}/${seg}` : seg;
  const node: MenuResNode = {
    id: res.id ?? "",
    label: res.cCode ? `${res.cCode}-${res.cTitle ?? res.cName ?? ""}` : (res.cTitle ?? res.cName ?? ""),
    icon: res.cIcon ?? undefined,
    path: res.cResPath || undefined,
    query: res.cQueryString || undefined,
  };
  const sub = res.cResSubPath ?? "";
  /** 该资源行是一个可导航页 → 记下 pageId → 资源 id（pageId 推导规则只在本文件有，别处重算必漂移） */
  const asPage = () => {
    const owner = firstOwner.get(full);
    if (owner && owner.id !== (res.id ?? "")) {
      clashes.push({ page: full, a: owner, b: { id: res.id ?? "", label: node.label } });
    } else if (!owner) {
      firstOwner.set(full, { id: res.id ?? "", label: node.label });
    }
    if (res.id) pageIdMap.set(full, res.id);
  };
  // 仅 cResType=2（菜单）的子节点才算文件夹；cResType=4（按钮权限）不计入
  const children = all.filter((r) => r.cPid === res.id && r.cResType === RbacRescType.Menu).sort(byOrder);
  if (sub.startsWith("http")) {
    node.url = sub;
    node.page = full;
    asPage();
  } else if (children.length) {
    node.children = children.map((c) => toNode(c, all, full, pageIdMap, firstOwner, clashes));
  } else if (sub || res.cResPath) {
    node.page = full;
    node.src = sub || undefined;
    asPage();
  }
  return node;
}
