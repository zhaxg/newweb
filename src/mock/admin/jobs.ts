import { loadJobs, loadScheduler, saveJobs, saveScheduler } from "./store";
import type { HmxBackgroudJobInfo, HmxBackgroundJobTypeInfo } from "@/api/admin/types";
import { YesNo } from "@/api/admin/enums";
import { API_BASE, getBody, ok, type RouteMap } from "./core";

const P = `${API_BASE}/quartzNet`;

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function plus(min: number): string {
  const d = new Date(Date.now() + min * 60_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const jobRoutes: RouteMap = {
  [`post ${P}/queryAllBackgroudJobs`]: (config) => ok(config, loadJobs()),
  [`post ${P}/getSchedulerStatus`]: (config) => ok(config, loadScheduler()),
  [`post ${P}/insertOrReplaceBackgroudJob`]: (config) => {
    const job = getBody<HmxBackgroudJobInfo>(config);
    const rows = loadJobs();
    const index = rows.findIndex((r) => r.id === job.id);
    const record: HmxBackgroudJobInfo = {
      ...job,
      cSetupTime: job.cSetupTime || stamp(),
      cLastTime: job.cLastTime || "",
      cNextTime: job.enable === YesNo.Y ? plus(job.nIntervalMinutes || 5) : "",
    };
    if (index >= 0) rows[index] = record;
    else rows.push(record);
    saveJobs(rows);
    // hmx_web 语义：返回空 = 成功
    return ok(config, null);
  },
  [`post ${P}/manualExcuteJob`]: (config) => {
    const job = getBody<HmxBackgroudJobInfo>(config);
    const rows = loadJobs();
    const target = rows.find((r) => r.id === job.id);
    if (target) {
      target.cLastTime = stamp();
      target.cLastMessage = "已手动执行一次";
      target.cNextTime = plus(target.nIntervalMinutes || 5);
    }
    saveJobs(rows);
    return ok(config, null);
  },
  [`post ${P}/removeBackgroudJob`]: (config) => {
    const job = getBody<HmxBackgroudJobInfo>(config);
    saveJobs(loadJobs().filter((r) => r.id !== job.id));
    return ok(config, null);
  },
  [`post ${P}/startScheduler`]: (config) => {
    const s = loadScheduler();
    s.enable = true;
    s.lastUpdateTime = stamp();
    saveScheduler(s);
    return ok(config, null);
  },
  [`post ${P}/stopScheduler`]: (config) => {
    const s = loadScheduler();
    s.enable = false;
    s.lastUpdateTime = stamp();
    saveScheduler(s);
    return ok(config, null);
  },
  [`post ${P}/getAvaliableBackgroudJobs`]: (config) => {
    const list: HmxBackgroundJobTypeInfo[] = [
      { assemblyQualifiedName: "Hmx.Http.Core.Scheduler.SimpleJobTest, Hmx.Http.Core", description: "简单样例任务" },
      { assemblyQualifiedName: "Hmx.Http.Core.Scheduler.LogCleanJob, Hmx.Http.Core", description: "日志清理任务" },
    ];
    return ok(config, list);
  },
  [`post ${P}/getNextCronTimes`]: (config) => ok(config, []),
};
