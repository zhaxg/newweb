export interface HmxMenuNode {
  id: string;
  label: string;
  icon?: string;
  page?: string;
  children?: HmxMenuNode[];
  /** 真实后端资源：组件路径（如 /admin/user/index.vue），路由注册时映射组件 */
  src?: string;
  /** 真实后端资源：外链地址（cResPath==="_blank" 的菜单），点击新窗口打开、不注册路由 */
  url?: string;
  /** 真实后端资源：cResPath（资源路由段，跨环境稳定；内置菜单按它锚定挂点） */
  path?: string;
  /** 内置菜单：内嵌网页地址，路由注册时映射 IframePage（meta.url） */
  iframe?: string;
}

export const hmxMenu: HmxMenuNode[] = [
  {
    id: "system",
    label: "系统管理",
    icon: "Settings",
    children: [
      { id: "sys-dept", label: "部门", icon: "Building", page: "sys-departments", src: "/admin/departments/SysDepartmentsPage.vue" },
      { id: "sys-user", label: "用户", icon: "Users", page: "sys-users", src: "/admin/user/index.vue" },
      { id: "sys-role", label: "角色", icon: "ShieldCheck", page: "sys-roles", src: "/admin/role/index.vue" },
      { id: "sys-menu", label: "菜单", icon: "ListTree", page: "sys-menus", src: "/admin/resc/index.vue" },
      { id: "sys-kv", label: "键值对", icon: "Braces", page: "sys-kv", src: "/admin/kvs/index.vue" },
      { id: "sys-jobs", label: "计划任务", icon: "Clock", page: "sys-jobs", src: "/admin/jobs/index.vue" },
      { id: "sys-gen", label: "代码生成", icon: "Sparkles", page: "sys-gen", src: "/admin/gen/index.vue" },
      { id: "sys-settings", label: "系统设置", icon: "AdjustmentsHorizontal", page: "sys-settings", src: "/admin/settings/index.vue" },
      { id: "sys-audit", label: "审计日志", icon: "Note", page: "sys-audit", src: "/admin/audit/SysAuditPage.vue" },
    ],
  },
  {
    id: "base",
    label: "基础档案",
    icon: "Archive",
    children: [
      { id: "base-customer", label: "客户档案", icon: "Users", page: "customers" },
      { id: "base-supplier", label: "供应商档案", icon: "Truck", page: "suppliers" },
      { id: "base-material", label: "物料清单", icon: "Packages", page: "materials" },
    ],
  },
  {
    id: "purchase",
    label: "采购管理",
    icon: "ShoppingCart",
    children: [
      {
        id: "purchase-exec",
        label: "采购执行",
        icon: "ClipboardList",
        children: [
          { id: "po", label: "采购订单", icon: "FileText", page: "purchase-orders", src: "/PurchaseOrdersPage.vue" },
          { id: "pi", label: "采购入库", icon: "PackageImport", page: "purchase-inbound" },
        ],
      },
      {
        id: "purchase-inquiry",
        label: "询比价",
        icon: "Scale",
        children: [
          { id: "inq", label: "询价单", icon: "FileText", page: "purchase-inquiries" },
          { id: "quote", label: "报价对比", icon: "Table", page: "purchase-quotes" },
        ],
      },
    ],
  },
  {
    id: "sales",
    label: "销售管理",
    icon: "TrendingUp",
    children: [
      {
        id: "sales-exec",
        label: "销售执行",
        icon: "ClipboardList",
        children: [
          { id: "so", label: "销售订单", icon: "FileText", page: "sales-orders", src: "/SalesOrdersPage.vue" },
          { id: "si", label: "销售出库", icon: "PackageExport", page: "sales-outbound" },
        ],
      },
      {
        id: "sales-analysis",
        label: "销售分析",
        icon: "ChartPie",
        children: [
          { id: "perf", label: "业绩排行", icon: "Trophy", page: "sales-performance" },
          { id: "cust-rpt", label: "客户分析", icon: "UserSearch", page: "sales-customer-analysis" },
        ],
      },
    ],
  },
  {
    id: "inventory",
    label: "库存管理",
    icon: "BuildingWarehouse",
    children: [
      { id: "inv-stock", label: "库存查询", icon: "Search", page: "stock" },
      {
        id: "inv-ops",
        label: "仓储作业",
        icon: "Forklift",
        children: [
          { id: "inv-transfer", label: "调拨单", icon: "ArrowsLeftRight", page: "transfers" },
          { id: "count", label: "盘点单", icon: "ClipboardCheck", page: "stock-counts" },
          { id: "flow", label: "出入库流水", icon: "ArrowsLeftRight", page: "stock-flows" },
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "财务管理",
    icon: "Coin",
    children: [
      {
        id: "fin-ar",
        label: "应收管理",
        icon: "Coins",
        children: [
          { id: "ar", label: "应收账款", icon: "FileText", page: "receivables" },
          { id: "receipt", label: "收款单", icon: "Cash", page: "receipts" },
        ],
      },
      {
        id: "fin-ap",
        label: "应付管理",
        icon: "Receipt",
        children: [
          { id: "ap", label: "应付账款", icon: "FileText", page: "payables" },
          { id: "payment", label: "付款单", icon: "Cash", page: "payments" },
        ],
      },
    ],
  },
  {
    id: "report",
    label: "报表中心",
    icon: "ChartBar",
    children: [
      {
        id: "rpt-sales-group",
        label: "销售报表",
        icon: "ChartLine",
        children: [
          { id: "rpt-sales", label: "销售统计", icon: "ChartLine", page: "report-sales" },
          { id: "rpt-inventory", label: "库存周转", icon: "Refresh", page: "report-inventory" },
        ],
      },
    ],
  },
];
