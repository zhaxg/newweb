import { authApi } from "@/api/admin/request";
import { RbacRescType } from "@/api/admin/enums";
import type { HmxRes } from "@/api/admin/types";

/** 外链打开模式（路由层两套并存）：
 *  - `iframe`：注册路由叶子 → 壳层内置 IframePage 承载，同页签体系（默认）
 *  - `blank`  ：不注册路由 → 点击时 `window.open` 开浏览器新标签（用于拒帧站点） */
export type ExternalOpenMode = "iframe" | "blank";

/** 壳层菜单节点（原 src/data/hmxMenu.ts，演示菜单树清退后接口迁入本文件） */
export interface HmxMenuNode {
  id: string;
  label: string;
  icon?: string;
  page?: string;
  children?: HmxMenuNode[];
  /** 真实后端资源：组件路径（如 /admin/user/index.vue），路由注册时映射组件 */
  src?: string;
  /** 真实后端资源：外链地址原文（iframe 模式的 meta.url 与 blank 模式的跳转目标共用此值） */
  url?: string;
  /** 真实后端资源：cResPath（资源路由段，跨环境稳定；静态路由按它锚定挂点） */
  path?: string;
  /** 叶子路由承载的外嵌地址（http 外链与前端内置种子同源）→ 路由注册时映射 IframePage（meta.url） */
  iframe?: string;
  /** 外链打开模式；仅 http 外链有值，普通页面无此字段（见 ExternalOpenMode） */
  openMode?: ExternalOpenMode;
  /** 刷新白屏过渡遮罩开关：false = 该页面路由不启用（透传 RouteMeta.loading，默认启用） */
  loading?: boolean;
  /** 真实后端资源：cQueryString，共用窗体多菜单的运行参数（透传 RouteMeta.qs） */
  query?: string;
}

const HOME_NODE: HmxMenuNode = { id: "home", label: "首页", icon: "Home", page: "home" };

/* ── 外链打开模式配置（host → blank）──────────────────────────────────────────
   未列出的外链一律 `iframe`（内置承载，进页签体系）。命中下列主机的走 `blank`
   （浏览器新标签，不注册路由）——因为这些站点下发 `X-Frame-Options: deny`，
   浏览器强制拒帧，前端无法绕过，只可能空白：

     10.11.5.59:3000   Grafana（TS2080 服务日志查询）
                       默认 [security] allow_embedding=false → X-Frame-Options: deny
                       待 Grafana 放行 allow_embedding=true 后删掉此行即回归 iframe

   按主机匹配而非按菜单编码：同一站点新增的外链菜单自动继承，不必逐条登记。 */
const EXTERNAL_BLANK_HOSTS = new Set<string>(["10.11.5.59:3000"]);

/** 该外链应开新标签（拒帧站点）→ openMode = "blank"；否则 "iframe" */
function externalOpenMode(sub: string): ExternalOpenMode {
  try {
    return EXTERNAL_BLANK_HOSTS.has(new URL(sub).host) ? "blank" : "iframe";
  } catch {
    return "iframe";
  }
}

/**
 * 菜单接口（mock 与真实后端同源）：auth/getUserRescList（groupId = VITE_ROUTER_NAMESPACE，rescType 不传取全部）。
 * 返回的是 id/cPid 自关联的平铺资源表；菜单节点（cResType=Menu）过滤后转成壳层 HmxMenuNode 树，
 * 按钮（Widget）等其余类型由调用方留作按钮级权限数据源。
 */
export async function fetchUserMenuTreeFromServer(): Promise<{ tree: HmxMenuNode[]; resources: HmxRes[] }> {
  const resources = await authApi.getUserRescList({
    groupId: import.meta.env.VITE_ROUTER_NAMESPACE ?? "TDWEB",
  });
  const menus = (resources ?? []).filter((r) => r.cResType === RbacRescType.Menu);
  const roots = menus.filter((r) => !r.cPid).sort(byOrder);
  const tree = [HOME_NODE, ...roots.map((r) => toNode(r, menus, ""))];
  return { tree, resources: resources ?? [] };
}

/** cOrder 契约为字符串，按字符串比较排序（对齐后端行为，如 "010"<"020"<"140"） */
function byOrder(a: HmxRes, b: HmxRes): number {
  const oa = a.cOrder ?? "";
  const ob = b.cOrder ?? "";
  return oa < ob ? -1 : oa > ob ? 1 : 0;
}

/** prefix = 祖先 cResPath 链（如 "admin"）；叶子 pageId = 完整路径（如 "admin/user"）→ 路由 /admin/user。
 *  全路径天然唯一（cResPath 跨父级重复者如 tfy1001 各带父前缀），缺 cResPath 时该段回落资源 id */
function toNode(res: HmxRes, all: HmxRes[], prefix: string): HmxMenuNode {
  const seg = res.cResPath && res.cResPath !== "_blank" ? res.cResPath : (res.id ?? "");
  const full = prefix ? `${prefix}/${seg}` : seg;
  const node: HmxMenuNode = {
    id: res.id ?? "",
    // 菜单名格式「编码-名称」（如 YD2001-成品库存管理），无编码时仅名称
    label: res.cCode ? `${res.cCode}-${res.cTitle ?? res.cName ?? ""}` : (res.cTitle ?? res.cName ?? ""),
    icon: res.cIcon ?? undefined,
    path: res.cResPath || undefined,
    query: res.cQueryString || undefined,
  };
  const sub = res.cResSubPath ?? "";
  // 仅 cResType=2（菜单）的子节点才视为文件夹，cResType=4（按钮权限）不算
  const children = all.filter((r) => r.cPid === res.id && r.cResType === 2).sort(byOrder);
  if (sub.startsWith("http")) {
    /* 外链菜单，两种打开模式（见 ExternalOpenMode / EXTERNAL_BLANK_HOSTS）：
       iframe —— 注册路由叶子（page = 父链资源路径，iframe = 外嵌地址），路由 component
                 选 IframePage、meta.url 挂地址 → 内置承载、进页签体系；
       blank  —— 只留 url、不给 page → walkLeaves 跳过不注册，openPage 直接
                 window.open 开新标签（拒帧站点唯一可用方式）。 */
    node.url = sub;
    node.openMode = externalOpenMode(sub);
    if (node.openMode === "iframe") {
      node.page = full;
      node.iframe = sub;
    }
  } else if (children.length) {
    node.children = children.map((c) => toNode(c, all, full));
  } else if (sub || res.cResPath) {
    // 叶子页面：pageId = 父链拼接的完整资源路径，src 供组件映射
    node.page = full;
    node.src = sub || undefined;
  }
  return node;
}
