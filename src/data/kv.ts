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

const STORAGE_KEY = "hmx.kv";

function seedKvs(): HmxKv[] {
  const rows: HmxKv[] = [];
  let order = 0;
  const master = (cCode: string, cName: string): HmxKv => {
    const m: HmxKv = {
      id: newKvId(), cCode, cName, cDesc: "", cValue: "", cGroup: "", cOrder: "", cEnable: "1", cSw01: "", cSw02: "", cSw03: "", cPid: "",
    };
    rows.push(m);
    return m;
  };
  const child = (parent: HmxKv, code: string, name: string, value = "", extra: Partial<HmxKv> = {}): void => {
    rows.push({
      id: newKvId(), cCode: code, cName: name, cDesc: "", cValue: value, cGroup: "", cOrder: String(++order), cEnable: "1", cSw01: "", cSw02: "", cSw03: "", cPid: parent.id, ...extra,
    });
  };

  {
    const p = master("A0000:GENDER", "性别");
    child(p, "M", "男", "1");
    child(p, "F", "女", "2");
    child(p, "U", "未知", "0", { cSw01: "保密" });
  }

  {
    const p = master("A0000:EDU", "教育程度");
    child(p, "PRIMARY", "小学", "10");
    child(p, "MIDDLE", "初中", "20");
    child(p, "HIGH", "高中/中专", "30");
    child(p, "COLLEGE", "大专", "40");
    child(p, "BACHELOR", "本科", "50", { cSw01: "常用" });
    child(p, "MASTER", "硕士", "60");
    child(p, "DOCTOR", "博士", "70");
  }

  {
    const p = master("A0001:ORDER_STATUS", "订单状态");
    child(p, "DRAFT", "草稿", "10", { cSw01: "可编辑" });
    child(p, "PENDING", "待审核", "20");
    child(p, "APPROVED", "已审核", "30");
    child(p, "RUNNING", "执行中", "40", { cSw01: "锁定" });
    child(p, "DONE", "已完成", "50");
    child(p, "CLOSED", "已关闭", "90", { cEnable: "0" });
  }

  {
    const p = master("A0002:PAY_TYPE", "付款方式");
    child(p, "CASH", "现金", "1");
    child(p, "TRANSFER", "银行转账", "2");
    child(p, "ACCEPT", "承兑汇票", "3", { cSw01: "6个月" });
    child(p, "LC", "信用证", "4");
  }

  {
    const p = master("A0003:CURRENCY", "币种");
    child(p, "CNY", "人民币", "156", { cGroup: "常用" });
    child(p, "USD", "美元", "840", { cGroup: "常用" });
    child(p, "EUR", "欧元", "978");
    child(p, "JPY", "日元", "392");
    child(p, "HKD", "港币", "344");
  }

  {
    const p = master("B0001:NATION", "民族");
    child(p, "01", "汉族", "01");
    child(p, "02", "蒙古族", "02");
    child(p, "03", "回族", "03");
    child(p, "04", "藏族", "04");
    child(p, "05", "维吾尔族", "05");
    child(p, "06", "苗族", "06");
  }

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
