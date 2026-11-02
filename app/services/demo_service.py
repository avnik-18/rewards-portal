"""Demo service — single-purpose business-logic layer above the repository.

Real services follow this shape: pure functions / class methods that receive
data (never HTTP objects) and return DTOs or raise domain errors.
"""


def build_greeting(name: str) -> str:
    return f"Hello, {name}!"
