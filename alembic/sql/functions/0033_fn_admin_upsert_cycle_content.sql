-- fn_admin_upsert_cycle_content at 0033 — author the "Quarterly awards" tile
-- copy. Headline may carry the {points} token — the frontend substitutes the
-- derived prize_total there (figures are derived, copy is authored). A
-- fully-executed/dissolved period is locked for copy edits (C549X): the tile
-- is read from this table live only while draft/nominations/closed awards
-- exist in the period (VOTING REMOVED from the stage list; 'closed' — the
-- post-nomination approval stage — still shows the tile).
CREATE OR REPLACE FUNCTION fn_admin_upsert_cycle_content(
      p_period uuid, p_headline text, p_tagline text,
      p_cta_label text, p_cta_url text, p_actor uuid)
    RETURNS void AS $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM role_assignment
                      WHERE user_id = p_actor AND role = 'admin' AND revoked_at IS NULL) THEN
        RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = 'C549Q';
      END IF;

      IF p_period IS NULL OR NOT EXISTS (SELECT 1 FROM fiscal_period WHERE id = p_period) THEN
        RAISE EXCEPTION 'period_not_found' USING ERRCODE = 'C549W';
      END IF;
      IF p_headline IS NULL OR char_length(p_headline) = 0 OR char_length(p_headline) > 200 THEN
        RAISE EXCEPTION 'headline_invalid' USING ERRCODE = 'C549W';
      END IF;

      IF EXISTS (SELECT 1 FROM awards WHERE period_id = p_period) THEN
        IF NOT EXISTS (SELECT 1 FROM awards WHERE period_id = p_period
                        AND phase IN ('draft', 'nominations', 'closed')) THEN
          RAISE EXCEPTION 'award_locked' USING ERRCODE = 'C549X';
        END IF;
      END IF;

      INSERT INTO awards_cycle_content (period_id, headline, tagline, cta_label, cta_url, updated_by)
      VALUES (p_period, p_headline, p_tagline, p_cta_label, p_cta_url, p_actor)
      ON CONFLICT (period_id) DO UPDATE
        SET headline = EXCLUDED.headline,
            tagline = EXCLUDED.tagline,
            cta_label = EXCLUDED.cta_label,
            cta_url = EXCLUDED.cta_url,
            updated_by = EXCLUDED.updated_by;

      INSERT INTO audit_log (actor, action, entity, entity_id, before, after, at)
        VALUES (p_actor, 'awards.cycle_content_upserted', 'awards_cycle_content',
                p_period::text, NULL,
                jsonb_build_object('headline', p_headline, 'tagline', p_tagline,
                                   'cta_label', p_cta_label, 'cta_url', p_cta_url), now());
    END; $$ LANGUAGE plpgsql;
