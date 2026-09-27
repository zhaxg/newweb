import type { RouteMap } from "../admin/core";
import type { FlowDirection, KpiBoardDto, SankeyDto } from "@/api/energy/types";
import { ems, refreshKpiBoard, unitTree } from "./store";
import * as M from "./data/model";
/**
 * 七向 → hex。与 `pages/energy/emsTheme.FLOW_CHART` **同值**（那份是 class 侧的清单）。
 * 服务端造节点色，是因为节点名是 `<工序>·<方向>`——从名字里拆方向再查色表，
 * 等于把 `model.sankeyNodeName` 的拼接规则复制到展示层，改拼接就漏一处。
 * ⚠️ 改色要**两处一起**（这两份是同一个决定的两次落笔）。
 */
const FLOW_HEX: Record<string, string> = {
  购入: "#38BDF8",
  自产: "#22C55E",
  转换: "#A78BFA",
  消耗: "#F59E0B",
  回收: "#94A3B8",
  损失: "#FB923C",
  外供: "#EF4444",
};
import { getHandler, listAll, postHandler } from "./query";
import { PERSONS } from "./data/seed";

/**
 * 能源域的无分页聚合读取（下拉候选、树、看板数字）。
 *
 * 这一层的存在理由不是"少写一次分页"，而是**候选项必须和账同源**：
 * 介质、用能单元、人名如果在各页 `import` 常量表，EG0001 改一条介质系数、EG0002 加一个单元，
 * 页面下拉还是老那份——本域所有主数据都是 `ems` 里的活数组，走接口才拿得到改动后的结果。
 *
 * `getHandler` 读的是 `config.params`（axios `params`），与 `listHandler` 读 body 是两条路，
 * 别在 GET 端点上写 `getBody`：真接后端时 query 与 body 的解析位置不一样，改了会当场失效。
 */
export const energyOverviewRoutes: RouteMap = {
  /* 人名候选：报警接收人、调度签发人、补录人、校核人共用同一批人（见 seed.PERSONS 的说明） */
  "get /ems/person/list": listAll(() => PERSONS),

  /* 介质下拉（几乎每页的过滤器都要它，也是 emsTheme 的专色来源） */
  "get /ems/medium/list": listAll(() => ems.mediums),

  "get /ems/unit/list": listAll(() => ems.units),
  /** 层级树：`rootId` 不给就是全厂；给了则连子树一起返回、已按 path 深度优先排序 */
  "get /ems/unit/tree": getHandler((q) => unitTree(q.rootId ? String(q.rootId) : undefined)),

  /* ── EC 采集层的候选（P2）───────────────────────────────────────────── */

  /**
   * 计量点全量。EC0001 的网络树要在**一次请求**里把点挂到单元树上（树深度 4 级、点 200+，
   * 走 listPage 分页拼不出完整树），EC0005 的测点选择器和 EC0004 的"对应计量点"下拉也读它。
   */
  "get /ems/meterPoint/list": listAll(() => ems.meterPoints),

  /** 通道下拉（EC0001 给计量点指定通道、EC0002 顶部统计现算「在线 / 异常 / 离线」） */
  "get /ems/channel/list": listAll(() => ems.channels),

  /* ── EO 总览（P6）──────────────────────────────────────────────────── */

  /**
   * EO0001 大屏 / EO0002 看板 / 首页**共用**的 KPI 聚合。
   *
   * 三个消费方读同一个 `refreshKpiBoard()`——大屏上说的数必须等于看板说的数、
   * 也等于首页顶栏那个数（本域红线：页间口径一致）。
   * 月账部分现算于 `model.kpiBoard()`，柜位/活动报警/负荷实时态读 `ems`，
   * **两边都不存字段**：存了就会漂。
   *
   * 走 `POST` 而不是 GET：全站唯一演示时钟的状态要能被同一套 axios 拦截器
   * （认证、信封）处理，`query` 参数在真实后端语义里是查询、不该携带看板语义。
   */
  "post /ems/overview/kpi": postHandler(() => refreshKpiBoard() as KpiBoardDto),

  /**
   * EO0003 能流网络（桑基）。
   *
   * `media` 只能是介质编码（ELEC/BFG/COG/LDG/STEAM…），非法值回落到 BFG——
   * 不校验的话 `MEDIUMS[media]` 取 `undefined.name` 会直接抛，整页白。
   * `dirs` 从 `links` 的目标节点名里**反推**（节点名形如 `烧结厂·消耗`，
   * `model.sankeyNodeName` 拼的），出现过哪些方向就回哪些，图例不挂空项。
   */
  "post /ems/overview/sankey": postHandler((b) => {
    const media = String(b.media ?? "BFG");
    const d = M.sankeyData(media as never, ems.effect);
    const dirs: FlowDirection[] = [];
    const seen = new Set<string>();
    for (const n of [...d.nodes.map((x) => x.name), ...d.links.map((l) => l.target)]) {
      const dir = n.split("·").at(-1);
      if (dir && !seen.has(dir)) {
        seen.add(dir);
        dirs.push(dir as FlowDirection);
      }
    }
    /* 按七向的固定顺序排（图例从左到右读得顺），不按出现顺序——
       出现顺序随介质切换跳来跳去，图例一换介质就重排，看着像数据变了 */
    const FLOW_ORDER: FlowDirection[] = ["购入", "自产", "转换", "消耗", "回收", "损失", "外供"];

    /* 节点上色：首节点（介质名）给介质专色，其余按 `<工序>·<方向>` 的**方向**取色。
       方向色在服务端填，页面不用从名字里拆（拆 = 复制 `sankeyNodeName` 的拼接规则）。
       `MEDIUMS[media]` 越界时回落主色——上一句已把非法 media 收敛，这里兜的是
       「字典里真没有这个码」的极端情况，不能让一张图因为一个未知码白屏 */
    const mediumColor = (M.MEDIUMS as Record<string, { color?: string } | undefined>)[media]?.color ?? "#38BDF8";
    const nodes = d.nodes.map((n, i) => {
      if (i === 0) return { ...n, itemStyle: { color: mediumColor } };
      const dir = n.name.split("·").at(-1) ?? "";
      return { ...n, itemStyle: { color: FLOW_HEX[dir] ?? "#64748B" } };
    });

    return { ...d, nodes, dirs: FLOW_ORDER.filter((f) => dirs.includes(f)) } satisfies SankeyDto;
  }),

  /**
   * 首页顶栏的四个「实时口径」。
   *
   * 首页不自己算数，也不重复拉全量看板——它只回答一句「现在怎么样」：
   * 放散率、自发电率、活动报警、待办。四个数都从 `refreshKpiBoard` 里取，
   * 保证首页与大屏永远同数（先写首页再写大屏的年代最容易在这里分叉）。
   */
  "get /ems/overview/home": getHandler(() => {
    const k = refreshKpiBoard();
    return {
      month: k.month,
      ventRatePct: k.ventRatePct,
      ventTarget: M.KPI_TARGETS.ventRatePct,
      selfGenRatePct: k.selfGenRatePct,
      selfGenTarget: M.KPI_TARGETS.selfGenRatePct,
      activeAlarms: k.activeAlarms,
      urgentAlarms: k.urgentAlarms,
      openOrders: k.openOrders,
      pendingTickets: k.pendingTickets,
      compositeKgce: k.compositeKgce,
      compositeTarget: M.KPI_TARGETS.compositeKgce,
      at: k.at,
    };
  }),
};
