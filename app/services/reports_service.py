"""Employee history / performance — STUB, blocked on the DB team's schema.

Feeds (team requirement: history as performance for employees):
- given vs received recognition per person per period
- per-person ledger walkthrough (awards, redemptions, grants, expiry)
- values most-recognized ("valuesTop") for the profile screen

Derived data only — nothing here mutates state.
"""


class ReportsService:
    def person_history(self, person_id: str) -> list[dict[str, str | int]]:
        raise NotImplementedError("blocked on DB schema (ledger_entry, post tables)")

    def given_vs_received(self, person_id: str, period: str) -> dict[str, int]:
        raise NotImplementedError("blocked on DB schema")

    def values_top(self, person_id: str) -> dict[str, int]:
        raise NotImplementedError("blocked on DB schema (core_value count per person)")
