import { Address, BigDecimal, BigInt, Bytes, ethereum, json } from "@graphprotocol/graph-ts";
import { formatEther } from "../const";
import { TokenEntity } from "../../generated/schema";
import { BondingSwapCalculator } from "../../generated/factory/BondingSwapCalculator";

export function getBondingCurveParams(curve: Address, paramsData: Bytes): string {
  let curveAbi = BondingSwapCalculator.bind(curve);
  let typeResult = curveAbi.try_BondingCurveType();
  if (!typeResult.reverted) {
    let decodedValueStr = "";
    if (typeResult.value == "exponential") {
      let expValue = ethereum.decode("(uint256,uint256)", paramsData)!.toTuple();
      decodedValueStr = `{"a":"${expValue[0].toBigInt()}","b":"${expValue[1].toBigInt()}"}`;
    } else if (typeResult.value == "linear") {
      let linearValue = ethereum.decode("(uint256,uint256)", paramsData)!.toTuple();
      decodedValueStr = `{"k":"${linearValue[0].toBigInt()}","p":"${linearValue[1].toBigInt()}"}`;
    } else if (typeResult.value == "squareroot") {
      let sqrtValue = ethereum.decode("(uint256)", paramsData)!.toTuple();
      decodedValueStr = `{"a":"${sqrtValue[0].toBigInt()}"}`;
    }
    const res = `{"type":"${typeResult.value}","params":${decodedValueStr}}`;
    return res;
  }
  return "";
}

export function handlePrice(tokenEntity: TokenEntity): BigDecimal {
  const p = json.fromString(tokenEntity.params).toObject()
  const type = p.get("type")!.toString()
  let params = p.get("params")!.toObject()
  let price = BigDecimal.zero()
  if (type == "exponential") {
    const a = formatEther(BigInt.fromString(params!.get("a")!.toString())!)
    const b = formatEther(BigInt.fromString(params!.get("b")!.toString())!)
    const e_index = tokenEntity.supply.div(b);
    const y = BigDecimal.fromString(Math.exp(parseFloat(e_index.toString())).toString());
    price = y.times(a);
  }
  else if (type == "linear") {
    const k = formatEther(BigInt.fromString(params!.get("k")!.toString())!)
    const p = formatEther(BigInt.fromString(params!.get("p")!.toString())!)
    price = tokenEntity.supply.times(k).plus(p);
  }
  else if (type == "squareroot") { }
  return price
}
