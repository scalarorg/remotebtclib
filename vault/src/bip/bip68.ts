// https://github.com/bitcoin/bips/blob/master/bip-0068.mediawiki
// https://github.com/bitcoinjs/bip68/blob/master/index.js
const SECOND_MOD = 512;
const SEQUENCE_LOCKTIME_GRANULARITY = 9;
const SEQUENCE_LOCKTIME_MASK = 0x0000ffff;
const SEQUENCE_LOCKTIME_TYPE_FLAG = 1 << 22;

interface Bip68 {
  sequence: number;
  estimate?: number;
  type: string;
}
export function timeBlock(numOfBlocks: number): Bip68 {
  if (numOfBlocks < 0) {
    throw new Error("numOfBlocks must be greater than 0");
  }
  if (numOfBlocks > SEQUENCE_LOCKTIME_MASK) {
    throw new Error("numOfBlocks must be less than 65536");
  }
  return {
    sequence: numOfBlocks,
    type: "block",
  };
}

const maxSeconds = SEQUENCE_LOCKTIME_MASK * SECOND_MOD; // 559232 min ~ 9320 hours ~ 388 days
export function timeSecond(seconds: number): Bip68 {
  if (seconds < 0) {
    throw new Error("second must be greater than 0");
  }
  if (seconds > maxSeconds) {
    throw new Error(`second must be less than ${maxSeconds}`);
  }
  if (seconds % SECOND_MOD !== 0) {
    throw new Error("second must be divisible by 512");
  }
  return {
    sequence:
      SEQUENCE_LOCKTIME_TYPE_FLAG | (seconds >> SEQUENCE_LOCKTIME_GRANULARITY),
    estimate: seconds,
    type: "second",
  };
}

const minDays = 1;
const maxDays = maxSeconds / 60 / 60 / 24;
export function timeDay(days: number): Bip68 {
  if (days < minDays) {
    throw new Error(`days must be greater than ${minDays}`);
  }
  if (days > maxDays) {
    throw new Error(`days must be less than ${maxDays}`);
  }
  let seconds = days * 60 * 60 * 24;
  if (seconds % SECOND_MOD !== 0) {
    seconds += SECOND_MOD - (seconds % SECOND_MOD);
  }
  return {
    sequence: timeSecond(seconds).sequence,
    estimate: seconds / 60 / 60 / 24,
    type: "day",
  };
}
