-- fn_awards_tile at 0033 — the portal "Quarterly awards" tile read
-- (persona-agnostic: any authenticated caller; the UI keeps its own display
-- gate). VOTING REMOVED from the live-cycle predicate (no voting phase in
-- the app) and the read TICKS fn_awards_auto_phase first so a draft whose
-- window opened is live immediately. CROSS-BINDING: the live-cycle predicate
-- below MUST stay identical to ShowcaseRepository.live_awards() and
-- AwardsRepository.list_live() (app/repositories/*.py) — phase `nominations`
-- with an open-or-unbounded window (close still future, open already passed
-- or unset), or `draft` with a future close. Edit all sides in the same
-- change.
CREATE OR REPLACE FUNCTION fn_awards_tile()
RETURNS jsonb AS $$
    DECLARE
      v_period uuid;
      v_label text;
      v_total int;
      v_days int;
      v_content awards_cycle_content%ROWTYPE;
    BEGIN
      PERFORM fn_awards_auto_phase();

      -- (predicate cross-bound to the python repos — see above)
      IF NOT EXISTS (
        SELECT 1 FROM awards a
         WHERE ((a.phase = 'nominations'
                   AND (a.nominations_start IS NULL
                        OR a.nominations_start <= CURRENT_DATE)
                   AND (a.nominations_end IS NULL
                        OR a.nominations_end >= CURRENT_DATE))
                OR (a.phase = 'draft'
                    AND a.nominations_end >= CURRENT_DATE))) THEN
        RETURN jsonb_build_object(
          'period_label', NULL::text,
          'prize_total', NULL::int,
          'days_to_nominations_close', NULL::int,
          'headline', NULL::text,
          'tagline', NULL::text,
          'cta_label', NULL::text,
          'cta_url', NULL::text);
      END IF;

      v_total := (
        SELECT COALESCE(SUM(a.prize_points), 0) FROM awards a
         WHERE ((a.phase = 'nominations'
                   AND (a.nominations_start IS NULL
                        OR a.nominations_start <= CURRENT_DATE)
                   AND (a.nominations_end IS NULL
                        OR a.nominations_end >= CURRENT_DATE))
                OR (a.phase = 'draft'
                    AND a.nominations_end >= CURRENT_DATE)));

      v_period := (
        SELECT a.period_id FROM awards a
         WHERE ((a.phase = 'nominations'
                   AND (a.nominations_start IS NULL
                        OR a.nominations_start <= CURRENT_DATE)
                   AND (a.nominations_end IS NULL
                        OR a.nominations_end >= CURRENT_DATE))
                OR (a.phase = 'draft'
                    AND a.nominations_end >= CURRENT_DATE))
         ORDER BY a.nominations_end ASC NULLS LAST
         LIMIT 1);

      v_days := (
        SELECT MIN(CASE WHEN a.nominations_end >= CURRENT_DATE
                        THEN a.nominations_end - CURRENT_DATE END) FROM awards a
         WHERE ((a.phase = 'nominations'
                   AND (a.nominations_start IS NULL
                        OR a.nominations_start <= CURRENT_DATE)
                   AND (a.nominations_end IS NULL
                        OR a.nominations_end >= CURRENT_DATE))
                OR (a.phase = 'draft'
                    AND a.nominations_end >= CURRENT_DATE)));

      v_label := (SELECT f.name FROM fiscal_period f WHERE f.id = v_period);
      SELECT * INTO v_content FROM awards_cycle_content WHERE period_id = v_period;
      IF NOT FOUND THEN
        v_content := NULL;
      END IF;

      RETURN jsonb_build_object(
        'period_label', v_label,
        'prize_total', v_total,
        'days_to_nominations_close', v_days,
        'headline', v_content.headline,
        'tagline', v_content.tagline,
        'cta_label', v_content.cta_label,
        'cta_url', v_content.cta_url);
    END; $$ LANGUAGE plpgsql;
