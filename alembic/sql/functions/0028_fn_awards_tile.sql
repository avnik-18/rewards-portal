-- fn_awards_tile — the portal "Quarterly awards" tile read (persona-agnostic:
-- any authenticated caller; the UI keeps its own display gate).
-- CROSS-BINDING: the live-cycle predicate below MUST stay identical to
-- ShowcaseRepository.live_awards() (app/repositories/showcase_repository.py) —
-- phase `nominations`/`voting` with a NULL or still-future nominations_end, or
-- `draft` with a future nominations_end. fn_awards_tile is its PL/pgSQL twin;
-- edit both sides in the same change. Admin edits (upsert_award /
-- upsert_cycle_content) take effect read-time — no scheduler, no cache.
CREATE OR REPLACE FUNCTION fn_awards_tile()
RETURNS jsonb AS $$
    DECLARE
      v_period uuid;
      v_label text;
      v_total int;
      v_days int;
      v_content awards_cycle_content%ROWTYPE;
    BEGIN
      -- (predicate cross-bound to ShowcaseRepository.live_awards — see above)
      IF NOT EXISTS (
        SELECT 1 FROM awards a
         WHERE (a.phase IN ('nominations', 'voting')
                  AND (a.nominations_end IS NULL OR a.nominations_end >= CURRENT_DATE))
             OR (a.phase = 'draft' AND a.nominations_end >= CURRENT_DATE)) THEN
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
         WHERE (a.phase IN ('nominations', 'voting')
                  AND (a.nominations_end IS NULL OR a.nominations_end >= CURRENT_DATE))
             OR (a.phase = 'draft' AND a.nominations_end >= CURRENT_DATE));

      v_period := (
        SELECT a.period_id FROM awards a
         WHERE (a.phase IN ('nominations', 'voting')
                  AND (a.nominations_end IS NULL OR a.nominations_end >= CURRENT_DATE))
             OR (a.phase = 'draft' AND a.nominations_end >= CURRENT_DATE)
         ORDER BY a.nominations_end ASC NULLS LAST
         LIMIT 1);

      v_days := (
        SELECT MIN(CASE WHEN a.nominations_end >= CURRENT_DATE
                        THEN a.nominations_end - CURRENT_DATE END) FROM awards a
         WHERE (a.phase IN ('nominations', 'voting')
                  AND (a.nominations_end IS NULL OR a.nominations_end >= CURRENT_DATE))
             OR (a.phase = 'draft' AND a.nominations_end >= CURRENT_DATE));

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
