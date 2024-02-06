import { Address, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import { ONE_BI, ZERO_BI } from "../const";
import { CounterEntity } from "../../generated/schema";
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
