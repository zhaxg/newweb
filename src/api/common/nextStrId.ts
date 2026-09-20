// 雪花风格 16 位字符串 ID 生成器（沿用 hmx_web yitIdHelper 定义）：
// [相对基础时间的时间差][WorkerId 6bit][序列数 6bit]

export function NextStrId(): string {
  const BASE_TIME = new Date("2020-01-01T00:00:00Z").getTime();
  const WORKER_ID = Math.floor(Math.random() * 64); // 6 bits
  const WORKER_ID_BIT_LENGTH = 6;
  const SEQ_BIT_LENGTH = 6;
  const MAX_SEQ = 2 ** SEQ_BIT_LENGTH - 1;

  let lastTimestamp = 0;
  let sequence = 0;

  function padLeft(num: number | string, length: number): string {
    return num.toString().padStart(length, "0");
  }

  return (() => {
    const now = Date.now();
    const timeDiff = now - BASE_TIME;

    if (now === lastTimestamp) {
      sequence = (sequence + 1) % (MAX_SEQ + 1);
      if (0 === sequence) {
        while (Date.now() === lastTimestamp) {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1);
        }
      }
    } else {
      sequence = 0;
      lastTimestamp = now;
    }

    const id =
      (BigInt(timeDiff) << BigInt(WORKER_ID_BIT_LENGTH + SEQ_BIT_LENGTH)) |
      (BigInt(WORKER_ID) << BigInt(SEQ_BIT_LENGTH)) |
      BigInt(sequence);

    return padLeft(id.toString(), 16);
  })();
}
