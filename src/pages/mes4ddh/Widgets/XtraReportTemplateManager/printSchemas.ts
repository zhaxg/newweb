/**
 * 打印数据源 schema：对应原 WinForms XtraReportDtoLoader 扫描的 IXtraReportDataSourceDto。
 * AQN（AssemblyQualifiedName）与生产类型选择器一致；字段来自 C# [LDisplay]/实体属性。
 * 样例数据：每个 schema 一条（列表类 1 行），供「打印模拟数据」浏览器打印。
 * InStovePrint：源码树无同名类，按 Ti1090_InStoveDto 字段对齐（装炉实绩）。
 */

export interface PrintField {
  key: string;
  label: string;
}

export interface PrintListSchema {
  key: string;
  label: string;
  columns: PrintField[];
}

export interface PrintSchema {
  /** AssemblyQualifiedName，写入 TsPrintTemplate.CDataType */
  aqn: string;
  /** 类型短名 */
  name: string;
  /** 界面标题 */
  title: string;
  /** 变量/表格用扁平字段（对象标量） */
  fields: PrintField[];
  /** 列表型数据源（表格绑定） */
  lists: PrintListSchema[];
  /** 一条样例数据（嵌套结构与 C# 形状一致；列表长度=1） */
  sample: Record<string, unknown>;
}

const A = (ns: string, name: string) =>
  `${ns}.${name}, DDH.Service, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null`;

export const PRINT_SCHEMAS: PrintSchema[] = [
  {
    aqn: A("DDH.Service.SHR.Dtos", "ThrSampPrint"),
    name: "ThrSampPrint",
    title: "试坯打印",
    fields: [
      { key: "samp.cBatchNo", label: "批号" },
      { key: "samp.cSgCode", label: "钢种" },
      { key: "samp.cStove", label: "炉号" },
      { key: "samp.nThick", label: "厚度" },
      { key: "samp.createTime", label: "创建时间" },
      { key: "samp.creator", label: "创建人" },
    ],
    lists: [],
    sample: {
      samp: {
        id: "SAMP001",
        cBatchNo: "B260924A",
        cSgCode: "Q235B",
        cStove: "L1001",
        nThick: 12,
        createTime: "2026-09-24 10:00:00",
        creator: "admin",
        lastModifier: "admin",
        lastModifyTime: "2026-09-24 10:00:00",
      },
    },
  },
  {
    aqn: A("DDH.Service.SHR.Dtos", "InStovePrint"),
    name: "InStovePrint",
    title: "装炉实绩打印",
    fields: [
      { key: "selected", label: "选择" },
      { key: "cZpNo", label: "组批号" },
      { key: "cSlabNo", label: "板坯号" },
      { key: "dFurTime", label: "装炉时刻" },
      { key: "cFurCode", label: "加热炉号" },
      { key: "cPassNo", label: "道号" },
      { key: "nFurTemp", label: "装炉前温度" },
      { key: "cShiftNo", label: "入炉班次" },
      { key: "cInboundNo", label: "入库标识" },
      { key: "nSlabThick", label: "坯厚mm" },
      { key: "nSlabWidth", label: "坯宽mm" },
      { key: "nSlabLen", label: "坯长mm" },
      { key: "cTrimFlag", label: "切边方式" },
      { key: "cDelivyAddress", label: "流向" },
    ],
    lists: [],
    sample: {
      selected: false,
      cZpId: "ZP001",
      cZpNo: "ZP260924001",
      cSlabNo: "SLAB260924001",
      cCardNo: "Q235B",
      dFurTime: "2026-09-24 08:30:00",
      cFurCode: "RF01",
      cPassNo: "1",
      nFurTemp: 1180,
      cShiftNo: "甲班",
      cShiftGroup: "G1",
      cInboundNo: "RK001",
      nSlabThick: 220,
      nSlabWidth: 1250,
      nSlabLen: 9000,
      nOrderThick: 220,
      cTrimFlag: "双边",
      cSpecialMarkGy: "Q",
      cConNo: "HT260901",
      cDelivyAddress: "天津港",
    },
  },
  {
    aqn: A("DDH.Service.SHR.Dtos", "TiL2ME06ItemDtoPrint"),
    name: "TiL2ME06ItemDtoPrint",
    title: "装炉明细打印",
    fields: [],
    lists: [
      {
        key: "list",
        label: "装炉实绩列表",
        columns: [
          { key: "nOrder", label: "顺序" },
          { key: "slabNo", label: "板坯号" },
          { key: "cSgCodePlan", label: "计划钢种" },
          { key: "cStove", label: "炉号" },
          { key: "cPieceNo", label: "件次号" },
          { key: "cLineCode", label: "产线" },
          { key: "nThick", label: "厚度" },
          { key: "createTime", label: "装炉时间" },
          { key: "cCustName", label: "客户名称" },
        ],
      },
    ],
    sample: {
      list: [
        {
          nOrder: 1,
          slabNo: "SLAB260924001",
          cSgCodePlan: "Q235B",
          cStove: "L1001",
          cPieceNo: "P001",
          cLineCode: "LG01",
          nThick: 220,
          createTime: "2026-09-24 08:30:00",
          cCustName: "演示客户",
          cCool: "N",
          slabFurBefTemp: 1180,
        },
      ],
    },
  },
  {
    aqn: A("DDH.Service.SMP.Dto", "CptSlabNoPrint"),
    name: "CptSlabNoPrint",
    title: "铸坯号打印",
    fields: [],
    lists: [
      {
        key: "CptSlabNo",
        label: "铸坯列表",
        columns: [
          { key: "dWeighTime", label: "称重时间" },
          { key: "cSlabNo", label: "铸坯号" },
          { key: "nWgt", label: "炉前称重" },
          { key: "cSgCode", label: "钢种" },
          { key: "nThick", label: "坯厚" },
          { key: "nWth", label: "坯宽" },
          { key: "nLen", label: "坯长" },
        ],
      },
    ],
    sample: {
      CptSlabNo: [
        {
          dWeighTime: "2026-09-24 09:15:00",
          cSlabNo: "CB260924001",
          nWgt: 28.5,
          cSgCode: "Q345B",
          nThick: 220,
          nWth: 1250,
          nLen: 9000,
        },
      ],
    },
  },
  {
    aqn: A("DDH.Service.SHR.Dtos", "DtoThr4000Print"),
    name: "DtoThr4000Print",
    title: "轧钢实绩打印",
    fields: [],
    lists: [
      {
        key: "thr4000s",
        label: "轧钢实绩列表",
        columns: [
          { key: "cLineCode", label: "产线代码" },
          { key: "cStove", label: "炉号" },
          { key: "cPieceNo", label: "件次号" },
          { key: "cSgCode", label: "钢种" },
          { key: "cSgStd", label: "执行标准" },
          { key: "cSpec", label: "规格" },
          { key: "nWgt", label: "重量" },
          { key: "cProdCode", label: "品名" },
          { key: "createTime", label: "时间" },
          { key: "cQmLevel", label: "质量等级" },
        ],
      },
    ],
    sample: {
      thr4000s: [
        {
          cLineCode: "LG01",
          cStove: "L1001",
          cPieceNo: "P001",
          cSgCode: "Q235B",
          cSgStd: "GB/T 700",
          cDm: "220*1250",
          cSpec: "12*1500*C",
          nWgt: 28.5,
          cTrimFlag: "双边",
          cInboundNo: "RK001",
          cFlawDesc: "I",
          cDelivyAddress: "天津港",
          cProdCode: "热轧卷板",
          createTime: "2026-09-24 09:00:00",
          cPrint: "1",
          ctype: "喷印",
          cPrintCode: "H260924001",
          cQmLevel: "合格",
        },
      ],
    },
  },
  {
    aqn: A("DDH.Service.SQM.Dtos.Tqmts", "Tqmts0xDto"),
    name: "Tqmts0xDto",
    title: "炼钢工艺卡打印",
    fields: [
      { key: "data.cStNo", label: "工艺卡号" },
      { key: "data.cSgSign", label: "钢种牌号" },
      { key: "data.cSgStd", label: "执行标准" },
      { key: "data.cFactoryId", label: "厂别" },
      { key: "data.nVersion", label: "版次" },
      { key: "data.cRemark", label: "备注" },
      { key: "data.createTime", label: "创建时间" },
      { key: "data.creator", label: "创建人" },
    ],
    lists: [
      {
        key: "Tqmts02s",
        label: "成分工艺",
        columns: [
          { key: "idxNo", label: "索引号" },
          { key: "elmCode", label: "元素代码" },
          { key: "elmName", label: "元素名称" },
          { key: "elmUnit", label: "单位" },
          { key: "mainMin", label: "工艺下限" },
          { key: "mainAim", label: "目标值" },
          { key: "mainMax", label: "工艺上限" },
        ],
      },
      {
        key: "Tqmts0X10s",
        label: "牌号标准",
        columns: [
          { key: "cStNo", label: "工艺卡号" },
          { key: "cSgSign", label: "钢种牌号" },
          { key: "cSgStd", label: "执行标准" },
          { key: "cSgCode", label: "牌号代码" },
        ],
      },
      {
        key: "Tqmts0X20s",
        label: "设备锭坯",
        columns: [
          { key: "cStNo", label: "工艺卡号" },
          { key: "cIngot", label: "锭坯型" },
          { key: "cEquipment", label: "设备" },
        ],
      },
    ],
    sample: {
      data: {
        id: "TQMTS001",
        cStNo: "GY260924",
        cSgSign: "Q235B",
        cSgStd: "GB/T 700-2006",
        cFactoryId: "F01",
        nVersion: 1,
        cRemark: "样例工艺卡",
        createTime: "2026-09-24 08:00:00",
        creator: "admin",
        cArchiveFlag: "N",
        cProdClassDesc: "板材",
        cDeliveryStateDesc: "热轧",
      },
      Tqmts02s: [
        {
          idxNo: "01",
          elmCode: "C",
          elmName: "碳",
          elmUnit: "%",
          mainMin: 0.12,
          mainAim: 0.16,
          mainMax: 0.2,
        },
      ],
      Tqmts0X10s: [
        {
          cStNo: "GY260924",
          cSgSign: "Q235B",
          cSgStd: "GB/T 700-2006",
          cSgCode: "SG001",
        },
      ],
      Tqmts0X20s: [
        {
          cStNo: "GY260924",
          cIngot: "220方",
          cEquipment: "LF精炼炉",
        },
      ],
    },
  },
];

export function findPrintSchema(aqnOrName: string | undefined | null): PrintSchema | undefined {
  if (!aqnOrName) return undefined;
  return (
    PRINT_SCHEMAS.find((s) => s.aqn === aqnOrName) ||
    PRINT_SCHEMAS.find((s) => s.name === aqnOrName) ||
    PRINT_SCHEMAS.find((s) => aqnOrName.includes(s.name))
  );
}

/** 扁平化嵌套对象 → setVariables 用；数组与根级列表原样保留 */
export function flattenForVariables(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      out[key] = v;
      out[k] = v;
    } else if (v && typeof v === "object" && !(v instanceof Date)) {
      Object.assign(out, flattenForVariables(v as Record<string, unknown>, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

/** 该 schema 的一条样例（列表长度=1）+ 扁平变量 */
export function buildSamplePayload(schema: PrintSchema): {
  sample: Record<string, unknown>;
  variables: Record<string, unknown>;
} {
  const sample = schema.sample;
  return { sample, variables: flattenForVariables(sample) };
}

/** 设计器左侧变量树节点（template.ext.availableVariables） */
export interface VariableTreeItem {
  id: string;
  label: string;
  children?: VariableTreeItem[];
}

/**
 * 由 schema 生成 availableVariables 树。
 * 打印设计器字段列表读 ext.availableVariables；仅 setVariables 不会出现在设计面板。
 */
export function buildAvailableVariables(schema: PrintSchema): VariableTreeItem[] {
  const roots: VariableTreeItem[] = [];
  const groups = new Map<string, VariableTreeItem>();
  for (const f of schema.fields) {
    const dot = f.key.indexOf(".");
    if (dot < 0) {
      roots.push({ id: f.key, label: f.label });
      continue;
    }
    const gid = f.key.slice(0, dot);
    let g = groups.get(gid);
    if (!g) {
      g = { id: gid, label: gid, children: [] };
      groups.set(gid, g);
      roots.push(g);
    }
    g.children!.push({ id: f.key, label: f.label });
  }
  for (const list of schema.lists) {
    roots.push({
      id: list.key,
      label: list.label,
      children: list.columns.map((c) => ({ id: `${list.key}.${c.key}`, label: c.label })),
    });
  }
  return roots;
}
