export interface ErpMenuNode {
  id: string;
  label: string;
  icon?: string;
  page?: string;
  children?: ErpMenuNode[];
}

export const erpMenu: ErpMenuNode[] = [
  {
    id: "system",
    label: "系统管理",
    icon: "Settings",
    children: [
      { id: "sys-dept", label: "部门", icon: "Building2", page: "sys-departments" },
      { id: "sys-user", label: "用户", icon: "Users", page: "sys-users" },
      { id: "sys-role", label: "角色", icon: "ShieldCheck", page: "sys-roles" },
      { id: "sys-menu", label: "菜单", icon: "ListTree", page: "sys-menus" },
      { id: "sys-kv", label: "键值对", icon: "Braces", page: "sys-kv" },
      { id: "sys-audit", label: "审计日志", icon: "ScrollText", page: "sys-audit" },
    ],
  },
  {
    id: "base",
    label: "基础档案",
    icon: "FolderArchive",
    children: [
      { id: "base-customer", label: "客户档案", icon: "Users", page: "customers" },
      { id: "base-supplier", label: "供应商档案", icon: "Truck", page: "suppliers" },
      { id: "base-material", label: "物料清单", icon: "Boxes", page: "materials" },
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
          { id: "po", label: "采购订单", icon: "FileText", page: "purchase-orders" },
          { id: "pi", label: "采购入库", icon: "PackagePlus", page: "purchase-inbound" },
        ],
      },
      {
        id: "purchase-inquiry",
        label: "询比价",
        icon: "Scale",
        children: [
          { id: "inq", label: "询价单", icon: "FileText", page: "purchase-inquiries" },
          { id: "quote", label: "报价对比", icon: "Columns3", page: "purchase-quotes" },
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
          { id: "so", label: "销售订单", icon: "FileText", page: "sales-orders" },
          { id: "si", label: "销售出库", icon: "PackageMinus", page: "sales-outbound" },
        ],
      },
      {
        id: "sales-analysis",
        label: "销售分析",
        icon: "PieChart",
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
    icon: "Warehouse",
    children: [
      { id: "inv-stock", label: "库存查询", icon: "Search", page: "stock" },
      {
        id: "inv-ops",
        label: "仓储作业",
        icon: "Forklift",
        children: [
          { id: "inv-transfer", label: "调拨单", icon: "ArrowLeftRight", page: "transfers" },
          { id: "count", label: "盘点单", icon: "ClipboardCheck", page: "stock-counts" },
          { id: "flow", label: "出入库流水", icon: "ArrowLeftRight", page: "stock-flows" },
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "财务管理",
    icon: "CircleDollarSign",
    children: [
      {
        id: "fin-ar",
        label: "应收管理",
        icon: "HandCoins",
        children: [
          { id: "ar", label: "应收账款", icon: "FileText", page: "receivables" },
          { id: "receipt", label: "收款单", icon: "Banknote", page: "receipts" },
        ],
      },
      {
        id: "fin-ap",
        label: "应付管理",
        icon: "Receipt",
        children: [
          { id: "ap", label: "应付账款", icon: "FileText", page: "payables" },
          { id: "payment", label: "付款单", icon: "Banknote", page: "payments" },
        ],
      },
    ],
  },
  {
    id: "report",
    label: "报表中心",
    icon: "BarChart3",
    children: [
      {
        id: "rpt-sales-group",
        label: "销售报表",
        icon: "LineChart",
        children: [
          { id: "rpt-sales", label: "销售统计", icon: "LineChart", page: "report-sales" },
          { id: "rpt-inventory", label: "库存周转", icon: "RefreshCw", page: "report-inventory" },
        ],
      },
    ],
  },
];

