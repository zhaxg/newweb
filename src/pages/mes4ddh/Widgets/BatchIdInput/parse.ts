/** 逗号 / 中文逗号 / 换行拆分编号串（原 MemoExEdit/C# 按 , \r\n Split） */
export function parseBatchIds(text: string): string[] {
  return text
    .split(/[,，\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
