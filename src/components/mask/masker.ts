import { dynamicMask } from "./dynamic-mask";
import { maskIt } from "./mask-it";
import type { TokenType } from "./tokens";

export const masker = (value: string, mask: string, tokens: { [key: string]: TokenType }, masked = true): string => {
  return Array.isArray(mask) ? dynamicMask(maskIt, mask, tokens)(value, masked) : maskIt(value, mask, tokens, masked);
};
