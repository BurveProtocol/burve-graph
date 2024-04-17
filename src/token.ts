import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
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
import { dealTokenMember } from "./dealers/member";
import { Member, MintBurnEntity, PlatformEntity, TokenEntity } from "../generated/schema";
import { formatEther, klines, ONE_BI, ZERO_BD, ZERO_BI } from "./const";
import { HandleSwap, HandleTokenVolume } from "./utils";

export function handleApproval(event: Approval): void { }

export function handleDelegateChanged(event: DelegateChanged): void { }

export function handleDelegateVotesChanged(event: DelegateVotesChanged): void { }

export function handleInitialized(event: Initialized): void { }

export function handleLogBurned(event: LogBurned): void {
  let erc20Abi = Token.bind(event.address);
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
  const price = erc20Abi.try_price();
  if (!price.reverted) {
    tokenEntity.currentPrice = formatEther(price.value);
  }
  tokenEntity.supply = tokenEntity.supply.minus(mintBurnEntity.erc20Amount);
  tokenEntity.marketCap = tokenEntity.currentPrice.times(tokenEntity.supply);
  dealTradeVolume(tokenEntity, event.block.timestamp, mintBurnEntity.nativeAmount, removeValue, false);
  HandleTokenVolume(Address.fromBytes(tokenEntity.raisingToken), mintBurnEntity.nativeAmount);
  HandleTokenVolume(Address.fromBytes(tokenEntity.addr), mintBurnEntity.erc20Amount);
  HandleSwap(Address.fromBytes(tokenEntity.addr), event.params.returnAmount, event.params.daoTokenAmount, event.block.timestamp, event.transaction.hash)
  const timestamp = event.block.timestamp.toI32()
  for (let i = 0; i < klines.length; i++) {
    updatePrice(timestamp, klines[i], tokenEntity.id, tokenEntity.currentPrice, tokenEntity.lockValue, lastPrice, mintBurnEntity.nativeAmount, mintBurnEntity.erc20Amount)
  }
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
  let erc20Abi = Token.bind(event.address);
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
  const price = erc20Abi.try_price();
  if (!price.reverted) {
    tokenEntity.currentPrice = formatEther(price.value);
  }
  tokenEntity.supply = tokenEntity.supply.plus(mintBurnEntity.erc20Amount);
  tokenEntity.marketCap = tokenEntity.currentPrice.times(tokenEntity.supply);
  tokenEntity.lockValue = tokenEntity.lockValue.plus(lockValue);
  tokenEntity.treasuryFee = tokenEntity.treasuryFee.plus(mintBurnEntity.projectFee);
  tokenEntity.txCount = tokenEntity.txCount.plus(ONE_BI);
  const amountWithFee = lockValue.plus(mintBurnEntity.platformFee).plus(mintBurnEntity.projectFee);
  dealTradeVolume(
    tokenEntity,
    event.block.timestamp,
    lockValue,
    amountWithFee,
    true
  );
  HandleTokenVolume(Address.fromBytes(tokenEntity.raisingToken), mintBurnEntity.nativeAmount);
  HandleTokenVolume(Address.fromBytes(tokenEntity.addr), mintBurnEntity.erc20Amount);
  HandleSwap(Address.fromBytes(tokenEntity.addr), event.params.lockAmount, event.params.daoTokenAmount, event.block.timestamp, event.transaction.hash)
  const timestamp = event.block.timestamp.toI32()

  for (let i = 0; i < klines.length; i++) {
    updatePrice(timestamp, klines[i], tokenEntity.id, tokenEntity.currentPrice, tokenEntity.lockValue, lastPrice, amountWithFee, mintBurnEntity.erc20Amount)
  }
  tokenEntity.save();
  platformEntity.save();
  mintBurnEntity.save();
}

export function handleLogProjectAdminChanged(event: LogProjectAdminChanged): void {
  let erc20Abi = Token.bind(event.address);
  let tokenEntity = TokenEntity.load(event.address.toHex())!;
  const oldAdmin = Address.fromBytes(tokenEntity.admin);
  let userBalance = erc20Abi.balanceOf(oldAdmin);
  tokenEntity.admin = event.params.newAccount;
  dealTokenMember(tokenEntity, oldAdmin, userBalance);
  dealTokenMember(tokenEntity, event.params.newAccount, ONE_BI);
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

function handleBalance(tokenAddr: Address, userAddr: Address, amount: BigDecimal): void {
  let memPairId = tokenAddr.toHexString() + "|" + userAddr.toHexString();
  let member = Member.load(memPairId);
  if (!member) {
    return;
  }
  if (!member.balance) {
    member.balance = ZERO_BD;
  }
  member.balance = member.balance!.plus(amount);
  member.save();
}

export function handleTransfer(event: Transfer): void {
  let entity = TokenEntity.load(event.address.toHex())!;
  if (event.params.to.toHex() != Address.zero().toHex()) {
    let erc20Abi = Token.bind(event.address);
    let userBalance = erc20Abi.balanceOf(event.params.to);
    dealTokenMember(entity, event.params.to, userBalance);
  }
  if (event.params.from.toHex() != Address.zero().toHex()) {
    let erc20Abi = Token.bind(event.address);
    let userBalance = erc20Abi.balanceOf(event.params.from);
    dealTokenMember(entity, event.params.from, userBalance);
  }
  if (entity.tokenType == "ERC721") {
    handleIds(event.address, event.params.from, event.params.value);
    handleIds(event.address, event.params.to, event.params.value);
  }
  handleBalance(
    event.address,
    event.params.from,
    (entity.tokenType == "ERC721" ? BigInt.fromI32(1).toBigDecimal() : formatEther(event.params.value)).neg()
  );
  handleBalance(
    event.address,
    event.params.to,
    entity.tokenType == "ERC721" ? BigInt.fromI32(1).toBigDecimal() : formatEther(event.params.value)
  );
  entity.save();
}
