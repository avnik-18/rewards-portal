"""Approval chain business logic — STUB, blocked on the DB team's schema.

Implements (from PERSONAS.md + team requirements):
- points awarded per managerial level: L1/L2/L3 authority limits
  (defaults 100 / 500 / 2000; auto-approve below 25 / 100 / 500)
- personal no-approval budget: praise up to the giver's own budget skips
  the chain entirely
- quota-wallet owner is always the final mandatory step in the chain
- verdicts: approved | returned | declined; decided steps persist per request
"""

from dataclasses import dataclass, field


@dataclass
class ApprovalStep:
    seq: int
    owner_id: str
    state: str = "pending"  # pending | approved | returned | declined
    note: str | None = None


@dataclass
class ApprovalChain:
    giver_id: str
    recipient_ids: list[str] = field(default_factory=list)
    points: int = 0
    wallet_id: str | None = None
    steps: list[ApprovalStep] = field(default_factory=list)


class ApprovalService:
    def resolve_chain(
        self,
        giver_id: str,
        points: int,
        recipient_ids: list[str],
    ) -> ApprovalChain:
        """TODO once person/level_limit/wallet tables exist:
        1. If points <= giver's personal budget → no chain (instant auto-approve).
        2. Else walk the giver's HRIS manager chain; stop at the first level
           whose approval_limit >= points.
        3. If the priced award has a quota wallet, append its owner as the
           final mandatory step (regardless of that owner's level).
        """
        raise NotImplementedError("resolve_chain blocked on DB schema (person, level_limit, wallet)")
