import { Address, BigDecimal, BigInt, ethereum, json } from "@graphprotocol/graph-ts";
import {
  Token,
  Approval,
  DelegateChanged,
  DelegateVotesChanged,
  Initialized,
  LogBurned,
  LogCoinMakerChanged,
  LogDeclareDoomsday,
  LogDestroyed,
  LogMetadataChanged,
  LogMint,
  LogProjectAdminChanged,
  LogProjectTaxChanged,
  LogProjectTreasuryChanged,
  Paused,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  Transfer,
  Unpaused
} from "../generated/templates/token/Token";
import { updatePrice, dealTradeVolume } from "./dealers/trade";
import { CountAndSave, GetCount } from "./dealers/counter";
import { Member, MintBurnEntity, PlatformEntity, TokenEntity } from "../generated/schema";
import { formatEther, klines, ONE_BD, ONE_BI, ZERO_BD } from "./const";
import { HandleSwap, HandleTokenVolume } from "./utils";
import { store } from "@graphprotocol/graph-ts";
import { dealActiveAddressCount } from "./dealers/member";
import { handlePrice } from "./dealers/bondingcurve";

export function handleApproval(event: Approval): void { }

export function handleDelegateChanged(event: DelegateChanged): void { }

export function handleDelegateVotesChanged(event: DelegateVotesChanged): void { }

export function handleInitialized(event: Initialized): void { }

export function handleLogBurned(event: LogBurned): void {
  let counterEntity = CountAndSave("TxsCount");

  let mintBurnEntity = new MintBurnEntity(counterEntity.count.toString());
  let tokenEntity = TokenEntity.load(event.address.toHex())!;
  let platformEntity = PlatformEntity.load(tokenEntity.factory.toHex())!;
  mintBurnEntity.hash = event.transaction.hash;
  mintBurnEntity.blockNum = event.block.number;
  mintBurnEntity.timestamp = event.block.timestamp;
  mintBurnEntity.direction = 1;
  mintBurnEntity.from = event.transaction.from;
  mintBurnEntity.to = event.params.from;
  mintBurnEntity.platformFee = formatEther(event.params.platformFee, tokenEntity.baseDecimal);
  mintBurnEntity.projectFee = formatEther(event.params.projectFee, tokenEntity.baseDecimal);
  mintBurnEntity.erc20Amount = formatEther(event.params.daoTokenAmount, tokenEntity.decimal);
  mintBurnEntity.nativeAmount = formatEther(event.params.returnAmount, tokenEntity.baseDecimal);
  mintBurnEntity.token = tokenEntity.id;
  mintBurnEntity.tvl = tokenEntity.lockValue
  mintBurnEntity.price = tokenEntity.currentPrice
  mintBurnEntity.tradeVolumes = GetCount(tokenEntity.addr.toHex() + "|TradeVolume").count


  let removeValue = mintBurnEntity.nativeAmount.plus(mintBurnEntity.platformFee).plus(mintBurnEntity.projectFee)
  tokenEntity.lockValue = tokenEntity.lockValue.minus(removeValue);
  tokenEntity.treasuryFee = tokenEntity.treasuryFee.plus(mintBurnEntity.projectFee);
  tokenEntity.txCount = tokenEntity.txCount.plus(ONE_BI);
  const lastPrice = tokenEntity.currentPrice;
  tokenEntity.supply = tokenEntity.supply.minus(mintBurnEntity.erc20Amount);
  if (tokenEntity.params) {
    tokenEntity.currentPrice = handlePrice(tokenEntity)
  }
  tokenEntity.marketCap = tokenEntity.currentPrice.times(tokenEntity.supply);
  dealTradeVolume(tokenEntity, event.block.timestamp, mintBurnEntity.nativeAmount, removeValue, false);
  HandleTokenVolume(Address.fromBytes(tokenEntity.raisingToken), removeValue);
  HandleTokenVolume(Address.fromBytes(tokenEntity.addr), mintBurnEntity.erc20Amount);
  HandleSwap(Address.fromBytes(tokenEntity.addr), event.params.returnAmount, event.params.daoTokenAmount, event.block.timestamp, event.transaction.hash)
  const timestamp = event.block.timestamp.toI32()
  for (let i = 0; i < klines.length; i++) {
    updatePrice(timestamp, klines[i], tokenEntity.id, tokenEntity.currentPrice, tokenEntity.lockValue, lastPrice, mintBurnEntity.nativeAmount, mintBurnEntity.erc20Amount)
  }
  tokenEntity.lastTxTimestamp = event.block.timestamp
  tokenEntity.save();
  platformEntity.save();
  mintBurnEntity.save();
}

export function handleLogCoinMakerChanged(event: LogCoinMakerChanged): void { }

export function handleLogDeclareDoomsday(event: LogDeclareDoomsday): void {
  let tokenEntity = TokenEntity.load(event.address.toHex())!;
  tokenEntity.doomsDays = true;
  tokenEntity.save();
}

export function handleLogDestroyed(event: LogDestroyed): void {
  let tokenEntity = TokenEntity.load(event.address.toHex())!;
  tokenEntity.destoryed = true;
  tokenEntity.save();
}

export function handleLogMetadataChanged(event: LogMetadataChanged): void {
  let e = TokenEntity.load(event.address.toHex()) as TokenEntity;
  let erc20Abi = Token.bind(event.address);
  e.metaUri = erc20Abi.try_getMetadata().value;
  e.save();
}

export function handleLogMint(event: LogMint): void {
  let counterEntity = CountAndSave("TxsCount");
  let mintBurnEntity = new MintBurnEntity(counterEntity.count.toString());
  let tokenEntity = TokenEntity.load(event.address.toHex())!;
  let platformEntity = PlatformEntity.load(tokenEntity.factory.toHex())!;
  mintBurnEntity.hash = event.transaction.hash;
  mintBurnEntity.blockNum = event.block.number;
  mintBurnEntity.timestamp = event.block.timestamp;
  mintBurnEntity.direction = 0;
  mintBurnEntity.from = event.transaction.from;
  mintBurnEntity.to = event.params.to;
  mintBurnEntity.platformFee = formatEther(event.params.platformFee, tokenEntity.baseDecimal);
  mintBurnEntity.projectFee = formatEther(event.params.projectFee, tokenEntity.baseDecimal);
  mintBurnEntity.erc20Amount = formatEther(event.params.daoTokenAmount, tokenEntity.decimal);
  mintBurnEntity.tvl = tokenEntity.lockValue
  mintBurnEntity.price = tokenEntity.currentPrice
  mintBurnEntity.tradeVolumes = GetCount(tokenEntity.addr.toHex() + "|TradeVolume").count
  let lockValue = formatEther(event.params.lockAmount, tokenEntity.baseDecimal);
  mintBurnEntity.nativeAmount = lockValue;
  mintBurnEntity.token = tokenEntity.id;
  const lastPrice = tokenEntity.currentPrice;
  tokenEntity.supply = tokenEntity.supply.plus(mintBurnEntity.erc20Amount);
  tokenEntity.lockValue = tokenEntity.lockValue.plus(lockValue);
  tokenEntity.treasuryFee = tokenEntity.treasuryFee.plus(mintBurnEntity.projectFee);
  tokenEntity.txCount = tokenEntity.txCount.plus(ONE_BI);
  if (tokenEntity.params) {
    tokenEntity.currentPrice = handlePrice(tokenEntity)
    if (tokenEntity.initHash == event.transaction.hash) {
      tokenEntity.initPrice = tokenEntity.currentPrice
      mintBurnEntity.price = tokenEntity.currentPrice
    }
  }
  tokenEntity.marketCap = tokenEntity.currentPrice.times(tokenEntity.supply);
  const amountWithFee = lockValue.plus(mintBurnEntity.platformFee).plus(mintBurnEntity.projectFee);
  dealTradeVolume(
    tokenEntity,
    event.block.timestamp,
    mintBurnEntity.nativeAmount,
    amountWithFee,
    true
  );
  HandleTokenVolume(Address.fromBytes(tokenEntity.raisingToken), amountWithFee);
  HandleTokenVolume(Address.fromBytes(tokenEntity.addr), mintBurnEntity.erc20Amount);
  HandleSwap(Address.fromBytes(tokenEntity.addr), event.params.lockAmount, event.params.daoTokenAmount, event.block.timestamp, event.transaction.hash)
  const timestamp = event.block.timestamp.toI32()

  for (let i = 0; i < klines.length; i++) {
    updatePrice(timestamp, klines[i], tokenEntity.id, tokenEntity.currentPrice, tokenEntity.lockValue, lastPrice, amountWithFee, mintBurnEntity.erc20Amount)
  }
  tokenEntity.lastTxTimestamp = event.block.timestamp
  tokenEntity.save();
  platformEntity.save();
  mintBurnEntity.save();
}

export function handleLogProjectAdminChanged(event: LogProjectAdminChanged): void {
  let tokenEntity = TokenEntity.load(event.address.toHex())!;
  tokenEntity.admin = event.params.newAccount;
  dealActiveAddressCount(event.params.newAccount)
  tokenEntity.save();
}

export function handleLogProjectTaxChanged(event: LogProjectTaxChanged): void {
  let tokenEntity = TokenEntity.load(event.address.toHex())!;
  let erc20Abi = Token.bind(event.address);
  let rate = erc20Abi.try_getTaxRateOfProject().value;
  tokenEntity.burnTax = rate.getProjectBurnTax();
  tokenEntity.mintTax = rate.getProjectMintTax();
  tokenEntity.save();
}

export function handleLogProjectTreasuryChanged(event: LogProjectTreasuryChanged): void {
  let tokenEntity = TokenEntity.load(event.address.toHex())!;
  tokenEntity.treasury = event.params.newAccount;
  tokenEntity.save();
}

export function handlePaused(event: Paused): void {
  let tokenEntity = TokenEntity.load(event.address.toHex())!;
  tokenEntity.paused = true;
  tokenEntity.save();
}

export function handleRoleAdminChanged(event: RoleAdminChanged): void { }

export function handleRoleGranted(event: RoleGranted): void { }

export function handleRoleRevoked(event: RoleRevoked): void { }

export function handleUnpaused(event: Unpaused): void {
  let tokenEntity = TokenEntity.load(event.address.toHex())!;
  tokenEntity.paused = false;
  tokenEntity.save();
}
function handleIds(tokenAddr: Address, userAddr: Address, needHandleId: BigInt): void {
  let memPairId = tokenAddr.toHexString() + "|" + userAddr.toHexString();
  let member = Member.load(memPairId);
  if (!member) {
    return;
  }
  let arr: BigInt[] = [];
  let found = false;
  if (member.ids) {
    for (let i = 0; i < member.ids!.length; i++) {
      let id = member.ids![i];
      if (needHandleId == id) {
        found = true;
        continue;
      }
      arr.push(id);
    }
  }
  if (!found) {
    arr.push(needHandleId);
  }
  member.ids = arr;
  member.save();
}

function handleBalance(token: TokenEntity, userAddr: Address, amount: BigDecimal): void {

  if (userAddr.toHex() == Address.zero().toHex() || amount.equals(ZERO_BD)) {
    return
  }
  let memPairId = token.addr.toHexString() + "|" + userAddr.toHexString();
  let memberEntity = Member.load(memPairId);
  if (!memberEntity) {
    memberEntity = new Member(memPairId);
    token.memberCount = token.memberCount.plus(ONE_BI);
    CountAndSave("MemberCount");
    memberEntity.token = token.id;
    memberEntity.balance = ZERO_BD;
    memberEntity.user = userAddr.toHex();
  }
  memberEntity.balance = memberEntity.balance!.plus(amount);
  if (memberEntity.balance!.le(ZERO_BD)) {
    if (memberEntity) {
      store.remove("Member", memPairId);
      token.memberCount = token.memberCount.minus(ONE_BI);
      CountAndSave("MemberCount", ONE_BD.neg());
    }
  } else {
    memberEntity.save();
  }
}

export function handleTransfer(event: Transfer): void {
  let entity = TokenEntity.load(event.address.toHex())!;
  handleBalance(
    entity,
    event.params.from,
    (entity.tokenType == "ERC721" ? BigInt.fromI32(1).toBigDecimal() : formatEther(event.params.value)).neg()
  );
  handleBalance(
    entity,
    event.params.to,
    entity.tokenType == "ERC721" ? BigInt.fromI32(1).toBigDecimal() : formatEther(event.params.value)
  );
  if (event.params.to.toHex() != Address.zero().toHex()) {
    dealActiveAddressCount(event.params.to);
  }
  if (event.params.from.toHex() != Address.zero().toHex()) {
    dealActiveAddressCount(event.params.from);
  }
  if (entity.tokenType == "ERC721") {
    handleIds(event.address, event.params.from, event.params.value);
    handleIds(event.address, event.params.to, event.params.value);
  }
  entity.save();
}
