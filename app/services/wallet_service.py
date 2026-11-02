"""Points & wallets — STUB, blocked on the DB team's schema.

Implements (team requirements):
- quarter-wise points assignment for L1/L2/L3 quota wallets
  (period e.g. 'FY26 · Q1', allocated vs spent)
- personal no-approval budget tracking (requirement: every employee gets a
  budget they can spend without any approval)
- used / unused points tracking — balance is DERIVED from the append-only
  ledger, never a stored editable column
- consistency rules that live here once real:
  * every spend happens in ONE transaction with its ledger entry
  * wallet debit uses an atomic conditional update
    (UPDATE ... SET spent = spent + X WHERE spent + X <= allocated);
    zero rows affected → over budget → 409
  * spend endpoints take an idempotency key (UI double-click protection)
"""


class WalletService:
    def wallet_remaining(self, wallet_id: str, period: str) -> int:
        """allocated - spent for the given quarter's wallet."""
        raise NotImplementedError("blocked on DB schema (wallet table)")

    def personal_balance(self, person_id: str) -> int:
        """SUM(remaining) over the person's non-expired point lots."""
        raise NotImplementedError("blocked on DB schema (point_lot table)")

    def used_points(self, person_id: str, period: str) -> int:
        """Sum of negative ledger entries in the period — 'used so far'."""
        raise NotImplementedError("blocked on DB schema (ledger_entry table)")

    def assign_quarterly_quota(self, wallet_id: str, period: str, allocated: int) -> None:
        """Program-admin action: set L1/L2/L3 wallet allocation for a quarter."""
        raise NotImplementedError("blocked on DB schema")
