/** 角色主档（对应原 WinForms HmxRole 表）行类型；数据源见 src/mock/admin/data/roles.ts */
export interface HmxRole {
  id: string;
  cRoleName: string;
  cDescription: string;
  creator: string;
  createTime: string;
  lastModifier: string;
  lastModifyTime: string;
  /** "1" 正常 / "0" 禁用 */
  cState: string;
}

/** 用户行只读引用（角色关联用户列表用） */
export interface UserRowLite {
  id: string;
  cUserName: string;
}
