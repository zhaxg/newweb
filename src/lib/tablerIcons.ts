import { defineAsyncComponent, type Component } from "vue";

/**
 * Tabler 图标解析（**壳层侧**，在首屏链上）。
 *
 * 全量注册表（6202 个图标）**不在本模块**——它在 lib/tablerIconRegistry.ts，只有图标选择器
 * 与「未收录兜底」才加载。为什么这么拆：全量 glob 会在 chunk 里内联 6202 条 名字→懒加载器
 * 映射，实测占 entry chunk **1,177,347 B（约 70%）**；而壳层（侧栏/顶栏）实际只需菜单用到的那批。
 *
 * 下面的 glob 是**小映射**（白名单见模式里的花括号），覆盖四处：
 *   ① 后端资源种子的 cIcon（菜单图标）——`src/mock/admin/data/rescs.ts`（43 个）+
 *      `src/mock/carbon/data/rescs.ts`（47 个，系从 JNPF 自绘图标语义映射来，原名见其行尾注释）
 *   ② 静态路由的 meta.icon——`src/router/builtin.ts`（Home）+ `src/router/business.ts`（Blocks/Books/Wind）
 *   ③ 兜底图标 File
 *   ④ admin/gen 页硬编码用到的几个（Check/Copy/FileCode/Loader/Sparkles）
 * 重新生成①②（三者求并集后写回花括号，当前 83 个）：
 *   grep -hoE 'cIcon: "[^"]*"' src/mock/admin/data/rescs.ts src/mock/carbon/data/rescs.ts | sed -E 's/.*cIcon: "([^"]*)"/\1/' | sort -u
 *   grep -hoE 'icon: "[^"]*"' src/router/builtin.ts src/router/business.ts | sort -u
 *
 * ⚠️ **这份白名单漏了不会坏**——未收录的名字会走 tablerIcon() 的兜底路径动态拉全量注册表，
 * 只是那一次多下一个 chunk（之后进 cache）。所以它是**性能白名单，不是正确性依赖**。
 * 但漏了会**悄悄抵消这次优化**（首屏就拉 183 KB gz 的注册表），故：
 *   **完整性自检**——dev 下开首页看 Network，若出现 `tablerIconRegistry` 的请求，就是有图标漏了。
 *
 * ⚠️ glob 的模式必须是**单个字符串字面量**（Vite 靠静态分析收集），不能用变量或模板串拼接。
 */
const loaders = import.meta.glob(
  "/node_modules/@tabler/icons-vue/dist/esm/icons/Icon{Adjustments,AlertTriangle,Api,Apps,ArrowsJoin2,Atom2,Bell,Blocks,Bolt,Books,Box,Briefcase,Building,BuildingEstate,BuildingFactory,BuildingWarehouse,Calculator,Calendar,CalendarMonth,CalendarStats,Certificate,ChartBar,ChartDots,ChartLine,ChartPie,Check,Checks,CircleCheck,ClipboardCheck,Clock,Cloud,Code,Coins,Copy,CreditCard,Cube,Database,DeviceMobile,DeviceTv,Droplet,Exchange,File,FileCode,FileDescription,FileText,Flame,Flask,Folder,Headset,History,Home,Key,LayoutDashboard,Leaf,Loader,News,Package,Pencil,Printer,Receipt,Recycle,ReportAnalytics,Route,Router,Ruler,Scale,Scan,Scissors,Settings,ShieldCheck,ShieldLock,Sparkles,Stack2,Table,Target,TargetArrow,Tool,TrendingDown,Truck,User,UsersGroup,Wallet,Wind}.mjs",
);

const loaderByPascal = new Map<string, () => Promise<{ default: Component }>>();
for (const key of Object.keys(loaders)) {
  const m = /\/(Icon[A-Za-z0-9]+)\.mjs$/.exec(key);
  if (!m) continue;
  loaderByPascal.set(m[1].slice(4), loaders[key] as () => Promise<{ default: Component }>);
}

/** kebab → Pascal：chart-pie → ChartPie */
function pascalize(name: string) {
  return name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

/** 兼容三种写法：Pascal("ChartPie") / kebab("chart-pie") / iconify 类名("icon-[tabler--chart-pie]")，含带 Icon 前缀 */
function normalize(raw: string): string {
  let n = raw.trim();
  const m = /^icon-\[[a-z0-9]+--([a-z0-9-]+)\]$/i.exec(n);
  if (m) n = m[1];
  if (n.includes("-")) n = pascalize(n);
  if (/^Icon[A-Z]/.test(n)) n = n.slice(4);
  return n;
}

const cache = new Map<string, Component | null>();

/** 按名称解析 Tabler 图标组件；未收录返回 null（调用方自行兜底） */
export function tablerIcon(rawName?: string | null): Component | null {
  if (!rawName) return null;
  const name = normalize(rawName);
  if (!name) return null;
  if (cache.has(name)) return cache.get(name) ?? null;

  const load = loaderByPascal.get(name);
  if (load) {
    const comp = defineAsyncComponent({ loader: () => load().then((m) => m.default) });
    cache.set(name, comp);
    return comp;
  }

  /* 未收录在小映射里 → 兜底动态加载全量注册表。
     只在后端菜单出现新图标（或白名单过期）时走一次，之后进 cache；见文件头「漏了不会坏」。 */
  const comp = defineAsyncComponent({
    loader: async () => {
      const { tablerIconLoader } = await import("@/lib/tablerIconRegistry");
      const loader = tablerIconLoader(name);
      if (!loader) return { render: () => null } as Component;
      return (await loader()).default;
    },
  });
  cache.set(name, comp);
  return comp;
}

/** 兜底图标（Tabler file），解析失败时统一回退它；空渲染仅为类型安全网 */
export const TABLER_FALLBACK_ICON: Component = tablerIcon("File") ?? { render: () => null };
