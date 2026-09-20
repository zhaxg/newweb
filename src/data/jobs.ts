import type { HmxBackgroudJobInfo, HmxSchedulerStatusInfo } from "@/api/admin/types";
import { HmxJobMisfiredEnums, YesNo } from "@/api/admin/enums";

/**
 * 计划任务/调度器 mock「数据库」：直接以后端 types 形态持久化（hmx.jobs / hmx.scheduler）。
 * 页面通过 quartzNetApi 走接口层，mock adapter 读写这里。
 */

const JOBS_KEY = "hmx.jobs";
const SCHEDULER_KEY = "hmx.scheduler";

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function nowPlus(min: number): string {
  return fmt(new Date(Date.now() + min * 60_000));
}

function seedJobs(): HmxBackgroudJobInfo[] {
  return [
    {
      id: "job-sample",
      cName: "样例任务",
      cTrigerName: "5分钟",
      cSetupTime: fmt(new Date()),
      cCronExp: "",
      nIntervalMinutes: 5,
      nRepetCount: -1,
      nDelayMinutes: 0,
      cNextTime: nowPlus(5),
      cLastTime: fmt(new Date()),
      cLastMessage: "执行成功",
      cScheduler: "默认调度器",
      cAssemblyQualifiedName: "Hmx.Http.Core.Scheduler.SimpleJobTest, Hmx.Http.Core",
      enable: YesNo.Y,
      enablePaiallel: YesNo.N,
      cFlagMisfired: HmxJobMisfiredEnums.ExecuteNow,
    },
    {
      id: "job-clean",
      cName: "日志清理任务",
      cTrigerName: "每天",
      cSetupTime: fmt(new Date()),
      cCronExp: "0 0 3 * * ?",
      nIntervalMinutes: 1440,
      nRepetCount: -1,
      nDelayMinutes: 0,
      cNextTime: nowPlus(1440),
      cLastTime: fmt(new Date()),
      cLastMessage: "等待执行",
      cScheduler: "默认调度器",
      cAssemblyQualifiedName: "Hmx.Http.Core.Scheduler.LogCleanJob, Hmx.Http.Core",
      enable: YesNo.N,
      enablePaiallel: YesNo.N,
      cFlagMisfired: HmxJobMisfiredEnums.ExecuteNext,
    },
  ];
}

function seedScheduler(): HmxSchedulerStatusInfo {
  return { enable: true, schedulerName: "默认调度器", lastUpdateTime: fmt(new Date()) };
}

export function loadJobs(): HmxBackgroudJobInfo[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    if (raw) return JSON.parse(raw) as HmxBackgroudJobInfo[];
  } catch {
    /* 回退种子 */
  }
  const seeded = seedJobs();
  saveJobs(seeded);
  return seeded;
}

export function saveJobs(rows: HmxBackgroudJobInfo[]): void {
  localStorage.setItem(JOBS_KEY, JSON.stringify(rows));
}

export function loadScheduler(): HmxSchedulerStatusInfo {
  try {
    const raw = localStorage.getItem(SCHEDULER_KEY);
    if (raw) return JSON.parse(raw) as HmxSchedulerStatusInfo;
  } catch {
    /* 回退种子 */
  }
  const seeded = seedScheduler();
  saveScheduler(seeded);
  return seeded;
}

export function saveScheduler(status: HmxSchedulerStatusInfo): void {
  localStorage.setItem(SCHEDULER_KEY, JSON.stringify(status));
}
