/**
 * 表单与查询条件里的日期换算。
 *
 * 为什么要单独一个文件：PrimeVue `DatePicker` 的 v-model 是 **`Date` 对象**，
 * 而本域行数据与请求参数一律是定长字符串 `YYYY-MM-DD` / `YYYY-MM-DD HH:mm:ss`
 * （mock 的 `dayRange`/`dateRange` 靠**字典序**比较，见 `src/mock/equipment/query.ts` 的注释）。
 * 两端不换算会出两种坏结果：
 * - 把行里的字符串直接塞给 DatePicker → 日历不显示已存值，编辑一保存日期就丢；
 * - 把 `Date` 直接 JSON 提交 → 存进去的是 `2026-09-26T16:00:00.000Z`，
 *   字典序比较立刻失真（还带时区偏移）。
 *
 * 不用 `.toLocaleDateString()`：它按运行环境本地化，容器/浏览器区域设置一变格式就变。
 * 一律手工拼 `YYYY-MM-DD`，与种子数据同一套写法。
 */

const pad2 = (n: number) => String(n).padStart(2, "0");

/** `Date` → `YYYY-MM-DD` */
export function toDay(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** `Date` → `YYYY-MM`（月度结算单/月度报表的口径都是月，DatePicker `view="month"` 回的是 Date） */
export function toMonth(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** `Date` → `YYYY-MM-DD HH:mm:ss`（本地时区，与种子的时间戳同为本地口径） */
export function toStamp(d: Date): string {
  return `${toDay(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/**
 * 字符串 → `Date`（回填表单用）。
 * 认 `YYYY-MM-DD`、`YYYY-MM`、`YYYY-MM-DD HH:mm:ss`、ISO 带 T 四种；解析失败回 `null`（控件显示占位符）。
 */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  const s = String(value ?? "").trim();
  if (!s) return null;
  // 手工拆而不是 new Date(s)：`2026-09-27` 会被按 UTC 解析，在东八区显示成前一天
  const m = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?[T ]?(?:(\d{1,2}):(\d{1,2}))?(?::(\d{1,2}))?/.exec(s);
  if (!m) return null;
  const [, y, mo = "1", d = "1", h = "0", mi = "0", se = "0"] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 表单提交时的日期字段取值：`Date` 转字符串，已经是字符串就原样送。
 * `withTime` 决定带不带时分秒——**由字段自己的配置决定，不看值里有没有时分**，
 * 否则同一个字段先填后改就会换口径。
 */
export function pickDate(value: unknown, withTime: boolean): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  return withTime ? toStamp(value as Date) : toDay(value as Date);
}
