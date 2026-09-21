/** 键值对表（HM_X_KV 本地形态）行类型；数据源见 src/mock/admin/data/kvs.ts */
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
