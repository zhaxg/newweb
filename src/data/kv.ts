export interface HmxKv {
  id: string;
  cCode: string;
  cName: string;
  cDesc: string;
  cValue: string;
  cGroup: string;
  cOrder: string;
  cEnable: string;
  cSw01: string;
  cSw02: string;
  cSw03: string;
  /** 子项的父编码（父项 cCode）；父项为空串 */
  cPid: string;
}

const STORAGE_KEY = "erp.kv";

function seedKvs(): HmxKv[] {
  const rows: HmxKv[] = [];
  let order = 0;
  const master = (cCode: string, cName: string): HmxKv => ({
    id: newKvId(), cCode, cName, cDesc: "", cValue: "", cGroup: "", cOrder: "", cEnable: "1", cSw01: "", cSw02: "", cSw03: "", cPid: "",
  });
  const child = (cPid: string, code: string, name: string, value = "", extra: Partial<HmxKv> = {}): HmxKv => ({
    id: newKvId(), cCode: code, cName: name, cDesc: "", cValue: value, cGroup: "", cOrder: String(++order), cEnable: "1", cSw01: "", cSw02: "", cSw03: "", cPid, ...extra,
  });

  rows.push(master("A0000:GENDER", "性别"));
  rows.push(child("A0000:GENDER", "M", "男", "1"), child("A0000:GENDER", "F", "女", "2"), child("A0000:GENDER", "U", "未知", "0", { cSw01: "保密" }));

  rows.push(master("A0000:EDU", "教育程度"));
  rows.push(
    child("A0000:EDU", "PRIMARY", "小学", "10"),
    child("A0000:EDU", "MIDDLE", "初中", "20"),
    child("A0000:EDU", "HIGH", "高中/中专", "30"),
    child("A0000:EDU", "COLLEGE", "大专", "40"),
    child("A0000:EDU", "BACHELOR", "本科", "50", { cSw01: "常用" }),
    child("A0000:EDU", "MASTER", "硕士", "60"),
    child("A0000:EDU", "DOCTOR", "博士", "70"),
  );

  rows.push(master("A0001:ORDER_STATUS", "订单状态"));
  rows.push(
    child("A0001:ORDER_STATUS", "DRAFT", "草稿", "10", { cSw01: "可编辑" }),
    child("A0001:ORDER_STATUS", "PENDING", "待审核", "20"),
    child("A0001:ORDER_STATUS", "APPROVED", "已审核", "30"),
    child("A0001:ORDER_STATUS", "RUNNING", "执行中", "40", { cSw01: "锁定" }),
    child("A0001:ORDER_STATUS", "DONE", "已完成", "50"),
    child("A0001:ORDER_STATUS", "CLOSED", "已关闭", "90", { cEnable: "0" }),
  );

  rows.push(master("A0002:PAY_TYPE", "付款方式"));
  rows.push(
    child("A0002:PAY_TYPE", "CASH", "现金", "1"),
    child("A0002:PAY_TYPE", "TRANSFER", "银行转账", "2"),
    child("A0002:PAY_TYPE", "ACCEPT", "承兑汇票", "3", { cSw01: "6个月" }),
    child("A0002:PAY_TYPE", "LC", "信用证", "4"),
  );

  rows.push(master("A0003:CURRENCY", "币种"));
  rows.push(
    child("A0003:CURRENCY", "CNY", "人民币", "156", { cGroup: "常用" }),
    child("A0003:CURRENCY", "USD", "美元", "840", { cGroup: "常用" }),
    child("A0003:CURRENCY", "EUR", "欧元", "978"),
    child("A0003:CURRENCY", "JPY", "日元", "392"),
    child("A0003:CURRENCY", "HKD", "港币", "344"),
  );

  rows.push(master("B0001:NATION", "民族"));
  rows.push(
    child("B0001:NATION", "01", "汉族", "01"),
    child("B0001:NATION", "02", "蒙古族", "02"),
    child("B0001:NATION", "03", "回族", "03"),
    child("B0001:NATION", "04", "藏族", "04"),
    child("B0001:NATION", "05", "维吾尔族", "05"),
    child("B0001:NATION", "06", "苗族", "06"),
  );

  return rows;
}

export function loadKvs(): HmxKv[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as HmxKv[];
  } catch {
    /* 数据损坏时回退种子 */
  }
  const seeded = seedKvs();
  saveKvs(seeded);
  return seeded;
}

export function saveKvs(rows: HmxKv[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function newKvId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
