import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { ONE_BD, ONE_BI, ZERO_BD, ZERO_BI } from "../const";
import { CounterEntity } from "../../generated/schema";

export function CountAndSaveWithDefaultValue(
  type: string,
  defalutValue: BigDecimal,
  b: BigDecimal = ONE_BD,
  timestamp: BigInt = ZERO_BI
): CounterEntity {
  let e = GetCount(type, timestamp == ZERO_BI ? type : type + "|" + timestamp.toString());
  if (e.count == ZERO_BD) {
    e.count = defalutValue;
  } else {
    e.count = e.count.plus(b);
  }
  if (timestamp != ZERO_BI) {
    e.timestamp = timestamp;
  }
  e.save();
  return e;
}
export function CountAndSave(type: string, b: BigDecimal = ONE_BD, timestamp: BigInt = ZERO_BI): CounterEntity {
  let e = GetCount(type, timestamp == ZERO_BI ? type : type + "|" + timestamp.toString());
  if (timestamp != ZERO_BI) {
    e.timestamp = timestamp;
  }
  e.count = e.count.plus(b);
  e.save();
  return e;
}

export function GetCount(type: string, id: string = ""): CounterEntity {
  let e = CounterEntity.load(id ? id : type);
  if (!e) {
    e = new CounterEntity(id ? id : type);
    e.count = ZERO_BD;
    e.type = type;
    e.timestamp = ZERO_BI;
  }
  return e;
}
