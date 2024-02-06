quoteExample

```grapql
{
  counterEntities {
    id
    count
  }
  tradeVolumes {
    id
    volume
    token {
      id
    }
  }
  prices {
    id
    price
    token
    timestamp
  }
  tokenEntities {
    type
    tradeVolumes {
      id
      volume
      token {
        id
      }
      timestamp
    }
    supply
    currentPrice
    symbol
    name
    treasuryBalance
    treasury
    id
    ethValue
    memberCount
    txCount
    marketCap
    maxSupply
  }
}
```
