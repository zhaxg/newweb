/**
 * 碳资产「carbonAnalyse」组查询种子（1 个端点）
 *
 * 抓取自线上 https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets（2026-09-26，只读查询）。
 * 每个端点最多存 50 行，超出部分的 total 记在下方注释里（mock 用实际条数返回 total，保证分页自洽）。
 * id 类超 2^53 的数字已存成原始字符串（JS 解析会取整，回查会 404，见 api/carbon/types.ts）。
 */

/** `POST /business/analysisRecord/page` 线上 total=0 */
export const seedAnalysisRecords: any[] = [];
