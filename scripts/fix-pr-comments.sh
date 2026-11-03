#!/usr/bin/env bash
# Resolve the reviewer's comment: remove the operator one-off (force-push +
# hardcoded path), make the one committed script's usage comment machine-neutral,
# and document the scripts-hygiene policy for future PRs.
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
git switch feature/initial-backend >/dev/null 2>&1

git rm -q scripts/restructure-for-pr.sh

# verify.sh's usage hint: only the generic form (the WSL prefix is per-dev anyway)
sed -i 's|#   wsl --cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api -- bash scripts/verify.sh|#   wsl --cd <repo-root> -- bash scripts/verify.sh|' scripts/verify.sh

# policy into CLAUDE.md (next to the architecture rules) so the next PR cannot
# reintroduce machine-coupled or destructive scripts
python3 - <<'EOF'
import pathlib
p = pathlib.Path("CLAUDE.md")
s = p.read_text(encoding="utf-8")
marker = "- **Descriptive names, enforced by linters**"
addition = """- **Scripts hygiene (post-review policy)** — anything committed to `scripts/` must run on
  any machine: never absolute personal paths (use `cd "$(dirname "$0")/.."`), never
  destructive git operations (`push --force`, `reset --hard`) against shared branches,
  never secrets. One-off operator commands are run OUTSIDE the repo and deleted, not
  committed. Branch history is the only place a mistake may live — never shared state.
"""
s = s.replace(marker, addition + marker)
p.write_text(s, encoding="utf-8")
print("CLAUDE.md policy added")
EOF

git add -A
git commit -q -m "chore: remove operator one-off script (review) + scripts hygiene policy

- deletes scripts/restructure-for-pr.sh: it contained a force-push against
  develop/main and a hardcoded personal machine path (reviewer concern);
  it was a one-off operator command that should never have been committed
- verify.sh usage hint made machine-agnostic
- CLAUDE.md: new scripts-hygiene policy (no personal paths, no destructive
  git ops in committed scripts, operator commands stay outside the repo)"
git log --oneline -2
git push origin feature/initial-backend 2>&1 | tail -2
