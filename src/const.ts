import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
export let ZERO_BI = BigInt.zero();
export let ZERO_BD = BigDecimal.zero();
export let ONE_BI = BigInt.fromI32(1);
export let ONE_BD = BigDecimal.fromString("1");
export let hour: u32 = 3600;
export let mintue: u32 = 60;
export let second: u32 = 1;
export let day: u32 = 86400;
export function getHourTimestamp(timestamp: number): number {
  let hourIndex = parseInt((timestamp / hour).toString()); // get unique hour within unix history
  return hourIndex * hour; // want the rounded effect
}
export function getDayTimestamp(timestamp: number): number {
  let hourIndex = parseInt((timestamp / day).toString()); // get unique hour within unix history
  return hourIndex * day; // want the rounded effect
}
export const klines = [1 * second, 5 * second, 15 * second, 30 * second, 1 * mintue, 3 * mintue, 5 * mintue, 15 * mintue, 30 * mintue, hour, 2 * hour, 4 * hour, 8 * hour, day, 30 * day, 90 * day]
export function getTypeFromGap(gap: u32): string {
  switch (gap) {
    case 1 * second: return "1s"
    case 5 * second: return "5s"
    case 15 * second: return "15s"
    case 30 * second: return "30s"
    case 1 * mintue: return "1m"
    case 3 * mintue: return "3m"
    case 5 * mintue: return "5m"
    case 15 * mintue: return "15m"
    case 30 * mintue: return "30m"
    case 1 * hour: return "1h"
    case 2 * hour: return "2h"
    case 4 * hour: return "4h"
    case 8 * hour: return "8h"
    case 1 * day: return "1d"
    case 30 * day: return "30d"
    case 90 * day: return "90d"
  }
  return ""
}

export function formatEther(amount: BigInt, decimals: i64 = 18): BigDecimal {
  return amount.toBigDecimal().div(
    BigInt.fromI32(10)
      .pow(u8(decimals))
      .toBigDecimal()
  );
}
