import { Address, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts";
import { ONE_BD, ONE_BI, ZERO_BD, ZERO_BI } from "../const";
import { store } from "@graphprotocol/graph-ts";
import { Member, TokenEntity, User } from "../../generated/schema";
import { CountAndSave } from "./counter";


export function dealActiveAddressCount(member: Address): void {
  let userEntity = User.load(member.toHex());
  if (!userEntity) {
    userEntity = new User(member.toHex());
    CountAndSave("ActiveAddressCount");
    userEntity.save();
  }
}
