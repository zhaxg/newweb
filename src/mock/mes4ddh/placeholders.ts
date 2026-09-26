import { ok, type RouteMap } from "../admin/core";

/**
 * 迁移占位路由 —— 由 `node temp/mig/gen-mock.mjs --write` 生成，请勿手改。
 *
 * 只做两件事：**查询类回 ≤3 条演示行**、**其余回成功信封**。没有过滤、没有分页、没有落库
 * （规则见 .qoder/skills/winforms-screen-migration/references/backend-api.md §5）。
 * 演示行字段由 `demoRow()` 兜底生成：先给常见 MES 列真实假值，其它列名按前缀给 nXxx→数字、
 * dXxx→日期、其余→字符串，目的是「页面点开不 404、表格里有东西看」，不代表业务数据。
 * 键是 swagger 路径（不含请求层 /api 前缀），与真实后端同形。
 */

const DEMO_DAY = ["2026-09-01 08:00:00", "2026-09-02 16:00:00", "2026-09-03 00:00:00"];
const KNOWN: Record<string, (i: number) => unknown> = {
  id: (i) => `DEMO-${i + 1}`,
  cLineCode: () => "ZG01",
  cPieceNo: (i) => `SLAB260900${i + 1}`,
  cBatchNo: (i) => `B260900${i + 1}`,
  cBatchOrder: (i) => `ZP260900${i + 1}`,
  cOrderNo: (i) => `ORD260900${i + 1}`,
  cPlateNo: (i) => `P260900${i + 1}`,
  cStove: (i) => `S26090${i + 1}`,
  cSgCode: (i) => ["Q235B", "Q345B", "45#"][i],
  cPrintCode: (i) => `PR260900${i + 1}`,
  cCrewCode: (i) => ["甲", "乙", "丙"][i],
  cShiftCode: (i) => ["早", "中", "夜"][i],
  nStatus: (i) => i + 1,
  nThick: (i) => 20 + i,
  nWidth: (i) => 2500 + i * 10,
  nLen: (i) => 9000 + i * 100,
  nWgt: (i) => 12.5 + i,
  createTime: (i) => DEMO_DAY[i],
  creator: () => "admin",
  lastModifyTime: (i) => DEMO_DAY[i],
  lastModifier: () => "admin",
};

/** 演示行：常见列给真实假值，其余列名按前缀兜底（nXxx 数字 / dXxx 日期 / cXxx 代码 / 其它中文串），
 *  目的是「页面点开不 404、表格里有东西看」，不代表业务数据。set 也接，行内编辑不至于报错。 */
function demoRow(i: number): Record<string, unknown> {
  const seen = new Map<string, unknown>();
  return new Proxy({} as Record<string, unknown>, {
    get: (_t, key) => {
      if (typeof key !== "string") return undefined;
      if (seen.has(key)) return seen.get(key);
      const known = KNOWN[key]?.(i);
      const v =
        known ??
        (/^n[A-Z]/.test(key)
          ? (i + 1) * 10 + key.length
          : /^d[A-Z]/.test(key)
            ? DEMO_DAY[i]
            : /^c[A-Z]/.test(key)
              ? `${key.toUpperCase()}${i + 1}`
              : "演示值");
      seen.set(key, v);
      return v;
    },
    set: (_t, key, value) => {
      if (typeof key === "string") seen.set(key, value);
      return true;
    },
    has: () => true,
    ownKeys: () => Reflect.ownKeys(KNOWN),
    getOwnPropertyDescriptor: (_t, key) => ({
      configurable: true,
      enumerable: true,
      value: KNOWN[key as string]?.(i),
    }),
  });
}

const QUERY_ROWS = (n = 3) => Array.from({ length: n }, (_, i) => demoRow(i));

/** dDH.Service.Interface.Services.BX */
export const routesDdhServiceInterfaceServicesBX: RouteMap = {
  [`post /dDH.Service.Interface.Services.BX/bx/handleHRLog`]: (config) => ok(config, null),
  [`post /dDH.Service.Interface.Services.BX/bxcomMessage/send8JP401_2`]: (config) => ok(config, null),
  [`post /dDH.Service.Interface.Services.BX/bxcomMessage/send8JP403`]: (config) => ok(config, null),
  [`post /dDH.Service.Interface.Services.BX/bxcomMessage/sendMEL02`]: (config) => ok(config, null),
  [`post /dDH.Service.Interface.Services.BX/bxcomMessage/sendMEL204`]: (config) => ok(config, null),
  [`post /dDH.Service.Interface.Services.BX/bxcomTest/demo_ReceivedByBxcom`]: (config) => ok(config, null),
};

/** dDH.Service.LIMS.Services */
export const routesDdhServiceLIMSServices: RouteMap = {
  [`post /dDH.Service.LIMS.Services/qZ5000/addReSamplePlan`]: (config) => ok(config, null),
  [`post /dDH.Service.LIMS.Services/qZ5000/removeReSamplePlan`]: (config) => ok(config, null),
  [`post /dDH.Service.LIMS.Services/testJob/getShowedQy`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.LIMS.Services/tql3900/addFYQySj`]: (config) => ok(config, null),
  [`post /dDH.Service.LIMS.Services/tql3900/addNewSampleTest`]: (config) => ok(config, null),
  [`post /dDH.Service.LIMS.Services/tql3900/addQySj`]: (config) => ok(config, null),
  [`post /dDH.Service.LIMS.Services/tql3900/cancelFYQySj`]: (config) => ok(config, null),
  [`post /dDH.Service.LIMS.Services/tql3900/cancelNewSampleTest`]: (config) => ok(config, null),
  [`post /dDH.Service.LIMS.Services/tql3900/cancelQySj`]: (config) => ok(config, null),
  [`post /dDH.Service.LIMS.Services/tql3900/cancelSamp`]: (config) => ok(config, null),
  [`post /dDH.Service.LIMS.Services/tql3900/cancelSendFYSamp`]: (config) => ok(config, null),
  [`post /dDH.Service.LIMS.Services/tql3900/createSamp`]: (config) => ok(config, null),
  [`post /dDH.Service.LIMS.Services/tql3900/queryFYPlan`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.LIMS.Services/tql3900/queryQl3900`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.LIMS.Services/tql3900/queryQyPlan`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.LIMS.Services/tql3900/sendFYSamp`]: (config) => ok(config, null),
};

/** dDH.Service.SHR.Services.InterInfoQuery */
export const routesDdhServiceSHRServicesInterInfoQuery: RouteMap = {
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tdaZb001/getTdaZb001s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tdaZb037/queryTdaZb037`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tdaZb149/getTdaZb149s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tdaZb232/getTdaZb232s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1000/queryTiL2me01`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1000/queryTiL2Me011s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1030/ti1030Query`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1040/queryTi1040`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1050/queryTi1050`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1060/getHzTi1060`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1060/getTi1060DayHz`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1060/getTi1060GroupHz`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1060/queryTi1060`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1070/queryDS`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1070/queryDSS`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1200/getL2me12s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1210/getTi1210Dtos`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1210/getTi1211AuthorRank`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1210/getTi1211Dtos`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1210/getTi1211MonthRank`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1220/queryDetail`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1220/queryTi1220`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1220/queryYearDetial`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1230/queryDetail`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1230/queryTi1230`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1230/queryYearDetial`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1240/queryDetail`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1240/queryTi1240`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1240/queryYearDetial`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1250/queryDetail`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1250/queryTi1250`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1250/queryYearDetial`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1260/queryDetail`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1260/queryTi1260`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1260/queryYearDetial`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1280/get1280DayGroupDetails`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1280/get1280Details`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1280/getTi1280DayProductDtos`]: (config) =>
    ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1280/getTi1280FcDetails`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1280/getTi1280s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1280/getTi1280WgtDetails`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1290/getThr3010Fcdetails`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1290/getTi1290Dtos`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1300/addPlanProduct`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1300/getThr3010PlanProducts`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1300/getTi1300JQs`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1300/getTi1300Slabs`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1300/saveChanges`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1300/syncStopTime`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.InterInfoQuery/tI1300/updataNStatus`]: (config) => ok(config, null),
};

/** dDH.Service.SHR.Services.WorkPiece */
export const routesDdhServiceSHRServicesWorkPiece: RouteMap = {
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1000/installBear`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1000/outBear`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1000/queryBear`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1000/queryBearBox`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1000Del`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1000Finish`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1000Repair`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1000Scrap`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1010Del`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1010Finish`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1010Repair`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1010Scrap`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1020/delTdm1020`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1020/outBear`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1020/queryBearBox`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1020/queryTdm1020s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1020/resetTdm1020`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1020/scrapTdm1020`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1020/sendBx`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1020/syncTdm1030`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1030/againHandelTdm1030`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1030/queryTdm1030`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1030/saveTdm1030Changes`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1040/queryTdm1040s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1040/updateTdm1040`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1050/addTdm1050`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1050/getTdm1050Dtos`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1050/getTdm1050s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1050/saveTdm1050`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1060/editStatusTdm1060`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1060/getTdm1060Dtos`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1060/getTdm1060Includeds`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1060/getTdm1060s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1060/queryTdm1060DtoDay`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1070/delTdm1070`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services.WorkPiece/dM1070/getTdm1070`]: (config) => ok(config, QUERY_ROWS()),
};

/** dDH.Service.SHR.Services */
export const routesDdhServiceSHRServices: RouteMap = {
  [`post /dDH.Service.SHR.Services/hR1000/queryList`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR1000/saveChange`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR2000/addPlans`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR2000/closeThr2000s`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR2000/queryThr2000Dtos`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR2200/getSlabs`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR2200/saveJQPlan`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3000/buildPlateQy`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3000/cancelZp`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3000/changeJQPlan`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3000/getSlabs`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3000/moveThr3000`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3000/queryThr3000Dtos`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3000/queryThr3030s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3000/saveZp`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3000/testIsNeedQY`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3010/cancelEnter`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3010/cancelExit`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3010/elimFur`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3010/exitFur`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3010/queryNotInSlabs`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3010/queryTiL2me021s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3010/waste`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3030/queryThr3030s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3130/changePlans`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3400/queryList`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3600/endHl`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3600/queryDl`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3600/queryHls`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3600/queryHR4510s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3600/queryHR4510ToDays`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3600/setDefaultStack`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3600/startHl`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3610/getThr3010HlGys`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3610/saveChangeThr3010HlGy`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3700/checkIsQy`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR3700/createSjByPlan`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3700/getHqSlabs`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3700/getSlabs`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3700/queryJQPlans`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR3700/saveJq`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR4000/addSjByPlan`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR4000/addSjsByPiece`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hR4000/queryThr4000s`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hR4000/saveChange`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/hRLog/queryLogs`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/hRPrint/queryLog`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SHR.Services/thrSamp/addLog`]: (config) => ok(config, null),
  [`post /dDH.Service.SHR.Services/thrSamp/queryLog`]: (config) => ok(config, QUERY_ROWS()),
};

/** dDH.Service.SYD.Services */
export const routesDdhServiceSYDServices: RouteMap = {
  [`post /dDH.Service.SYD.Services/tyd1000/getStack`]: (config) => ok(config, QUERY_ROWS()),
  [`post /dDH.Service.SYD.Services/tyd2000/queryZhbSlabHz`]: (config) => ok(config, QUERY_ROWS()),
};

/** 全部迁移占位（mockAdapter 合并一次即可） */
export const mesPlaceholderRoutes: RouteMap = {
  ...routesDdhServiceInterfaceServicesBX /* 6 个 */,
  ...routesDdhServiceLIMSServices /* 16 个 */,
  ...routesDdhServiceSHRServicesInterInfoQuery /* 50 个 */,
  ...routesDdhServiceSHRServicesWorkPiece /* 36 个 */,
  ...routesDdhServiceSHRServices /* 49 个 */,
  ...routesDdhServiceSYDServices /* 2 个 */,
};
