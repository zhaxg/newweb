/** 服务端统一返回信封（对应 Hmx.Service.Admin.Services 的 Result） */
export interface Result<T = any> {
  /** 认证失败时真实后端发的是**字符串** "401"（`{success:false, code:"401", message:"hmxapi: User is not authenticated"}`，
   *  HTTP 状态仍是 200）；mock 发的是数字。故放宽为 number | string——判定一律走 String() 归一。 */
  code: number | string;
  success: boolean;
  message: string;
  data: T;
}

/** 业务失败（HTTP 200 但 success=false）时抛出的错误 */
export class ApiError extends Error {
  code: number | string;

  constructor(code: number | string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}
