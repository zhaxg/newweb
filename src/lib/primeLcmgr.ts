/* 未用参数加 _ 前缀：本文件是许可桩（vite alias 把 @primeui/license-manager 指到这里，
   恒返回 valid），签名要跟上游对齐故参数不能删；加前缀既保留签名又让 oxlint 的
   no-unused-vars 自然通过，不必在 .oxlintrc.json 里为它开豁免。 */
export function registerLicense(_keys: any, _config?: any): any {
  return null;
}

export async function verifyLicense(_short: any, _options: any): Promise<any> {
  return {
    valid: true,
    status: "active",
    message: "string",
    daysUntilExpiry: 9999,
    payload: {
      id: "string",
      product: "primeui",
      tier: "community",
      type: "site",
      iat: 1789888440,
      exp: 4102444799,
    },
  };
}
