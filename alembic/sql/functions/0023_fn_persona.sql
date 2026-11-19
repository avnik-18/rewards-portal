-- fn_persona at 0023: one-word role class for the viewer, read by the feed
-- API (admin or leader shapes the response; plain employee otherwise).
-- Admin wins over leader; leader is lead-role team membership that is still
-- current OR having direct reports who are not separated.
CREATE OR REPLACE FUNCTION fn_persona(p_viewer uuid)
RETURNS text
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM role_assignment ra
     WHERE ra.user_id = p_viewer
       AND ra.role = 'admin'
       AND ra.revoked_at IS NULL
  ) THEN
    RETURN 'admin';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM team_members tm
     WHERE tm.user_id = p_viewer
       AND tm.role = 'lead'
       AND tm.valid_to IS NULL
  ) OR EXISTS (
    SELECT 1
      FROM users u
     WHERE u.manager_id = p_viewer
       AND u.employment_status <> 'separated'
  ) THEN
    RETURN 'leader';
  END IF;

  RETURN 'employee';
END; $$ LANGUAGE plpgsql STABLE;
