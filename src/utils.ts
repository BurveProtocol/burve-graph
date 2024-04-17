import { Address, BigDecimal, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts";
import { Pair, Swap, Token } from "../generated/schema";
import { Token as TokenContract } from "../generated/factory/Token"

export function HandleToken(tokenAddr: Address): Token {
    let token = Token.load(tokenAddr.toHex());
    if (tokenAddr == Address.zero()) {
        //TODO, check native token
        token = new Token(tokenAddr.toHex());
        token.symbol = dataSource.network();
        token.decimals = BigInt.fromI32(18);
        token.tradeVolume = BigDecimal.zero();
        token.save();
    }
    if (!token) {
        token = new Token(tokenAddr.toHex());
        let erc20Abi = TokenContract.bind(tokenAddr);
        let symbol = erc20Abi.try_symbol();
        if (!symbol.reverted) token.symbol = symbol.value;
        let decimal = erc20Abi.try_decimals();
        if (!decimal.reverted) token.decimals = BigInt.fromI32(decimal.value);
        token.tradeVolume = BigDecimal.zero();
        token.save();
    }
    return token;
}

export function HandleTokenVolume(tokenAddr: Address, amount: BigDecimal): void {
    let token = Token.load(tokenAddr.toHex());
    if (token) {
        token.tradeVolume = token.tradeVolume.plus(amount);
        token.save();
    }
}

export function HandleSwap(pairAddr: Address, fromAmount: BigInt, toAmount: BigInt, timestamp: BigInt, id: Bytes): void {

    const pair = Pair.load(pairAddr.toHex());
    if (pair) {
        const swap = new Swap(id.toHex());
        swap.fromAmount = fromAmount;
        swap.toAmount = toAmount;
        swap.timestamp = timestamp;
        swap.pair = pair.id;
        swap.save();
    }
}
