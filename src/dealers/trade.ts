import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { getDayTimestamp, getHourTimestamp, getTypeFromGap, ZERO_BD } from "../const";
import {
  Price,
  TokenEntity,
} from "../../generated/schema";
import { CountAndSave, CountAndSaveWithDefaultValue } from "./counter";

export function dealTradeVolume(
  token: TokenEntity,
  blockTimeStamp: BigInt,
  nativeTokenAmountWithoutFee: BigDecimal,
  nativeTokenAmountWithFee: BigDecimal,
  isMint: bool
): void {
  let raisingToken = token.raisingToken.toHex();
  let timestamp = blockTimeStamp.toI32();
  let hourTimestamp = getHourTimestamp(timestamp)
    .toString()
    .replace(".0", "");
  let dayTimeStamp = getDayTimestamp(timestamp)
    .toString()
    .replace(".0", "");
  CountAndSave("TradeVolumeByHour", nativeTokenAmountWithoutFee, BigInt.fromString(hourTimestamp));
  CountAndSave("TradeVolumeByDay", nativeTokenAmountWithoutFee, BigInt.fromString(dayTimeStamp));
  CountAndSave(raisingToken + "|TradeVolumeByHour", nativeTokenAmountWithoutFee, BigInt.fromString(hourTimestamp));
  CountAndSave(raisingToken + "|TradeVolumeByDay", nativeTokenAmountWithoutFee, BigInt.fromString(dayTimeStamp));
  CountAndSave(raisingToken + "|TradeVolume", nativeTokenAmountWithoutFee);
  CountAndSave(token.addr.toHex() + "|TradeVolume", nativeTokenAmountWithoutFee);
  let amount = nativeTokenAmountWithoutFee;
  if (!isMint) {
    amount = nativeTokenAmountWithFee.neg();
  }
  const tvlCounter = CountAndSave("Tvl", amount);
  CountAndSaveWithDefaultValue("TvlByHour", tvlCounter.count, amount, BigInt.fromString(hourTimestamp));
  CountAndSaveWithDefaultValue("TvlByDay", tvlCounter.count, amount, BigInt.fromString(dayTimeStamp));

  const tokenTvlCounter = CountAndSave(raisingToken + "|Tvl", amount);
  CountAndSaveWithDefaultValue(raisingToken + "|TvlByHour", tokenTvlCounter.count, amount, BigInt.fromString(hourTimestamp));
  CountAndSaveWithDefaultValue(raisingToken + "|TvlByDay", tokenTvlCounter.count, amount, BigInt.fromString(dayTimeStamp));
}

export function updatePrice(
  timestamp: number,
  timegap: number,
  tokenId: string,
  currentPrice: BigDecimal,
  ethValue: BigDecimal,
  lastPrice: BigDecimal,
  nativeTokenAmount: BigDecimal
): void {
  const epoch = (u64(timestamp) / u64(timegap));
  const id = tokenId + "|" + epoch.toString();
  let price = Price.load(id);
  if (!price) {
    price = new Price(id);
    price.token = tokenId;
    price.maxPrice = ZERO_BD;
    price.minPrice = BigInt.fromU64(u64.MAX_VALUE).toBigDecimal();
    price.timestamp = BigInt.fromU64(epoch*u64(timegap));
    price.type = getTypeFromGap(u32(timegap))
    price.openPrice = lastPrice;
    price.volume = ZERO_BD
  }
  price.closePrice = currentPrice;
  if (price.maxPrice < price.closePrice) {
    price.maxPrice = price.closePrice;
  }
  if (price.maxPrice < price.openPrice) {
    price.maxPrice = price.openPrice;
  }
  if (price.minPrice > price.closePrice) {
    price.minPrice = price.closePrice;
  }
  if (price.minPrice > price.openPrice) {
    price.minPrice = price.openPrice;
  }
  price.tokenTvl = ethValue;
  price.volume = price.volume.plus(nativeTokenAmount);
  price.save();
}
