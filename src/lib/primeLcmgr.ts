export function registerLicense(keys: any, config?: any): any {
  return null;
}

export async function verifyLicense(short: any, options: any): Promise<any> {
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
