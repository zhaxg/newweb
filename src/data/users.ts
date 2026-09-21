/** 用户表（HM_X_USER 本地形态）行类型；数据源见 src/mock/admin/data/users.ts */
export interface HmxUser {
  id: string;
  cUserName: string;
  cUserType: string;
  cPhone: string;
  cSex: string;
  cEmail: string;
  /** "1" 正常 / "0" 禁用 */
  cStatus: string;
  cManager: boolean;
  creator: string;
  createTime: string;
  lastModifier: string;
  lastModifyTime: string;
  cDeptId: string | null;
  cPost: string;
  cDuty: string;
  cEdu: string;
  cNative: string;
  cPolitics: string;
  cNation: string;
  cIdCard: string;
  cSocialSec: string;
}
