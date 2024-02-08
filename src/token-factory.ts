import { Address, BigInt, Bytes, dataSource, log } from "@graphprotocol/graph-ts";
import {
  TokenFactory,
  Initialized,
  LogPlatformAdminChanged,
  LogPlatformTaxChanged,
  LogPlatformTreasuryChanged,
  LogTokenDeployed,
  LogTokenImplementUpgraded,
  LogTokenTypeImplAdded,
  LogTokenUpgradeRejected,
  LogTokenUpgradeRequested,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  LogRouteChanged
} from "../generated/factory/TokenFactory";
import {
  TokenEntity,
  PlatformEntity,
  BondingCurveType,
  TokenUpgradeHistory,
  TokenType
} from "../generated/schema";
import { Token } from "../generated/factory/Token";
import { token } from "../generated/templates";
import { formatEther, ONE_BI, ZERO_BD, ZERO_BI } from "./const";
import { CountAndSave } from "./dealers/counter";
import { getBondingCurveParams } from "./dealers/bondingcurve";
import { Timelock as TimelockContract } from "../generated/templates/Timelock/Timelock";
import { dealTokenMember } from "./dealers/member";

export function handleInitialized(event: Initialized): void {
  let platformEntity = new PlatformEntity(event.address.toHex());
  let factoryAbi = TokenFactory.bind(event.address);
  let taxRateResult = factoryAbi.try_getTaxRateOfPlatform();
  platformEntity.addr = event.address;
  platformEntity.net = dataSource.network();
  platformEntity.admin = factoryAbi.try_getPlatformAdmin().value;
  platformEntity.treasury = factoryAbi.try_getPlatformTreasury().value;
  platformEntity.route = factoryAbi.try_getRoute().value;
  platformEntity.mintTax = taxRateResult.value.value0;
  platformEntity.burnTax = taxRateResult.value.value1;
  platformEntity.save();
}

export function handleLogPlatformAdminChanged(event: LogPlatformAdminChanged): void {
  let platformEntity = PlatformEntity.load(event.address.toHex())!;
  platformEntity.admin = event.params.newAccount;
  platformEntity.save();
}

export function handleLogPlatformTaxChanged(event: LogPlatformTaxChanged): void {
  let platformEntity = PlatformEntity.load(event.address.toHex())!;
  let factoryAbi = TokenFactory.bind(event.address);
  let taxRateResult = factoryAbi.try_getTaxRateOfPlatform();
  platformEntity.mintTax = taxRateResult.value.value0;
  platformEntity.burnTax = taxRateResult.value.value1;
  platformEntity.save();
}

export function handleLogPlatformTreasuryChanged(event: LogPlatformTreasuryChanged): void {
  let platformEntity = PlatformEntity.load(event.address.toHex())!;
  platformEntity.treasury = event.params.newAccount;
  platformEntity.save();
}

export function handleLogRouteChanged(event: LogRouteChanged): void {
  let platformEntity = PlatformEntity.load(event.address.toHex())!;
  platformEntity.route = event.params.newRoute;
  platformEntity.save();
}

export function handleLogTokenDeployed(event: LogTokenDeployed): void {
  let tokenEntity = new TokenEntity(event.params.deployedAddr.toHex());
  CountAndSave("DaoCount");
  let erc20Abi = Token.bind(event.params.deployedAddr);
  let taxRateResult = erc20Abi.try_getTaxRateOfProject();
  tokenEntity.treasury = erc20Abi.try_getProjectTreasury().value;
  tokenEntity.net = dataSource.network();
  tokenEntity.name = erc20Abi.try_name().value;
  tokenEntity.symbol = erc20Abi.try_symbol().value;
  tokenEntity.metaUri = erc20Abi.try_getMetadata().value;
  tokenEntity.addr = event.params.deployedAddr;
  tokenEntity.tokenType = event.params.tokenType;
  tokenEntity.bondingCurveType = event.params.bondingCurveType;
  tokenEntity.supply = ZERO_BD;
  let price = erc20Abi.try_price();
  if (!price.reverted) tokenEntity.currentPrice = formatEther(price.value);
  else tokenEntity.currentPrice = ZERO_BD;
  let decimal = erc20Abi.try_decimals();
  if (!decimal.reverted) tokenEntity.decimal = decimal.value;
  tokenEntity.index = event.params.tokenId;
  tokenEntity.doomsDays = false;
  tokenEntity.destoryed = false;
  tokenEntity.paused = false;
  tokenEntity.lockValue = ZERO_BD;
  tokenEntity.marketCap = ZERO_BD;
  tokenEntity.createTimestamp = event.block.timestamp;
  tokenEntity.mintTax = taxRateResult.value.getProjectMintTax();
  tokenEntity.burnTax = taxRateResult.value.getProjectBurnTax();
  const admin = erc20Abi.try_getProjectAdmin().value;
  tokenEntity.admin = admin;
  tokenEntity.creator = event.transaction.from;
  tokenEntity.treasury = erc20Abi.try_getProjectTreasury().value;
  const raising = erc20Abi.try_getRaisingToken();
  tokenEntity.baseDecimal = 18;
  if (!raising.reverted) {
    tokenEntity.raisingToken = raising.value;
    if (raising.value != Address.zero()) {
      let rasingTokenAbi = Token.bind(raising.value);
      const baseDecimal = rasingTokenAbi.try_decimals();
      if (!decimal.reverted) tokenEntity.baseDecimal = baseDecimal.value;
    }
  } else {
    tokenEntity.raisingToken = Address.zero();
  }
  tokenEntity.memberCount = ZERO_BI;
  tokenEntity.treasuryFee = ZERO_BD;
  tokenEntity.txCount = ZERO_BI;
  const parameterData = erc20Abi.try_getParameters().value;
  tokenEntity.params = getBondingCurveParams(erc20Abi.try_getBondingCurve().value, parameterData);
  token.create(event.params.deployedAddr);
  let platformEntity = PlatformEntity.load(event.address.toHex())!;
  tokenEntity.factory = event.address;
  platformEntity.save();
  dealTokenMember(tokenEntity, admin, ONE_BI);
  tokenEntity.save();
}

export function handleLogTokenImplementUpgraded(event: LogTokenImplementUpgraded): void {
  let log = new TokenUpgradeHistory(event.transaction.hash.toHex());
  log.operator = event.address;
  log.timestamp = event.block.timestamp;
  log.type = "upgrade";
  log.token = event.params.proxyAddress.toHex();
  log.upgradeTo = event.params.implementAddr;
  log.tx = event.transaction.hash;
  log.data = "";
  log.save();
}


export function handleLogTokenTypeImplAdded(event: LogTokenTypeImplAdded): void {
  let type = new TokenType(event.params.tokenType);
  type.name = event.params.tokenType;
  type.impl = event.params.impl;
  type.save();
}

export function handleLogBondingCurveTypeImplAdded(event: LogTokenTypeImplAdded): void {
  let type = new BondingCurveType(event.params.tokenType);
  type.name = event.params.tokenType;
  type.impl = event.params.impl;
  type.save();
}

export function handleLogTokenUpgradeRejected(event: LogTokenUpgradeRejected): void {
  let log = new TokenUpgradeHistory(event.transaction.hash.toHex());
  log.operator = event.params.rejecter;
  log.timestamp = event.block.timestamp;
  log.type = "reject";
  log.token = event.params.proxyAddress.toHex();
  log.upgradeTo = Bytes.fromHexString("");
  log.tx = event.transaction.hash;
  log.data = event.params.reason;
  log.save();
}
export function handleLogTokenUpgradeRequested(event: LogTokenUpgradeRequested): void {
  let log = new TokenUpgradeHistory(event.transaction.hash.toHex());
  log.operator = event.params.requester;
  log.timestamp = event.block.timestamp;
  log.type = "request";
  log.token = event.params.proxyAddress.toHex();
  log.upgradeTo = event.params.implementAddr;
  log.tx = event.transaction.hash;
  log.data = event.params.data.toHex();
  log.save();
}

export function handleRoleAdminChanged(event: RoleAdminChanged): void { }

export function handleRoleGranted(event: RoleGranted): void { }

export function handleRoleRevoked(event: RoleRevoked): void { }
