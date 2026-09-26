import type { HmxRes } from "@/api/admin/types";

/**
 * tqmes 用户资源种子表 —— **占位空表**，待迁入真实 HM_X_RES 导出
 * （形状照 src/mock/admin/data/rescs.ts / src/mock/carbon/data/rescs.ts）。
 * 空表期间 tqmes 登录后可用页只有 builtin 静态路由（首页等），菜单为空。
 * 注册处在 src/mock/tenants.ts，补上数据即生效。
 */
export const seedRescsData: HmxRes[] = [];
