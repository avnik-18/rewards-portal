-- fn_awards_auto_phase — THE phase engine (0033, no-voting pipeline: the
-- award's dates drive the phases, per the admin's ask — "automatically open
-- close phases based on the dates provided for that award"):
--   OPEN  draft → nominations when the nomination window has arrived
--         (nominations_start <= today and close not passed).
--   CLOSE draft/nominations → closed once the nomination window has fully
--         passed (nominations_end < today). The DH/admin lanes breathe by
--         their OWN windows afterwards; 'closed' only means "no longer
--         collecting nominations".
-- Manual phases the admin set (result/cancelled) are NEVER auto-touched, and
-- awards without dates never auto-move. Called at the head of every read/
-- write that leads with a phase (tile, both list reads, cycles-for-user,
-- nominations submit) so no scheduler is needed and the change is always
-- read-time consistent. Idempotent.
CREATE OR REPLACE FUNCTION fn_awards_auto_phase()
RETURNS void AS $$
BEGIN
  UPDATE awards
     SET phase = 'nominations'::cycle_phase
   WHERE phase = 'draft'
     AND nominations_start IS NOT NULL
     AND nominations_start <= CURRENT_DATE
     AND (nominations_end IS NULL OR nominations_end >= CURRENT_DATE);

  UPDATE awards
     SET phase = 'closed'::cycle_phase
   WHERE phase IN ('draft', 'nominations')
     AND nominations_end IS NOT NULL
     AND nominations_end < CURRENT_DATE;
END; $$ LANGUAGE plpgsql;
