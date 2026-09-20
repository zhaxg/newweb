// ; 本算法生成的ID由3部分组成（沿用雪花算法定义）：
// ; +-------------------------+--------------+----------+
// ; | 1.相对基础时间的时间差 | 2.WorkerId | 3.序列数 |
// ; +-------------------------+--------------+----------+
// ; 第1部分，时间差，是生成ID时的系统时间减去 BaseTime 的总时间差（毫秒单位）。
// ; 第2部分，WorkerId，是区分不同机器或不同应用的唯一ID，最大值由 WorkerIdBitLength（默认6）限定。
// ; 第3部分，序列数，是每毫秒下的序列数，由参数中的 SeqBitLength（默认6）限定。

// ; 129053495681099        (运行1年，长度：15)
// ; 387750301904971        (运行3年，长度：15)
// ; 646093214093387        (运行5年，长度：15)
// ; 1292658282840139       (运行10年，长度：16)
// ; 9007199254740992       (运行70年，达到 js Number 最大值，长度：16)
// ; 165399880288699493     (运行1000年，等同普通雪花算法运行1年，长度：18)

export function NextStrId(): string {
  const BASE_TIME = new Date('2020-01-01T00:00:00Z').getTime();
  const WORKER_ID = Math.floor(Math.random() * 64); // 6 bits
  const WORKER_ID_BIT_LENGTH = 6;
  const SEQ_BIT_LENGTH = 6;
  const MAX_SEQ = 2 ** SEQ_BIT_LENGTH - 1;

  let lastTimestamp = 0;
  let sequence = 0;

  function padLeft(num: number | string, length: number): string {
    return num.toString().padStart(length, '0');
  }

  return (() => {
    const now = Date.now();
    const timeDiff = now - BASE_TIME;

    if (now === lastTimestamp) {
      sequence = (sequence + 1) % (MAX_SEQ + 1);
      if (0 === sequence) {
        // Sequence overflow in the same ms, wait for next ms
        while (Date.now() === lastTimestamp) {
          // Busy-wait with a minimal delay to avoid empty block and reduce CPU usage
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1);
        }
      }
    } else {
      sequence = 0;
      lastTimestamp = now;
    }

    // Bit shifts: [timeDiff][workerId][sequence]
    const id =
      (BigInt(timeDiff) << BigInt(WORKER_ID_BIT_LENGTH + SEQ_BIT_LENGTH)) |
      (BigInt(WORKER_ID) << BigInt(SEQ_BIT_LENGTH)) |
      BigInt(sequence);

    // Ensure 16 digits, pad if necessary
    return padLeft(id.toString(), 16);
  })();
}
