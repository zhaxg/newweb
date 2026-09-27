import type { RouteMap } from "../admin/core";
import {
  moveUnit,
  removeMedium,
  removeRow,
  saveAlarmRule,
  saveMedium,
  savePriceTemplate,
  saveUnit,
  toggleIn,
  togglePriceTemplate,
  ems,
} from "./store";
import { postHandler } from "./query";
import type { ActionResult } from "@/api/energy/types";

/**
 * 能源域的写端点。
 *
 * 两条贯穿全文件的约定：
 * 1. **业务拒绝不走 HTTP 错误**：删除有定额的介质、结算已定稿后重算实绩，回的都是
 *    `HTTP 200 + {ok:false, msg}`。真实后端就是这么发的（`src/api/_core/request.ts` 的
 *    拦截层只处理传输与认证错误），mock 若图省事发 4xx，页面就会在演示环境正常、
 *    接真后端时把拒绝当成异常弹红色堆栈——本仓已因这类"mock 太像真"踩过一次（AGENTS §6）。
 * 2. **成功回 `data: 受影响的行`**，页面拿到就能就地更新那一行，不必重查整页。
 *    配置页的编辑弹窗全靠这个把改动立刻显示出来。
 *
 * `removeRow` 这类通用助手不在这儿做二次校验：校验住在 store（它才知道有没有定额挂在身上）。
 */
export const energyActionRoutes: RouteMap = {
  /* ── 介质 ─────────────────────────────────────────────────────────── */
  "post /ems/medium/save": postHandler((b) => saveMedium(b)),
  "post /ems/medium/remove": postHandler((b) => removeMedium(String(b.id))),

  /* ── 用能单元 ─────────────────────────────────────────────────────── */
  "post /ems/unit/save": postHandler((b) => saveUnit(b)),
  "post /ems/unit/move": postHandler((b) => moveUnit(String(b.id), (b.dir ?? "up") as "up" | "down" | "in" | "out")),

  /* ── 报警规则 ─────────────────────────────────────────────────────── */
  "post /ems/alarmRule/save": postHandler((b) => saveAlarmRule(b)),
  "post /ems/alarmRule/toggle": postHandler((b) => toggleIn(ems.alarmRules, String(b.id))),
  "post /ems/alarmRule/remove": postHandler((b) => {
    const hit = ems.alarmRules.find((r) => r.id === b.id);
    return removeRow(ems.alarmRules, String(b.id))
      ? { ok: true, msg: `${hit?.name ?? b.id} 已删除` }
      : { ok: false, msg: "规则不存在" };
  }),

  /* ── 电价模板 ─────────────────────────────────────────────────────── */
  "post /ems/priceTemplate/save": postHandler((b) => savePriceTemplate(b)),
  "post /ems/priceTemplate/toggle": postHandler((b) => togglePriceTemplate(String(b.id))),

  /* ── 导出（模拟）─────────────────────────────────────────────────── */
  /**
   * 只回一个**文件名**，不落盘、不生成内容。
   *
   * 为什么不回 `null`：toast 念出「能耗实绩_2026-09.csv 已提交导出队列」才像一件真发生过的操作，
   * 「操作成功」四个字客户一眼就划过去了。文件名里的中文表头与页面标题同一批措辞（见下）。
   *
   * 真接后端时这个端点换成回下载链接，页面零改动——所以它现在**必须**留着，
   * 而不是在页面上直接 `new Blob()` 拼 CSV（那会把导出这件事做进前端，接口形状就丢了）。
   *
   * 表名与页面标题措辞一致是刻意的（toast 里念出来的名字和客户刚看到的表头对不上，
   * 就是本域唯一红线意义上的"页间矛盾"），但这里**不 import 页面**：mock 在平台层，
   * 反向依赖 `src/pages` 会让 mock 跟着页面一起进业务 chunk。
   */
  "post /ems/export": postHandler((b): ActionResult => {
    const name = EXPORT_NAMES[String(b.entity ?? "")] ?? String(b.entity ?? "数据");
    const month = b.month ? `_${b.month}` : b.date ? `_${b.date}` : "";
    return { ok: true, msg: `${name}${month}.csv 已提交导出队列` };
  }),
};

/**
 * 导出实体 → 文件名。
 *
 * 键就是页面送出的 `entity`：**一页一表**时是页面代号（`spec.code`），
 * 一页两表的 EG0003 由右表用 `spec.exportEntity` 给出自己的表名。
 * 加新页面时往这里补一行——漏了不会坏，文件名会退化成 `EP0002_2026-09.csv`（能读，就是不中文）。
 */
const EXPORT_NAMES: Record<string, string> = {
  EG0001: "能源介质配置",
  EG0002: "用能单元",
  EG0003: "报警规则",
  priceTemplate: "分时电价模板",
};
