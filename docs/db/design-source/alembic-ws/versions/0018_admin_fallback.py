"""0018_admin_fallback — structural marker (kept for chain continuity).

The org-top approver fallback rule lives in fn_submit_recognition (0017):
unresolvable steps escalate to 'admin' holders of role_assignment. Shipping
demo admins was removed — production grants roles via an admin API/person
workstream, NOT via migrations. No structural change in this revision.
"""
from alembic import op

revision = "0018_admin_fallback"
down_revision = "0017_admin_flows"
branch_labels = None
depends_on = None

def upgrade() -> None:
    pass

def downgrade() -> None:
    pass
