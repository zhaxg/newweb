// ; 本算法生成的ID由3部分组成（沿用雪花算法定义）：
// ; +-------------------------+--------------+----------+
// ; | 1.相对基础时间的时间差 | 2.WorkerId | 3.序列数 |
// ; +-------------------------+--------------+----------+
// ; 第1部分，时间差，是生成ID时的系统时间减去 BaseTime 的总时间差（毫秒单位）。
// ; 第2部分，WorkerId，区分不同标签页/实例的唯一ID，sessionStorage 保证同一会话内固定。
// ; 第3部分，序列数，是每毫秒下的序列数，由 SeqBitLength（6）限定，即每毫秒 64 个。
// ; 时间差单调推进：时钟回拨或同毫秒序列溢出时向前借位（虚拟时钟），
// ; 不忙等 —— 前端 JS 无法阻塞，宁可 ID 时间戳快 1ms 也要保证唯一且单调递增。

// ; 129053495681099        (运行1年，长度：15)
// ; 387750301904971        (运行3年，长度：15)
// ; 646093214093387        (运行5年，长度：15)
// ; 1292658282840139       (运行10年，长度：16)
// ; 9007199254740992       (运行70年，达到 js Number 最大值，长度：16)

const BASE_TIME = new Date("2020-01-01T00:00:00Z").getTime();
const WORKER_ID_BIT_LENGTH = 6;
const SEQ_BIT_LENGTH = 6;
const MAX_SEQ = 2 ** SEQ_BIT_LENGTH - 1;

// 必须是模块级状态：此前 lastTimestamp/sequence 写在函数体内，每次调用重置，
// 同毫秒两次调用必然生成相同 ID。
let lastTimestamp = 0;
let sequence = 0;

function tabWorkerId(): number {
  try {
    const KEY = "hmx:yitid-worker";
    let w = sessionStorage.getItem(KEY);
    if (w === null) {
      w = String(Math.floor(Math.random() * 2 ** WORKER_ID_BIT_LENGTH));
      sessionStorage.setItem(KEY, w);
    }
    return Number(w);
  } catch {
    // 隐私模式等 sessionStorage 不可用时退回每次随机（仅牺牲跨标签页防碰撞）
    return Math.floor(Math.random() * 2 ** WORKER_ID_BIT_LENGTH);
  }
}

const WORKER_ID = tabWorkerId();

function padLeft(num: number | string, length: number): string {
  return num.toString().padStart(length, "0");
}

export function NextStrId(): string {
  let now = Date.now();
  if (now < lastTimestamp) now = lastTimestamp; // 时钟回拨：冻结在虚拟时钟上
  if (now === lastTimestamp) {
    sequence = (sequence + 1) & MAX_SEQ;
    if (sequence === 0) now = ++lastTimestamp; // 同毫秒溢出：向前借 1ms，不忙等
  } else {
    sequence = 0;
    lastTimestamp = now;
  }

  // Bit shifts: [timeDiff][workerId][sequence]
  const id =
    (BigInt(now - BASE_TIME) << BigInt(WORKER_ID_BIT_LENGTH + SEQ_BIT_LENGTH)) |
    (BigInt(WORKER_ID) << BigInt(SEQ_BIT_LENGTH)) |
    BigInt(sequence);

  return padLeft(id.toString(), 16);
}
