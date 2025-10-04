export type TokenValue = {
  TokenKey: string
  TokenName: string
  Amount: number
  Price: number
  Value: number
  Image: string
}

export type Position = {
  Status: string
  Side: 'LONG' | 'SHORT'
  Token: TokenValue
  Leverage: number
}

export type LeaderboardRow = {
  Version: string
  Tx: { Time: number; Tx: string }
  Market: string
  EnteredPositionTime: number
  Address: { Address: string; StakeAddress: string; ADAHandle?: string }
  Portfolio: { TotalBalance: number; Protocols?: { Protocol: string; Value: number }[] }
  Position: Position
  CurrentPositionValue: { TokenValue: TokenValue; TokenValueUsd: number }
  TotalPositionSize: { TokenValue: TokenValue; TokenValueUsd: number }
  Fees: number
  UsdHourlyRate: number
  EntryMarkPrice: number[]
  LiquidationPrice: number
  Collateral: number
  CollateralToken: number
  CollateralTokenKey: string
  TakeProfitStoploss: number[]
  PNL: number[]
  Value: number
  DurationInSeconds: number
}

export type Stats = {
  AverageLeverage: number
  TotalCollateral: number
  AverageCollateral: number
  TotalFees: number
  AveragePNL: number
  AverageDuration: number
  TotalPNL: number
  LongCount: number
  ShortCount: number
  LongPlayer: number
  ShortPlayer: number
  LiquidationPriceAverage: number
  TotalPositionSize: number
  LongSize: number
  ShortSize: number
  ROE: number
  AccountValue: number
  Wins: number
  Liquidated24H: number
  totalPNLforPool: number
}

export type LiquidationBucket = {
  Range: [number, number]
  LongVolume: number
  ShortVolume: number
  LongCumulative: number
  ShortCumulative: number
}

export type ApiResponse = {
  LeaderBoards: LeaderboardRow[]
  Stats: Partial<Stats>
  LiquidationBuckets: LiquidationBucket[]
  Page: number
  PerPage: number
  TotalItem: number
  TotalParticipants: number
}
