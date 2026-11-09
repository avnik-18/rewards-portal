import {
  REWARDS_SUMMARY,
  RECEIVED,
  LEDGER,
  VALUES_LIVED,
  MY_EOQ_AWARDS,
  type RewardSummary,
  type RecognitionReceived,
  type LedgerEntry,
  type ValueLived,
  type EoQAward,
} from '../mock-data'

export interface RewardsPayload {
  summary: RewardSummary
  received: RecognitionReceived[]
  ledger: LedgerEntry[]
  valuesLived: ValueLived[]
  eoqAwards: EoQAward[]
}

export async function getRewards(): Promise<RewardsPayload> {
  return {
    summary: REWARDS_SUMMARY,
    received: RECEIVED,
    ledger: LEDGER,
    valuesLived: VALUES_LIVED,
    eoqAwards: MY_EOQ_AWARDS,
  }
}
