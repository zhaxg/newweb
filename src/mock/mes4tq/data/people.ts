import type { Person } from "@/api/mes4tq/types";

/**
 * 虚拟厂人员、班组与班次（规格书 B9「模拟数据种子」的虚拟厂人员表 + B1 的排班制度）。
 *
 * **为什么人名走接口而不是页面写死**：投料实绩的「操作人」、检验委托的「取样人/判定人」、
 * 成本调差的「调差人」、接口日志的「触发人」在演示叙事里必须是**同一批人**。
 * 写死在页面里就会出现烧结页的操作人叫「钱工」、高炉页的同一个人叫「孙工」——
 * 而「页间矛盾」是这份规格书点名的唯一硬红线。
 *
 * 人员表按 B9 给足七个具名角色，再补几个班组长把三班倒填满：
 * 演示里要出现「甲班孙工」「乙班李工」这种组合，只有七个名字会在两页里撞成同一个人。
 */
export const PEOPLE: Person[] = [
  { id: "U-01", name: "赵工", post: "生产调度", dept: "铁区总调度" },
  { id: "U-02", name: "钱工", post: "烧结调度", dept: "烧结车间" },
  { id: "U-03", name: "孙工", post: "高炉工长", dept: "1#高炉" },
  { id: "U-04", name: "李工", post: "球团工长", dept: "2#竖炉" },
  { id: "U-05", name: "周工", post: "质量主管", dept: "技质部" },
  { id: "U-06", name: "吴工", post: "成本会计", dept: "财务部" },
  { id: "U-07", name: "郑工", post: "配料技术员", dept: "技质部" },
  /* 下面几位把三班倒的班组填满（B1：甲/乙/丙/丁四班，每班 8 小时） */
  { id: "U-08", name: "王工", post: "值班工长", dept: "1#高炉" },
  { id: "U-09", name: "冯工", post: "值班工长", dept: "2#高炉" },
  { id: "U-10", name: "陈工", post: "值班工长", dept: "3#高炉" },
  { id: "U-11", name: "褚工", post: "烧结工长", dept: "1#烧结机" },
  { id: "U-12", name: "卫工", post: "烧结工长", dept: "2#烧结机" },
  { id: "U-13", name: "蒋工", post: "焦化班长", dept: "焦化车间" },
  { id: "U-14", name: "沈工", post: "原料班长", dept: "原料车间" },
  { id: "U-15", name: "韩工", post: "白灰班长", dept: "白灰车间" },
  { id: "U-16", name: "杨工", post: "检验员", dept: "技质部" },
  { id: "U-17", name: "朱工", post: "计量员", dept: "计量站" },
  { id: "U-18", name: "秦工", post: "点检员", dept: "设备科" },
];

export const PERSON_BY_ID: Record<string, Person> = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));

/** 按岗位取人（成本会计只有吴工一个，质量主管只有周工一个——演示叙事要求唯一） */
export function personByPost(post: string): Person | undefined {
  return PEOPLE.find((p) => p.post === post);
}

/* ── 班组与班次（TG0004 排班配置）────────────────────────────────────────── */

/** 班组（B1：甲/乙/丙/丁四班倒） */
export const TEAMS = [
  { id: "T-A", name: "甲班", leader: "U-03", members: 42 },
  { id: "T-B", name: "乙班", leader: "U-08", members: 40 },
  { id: "T-C", name: "丙班", leader: "U-09", members: 41 },
  { id: "T-D", name: "丁班", leader: "U-10", members: 39 },
];

/**
 * 班次（B1：A 08:00-16:00 / B 16:00-00:00 / C 00:00-08:00）。
 *
 * `seq` 是**生产日的班序**而不是钟点序：C 班（00:00-08:00）在钟点上最早，
 * 但它属于**前一个生产日**——日报按「A→B→C」累加才对得上「日产量」。
 * 这个坑很隐蔽：按钟点排会把 C 班算到次日，日报就比月报少一个班。
 */
export const SHIFTS = [
  { id: "S-A", code: "A", name: "早班", beginTime: "08:00", endTime: "16:00", seq: 1 },
  { id: "S-B", code: "B", name: "中班", beginTime: "16:00", endTime: "00:00", seq: 2 },
  { id: "S-C", code: "C", name: "夜班", beginTime: "00:00", endTime: "08:00", seq: 3 },
];

/** 班次代码 → 中文（列表里显示「早班」比「A」好读） */
export const SHIFT_NAME: Record<string, string> = Object.fromEntries(SHIFTS.map((s) => [s.code, s.name]));
