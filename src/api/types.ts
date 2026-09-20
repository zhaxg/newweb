/** 服务端统一返回信封（对应 Hmx.Service.Admin.Services 的 Result） */
export interface Result<T = any> {
  code: number;
  success: boolean;
  message: string;
  data: T;
}

/** 业务失败（HTTP 200 但 success=false）时抛出的错误 */
export class ApiError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}
