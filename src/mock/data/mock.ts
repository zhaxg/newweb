type GridCellValue = string | number | boolean | null;

interface GridColumnDef {
  name: string;
  type: string;
  comment?: string;
}

export interface GridDataset {
  columns: GridColumnDef[];
  rows: GridCellValue[][];
}

const CUSTOMERS = ["杭州云通科技", "苏州华工精密", "深圳鑫源电子", "北京中建八局", "上海远大物流", "广州绿岛食品", "成都天府智造", "武汉光谷激光", "宁波海天塑机", "青岛海尔特种"];
const MATERIALS = ["伺服电机 750W", "铝合金外壳 A6061", "轴承 6204-2RS", "PLC 控制器 S7-1200", "触摸屏 10 寸", "减速机 RV-40E", "铜排 TMY-40x4", "密封圈 NBR-50", "变频器 2.2kW", "导轨 HGR20"];
const OWNERS = ["张伟", "李娜", "王强", "刘洋", "陈静", "赵磊"];
const STATUSES = ["待审核", "已确认", "生产中", "已发货", "已完成", "已取消"];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, list: T[]): T {
  return list[Math.floor(rand() * list.length)];
}

function dateStr(rand: () => number): string {
  const m = 1 + Math.floor(rand() * 9);
  const d = 1 + Math.floor(rand() * 28);
  return `2026-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** ag-grid 需要对象行；采购订单数据集独立于 GridDataset。 */
interface PurchaseFieldDef {
  field: string;
  headerName: string;
  /** 数字列右对齐并参与选区求和/均值 */
  numeric?: boolean;
  width?: number;
}
export interface PurchaseDataset {
  fields: PurchaseFieldDef[];
  rows: Record<string, GridCellValue>[];
}

const SUPPLIERS = ["宁波顺达供应链", "东莞金力五金", "苏州工业园区精密", "山东鲁银铜业", "浙江万马高分子", "广东南海铝材", "江苏中天科技", "河北恒泰密封", "福建安捷电气", "四川长虹部件"];
const SPECS = ["750W/220V", "600×400×3mm", "20×40mm", "φ50×2", "42×42mm", "DN25", "100mm", "M8×20", "24V/5A", "1.5kW"];
const UNITS = ["件", "套", "米", "千克", "台", "只", "批", "个"];
const WAREHOUSES = ["原料库", "五金库", "电子库", "成品库", "外协库"];
const DEPTS = ["采购一部", "采购二部", "战略采购", "工程采购"];
const CURRENCIES = ["CNY", "USD", "EUR"];
const PAY_METHODS = ["月结30天", "月结60天", "货到付款", "预付30%", "电汇T/T"];
const PO_STATUSES = ["待提交", "已审核", "执行中", "部分到货", "已完成", "已关闭"];
const APPROVE_STATUSES = ["未审核", "审核中", "已通过", "已驳回"];
const PAY_STATUSES = ["未付款", "部分付款", "已付清"];
const RECEIVE_STATUSES = ["未收货", "部分收货", "已收货"];

/** 采购订单：30 字段 × count 行（默认 1 万），固定随机种子保证可复现。 */
export function generatePurchaseOrders(count = 10000): PurchaseDataset {
  const rand = mulberry32(20261001);
  const rows: Record<string, GridCellValue>[] = [];
  for (let i = 0; i < count; i += 1) {
    const qty = 1 + Math.floor(rand() * 500);
    const price = Math.round((8 + rand() * 1992) * 100) / 100;
    const amount = Math.round(qty * price * 100) / 100;
    const rate = rand() > 0.3 ? 0.13 : rand() > 0.5 ? 0.09 : 0.06;
    const tax = Math.round(amount * rate * 100) / 100;
    const currency = pick(rand, CURRENCIES);
    rows.push({
      order_no: `PO-2026${String(200001 + i)}`,
      supplier: pick(rand, SUPPLIERS),
      supplier_code: `SUP-${String(1000 + Math.floor(rand() * 400))}`,
      material: pick(rand, MATERIALS),
      material_code: `M-${String(100000 + Math.floor(rand() * 899999))}`,
      spec: pick(rand, SPECS),
      unit: pick(rand, UNITS),
      quantity: qty,
      unit_price: price,
      amount,
      tax_rate: rate,
      tax_amount: tax,
      total_amount: Math.round((amount + tax) * 100) / 100,
      currency,
      exchange_rate: currency === "CNY" ? 1 : Math.round((6 + rand() * 2) * 10000) / 10000,
      order_date: dateStr(rand),
      delivery_date: dateStr(rand),
      purchase_user: pick(rand, OWNERS),
      purchase_dept: pick(rand, DEPTS),
      warehouse: pick(rand, WAREHOUSES),
      status: pick(rand, PO_STATUSES),
      approve_status: pick(rand, APPROVE_STATUSES),
      contract_no: rand() > 0.4 ? `HT-2026-${String(1000 + Math.floor(rand() * 9000))}` : null,
      payment_method: pick(rand, PAY_METHODS),
      payment_status: pick(rand, PAY_STATUSES),
      receive_status: pick(rand, RECEIVE_STATUSES),
      invoice_no: rand() > 0.5 ? `INV${String(4000000 + Math.floor(rand() * 9999999))}` : null,
      priority: 1 + Math.floor(rand() * 3),
      urgent: rand() > 0.85,
      remark: rand() > 0.85 ? `催货：${pick(rand, ["产线待料", "客户验厂", "补货", "项目节点"])}` : null,
    });
  }
  return {
    fields: [
      { field: "order_no", headerName: "订单编号", width: 140 },
      { field: "supplier", headerName: "供应商", width: 160 },
      { field: "supplier_code", headerName: "供应商编码", width: 120 },
      { field: "material", headerName: "物料名称", width: 150 },
      { field: "material_code", headerName: "物料编码", width: 120 },
      { field: "spec", headerName: "规格型号", width: 120 },
      { field: "unit", headerName: "单位", width: 70 },
      { field: "quantity", headerName: "数量", numeric: true, width: 90 },
      { field: "unit_price", headerName: "单价", numeric: true, width: 100 },
      { field: "amount", headerName: "金额", numeric: true, width: 120 },
      { field: "tax_rate", headerName: "税率", numeric: true, width: 80 },
      { field: "tax_amount", headerName: "税额", numeric: true, width: 110 },
      { field: "total_amount", headerName: "价税合计", numeric: true, width: 120 },
      { field: "currency", headerName: "币种", width: 70 },
      { field: "exchange_rate", headerName: "汇率", numeric: true, width: 90 },
      { field: "order_date", headerName: "订单日期", width: 110 },
      { field: "delivery_date", headerName: "到货日期", width: 110 },
      { field: "purchase_user", headerName: "采购员", width: 80 },
      { field: "purchase_dept", headerName: "采购部门", width: 100 },
      { field: "warehouse", headerName: "仓库", width: 90 },
      { field: "status", headerName: "状态", width: 90 },
      { field: "approve_status", headerName: "审核状态", width: 90 },
      { field: "contract_no", headerName: "合同号", width: 130 },
      { field: "payment_method", headerName: "付款方式", width: 110 },
      { field: "payment_status", headerName: "付款状态", width: 90 },
      { field: "receive_status", headerName: "收货状态", width: 90 },
      { field: "invoice_no", headerName: "发票号", width: 130 },
      { field: "priority", headerName: "优先级", numeric: true, width: 80 },
      { field: "urgent", headerName: "加急", width: 70 },
      { field: "remark", headerName: "备注", width: 160 },
    ],
    rows,
  };
}

export function generateSalesOrders(count = 260): GridDataset {
  const rand = mulberry32(20260919);
  const rows: GridCellValue[][] = [];
  for (let i = 0; i < count; i += 1) {
    const qty = 1 + Math.floor(rand() * 200);
    const price = Math.round((50 + rand() * 4950) * 100) / 100;
    const tax = rand() > 0.3 ? Math.round(price * qty * 0.13 * 100) / 100 : null;
    rows.push([
      `SO-2026${String(10001 + i)}`,
      pick(rand, CUSTOMERS),
      pick(rand, MATERIALS),
      qty,
      price,
      tax,
      dateStr(rand),
      pick(rand, OWNERS),
      pick(rand, STATUSES),
      rand() > 0.5,
      rand() > 0.85 ? `加急：${pick(rand, ["客户验厂", "配套发货", "春节备货"])}` : null,
    ]);
  }
  return {
    columns: [
      { name: "order_no", type: "varchar", comment: "订单编号" },
      { name: "customer", type: "varchar", comment: "客户名称" },
      { name: "material", type: "varchar", comment: "物料名称" },
      { name: "quantity", type: "integer", comment: "数量" },
      { name: "unit_price", type: "numeric", comment: "单价" },
      { name: "tax_amount", type: "numeric", comment: "税额" },
      { name: "delivery_date", type: "timestamp", comment: "交期" },
      { name: "owner", type: "varchar", comment: "业务员" },
      { name: "status", type: "varchar", comment: "状态" },
      { name: "urgent", type: "boolean", comment: "加急" },
      { name: "remark", type: "text", comment: "备注" },
    ],
    rows,
  };
}
