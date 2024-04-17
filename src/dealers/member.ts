import { Address, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts";
import { ONE_BD, ONE_BI, ZERO_BD, ZERO_BI } from "../const";
import { store } from "@graphprotocol/graph-ts";
import { Member, TokenEntity, User } from "../../generated/schema";
import { CountAndSave } from "./counter";

function getMemPairId(tokenAddr: Bytes, memberAddr: Address): string {
  return tokenAddr.toHexString() + "|" + memberAddr.toHexString();
}

export function dealTokenMember(token: TokenEntity, member: Address, balanceOf: BigInt): void {
  let userEntity = User.load(member.toHex());
  if (!userEntity) {
    userEntity = new User(member.toHex());
    CountAndSave("ActiveAddressCount");
    userEntity.save();
  }
  let memPairId = getMemPairId(token.addr, member);
  if (balanceOf != ZERO_BI) {
    let memberEntity = Member.load(memPairId);
    if (!memberEntity) {
      memberEntity = new Member(memPairId);
      token.memberCount = token.memberCount.plus(ONE_BI);
      CountAndSave("MemberCount");
      memberEntity.token = token.id;
      memberEntity.balance = ZERO_BD;
      memberEntity.user = member.toHex();
      memberEntity.save();
    }
  } else {
    let memberEntity = Member.load(memPairId);
    if (memberEntity) {
      store.remove("Member", memPairId);
      token.memberCount = token.memberCount.minus(ONE_BI);
      CountAndSave("MemberCount", ONE_BD.neg());
    }
  }
}
