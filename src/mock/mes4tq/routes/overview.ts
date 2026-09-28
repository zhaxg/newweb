import type { RouteMap } from "../../admin/core";
import { listAll, postHandler } from "../query";
import { PEOPLE } from "../data/people";

/**
 * 跨模块的共用读取：人名候选、导出、演示时钟。
 *
 * 为什么单独立一个文件而不是塞进某个模块的 `routes/*.ts`：
 * **人名、导出、时钟是全站都要的**，塞进 `basic.ts` 之后，
 * `workRawCoke` 的页面要引用就得反向依赖基础配置模块——
 * 而导出更是每个列表页都会打的端点，谁的页面里都不该承担它的实现。
 *
 * 路由键与 `src/api/mes4tq/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const overviewRoutes: RouteMap = {
  /**
   * 人名候选。
   *
   * 取样人、判定人、操作人、签发人、调差人在演示叙事里必须是**同一批人**——
   * 页面各写一份名单，会立刻出现「烧结页的操作人叫钱工、高炉页同一个人叫孙工」。
   * 候选走端点后，`data/people.ts` 的 `PEOPLE` 是唯一真源。
   */
  "get /tqmes/person/list": listAll(() => PEOPLE),

  /**
   * 导出（模拟）。
   *
   * **回一个文件名而不是 null**：页面 toast 里念出「生产日报_2026-09.csv 已提交导出队列」，
   * 比一句干巴巴的「操作成功」像真的。不落盘、不生成内容——演示到此为止。
   * 真接后端时这个端点换成返回下载链接，页面零改动。
   *
   * 这是本域**唯一的非 GET 端点**，但它不改任何数据，所以不违反「只查桩」的范围。
   * 文件名里带日期而不是「当前日期」：要与 `DEMO_DATE` 同源，
   * 否则演示截图上写 2026-09-27、导出的文件却叫别的日子。
   */
  "post /tqmes/export": postHandler((body) => {
    const entity = String(body.entity ?? "list");
    const entityName: Record<string, string> = {
      TG0001: "产线维护",
      TG0002: "物料管理",
      TG0003: "料仓台账",
      TG0004: "排班结果",
      TG0005: "技经指标",
      TI0001: "采集点位",
      TI0002: "采集结果",
      TI0003: "接口日志",
      TI0004: "能源数据接收",
    };
    const name = entityName[entity] ?? entity;
    return { ok: true, msg: `${name}_${DEMO_DATE}.csv 已提交导出队列` };
  }),
};
